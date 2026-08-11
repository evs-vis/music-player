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
music-player/
├── README.md                        # 本文件：仓库总览
├── .gitignore                       # Git 忽略规则（前后端公共）
├── .github/
│   └── workflows/
│       └── ci.yml                   # GitHub Actions：push 时自动跑前端 lint + build
│
├── frontend/                        # ── 前端（Vue 3）──
│   ├── README.md                    # 前端详细说明（功能/技术栈/脚本/CI）
│   ├── package.json                 # 依赖与脚本（pnpm）
│   ├── pnpm-lock.yaml               # 依赖锁版本
│   ├── pnpm-workspace.yaml          # pnpm 配置（允许原生构建等）
│   ├── vite.config.js               # Vite 构建配置：代理 /api、手动分包、px→vw 适配
│   ├── eslint.config.js             # ESLint 扁平化配置
│   ├── .prettierrc.json             # Prettier 格式化规则
│   ├── .oxlintrc.json               # oxlint 快速 lint 配置
│   ├── .editorconfig                # 编辑器统一风格（缩进/换行）
│   ├── .gitattributes               # Git 换行符/合并策略
│   ├── .husky/
│   │   └── pre-commit               # 提交前自动跑 lint-staged（eslint + prettier）
│   ├── jsconfig.json                # JS 路径别名 @/ 智能提示
│   ├── postcss.config.cjs           # postcss：px → vw 移动端适配
│   ├── index.html                   # 入口 HTML + 首屏骨架（内联样式）
│   └── src/
│       ├── main.js                  # 入口：挂载应用、注册 Pinia/Router、全局错误捕获
│       ├── App.vue                  # 根组件：音频播放调度、播放状态持久化、全局 watch
│       ├── api/                     # 接口封装（axios 实例）
│       │   ├── auth.js              #   认证：登录/注册/修改密码/注销
│       │   ├── favorite.js          #   收藏
│       │   ├── history.js           #   播放历史
│       │   └── playlist.js          #   歌单/歌曲
│       ├── assets/                  # 静态资源（logo、默认头像）
│       ├── components/              # 通用组件
│       │   ├── AppHeader.vue        #   顶部栏（logo + 用户头像）
│       │   ├── MiniPlayer.vue       #   迷你播放条（常驻底部）
│       │   ├── PlaylistSheet.vue    #   播放列表抽屉（底部弹出）
│       │   ├── SettingsDrawer.vue   #   设置抽屉
│       │   ├── SongListPopup.vue    #   歌单列表弹窗
│       │   └── ErrorBoundary.vue    #   组件级错误边界（捕获渲染异常）
│       ├── composables/
│       │   └── useAudio.js          # 音频核心逻辑：播放/暂停/进度/歌词/重试/竞态防护
│       ├── router/
│       │   └── index.js             # 路由配置（懒加载）
│       ├── stores/                  # Pinia 状态管理
│       │   ├── index.js             #   统一导出
│       │   └── modules/
│       │       ├── player.js        #   播放器状态（歌曲/进度/音量/播放模式）
│       │       ├── auth.js          #   用户认证状态
│       │       ├── favorites.js     #   收藏状态
│       │       ├── history.js       #   播放历史状态
│       │       └── searchHistory.js #   搜索历史状态
│       ├── styles/                  # 全局样式
│       │   ├── variables.scss       #   SCSS 变量（颜色/尺寸）
│       │   ├── global.css           #   全局基础样式
│       │   └── notify.css           #   通知样式
│       ├── utils/                   # 工具函数
│       │   ├── request.js           #   axios 封装（拦截器/重试/取消）
│       │   ├── errorHandler.js      #   全局错误处理（window.onerror 等）
│       │   ├── memoryCache.js       #   内存缓存（TTL）
│       │   └── perf.js              #   性能监控（FCP/LCP/CLS/TBT）
│       └── views/                   # 页面组件
│           ├── layout/
│           │   ├── index.vue        #   布局：底部 Tabbar + 内容区
│           │   ├── HomePage.vue     #   首页（推荐歌单/热门歌曲）
│           │   ├── PlaylistPage.vue #   歌单分类页
│           │   ├── SearchPage.vue   #   搜索页
│           │   └── MinePage.vue     #   我的（用户中心）
│           ├── play/
│           │   └── PlayPage.vue     #   播放页（全屏播放器 + 歌词）
│           ├── playlistDetail/
│           │   └── PlaylistDetailPage.vue  # 歌单详情页
│           ├── login/
│           │   └── LoginPage.vue    #   登录页
│           ├── register/
│           │   └── RegisterPage.vue #   注册页
│           └── changePwd/
│               └── ChangePwd.vue    #   修改密码页
│
└── backend/                         # ── 后端（Node + Express）──
    ├── package.json                 # 依赖与脚本（pnpm）
    ├── pnpm-lock.yaml               # 依赖锁版本
    ├── .env.example                 # 环境变量示例（JWT_SECRET 等）
    ├── server.js                    # 服务入口：路由注册、静态资源、启动监听
    ├── store.js                     # 数据存储层：读取/写入 JSON 数据文件
    ├── jsonfs.js                    # JSON 文件读写封装（原子写入）
    ├── config.js                    # 配置：JWT 密钥、CORS 白名单
    ├── accessLog.js                 # 访问日志中间件
    ├── middleware/
    │   └── user.js                  # 用户鉴权中间件（JWT 校验）
    ├── scripts/
    │   └── optimize-covers.mjs      # 封面图压缩优化脚本（sharp）
    ├── data/                        # 数据文件（不入库）
    │   ├── songs.json               #   歌曲数据
    │   ├── playlists.json           #   歌单数据
    │   ├── users.json               #   用户数据（密码哈希）
    │   ├── favorites.json           #   收藏数据
    │   ├── history.json             #   播放历史
    │   └── searchHistory.json       #   搜索历史
    └── public/                      # 静态资源（不入库）
        ├── audio/                   #   音频文件（mp3）
        ├── covers/                  #   封面图（webp/png）
        └── avatars/                 #   用户头像
```

## 📜 主要脚本

| 位置 | 命令 | 说明 |
|---|---|---|
| frontend | `pnpm dev` | 开发服务器 |
| frontend | `pnpm build` | 生产构建 |
| frontend | `pnpm lint` | 代码检查（oxlint + eslint） |
| frontend | `pnpm format` | Prettier 格式化 |
| backend | `node scripts/optimize-covers.mjs` | 封面图压缩优化 |
