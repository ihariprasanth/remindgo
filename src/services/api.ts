import { Task, Settings, ElectronAPI, LeetCodeData } from '../types';

let mockTasks: Task[] = [
  {
    id: 'sample_1',
    title: 'Review weekly sprint goals',
    description: 'Check issues and project board updates',
    category: 'Work',
    date: new Date().toISOString().slice(0, 10),
    time: '14:00',
    repeat: 'none',
    status: 'pending',
    priority: 'high',
    created_at: new Date().toISOString()
  },
  {
    id: 'sample_2',
    title: 'Workout & Stretching',
    description: '30 minutes cardio and core',
    category: 'Health',
    date: new Date().toISOString().slice(0, 10),
    time: '18:30',
    repeat: 'daily',
    status: 'pending',
    priority: 'medium',
    created_at: new Date().toISOString()
  },
  {
    id: 'sample_3',
    title: 'Read documentation on WebAssembly',
    category: 'Study',
    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    time: '10:00',
    repeat: 'none',
    status: 'completed',
    priority: 'low',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    completed_at: new Date(Date.now() - 86400000).toISOString()
  }
];

let mockSettings: Settings = {
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

let mockLeetCodeData: LeetCodeData = {
  username: 'demo_coder',
  realName: 'Demo Coder',
  userAvatar: '',
  ranking: 45210,
  reputation: 34,
  totalSolved: 312,
  totalQuestions: 3200,
  easySolved: 145,
  totalEasy: 820,
  mediumSolved: 138,
  totalMedium: 1680,
  hardSolved: 29,
  totalHard: 700,
  streak: 14,
  totalActiveDays: 142,
  submissionCalendar: {},
  dailyChallenge: {
    date: new Date().toISOString().slice(0, 10),
    link: 'https://leetcode.com/problems/two-sum/',
    title: 'Two Sum',
    difficulty: 'Easy',
    questionFrontendId: '1'
  },
  isOffline: false,
  lastSynced: new Date().toISOString()
};

const mockAPI: ElectronAPI = {
  getTasks: async () => [...mockTasks],
  createTask: async (taskData) => {
    const newTask: Task = {
      ...taskData,
      id: 'task_' + Date.now(),
      status: 'pending',
      created_at: new Date().toISOString()
    };
    mockTasks.push(newTask);
    return newTask;
  },
  updateTask: async (task) => {
    mockTasks = mockTasks.map((t) => (t.id === task.id ? task : t));
    return task;
  },
  deleteTask: async (id) => {
    mockTasks = mockTasks.filter((t) => t.id !== id);
    return true;
  },
  toggleTaskStatus: async (id) => {
    const task = mockTasks.find((t) => t.id === id);
    if (!task) throw new Error('Not found');
    task.status = task.status === 'completed' ? 'pending' : 'completed';
    task.completed_at = task.status === 'completed' ? new Date().toISOString() : null;
    return task;
  },
  getSettings: async () => ({ ...mockSettings }),
  updateSettings: async (settings) => {
    mockSettings = { ...mockSettings, ...settings };
    return mockSettings;
  },
  getLeetCodeData: async (username, _force) => {
    mockLeetCodeData.username = username;
    return mockLeetCodeData;
  },
  getStoredLeetCodeData: async () => {
    return mockSettings.leetcodeUsername ? mockLeetCodeData : null;
  },
  onAlarmTrigger: () => () => {},
  onAlarmDismissed: () => () => {},
  snoozeAlarm: async () => {},
  dismissAlarm: async () => {},
  previewSound: async () => {},
  stopSoundPreview: async () => {},
  exportData: async () => ({ success: true }),
  importData: async () => ({ success: true, count: 0 }),
  minimizeWindow: () => {},
  maximizeWindow: () => {},
  closeWindow: () => {},
  isMaximized: async () => false,
  getAppVersion: async () => '2.5.5',
  toggleWidget: async () => {},
  openMainWindow: async () => {},
  setWidgetAlwaysOnTop: async () => {},
  isWidgetPinned: async () => false,
  resizeWidget: async () => {},
  onOpenAddTask: () => () => {},
  onTasksChanged: () => () => {}
};

export const api: ElectronAPI = (typeof window !== 'undefined' && window.electronAPI) ? window.electronAPI : mockAPI;
