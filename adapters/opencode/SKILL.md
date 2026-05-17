# Share Context - OpenCode Adapter

Cross-agent context synchronization for OpenCode. Save your session before switching away, and resume context from other AI agents (Claude Code, Codex, Gemini).

## Quick Registration

```bash
share-context install opencode
```
Auto-registers `/sc:save`, `/sc:resume`, `/sc:status` in `opencode.json`.

## Slash Commands

| Command | Description |
|---------|-------------|
| `sc:save` | Save current session context |
| `sc:resume` | Browse and load previous session |
| `sc:status` | Show session dashboard |

## Usage

### Default: no arguments → resume
```bash
share-context
```
Equivalent to `resume`. Interactive search browser → select a session → loads context block.

### Save current session
```bash
/sc:save
```
Prompts for: title, summary, files, decisions, blockers, left-off, next-steps.

### Resume a prior session
```bash
/sc:resume
```
Interactive search browser. Select a session to load its context block.

### List all sessions (non-interactive)
```bash
share-context list
share-context resume --list    # equivalent
```

### Quick status
```bash
/sc:status
```
Show total sessions per agent and latest session.

## File locations
- Database: `.share-context/share-context.db` in project root
- Skill file: `adapters/opencode/SKILL.md`

## Handoff to other agents
Use the CLI directly:
```bash
share-context handoff --from opencode --to claude --task "Implement WebSocket notifications"
share-context handoffs --agent claude     # check pending
```
