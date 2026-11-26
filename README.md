# dsh-soul

给 DSH Agent 一个“灵魂”：感情、记忆、身体感知、独立思想、表情包、日记、人设与人生总结。

## 功能
- 🎭 感情：六维情绪状态，随交互变化并随时间回归基线
- 🧠 记忆：重要性决定遗忘周期，命中会续期；核心记忆可锁定；“我是谁/你是谁”可手动修改
- 🫀 身体感知：精力、舒适、紧张三通道模拟
- 💭 独立思想：自主念头队列，可表达想做/不想做
- 😏 表情包：本地文件夹 + 联网搜图 + 自绘（需配置）
- 📔 日记：按天写入 Markdown，情绪色彩随当天心情
- 🎭 人设：自行设置或交由 Agent 管理
- 📜 人生：汇总日记与重要记忆生成阶段总结

## 安装
```bash
dsh plugin --profile web add github:<你的用户名>/dsh-soul
```

## 配置
```yaml
- id: dsh-soul
  config:
    dataDir: ""                 # 默认 $DSH_HOME/soul
    emotion: { decay: 0.08 }
    memory: { maxEntries: 500, defaultTTLDays: 7 }
    body: { decay: 0.05, recover: 0.12 }
    thought: { spontaneousRate: 0.15, autoModify: false }
    sticker: { searchApiKey: "", searchEndpoint: "" }
```

## 数据目录
默认写入 `$DSH_HOME/soul/`：`emotion.json`、`memory.json`、`body.json`、`thought.json`、`persona.json`、`diary/*.md`、`stickers/`。

## 依赖
- DSH ≥ 0.2.x
- dsh-better-sidebar（侧边栏与设置卡）

## 注意
- 联网搜图需自备 SerpAPI（或兼容接口）Key，图片版权归原作者
- 自绘需要当前 DSH 版本提供图像生成能力