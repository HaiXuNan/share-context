import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// ─── Types ──────────────────────────────────────────────────────────

export interface SessionRecord {
  id: string;
  context_id: string;
  agent: string;
  title: string;
  summary: string;
  key_files: string;
  decisions: string;
  blockers: string;
  left_off: string;
  next_steps: string;
  created_at: string;
}

export interface SessionSummary {
  id: string;
  agent: string;
  title: string;
  left_off: string;
  files: number;
  decisions: number;
  blockers: number;
  created_at: string;
}

export interface HandoffRecord {
  id: number;
  from_agent: string;
  to_agent: string;
  task: string;
  reason: string;
  status: string;
  created_at: string;
}

// ─── Storage ────────────────────────────────────────────────────────

export class Storage {
  private db: Database.Database;

  constructor(projectRoot: string) {
    const dotDir = path.join(projectRoot, '.share-context');
    fs.mkdirSync(dotDir, { recursive: true });
    this.db = new Database(path.join(dotDir, 'share-context.db'));
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  static contextId(projectPath: string): string {
    return crypto.createHash('sha256').update(projectPath).digest('hex').slice(0, 16);
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id          TEXT PRIMARY KEY,
        context_id  TEXT NOT NULL,
        agent       TEXT NOT NULL,
        title       TEXT NOT NULL,
        summary     TEXT DEFAULT '',
        key_files   TEXT DEFAULT '[]',
        decisions   TEXT DEFAULT '[]',
        blockers    TEXT DEFAULT '[]',
        left_off    TEXT DEFAULT '',
        next_steps  TEXT DEFAULT '[]',
        created_at  TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS handoffs (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        from_agent  TEXT NOT NULL,
        to_agent    TEXT NOT NULL,
        task        TEXT NOT NULL,
        reason      TEXT DEFAULT '',
        status      TEXT DEFAULT 'pending',
        created_at  TEXT DEFAULT (datetime('now')),
        accepted_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_ctx ON sessions(context_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent, created_at DESC);
    `);
  }

  // ─── Sessions ─────────────────────────────────────────────────

  saveSession(session: Omit<SessionRecord, 'id' | 'created_at'>): string {
    const id = crypto.randomUUID();
    this.db.prepare(`
      INSERT INTO sessions (id, context_id, agent, title, summary, key_files, decisions, blockers, left_off, next_steps)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, session.context_id, session.agent, session.title, session.summary,
      session.key_files, session.decisions, session.blockers, session.left_off, session.next_steps);
    return id;
  }

  getSessionSummaries(contextId: string, agent?: string): SessionSummary[] {
    let query = 'SELECT id, agent, title, left_off, key_files, decisions, blockers, created_at FROM sessions WHERE context_id = ?';
    const params: any[] = [contextId];
    if (agent) {
      query += ' AND agent = ?';
      params.push(agent);
    }
    query += ' ORDER BY created_at DESC LIMIT 100';
    return (this.db.prepare(query).all(...params) as any[]).map((r: any) => ({
      id: r.id,
      agent: r.agent,
      title: r.title,
      left_off: r.left_off,
      files: this.parseJsonArray(r.key_files).length,
      decisions: this.parseJsonArray(r.decisions).length,
      blockers: this.parseJsonArray(r.blockers).length,
      created_at: r.created_at,
    }));
  }

  getSession(id: string): SessionRecord | undefined {
    return this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRecord | undefined;
  }

  deleteSession(id: string): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }

  // ─── Handoffs ───────────────────────────────────────────────

  createHandoff(h: Omit<HandoffRecord, 'id' | 'created_at' | 'accepted_at'>): HandoffRecord {
    const r = this.db.prepare(
      'INSERT INTO handoffs (from_agent, to_agent, task, reason, status) VALUES (?, ?, ?, ?, ?)'
    ).run(h.from_agent, h.to_agent, h.task, h.reason, 'pending');
    return this.db.prepare('SELECT * FROM handoffs WHERE id = ?').get(r.lastInsertRowid) as HandoffRecord;
  }

  getPendingHandoffs(toAgent: string): HandoffRecord[] {
    return this.db.prepare(
      'SELECT * FROM handoffs WHERE to_agent = ? AND status = ? ORDER BY created_at DESC'
    ).all(toAgent, 'pending') as HandoffRecord[];
  }

  updateHandoffStatus(id: number, status: string): void {
    this.db.prepare('UPDATE handoffs SET status = ? WHERE id = ?').run(status, id);
  }

  parseJsonArray(raw: string | undefined): string[] {
    try { return raw ? JSON.parse(raw) : []; } catch { return []; }
  }

  close(): void { this.db.close(); }
}
