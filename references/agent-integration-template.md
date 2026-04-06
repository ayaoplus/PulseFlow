# Agent Integration Template

Install this rule block into each execution agent's `AGENTS.md`.

## Reply-before-log gate

Before sending any user-visible reply or completion notification, decide whether the current turn closed one or more independent work units.

A work unit qualifies when:
- it produced a visible, reusable, or deliverable result
- the result can be described in one sentence
- examples include: new/edited files, saved ideas or notes, completed script runs with output, config or doc updates, clear fixes

Do **not** log when the turn was only:
- discussion
- exploration
- reading
- failed attempts
- preparation without landed output

If one or more work units closed, append one JSON line per work unit to today's per-agent log file **before** replying.

Path:
- `.../reports/<agent>-ai-log-YYYY-MM-DD.jsonl`

Format:
```json
{"ts":"ISO8601","agent":"<agent>","task":"一句话描述本次完成的工作","tokens":12345}
```

Rules:
- append-only
- one line per independent completed work unit
- `task` must be one line and should describe the result directly
- `tokens` is optional; if written, use an integer total or `0`
- log first, then reply
- do not write to `todo/NOW.md` directly

Example:
```json
{"ts":"2026-04-05T16:00:00+08:00","agent":"main","task":"完成回测模块初版","tokens":12000}
```
