const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const https = require('https');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow = null;

// 补充 GUI 应用缺少的 PATH（macOS launchd 只有 /usr/bin:/bin）
function buildEnv(extra) {
  const home = process.env.HOME || '';
  const extraPath = [
    `${home}/.cargo/bin`,
    `${home}/.local/bin`,
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/opt/local/bin',
  ].join(':');
  return {
    ...process.env,
    HOME: home,
    PATH: `${extraPath}:${process.env.PATH || '/usr/bin:/bin'}`,
    ...extra,
  };
}

// PyPI Simple Index 缓存（内存 + 磁盘双层缓存）
let pypiCache = null;       // { names: string[], timestamp: number }
const PYPI_CACHE_TTL = 10 * 60 * 1000; // 内存缓存 10 分钟
const PYPI_DISK_CACHE_TTL = 24 * 60 * 60 * 1000; // 磁盘缓存 24 小时
const PYPI_CACHE_DIR = path.join(os.homedir(), '.unified-pm');
const PYPI_CACHE_FILE = path.join(PYPI_CACHE_DIR, 'pypi-index.json');
let pypiPreloadPromise = null; // 用于追踪预加载

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 860,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: undefined,
    transparent: true,
    title: 'UnifiedPM',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // 开发模式加载 Vite dev server
  const isDev = process.argv.includes('--dev') || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ---- 包管理器配置 ----
const PM_CONFIG = {
  homebrew: {
    name: 'Homebrew',
    icon: '🍺',
    color: '#FBB040',
    cmd: 'brew',
    searchArgs: ['search'],
    infoArgs: (pkg) => ['info', '--json=v2', pkg],
    installArgs: (pkg) => ['install', pkg],
    uninstallArgs: (pkg) => ['remove', pkg],
    listArgs: ['list', '--formula'],
    searchParser: (stdout) =>
      stdout
        .split('\n')
        .filter((l) => l && !l.startsWith('==>'))
        .map((name) => ({ name: name.trim(), pm: 'homebrew' })),
  },
  npm: {
    name: 'NPM',
    icon: '📦',
    color: '#CB3837',
    cmd: 'npm',
    searchArgs: ['search', '--json'],
    infoArgs: (pkg) => ['view', pkg, '--json'],
    installArgs: (pkg) => ['install', '-g', pkg],
    uninstallArgs: (pkg) => ['uninstall', '-g', pkg],
    listArgs: ['list', '-g', '--depth=0', '--json'],
    searchParser: (stdout) => {
      try {
        const data = JSON.parse(stdout);
        return (Array.isArray(data) ? data : []).map((p) => ({
          name: p.name,
          description: p.description || '',
          version: p.version || '',
          pm: 'npm',
        }));
      } catch {
        return [];
      }
    },
  },
  pip: {
    name: 'Pip',
    icon: '🐍',
    color: '#3775A9',
    cmd: 'pip3',
    infoArgs: (pkg) => [
      '-c',
      `import urllib.request,json,sys
try:
    url='https://pypi.org/pypi/'+sys.argv[1]+'/json'
    req=urllib.request.Request(url,headers={'User-Agent':'UnifiedPM/1.0'})
    data=json.loads(urllib.request.urlopen(req,timeout=10).read())
    info=data.get('info',{})
    print(json.dumps({
        'name':info.get('name',''),
        'version':info.get('version',''),
        'summary':info.get('summary',''),
        'home_page':info.get('home_page',''),
        'license':info.get('license',''),
    }))
except Exception as e:
    sys.stderr.write(str(e))
    sys.exit(1)
`,
      pkg,
    ],
    installArgs: (pkg) => ['install', pkg],
    uninstallArgs: (pkg) => ['uninstall', '-y', pkg],
    listArgs: ['list', '--format=json'],
  },
  cargo: {
    name: 'Cargo',
    icon: '🦀',
    color: '#DEA584',
    cmd: 'cargo',
    searchArgs: (query) => ['search', '--limit', '20', query],
    infoArgs: (pkg) => ['search', '--limit', '1', pkg],
    installArgs: (pkg) => ['install', pkg],
    uninstallArgs: (pkg) => ['uninstall', pkg],
    listArgs: ['install', '--list'],
    searchParser: (stdout) =>
      stdout
        .split('\n')
        .filter((l) => l && !l.startsWith('    ='))
        .map((line) => {
          const match = line.match(/^(\S+)\s*=\s*"([^"]*)"\s*#\s*(.*)/);
          if (match) {
            return { name: match[1], version: match[2], description: match[3] || '', pm: 'cargo' };
          }
          const parts = line.split(/\s+/);
          return { name: parts[0] || line.trim(), pm: 'cargo' };
        }),
  },
  gem: {
    name: 'Gem',
    icon: '💎',
    color: '#E9573F',
    cmd: 'gem',
    searchArgs: (query) => ['search', '--remote', query],
    infoArgs: (pkg) => ['search', '--remote', '--details', pkg],
    installArgs: (pkg) => ['install', pkg],
    uninstallArgs: (pkg) => ['uninstall', pkg],
    listArgs: ['list', '--local'],
    searchParser: (stdout) =>
      stdout
        .split('\n')
        .filter((l) => l && !l.startsWith('***'))
        .map((line) => {
          const match = line.match(/^(\S+)\s*\(([^)]+)\)\s*(.*)/);
          if (match) {
            return { name: match[1], version: match[2], pm: 'gem' };
          }
          return { name: line.trim().split(/\s+/)[0] || line.trim(), pm: 'gem' };
        }),
  },
};

// ---- 执行包管理器命令（实时流输出） ----
function runCommand(pmKey, args, event, channelId, cmdOverride) {
  const config = PM_CONFIG[pmKey];
  if (!config) {
    event.sender.send(`cmd-error-${channelId}`, `Unknown package manager: ${pmKey}`);
    return;
  }

  const cmd = cmdOverride || config.cmd;

  const child = spawn(cmd, args, {
    env: buildEnv(),
    shell: true,
  });

  child.stdout.on('data', (data) => {
    event.sender.send(`cmd-stdout-${channelId}`, data.toString());
  });

  child.stderr.on('data', (data) => {
    event.sender.send(`cmd-stderr-${channelId}`, data.toString());
  });

  child.on('close', (code) => {
    event.sender.send(`cmd-done-${channelId}`, code);
  });

  child.on('error', (err) => {
    event.sender.send(`cmd-error-${channelId}`, err.message);
  });

  return child;
}

// ---- 执行命令并收集完整输出 ----
function runCommandCollect(pmKey, args, cmdOverride) {
  const config = PM_CONFIG[pmKey];
  if (!config) return Promise.reject(new Error(`Unknown: ${pmKey}`));

  const cmd = cmdOverride || config.cmd;

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      env: buildEnv(),
      shell: true,
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else resolve(stdout || stderr); // 部分包管理器即使成功也输出到 stderr
    });

    child.on('error', reject);
  });
}

// ---- PyPI Simple Index 搜索（内存缓存 + 磁盘缓存 + 后台刷新） ----
function readDiskCache() {
  try {
    if (!fs.existsSync(PYPI_CACHE_FILE)) return null;
    const raw = fs.readFileSync(PYPI_CACHE_FILE, 'utf-8');
    const cached = JSON.parse(raw);
    if (Array.isArray(cached.names) && cached.names.length > 0) {
      return cached; // { names: string[], timestamp: number }
    }
  } catch {}
  return null;
}

function writeDiskCache(names, timestamp) {
  try {
    if (!fs.existsSync(PYPI_CACHE_DIR)) fs.mkdirSync(PYPI_CACHE_DIR, { recursive: true });
    fs.writeFileSync(PYPI_CACHE_FILE, JSON.stringify({ names, timestamp }), 'utf-8');
  } catch {}
}

async function fetchPypiIndexOnline() {
  // 使用 Node.js 内置 fetch（自动处理 gzip 解压，39MB → ~5-8MB 传输）
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch('https://pypi.org/simple/', {
      headers: { 'Accept': 'application/vnd.pypi.simple.v1+json', 'User-Agent': 'UnifiedPM/1.0' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`PyPI returned ${response.status}`);
    }

    const data = await response.json();
    const names = (data.projects || []).map((p) => p.name);
    if (names.length === 0) {
      throw new Error('PyPI returned empty project list');
    }
    return names;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPypiIndex() {
  const now = Date.now();

  // 1) 内存缓存（10 分钟有效）
  if (pypiCache && (now - pypiCache.timestamp) < PYPI_CACHE_TTL) {
    return pypiCache.names;
  }

  // 2) 磁盘缓存（24 小时有效）
  const disk = readDiskCache();
  if (disk && (now - disk.timestamp) < PYPI_DISK_CACHE_TTL) {
    pypiCache = { names: disk.names, timestamp: disk.timestamp };
    return disk.names;
  }

  // 3) 在线获取（首次下载约需 10-30s，39MB JSON）
  try {
    const names = await fetchPypiIndexOnline();
    pypiCache = { names, timestamp: now };
    writeDiskCache(names, now);
    return names;
  } catch (e) {
    // 如果在线获取失败但有旧磁盘缓存，降级使用
    if (disk) {
      console.error('PyPI fetch failed, falling back to stale disk cache:', e.message);
      pypiCache = { names: disk.names, timestamp: disk.timestamp };
      return disk.names;
    }
    throw e;
  }
}

// 应用启动时预加载 PyPI 索引（后台静默进行，不阻塞 UI）
function preloadPypiIndex() {
  pypiPreloadPromise = fetchPypiIndex().catch((e) => {
    console.error('PyPI preload failed:', e.message);
  });
}

// ---- IPC 处理 ----
ipcMain.handle('pm-search', async (_event, pmKey, query, paths) => {
  try {
    const config = PM_CONFIG[pmKey];
    if (!config) return { pmKey, results: [], error: 'Unknown manager' };

    // pip 使用 PyPI Simple Index 缓存搜索（首次下载 39MB 约需 10-30s，后续走缓存）
    if (pmKey === 'pip') {
      const allNames = await Promise.race([
        fetchPypiIndex(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('PyPI search timeout')), 65000)),
      ]);
      const q = query.toLowerCase();
      const matched = allNames.filter((n) => n.toLowerCase().includes(q));
      // 按相似度排序: 精确匹配 > 前缀匹配 > 包含匹配
      matched.sort((a, b) => {
        const al = a.toLowerCase(), bl = b.toLowerCase();
        const aExact = al === q ? 1 : 0, bExact = bl === q ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        const aPref = al.startsWith(q) ? 1 : 0, bPref = bl.startsWith(q) ? 1 : 0;
        if (aPref !== bPref) return bPref - aPref;
        return al.localeCompare(bl);
      });
      const results = matched.slice(0, 50).map((name) => ({ name, pm: 'pip' }));
      return { pmKey, results, error: null };
    }

    const pathsObj = paths || {};
    // searchCmd is a separate binary (e.g. python3 for pip); prefer custom path for that binary
    const cmdOverride = config.searchCmd
      ? (pathsObj[config.searchCmd] || config.searchCmd)
      : (pathsObj[pmKey] || null);

    const searchArgs =
      typeof config.searchArgs === 'function' ? config.searchArgs(query) : [...config.searchArgs, query];
    const stdout = await runCommandCollect(pmKey, searchArgs, cmdOverride);
    const results = config.searchParser(stdout);
    return { pmKey, results, error: null };
  } catch (err) {
    return { pmKey, results: [], error: err.message };
  }
});

ipcMain.handle('pm-info', async (_event, pmKey, packageName, paths) => {
  try {
    const config = PM_CONFIG[pmKey];
    const infoArgs = typeof config.infoArgs === 'function' ? config.infoArgs(packageName) : [packageName];
    const cmdOverride = (paths && paths[pmKey]) || null;
    const stdout = await runCommandCollect(pmKey, infoArgs, cmdOverride);

    if (pmKey === 'npm') {
      try {
        const data = JSON.parse(stdout);
        return {
          pmKey,
          info: {
            name: data.name || packageName,
            version: data.version || '',
            description: data.description || '',
            homepage: data.homepage || '',
            license: data.license || '',
            dependencies: data.dependencies ? Object.keys(data.dependencies) : [],
          },
        };
      } catch {
        return { pmKey, info: { name: packageName, description: stdout.slice(0, 500) } };
      }
    }

    if (pmKey === 'homebrew') {
      try {
        const data = JSON.parse(stdout);
        if (Array.isArray(data) && data.length > 0) {
          const p = data[0];
          return {
            pmKey,
            info: {
              name: p.name || packageName,
              version: p.versions?.stable || '',
              description: p.desc || '',
              homepage: p.homepage || '',
              license: p.license || '',
              dependencies: p.dependencies || [],
            },
          };
        }
      } catch {}
    }

    if (pmKey === 'pip') {
      try {
        const data = JSON.parse(stdout);
        return {
          pmKey,
          info: {
            name: data.name || packageName,
            version: data.version || '',
            description: data.summary || '',
            homepage: data.home_page || '',
            license: data.license || '',
          },
        };
      } catch {}
    }

    return { pmKey, info: { name: packageName, description: stdout.slice(0, 500) } };
  } catch (err) {
    return { pmKey, info: null, error: err.message };
  }
});

ipcMain.handle('pm-list', async (_event, pmKey, paths) => {
  try {
    const config = PM_CONFIG[pmKey];
    const cmdOverride = (paths && paths[pmKey]) || null;
    const stdout = await runCommandCollect(pmKey, config.listArgs, cmdOverride);

    if (pmKey === 'npm') {
      try {
        const data = JSON.parse(stdout);
        const deps = data.dependencies || {};
        return { pmKey, packages: Object.keys(deps).map((k) => ({ name: k, version: deps[k].version || '' })) };
      } catch {
        return { pmKey, packages: [] };
      }
    }

    if (pmKey === 'pip') {
      try {
        const data = JSON.parse(stdout);
        return {
          pmKey,
          packages: (Array.isArray(data) ? data : []).map((p) => ({ name: p.name, version: p.version })),
        };
      } catch {
        return { pmKey, packages: [] };
      }
    }

    const packages = stdout
      .split('\n')
      .filter((l) => l.trim())
      .slice(0, 200)
      .map((l) => ({ name: l.trim() }));

    return { pmKey, packages };
  } catch (err) {
    return { pmKey, packages: [], error: err.message };
  }
});

ipcMain.on('pm-install', (event, { pmKey, packageName, channelId, paths }) => {
  const config = PM_CONFIG[pmKey];
  const args = typeof config.installArgs === 'function' ? config.installArgs(packageName) : config.installArgs(packageName);
  const cmdOverride = (paths && paths[pmKey]) || null;
  runCommand(pmKey, args, event, channelId, cmdOverride);
});

ipcMain.on('pm-uninstall', (event, { pmKey, packageName, channelId, paths }) => {
  const config = PM_CONFIG[pmKey];
  const args = typeof config.uninstallArgs === 'function' ? config.uninstallArgs(packageName) : config.uninstallArgs(packageName);
  const cmdOverride = (paths && paths[pmKey]) || null;
  runCommand(pmKey, args, event, channelId, cmdOverride);
});

// ---- 应用生命周期 ----
app.whenReady().then(() => {
  createWindow();
  // 后台预加载 PyPI 索引，避免用户首次搜索时等待
  setTimeout(preloadPypiIndex, 2000);
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
