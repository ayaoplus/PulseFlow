#!/usr/bin/env node
const { deriveRuntimePaths, loadJson } = require('./_common');
const { installAgentLogRules } = require('./_agent_log_rules');

function parseArgs(argv) {
  const out = {
    dryRun: false,
    agents: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (token === '--agent') {
      const value = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[++index] : '';
      if (value) {
        out.agents.push(...String(value).split(',').map((item) => item.trim()).filter(Boolean));
      }
    }
  }

  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const paths = deriveRuntimePaths();
  const config = loadJson(paths.configPath, null);
  if (!config) {
    throw new Error('Missing config.json: run init_system.js first');
  }

  const results = installAgentLogRules({
    config,
    paths,
    dryRun: args.dryRun,
    onlyAgents: args.agents,
  });
  process.stdout.write(`${JSON.stringify({ ok: true, dryRun: args.dryRun, agents: args.agents, results }, null, 2)}\n`);
}

main();
