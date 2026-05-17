# Share Context - Claude Code Adapter

Cross-agent context synchronization for Claude Code. Save before switching away, resume context from other agents.

## Setup

```bash
npm install -g share-context
```

## Commands

### Save before switching
```bash
share-context save --agent claude --title "Payment impl" --summary "Stripe integration working" --files "src/billing/stripe.ts,src/billing/webhooks.ts" --left-off "Need to add webhook handler"
```

### Resume prior session
```bash
share-context resume                           # interactive browser
share-context resume --session <id>            # direct by ID
share-context resume --format json             # machine-readable
```

### Handoff to another tool
```bash
share-context handoff --from claude --to codex --task "Write billing module tests"
share-context handoffs --agent codex           # check pending
```

### Status
```bash
share-context status
```

## File locations
- Database: `.share-context/share-context.db` in project root
