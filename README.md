# Share Context

Cross-AI Agent CLI context synchronization tool.

Save your session before switching AI agents (OpenCode → Claude Code → Codex → Gemini), and resume exactly where you left off.

```bash
# Save a session
share-context save

# Resume—no args needed
share-context

# List saved sessions
share-context list
```

---

## Install

### From npm (once published)

```bash
npm install -g share-context
```

### From source

```bash
git clone https://github.com/HaiXuNan/share-context.git
cd share-context
npm install
npm run build
npm link
```

## Quick start

### 1. Register commands for your agent

```bash
cd your-project
share-context install opencode     # OpenCode — adds /sc:save, /sc:resume, /sc:status
share-context install claude       # Claude Code — appends instructions to CLAUDE.md
share-context install codex        # Codex CLI — copies skill to ~/.codex/skills/
share-context install gemini       # Gemini CLI — copies skill to ~/.gemini/skills/
```

For **OpenCode**, three slash commands are registered in `opencode.json`:

| Command | Action |
|---|---|
| `/sc:save` | Save current session |
| `/sc:resume` | Browse and resume a previous session |
| `/sc:status` | Show session dashboard |

For **Claude Code**, usage instructions are appended to `CLAUDE.md`.

For **Codex CLI** and **Gemini CLI**, the agent's skill file is placed in the correct directory; the agent auto-detects it on next launch.

> Any agent works out of the box — just run `share-context save` / `share-context resume` directly.
> `install` is a convenience for registering shortcuts.

### 2. Save a session

```bash
share-context save
```

Or in OpenCode: `Ctrl+L` → `/sc:save`.

You'll be prompted for:

- **Agent** — which AI agent you're using
- **Title** — one-line summary of the session
- **Summary** — what was accomplished
- **Active files** — files you were working on
- **Key decisions** — decisions worth remembering
- **Blockers** — anything blocking progress
- **Left off** — what you were doing when you stopped
- **Next steps** — what to do next

### 3. Resume a session

```bash
# Interactive search (default)
share-context

# Or explicitly
share-context resume

# Non-interactive list
share-context resume --list
share-context list         # alias
```

Select a session from the search list → the full context block is printed, ready to feed into any AI agent.

### 4. Handoff between agents

```bash
share-context handoff --from opencode --to claude --task "Finish WebSocket handler"
share-context handoffs --agent claude
```

## Commands

| Command | Description |
|---|---|
| `save` | Save current session context |
| `resume` (default) | Interactive session browser |
| `list` | Non-interactive list (alias for `resume --list`) |
| `install <agent>` | Register slash commands for an agent |
| `handoff` | Create a handoff task between agents |
| `handoffs` | List pending handoffs for an agent |
| `status` | Show project context dashboard |

## Agent adapters

Pre-built instructions for each supported agent:

| Agent | File |
|---|---|
| OpenCode | [`adapters/opencode/SKILL.md`](adapters/opencode/SKILL.md) |
| Claude Code | [`adapters/claude/CLAUDE.md`](adapters/claude/CLAUDE.md) |
| Codex | [`adapters/codex/SKILL.md`](adapters/codex/SKILL.md) |
| Gemini | [`adapters/gemini/SKILL.md`](adapters/gemini/SKILL.md) |

## Data

Sessions are stored in a local SQLite database:

```
.project-root/.share-context/share-context.db
```

No telemetry, no cloud, no external services.
