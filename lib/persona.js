const FIELDS = ['name', 'selfIdentity', 'userIdentity', 'traits', 'autoManage']

export function createPersona(config = {}, store) {
  const file = 'persona.json'
  let state = {
    name: '',
    selfIdentity: '',
    userIdentity: '',
    traits: [],
    autoManage: config.autoManage ?? false
  }

  async function load() {
    const data = await store.read(file, null)
    if (data) {
      for (const k of FIELDS) {
        if (data[k] !== undefined) state[k] = data[k]
      }
      if (!Array.isArray(state.traits)) state.traits = []
    }
  }
  function save() {
    store.write(file, state).catch(() => {})
  }

  function get() {
    return { ...state, traits: [...state.traits] }
  }

  function update(patch = {}) {
    if (patch.name !== undefined) state.name = String(patch.name).slice(0, 60)
    if (patch.selfIdentity !== undefined) state.selfIdentity = String(patch.selfIdentity).slice(0, 2000)
    if (patch.userIdentity !== undefined) state.userIdentity = String(patch.userIdentity).slice(0, 2000)
    if (patch.traits !== undefined) {
      if (!Array.isArray(patch.traits)) throw new Error('traits 必须是字符串数组')
      state.traits = patch.traits.map(t => String(t).slice(0, 40)).slice(0, 20)
    }
    if (patch.autoManage !== undefined) state.autoManage = Boolean(patch.autoManage)
    save()
    return get()
  }

  function addTrait(trait) {
    const t = String(trait || '').trim()
    if (!t) throw new Error('特质不能为空')
    if (!state.traits.includes(t)) {
      state.traits.push(t.slice(0, 40))
      if (state.traits.length > 20) state.traits.shift()
      save()
    }
    return get()
  }

  function removeTrait(trait) {
    state.traits = state.traits.filter(t => t !== trait)
    save()
    return get()
  }

  function describe() {
    const parts = []
    if (state.name) parts.push(`名字：${state.name}`)
    if (state.selfIdentity) parts.push(`自我认知：${state.selfIdentity}`)
    if (state.userIdentity) parts.push(`关于对方：${state.userIdentity}`)
    if (state.traits.length) parts.push(`性格特质：${state.traits.join('、')}`)
    return parts.length ? parts.join('\n') : '尚未设置人设'
  }

  return { load, get, update, addTrait, removeTrait, describe }
}