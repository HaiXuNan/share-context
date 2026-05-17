# Interactive Resume & Install — Design Spec

## Summary

Enhance `share-context` CLI with an interactive default entry point, add a `share-context install opencode` command for one-command OpenCode skill registration, and streamline the resume flow so session context blocks are injected directly into the current AI agent conversation.

## Motivation

Current CLI requires:
1. Running `share-context resume` to select a session
2. Manually copying the context block output
3. Pasting it into the current AI agent conversation

This friction makes cross-agent context sharing less useful than it should be. The goal is `share-context` → select → done.

## CLI Architecture

### Default Entry Point

`share-context` (no subcommand) behaves identically to `share-context resume`. Most common operation gets the shortest path.

```
share-context                → interactive resume (TUI)
share-context --agent claude → interactive resume, filtered by agent
share-context --help         → help text
```

### Commands

| Command | Description | Interactive |
|---------|-------------|-------------|
| `share-context` (default) | Session search & resume TUI | Yes |
| `save` | Save current session | Yes (TTY) / flags |
| `resume` | Browse and resume sessions | Yes |
| `resume --session <id>` | Direct resume by ID | No |
| `resume --list` | List sessions (text) | No |
| `list` | Alias for `resume --list` | No |
| `status` | Session dashboard | No |
| `handoff` | Create cross-agent handoff | No |
| `handoffs` | List pending handoffs | No |
| `install opencode` | Register slash commands | No |

### Resume Interactive Flow

1. Open inquirer `search` prompt with all sessions (optionally filtered by `--agent`)
2. Each row: `[emoji] [agent] | [title] | [left-off snippet]`
3. Live filtering as user types (match title + left_off)
4. On selection: fetch full session record, output context block to stdout
5. In OpenCode: skill captures stdout → context block appears in conversation

### Non-Interactive List Mode

`resume --list` (alias `list`) prints plain text without prompts:

```
[opencode] <id> | 05/17 14:23 | JWT 认证模块
 正要加 refresh token
[claude] <id> | 05/16 09:12 | 支付系统集成
 等待 Stripe 密钥
```

## Install Command

### `share-context install opencode`

Purpose: Register `/sc:save`, `/sc:resume`, `/sc:status` as OpenCode slash commands.

Behavior:
1. Check if `opencode.jsonc` exists in project root
2. If not found → create `opencode.jsonc` with share-context commands
3. If found → parse existing JSON, merge commands (preserve existing commands)
4. Write merged `opencode.jsonc` (using JSONC-compatible formatting)
5. Output: `✅ Slash commands registered: /sc:save, /sc:resume, /sc:status`

For non-project directories (e.g. home), the command prints the config snippet and instructs the user to place it in `~/.config/opencode/settings.json`.

Registration payload:
```jsonc
{
  "commands": {
    "sc:save": {
      "description": "📝 Save current session context",
      "command": "share-context save"
    },
    "sc:resume": {
      "description": "📂 Select and resume a previous session",
      "command": "share-context resume"
    },
    "sc:status": {
      "description": "📊 Show session dashboard",
      "command": "share-context status"
    }
  }
}
```

## Files Changed

| File | Change |
|------|--------|
| `src/cli.ts` | Add default command (resume), add `install opencode` subcommand, clean up duplicate `list` logic |
| `adapters/opencode/SKILL.md` | Update with `install` docs, remove stale hook snippets |
| `adapters/claude/CLAUDE.md` | Clean up stale event command references |
| `adapters/gemini/SKILL.md` | Minor alignment |
| `adapters/codex/SKILL.md` | Minor alignment |

## Backward Compatibility

- `share-context save --agent ... --title ... --summary ...` unchanged
- `share-context resume --session <id>` unchanged
- `share-context resume --format json` unchanged
- `share-context handoff --from ... --to ... --task ...` unchanged
- `share-context list` kept as alias, not removed

Only new behavior: `share-context` (no args) now opens resume TUI instead of showing help.

## Non-Goals

- No database schema changes
- No new npm dependencies
- No changes to context-manager.ts or storage.ts public API
- No auto-injection into agent context (skill stdout capture is injection mechanism)
- No Claude/Gemini/Codex auto-install (only OpenCode)
