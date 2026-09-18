export type TaskRepeat = 'none' | 'daily' | 'weekly';
export type TaskStatus = 'pending' | 'completed' | 'snoozed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  repeat: TaskRepeat;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  completed_at?: string | null;
  snoozed_until?: string | null;
  last_notified_at?: string | null;
}

export interface Settings {
  alarmSound: string;
  soundVolume: number;
  snoozeDuration: number; // in minutes
  minimizeToTray: boolean;
  closeToTray: boolean;
  startWithWindows: boolean;
  leetcodeUsername?: string;
  theme: 'dark' | 'light';
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface DashboardStats {
  currentStreak: number;
  longestStreak: number;
  completedToday: number;
  totalCompleted: number;
  pendingCount: number;
  completionRate: number;
}

export interface LeetCodeDailyChallenge {
  date: string;
  link: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionFrontendId: string;
}

export interface LeetCodeData {
  username: string;
  realName: string;
  userAvatar: string;
  ranking: number;
  reputation: number;
  totalSolved: number;
  totalQuestions: number;
  easySolved: number;
  totalEasy: number;
  mediumSolved: number;
  totalMedium: number;
  hardSolved: number;
  totalHard: number;
  streak: number;
  totalActiveDays: number;
  submissionCalendar: Record<string, number>;
  dailyChallenge?: LeetCodeDailyChallenge;
  isOffline: boolean;
  lastSynced: string;
  errorMessage?: string;
}

export interface ElectronAPI {
  // Task management
  getTasks: () => Promise<Task[]>;
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'status'>) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task>;
  deleteTask: (id: string) => Promise<boolean>;
  toggleTaskStatus: (id: string) => Promise<Task>;
  
  // Settings management
  getSettings: () => Promise<Settings>;
  updateSettings: (settings: Partial<Settings>) => Promise<Settings>;

  // LeetCode integration
  getLeetCodeData: (username: string, forceRefresh?: boolean) => Promise<LeetCodeData>;
  getStoredLeetCodeData: () => Promise<LeetCodeData | null>;

  // Alarm actions
  onAlarmTrigger: (callback: (task: Task) => void) => () => void;
  snoozeAlarm: (taskId: string, minutes: number) => Promise<void>;
  dismissAlarm: (taskId: string, markDone?: boolean) => Promise<void>;
  previewSound: (soundName: string) => Promise<void>;
  stopSoundPreview: () => Promise<void>;

  // Backup & Restore
  exportData: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
  importData: () => Promise<{ success: boolean; count?: number; error?: string }>;

  // Window controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isMaximized: () => Promise<boolean>;

  // System
  getAppVersion: () => Promise<string>;
  onOpenAddTask?: (callback: () => void) => () => void;
  onTasksChanged?: (callback: () => void) => () => void;

  // Desktop Widget
  toggleWidget: () => Promise<void>;
  openMainWindow: () => Promise<void>;
  setWidgetAlwaysOnTop: (pinned: boolean) => Promise<void>;
  isWidgetPinned: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
