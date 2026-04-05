# File Specification

## Dashboard

### `todo/NOW.md`

Required sections:
- `## AI USAGE THIS WEEK`
- `## FOCUS`
- `## TODAY`
- `## UP NEXT`
- `## DONE`
- `## AI DONE TODAY`

Weekly usage section format:

```md
## AI USAGE THIS WEEK
| Date | Total Tokens | Input | Output | Cache | Hit Rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2026-04-05 | 11158574 | 294 | 11074 | 11147206 | 0.0% |
| **Week Total** | **...** | **...** | **...** | **...** | **...** |
```

AI section format:

```md
## AI DONE TODAY
- main: 完成某项工作
```

## History

### `todo/history/YYYY-MM.md`

Append daily snapshots in this format:

```md
## YYYY-MM-DD

### Human Done
- [x] ...

### AI Done Today
- main: ...
```

Inside each `todo/history/YYYY-MM.md`, maintain two managed archive blocks:

- `## AI Usage Daily Summary`
- `## AI Usage Weekly Summary`

Daily summary stores finalized per-day usage rows for that month.
Weekly summary stores completed week tables whose week end falls in that month.

## Config

### `todo/system/config.json`

Defines:
- timezone
- dashboard path
- history dir
- sync-state path
- enabled agents
- report directories per agent
- optional `agentsFilePath` per agent for managed AGENTS rule installation

## Sync state

### `todo/system/sync-state.json`

Tracks:
- current date
- last sync time
- last processed file per agent
- last processed line per agent

## Rollover state

### `todo/system/rollover-state.json`

Tracks:
- last rollover date
- last archived date

## Bootstrap and repair scripts

### `scripts/init_system.js`

Creates missing dashboard, history, config, sync-state, and rollover-state files for a new installation.

### `scripts/repair_system.js`

Repairs missing runtime files without overwriting healthy ones.

### `scripts/sync_ai_done.js`

Reads config, queries weekly OpenClaw usage, scans today's AI logs, rebuilds `AI USAGE THIS WEEK` and `AI DONE TODAY`, and updates `sync-state.json`.

### `scripts/rollover_now.js`

Archives yesterday's completed work, updates monthly daily usage summary, updates monthly weekly usage summary on week boundary, resets done state, carries unfinished work forward, and updates `rollover-state.json`.

### `scripts/validate_system.js`

Runs a local end-to-end validation for init, sync, repair, rollover, and rollover idempotency.

### `scripts/append_ai_log.js`

Appends one JSON line to today's per-agent AI work log.

### `scripts/install_agent_log_rules.js`

Installs or updates a managed AI log rule block inside configured agents' `AGENTS.md` files.

## AI log files

### `reports/<agent>-ai-log-YYYY-MM-DD.jsonl`

Each line must be valid JSON:

```json
{"ts":"2026-04-05T16:00:00+08:00","agent":"main","task":"完成回测模块初版","tokens":0}
```

Required fields:
- `ts`
- `agent`
- `task`
- optional `tokens`

Rules:
- append-only
- one line per completed work unit
- task must remain one line
- if `tokens` is present, it must be an integer total
