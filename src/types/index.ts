// ---- 包管理器类型 ----
export type PMKey = 'homebrew' | 'npm' | 'pip' | 'cargo' | 'gem';

// ---- 包管理器元信息 ----
export interface PMInfo {
  key: PMKey;
  name: string;
  icon: string;
  color: string;
  cmd: string;
}

// ---- 搜索结果中的包 ----
export interface PackageResult {
  name: string;
  pm: PMKey;
  version?: string;
  description?: string;
}

// ---- 包详情 ----
export interface PackageDetail {
  name: string;
  version?: string;
  description?: string;
  homepage?: string;
  license?: string;
  dependencies?: string[];
}

// ---- 已安装的包 ----
export interface InstalledPackage {
  name: string;
  version?: string;
}

// ---- 终端日志行 ----
export interface LogLine {
  id: number;
  text: string;
  stream: 'stdout' | 'stderr' | 'system';
  timestamp: number;
}

// ---- 安装/卸载操作状态 ----
export type CmdStatus = 'idle' | 'running' | 'done' | 'error';

export interface CmdState {
  taskId: string;
  status: CmdStatus;
  logs: LogLine[];
  exitCode: number | null;
  pmKey: PMKey | null;
  packageName: string | null;
  action: 'install' | 'uninstall' | null;
}

// ---- 全局状态 ----
export interface AppState {
  selectedPMs: Set<PMKey>;
  searchQuery: string;
  searchResults: Record<PMKey, PackageResult[]>;
  isSearching: boolean;
  selectedPackage: { pm: PMKey; pkg: PackageResult } | null;
  packageDetail: PackageDetail | null;
  isLoadingDetail: boolean;
  installedPackages: Record<PMKey, InstalledPackage[]>;
  isLoadingInstalled: boolean;
  cmdState: CmdState;
  activeView: 'search' | 'installed';
}

// ---- 应用设置 ----
export interface AppSettings {
  pmPaths?: Record<string, string>;
}

// ---- PM 配置表 ----
export const PM_LIST: PMInfo[] = [
  { key: 'homebrew', name: 'Homebrew', icon: 'H', color: '#FBB040', cmd: 'brew' },
  { key: 'npm', name: 'NPM', icon: 'N', color: '#CB3837', cmd: 'npm' },
  { key: 'pip', name: 'Pip', icon: 'P', color: '#3775A9', cmd: 'pip3' },
  { key: 'cargo', name: 'Cargo', icon: 'C', color: '#DEA584', cmd: 'cargo' },
  { key: 'gem', name: 'Gem', icon: 'G', color: '#E9573F', cmd: 'gem' },
];
