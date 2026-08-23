# 移动端音乐播放器 — 前端开发文档

Vue 3 移动端 H5 前端。本文档聚焦**前端开发相关内容**（代码结构、核心模块、状态管理、样式与性能实现）；项目总览、启动方式、页面路由、API 概述见[根 README](../README.md)。

---

## 目录

- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [核心模块](#核心模块)
- [状态管理](#状态管理)
- [组件](#组件)
- [路由设计](#路由设计)
- [样式与适配](#样式与适配)
- [性能优化](#性能优化)
- [开发规范](#开发规范)

---

## 技术栈

| 类别         | 技术                                                      |
| ------------ | --------------------------------------------------------- |
| **框架**     | Vue 3（组合式 API）· Vue Router 5 · Pinia 4               |
| **UI**       | Vant 4（按需引入）· SCSS                                  |
| **HTTP**     | Axios（拦截器/重试/取消/缓存）                            |
| **构建**     | Vite 8 · unplugin-vue-components · postcss-px-to-viewport |
| **代码质量** | oxlint · ESLint · Prettier                                |

> 前端工程化配置（husky、lint-staged、CI）见[开发规范](#开发规范)。

---

## 目录结构

```
src/
├── main.js                 # 入口：挂载应用、注册 Pinia/Router、全局错误捕获
├── App.vue                 # 根组件：音频播放调度、播放状态持久化、全局 watch
├── api/                    # 接口封装
│   ├── auth.js             #   认证：登录/注册/改密/注销/头像
│   ├── favorite.js         #   收藏
│   ├── history.js          #   播放/搜索历史
│   └── playlist.js         #   歌单/歌曲
├── assets/                 # 静态资源（logo、默认头像）
├── components/             # 通用组件（见下方「组件」）
├── composables/
│   └── useAudio.js         # 音频引擎：播放/进度/歌词/重试/竞态防护
├── router/
│   └── index.js            # 路由（懒加载 + 登录守卫，见「路由设计」）
├── stores/
│   ├── index.js            # 统一导出
│   └── modules/            # 状态模块（见「状态管理」）
├── styles/                 # 全局样式（variables.scss / global.css / notify.css）
├── utils/
│   ├── request.js          # axios 封装（拦截器/重试/取消）
│   ├── errorHandler.js     # 全局错误处理
│   ├── memoryCache.js      # 内存缓存（TTL）
│   ├── perf.js             # 性能监控（FCP/LCP/CLS/TBT）
│   └── image.js            # 图片处理：上传前压缩、封面缩略图派生
└── views/                  # 页面
    ├── layout/             #   布局 + 4 个 Tabbar 页
    ├── play/               #   播放页
    ├── playlistDetail/     #   歌单详情
    ├── login/              #   登录
    ├── register/           #   注册
    └── changePwd/          #   修改密码
```

---

## 核心模块

### useAudio — 音频引擎

位于 [src/composables/useAudio.js](src/composables/useAudio.js)，管理**单个全局 `<audio>` 元素**（创建于 App.vue，全应用共享）：

| API                  | 说明                           |
| -------------------- | ------------------------------ |
| `loadAndPlay(song)`  | 加载并播放歌曲（歌词按需拉取） |
| `play()` / `pause()` | 播放 / 暂停                    |
| `seek(time)`         | 跳转进度                       |
| `setVolume(vol)`     | 设置音量                       |
| `retryPlayback()`    | 加载失败后重试当前歌曲         |

**关键设计**：

- **切歌竞态防护**：单调递增播放序号，快速切歌时旧请求不覆盖新歌状态
- `el.preload = 'metadata'`：音频只预载元数据，降低带宽
- `waiting` / `canplay` 事件驱动缓冲加载态（`player.isBuffering`）
- `error` 事件置 `player.audioError`，UI 显示重试按钮

### image.js — 图片处理

位于 [src/utils/image.js](src/utils/image.js)，统一图片压缩与缩略图地址派生：

| API                       | 说明                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `compressImageFile(file)` | 上传前压缩：`createImageBitmap` → canvas 重绘（保留 EXIF 方向）→ WebP 导出，压缩后恒小于后端 2MB 限制，失败回退原文件 |
| `thumbUrl(cover)`         | 把 `/covers/N.png` 派生为 `/covers/N-112.webp`（44/48px 小图场景）                                                    |
| `mediumUrl(cover)`        | 派生 `/covers/N-240.webp`（中等场景，如「我的」页最近播放）                                                           |

### api/ — 接口层

基于 [src/utils/request.js](src/utils/request.js) 封装的 axios 实例，统一处理：

- **JWT 注入**：请求头自动带 `Authorization: Bearer <token>`
- **401 处理**：token 失效跳转登录
- **请求重试**：网络失败自动重试
- **同 key 取消**：AbortController 取消重复请求
- **内存缓存**：`createMemoryCache`（TTL 60s）缓存幂等 GET

### utils/ — 工具

| 文件              | 作用                                                                                |
| ----------------- | ----------------------------------------------------------------------------------- |
| `request.js`      | axios 实例与拦截器（见上）                                                          |
| `errorHandler.js` | 全局错误捕获（`app.config.errorHandler` + `window.onerror` + `unhandledrejection`） |
| `memoryCache.js`  | 带 TTL 的内存缓存工厂                                                               |
| `perf.js`         | PerformanceObserver 性能指标采集                                                    |
| `image.js`        | 图片压缩与缩略图派生（见上）                                                        |

---

## 状态管理

基于 Pinia，位于 [src/stores/modules/](src/stores/modules/)：

| Store           | 职责                                                    | 持久化         |
| --------------- | ------------------------------------------------------- | -------------- |
| `player`        | 当前歌曲、播放列表、进度、音量、播放模式、缓冲/错误状态 | 音量、播放模式 |
| `auth`          | 用户信息、登录状态                                      | 用户 token     |
| `favorites`     | 收藏列表                                                | —              |
| `history`       | 播放历史                                                | —              |
| `searchHistory` | 搜索历史                                                | —              |

**player store 与音频引擎的联动**（App.vue 中定义）：

| watch 目标       | 触发动作       |
| ---------------- | -------------- |
| `currentSong`    | 加载并播放新歌 |
| `isPlaying`      | 播放 / 暂停    |
| `seekTime`       | 跳转进度       |
| `volume`         | 调节音量       |
| `retryRequested` | 重试加载       |

> 进度节流保存：`playlist` 深监听、`currentTime` 浅监听（高频 update 不深遍历）。

---

## 组件

| 组件                 | 说明                                                        |
| -------------------- | ----------------------------------------------------------- |
| `AppHeader.vue`      | 顶部栏：logo + 用户头像                                     |
| `MiniPlayer.vue`     | 迷你播放条：常驻底部，展示当前歌曲 + 播放控制               |
| `PlaylistSheet.vue`  | 播放列表抽屉（底部弹出，切歌/删除）                         |
| `SettingsDrawer.vue` | 设置抽屉（播放模式等）                                      |
| `SongListPopup.vue`  | 歌单列表弹窗                                                |
| `ErrorBoundary.vue`  | 组件级错误边界：`onErrorCaptured` 捕获渲染异常，展示兜底 UI |

---

## 路由设计

基于 vue-router，配置在 [src/router/index.js](src/router/index.js)：

- **懒加载**：所有页面 `() => import(...)`，独立 chunk
- **布局复用**：4 个 Tabbar 页为 `layout` 的子路由，共用底部导航
- **meta 约定**：
  - `title`：页面标题
  - `showTabbar`：是否显示底部 Tabbar（二级页为 `false`）
  - `requiresAuth`：需登录，由 `router.beforeEach` 拦截跳转 `/login`
- 根路径 `/` 重定向到 `/home`

---

## 样式与适配

| 方案         | 实现                                                            |
| ------------ | --------------------------------------------------------------- |
| **单位适配** | postcss-px-to-viewport：375 设计稿 px 自动转 vw，全屏适配       |
| **变量**     | `variables.scss`：颜色、尺寸（tabbar 高度、mini-player 高度等） |
| **全局样式** | `global.css`（基础）· `notify.css`（通知）                      |
| **作用域**   | 组件样式统一 `scoped`                                           |

---

## 性能优化

| 优化项         | 实现                                                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **首屏骨架屏** | index.html 内联骨架；`router.isReady()` 延迟挂载消除闪烁                                                                                                                                                |
| **路由懒加载** | 每页独立 chunk                                                                                                                                                                                          |
| **分包策略**   | Vue 生态 / axios 独立 chunk（Rolldown manualChunks）；Vant 不手动分组，由 Rolldown 按依赖自然拆分到使用它的路由 chunk，懒加载才下载对应组件（首屏业务入口仅 46.7KB / gzip 18.3KB）                      |
| **按需引入**   | Vant 自动注册（unplugin-vue-components），样式按组件引入、按路由拆分                                                                                                                                    |
| **图片优化**   | 封面三档 WebP（480/240/112，后端 sharp 生成），列表/小图场景引用 `coverThumb` / `mediumUrl`；头像上传前 `compressImageFile` 压缩转 WebP（默认头像 4.4KB）；首页前 3 张 `fetchpriority=high`，其余懒加载 |
| **音频优化**   | `preload=metadata` + 失败重试                                                                                                                                                                           |
| **内存缓存**   | 幂等 GET 走 TTL 缓存                                                                                                                                                                                    |
| **性能监控**   | PerformanceObserver 采集 FCP/LCP/CLS/TBT                                                                                                                                                                |

---

## 开发规范

> 前端编码约定与工程化细节见 [docs/前端开发规范.md](../docs/前端开发规范.md)；前后端整体规范见 [docs/开发规范.md](../docs/开发规范.md)。

- **代码检查**：`pnpm lint` = `run-s lint:oxlint lint:eslint`（oxlint 快速 + eslint 深度）
- **提交前**：husky + lint-staged 自动 `eslint --fix` + `prettier --write`
- **CI**：GitHub Actions 在 push / PR 时运行 `pnpm lint` + `pnpm build`
- **路径别名**：`@/` → `src/`（`jsconfig.json` 已配置，编辑器自动提示）
