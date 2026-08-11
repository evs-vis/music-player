# 🎵 移动端音乐播放器

前后端分离的移动端 H5 音乐播放器，独立开发。

| 子项目 | 说明 | 技术栈 |
|---|---|---|
| [frontend/](frontend/) | 移动端 H5 前端 | Vue 3 · Vite · Pinia · Vant 4 · Vue Router · Axios |
| [backend/](backend/) | 自建 Node 后端 | Express · jsonwebtoken · bcryptjs · multer · sharp |

功能：全局音频播放器（播放/暂停/上下曲/进度拖动/音量/三种播放模式）、歌词同步高亮与平滑滚动、歌单分类、搜索、收藏、播放历史（按用户隔离）、注册/登录/JWT 鉴权/修改密码/头像上传。

## 🚀 快速开始

```bash
# 1. 启动后端
cd backend
pnpm install
node server.js          # 默认 http://localhost:3000

# 2. 启动前端（另开终端）
cd frontend
pnpm install
pnpm dev                # 默认 http://localhost:5173
```

> 前端通过 Vite 代理 `/api`、`/covers`、`/audio` 到后端，本地开发无需额外配置；
> 也可用 `VITE_API_BASE_URL` 环境变量指向线上后端。

## 📦 项目结构

```
.
├── frontend/    # Vue 3 前端（详细说明见 frontend/README.md）
├── backend/     # Express 后端
└── README.md
```

## 📜 主要脚本

| 位置 | 命令 | 说明 |
|---|---|---|
| frontend | `pnpm dev` | 开发服务器 |
| frontend | `pnpm build` | 生产构建 |
| frontend | `pnpm lint` | 代码检查（oxlint + eslint） |
| backend | `node scripts/optimize-covers.mjs` | 封面图压缩优化 |
