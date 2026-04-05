# Portability Notes

## Primary runtime contract

The JavaScript runtime is intended to be reusable across workspaces and repository layouts.

Preferred invocation style:

```bash
AI_WORKLOG_CONFIG=/absolute/path/to/todo/system/config.json node <skill-dir>/scripts/sync_ai_done.js
```

This avoids relying on workspace-specific current directories.

## Supported environment overrides

- `AI_WORKLOG_CONFIG` — absolute path to `todo/system/config.json`
- `AI_WORKLOG_ROOT` — dashboard root containing `NOW.md`, `history/`, and `system/`
- `AI_WORKLOG_TIMEZONE` — default timezone used for date boundaries
- `AI_WORKLOG_MAIN_REPORTS` — default reports dir used by `init_system.js`
- `AI_WORKLOG_CORTEX_REPORTS` — default reports dir used by `init_system.js`
- `AI_WORKLOG_TRADING_REPORTS` — default reports dir used by `init_system.js`
- `AI_WORKLOG_ROLLOVER_STATE` — optional explicit rollover state path override

## Default behavior

If `AI_WORKLOG_CONFIG` is not set, the runtime resolves the install root from:

1. `AI_WORKLOG_ROOT`, if provided
2. otherwise `./todo` relative to the current working directory

For reusable installations, prefer `AI_WORKLOG_CONFIG` so the runtime does not depend on the caller's working directory.

## Recommended source repository layout

Recommended scheme for development and publishing:

```text
~/code/PulseFlow/                  # source repo
~/.openclaw/workspaces/<workspace>/skills/pulseflow -> ~/code/PulseFlow
```

Why this is preferred:

- one real source directory
- GitHub publishes from the source repo directly
- ClawHub publishes from the source repo directly
- OpenClaw runtime continues reading the workspace skill path through a symlink

This is the recommended layout when a skill is both actively used locally and prepared for external publishing.

## Privacy and publishability

The primary JS runtime avoids embedding personal machine paths.
Installation-specific paths belong in:

- `todo/system/config.json`
- local heartbeat/cron commands
- local operator docs outside the reusable skill bundle

Do not publish runtime instance data in the source repo:

- `NOW.md`
- `history/YYYY-MM.md`
- `system/config.json`
- `system/sync-state.json`
- `reports/*.jsonl`
