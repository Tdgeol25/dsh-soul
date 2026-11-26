const clamp = v => Math.max(0, Math.min(100, Math.round(v)))

export function createBody(config = {}, store) {
  const file = 'body.json'
  const decay = config.decay ?? 0.05
  const recover = config.recover ?? 0.12
  let state = { energy: 70, comfort: 65, tension: 20, lastInteractionAt: Date.now() }

  async function load() {
    const data = await store.read(file, null)
    if (data) {
      for (const k of ['energy', 'comfort', 'tension']) {
        if (typeof data[k] === 'number') state[k] = clamp(data[k])
      }
      if (typeof data.lastInteractionAt === 'number') state.lastInteractionAt = data.lastInteractionAt
    }
  }
  function save() {
    store.write(file, { ...state }).catch(() => {})
  }

  // 有交互：消耗精力、略增紧张
  function consume(intensity = 1) {
    state.energy = clamp(state.energy - 2 * intensity)
    state.tension = clamp(state.tension + 1 * intensity)
    state.lastInteractionAt = Date.now()
    save()
  }

  // 心跳：长时间无交互则恢复精力、平复紧张
  function tick() {
    const idleMs = Date.now() - state.lastInteractionAt
    const idle = idleMs > 10 * 60_000
    if (idle) {
      state.energy = clamp(state.energy + recover * 3)
      state.tension = clamp(state.tension - recover * 2)
    } else {
      state.energy = clamp(state.energy + (60 - state.energy) * decay * 0.2)
    }
    state.comfort = clamp(100 - state.tension * 0.6 - (100 - state.energy) * 0.3)
    save()
  }

  function set(patch = {}) {
    for (const k of ['energy', 'comfort', 'tension']) {
      if (typeof patch[k] === 'number') state[k] = clamp(patch[k])
    }
    save()
  }

  function describe() {
    const e = state.energy >= 70 ? '精神不错' : state.energy >= 40 ? '有些疲倦' : '很累了'
    const t = state.tension >= 60 ? '有点紧绷' : state.tension >= 30 ? '略微紧张' : '比较放松'
    return `身体感知：${e}，${t}（精力${state.energy}，舒适${state.comfort}，紧张${state.tension}）`
  }

  function snapshot() {
    return { ...state, description: describe() }
  }

  return { load, tick, consume, set, describe, snapshot }
}