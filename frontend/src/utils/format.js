/**
 * 时间工具：播放时长格式化
 *
 * 非法值（NaN/Infinity/负数）统一兜底为 '0:00'，避免进度条/时长显示 NaN:NaN。
 * @param {number} seconds 秒数
 * @returns {string} mm:ss
 */
export function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
