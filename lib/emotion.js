const DIMENSIONS = ['joy', 'sadness', 'anger', 'fear', 'trust', 'curiosity']
const LABELS = {
  joy: '开心', sadness: '低落', anger: '生气',
  fear: '不安', trust: '安心', curiosity: '好奇'
}
const clamp = v => Math.max(0, Math.min(100, Math.round(v)))

export function createEmotion(config = {}, store) {
  const baseline = {
    joy: 55, sadness: 10, anger: 5, fear: 10, trust: 55, curiosity: 60,
    ...(config.baseline || {})
  }
  const decay = config.decay ?? 0.08
  const file = 'emotion.json'
  let state = { ...baseline }

  async function load() {
    const data = await store.read(file, null)
    if (data) for (const k of DIMENSIONS) {
      if (typeof data[k] === 'number') state[k] = clamp(data[k])
    }
  }
  function save() {
    store.write(file, { ...state }).catch(() => {})
  }

  function tick() {
    for (const k of DIMENSIONS) {
      state[k] = clamp(state[k] + (baseline[k] - state[k]) * decay)
    }
    save()
  }

  function feel(dimension, delta) {
    if (!DIMENSIONS.includes(dimension)) {
      throw new Error(`未知情绪维度：${dimension}，可选：${DIMENSIONS.join(', ')}`)
    }
    state[dimension] = clamp(state[dimension] + delta)
    save()
    return snapshot()
  }

  function set(dimension, value) {
    if (!DIMENSIONS.includes(dimension)) throw new Error(`未知情绪维度：${dimension}`)
    state[dimension] = clamp(value)
    save()
  }

  function dominant() {
    let best = DIMENSIONS[0]
    for (const k of DIMENSIONS) if (state[k] > state[best]) best = k
    return best
  }

  function moodLabel() {
    return LABELS[dominant()]
  }

  function describe() {
    const d = dominant()
    const level = state[d] >= 75 ? '强烈' : state[d] >= 55 ? '明显' : '淡淡'
    const detail = DIMENSIONS.map(k => `${LABELS[k]}${state[k]}`).join('，')
    return `当前情绪：${level}的${LABELS[d]}（${detail}）`
  }

  function snapshot() {
    return { ...state, mood: moodLabel(), description: describe() }
  }

  return { load, tick, feel, set, reset: () => { state = { ...baseline }; save() }, moodLabel, describe, snapshot }
}