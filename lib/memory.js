const TTL_DAYS = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 7, 6: 10, 7: 14, 8: 21, 9: 30, 10: Infinity }
const DAY = 86_400_000

export function createMemory(config = {}, store) {
  const file = 'memory.json'
  const maxEntries = config.maxEntries ?? 500
  const defaultTTL = config.defaultTTLDays ?? 7
  let entries = []

  function ttlMs(importance) {
    if (importance >= 10) return Infinity
    const days = TTL_DAYS[importance] ?? defaultTTL
    return days === Infinity ? Infinity : days * DAY
  }

  async function load() {
    const data = await store.read(file, { entries: [] })
    entries = Array.isArray(data?.entries) ? data.entries : []
  }
  function save() {
    store.write(file, { entries }).catch(() => {})
  }

  function prune() {
    const now = Date.now()
    const before = entries.length
    entries = entries.filter(e => e.pinned || now - e.lastAccessedAt <= ttlMs(e.importance))
    if (entries.length > maxEntries) {
      entries.sort((a, b) =>
        (Number(b.pinned) - Number(a.pinned)) ||
        (b.importance - a.importance) ||
        (b.lastAccessedAt - a.lastAccessedAt)
      )
      entries = entries.slice(0, maxEntries)
    }
    if (entries.length !== before) save()
  }

  function add({ content, subject = 'event', importance = 5, tags = [], pinned = false }) {
    if (!content || !String(content).trim()) throw new Error('记忆内容不能为空')
    const now = Date.now()
    const entry = {
      id: `m_${now}_${Math.random().toString(36).slice(2, 8)}`,
      content: String(content).trim(),
      subject,
      importance: Math.max(1, Math.min(10, Number(importance) || 5)),
      tags: Array.isArray(tags) ? tags.slice(0, 8) : [],
      pinned: Boolean(pinned),
      createdAt: now,
      lastAccessedAt: now
    }
    entries.push(entry)
    prune()
    save()
    return entry
  }

  function tokenize(query) {
    return String(query || '').toLowerCase().split(/[\s,，。、;；:：!！?？]+/).filter(Boolean)
  }

  function recall(query, limit = 8) {
    const tokens = tokenize(query)
    const now = Date.now()
    const scored = entries.map(e => {
      const text = `${e.content} ${e.tags.join(' ')}`.toLowerCase()
      let score = 0
      for (const t of tokens) {
        if (text.includes(t)) score += 1
        if (e.tags.some(tag => tag.toLowerCase().includes(t))) score += 2
      }
      score += e.importance / 10
      if (e.pinned) score += 3
      // 越久没被想起，权重略降
      score += Math.max(0, 1 - (now - e.lastAccessedAt) / (30 * DAY)) * 0.5
      return { e, score }
    })
    const hits = scored
      .filter(x => x.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.e)
    for (const e of hits) e.lastAccessedAt = now
    if (hits.length) save()
    return hits
  }

  function recent(limit = 20) {
    return [...entries]
      .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (b.createdAt - a.createdAt))
      .slice(0, limit)
  }

  function top(limit = 10) {
    return [...entries].sort((a, b) => b.importance - a.importance).slice(0, limit)
  }

  function pin(id, pinned = true) {
    const e = entries.find(x => x.id === id)
    if (!e) throw new Error(`未找到记忆：${id}`)
    e.pinned = Boolean(pinned)
    save()
    return e
  }

  function remove(id) {
    const before = entries.length
    entries = entries.filter(x => x.id !== id)
    if (entries.length !== before) save()
    return entries.length !== before
  }

  return { load, prune, add, recall, recent, top, pin, remove, get size() { return entries.length } }
}