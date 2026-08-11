/**
 * 封面图批量优化脚本
 *
 * 把 backend/public/covers/*.png 转为 WebP 并输出两个尺寸：
 *   - `N.webp`        480px 宽 —— 播放页全屏大图
 *   - `N-112.webp`    112px 宽 —— 首页/搜索/列表小图（56px 显示按 2x 取 112px）
 *
 * 保留原 PNG（不删除，避免破坏既有引用/上传）。
 * 脚本幂等：已生成的 WebP 会重新生成覆盖。
 *
 * 用法：pnpm covers   （见 backend/package.json）
 */
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const coversDir = path.resolve(__dirname, '..', 'public', 'covers')

const LARGE_WIDTH = 480 // 播放页全屏大图宽度
const THUMB_WIDTH = 112 // 列表小图宽度（56px 显示 × 2x DPR）
const QUALITY = 80 // WebP 质量

async function main() {
  const files = fs
    .readdirSync(coversDir)
    .filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f) && !f.startsWith('.'))
    .sort()

  if (files.length === 0) {
    console.log('未找到封面文件，跳过。')
    return
  }

  let saved = 0
  let totalBefore = 0
  let totalAfter = 0

  for (const file of files) {
    const srcPath = path.join(coversDir, file)
    const base = path.basename(file, path.extname(file)) // 去掉扩展名，例如 "1"
    // 已生成的 WebP 跳过（避免把 WebP 再转一遍）
    if (path.extname(file).toLowerCase() === '.webp') continue

    const statBefore = fs.statSync(srcPath).size
    totalBefore += statBefore

    const src = sharp(srcPath)
    const meta = await src.metadata()
    const srcWidth = meta.width ?? 0

    const outputs = []

    // 大图：仅当源图比目标宽才缩小，否则原尺寸转码（不放大）
    if (srcWidth >= LARGE_WIDTH) {
      outputs.push({
        size: 'large',
        width: LARGE_WIDTH,
        out: path.join(coversDir, `${base}.webp`)
      })
    } else {
      outputs.push({
        size: 'large',
        width: null,
        out: path.join(coversDir, `${base}.webp`)
      })
    }

    // 小图：112px
    outputs.push({
      size: 'thumb',
      width: THUMB_WIDTH,
      out: path.join(coversDir, `${base}-112.webp`)
    })

    for (const o of outputs) {
      let pipeline = sharp(srcPath).rotate() // 保留 EXIF 方向
      if (o.width) pipeline = pipeline.resize(o.width)
      await pipeline.webp({ quality: QUALITY }).toFile(o.out)
      const sizeAfter = fs.statSync(o.out).size
      totalAfter += sizeAfter
      console.log(`✓ ${file} → ${path.basename(o.out)} (${o.size}: ${(sizeAfter / 1024).toFixed(1)}KB)`)
      saved++
    }
  }

  console.log('-------------------------------')
  console.log(`封面优化完成：${saved} 个输出文件`)
  console.log(`总体积 ${(totalBefore / 1024 / 1024).toFixed(2)}MB → ${(totalAfter / 1024 / 1024).toFixed(2)}MB`)
  console.log(`节省约 ${((1 - totalAfter / totalBefore) * 100).toFixed(0)}%`)
}

main().catch((err) => {
  console.error('优化失败:', err)
  process.exit(1)
})
