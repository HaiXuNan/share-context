import { Storage, SessionRecord } from './storage';
import path from 'path';

export class ContextManager {
  private storage: Storage;
  private contextId: string;

  constructor(projectRoot: string) {
    this.storage = new Storage(projectRoot);
    this.contextId = Storage.contextId(projectRoot);
  }

  // ─── Save ─────────────────────────────────────────────────────

  saveSession(opts: {
    agent: string;
    title: string;
    summary: string;
    keyFiles: string[];
    decisions: string[];
    blockers: string[];
    leftOff: string;
    nextSteps: string[];
  }): string {
    return this.storage.saveSession({
      context_id: this.contextId,
      agent: opts.agent,
      title: opts.title,
      summary: opts.summary,
      key_files: JSON.stringify(opts.keyFiles),
      decisions: JSON.stringify(opts.decisions),
      blockers: JSON.stringify(opts.blockers),
      left_off: opts.leftOff,
      next_steps: JSON.stringify(opts.nextSteps),
    });
  }

  // ─── List ─────────────────────────────────────────────────────

  listSessions(agent?: string) {
    return this.storage.getSessionSummaries(this.contextId, agent);
  }

  // ─── Load ─────────────────────────────────────────────────────

  getSession(id: string): SessionRecord | undefined {
    return this.storage.getSession(id);
  }

  deleteSession(id: string): void {
    this.storage.deleteSession(id);
  }

  // ─── Format ──────────────────────────────────────────────────

  formatForPrompt(session: SessionRecord): string {
    const lines: string[] = [];
    lines.push('<!-- SHARE-CONTEXT: Resumed Session -->');
    lines.push(`<!-- Agent: ${session.agent} -->`);
    lines.push(`<!-- Session: ${session.title} -->`);
    lines.push(`<!-- Created: ${session.created_at} -->`);
    lines.push('');
    lines.push(`## Resuming: ${session.title}`);
    lines.push('');
    lines.push(`**What was accomplished**: ${session.summary}`);
    lines.push('');
    lines.push(`**Where we left off**: ${session.left_off}`);
    lines.push('');

    const files = this.storage.parseJsonArray(session.key_files);
    if (files.length > 0) {
      lines.push('### Active Files');
      files.forEach(f => lines.push(`- ${f}`));
      lines.push('');
    }

    const decisions = this.storage.parseJsonArray(session.decisions);
    if (decisions.length > 0) {
      lines.push('### Key Decisions');
      decisions.forEach(d => lines.push(`- ${d}`));
      lines.push('');
    }

    const blockers = this.storage.parseJsonArray(session.blockers);
    if (blockers.length > 0) {
      lines.push('### Current Blockers');
      blockers.forEach(b => lines.push(`- ${b}`));
      lines.push('');
    }

    const nextSteps = this.storage.parseJsonArray(session.next_steps);
    if (nextSteps.length > 0) {
      lines.push('### Next Steps');
      nextSteps.forEach(s => lines.push(`- ${s}`));
      lines.push('');
    }

    lines.push('<!-- End SHARE-CONTEXT -->');
    return lines.join('\n');
  }

  // ─── Handoffs ────────────────────────────────────────────────

  createHandoff(fromAgent: string, toAgent: string, task: string, reason: string) {
    return this.storage.createHandoff({
      from_agent: fromAgent,
      to_agent: toAgent,
      task,
      reason,
      status: 'pending',
    });
  }

  getPendingHandoffs(agent: string) {
    return this.storage.getPendingHandoffs(agent);
  }

  acceptHandoffs(agent: string) {
    const pending = this.storage.getPendingHandoffs(agent);
    for (const h of pending) {
      this.storage.updateHandoffStatus(h.id, 'accepted');
    }
    return pending;
  }

  close(): void { this.storage.close(); }
}
