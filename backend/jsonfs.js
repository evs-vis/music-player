// backend/jsonfs.js
// JSON 文件读写工具：原子写 + 损坏兜底（从 server.js 迁移，行为零变化）
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');

// 原子写文件：先写临时文件再 rename，避免写入中途进程崩溃留下半截 JSON/图片。
// 临时文件与目标同目录，保证 rename 在同一文件系统内原子完成。
function writeFileAtomic(filePath, content) {
  const dir = path.dirname(filePath);
  const tempPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tempPath, content);
  fs.renameSync(tempPath, filePath);
}

// 读取 JSON；文件缺失/损坏时返回 fallback（默认 null），不再让进程崩溃
function readJSON(filename, fallback = null) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[readJSON] 读取 ${filename} 失败：${err.message}（回退为默认值）`);
    return fallback;
  }
}

// 原子写 JSON
function writeJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  writeFileAtomic(filePath, JSON.stringify(data, null, 2));
}

module.exports = { DATA_DIR, writeFileAtomic, readJSON, writeJSON };
