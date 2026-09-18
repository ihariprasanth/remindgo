import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { dbInstance } from './db/database';
import { createMainWindow, getMainWindow, setQuitting } from './windows/mainWindow';
import { createOrShowAlarmWindow, closeAlarmWindow } from './windows/alarmWindow';
import { setupTray, destroyTray } from './tray';
import { AlarmScheduler } from './scheduler';
import { fetchLeetCodeData } from './leetcode';
import { Task, Settings } from '../src/types';

// Ensure single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  console.log('[Main] Another instance is already running. Quitting.');
  app.quit();
}

const isDev = process.env.NODE_ENV === 'development';
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

let scheduler: AlarmScheduler | null = null;

app.name = 'RemindGo';
app.setName('RemindGo');
app.setAppUserModelId('com.remindgo.app');

app.on('second-instance', () => {
  const mainWin = getMainWindow();
  if (mainWin) {
    if (mainWin.isMinimized()) mainWin.restore();
    mainWin.show();
    mainWin.focus();
  }
});

app.whenReady().then(async () => {
  console.log('[Main] App ready. Initializing database...');
  await dbInstance.init();

  // Apply startWithWindows setting
  const initialSettings = dbInstance.getSettings();
  try {
    app.setLoginItemSettings({
      openAtLogin: initialSettings.startWithWindows,
      path: process.execPath
    });
  } catch (err) {
    console.warn('[Main] Could not set login item settings:', err);
  }

  // Create main window & tray
  createMainWindow(isDev, devServerUrl);
  setupTray(isDev, devServerUrl);

  // Start alarm scheduler
  scheduler = new AlarmScheduler(isDev, devServerUrl);
  scheduler.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(isDev, devServerUrl);
    } else {
      const mainWin = getMainWindow();
      if (mainWin) {
        mainWin.show();
        mainWin.focus();
      }
    }
  });
});

app.on('before-quit', () => {
  setQuitting(true);
  scheduler?.stop();
  destroyTray();
});

app.on('window-all-closed', () => {
  const settings = dbInstance.getSettings();
  if (!settings.closeToTray && process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// IPC Handlers - Tasks
// ==========================================
ipcMain.handle('get-tasks', async () => {
  return dbInstance.getAllTasks();
});

ipcMain.handle('create-task', async (_event, taskData: Omit<Task, 'id' | 'created_at' | 'status'>) => {
  const newTask: Task = {
    ...taskData,
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    status: 'pending',
    created_at: new Date().toISOString()
  };
  const created = dbInstance.createTask(newTask);
  scheduler?.checkDueTasks();
  return created;
});

ipcMain.handle('update-task', async (_event, task: Task) => {
  const updated = dbInstance.updateTask(task);
  scheduler?.checkDueTasks();
  return updated;
});

ipcMain.handle('delete-task', async (_event, id: string) => {
  return dbInstance.deleteTask(id);
});

ipcMain.handle('toggle-task-status', async (_event, id: string) => {
  const task = dbInstance.getTaskById(id);
  if (!task) throw new Error('Task not found');

  if (task.status === 'completed') {
    return dbInstance.setTaskStatus(id, 'pending', null);
  } else {
    if (task.repeat === 'daily' || task.repeat === 'weekly') {
      const [year, month, day] = task.date.split('-').map(Number);
      const currentDate = new Date(year, month - 1, day);
      const daysToAdd = task.repeat === 'daily' ? 1 : 7;
      currentDate.setDate(currentDate.getDate() + daysToAdd);

      const nextYear = currentDate.getFullYear();
      const nextMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
      const nextDay = String(currentDate.getDate()).padStart(2, '0');
      const nextDateStr = `${nextYear}-${nextMonth}-${nextDay}`;

      dbInstance.createTask({
        ...task,
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        status: 'completed',
        completed_at: new Date().toISOString(),
        repeat: 'none'
      });

      task.date = nextDateStr;
      task.status = 'pending';
      task.last_notified_at = null;
      task.snoozed_until = null;
      return dbInstance.updateTask(task);
    } else {
      return dbInstance.setTaskStatus(id, 'completed', new Date().toISOString());
    }
  }
});

// ==========================================
// IPC Handlers - LeetCode
// ==========================================
ipcMain.handle('get-leetcode-data', async (_event, { username, forceRefresh }: { username: string; forceRefresh?: boolean }) => {
  return fetchLeetCodeData(username, forceRefresh);
});

ipcMain.handle('get-stored-leetcode-data', async () => {
  const settings = dbInstance.getSettings();
  if (settings.leetcodeUsername) {
    const cached = dbInstance.getLeetCodeCache(settings.leetcodeUsername);
    if (cached) {
      return {
        ...cached.data,
        lastSynced: cached.last_synced
      };
    }
  }
  return null;
});

// ==========================================
// IPC Handlers - Settings
// ==========================================
ipcMain.handle('get-settings', async () => {
  return dbInstance.getSettings();
});

ipcMain.handle('update-settings', async (_event, partialSettings: Partial<Settings>) => {
  const updated = dbInstance.updateSettings(partialSettings);
  if (partialSettings.startWithWindows !== undefined) {
    try {
      app.setLoginItemSettings({
        openAtLogin: partialSettings.startWithWindows,
        path: process.execPath
      });
    } catch (err) {
      console.warn('[Main] Failed to update login item settings:', err);
    }
  }
  return updated;
});

// ==========================================
// IPC Handlers - Alarm Actions
// ==========================================
ipcMain.handle('snooze-alarm', async (_event, { taskId, minutes }: { taskId: string; minutes: number }) => {
  console.log(`[Main] Snoozing task ${taskId} for ${minutes} minutes`);
  dbInstance.snoozeTask(taskId, minutes);
  closeAlarmWindow();
  getMainWindow()?.webContents.send('tasks-changed');
});

ipcMain.handle('dismiss-alarm', async (_event, { taskId, markDone }: { taskId: string; markDone?: boolean }) => {
  console.log(`[Main] Dismissing alarm for task ${taskId}, markDone: ${markDone}`);
  if (markDone) {
    const task = dbInstance.getTaskById(taskId);
    if (task) {
      if (task.repeat === 'daily' || task.repeat === 'weekly') {
        const [year, month, day] = task.date.split('-').map(Number);
        const currentDate = new Date(year, month - 1, day);
        const daysToAdd = task.repeat === 'daily' ? 1 : 7;
        currentDate.setDate(currentDate.getDate() + daysToAdd);

        const nextYear = currentDate.getFullYear();
        const nextMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
        const nextDay = String(currentDate.getDate()).padStart(2, '0');
        const nextDateStr = `${nextYear}-${nextMonth}-${nextDay}`;

        dbInstance.createTask({
          ...task,
          id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
          status: 'completed',
          completed_at: new Date().toISOString(),
          repeat: 'none'
        });

        task.date = nextDateStr;
        task.status = 'pending';
        task.last_notified_at = null;
        task.snoozed_until = null;
        dbInstance.updateTask(task);
      } else {
        dbInstance.setTaskStatus(taskId, 'completed', new Date().toISOString());
      }
    }
  }
  closeAlarmWindow();
  getMainWindow()?.webContents.send('tasks-changed');
});

// ==========================================
// IPC Handlers - Backup & Restore
// ==========================================
ipcMain.handle('export-data', async () => {
  const mainWin = getMainWindow();
  const { canceled, filePath } = await dialog.showSaveDialog(mainWin!, {
    title: 'Export RemindGo Backup',
    defaultPath: `remindgo-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON Backup', extensions: ['json'] }]
  });

  if (canceled || !filePath) return { success: false };

  try {
    const jsonContent = dbInstance.exportBackup();
    fs.writeFileSync(filePath, jsonContent, 'utf-8');
    return { success: true, filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('import-data', async () => {
  const mainWin = getMainWindow();
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWin!, {
    title: 'Import RemindGo Backup',
    properties: ['openFile'],
    filters: [{ name: 'JSON Backup', extensions: ['json'] }]
  });

  if (canceled || !filePaths || filePaths.length === 0) return { success: false };

  try {
    const content = fs.readFileSync(filePaths[0], 'utf-8');
    const result = dbInstance.importBackup(content);
    scheduler?.checkDueTasks();
    mainWin?.webContents.send('tasks-changed');
    return { success: true, count: result.count };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// ==========================================
// IPC Handlers - Window Controls
// ==========================================
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.close();
});

ipcMain.handle('window-is-maximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win?.isMaximized() || false;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});
