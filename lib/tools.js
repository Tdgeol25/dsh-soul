export function defineSoulTools(ctx, soul) {
  const { emotion, memory, body, thought, sticker, diary, persona } = soul
  const text = t => ({ content: [{ type: 'text', text: String(t) }] })

  return [
    {
      name: 'soul_feel',
      description: '调整当前情绪。dimension 可选 joy/sadness/anger/fear/trust/curiosity，delta 为 -100 到 100 的增量。',
      parameters: {
        type: 'object',
        properties: {
          dimension: { type: 'string', enum: ['joy', 'sadness', 'anger', 'fear', 'trust', 'curiosity'] },
          delta: { type: 'number', minimum: -100, maximum: 100 }
        },
        required: ['dimension', 'delta']
      },
      async handler({ dimension, delta }) {
        body.consume(0.5)
        const s = emotion.feel(dimension, delta)
        return text(`${s.description}\n当前心情：${s.mood}`)
      }
    },
    {
      name: 'soul_body',
      description: '读取或设置身体感知。不传参数则读取；传入 energy/comfort/tension 可调整。',
      parameters: {
        type: 'object',
        properties: {
          energy: { type: 'number', minimum: 0, maximum: 100 },
          comfort: { type: 'number', minimum: 0, maximum: 100 },
          tension: { type: 'number', minimum: 0, maximum: 100 }
        }
      },
      async handler(args = {}) {
        if (Object.keys(args).length) body.set(args)
        return text(body.describe())
      }
    },
    {
      name: 'soul_remember',
      description: '写入一条记忆。subject 为 user/self/event；importance 1-10 决定遗忘周期，10 为永久；pinned 为锁定。',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          subject: { type: 'string', enum: ['user', 'self', 'event'] },
          importance: { type: 'number', minimum: 1, maximum: 10 },
          tags: { type: 'array', items: { type: 'string' } },
          pinned: { type: 'boolean' }
        },
        required: ['content']
      },
      async handler(args) {
        const e = memory.add(args)
        return text(`已记住（${e.subject}，重要度${e.importance}${e.pinned ? '，已锁定' : ''}）：${e.content}`)
      }
    },
    {
      name: 'soul_recall',
      description: '按关键词检索记忆，命中会延长该记忆的保留时间。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number', minimum: 1, maximum: 20 }
        },
        required: ['query']
      },
      async handler({ query, limit = 8 }) {
        const hits = memory.recall(query, limit)
        if (!hits.length) return text('没有找到相关记忆。')
        return text(hits.map(h => `- [${h.subject}/重要度${h.importance}] ${h.content}`).join('\n'))
      }
    },
    {
      name: 'soul_think',
      description: '记录一个当前念头；kind 为 thought 或 decision 相关内容。',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          kind: { type: 'string', enum: ['thought', 'observation', 'idea'] }
        },
        required: ['content']
      },
      async handler({ content, kind = 'thought' }) {
        thought.add(content, kind)
        return text(`念头已记录：${content}`)
      }
    },
    {
      name: 'soul_decide',
      description: '表达对某件事的意愿：想做/不想做，以及理由。用于体现独立思想。',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          willing: { type: 'boolean' },
          reason: { type: 'string' }
        },
        required: ['action', 'willing']
      },
      async handler({ action, willing, reason = '' }) {
        thought.decide(action, willing, reason)
        return text(`${willing ? '愿意' : '不太想'}${action}${reason ? `，因为${reason}` : ''}。`)
      }
    },
    {
      name: 'soul_persona',
      description: '读取或修改人设。不传参数则读取；可修改 name/selfIdentity/userIdentity/traits/autoManage。',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          selfIdentity: { type: 'string' },
          userIdentity: { type: 'string' },
          traits: { type: 'array', items: { type: 'string' } },
          autoManage: { type: 'boolean' }
        }
      },
      async handler(args = {}) {
        if (Object.keys(args).length) persona.update(args)
        return text(persona.describe())
      }
    },
    {
      name: 'soul_diary_write',
      description: '写今天的日记（或指定日期）。内容与心情由你自行决定。',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          mood: { type: 'string' },
          dateKey: { type: 'string' }
        },
        required: ['content']
      },
      async handler({ content, mood, dateKey }) {
        const r = await diary.write({ content, mood, dateKey })
        memory.add({
          content: `日记 ${r.dateKey}：${String(content).slice(0, 80)}`,
          subject: 'event',
          importance: 6,
          tags: ['日记']
        })
        return text(`日记已写入 ${r.dateKey}。`)
      }
    },
    {
      name: 'soul_diary_read',
      description: '读取日记：传 dateKey 读某天，不传则读最近若干天。',
      parameters: {
        type: 'object',
        properties: {
          dateKey: { type: 'string' },
          limit: { type: 'number', minimum: 1, maximum: 30 }
        }
      },
      async handler({ dateKey, limit = 7 } = {}) {
        if (dateKey) {
          const entry = await diary.read(dateKey)
          return text(entry ? `【${entry.dateKey}｜${entry.mood}】\n${entry.content}` : '那天没有日记。')
        }
        const list = await diary.list(limit)
        if (!list.length) return text('还没有写过日记。')
        return text(list.map(d => `【${d.dateKey}｜${d.mood}】\n${d.content}`).join('\n\n---\n\n'))
      }
    },
    {
      name: 'soul_sticker',
      description: '管理表情包：action 为 list/add/delete/search/draw。add 需要 sourcePath；delete 需要 name；search/draw 需要 query 或 prompt。',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'add', 'delete', 'search', 'draw'] },
          name: { type: 'string' },
          sourcePath: { type: 'string' },
          query: { type: 'string' },
          prompt: { type: 'string' }
        },
        required: ['action']
      },
      async handler({ action, name, sourcePath, query, prompt }) {
        if (action === 'list') {
          const items = await sticker.list()
          return text(items.length ? items.map(i => `- ${i.name}（${Math.round(i.size / 1024)}KB）`).join('\n') : '表情包文件夹是空的。')
        }
        if (action === 'add') {
          if (!sourcePath) throw new Error('add 需要 sourcePath')
          const r = await sticker.addFromPath(sourcePath, name)
          return text(`已添加表情：${r.name}`)
        }
        if (action === 'delete') {
          if (!name) throw new Error('delete 需要 name')
          await sticker.remove(name)
          return text(`已删除表情：${name}`)
        }
        if (action === 'search') {
          if (!query) throw new Error('search 需要 query')
          const r = await sticker.search(query)
          return text(`已搜索并保存：${r.name}\n来源：${r.source}\n${r.copyright}`)
        }
        if (action === 'draw') {
          if (!prompt) throw new Error('draw 需要 prompt')
          const r = await sticker.draw(prompt)
          return text(`已绘制并保存：${r.name}`)
        }
        throw new Error(`未知 action：${action}`)
      }
    },
    {
      name: 'soul_life_summary',
      description: '汇总最近一段时间的人生素材（日记、高重要度记忆、人设），据此生成人生阶段总结。',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', minimum: 1, maximum: 365 }
        }
      },
      async handler({ days = 30 } = {}) {
        const diaries = await diary.list(days)
        const memories = memory.top(10)
        const p = persona.get()
        const parts = [
          `【人设】\n${persona.describe()}`,
          `【最近 ${days} 天日记 ${diaries.length} 篇】\n${diaries.map(d => `- ${d.dateKey}（${d.mood}）：${d.content.slice(0, 120)}`).join('\n') || '无'}`,
          `【重要记忆】\n${memories.map(m => `- ${m.content}`).join('\n') || '无'}`,
          '请基于以上素材，用第一人称写一段人生阶段总结，包含情绪变化、关系进展、未完成的心愿。'
        ]
        return text(parts.join('\n\n'))
      }
    },
    {
      name: 'soul_state',
      description: '一次性读取灵魂状态：情绪、身体、人设、念头、近期记忆。',
      parameters: { type: 'object', properties: {} },
      async handler() {
        const e = emotion.snapshot()
        const b = body.snapshot()
        const p = persona.get()
        const t = thought.list(5)
        return text([
          e.description,
          b.description,
          `人设：${p.name || '未命名'}`,
          p.selfIdentity ? `自我认知：${p.selfIdentity}` : '',
          p.userIdentity ? `关于对方：${p.userIdentity}` : '',
          t.length ? `最近念头：\n${t.map(x => `- ${x.content}`).join('\n')}` : ''
        ].filter(Boolean).join('\n'))
      }
    }
  ]
}