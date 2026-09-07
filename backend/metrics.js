// backend/metrics.js
// 「错误捕获 / 自愈」聚合计数存储：接收前端 utils/telemetry.js 的批量上报，供 GET /api/metrics 读取。
// 复用 createJsonStore（store.js）：启动读入内存 → 同步 mutate（单进程事件循环天然串行）→ 防抖落盘，
// 退出兜底由 server.js 统一 flush。
// 只存聚合计数（totals / byDay / 会话去重状态），不含 URL/stack/用户等隐私字段。
// 假设单进程运行（与 users.json 等数据文件一致）。
const { createJsonStore } = require('./store');

// 已知计数名白名单：与前端各 track() 调用点保持一致；未知键拒绝整个批次，防止脚本刷脏数据
const KNOWN_EVENTS = new Set([
  'capture.vue.render',
  'capture.window.error',
  'capture.unhandledrejection',
  'capture.router',
  'capture.boundary',
  'recover.chunk.tried',
  'recover.chunk.success',
  'recover.chunk.fail',
  'recover.network.tried',
  'recover.network.success',
  'recover.network.fail',
  'recover.audio.attempt',
  'recover.audio.success',
  'recover.audio.fail'
]);

const DEFAULT_DATA = { totals: {}, byDay: {}, sessions: {}, meta: {} };

function dayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function mergeInto(target, events) {
  for (const [k, v] of Object.entries(events)) {
    target[k] = (target[k] || 0) + v;
  }
}

const store = createJsonStore('metrics.json', DEFAULT_DATA);

// 只返回聚合 + 会话数，不暴露任何会话明细
function get() {
  const s = store.get();
  return {
    totals: { ...(s.totals || {}) },
    byDay: { ...(s.byDay || {}) },
    sessions: Object.keys(s.sessions || {}).length,
    meta: { ...(s.meta || {}) }
  };
}

// 校验并合并一个上报批次（同步）。合法入库返回 true；非法返回 false（调用方回 400）。
// 会话级去重：同一 (sessionId, batchNo) 只合并一次 —— 配合前端「收到 2xx 才清本地」实现 at-most-once，
// 重复投递（页面切后台未确认、响应丢失后的重投）不会重复入库。
function record(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  const { sessionId, batchNo, events } = payload;
  if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 128) return false;
  if (!Number.isInteger(batchNo) || batchNo < 0) return false;
  if (!events || typeof events !== 'object' || Array.isArray(events)) return false;

  const keys = Object.keys(events);
  if (!keys.length) return false;
  const clean = {};
  for (const k of keys) {
    const v = events[k];
    if (!KNOWN_EVENTS.has(k)) return false;
    if (!Number.isInteger(v) || v <= 0 || v > 1e6) return false;
    clean[k] = v;
  }

  const s = store.get();
  if (!s.totals) s.totals = {};
  if (!s.byDay) s.byDay = {};
  if (!s.sessions) s.sessions = {};
  if (!s.meta) s.meta = {};

  const sess = (s.sessions[sessionId] = s.sessions[sessionId] || { lastBatchNo: -1, lastSeen: 0 });
  if (batchNo <= sess.lastBatchNo) return true; // 该批次已处理过，幂等跳过
  sess.lastBatchNo = batchNo;
  sess.lastSeen = Date.now();

  mergeInto(s.totals, clean);
  const day = dayKey();
  const dayBucket = (s.byDay[day] = s.byDay[day] || {});
  mergeInto(dayBucket, clean);

  const now = new Date().toISOString();
  if (!s.meta.firstSeen) s.meta.firstSeen = now;
  s.meta.lastSeen = now;

  // 控制 sessions 表规模：仅保留最近 100 个会话的去重状态（去重只防重投，不需要全量历史）
  const sessionKeys = Object.keys(s.sessions);
  if (sessionKeys.length > 100) {
    sessionKeys.sort((a, b) => s.sessions[a].lastSeen - s.sessions[b].lastSeen);
    for (const stale of sessionKeys.slice(0, sessionKeys.length - 100)) {
      delete s.sessions[stale];
    }
  }

  store.touch();
  return true;
}

module.exports = {
  get,
  record,
  flushNowSync: () => store.flushNowSync(),
  flushNow: () => store.flushNow()
};
