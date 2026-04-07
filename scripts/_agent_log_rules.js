const path = require('path');
const { ensureDir, exists, readText, writeText } = require('./_common');

const START = '<!-- AI_WORKLOG_RULE_START -->';
const END = '<!-- AI_WORKLOG_RULE_END -->';

function buildManagedBlock({ skillDir, agentName, reportsDir }) {
  const appendScript = path.join(skillDir, 'scripts', 'append_ai_log.js');
  return [
    '## AI Work Log Integration',
    '',
    START,
    '在发送任何用户可见回复或完成通知前，先做一次 AI work log 自检：',
    '',
    '1. 先判断本轮是否已经形成一个“独立工作单元”。满足以下特征才记账：',
    '   - 已产生可查看、可复用、可交付的结果',
    '   - 可以用一句话直接描述清楚结果',
    '   - 典型例子：新建/修改文件、保存 idea / note、跑完脚本并产出结果、更新配置或文档、完成一次明确修复',
    '2. 如果形成了独立工作单元：先追加 AI work log，再发送回复或完成通知。',
    '3. 如果本轮完成了多个独立工作单元：逐条追加，一条 log 对应一个工作单元。',
    '4. 如果只是讨论、探索、阅读、失败尝试、准备开始、尚未落地产出：不要写 log。',
    '5. 如果只是 heartbeat / 定时维护触发的面板刷新、汇总重建、sync-state 更新、AI DONE TODAY 或 AI USAGE THIS WEEK 重算：不要写 log。这类动作是系统保洁，不是有效产出。',
    '6. 不要直接改 `todo/NOW.md`。',
    '',
    '使用：',
    '',
    '```bash',
    `node ${appendScript} \\`,
    `  --agent ${agentName} \\`,
    `  --reports-dir "${reportsDir}" \\`,
    '  --task "一句话描述本次完成的工作" \\',
    '  --tokens 0',
    '```',
    '',
    '规则：',
    '- append-only',
    '- 一条 log 只写一个独立工作单元',
    '- 纯维护型刷新（heartbeat 同步、重建 AI 汇总面板、更新 sync-state）禁止记账',
    '- `task` 必须是一句话，直接描述结果，不写过程碎片',
    '- `tokens` 写总 token；拿不到就写 `0`',
    '- 先记账，后回复',
    END,
    '',
  ].join('\n');
}

function upsertManagedBlock(original, block) {
  if (original.includes(START) && original.includes(END)) {
    const pattern = new RegExp(`## AI Work Log Integration\\n\\n${START}[\\s\\S]*?${END}`, 'm');
    if (pattern.test(original)) {
      return original.replace(pattern, block.trimEnd());
    }

    const markerPattern = new RegExp(`${START}[\\s\\S]*?${END}`, 'm');
    return original.replace(markerPattern, block.trimEnd());
  }

  const trimmed = original.replace(/\s*$/, '');
  return `${trimmed}\n\n${block.trimEnd()}\n`;
}

function installAgentLogRules({ config, paths, dryRun = false, onlyAgents = null }) {
  const results = [];
  const skillDir = paths.skillDir;
  const filter = Array.isArray(onlyAgents) && onlyAgents.length
    ? new Set(onlyAgents.map((item) => String(item).trim()).filter(Boolean))
    : null;

  for (const agent of config.agents || []) {
    if (!agent || agent.enabled === false || !agent.name || !agent.reportsDir) {
      continue;
    }

    if (filter && !filter.has(agent.name)) {
      continue;
    }

    const agentsFilePath = agent.agentsFilePath;
    if (!agentsFilePath) {
      results.push({ agent: agent.name, status: 'skipped', reason: 'missing agentsFilePath' });
      continue;
    }

    if (!exists(agentsFilePath)) {
      results.push({ agent: agent.name, status: 'skipped', reason: 'AGENTS.md not found', path: agentsFilePath });
      continue;
    }

    const current = readText(agentsFilePath);
    const block = buildManagedBlock({
      skillDir,
      agentName: agent.name,
      reportsDir: agent.reportsDir,
    });
    const next = upsertManagedBlock(current, block);
    if (next !== current) {
      if (!dryRun) {
        ensureDir(path.dirname(agentsFilePath));
        writeText(agentsFilePath, next);
      }
      results.push({
        agent: agent.name,
        status: dryRun ? 'would-update' : 'updated',
        path: agentsFilePath,
      });
    } else {
      results.push({
        agent: agent.name,
        status: dryRun ? 'would-keep' : 'unchanged',
        path: agentsFilePath,
      });
    }
  }

  return results;
}

module.exports = {
  installAgentLogRules,
};
