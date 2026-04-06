# Design

## Goal

Provide a reusable daily work system for OpenClaw-based operations where:

- human work remains readable in one Markdown dashboard
- AI work is captured as append-only logs
- live AI sections are always derived, never hand-maintained
- logging rules are installed into agents automatically instead of hand-maintained one by one
- daily rollover archives history and prepares the next day automatically
- usage visibility stays in the live dashboard while finalized usage history stays monthly

## Design principles

1. Single source of truth for current work
2. Append-only source logs for AI activity
3. Derived views instead of incremental Markdown mutation where possible
4. Low-friction human editing
5. Deterministic rollover at day boundary
6. Recoverable state through simple files
7. Keep current state lightweight and history monthly
8. Prefer install-time rule injection over per-agent bespoke workflow hooks
9. Keep logging judgement in the agent turn itself instead of adding observer scans or periodic LLM audits

## Components

### Dashboard
`todo/NOW.md`

Holds current human task state, one persistent iteration-notes area, the current week's usage table, and today's AI summary.

### AI source logs
`reports/<agent>-ai-log-YYYY-MM-DD.jsonl`

Hold one JSON object per independent closed work unit.

### History
`todo/history/YYYY-MM.md`

Stores archived daily human completion snapshots, AI daily summaries, daily usage summaries, and weekly usage summaries.

### System state
- `todo/system/config.json`
- `todo/system/sync-state.json`
- `todo/system/rollover-state.json`

### Bootstrap and repair scripts
- `scripts/init_system.js`
- `scripts/repair_system.js`
- `scripts/install_agent_log_rules.js`

These scripts make the system recoverable when files are missing or the installation is only partially initialized.
`init_system.js` also performs install-time AI logging rule injection for configured agents.

### Validation script
- `scripts/validate_system.js`

This script exercises the JavaScript runtime end-to-end in a temporary installation so release checks do not depend on the live dashboard.

## Why AI logs are append-only

Append-only logs are resilient, easy to inspect, and safer than shared-write dashboards.
They also allow rebuilding the visible AI section after crashes or missed syncs.

## Why managed AGENTS injection is the primary integration model

PulseFlow should not require bespoke logging hooks for every agent skill or workflow.
That would turn every new agent into a custom integration project.

Instead, PulseFlow installs one managed rule block into each configured `AGENTS.md` file.
That block creates a reply-before-log gate:

- before any user-visible reply or completion notification
- decide whether the current turn closed one or more independent work units
- if yes, append one JSONL record per closed work unit
- only then send the reply or notification

This keeps the integration generic:

- install-time automation handles the first rollout
- re-running the installer updates all agents consistently
- adding a new agent later only requires adding it to config and re-running the installer

## Why PulseFlow does not rely on observer scans

A directory-scanning or session-replay observer can be a fallback later, but it is not the primary design.
For a reusable skill, constant scanning introduces unnecessary complexity, higher runtime cost, and more edge cases.

PulseFlow instead keeps judgement inside the active LLM turn:

- cheap: no extra periodic analysis loop
- local: the agent already knows what it just finished
- reusable: the same managed rule can be injected into many agents

The trade-off is that the LLM must follow the rule block reliably.
PulseFlow therefore treats the installer-managed AGENTS block as part of the product surface, not a local note.

## Why the AI sections are derived

If agents wrote directly to the dashboard:

- concurrent writes would conflict
- formatting would drift
- usage totals would become unreliable
- cleanup and repair would be harder

By rebuilding from logs and OpenClaw usage summaries, the dashboard stays stable.

## Why PulseFlow keeps `ITERATION NOTES` separate from task lists

Future-direction notes, design reminders, and loose constraints are useful, but they should not pollute the executable task lists.

PulseFlow therefore keeps one dedicated `ITERATION NOTES` section inside `NOW.md`:

- persistent across sync and rollover
- human-edited directly
- not interpreted as pending or completed tasks
- useful as context, not as a checklist

This keeps `FOCUS / TODAY / UP NEXT / DONE` clean while still giving the dashboard one stable place for forward-looking notes.

## Why rollover is cron-based

Day-boundary state changes are deterministic and should not depend on heartbeat timing.
A fixed cron at 00:05 is more reliable than hoping the next heartbeat lands after midnight.

## Why monthly history is preferred

PulseFlow keeps the live surface small and the archive surface predictable.
Instead of scattering usage history into extra standalone files, month files become the single history container.
That makes the system easier to browse:

- current work → `NOW.md`
- past work and past usage → `history/YYYY-MM.md`

## Recovery philosophy

This system is designed around file repair rather than hidden internal state.
If runtime files are missing, the operator should be able to rebuild the working surface with simple scripts.

Minimum recovery set:

- recreate dashboard if missing
- recreate sync state if missing
- recreate rollover state if missing
- preserve healthy files when repairing
- re-run managed AGENTS rule injection when agent instructions drift or new agents are added
