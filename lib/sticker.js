import { extname } from 'node:path'

const EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp'])
const MAX_BYTES = 5 * 1024 * 1024

export function createSticker(config = {}, store, ctx) {
  const { fs } = store
  const dir = store.join('stickers')

  async function ensure() {
    await fs.mkdir(dir, { recursive: true })
  }

  function safeName(name) {
    const base = fs.basename(String(name || ''))
    if (!base || base === '.' || base === '..') throw new Error('非法文件名')
    if (!EXTS.has(extname(base).toLowerCase())) throw new Error(`不支持的表情格式：${extname(base)}`)
    return base
  }

  async function list() {
    await ensure()
    const names = await fs.readdir(dir)
    const out = []
    for (const n of names) {
      if (!EXTS.has(extname(n).toLowerCase())) continue
      const s = await fs.stat(`${dir}/${n}`).catch(() => null)
      out.push({ name: n, size: s?.size ?? 0, path: `${dir}/${n}` })
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  }

  async function addFromPath(sourcePath, name) {
    await ensure()
    const target = safeName(name || fs.basename(sourcePath))
    await fs.copyFile(sourcePath, `${dir}/${target}`)
    return { name: target, path: `${dir}/${target}` }
  }

  async function remove(name) {
    await ensure()
    const target = safeName(name)
    await fs.unlink(`${dir}/${target}`)
    return true
  }

  // 联网搜图：默认按 SerpAPI 的 Google Images 引擎实现，可换成任意兼容接口
  async function search(query) {
    const key = config.searchApiKey
    if (!key) throw new Error('未配置 sticker.searchApiKey，无法联网搜图')
    const endpoint = config.searchEndpoint ||
      `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(query)}&api_key=${key}`
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) throw new Error(`搜图失败：HTTP ${res.status}`)
    const data = await res.json()
    const url = data?.images_results?.[0]?.original
    if (!url) throw new Error('搜图未返回结果')

    const img = await fetch(url, { signal: AbortSignal.timeout(20_000) })
    if (!img.ok) throw new Error(`下载图片失败：HTTP ${img.status}`)
    const buf = Buffer.from(await img.arrayBuffer())
    if (buf.length > MAX_BYTES) throw new Error('图片超过 5MB 限制')

    const ext = EXTS.has(extname(new URL(url).pathname).toLowerCase())
      ? extname(new URL(url).pathname).toLowerCase()
      : '.png'
    const name = `search_${Date.now()}${ext}`
    await ensure()
    await fs.writeFile(`${dir}/${name}`, buf)
    return { name, path: `${dir}/${name}`, source: url, copyright: '图片来自网络，版权归原作者，请自行确认使用许可' }
  }

  // 自绘表情：调用 DSH 提供的图像生成能力（若当前版本可用）
  async function draw(prompt) {
    const generate = ctx?.image?.generate || ctx?.llm?.image
    if (typeof generate !== 'function') {
      throw new Error('当前 DSH 版本未提供图像生成能力，无法自绘表情包')
    }
    const result = await generate({ prompt, size: '512x512' })
    const buf = Buffer.isBuffer(result) ? result : Buffer.from(result?.data || result?.buffer || [])
    if (!buf.length) throw new Error('图像生成未返回有效数据')
    const name = `draw_${Date.now()}.png`
    await ensure()
    await fs.writeFile(`${dir}/${name}`, buf)
    return { name, path: `${dir}/${name}`, prompt }
  }

  return { ensure, list, addFromPath, remove, search, draw }
}