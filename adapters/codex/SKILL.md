# Share Context - Codex CLI Adapter

Cross-agent context synchronization for Codex CLI. Save before switching away, resume context from other agents.

## Setup

```bash
npm install -g share-context
```

Place this directory at `~/.codex/skills/share-context/`.

## Commands

### Save before switching
```bash
share-context save --agent codex --title "Test suite" --summary "Wrote component tests" --files "src/tests/" --left-off "Need to add integration tests"
```

### Resume prior session
```bash
share-context resume                           # interactive browser
share-context resume --session <id>            # direct by ID
```

### Handoff to another tool
```bash
share-context handoff --from codex --to claude --task "Refactor the API layer"
share-context handoffs --agent claude
```

### Status
```bash
share-context status
```

## File locations
- Database: `.share-context/share-context.db` in project root
