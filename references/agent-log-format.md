# Agent Log Format

## File naming

One file per agent per day:

- `reports/main-ai-log-YYYY-MM-DD.jsonl`
- `reports/cortex-ai-log-YYYY-MM-DD.jsonl`
- `reports/trading-ai-log-YYYY-MM-DD.jsonl`

## One-line schema

```json
{"ts":"2026-04-05T14:10:00+08:00","agent":"main","task":"完成量化交易系统回测模块初版","tokens":12000}
```

## Rules

- Use UTF-8
- One JSON object per line
- `task` must be one line
- `tokens` must be integer total tokens for that work unit
- Append only
- Apply the reply-before-log judgement first
- Write immediately after an independent work unit is closed, before sending the user-visible reply or completion notification
- Do not log pure discussion, exploration, reading, or failed attempts

## Good examples

```json
{"ts":"2026-04-05T14:10:00+08:00","agent":"main","task":"完成量化交易系统回测模块初版","tokens":12000}
{"ts":"2026-04-05T14:28:00+08:00","agent":"cortex","task":"产出一期视频脚本初稿","tokens":9500}
{"ts":"2026-04-05T15:05:00+08:00","agent":"trading","task":"整理两个候选市场的赔率与催化因素","tokens":6400}
```

## Bad examples

Bad: multiline task content

```json
{"ts":"2026-04-05T14:10:00+08:00","agent":"main","task":"先做A\n再做B","tokens":12000}
```

Bad: logging a discussion-only turn

```json
{"ts":"2026-04-05T14:10:00+08:00","agent":"main","task":"讨论下一步怎么做","tokens":0}
```

Bad: writing directly into dashboard instead of log

Do not do that.
