import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const iconsDir = path.resolve(__dirname, '../public/icons')
mkdirSync(iconsDir, { recursive: true })

const iconSvg = readFileSync(path.join(iconsDir, 'icon.svg'), 'utf8')
const maskableSvg = readFileSync(path.join(iconsDir, 'maskable.svg'), 'utf8')

function render(svg, width, height) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: 'transparent',
  })
  // Для точного размера по высоте при необходимости — здесь ширина задаёт масштаб,
  // исходники квадратные, поэтому высота совпадает.
  void height
  return resvg.render().asPng()
}

async function main() {
  // Стандартные иконки (квадратные исходники)
  writeFileSync(path.join(iconsDir, 'icon-192.png'), render(iconSvg, 192))
  writeFileSync(path.join(iconsDir, 'icon-512.png'), render(iconSvg, 512))
  writeFileSync(path.join(iconsDir, 'maskable-192.png'), render(maskableSvg, 192))
  writeFileSync(path.join(iconsDir, 'maskable-512.png'), render(maskableSvg, 512))
  writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), render(iconSvg, 180))

  // Сплэш-экраны (iOS apple-touch-startup-image)
  const mark = (scale, tx, ty) =>
    `<g transform="translate(${tx} ${ty}) scale(${scale})" fill="none" stroke="#ffffff" stroke-width="50" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M150 150 V362"/>` +
    `<path d="M200 256 L300 150"/>` +
    `<path d="M200 256 L300 362"/>` +
    `<path d="M360 192 A78 78 0 1 0 360 320"/>` +
    `</g>`

  const splashes = [
    { w: 375, h: 667, dpr: 2 },
    { w: 375, h: 812, dpr: 3 },
    { w: 390, h: 844, dpr: 3 },
    { w: 393, h: 852, dpr: 3 },
    { w: 414, h: 896, dpr: 3 },
    { w: 428, h: 926, dpr: 3 },
    { w: 430, h: 932, dpr: 3 },
    { w: 440, h: 956, dpr: 3 },
  ]

  const links = []
  for (const { w, h, dpr } of splashes) {
    const W = w * dpr
    const H = h * dpr
    const s = Math.round(Math.min(W, H) * 0.26)
    const tx = (W - s) / 2
    const ty = Math.round(H / 2 - s * 0.34)
    const wordY = Math.round(ty + s + s * 0.42)
    const fontSize = Math.round(s * 0.24)

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="#34d399"/>` +
      `<stop offset="0.55" stop-color="#10b981"/>` +
      `<stop offset="1" stop-color="#059669"/>` +
      `</linearGradient></defs>` +
      `<rect width="${W}" height="${H}" fill="url(#g)"/>` +
      mark(s / 512, tx, ty) +
      `<text x="${W / 2}" y="${wordY}" text-anchor="middle" font-family="-apple-system, Segoe UI, Roboto, sans-serif" font-weight="800" font-size="${fontSize}" fill="#ffffff" letter-spacing="-1">Keep Coin</text>` +
      `</svg>`

    const file = `splash-${w}x${h}.png`
    writeFileSync(path.join(iconsDir, file), render(svg, W, H))
    links.push(
      `<link rel="apple-touch-startup-image" href="/icons/${file}" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" />`,
    )
  }

  console.log('Generated icons + splash images.')
  console.log('--- apple-touch-startup-image links (add to index.html) ---')
  console.log(links.join('\n'))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
