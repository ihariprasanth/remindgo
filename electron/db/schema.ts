export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General',
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  repeat TEXT DEFAULT 'none',
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  created_at TEXT NOT NULL,
  completed_at TEXT,
  snoozed_until TEXT,
  last_notified_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leetcode_cache (
  username TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  last_synced TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS codechef_cache (
  username TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  last_synced TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gfg_cache (
  username TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  last_synced TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
`;

export const DEFAULT_SETTINGS: Record<string, string> = {
  alarmSound: 'digital-alarm',
  soundVolume: '0.8',
  snoozeDuration: '5',
  minimizeToTray: 'true',
  closeToTray: 'true',
  startWithWindows: 'true',
  leetcodeUsername: '',
  codechefUsername: '',
  gfgUsername: '',
  theme: 'dark',
  autoOpenWidget: 'true'
};
