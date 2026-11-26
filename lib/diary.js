function pad(n) { return String(n).padStart(2, '0') }

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function createDiary(config = {}, store) {
  const { fs } = store
  const dir = store.join('diary')

  async function ensure() {
    await fs.mkdir(dir, { recursive: true })
  }

  async function write({ content, mood = '', dateKey = todayKey() }) {
    if (!content || !String(content).trim()) throw new Error('日记内容不能为空')
    await ensure()
    const body = `---\ndate: ${dateKey}\nmood: ${mood || '平静'}\n---\n\n${String(content).trim()}\n`
    await fs.writeFile(`${dir}/${dateKey}.md`, body, 'utf8')
    return { dateKey, path: `${dir}/${dateKey}.md` }
  }

  async function read(dateKey) {
    try {
      const raw = await fs.readFile(`${dir}/${dateKey}.md`, 'utf8')
      const match = raw.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/)
      if (!match) return { dateKey, mood: '', content: raw }
      const meta = {}
      for (const line of match[1].split('\n')) {
        const idx = line.indexOf(':')
        if (idx > -1) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
      }
      return { dateKey, mood: meta.mood || '', content: match[2].trim() }
    } catch {
      return null
    }
  }

  async function list(limit = 30) {
    await ensure()
    const names = (await fs.readdir(dir)).filter(n => n.endsWith('.md'))
    const keys = names.map(n => n.replace(/\.md$/, '')).sort().reverse().slice(0, limit)
    const out = []
    for (const k of keys) {
      const entry = await read(k)
      if (entry) out.push(entry)
    }
    return out
  }

  async function has(dateKey = todayKey()) {
    return Boolean(await read(dateKey))
  }

  return { ensure, write, read, list, has, todayKey }
}