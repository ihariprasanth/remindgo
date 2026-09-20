import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { dbInstance } from './db/database';
import { createMainWindow, getMainWindow, setQuitting } from './windows/mainWindow';
import { createOrShowAlarmWindow, closeAlarmWindow } from './windows/alarmWindow';
import {
  toggleWidgetWindow,
  getAllWidgetWindows,
  setWidgetAlwaysOnTop,
  isWidgetAlwaysOnTop,
  createOrShowWidgetWindow,
  closeWidgetWindow,
  closeAllWidgetWindows,
  launchAllPreferredWidgets,
  getActiveWidgetVariants,
  resizeWidgetWindow,
  saveAllActiveWidgetPositions
} from './windows/widgetWindow';
import { setupTray, destroyTray } from './tray';
import { AlarmScheduler } from './scheduler';
import { fetchLeetCodeData } from './leetcode';
import { fetchCodeChefData } from './codechef';
import { fetchGeeksForGeeksData } from './geeksforgeeks';
import { Task, Settings, WidgetVariant } from '../src/types';

// Windows Low-RAM & Resource Optimization Engine (Chromium Switches)
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('disable-extensions');
app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication,CalculateNativeWinOcclusion,InterestFeedContentSuggestions');
app.commandLine.appendSwitch('disable-hang-monitor');
app.commandLine.appendSwitch('disable-ipc-flooding-protection');
app.commandLine.appendSwitch('disable-popup-blocking');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-translate');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('metrics-recording-only');
app.commandLine.appendSwitch('no-first-run');
app.commandLine.appendSwitch('js-flags', '--expose-gc');

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

const isStartupLaunch = process.argv.includes('--startup') ||
                        process.argv.includes('--hidden') ||
                        Boolean(app.getLoginItemSettings && app.getLoginItemSettings().wasOpenedAtLogin);

app.whenReady().then(async () => {
  console.log(`[Main] App ready. Initializing database... (startup mode: ${isStartupLaunch})`);
  await dbInstance.init();

  // Apply startWithWindows setting
  const initialSettings = dbInstance.getSettings();
  try {
    app.setLoginItemSettings({
      openAtLogin: initialSettings.startWithWindows,
      path: process.execPath,
      args: ['--startup']
    });
  } catch (err) {
    console.warn('[Main] Could not set login item settings:', err);
  }

  // Create main window & tray (remain hidden on startup boot so only desktop widgets show)
  createMainWindow(isDev, devServerUrl, isStartupLaunch);
  setupTray(isDev, devServerUrl);

  // Start alarm scheduler
  scheduler = new AlarmScheduler(isDev, devServerUrl);
  scheduler.start();

  // Auto-open Desktop Widgets: activate widgets on startup or if autoOpenWidget is enabled
  if (initialSettings.autoOpenWidget || isStartupLaunch) {
    launchAllPreferredWidgets(isDev, devServerUrl);
  }

  // Periodic memory trimming & garbage collection to keep RAM ultra low
  setInterval(() => {
    try {
      if (global.gc) global.gc();
    } catch {}
  }, 60000);

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
  try {
    saveAllActiveWidgetPositions();
  } catch {}
  scheduler?.stop();
  destroyTray();
});

app.on('window-all-closed', () => {
  const settings = dbInstance.getSettings();
  if (!settings.closeToTray && process.platform !== 'darwin') {
    app.quit();
  }
});

function broadcastTasksChanged() {
  getMainWindow()?.webContents.send('tasks-changed');
  for (const win of getAllWidgetWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('tasks-changed');
    }
  }
}

function broadcastAlarmDismissed() {
  getMainWindow()?.webContents.send('alarm-dismissed');
  for (const win of getAllWidgetWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('alarm-dismissed');
    }
  }
}

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
  broadcastTasksChanged();
  return created;
});

ipcMain.handle('update-task', async (_event, task: Task) => {
  const updated = dbInstance.updateTask(task);
  scheduler?.checkDueTasks();
  broadcastTasksChanged();
  return updated;
});

ipcMain.handle('delete-task', async (_event, id: string) => {
  const res = dbInstance.deleteTask(id);
  broadcastTasksChanged();
  return res;
});

ipcMain.handle('toggle-task-status', async (_event, id: string) => {
  const task = dbInstance.getTaskById(id);
  if (!task) throw new Error('Task not found');

  let result: Task;
  if (task.status === 'completed') {
    result = dbInstance.setTaskStatus(id, 'pending', null);
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
      result = dbInstance.updateTask(task);
    } else {
      result = dbInstance.setTaskStatus(id, 'completed', new Date().toISOString());
    }
  }
  broadcastTasksChanged();
  return result;
});

ipcMain.handle('mark-all-today-tasks-done', async () => {
  dbInstance.markAllTodayTasksDone();
  broadcastTasksChanged();
  broadcastAlarmDismissed();
  return true;
});

ipcMain.handle('ensure-daily-tasks', async () => {
  dbInstance.ensureDailyDeveloperTasks();
  broadcastTasksChanged();
  return true;
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
// IPC Handlers - CodeChef & GeeksforGeeks
// ==========================================
ipcMain.handle('get-codechef-data', async (_event, { username, forceRefresh }: { username: string; forceRefresh?: boolean }) => {
  return fetchCodeChefData(username, forceRefresh);
});

ipcMain.handle('get-stored-codechef-data', async () => {
  const settings = dbInstance.getSettings();
  if (settings.codechefUsername) {
    const cached = dbInstance.getCodeChefCache(settings.codechefUsername);
    if (cached) {
      return {
        ...cached.data,
        lastSynced: cached.last_synced
      };
    }
  }
  return null;
});

ipcMain.handle('get-gfg-data', async (_event, { username, forceRefresh }: { username: string; forceRefresh?: boolean }) => {
  return fetchGeeksForGeeksData(username, forceRefresh);
});

ipcMain.handle('get-stored-gfg-data', async () => {
  const settings = dbInstance.getSettings();
  if (settings.gfgUsername) {
    const cached = dbInstance.getGeeksForGeeksCache(settings.gfgUsername);
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
        path: process.execPath,
        args: ['--startup']
      });
    } catch (err) {
      console.warn('[Main] Failed to update login item settings:', err);
    }
  }
  if (partialSettings.widgetAlwaysOnTop !== undefined) {
    setWidgetAlwaysOnTop(partialSettings.widgetAlwaysOnTop);
  }
  return updated;
});

// ==========================================
// IPC Handlers - Alarm Actions
// ==========================================
ipcMain.handle('snooze-alarm', async (_event, { taskId, minutes }: { taskId: string; minutes: number }) => {
  console.log(`[Main] Snoozing task ${taskId} for ${minutes} minutes`);
  if (taskId.startsWith('batch-')) {
    const ids = taskId.replace('batch-', '').split('__');
    for (const id of ids) {
      dbInstance.snoozeTask(id, minutes);
    }
  } else {
    dbInstance.snoozeTask(taskId, minutes);
  }
  closeAlarmWindow();
  broadcastAlarmDismissed();
  broadcastTasksChanged();
});

ipcMain.handle('dismiss-alarm', async (_event, { taskId, markDone }: { taskId: string; markDone?: boolean }) => {
  console.log(`[Main] Dismissing alarm for task ${taskId}, markDone: ${markDone}`);
  if (markDone) {
    const taskIds = taskId.startsWith('batch-') ? taskId.replace('batch-', '').split('__') : [taskId];
    for (const id of taskIds) {
      const task = dbInstance.getTaskById(id);
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
          dbInstance.setTaskStatus(id, 'completed', new Date().toISOString());
        }
      }
    }
  }
  closeAlarmWindow();
  broadcastAlarmDismissed();
  broadcastTasksChanged();
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
    broadcastTasksChanged();
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

// ==========================================
// IPC Handlers - Desktop Widget (Multi-Widget Desktop Manager)
// ==========================================
ipcMain.handle('open-widget', async (_event, variant: WidgetVariant) => {
  createOrShowWidgetWindow(variant, isDev, devServerUrl);
});

ipcMain.handle('close-widget', async (_event, variant: WidgetVariant) => {
  closeWidgetWindow(variant);
});

ipcMain.handle('toggle-widget', async (_event, variant?: WidgetVariant) => {
  toggleWidgetWindow(variant || 'tasks-heatmap', isDev, devServerUrl);
});

ipcMain.handle('get-active-widgets', async () => {
  return getActiveWidgetVariants();
});

ipcMain.handle('close-all-widgets', async () => {
  closeAllWidgetWindows();
});

ipcMain.handle('launch-all-widgets', async () => {
  launchAllPreferredWidgets(isDev, devServerUrl);
});

ipcMain.handle('widget-set-always-on-top', async (_event, pinned: boolean) => {
  setWidgetAlwaysOnTop(pinned);
});

ipcMain.handle('widget-is-pinned', async () => {
  return isWidgetAlwaysOnTop();
});

ipcMain.handle('widget-resize', async (_event, { variant, width, height }: { variant?: WidgetVariant; width: number; height: number }) => {
  if (variant) {
    resizeWidgetWindow(variant, width, height);
  }
});

ipcMain.handle('open-main-window', async () => {
  const win = getMainWindow();
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  } else {
    createMainWindow(isDev, devServerUrl);
  }
});
