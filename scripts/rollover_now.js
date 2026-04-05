#!/usr/bin/env node
const path = require('path');
const {
  buildDefaultRolloverState,
  deriveRuntimePaths,
  exists,
  formatDateInTimeZone,
  historyMonthShell,
  loadJson,
  readText,
  resolveRolloverStatePath,
  saveJson,
  writeText,
} = require('./_common');
const {
  buildUsageSection,
  updateMonthlyUsageArchive,
  usageSummary,
  weeklyRows,
} = require('./_usage_panel');

const SECTIONS = ['AI USAGE THIS WEEK', 'FOCUS', 'TODAY', 'UP NEXT', 'DONE', 'AI DONE TODAY'];

function splitSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = {};
  let current = null;
  let buffer = [];
  let preamble = [];

  for (const line of lines) {
    const matched = SECTIONS.find((name) => line.startsWith(`## ${name}`));
    if (matched) {
      if (current === null) {
        preamble = [...buffer];
      } else {
        sections[current] = [...buffer];
      }
      current = matched;
      buffer = [];
    } else {
      buffer.push(line);
    }
  }

  if (current === null) {
    preamble = [...lines];
  } else {
    sections[current] = [...buffer];
  }

  return { preamble, sections };
}

function classifyItems(lines) {
  const done = [];
  const pending = [];

  for (const raw of lines || []) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) continue;
    if (line.trimStart().startsWith('- [x]')) {
      done.push(line);
    } else {
      pending.push(line);
    }
  }

  return { done, pending };
}

function aiSnapshot(lines) {
  return (lines || []).filter((line) => line.trim());
}

function ensureMonthHistoryFile(historyDir, month, date, paths) {
  const monthFile = path.join(historyDir, `${month}.md`);
  if (!exists(monthFile)) {
    writeText(monthFile, historyMonthShell(paths, month));
  }
  return monthFile;
}

function buildNow(preamble, usageSection, todayPending, upNextPending) {
  const pre = (preamble || []).join('\n').replace(/\s*$/, '');
  const out = [];

  if (pre) {
    out.push(pre);
  }

  out.push(usageSection.trimEnd(), '');

  out.push(
    '## FOCUS',
    '',
    '- [ ]',
    '',
    '## TODAY',
  );

  if (todayPending.length) {
    out.push(...todayPending);
  } else {
    out.push('- [ ]');
  }

  out.push('', '## UP NEXT');
  if (upNextPending.length) {
    out.push(...upNextPending);
  } else {
    out.push('- [ ]');
  }

  out.push(
    '',
    '## DONE',
    '',
    '- [x]',
    '',
    '---',
    '## AI DONE TODAY',
    '- 暂无',
    '',
  );

  return out.join('\n');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildHistoryEntry(archivedDate, humanDone, aiLines) {
  const lines = [];
  lines.push(`## ${archivedDate}`, '');
  lines.push('### Human Done');
  if (humanDone.length) {
    lines.push(...humanDone);
  } else {
    lines.push('- [x] 暂无');
  }
  lines.push('', '### AI Done Today');
  if (aiLines.length) {
    lines.push(...aiLines);
  } else {
    lines.push('- 暂无');
  }
  lines.push('');
  return lines.join('\n');
}

function upsertHistory(monthFile, archivedDate, humanDone, aiLines) {
  const entry = buildHistoryEntry(archivedDate, humanDone, aiLines).replace(/\s*$/, '');
  const current = exists(monthFile) ? readText(monthFile).replace(/\s*$/, '') : '';
  const sectionPattern = new RegExp(`(^|\\n)## ${escapeRegExp(archivedDate)}\\n[\\s\\S]*?(?=\\n## \\d{4}-\\d{2}-\\d{2}\\n|$)`, 'gm');
  const cleaned = current.replace(sectionPattern, '').replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '');
  const next = cleaned ? `${cleaned}\n\n${entry}` : entry;
  writeText(monthFile, `${next.replace(/\s*$/, '')}\n`);
}

function main() {
  const paths = deriveRuntimePaths();
  const config = loadJson(paths.configPath, null);
  if (!config) {
    throw new Error('Missing config.json: run init_system.js first');
  }

  const timeZone = config.timezone || process.env.AI_WORKLOG_TIMEZONE || 'Asia/Shanghai';
  const now = new Date();
  const today = formatDateInTimeZone(now, timeZone);
  const yesterday = formatDateInTimeZone(new Date(now.getTime() - 24 * 60 * 60 * 1000), timeZone);
  const rolloverStatePath = resolveRolloverStatePath(config, paths);
  const rolloverState = loadJson(rolloverStatePath, buildDefaultRolloverState());

  if (rolloverState.lastRolloverDate === today) {
    process.stdout.write(`${JSON.stringify({ ok: true, skipped: true, date: today }, null, 2)}\n`);
    return;
  }

  const dashboardPath = config.dashboardPath || paths.nowPath;
  const historyDir = config.historyDir || paths.historyDir;
  const text = readText(dashboardPath);
  const { preamble, sections } = splitSections(text);
  const usage = usageSummary(14);

  const focus = classifyItems(sections.FOCUS || []);
  const todaySection = classifyItems(sections.TODAY || []);
  const upNext = classifyItems(sections['UP NEXT'] || []);
  const doneSection = classifyItems(sections.DONE || []);
  const aiLines = aiSnapshot(sections['AI DONE TODAY'] || []);

  const humanDone = [
    ...doneSection.done,
    ...focus.done,
    ...todaySection.done,
    ...upNext.done,
  ];
  const nextToday = [...focus.pending, ...todaySection.pending];

  const monthFile = ensureMonthHistoryFile(historyDir, yesterday.slice(0, 7), yesterday, paths);
  upsertHistory(monthFile, yesterday, humanDone, aiLines);
  updateMonthlyUsageArchive(monthFile, usage, yesterday.slice(0, 7), yesterday);

  writeText(dashboardPath, buildNow(preamble, buildUsageSection(weeklyRows(usage, today)), nextToday, upNext.pending));

  const nextState = {
    ...rolloverState,
    lastRolloverDate: today,
    lastArchivedDate: yesterday,
  };
  saveJson(rolloverStatePath, nextState);

  process.stdout.write(`${JSON.stringify({
    ok: true,
    rolledOverTo: today,
    archivedDate: yesterday,
    humanDone: humanDone.length,
  }, null, 2)}\n`);
}

main();
