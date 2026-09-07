// backend/store.js
// 可变 JSON 数据的内存缓存层：
//  - 启动时读入内存，接口只读写内存，消除每次请求全量 readFileSync + JSON.parse（清单 #32）
//  - mutate 串行写队列 + 防抖落盘：连续操作只落盘最后一次，磁盘写入频率大幅降低
//  - flush 失败只记日志不崩溃，内存数据保留；进程退出时同步 flush 兜底
const { writeJSON, readJSON } = require('./jsonfs');

function createJsonStore(filename, defaultValue, { flushDelay = 10000 } = {}) {
  let data = readJSON(filename, defaultValue);
  let queue = Promise.resolve(); // 写队列：串行化所有 mutate，避免并发读改写竞态
  let flushTimer = null;

  const flushNow = () => {
    flushTimer = null;
    try {
      writeJSON(filename, data);
    } catch (e) {
      console.error(`[store] ${filename} 落盘失败：${e.message}`);
    }
  };
  const scheduleFlush = () => {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flushNow, flushDelay);
  };
  const flushNowSync = () => {
    if (flushTimer) clearTimeout(flushTimer);
    try {
      writeJSON(filename, data);
    } catch (e) {
      console.error(`[store] ${filename} 同步落盘失败：${e.message}`);
    }
  };

  return {
    // 读内存引用（Node 单线程，读改写在同一同步段内原子；调用方直接修改引用）
    get() {
      return data;
    },
    // 已直接修改 get() 返回的内存引用，立即调度一次防抖落盘
    touch() {
      scheduleFlush();
    },
    flushNow,
    flushNowSync
  };
}

module.exports = {
  createJsonStore,
  usersStore: createJsonStore('users.json', []),
  favoritesStore: createJsonStore('favorites.json', {}),
  historyStore: createJsonStore('history.json', {}),
  searchHistoryStore: createJsonStore('searchHistory.json', {})
};
