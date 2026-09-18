import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { app } from 'electron';
import { SCHEMA_SQL, DEFAULT_SETTINGS } from './schema';
import { Task, Settings } from '../../src/types';

export class TaskDatabase {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;

  constructor() {
    const userDataDir = app ? app.getPath('userData') : path.resolve(process.cwd(), '.data');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    this.dbPath = path.join(userDataDir, 'remindgo.db');
    const oldDbPath = path.join(userDataDir, 'taskpulse.db');
    if (!fs.existsSync(this.dbPath) && fs.existsSync(oldDbPath)) {
      try {
        fs.copyFileSync(oldDbPath, this.dbPath);
        console.log('[TaskDatabase] Successfully migrated taskpulse.db to remindgo.db');
      } catch (err) {
        console.error('[TaskDatabase] Error migrating database:', err);
      }
    }
    console.log('[TaskDatabase] Database path:', this.dbPath);
  }

  public async init(): Promise<void> {
    if (this.db) return;

    let wasmPath = path.resolve(__dirname, 'sql-wasm.wasm');
    if (!fs.existsSync(wasmPath)) {
      wasmPath = path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');
    }
    if (!fs.existsSync(wasmPath) && process.resourcesPath) {
      wasmPath = path.resolve(process.resourcesPath, 'sql-wasm.wasm');
    }

    const SQL = await initSqlJs({
      locateFile: () => wasmPath
    });

    if (fs.existsSync(this.dbPath)) {
      try {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
        console.log('[TaskDatabase] Loaded existing database from disk.');
      } catch (err) {
        console.error('[TaskDatabase] Failed to read existing DB, creating fresh DB:', err);
        this.db = new SQL.Database();
      }
    } else {
      console.log('[TaskDatabase] Creating fresh database...');
      this.db = new SQL.Database();
    }

    this.db.run(SCHEMA_SQL);
    this.initDefaultSettings();
    this.save();
  }

  private initDefaultSettings(): void {
    if (!this.db) return;
    for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
      const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
      stmt.bind([key]);
      if (!stmt.step()) {
        const insertStmt = this.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
        insertStmt.run([key, val]);
        insertStmt.free();
      }
      stmt.free();
    }
  }

  public save(): void {
    if (!this.db) return;
    try {
      const binaryArray = this.db.export();
      const buffer = Buffer.from(binaryArray);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (err) {
      console.error('[TaskDatabase] Error saving DB to disk:', err);
    }
  }

  public getAllTasks(): Task[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM tasks ORDER BY date ASC, time ASC');
    const tasks: Task[] = [];
    while (stmt.step()) {
      tasks.push(stmt.getAsObject() as unknown as Task);
    }
    stmt.free();
    return tasks;
  }

  public getTaskById(id: string): Task | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    stmt.bind([id]);
    let task: Task | null = null;
    if (stmt.step()) {
      task = stmt.getAsObject() as unknown as Task;
    }
    stmt.free();
    return task;
  }

  public createTask(task: Task): Task {
    if (!this.db) throw new Error('DB not initialized');
    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, title, description, category, date, time, repeat, status, priority, created_at, completed_at, snoozed_until, last_notified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      task.id,
      task.title,
      task.description || '',
      task.category || 'General',
      task.date,
      task.time,
      task.repeat || 'none',
      task.status || 'pending',
      task.priority || 'medium',
      task.created_at,
      task.completed_at || null,
      task.snoozed_until || null,
      task.last_notified_at || null
    ]);
    stmt.free();
    this.save();
    return task;
  }

  public updateTask(task: Task): Task {
    if (!this.db) throw new Error('DB not initialized');
    const stmt = this.db.prepare(`
      UPDATE tasks SET
        title = ?,
        description = ?,
        category = ?,
        date = ?,
        time = ?,
        repeat = ?,
        status = ?,
        priority = ?,
        completed_at = ?,
        snoozed_until = ?,
        last_notified_at = ?
      WHERE id = ?
    `);
    stmt.run([
      task.title,
      task.description || '',
      task.category || 'General',
      task.date,
      task.time,
      task.repeat || 'none',
      task.status || 'pending',
      task.priority || 'medium',
      task.completed_at || null,
      task.snoozed_until || null,
      task.last_notified_at || null,
      task.id
    ]);
    stmt.free();
    this.save();
    return task;
  }

  public deleteTask(id: string): boolean {
    if (!this.db) return false;
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    this.save();
    return true;
  }

  public setTaskStatus(id: string, status: 'pending' | 'completed' | 'snoozed', completedAt?: string | null): Task | null {
    const task = this.getTaskById(id);
    if (!task) return null;
    task.status = status;
    task.completed_at = completedAt !== undefined ? completedAt : (status === 'completed' ? new Date().toISOString() : null);
    if (status !== 'snoozed') {
      task.snoozed_until = null;
    }
    return this.updateTask(task);
  }

  public snoozeTask(id: string, minutes: number): Task | null {
    const task = this.getTaskById(id);
    if (!task) return null;
    const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    task.status = 'snoozed';
    task.snoozed_until = snoozeUntil;
    return this.updateTask(task);
  }

  public markTaskNotified(id: string, timestamp: string): void {
    if (!this.db) return;
    const stmt = this.db.prepare('UPDATE tasks SET last_notified_at = ? WHERE id = ?');
    stmt.run([timestamp, id]);
    stmt.free();
    this.save();
  }

  public getSettings(): Settings {
    const defaultSettings: Settings = {
      alarmSound: 'digital-alarm',
      soundVolume: 0.8,
      snoozeDuration: 5,
      minimizeToTray: true,
      closeToTray: true,
      startWithWindows: false,
      leetcodeUsername: '',
      theme: 'dark',
      autoOpenWidget: false,
      widgetAlwaysOnTop: false
    };

    if (!this.db) return defaultSettings;
    const stmt = this.db.prepare('SELECT key, value FROM settings');
    const settingsMap: Record<string, string> = {};
    while (stmt.step()) {
      const row = stmt.getAsObject() as { key: string; value: string };
      settingsMap[row.key] = row.value;
    }
    stmt.free();

    return {
      alarmSound: settingsMap.alarmSound || defaultSettings.alarmSound,
      soundVolume: settingsMap.soundVolume ? parseFloat(settingsMap.soundVolume) : defaultSettings.soundVolume,
      snoozeDuration: settingsMap.snoozeDuration ? parseInt(settingsMap.snoozeDuration, 10) : defaultSettings.snoozeDuration,
      minimizeToTray: settingsMap.minimizeToTray === 'true',
      closeToTray: settingsMap.closeToTray === 'true',
      startWithWindows: settingsMap.startWithWindows === 'true',
      leetcodeUsername: settingsMap.leetcodeUsername || '',
      theme: (settingsMap.theme === 'light' ? 'light' : 'dark'),
      autoOpenWidget: settingsMap.autoOpenWidget === 'true',
      widgetAlwaysOnTop: settingsMap.widgetAlwaysOnTop === 'true'
    };
  }

  public updateSettings(partial: Partial<Settings>): Settings {
    if (!this.db) throw new Error('DB not initialized');
    const stmt = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(partial)) {
      if (v !== undefined) {
        stmt.run([k, String(v)]);
      }
    }
    stmt.free();
    this.save();
    return this.getSettings();
  }

  public getLeetCodeCache(username: string): { data: any; last_synced: string } | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT data, last_synced FROM leetcode_cache WHERE username = ?');
    stmt.bind([username.toLowerCase().trim()]);
    let result: { data: any; last_synced: string } | null = null;
    if (stmt.step()) {
      const row = stmt.getAsObject() as { data: string; last_synced: string };
      try {
        result = {
          data: JSON.parse(row.data),
          last_synced: row.last_synced
        };
      } catch (err) {
        console.error('[TaskDatabase] JSON parse error in leetcode_cache:', err);
      }
    }
    stmt.free();
    return result;
  }

  public setLeetCodeCache(username: string, data: any): void {
    if (!this.db) return;
    const stmt = this.db.prepare('INSERT OR REPLACE INTO leetcode_cache (username, data, last_synced) VALUES (?, ?, ?)');
    stmt.run([username.toLowerCase().trim(), JSON.stringify(data), new Date().toISOString()]);
    stmt.free();
    this.save();
  }

  public exportBackup(): string {
    const tasks = this.getAllTasks();
    const settings = this.getSettings();
    return JSON.stringify({ version: '1.0.0', exported_at: new Date().toISOString(), tasks, settings }, null, 2);
  }

  public importBackup(jsonString: string): { count: number } {
    if (!this.db) throw new Error('DB not initialized');
    const parsed = JSON.parse(jsonString);
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      throw new Error('Invalid backup file format');
    }

    let count = 0;
    for (const t of parsed.tasks) {
      if (t.id && t.title && t.date && t.time) {
        const existing = this.getTaskById(t.id);
        if (existing) {
          this.updateTask(t);
        } else {
          this.createTask(t);
        }
        count++;
      }
    }

    if (parsed.settings && typeof parsed.settings === 'object') {
      this.updateSettings(parsed.settings);
    }

    this.save();
    return { count };
  }
}

export const dbInstance = new TaskDatabase();
