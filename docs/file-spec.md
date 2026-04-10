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

Store daily snapshots under clipped week sections in this format:

```md
## Week 2026-04-01 → 2026-04-05

### AI Usage Weekly Summary
| Date | Total Tokens | Input | Output | Cache | Hit Rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| ... |

### 2026-04-05

#### Human Done
- [x] ...

#### AI Done Today
- main: ...
```

Rules:
- natural days always stay inside their natural month file
- week sections are only a readability grouping layer
- cross-month weeks are clipped inside each month file instead of being forced into a full 7-day block

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
- optional `notifications.summaryCrons` settings for template-driven summary cron jobs

Each agent entry is enough for AGENTS rule injection when it provides:
- `name`
- `reportsDir`
- `agentsFilePath`

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

Archives yesterday's completed work into a week-grouped month file, updates that week's `AI Usage Weekly Summary`, resets done state, carries unfinished work forward, and updates `rollover-state.json`.

### `scripts/validate_system.js`

Runs a local end-to-end validation for init, sync, repair, rollover, and rollover idempotency.

### `scripts/append_ai_log.js`

Appends one JSON line to today's per-agent AI work log.

### `scripts/install_agent_log_rules.js`

Installs or updates a managed AI log rule block inside configured agents' `AGENTS.md` files.
Supports:
- full install/refresh for all configured agents
- `--dry-run` preview mode
- `--agent <name>` targeted refresh for one or more specific agents

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
- one line per independent completed work unit
- task must remain one line
- if `tokens` is present, it must be an integer total

## Managed AGENTS rule block

Installer-managed rule blocks are delimited with:
- `<!-- AI_WORKLOG_RULE_START -->`
- `<!-- AI_WORKLOG_RULE_END -->`

Injected rule behavior:
- run the logging judgement before any user-visible reply or completion notification
- log only when the current turn closed an independent work unit
- if multiple work units closed in one turn, append multiple lines
- do not log pure discussion, exploration, reading, or failed attempts
