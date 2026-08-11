// backend/config.js
// 集中配置：从环境变量读取，未配置时回退开发默认值（打印警告）

// JWT 密钥：生产环境必须设置 JWT_SECRET。
// 未设置时回退到内置开发密钥 —— 与旧硬编码值完全一致，因此
// 已签发的旧 token 在未设置 JWT_SECRET 时依然有效，不会登录失效。
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('[security] 未设置 JWT_SECRET 环境变量，使用内置开发密钥。生产环境请通过环境变量注入。');
  return 'music-player-secret-key';
})();

// CORS 白名单：默认仅放行 Vite 开发服务器 http://localhost:5173。
// 可用 CORS_ORIGINS 以逗号分隔追加额外来源，例如：
//   CORS_ORIGINS="http://localhost:5174,http://192.168.1.5:5173"
const DEFAULT_ORIGINS = ['http://localhost:5173'];
const EXTRA_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : [];
const CORS_ORIGINS = [...new Set([...DEFAULT_ORIGINS, ...EXTRA_ORIGINS])];

module.exports = { JWT_SECRET, CORS_ORIGINS };
