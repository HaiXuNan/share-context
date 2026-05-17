# Share Context - Gemini CLI Adapter

Cross-agent context synchronization for Gemini CLI. Save before switching away, resume context from other agents.

## Setup

```bash
npm install -g share-context
```

Place this directory at `~/.gemini/skills/share-context/`.

## Commands

### On session start: load context from other agents
```
<exec command="share-context resume --agent gemini --format prompt">
```

### Before switching: save context
```bash
share-context save --agent gemini --title "Data pipeline" --summary "Built ETL pipeline" --files "src/etl/" --left-off "Need to add monitoring"
```

### Handoff to another tool
```bash
share-context handoff --from gemini --to opencode --task "Build the dashboard frontend"
share-context handoffs --agent opencode
```

### Status
```bash
share-context status
```

## File locations
- Database: `.share-context/share-context.db` in project root
