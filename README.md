# 移动端音乐播放器

前后端分离的移动端 H5 音乐播放器，独立开发。支持全局音频播放、歌词同步高亮、歌单/搜索/收藏、用户账号体系，覆盖从浏览到播放的完整音乐消费链路。

## 目录

- [系统架构](#系统架构)
- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [快速开始](#快速开始)
- [页面与路由](#页面与路由)
- [API 概述](#api-概述)
- [开发规范](#开发规范)

---

## 系统架构

前后端分离架构：**Vue 3 前端**（H5 移动端）通过 HTTP 调用 **Express 后端**，后端基于 JSON 文件存储，无需数据库。

```
┌─────────────────────────────────────────────────────────────┐
│                        浏览器 (H5)                           │
│                                                             │
│   ┌───────────────────────────────────────────────────────┐ │
│   │                  Vue 3 前端 (Vite)                     │ │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │ │
│   │  │  视图层   │  │  状态层   │  │  音频引擎  │             │ │
│   │  │  views   │  │  Pinia   │  │  useAudio │             │ │
│   │  └────┬─────┘  └────┬─────┘  └──────────┘             │ │
│   │       │  Router     │                                  │ │
│   │  ┌────▼─────────────▼──────────────┐                   │ │
│   │  │         API 层 (axios)          │                   │ │
│   │  │   拦截器 / 重试 / 取消 / 缓存     │                   │ │
│   │  └───────────────┬─────────────────┘                   │ │
│   └──────────────────┼─────────────────────────────────────┘ │
└──────────────────────┼─────────────────────────────────────┘
                       │ HTTP (代理 /api, /audio, /covers, /avatars)
┌──────────────────────▼─────────────────────────────────────┐
│              Express 后端 (Node.js)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  路由层     │  │  鉴权中间件  │  │  静态资源    │            │
│  │  server.js │  │   JWT      │  │ audio/封面  │            │
│  └─────┬──────┘  └────────────┘  └────────────┘            │
│  ┌─────▼──────┐                                            │
│  │  存储层     │  JSON 文件（轻量，无需数据库）                │
│  │  store.js  │                                            │
│  └────────────┘                                            │
└────────────────────────────────────────────────────────────┘
```

**数据流**：前端 `api/` 层（axios）→ Express 路由 → `store.js` 读取/写入 JSON 文件 → 返回数据 → Pinia 更新状态 → 视图渲染。音频、封面、头像作为静态资源由后端托管，前端通过 Vite 代理直接访问。

---

## 核心功能

| 模块       | 功能                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| 全局播放器 | 播放/暂停、上下曲、进度拖动、音量调节、三种播放模式（列表循环/单曲循环/随机）                                      |
| 歌词同步   | 歌词逐行高亮 + 平滑滚动（rAF + easeOutCubic 缓动），迷你/全屏双模式                                                |
| 播放体验   | 快速切歌竞态防护、缓冲/加载失败重试、自动播放限制处理（手势后恢复）                                                |
| 歌单系统   | 歌单分类浏览、歌单详情、歌曲列表                                                                                   |
| 搜索       | 300ms 防抖搜索，搜索历史（按用户隔离）                                                                             |
| 收藏       | 歌曲收藏，收藏列表按用户隔离                                                                                       |
| 播放历史   | 自动记录播放历史，支持清除                                                                                         |
| 用户中心   | 注册/登录（JWT 鉴权）、修改密码、头像上传（前端压缩）、注销账号                                                    |
| 性能优化   | 首屏骨架屏、路由懒加载、Vue 生态/axios 独立分包、Vant 按路由按需加载、内存缓存、性能监控（FCP/LCP/CLS）            |
| 图片优化   | 封面三档 WebP（480/240/112，sharp 生成）、小尺寸场景引用缩略图、头像上传前 canvas 压缩转 WebP、默认头像 4.4KB WebP |
| 健壮性     | 5 层错误捕获体系、全局错误处理、组件级错误边界                                                                     |

---

## 技术栈

| 层             | 技术                                                                      |
| -------------- | ------------------------------------------------------------------------- |
| **前端框架**   | Vue 3 · Vue Router 5 · Pinia 4                                            |
| **UI 组件**    | Vant 4 · SCSS · postcss-px-to-viewport（375 设计稿 → vw 适配）            |
| **构建工具**   | Vite · unplugin-vue-components（按需引入）· oxlint · ESLint · Prettier    |
| **状态持久化** | pinia-plugin-persistedstate（音量、播放模式等）                           |
| **后端框架**   | Express 5 · jsonwebtoken · bcryptjs                                       |
| **文件处理**   | multer（头像上传）· sharp（封面三档 WebP）· 前端 canvas（头像上传前压缩） |
| **工程化**     | pnpm · husky + lint-staged（提交前自动格式化）· GitHub Actions CI         |

---

## 目录结构

```
music-player/
├── README.md                     # 仓库总览（本文件）
├── .github/workflows/ci.yml      # GitHub Actions：自动 lint + build
├── frontend/                     # ── Vue 3 前端 ──
│   ├── README.md                 # 前端详细说明
│   ├── src/                      # 源码
│   │   ├── api/                  #   axios 接口封装（auth/favorite/history/playlist）
│   │   ├── components/           #   通用组件（AppHeader/MiniPlayer/ErrorBoundary 等）
│   │   ├── composables/          #   组合式函数（useAudio 音频核心逻辑）
│   │   ├── router/               #   路由配置（懒加载 + 登录守卫）
│   │   ├── stores/               #   Pinia 状态管理（player/auth/favorites/history）
│   │   ├── styles/               #   全局样式（variables.scss/global.css）
│   │   ├── utils/                #   工具函数（request/errorHandler/memoryCache/perf/image 等）
│   │   └── views/                #   页面组件（layout/play/login/register 等）
│   └── index.html                # 入口 HTML + 首屏骨架屏
└── backend/                      # ── Node.js 后端 ──
    ├── server.js                 # Express 入口：路由注册、静态资源、启动
    ├── store.js                  # 数据存储层（JSON 文件读写）
    ├── jsonfs.js                 # JSON 原子写入封装
    ├── config.js                 # 配置（JWT 密钥、CORS 白名单）
    ├── accessLog.js              # 访问日志中间件
    ├── middleware/user.js        # JWT 鉴权中间件
    ├── scripts/                  # 工具脚本（封面三档 WebP 生成）
    ├── data/                     # 数据文件（不入库）
    └── public/                   # 静态资源：audio/ covers/ avatars/（不入库）
```

> 二级目录展开到 `src/` 下的一级子目录和 `backend/` 下的文件；更深的细节见 [frontend/README.md](frontend/README.md)。

---

## 快速开始

### 环境要求

- **Node.js** ≥ 22.18（推荐 22 LTS 或 24）
- **pnpm** ≥ 9（本项目使用 pnpm 11.13.1）

### 安装与启动

```bash
# 1. 克隆仓库
git clone https://github.com/evs-vis/music-player.git
cd music-player

# 2. 启动后端
cd backend
pnpm install
node server.js          # 默认 http://localhost:3000

# 3. 启动前端（另开终端）
cd ../frontend
pnpm install
pnpm dev                # 默认 http://localhost:5173
```

打开浏览器访问 `http://localhost:5173` 即可使用。

### 环境变量

| 变量                | 位置     | 说明                                                 |
| ------------------- | -------- | ---------------------------------------------------- |
| `VITE_API_BASE_URL` | frontend | 前端指向后端地址（默认走 Vite 代理，无需设置）       |
| `JWT_SECRET`        | backend  | JWT 签名密钥（生产环境必填，未设置时用内置开发密钥） |

### 常用脚本

| 位置     | 命令                               | 说明                              |
| -------- | ---------------------------------- | --------------------------------- |
| frontend | `pnpm dev`                         | 启动开发服务器                    |
| frontend | `pnpm build`                       | 生产构建                          |
| frontend | `pnpm preview`                     | 预览构建产物                      |
| frontend | `pnpm lint`                        | 代码检查（oxlint + eslint）       |
| frontend | `pnpm format`                      | Prettier 格式化                   |
| backend  | `node scripts/optimize-covers.mjs` | 封面三档 WebP 生成（480/240/112） |

---

## 页面与路由

| 路由                  | 页面     | 说明                                      | 需登录 |
| --------------------- | -------- | ----------------------------------------- | ------ |
| `/home`               | 首页     | 推荐歌单、热门歌曲（Tabbar 一级页）       | —      |
| `/category`           | 歌单分类 | 按分类浏览歌单（Tabbar 一级页）           | —      |
| `/search`             | 搜索     | 搜索歌曲、搜索历史（Tabbar 一级页）       | —      |
| `/mine`               | 我的     | 用户中心、收藏、播放历史（Tabbar 一级页） | 是     |
| `/playlist/:category` | 歌单详情 | 歌单内歌曲列表                            | —      |
| `/play`               | 播放页   | 全屏播放器 + 歌词同步                     | —      |
| `/login`              | 登录     | 账号登录                                  | —      |
| `/register`           | 注册     | 注册新账号                                | —      |
| `/changePwd`          | 修改密码 | 修改登录密码                              | 是     |

> 一级页（首页/歌单/搜索/我的）带底部 Tabbar；二级页（播放/详情/登录等）无 Tabbar。`requiresAuth` 路由由路由守卫统一拦截跳转登录。

---

## API 概述

基础路径：`/api`（开发环境经 Vite 代理到 `http://localhost:3000`）

### 歌曲 & 歌单

| 方法  | 路径             | 说明                               |
| ----- | ---------------- | ---------------------------------- |
| `GET` | `/api/songs`     | 获取歌曲列表（剥离歌词，按需拉取） |
| `GET` | `/api/songs/:id` | 获取歌曲详情（含歌词）             |
| `GET` | `/api/playlists` | 获取歌单列表                       |

### 认证（公开）

| 方法   | 路径            | 说明                   |
| ------ | --------------- | ---------------------- |
| `POST` | `/api/register` | 注册账号（不自动登录） |
| `POST` | `/api/login`    | 登录（返回 JWT）       |

### 用户数据（需 `Authorization: Bearer <token>`）

| 方法           | 路径                       | 说明                                                           |
| -------------- | -------------------------- | -------------------------------------------------------------- |
| `GET` / `POST` | `/api/user/favorites`      | 获取 / 添加收藏                                                |
| `GET` / `POST` | `/api/user/history`        | 获取 / 添加播放历史                                            |
| `DELETE`       | `/api/user/history`        | 清空播放历史                                                   |
| `GET` / `POST` | `/api/user/search-history` | 获取 / 添加搜索历史                                            |
| `DELETE`       | `/api/user/search-history` | 清空搜索历史                                                   |
| `PUT`          | `/api/user/password`       | 修改密码                                                       |
| `POST`         | `/api/user/avatar`         | 上传头像（multipart/form-data，前端压缩后恒小于后端 2MB 限制） |
| `DELETE`       | `/api/user`                | 注销账号                                                       |

### 静态资源

| 路径         | 说明                                              |
| ------------ | ------------------------------------------------- |
| `/audio/*`   | 音频文件（MP3）                                   |
| `/covers/*`  | 歌曲封面图（含 `-112.webp` / `-240.webp` 缩略图） |
| `/avatars/*` | 用户头像                                          |

> 登录返回 `{ token, user }`；注册返回 `{ message }`；错误响应统一 `{ error: "描述" }`。

---

## 开发规范

> 完整约定见 [docs/开发规范.md](docs/开发规范.md)（全面）与 [docs/前端开发规范.md](docs/前端开发规范.md)（前端专项）。

- **代码检查**：oxlint + ESLint（`pnpm lint`），提交前由 husky + lint-staged 自动运行 `eslint --fix` + `prettier --write`
- **分支**：默认 `master`，功能开发建议开 `feature/*` 分支
- **CI**：push / PR 时自动运行 lint + build（`.github/workflows/ci.yml`）
- **数据隔离**：后端 JSON 数据文件（`backend/data/`）不入库，含用户密码哈希等隐私数据
