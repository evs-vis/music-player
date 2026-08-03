# 🎵 移动端音乐播放器

前后端分离的移动端 H5 音乐播放器**前端部分**，独立开发。Vue 3 + Vite + Pinia + Vant 4，搭配自建 Node.js 后端。

## ✨ 功能

- 全局音频播放器：播放/暂停/上下曲/进度拖动/音量，三种播放模式（列表循环 / 单曲循环 / 随机）
- 快速切歌竞态防护（单调递增播放序号），自动播放限制处理（首次手势后恢复播放 + 进度）
- 歌词同步高亮与平滑滚动（rAF + easeOutCubic 缓动），迷你/全屏双模式
- 歌单分类、搜索（300ms 防抖）、收藏、播放历史、搜索历史（按用户隔离）
- 用户中心：注册/登录/JWT 鉴权/修改密码/头像上传/注销账号

## 🛠 技术栈

Vue 3 · Vite 8 · Pinia 4 · Vant 4 · Vue Router 5 · Axios · SCSS · HTML5 Audio

## 🚀 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 启动后端（仓库根目录 backend/ 下）
cd ../backend
pnpm install
node server.js    # 默认 http://localhost:3000

# 3. 启动前端（回到 frontend/）
cd ../frontend
pnpm dev          # 默认 http://localhost:5173
```

> 前端通过 Vite 代理 `/api`、`/covers`、`/audio` 到后端，本地开发无需额外配置。
> 也可用 `VITE_API_BASE_URL` 环境变量指向线上后端。

## 📦 脚本

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm preview` | 预览构建产物 |
| `pnpm lint` | 代码检查（oxlint + eslint） |
| `pnpm format` | Prettier 格式化 |

## ✅ CI

GitHub Actions 在每次 push / PR 自动运行 `pnpm lint` + `pnpm build`（`.github/workflows/ci.yml`）。

## 📊 性能

- Vant 组件按需引入 + 路由懒加载：主入口 CSS 194KB → 59KB（gzip 32KB），主 JS gzip 68KB
- postcss-px-to-viewport 实现 375 设计稿到 vw 的全屏适配

<!-- 截图占位：
![首页](截图地址)
![播放页](截图地址)
-->
