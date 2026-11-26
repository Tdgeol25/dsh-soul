import { createStore } from './lib/store.js'
import { createEmotion } from './lib/emotion.js'
import { createMemory } from './lib/memory.js'
import { createBody } from './lib/body.js'
import { createThought } from './lib/thought.js'
import { createSticker } from './lib/sticker.js'
import { createDiary } from './lib/diary.js'
import { createPersona } from './lib/persona.js'
import { defineSoulTools } from './lib/tools.js'

export const name = 'dsh-soul'
export const inject = ['tools']
export const optional = ['betterSidebar', 'router']

export function apply(ctx, config = {}) {
  const store = createStore(config.dataDir)

  const soul = {
    store,
    emotion: createEmotion(config.emotion, store),
    memory: createMemory(config.memory, store),
    body: createBody(config.body, store),
    thought: createThought(config.thought, store),
    sticker: createSticker(config.sticker, store, ctx),
    diary: createDiary(config.diary, store),
    persona: createPersona(config.persona, store)
  }
  ctx.soul = soul

  // 1. 注册 Agent 工具
  for (const tool of defineSoulTools(ctx, soul)) {
    ctx.tools.register(tool)
  }

  // 2. 启动时加载持久化状态
  ctx.effect(() => {
    Promise.all([
      soul.emotion.load(),
      soul.memory.load(),
      soul.body.load(),
      soul.thought.load(),
      soul.persona.load(),
      soul.diary.ensure(),
      soul.sticker.ensure()
    ]).catch(err => ctx.logger?.warn?.('[dsh-soul] 状态加载失败', err))
  })

  // 3. 心跳：情绪回归、身体感知衰减、自主念头
  ctx.effect(() => {
    const timer = setInterval(() => {
      soul.emotion.tick()
      soul.body.tick()
      soul.thought.tick()
      soul.memory.prune()
    }, config.tickIntervalMs ?? 60_000)
    return () => clearInterval(timer)
  })

  // 4. 侧边栏条目（需要 dsh-better-sidebar）
  ctx.effect(() => {
    if (!ctx.betterSidebar?.registerTab) return
    const off = ctx.betterSidebar.registerTab({
      id: 'dsh-soul',
      title: '灵魂',
      order: 200,
      // 组件由客户端 bundle（client/index.jsx）提供，具体字段名以客户端扩展契约为准
      component: 'dsh-soul:panel',
      settings: {
        pluginToggles: [
          { key: 'diaryEnabled', title: '日记', type: 'switch', defaultValue: true },
          { key: 'stickerAutoFetch', title: '自动搜图', type: 'switch', defaultValue: false },
          { key: 'thoughtAutoModify', title: '思想可自行修改人设', type: 'switch', defaultValue: false }
        ]
      }
    })
    return () => off?.()
  })

  // 5. HTTP 接口，供侧边栏读取与编辑（Hono 风格，按你的 DSH 路由实现调整）
  async function snapshot() {
    return {
      emotion: soul.emotion.snapshot(),
      body: soul.body.snapshot(),
      persona: soul.persona.get(),
      thought: soul.thought.list(10),
      memory: soul.memory.recent(20),
      diary: await soul.diary.list(7)
    }
  }

  ctx.effect(() => {
    if (!ctx.router?.get) return
    const offs = [
      ctx.router.get('/soul/state', async c => c.json(await snapshot())),
      ctx.router.post('/soul/persona', async c => c.json(soul.persona.update(await c.req.json()))),
      ctx.router.post('/soul/memory/pin', async c => {
        const { id, pinned } = await c.req.json()
        soul.memory.pin(id, pinned)
        return c.json({ ok: true })
      }),
      ctx.router.post('/soul/memory/remove', async c => {
        const { id } = await c.req.json()
        soul.memory.remove(id)
        return c.json({ ok: true })
      })
    ]
    return () => offs.forEach(off => off?.())
  })
}