const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { usersStore } = require('../store');

// 用户是否存在：读内存 store（注销后内存即时更新，token 立即失效，#39）
function userExists(userId) {
  const users = usersStore.get();
  return Array.isArray(users) && users.some(u => u.id === userId);
}

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    const token = header.split(' ')[1];
    // 显式限定 HS256，杜绝未来换成非对称密钥时发生算法混淆
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    // 注销后立即失效：校验用户仍存在于 users.json
    if (!userExists(decoded.userId)) {
      return res.status(401).json({ error: '账号已注销或不存在' });
    }
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Token无效' });
  }
};
