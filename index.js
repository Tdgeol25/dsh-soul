import { emotion } from './lib/emotion.js'
import { memory } from './lib/memory.js'
import { body } from './lib/body.js'
import { thought } from './lib/thought.js'
import { sticker } from './lib/sticker.js'
import { diary } from './lib/diary.js'
import { persona } from './lib/persona.js'

export const name = 'dsh-soul'
export const inject = ['tools', 'betterSidebar']

export function apply(ctx, config = {}) {
  // 所有子系统挂到 ctx 上，供工具和侧边栏读取
  ctx.soul = {
    emotion: emotion.create(config.emotion),
    memory: memory.create(config.memory),
    body: body.create(config.body),
    thought: thought.create(config.thought),
    sticker: sticker.create(config.sticker, ctx),
    diary: diary.create(config.diary),
    persona: persona.create(config.persona),
  }

  // 注册 Agent 可调用的工具（核心能力入口）
  ctx.tools.register(defineSoulTools(ctx))

  // 侧边栏 tab（需要 betterSidebar 服务）
  ctx.effect(() =>
    ctx.betterSidebar.registerTab({
      id: 'dsh-soul:main',
      title: '灵魂',
      order: 200,
      component: ({ scope }) => import('./client/SoulPanel.jsx').then(m =>
        m.default({ soul: ctx.soul, sessionId: scope.sessionId })
      ),
      settings: {
        pluginToggles: [
          { key: 'diaryEnabled', title: '日记', type: 'switch', defaultValue: true },
          { key: 'stickerAutoFetch', title: '自动搜图', type: 'switch', defaultValue: false }
        ]
      }
    })
  )

  // 心跳：驱动情感衰减、身体感知、思想 tick
  ctx.effect(() => {
    const timer = setInterval(() => {
      ctx.soul.emotion.tick()
      ctx.soul.body.tick()
      ctx.soul.thought.tick()
    }, 60_000)
    return () => clearInterval(timer)
  })
}