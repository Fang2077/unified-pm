const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const https = require('https');
const path = require('path');

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
    HOMEBREW_NO_AUTO_UPDATE: '1',
    ...extra,
  };
}

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
    icon: 'H',
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
    icon: 'N',
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
    icon: 'P',
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
    icon: 'C',
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
    icon: 'G',
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

// ---- 活跃进程表（用于终止） ----
const activeProcesses = new Map();

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

  activeProcesses.set(channelId, child);

  child.stdout.on('data', (data) => {
    event.sender.send(`cmd-stdout-${channelId}`, data.toString());
  });

  child.stderr.on('data', (data) => {
    event.sender.send(`cmd-stderr-${channelId}`, data.toString());
  });

  child.on('close', (code) => {
    activeProcesses.delete(channelId);
    event.sender.send(`cmd-done-${channelId}`, code);
  });

  child.on('error', (err) => {
    activeProcesses.delete(channelId);
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

// ---- PyPI 包信息查询（直接 API 查询，无需下载索引） ----
function fetchPypiPackageInfo(packageName) {
  return new Promise((resolve, reject) => {
    const url = `https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`;
    https.get(url, { headers: { 'User-Agent': 'UnifiedPM/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            const info = json.info || {};
            resolve({
              name: info.name || packageName,
              version: info.version || '',
              description: info.summary || '',
              pm: 'pip',
            });
          } catch {
            reject(new Error('Failed to parse PyPI response'));
          }
        } else if (res.statusCode === 404) {
          resolve(null); // 包不存在
        } else {
          reject(new Error(`PyPI returned ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

// ---- IPC 处理 ----
ipcMain.handle('pm-search', async (_event, pmKey, query, paths) => {
  try {
    const config = PM_CONFIG[pmKey];
    if (!config) return { pmKey, results: [], error: 'Unknown manager' };

    // pip 直接查询 PyPI JSON API（快速，无需下载索引）
    if (pmKey === 'pip') {
      try {
        const pkgInfo = await fetchPypiPackageInfo(query);
        if (pkgInfo) {
          return { pmKey, results: [pkgInfo], error: null };
        }
        return { pmKey, results: [], error: `未找到 '${query}'，请尝试其他关键词` };
      } catch (err) {
        return { pmKey, results: [], error: err.message };
      }
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

ipcMain.on('pm-kill', (_event, channelId) => {
  const child = activeProcesses.get(channelId);
  if (child) {
    child.kill('SIGTERM');
    activeProcesses.delete(channelId);
  }
});

// ---- 应用生命周期 ----
app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
