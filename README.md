# UnifiedPM

macOS 统一包管理器 GUI — 在一个界面里搜索和管理 Homebrew / NPM / Pip / Cargo / Gem。

## 视频链接
- **BiliBili** — 【【一个GUI下载全平台包】https://b23.tv/tetcOal

## 功能

- **跨包管理器搜索** — 同时查询 5 个包管理器，结果按相关度排序
- **包详情** — 版本、描述、主页、许可证、依赖
- **一键安装** — 内置终端实时输出
- **筛选切换** — 侧边栏勾选/取消，即时重新搜索
- **自定义路径** — 设置中为每个包管理器指定二进制路径
- **macOS 原生** — 毛玻璃、hiddenInset 标题栏、暗色主题

## 支持

| 包管理器 | 搜索 | 安装 |
|---|---|---|
| Homebrew | `brew search` | `brew install` |
| NPM | `npm search --json` | `npm install -g` |
| Pip | PyPI API | `pip3 install` |
| Cargo | `cargo search` | `cargo install` |
| Gem | `gem search --remote` | `gem install` |

## 开发

```bash
npm install
npm run dev      # Vite + Electron
npm run build    # 打包 DMG
```

## 技术栈

React 18 · TypeScript · Tailwind CSS · Framer Motion · Electron · Vite

## 发布

DMG 通过 GitHub Releases 分发：

1. `npm run build` → `release/UnifiedPM-1.0.0-arm64.dmg`（Apple Silicon）和 `release/UnifiedPM-1.0.0.dmg`（Intel）
2. 在仓库 Releases 页面创建新版本，上传两个 DMG 作为附件
3. 由于未签名，用户首次打开需右键 → 打开绕过 Gatekeeper

## 项目结构

```
├── electron/
│   ├── main.cjs              # 主进程 IPC + 包管理器配置 + CLI spawn
│   └── preload.cjs            # contextBridge API
├── src/
│   ├── App.tsx                # 状态管理 + 搜索/安装/卸载
│   ├── main.tsx               # React 入口
│   ├── index.css              # 全局样式
│   ├── types/index.ts         # 类型 + 包管理器列表定义
│   └── components/
│       ├── Sidebar.tsx         # 包管理器选择 + 设置入口
│       ├── SearchBar.tsx       # 搜索框
│       ├── PackageCard.tsx     # 结果卡片
│       ├── PackageDetail.tsx   # 详情面板
│       ├── Terminal.tsx        # 终端日志
│       └── Settings.tsx        # 设置弹窗
├── build/
│   ├── icon.icns              # macOS 图标
│   └── icon.svg               # 图标源文件
├── package.json
└── vite.config.ts
```

## License

MIT
