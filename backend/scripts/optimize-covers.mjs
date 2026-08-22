/**
 * 封面图批量优化脚本
 *
 * 把 backend/public/covers/*.png 转为 WebP 并输出三个尺寸：
 *   - `N.webp`        480px 宽 —— 播放页全屏大图
 *   - `N-240.webp`    240px 宽 —— 歌单卡片/最近播放等中尺寸显示（176px/120px 显示按 2x 取 240px）
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
const MEDIUM_WIDTH = 240 // 中尺寸图宽度（176px 歌单卡 / 120px 最近播放，2x DPR 取 240px）
const THUMB_WIDTH = 112 // 列表小图宽度（56px 显示 × 2x DPR）
const QUALITY = 80 // WebP 质量

async function main() {
  const files = fs
    .readdirSync(coversDir)
    // 跳过已生成的 WebP；同时过滤 `-数字.扩展名` 的源文件（如 foo-240.png），
    // 避免它派生的输出名与 foo.png 的中尺寸（foo-240.webp）命名碰撞
    .filter(
      (f) =>
        /\.(png|jpe?g|gif)$/i.test(f) &&
        !f.startsWith('.') &&
        !/-\d+\.(png|jpe?g|gif)$/i.test(f)
    )
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

    // 中尺寸：240px
    outputs.push({
      size: 'medium',
      width: MEDIUM_WIDTH,
      out: path.join(coversDir, `${base}-240.webp`)
    })

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
