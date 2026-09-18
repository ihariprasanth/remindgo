import { contextBridge, ipcRenderer } from 'electron';
import { Task, Settings } from '../src/types';

contextBridge.exposeInMainWorld('electronAPI', {
  // Tasks
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'status'>) => ipcRenderer.invoke('create-task', task),
  updateTask: (task: Task) => ipcRenderer.invoke('update-task', task),
  deleteTask: (id: string) => ipcRenderer.invoke('delete-task', id),
  toggleTaskStatus: (id: string) => ipcRenderer.invoke('toggle-task-status', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: Partial<Settings>) => ipcRenderer.invoke('update-settings', settings),

  // LeetCode
  getLeetCodeData: (username: string, forceRefresh?: boolean) => ipcRenderer.invoke('get-leetcode-data', { username, forceRefresh }),
  getStoredLeetCodeData: () => ipcRenderer.invoke('get-stored-leetcode-data'),

  // Alarms
  onAlarmTrigger: (callback: (task: Task) => void) => {
    const handler = (_event: any, task: Task) => callback(task);
    ipcRenderer.on('alarm-data', handler);
    ipcRenderer.on('alarm-triggered', handler);
    return () => {
      ipcRenderer.removeListener('alarm-data', handler);
      ipcRenderer.removeListener('alarm-triggered', handler);
    };
  },
  snoozeAlarm: (taskId: string, minutes: number) => ipcRenderer.invoke('snooze-alarm', { taskId, minutes }),
  dismissAlarm: (taskId: string, markDone?: boolean) => ipcRenderer.invoke('dismiss-alarm', { taskId, markDone }),
  previewSound: (soundName: string) => ipcRenderer.invoke('preview-sound', soundName),
  stopSoundPreview: () => ipcRenderer.invoke('stop-sound-preview'),

  // Backup
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: () => ipcRenderer.invoke('import-data'),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // System
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onOpenAddTask: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('open-add-task', handler);
    return () => {
      ipcRenderer.removeListener('open-add-task', handler);
    };
  },
  onTasksChanged: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('tasks-changed', handler);
    return () => {
      ipcRenderer.removeListener('tasks-changed', handler);
    };
  },

  // Desktop Widget
  toggleWidget: () => ipcRenderer.invoke('toggle-widget'),
  openMainWindow: () => ipcRenderer.invoke('open-main-window'),
  setWidgetAlwaysOnTop: (pinned: boolean) => ipcRenderer.invoke('widget-set-always-on-top', pinned),
  isWidgetPinned: () => ipcRenderer.invoke('widget-is-pinned')
});
