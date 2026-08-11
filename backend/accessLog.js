// backend/accessLog.js
// 访问日志中间件：每个请求输出一行结构化日志（时间 方法 路径 状态码 耗时），零依赖
module.exports = function accessLog(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const line = `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    console.log(line);
  });
  next();
};
