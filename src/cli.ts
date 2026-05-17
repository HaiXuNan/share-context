#!/usr/bin/env node

import { Command } from 'commander';
import { search, input } from '@inquirer/prompts';
import { ContextManager } from './context-manager';
import { SessionSummary } from './storage';
import path from 'path';
import fs from 'fs';
import os from 'os';

function missingArg(name: string): never {
  console.error(`Error: required option '${name}' not provided`);
  console.error('Run with --help to see usage.');
  process.exit(1);
}

const program = new Command();

program
  .name('share-context')
  .description('Cross-AI Agent CLI context synchronization')
  .version('2.0.0');

function resolveProject(projectPath?: string): string {
  return path.resolve(projectPath || process.cwd());
}

function formatTime(ts: string): string {
  const d = new Date(ts + 'Z');
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const AGENT_EMOJI: Record<string, string> = {
  opencode: '\u{1F680}',
  claude: '\u2660\uFE0F',
  codex: '\u2C5F',
  gemini: '\u264A',
};

function formatSessionChoice(s: SessionSummary): { name: string; value: string; description: string } {
  const emoji = AGENT_EMOJI[s.agent] || '\u25CF';
  const stats = [s.files > 0 ? `${s.files}f` : '', s.decisions > 0 ? `${s.decisions}d` : '', s.blockers > 0 ? `${s.blockers}b` : ''].filter(Boolean).join(' ');
  return {
    name: `${emoji} ${s.title}`,
    value: s.id,
    description: `${formatTime(s.created_at)} ${stats ? `| ${stats}` : ''} | ${s.left_off || '(no details)'}`,
  };
}

// ─── save ───────────────────────────────────────────────────────────

program
  .command('save')
  .description('Save current session context')
  .option('--agent <agent>', 'Current agent: opencode, claude, codex, gemini')
  .option('--title <text>', 'Session title (one line)')
  .option('--summary <text>', 'What was accomplished')
  .option('--files <paths>', 'Comma-separated active files')
  .option('--decisions <list>', 'Comma-separated key decisions')
  .option('--blockers <list>', 'Comma-separated blockers')
  .option('--left-off <text>', 'What you were working on when stopping')
  .option('--next-steps <list>', 'Comma-separated next steps')
  .option('--project <path>', 'Project root')
  .action(async (opts) => {
    const isTTY = process.stdin.isTTY;

    const agent = opts.agent || (isTTY ? await input({ message: 'Agent name:', default: 'opencode' }) : missingArg('--agent'));
    const title = opts.title || (isTTY ? await input({ message: 'Session title:', default: 'WIP session' }) : missingArg('--title'));
    const summary = opts.summary || (isTTY ? await input({ message: 'What was accomplished:' }) : missingArg('--summary'));
    const filesRaw = opts.files || (isTTY ? await input({ message: 'Active files (comma-separated):' }) : '');
    const decisionsRaw = opts.decisions || (isTTY ? await input({ message: 'Key decisions (comma-separated):' }) : '');
    const blockersRaw = opts.blockers || (isTTY ? await input({ message: 'Blockers (comma-separated):' }) : '');
    const leftOff = opts.leftOff || (isTTY ? await input({ message: 'Where you left off:' }) : '');
    const nextStepsRaw = opts.nextSteps || (isTTY ? await input({ message: 'Next steps (comma-separated):' }) : '');

    const cm = new ContextManager(resolveProject(opts.project));
    const id = cm.saveSession({
      agent,
      title,
      summary,
      keyFiles: filesRaw ? filesRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      decisions: decisionsRaw ? decisionsRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      blockers: blockersRaw ? blockersRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      leftOff: leftOff || '',
      nextSteps: nextStepsRaw ? nextStepsRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    });
    console.log(`Session saved: ${id}`);
    cm.close();
  });

// ─── list (alias for resume --list) ─────────────────────────────────

program
  .command('list')
  .description('List saved sessions (alias for resume --list)')
  .option('--agent <agent>', 'Filter by agent')
  .option('--project <path>', 'Project root')
  .action(async (opts) => {
    const cm = new ContextManager(resolveProject(opts.project));
    const sessions = cm.listSessions(opts.agent);
    if (sessions.length === 0) {
      console.log('No saved sessions found.');
      cm.close();
      return;
    }
    printSessionList(sessions);
    cm.close();
  });

// ─── resume ─────────────────────────────────────────────────────────

function printSessionList(sessions: SessionSummary[]): void {
  for (const s of sessions) {
    console.log(`[${s.agent}] ${s.id} | ${formatTime(s.created_at)} | ${s.title}`);
    if (s.left_off) console.log(`  ${s.left_off}`);
  }
}

program
  .command('resume', { isDefault: true })
  .description('Interactive session browser for resuming work')
  .option('--agent <agent>', 'Filter by source agent (default: all)')
  .option('--session <id>', 'Direct resume by session ID (skip browser)')
  .option('--list', 'Non-interactive: just print session list')
  .option('--project <path>', 'Project root')
  .option('--format <format>', 'Output: prompt (default), json', 'prompt')
  .action(async (opts) => {
    const cm = new ContextManager(resolveProject(opts.project));

    // List mode
    if (opts.list) {
      const sessions = cm.listSessions(opts.agent);
      if (sessions.length === 0) {
        console.log('No saved sessions found.');
        cm.close();
        return;
      }
      printSessionList(sessions);
      cm.close();
      return;
    }

    // Direct resume by ID
    if (opts.session) {
      const session = cm.getSession(opts.session);
      if (!session) {
        console.error(`Session not found: ${opts.session}`);
        process.exit(1);
      }
      const output = opts.format === 'json'
        ? JSON.stringify({ session, prompt: cm.formatForPrompt(session) }, null, 2)
        : cm.formatForPrompt(session);
      console.log(output);
      cm.close();
      return;
    }

    // Interactive browser
    const sessions = cm.listSessions(opts.agent);
    if (sessions.length === 0) {
      console.log('No saved sessions found for this project.');
      console.log('Save a session first with: share-context save --agent <name> --title "..." --summary "..."');
      cm.close();
      return;
    }

    const chosen = await search<string>({
      message: `Resume session ${opts.agent ? `(from ${opts.agent})` : ''}`,
      source: async (term) => {
        if (!term) return sessions.map(formatSessionChoice);
        const t = term.toLowerCase();
        return sessions
          .filter(s => s.title.toLowerCase().includes(t) || s.left_off.toLowerCase().includes(t))
          .map(formatSessionChoice);
      },
      pageSize: 10,
    });

    if (!chosen) {
      console.log('No session selected.');
      cm.close();
      return;
    }

    const session = cm.getSession(chosen);
    if (!session) {
      console.error('Session not found.');
      cm.close();
      return;
    }

    const output = opts.format === 'json'
      ? JSON.stringify({ session, prompt: cm.formatForPrompt(session) }, null, 2)
      : cm.formatForPrompt(session);

    console.log(output);
    cm.close();
  });

// ─── install ────────────────────────────────────────────────────────

const SC_SLASH_COMMANDS = {
  'sc:save': {
    description: 'Save current session context to share-context',
    command: 'share-context save',
  },
  'sc:resume': {
    description: 'Select and resume a previous session from share-context',
    command: 'share-context resume',
  },
  'sc:status': {
    description: 'Show share-context session dashboard',
    command: 'share-context status',
  },
};

const AGENT_DIR = path.resolve(__dirname, '..');

const agents = [
  {
    name: 'opencode',
    desc: 'OpenCode AI',
    type: 'project' as const,
    install: (root: string) => {
      const configPath = path.join(root, 'opencode.json');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        let config: { commands?: Record<string, unknown> };
        try { config = JSON.parse(raw); } catch {
          console.error(`Could not parse ${configPath}. Add manually.`);
          console.log(JSON.stringify(SC_SLASH_COMMANDS, null, 2));
          return;
        }
        config.commands = { ...(config.commands || {}), ...SC_SLASH_COMMANDS };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
      } else {
        fs.writeFileSync(configPath, JSON.stringify({ commands: SC_SLASH_COMMANDS }, null, 2) + '\n');
      }
      const names = Object.keys(SC_SLASH_COMMANDS).map(k => `/${k}`).join(', ');
      console.log(`✅ ${names} registered in ${configPath}`);
    },
  },
  {
    name: 'claude',
    desc: 'Claude Code',
    type: 'project' as const,
    install: (root: string) => {
      const claudePath = path.join(root, 'CLAUDE.md');
      const section = [
        '',
        '## Share Context (cross-agent sync)',
        '',
        'Saved sessions are in `.share-context/share-context.db`.',
        '',
        '- `share-context save` — save current session before switching',
        '- `share-context resume` — browse and load a prior session',
        '- `share-context list` — list all saved sessions',
        '- `share-context status` — show session dashboard',
        '- `share-context handoff --from claude --to <agent> --task "..."` — handoff work',
        '',
      ].join('\n');

      if (fs.existsSync(claudePath)) {
        const existing = fs.readFileSync(claudePath, 'utf-8');
        if (existing.includes('## Share Context')) {
          console.log(`ℹ️  Share Context section already in ${claudePath}`);
          return;
        }
        fs.appendFileSync(claudePath, section + '\n');
      } else {
        fs.writeFileSync(claudePath, section.trimStart() + '\n');
      }
      console.log(`✅ Share Context usage appended to ${claudePath}`);
    },
  },
  {
    name: 'codex',
    desc: 'Codex CLI',
    type: 'user' as const,
    install: () => {
      const targetDir = path.join(os.homedir(), '.codex', 'skills', 'share-context');
      const targetFile = path.join(targetDir, 'SKILL.md');
      const src = path.join(AGENT_DIR, 'adapters', 'codex', 'SKILL.md');
      if (!fs.existsSync(src)) {
        console.error(`Adapter file not found: ${src}`);
        process.exit(1);
      }
      fs.mkdirSync(targetDir, { recursive: true });
      fs.cpSync(src, targetFile, { force: true });
      console.log(`✅ Copied to ${targetFile}`);
      console.log('   Codex CLI will auto-detect this skill on next launch.');
    },
  },
  {
    name: 'gemini',
    desc: 'Gemini CLI',
    type: 'user' as const,
    install: () => {
      const targetDir = path.join(os.homedir(), '.gemini', 'skills', 'share-context');
      const targetFile = path.join(targetDir, 'SKILL.md');
      const src = path.join(AGENT_DIR, 'adapters', 'gemini', 'SKILL.md');
      if (!fs.existsSync(src)) {
        console.error(`Adapter file not found: ${src}`);
        process.exit(1);
      }
      fs.mkdirSync(targetDir, { recursive: true });
      fs.cpSync(src, targetFile, { force: true });
      console.log(`✅ Copied to ${targetFile}`);
      console.log('   Gemini CLI will auto-detect this skill on next launch.');
    },
  },
];

program
  .command('install')
  .description('Register share-context commands for an AI coding agent')
  .argument('<agent>', `Agent: ${agents.map(a => a.name).join(', ')}`)
  .option('--project <path>', 'Project root (for project-level installs)')
  .action((agent, opts) => {
    const match = agents.find(a => a.name === agent);
    if (!match) {
      console.error(`Unknown agent: ${agent}`);
      console.error(`Supported: ${agents.map(a => `${a.name} (${a.desc})`).join(', ')}`);
      process.exit(1);
    }

    const root = match.type === 'project' ? resolveProject(opts.project) : os.homedir();
    match.install(root);
  });

// ─── handoff ────────────────────────────────────────────────────────

program
  .command('handoff')
  .description('Create a handoff task for another agent')
  .requiredOption('--from <agent>', 'Source agent')
  .requiredOption('--to <agent>', 'Target agent')
  .requiredOption('--task <text>', 'Task description')
  .option('--reason <text>', 'Reason for switching')
  .option('--project <path>', 'Project root')
  .action((opts) => {
    const cm = new ContextManager(resolveProject(opts.project));
    const h = cm.createHandoff(opts.from, opts.to, opts.task, opts.reason || '');
    console.log(`Handoff #${h.id}: ${h.from_agent} \u2192 ${h.to_agent} - "${h.task}"`);
    cm.close();
  });

// ─── handoffs ───────────────────────────────────────────────────────

program
  .command('handoffs')
  .description('List pending handoffs for an agent')
  .requiredOption('--agent <agent>', 'Target agent')
  .option('--project <path>', 'Project root')
  .action((opts) => {
    const cm = new ContextManager(resolveProject(opts.project));
    const handoffs = cm.getPendingHandoffs(opts.agent);
    if (handoffs.length === 0) {
      console.log('No pending handoffs.');
    } else {
      for (const h of handoffs) {
        console.log(`[#${h.id}] From ${h.from_agent}: ${h.task}`);
        if (h.reason) console.log(`  Reason: ${h.reason}`);
      }
    }
    cm.close();
  });

// ─── status ─────────────────────────────────────────────────────────

program
  .command('status')
  .description('Show project context status')
  .option('--project <path>', 'Project root')
  .action((opts) => {
    const cm = new ContextManager(resolveProject(opts.project));
    const sessions = cm.listSessions();
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      counts[s.agent] = (counts[s.agent] || 0) + 1;
    }

    console.log('=== Share Context Status ===');
    console.log(`Total sessions: ${sessions.length}`);
    for (const [agent, count] of Object.entries(counts)) {
      console.log(`  ${agent}: ${count} session(s)`);
    }
    if (sessions.length > 0) {
      console.log(`Latest: [${sessions[0].agent}] ${sessions[0].title}`);
    }
    cm.close();
  });

program.parse();
