import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PMKey, PackageResult, AppState, CmdState, LogLine, AppSettings } from './types';
import { PM_LIST } from './types';
import Sidebar from './components/Sidebar';
import SearchBar from './components/SearchBar';
import PackageCard from './components/PackageCard';
import PackageDetail from './components/PackageDetail';
import Terminal from './components/Terminal';
import Settings from './components/Settings';

const pmAPI = (window as any).pmAPI;

// 浏览器回退模式（开发时在浏览器中预览）
const isElectron = !!pmAPI;

/** Mock API 用于浏览器调试 */
const mockAPI = {
  search: async (pmKey: string, query: string, _paths?: Record<string, string>) => {
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 900));
    const mockData: Record<string, string[]> = {
      homebrew: ['wget', 'curl', 'git-lfs', 'ffmpeg', 'imagemagick', 'python@3.12'],
      npm: ['react', 'vue', 'angular', 'express', 'lodash', 'axios'],
      pip: ['numpy', 'pandas', 'requests', 'flask', 'django', 'pytest'],
      cargo: ['ripgrep', 'fd-find', 'bat', 'exa', 'delta', 'zoxide'],
      gem: ['rails', 'rspec', 'jekyll', 'sass', 'bundler', 'puma'],
    };
    return {
      pmKey,
      results: (mockData[pmKey] || [])
        .filter((n) => n.includes(query.toLowerCase()))
        .map((name) => ({ name, pm: pmKey, version: '1.0.0', description: 'A useful package' })),
      error: null,
    };
  },
  list: async (pmKey: string, _paths?: Record<string, string>) => ({ pmKey, packages: [] }),
  info: async (_pmKey: string, pkg: string, _paths?: Record<string, string>) => ({
    pmKey: _pmKey,
    info: { name: pkg, version: '1.0.0', description: 'Mock package', homepage: '', license: 'MIT' },
  }),
  install: () => {},
  uninstall: () => {},
  kill: () => {},
  onCmdStdout: () => () => {},
  onCmdStderr: () => () => {},
  onCmdDone: () => () => {},
  onCmdError: () => () => {},
};

const api = isElectron ? pmAPI : mockAPI;

export default function App() {
  const [selectedPMs, setSelectedPMs] = useState<Set<PMKey>>(new Set(PM_LIST.map((p) => p.key)));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Record<PMKey, PackageResult[]>>(
    Object.fromEntries(PM_LIST.map((p) => [p.key, []])) as unknown as Record<PMKey, PackageResult[]>
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchErrors, setSearchErrors] = useState<Record<string, string>>({});
  const [selectedPackage, setSelectedPackage] = useState<{ pm: PMKey; pkg: PackageResult } | null>(null);
  const [packageDetail, setPackageDetail] = useState<any>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [tasks, setTasks] = useState<Map<string, CmdState>>(new Map());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // 设置
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem('unifiedpm-settings');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [showSettings, setShowSettings] = useState(false);

  // 初始加载动画
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // 搜索逻辑（防抖 400ms）
  const doSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults(Object.fromEntries(PM_LIST.map((p) => [p.key, []])) as unknown as Record<PMKey, PackageResult[]>);
        setSearchErrors({});
        return;
      }
      setIsSearching(true);
      const results: Record<string, PackageResult[]> = {};
      const errors: Record<string, string> = {};
      const promises = PM_LIST.filter((pm) => selectedPMs.has(pm.key)).map(async (pm) => {
        try {
          const res = await api.search(pm.key, query, settings.pmPaths);
          results[pm.key] = res.results || [];
          if (res.error) {
            errors[pm.key] = res.error;
          }
        } catch (err: any) {
          results[pm.key] = [];
          errors[pm.key] = err?.message || 'Search failed';
        }
      });
      await Promise.allSettled(promises);
      setSearchResults(results as Record<PMKey, PackageResult[]>);
      setSearchErrors(errors);
      setIsSearching(false);
    },
    [selectedPMs]
  );

  // 切换 PM 筛选时重新搜索
  useEffect(() => {
    if (searchQuery.trim()) {
      doSearch(searchQuery);
    }
  }, [selectedPMs]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(query), 400);
  };

  // 选中包 → 查看详情
  const handleSelectPackage = async (pm: PMKey, pkg: PackageResult) => {
    setSelectedPackage({ pm, pkg });
    setIsLoadingDetail(true);
    try {
      const res = await api.info(pm, pkg.name, settings.pmPaths);
      setPackageDetail(res.info);
    } catch {
      setPackageDetail(null);
    }
    setIsLoadingDetail(false);
  };

  // 启动一个命令任务
  const launchTask = (pmKey: PMKey, packageName: string, action: 'install' | 'uninstall') => {
    const taskId = `${action}-${packageName}-${Date.now()}`;
    const channelId = isElectron ? taskId : '';
    const pmInfo = PM_LIST.find((p) => p.key === pmKey)!;

    const newTask: CmdState = {
      taskId,
      status: 'running',
      logs: [{ id: 0, text: `$ ${pmInfo.cmd} ${action} ${packageName}\n`, stream: 'system', timestamp: Date.now() }],
      exitCode: null,
      pmKey,
      packageName,
      action,
    };

    setTasks((prev) => {
      const next = new Map(prev);
      next.set(taskId, newTask);
      return next;
    });
    setActiveTaskId(taskId);

    if (isElectron) {
      const updateLogs = (data: string, stream: 'stdout' | 'stderr') => {
        setTasks((prev) => {
          const next = new Map(prev);
          const t = next.get(taskId);
          if (t) {
            next.set(taskId, {
              ...t,
              logs: [...t.logs, { id: t.logs.length, text: data, stream, timestamp: Date.now() }],
            });
          }
          return next;
        });
      };

      pmAPI[action](pmKey, packageName, channelId, settings.pmPaths);
      const u1 = pmAPI.onCmdStdout(channelId, (data: string) => updateLogs(data, 'stdout'));
      const u2 = pmAPI.onCmdStderr(channelId, (data: string) => updateLogs(data, 'stderr'));
      const u3 = pmAPI.onCmdDone(channelId, (code: number) => {
        setTasks((prev) => {
          const next = new Map(prev);
          const t = next.get(taskId);
          if (t) next.set(taskId, { ...t, status: code === 0 ? 'done' : 'error', exitCode: code });
          return next;
        });
        [u1, u2, u3].forEach((u) => u());
      });
      const u4 = pmAPI.onCmdError(channelId, (err: string) => {
        setTasks((prev) => {
          const next = new Map(prev);
          const t = next.get(taskId);
          if (t) {
            next.set(taskId, {
              ...t,
              status: 'error',
              logs: [...t.logs, { id: t.logs.length, text: `Error: ${err}\n`, stream: 'system', timestamp: Date.now() }],
            });
          }
          return next;
        });
        [u1, u2, u3, u4].forEach((u) => u());
      });
    }
  };

  const handleInstall = (pmKey: PMKey, packageName: string) => launchTask(pmKey, packageName, 'install');
  const handleUninstall = (pmKey: PMKey, packageName: string) => launchTask(pmKey, packageName, 'uninstall');

  // 终止任务
  const handleKillTask = (taskId: string) => {
    if (isElectron) pmAPI.kill(taskId);
    setTasks((prev) => {
      const next = new Map(prev);
      const t = next.get(taskId);
      if (t && t.status === 'running') {
        next.set(taskId, { ...t, status: 'error', exitCode: null, logs: [...t.logs, { id: t.logs.length, text: '已终止\n', stream: 'system', timestamp: Date.now() }] });
      }
      return next;
    });
    if (activeTaskId === taskId) setActiveTaskId(null);
  };

  // 隐藏任务到侧边栏
  const handleHideTask = (taskId: string) => {
    setActiveTaskId(null);
  };

  // 从侧边栏恢复任务
  const handleShowTask = (taskId: string) => {
    setActiveTaskId(taskId);
  };

  // 清除已完成/错误的任务
  const handleDismissTask = (taskId: string) => {
    setTasks((prev) => {
      const next = new Map(prev);
      next.delete(taskId);
      return next;
    });
    if (activeTaskId === taskId) setActiveTaskId(null);
  };

  const closeDetail = () => {
    setSelectedPackage(null);
    setPackageDetail(null);
  };


  const handleSaveSettings = (s: AppSettings) => {
    setSettings(s);
    localStorage.setItem('unifiedpm-settings', JSON.stringify(s));
  };

  // 计算与查询的相似度
  const similarityScore = (name: string, query: string): number => {
    const n = name.toLowerCase();
    const q = query.toLowerCase();
    if (n === q) return 100;
    if (n.startsWith(q)) return 80;
    if (n.includes(q)) return 60;
    // 简单的逐字符匹配率
    let matches = 0;
    let qi = 0;
    for (let i = 0; i < n.length && qi < q.length; i++) {
      if (n[i] === q[qi]) { matches++; qi++; }
    }
    return (matches / q.length) * 40;
  };

  // 获取扁平化并按相似度排序的搜索结果
  const flatResults: { pm: PMKey; pkg: PackageResult }[] = [];
  for (const pm of PM_LIST) {
    if (selectedPMs.has(pm.key)) {
      for (const pkg of searchResults[pm.key] || []) {
        flatResults.push({ pm: pm.key, pkg });
      }
    }
  }
  if (searchQuery.trim()) {
    flatResults.sort((a, b) => similarityScore(b.pkg.name, searchQuery) - similarityScore(a.pkg.name, searchQuery));
  }

  return (
    <div className="flex h-full w-full bg-transparent text-white/90 select-none">
      {/* 背景渐变 */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a0c] via-[#111318] to-[#0d0d12] -z-10" />

      {/* 窗口拖拽区域 */}
      <div className="titlebar-drag fixed top-0 left-0 right-0 h-8 z-50" />

      {/* 左侧边栏 */}
      <Sidebar
        selectedPMs={selectedPMs}
        onTogglePM={(key) => {
          const next = new Set(selectedPMs);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          setSelectedPMs(next);
        }}
        onOpenSettings={() => setShowSettings(true)}
        tasks={tasks}
        activeTaskId={activeTaskId}
        onShowTask={handleShowTask}
        onDismissTask={handleDismissTask}
      />

      {/* 右侧主内容 */}
      <main className="flex-1 flex flex-col overflow-hidden pt-10">
        {/* 搜索栏 */}
        <div className="px-8 pt-6 pb-3">
          <SearchBar
            value={searchQuery}
            onChange={handleSearch}
            isSearching={isSearching}
            placeholder="搜索包名称... Homebrew / NPM / Pip / Cargo / Gem"
          />
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-8 pb-6">
          <AnimatePresence mode="wait">
            {initialLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full space-y-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-10 h-10 rounded-full border-2 border-white/10 border-t-accent-blue"
                />
                <p className="text-white/40 text-sm">初始化 UnifiedPM...</p>
              </motion.div>
            ) : flatResults.length > 0 ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.12 } }}
                className="space-y-2"
              >
                {flatResults.map(({ pm, pkg }) => (
                  <PackageCard
                    key={`${pm}-${pkg.name}`}
                    pmKey={pm}
                    pkg={pkg}
                    onSelect={() => handleSelectPackage(pm, pkg)}
                    onInstall={() => handleInstall(pm, pkg.name)}
                    onUninstall={() => handleUninstall(pm, pkg.name)}
                  />
                ))}
              </motion.div>
            ) : searchQuery ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full space-y-3"
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" />
                </svg>
                <p className="text-white/30 text-sm">
                  {isSearching ? '搜索中...' : '没有找到匹配的包'}
                </p>
                {Object.keys(searchErrors).length > 0 && (
                  <div className="space-y-1 mt-2">
                    {Object.entries(searchErrors).map(([pmKey, err]) => (
                      <p key={pmKey} className="text-red-400/60 text-xs">
                        {PM_LIST.find(p => p.key === pmKey)?.icon} {PM_LIST.find(p => p.key === pmKey)?.name}: {err}
                      </p>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full space-y-4"
              >
                <div className="flex space-x-3">
                  {PM_LIST.map((pm) => (
                    <span
                      key={pm.key}
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold bg-white/[0.06]"
                      style={{ color: pm.color }}
                    >
                      {pm.icon}
                    </span>
                  ))}
                </div>
                <p className="text-white/25 text-sm">输入关键词开始跨包管理器搜索</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['react', 'numpy', 'ripgrep', 'rails', 'ffmpeg'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleSearch(tag)}
                      className="px-3 py-1.5 rounded-full text-xs text-white/40 bg-white/5 hover:bg-white/10 hover:text-white/70 transition-all"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 包详情面板 */}
      <AnimatePresence>
        {selectedPackage && (
          <PackageDetail
            pmKey={selectedPackage.pm}
            pkg={selectedPackage.pkg}
            detail={packageDetail}
            isLoading={isLoadingDetail}
            onClose={closeDetail}
            onInstall={() => handleInstall(selectedPackage.pm, selectedPackage.pkg.name)}
          />
        )}
      </AnimatePresence>

      {/* 终端面板 */}
      <AnimatePresence>
        {activeTaskId && tasks.has(activeTaskId) && (
          <Terminal
            cmdState={tasks.get(activeTaskId)!}
            onKill={() => handleKillTask(activeTaskId)}
            onHide={() => handleHideTask(activeTaskId)}
            onDismiss={() => handleDismissTask(activeTaskId)}
          />
        )}
      </AnimatePresence>

      {/* 设置面板 */}
      <AnimatePresence>
        {showSettings && (
          <Settings
            settings={settings}
            onSave={handleSaveSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
