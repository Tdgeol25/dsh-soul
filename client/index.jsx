import { useCallback, useEffect, useState } from 'react'

const BASE = '/soul'

function Bar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888' }}>
        <span>{label}</span><span>{value}</span>
      </div>
      <div style={{ height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color }} />
      </div>
    </div>
  )
}

export default function SoulPanel() {
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)
  const [persona, setPersona] = useState({ selfIdentity: '', userIdentity: '' })

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/state`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setState(data)
      setPersona({
        selfIdentity: data.persona?.selfIdentity || '',
        userIdentity: data.persona?.userIdentity || ''
      })
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const savePersona = async () => {
    try {
      const res = await fetch(`${BASE}/persona`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(persona)
      })
      if (!res.ok) throw new Error(await res.text())
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  if (error) return <div style={{ padding: 12, color: '#c00' }}>加载失败：{error}</div>
  if (!state) return <div style={{ padding: 12, color: '#888' }}>加载中…</div>

  const e = state.emotion || {}
  const b = state.body || {}

  return (
    <div style={{ padding: 12, fontSize: 13, overflowY: 'auto', height: '100%' }}>
      <h3 style={{ margin: '0 0 8px' }}>灵魂 · {e.mood || '未知'}</h3>

      <section style={{ marginBottom: 16 }}>
        <Bar label="开心" value={e.joy ?? 0} color="#f5a623" />
        <Bar label="信任" value={e.trust ?? 0} color="#4a90d9" />
        <Bar label="好奇" value={e.curiosity ?? 0} color="#7ed321" />
        <Bar label="低落" value={e.sadness ?? 0} color="#9b9b9b" />
        <Bar label="生气" value={e.anger ?? 0} color="#d0021b" />
        <Bar label="不安" value={e.fear ?? 0} color="#8b572a" />
      </section>

      <section style={{ marginBottom: 16 }}>
        <Bar label="精力" value={b.energy ?? 0} color="#4a90d9" />
        <Bar label="舒适" value={b.comfort ?? 0} color="#7ed321" />
        <Bar label="紧张" value={b.tension ?? 0} color="#d0021b" />
      </section>

      <section style={{ marginBottom: 16 }}>
        <h4 style={{ margin: '0 0 6px' }}>人设（可自行修改）</h4>
        <label style={{ display: 'block', fontSize: 12, color: '#888' }}>我是谁</label>
        <textarea
          value={persona.selfIdentity}
          onChange={ev => setPersona(p => ({ ...p, selfIdentity: ev.target.value }))}
          rows={3}
          style={{ width: '100%', marginBottom: 6 }}
        />
        <label style={{ display: 'block', fontSize: 12, color: '#888' }}>你是谁</label>
        <textarea
          value={persona.userIdentity}
          onChange={ev => setPersona(p => ({ ...p, userIdentity: ev.target.value }))}
          rows={3}
          style={{ width: '100%', marginBottom: 6 }}
        />
        <button onClick={savePersona}>保存人设</button>
      </section>

      <section style={{ marginBottom: 16 }}>
        <h4 style={{ margin: '0 0 6px' }}>最近念头</h4>
        {(state.thought || []).length
          ? state.thought.map(t => <div key={t.id} style={{ color: '#666' }}>· {t.content}</div>)
          : <div style={{ color: '#aaa' }}>暂无</div>}
      </section>

      <section style={{ marginBottom: 16 }}>
        <h4 style={{ margin: '0 0 6px' }}>记忆</h4>
        {(state.memory || []).length
          ? state.memory.map(m => (
              <div key={m.id} style={{ marginBottom: 4, color: '#555' }}>
                [{m.subject}{m.pinned ? '·锁定' : ''}] {m.content}
              </div>
            ))
          : <div style={{ color: '#aaa' }}>暂无</div>}
      </section>

      <section>
        <h4 style={{ margin: '0 0 6px' }}>日记</h4>
        {(state.diary || []).length
          ? state.diary.map(d => (
              <div key={d.dateKey} style={{ marginBottom: 8 }}>
                <div style={{ color: '#888', fontSize: 12 }}>{d.dateKey}｜{d.mood}</div>
                <div style={{ color: '#444', whiteSpace: 'pre-wrap' }}>{d.content}</div>
              </div>
            ))
          : <div style={{ color: '#aaa' }}>还没写过日记</div>}
      </section>
    </div>
  )
}

// 客户端 bundle 注册入口：字段名以你的 DSH 客户端扩展契约为准
export function setup(ctx) {
  ctx?.betterSidebar?.registerPanel?.('dsh-soul:panel', SoulPanel)
}