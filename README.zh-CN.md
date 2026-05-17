[**English**](README.md)

# Share Context

跨 AI Agent CLI 上下文同步工具。

在切换 AI 编码助手（OpenCode ↔ Claude Code ↔ Codex ↔ Gemini）之前保存会话，之后精确恢复现场。

```bash
# 保存当前会话
share-context save

# 恢复会话——无需参数
share-context

# 列出所有已保存会话
share-context list
```

---

## 安装

### 从 npm（发布后）

```bash
npm install -g share-context
```

### 从源码

```bash
git clone https://github.com/HaiXuNan/share-context.git
cd share-context
npm install
npm run build
npm link
```

## 快速开始

### 1. 为你的 AI 编码助手注册命令

```bash
cd your-project
share-context install opencode     # OpenCode — 添加 /sc:save, /sc:resume, /sc:status
share-context install claude       # Claude Code — 追加说明到 CLAUDE.md
share-context install codex        # Codex CLI — 复制 skill 到 ~/.codex/skills/
share-context install gemini       # Gemini CLI — 复制 skill 到 ~/.gemini/skills/
```

不指定 agent 时进入交互式多选模式：

```bash
share-context install
```

**OpenCode** 会在 `opencode.json` 中注册三个斜杠命令：

| 命令 | 功能 |
|---|---|
| `/sc:save` | 保存当前会话 |
| `/sc:resume` | 浏览并恢复过往会话 |
| `/sc:status` | 显示会话概览 |

**Claude Code** 会向 `CLAUDE.md` 追加使用说明。

**Codex CLI** 和 **Gemini CLI** 会将 skill 文件放到对应目录，下次启动自动生效。

> 任何 agent 都可以直接使用 `share-context save` / `share-context resume`，无需注册。
> `install` 只是快捷配置的辅助工具。

### 2. 保存会话

```bash
share-context save
```

或者在 OpenCode 中：`Ctrl+L` → `/sc:save`。

系统会提示你输入：

- **Agent** — 当前使用的 AI 编码助手
- **Title** — 会话一句话总结
- **Summary** — 完成了什么
- **Active files** — 正在编辑的文件
- **Key decisions** — 值得记住的决策
- **Blockers** — 阻塞项
- **Left off** — 停在哪一步
- **Next steps** — 下一步计划

### 3. 恢复会话

```bash
# 交互式搜索（默认入口）
share-context

# 或显式调用
share-context resume

# 非交互式列表
share-context resume --list
share-context list         # 别名
```

从搜索列表中选择一个会话 → 完整上下文块会打印到终端，可以直接粘贴给任何 AI 编码助手。

### 4. 在 Agent 之间交接

```bash
share-context handoff --from opencode --to claude --task "完成 WebSocket 处理器"
share-context handoffs --agent claude
```

## 命令列表

| 命令 | 描述 |
|---|---|
| `save` | 保存当前会话上下文 |
| `resume`（默认） | 交互式会话浏览器 |
| `list` | 非交互式列表（`resume --list` 的别名） |
| `install <agent>` | 为 AI 编码助手注册命令 |
| `handoff` | 在 agent 之间创建交接任务 |
| `handoffs` | 查看指定 agent 的待处理交接 |
| `status` | 显示项目上下文看板 |

## Agent 适配器

每个支持的 agent 都有预置的说明文件：

| Agent | 文件 |
|---|---|
| OpenCode | [`adapters/opencode/SKILL.md`](adapters/opencode/SKILL.md) |
| Claude Code | [`adapters/claude/CLAUDE.md`](adapters/claude/CLAUDE.md) |
| Codex | [`adapters/codex/SKILL.md`](adapters/codex/SKILL.md) |
| Gemini | [`adapters/gemini/SKILL.md`](adapters/gemini/SKILL.md) |

## 数据存储

会话存储在本地 SQLite 数据库中：

```
.project-root/.share-context/share-context.db
```

无遥测、无云端、无外部服务。
