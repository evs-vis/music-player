/**
 * 图片工具：封面小图派生 + 头像上传前压缩
 *
 * - thumbUrl/mediumUrl：按显示尺寸把站内封面派生为 `-112.webp` / `-240.webp` 小图。
 *   用于 `coverThumb`/`coverMedium` 字段缺失（如 localStorage 恢复的陈旧歌曲对象）时的兜底，
 *   避免小尺寸显示加载 480px 大图。
 * - compressImageFile：头像原图上传前用 canvas 压缩：createImageBitmap（自动应用 EXIF 方向）
 *   → 按最大边长等比缩放 → 输出 WebP。后端魔数校验支持 WebP，输出文件恒远小于 2MB 上传限制；
 *   任一步骤失败（如动图/异常文件）回退原始 File，交给后端校验兜底。
 */

// 最大边长：头像显示最大约 80px（登录卡），按 2x DPR 取 160px 足够清晰；后端上传接口还会再压一道
const MAX_SIZE = 160
const QUALITY = 0.82

// 站内封面扩展名（不含 query，query 已单独剥离）
const COVER_EXT_RE = /\.(png|jpe?g|gif|webp)$/i
// 已带尺寸后缀（-112 / -240）的路径，不再派生
const COVER_VARIANT_RE = /-\d+\.(png|jpe?g|gif|webp)(\?.*)?$/i

/**
 * 站内封面派生变体 URL：`/covers/1.png` → `/covers/1-112.webp`（保留原 query）。
 * 仅处理 `/` 开头的站内相对路径；空值、完整 URL（https://…）、已带尺寸后缀的路径原样返回。
 * @param {string} cover 封面 URL
 * @param {string} suffix 目标尺寸后缀，如 '112' / '240'
 * @returns {string}
 */
function toCoverVariant(cover, suffix) {
  if (!cover || !cover.startsWith('/')) return cover
  if (COVER_VARIANT_RE.test(cover)) return cover
  const [path, query] = cover.split('?')
  const derived = path.replace(COVER_EXT_RE, `-${suffix}.webp`)
  return query ? `${derived}?${query}` : derived
}

/** 112px 小图：歌曲行等 ≤56px 显示 */
export const thumbUrl = (cover) => toCoverVariant(cover, '112')

/** 240px 中图：歌单卡/最近播放等 120–176px 显示 */
export const mediumUrl = (cover) => toCoverVariant(cover, '240')

function supportsWebp() {
  return document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0
}

/**
 * 压缩图片文件
 * @param {File} file 原始图片文件
 * @returns {Promise<File>} 压缩后的图片文件（WebP/PNG，失败时返回原文件）
 */
export async function compressImageFile(file) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    // 优先 WebP（保 alpha、体积最小）；不支持时回退 PNG（同样保 alpha）
    const type = supportsWebp() ? 'image/webp' : 'image/png'
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob 返回空'))),
        type,
        QUALITY
      )
    })
    const baseName = file.name.replace(/\.[^.]+$/, '')
    const ext = type === 'image/webp' ? 'webp' : 'png'
    return new File([blob], `${baseName}.${ext}`, { type })
  } catch {
    return file // 压缩失败回退原文件
  }
}
