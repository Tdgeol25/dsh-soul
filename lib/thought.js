const TEMPLATES = [
  '有点想知道对方现在在做什么。',
  '刚才那句话，也许可以再温柔一点。',
  '忽然想整理一下最近的记忆。',
  '今天好像还没写日记。',
  '有个念头一闪而过，先记下来。',
  '想找个表情包回应一下。'
]

export function createThought(config = {}, store) {
  const file = 'thought.json'
  const rate = config.spontaneousRate ?? 0.15
  const maxQueue = config.maxQueue ?? 50
  let state = { queue: [], decisions: [], autoModify: config.autoModify ?? false }

  async function load() {
    const data = await store.read(file, null)
    if (data) {
      state.queue = Array.isArray(data.queue) ? data.queue : []
      state.decisions = Array.isArray(data.decisions) ? data.decisions : []
      state.autoModify = Boolean(data.autoModify)
    }
  }
  function save() {
    store.write(file, state).catch(() => {})
  }

  function tick() {
    if (Math.random() >= rate) return
    const content = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]
    push({ content, kind: 'thought', source: 'spontaneous' })
  }

  function push(entry) {
    state.queue.unshift({
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      at: Date.now(),
      ...entry
    })
    if (state.queue.length > maxQueue) state.queue.length = maxQueue
    save()
  }

  function add(content, kind = 'thought') {
    if (!content || !String(content).trim()) throw new Error('念头内容不能为空')
    push({ content: String(content).trim(), kind, source: 'agent' })
  }

  function decide(action, willing, reason = '') {
    state.decisions.unshift({
      id: `d_${Date.now()}`,
      action,
      willing: Boolean(willing),
      reason,
      at: Date.now()
    })
    if (state.decisions.length > 100) state.decisions.length = 100
    save()
  }

  function list(limit = 10) {
    return state.queue.slice(0, limit)
  }

  function decisions(limit = 10) {
    return state.decisions.slice(0, limit)
  }

  function setAutoModify(value) {
    state.autoModify = Boolean(value)
    save()
  }

  return { load, tick, add, decide, list, decisions, setAutoModify, get autoModify() { return state.autoModify } }
}