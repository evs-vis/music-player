# 🎵 移动端音乐播放器 — 前端

前后端分离项目中的 **Vue 3 前端部分**，移动端 H5 应用。基于 Vue 3 + Vite + Pinia + Vant 4，提供全局音频播放、歌词同步、歌单、搜索、收藏与用户中心等完整音乐消费体验。

> 配套后端见仓库根目录 [backend/](../backend/)；仓库总览见 [根 README](../README.md)。

---

## 📑 目录

- [系统架构](#-系统架构)
- [核心功能](#-核心功能)
- [技术栈](#-技术栈)
- [目录结构](#-目录结构)
- [快速开始](#-快速开始)
- [页面与路由](#-页面与路由)
- [关键模块](#-关键模块)
- [状态管理](#-状态管理)
- [性能优化](#-性能优化)
- [开发规范](#-开发规范)

---

## 🏗 系统架构

前端采用 Vue 3 组合式 API + Pinia 状态管理，核心是 **`useAudio` 组合式函数**驱动的全局播放器引擎。

```
┌─────────────────────────────────────────────────────────────┐
│                        Vue 3 前端 (Vite)                     │
│                                                             │
│   ┌────────────────┐   ┌────────────────┐                   │
│   │   views/ 页面层  │   │  router/ 路由层 │                   │
│   │  layout 首页等   │   │  懒加载+守卫    │                   │
│   └───────┬────────┘   └───────┬────────┘                   │
│           │                    │                            │
│   ┌───────▼────────────────────▼────────┐                   │
│   │            stores/ 状态层            │                   │
│   │  player ─ auth ─ favorites ─ history │                   │
│   └───────┬─────────────────────────────┘                   │
│           │ 组件通信（MiniPlayer/播放页）                      │
│   ┌───────▼─────────────────────────────┐                   │
│   │    composables/useAudio 音频引擎      │                   │
│   │  播放/暂停/进度/歌词/重试/竞态防护      │                   │
│   └───────┬─────────────────────────────┘                   │
│   ┌───────▼─────────────────────────────┐                   │
│   │        api/ 接口层 (axios 封装)       │                   │
│   │   拦截器 / 请求重试 / 取消 / 内存缓存   │                   │
│   └───────────────┬─────────────────────┘                   │
└───────────────────┼─────────────────────────────────────────┘
                    │ HTTP
                    ▼
              Express 后端 (:3000)
```

**数据流**：`api/` 层封装 axios 请求 → Pinia stores 存储并驱动状态 → 视图渲染；播放动作通过 `useAudio` 控制 `<audio>` 元素，同步更新 `player` store 的进度/状态。

---

## ✨ 核心功能

| 模块 | 说明 |
|---|---|
| 🎵 **全局播放器** | 播放/暂停、上下曲、进度拖动、音量调节、三种播放模式（列表循环/单曲循环/随机） |
| 📝 **歌词同步** | 歌词逐行高亮 + 平滑滚动（rAF + easeOutCubic 缓动），迷你/全屏双模式 |
| 🎧 **播放健壮性** | 快速切歌竞态防护（单调递增播放序号）、缓冲中加载态、失败重试 |
| 🚫 **自动播放限制** | 浏览器禁止自动播放时，首次手势后恢复播放并保留进度 |
| 📂 **歌单系统** | 首页推荐歌单、分类浏览、歌单详情 |
| 🔍 **搜索** | 300ms 防抖搜索 + 搜索历史（按用户隔离） |
| ❤️ **收藏** | 歌曲收藏 / 取消，收藏列表（按用户隔离） |
| 🕘 **播放历史** | 自动记录播放历史，支持清除 |
| 👤 **用户中心** | 注册/登录（JWT）、修改密码、头像上传、注销账号 |
| 🛡 **健壮性** | 5 层错误捕获（全局 errorHandler + window.onerror + unhandledrejection + 路由守卫 + 组件错误边界） |
| 📊 **性能** | 首屏骨架屏、路由懒加载、手动分包、图片 fetchpriority、性能监控 |

---

## 🛠 技术栈

| 类别 | 技术 |
|---|---|
| **框架** | Vue 3 · Vue Router 5 · Pinia 4 |
| **UI** | Vant 4（按需引入）· SCSS |
| **HTTP** | Axios（拦截器/重试/取消/缓存） |
| **构建** | Vite 8 · unplugin-vue-components · postcss-px-to-viewport |
| **代码质量** | oxlint · ESLint · Prettier |
| **工程化** | pnpm · husky + lint-staged · GitHub Actions |

---

## 📂 目录结构

```
frontend/
├── README.md                   # 本文件
├── package.json                # 依赖与脚本（pnpm）
├── vite.config.js              # Vite 配置：代理、手动分包、px→vw
├── eslint.config.js            # ESLint 配置
├── index.html                  # 入口 HTML + 首屏骨架屏
├── src/
│   ├── main.js                 # 入口：挂载应用、注册 Pinia/Router、全局错误捕获
│   ├── App.vue                 # 根组件：音频播放调度、播放状态持久化
│   ├── api/                    # 接口封装
│   │   ├── auth.js             #   认证：登录/注册/改密/注销/头像
│   │   ├── favorite.js         #   收藏
│   │   ├── history.js          #   播放/搜索历史
│   │   └── playlist.js         #   歌单/歌曲
│   ├── assets/                 # 静态资源（logo、默认头像）
│   ├── components/             # 通用组件
│   │   ├── AppHeader.vue       #   顶部栏
│   │   ├── MiniPlayer.vue      #   迷你播放条（常驻底部）
│   │   ├── PlaylistSheet.vue   #   播放列表抽屉
│   │   ├── SettingsDrawer.vue  #   设置抽屉
│   │   ├── SongListPopup.vue   #   歌单列表弹窗
│   │   └── ErrorBoundary.vue   #   组件级错误边界
│   ├── composables/
│   │   └── useAudio.js         # 音频核心：播放/进度/歌词/重试/竞态防护
│   ├── router/
│   │   └── index.js            # 路由（懒加载 + 登录守卫）
│   ├── stores/
│   │   ├── index.js            # 统一导出
│   │   └── modules/            # player / auth / favorites / history / searchHistory
│   ├── styles/                 # 全局样式（variables.scss / global.css / notify.css）
│   ├── utils/
│   │   ├── request.js          # axios 封装（拦截器/重试/取消）
│   │   ├── errorHandler.js     # 全局错误处理
│   │   ├── memoryCache.js      # 内存缓存（TTL）
│   │   └── perf.js             # 性能监控
│   └── views/                  # 页面
│       ├── layout/             #   布局 + 4 个 Tabbar 页
│       ├── play/               #   播放页
│       ├── playlistDetail/     #   歌单详情
│       ├── login/              #   登录
│       ├── register/           #   注册
│       └── changePwd/          #   修改密码
└── public/                     # 静态资源（favicon、robots.txt）
```

---

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 22.18（推荐 22 LTS 或 24）
- **pnpm** ≥ 9（本项目使用 pnpm 11.13.1）

### 安装与启动

```bash
# 1. 先启动后端（仓库根目录）
cd ../backend
pnpm install
node server.js          # http://localhost:3000

# 2. 回到前端安装依赖并启动
cd ../frontend
pnpm install
pnpm dev                # http://localhost:5173
```

打开浏览器访问 `http://localhost:5173`。

### 接口代理

前端通过 Vite 代理转发到后端，**本地开发无需额外配置**：

| 前缀 | 代理到 |
|---|---|
| `/api` | `http://localhost:3000` |
| `/audio` | `http://localhost:3000` |
| `/covers` | `http://localhost:3000` |
| `/avatars` | `http://localhost:3000` |

> 生产环境可通过 `VITE_API_BASE_URL` 环境变量指向线上后端。

### 常用脚本

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm preview` | 预览构建产物 |
| `pnpm lint` | 代码检查（oxlint + eslint） |
| `pnpm format` | Prettier 格式化 |

---

## 🧭 页面与路由

| 路由 | 页面 | 说明 | 需登录 |
|---|---|---|---|
| `/home` | 首页 | 推荐歌单、热门歌曲 | — |
| `/category` | 歌单分类 | 按分类浏览歌单 | — |
| `/search` | 搜索 | 搜索歌曲、搜索历史 | — |
| `/mine` | 我的 | 用户中心、收藏、播放历史 | ✅ |
| `/playlist/:category` | 歌单详情 | 歌单内歌曲列表 | — |
| `/play` | 播放页 | 全屏播放器 + 歌词同步 | — |
| `/login` | 登录 | 账号登录 | — |
| `/register` | 注册 | 注册新账号 | — |
| `/changePwd` | 修改密码 | 修改登录密码 | ✅ |

> 4 个一级页（首页/歌单/搜索/我的）带底部 Tabbar；二级页无 Tabbar。路由懒加载 + `requiresAuth` 守卫。

---

## ⚙️ 关键模块

### useAudio — 音频引擎

位于 [src/composables/useAudio.js](src/composables/useAudio.js)，管理单个全局 `<audio>` 元素：

| API | 说明 |
|---|---|
| `loadAndPlay(song)` | 加载并播放歌曲（自动处理歌词按需拉取） |
| `play()` / `pause()` | 播放 / 暂停 |
| `seek(time)` | 跳转进度 |
| `setVolume(vol)` | 设置音量 |
| `retryPlayback()` | 加载失败后重试当前歌曲 |

**核心设计**：快速切歌竞态防护（单调递增序号，旧请求不覆盖新歌）；`preload=metadata` 优化音频加载；缓冲（waiting/canplay）驱动加载态 UI。

### api/ — 接口封装

基于 [src/utils/request.js](src/utils/request.js) 的 axios 实例，统一处理：JWT 请求头注入、401 跳转登录、请求重试、同 key 请求取消、内存缓存。

---

## 🗄 状态管理

基于 Pinia，位于 [src/stores/modules/](src/stores/modules/)：

| Store | 职责 | 持久化 |
|---|---|---|
| `player` | 当前歌曲、播放列表、进度、音量、播放模式、缓冲/错误状态 | 音量、播放模式 |
| `auth` | 用户信息、登录状态、登录后恢复播放状态 | 用户 token |
| `favorites` | 收藏列表 | — |
| `history` | 播放历史 | — |
| `searchHistory` | 搜索历史 | — |

> `player` store 通过 App.vue 的 watch 驱动音频引擎：歌曲变化→加载播放、进度→节流保存、seek→跳转。

---

## ⚡ 性能优化

| 优化项 | 实现 |
|---|---|
| **首屏骨架屏** | index.html 内联骨架，`router.isReady()` 延迟挂载消除闪烁 |
| **路由懒加载** | 每个页面独立 chunk |
| **手动分包** | vant / vue-vendor / axios 独立 chunk（Rolldown manualChunks） |
| **按需引入** | Vant 组件自动注册，主 CSS 194KB → 59KB（gzip 32KB） |
| **px→vw 适配** | postcss-px-to-viewport（375 设计稿） |
| **图片优化** | 首页前 3 张图 `fetchpriority=high`，其余懒加载 |
| **音频优化** | `preload=metadata`，失败重试按钮 |
| **内存缓存** | createMemoryCache（TTL 60s），避免重复请求 |
| **性能监控** | PerformanceObserver 采集 FCP/LCP/CLS/TBT |

---

## 📐 开发规范

- **代码检查**：`pnpm lint`（oxlint + eslint）
- **提交前**：husky + lint-staged 自动 `eslint --fix` + `prettier --write`
- **CI**：GitHub Actions 在 push / PR 时运行 `pnpm lint` + `pnpm build`
- **路径别名**：`@/` → `src/`（jsconfig.json 已配置）
