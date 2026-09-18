import { BrowserWindow, screen } from 'electron';
import path from 'path';
import { Task } from '../../src/types';

let alarmWindowInstance: BrowserWindow | null = null;
let currentAlarmTask: Task | null = null;

export function getAlarmWindow(): BrowserWindow | null {
  return alarmWindowInstance;
}

export function createOrShowAlarmWindow(task: Task, isDev: boolean, devServerUrl?: string): BrowserWindow {
  currentAlarmTask = task;

  if (alarmWindowInstance && !alarmWindowInstance.isDestroyed()) {
    alarmWindowInstance.show();
    alarmWindowInstance.focus();
    alarmWindowInstance.setAlwaysOnTop(true, 'screen-saver');
    alarmWindowInstance.webContents.send('alarm-data', task);
    return alarmWindowInstance;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const winWidth = 480;
  const winHeight = 440;

  alarmWindowInstance = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: Math.round((screenWidth - winWidth) / 2),
    y: Math.round((screenHeight - winHeight) / 2),
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    show: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  alarmWindowInstance.setAlwaysOnTop(true, 'screen-saver');

  if (isDev && devServerUrl) {
    alarmWindowInstance.loadURL(`${devServerUrl}/alarm.html`);
  } else {
    alarmWindowInstance.loadFile(path.join(__dirname, '../dist/alarm.html'));
  }

  alarmWindowInstance.once('ready-to-show', () => {
    if (alarmWindowInstance && !alarmWindowInstance.isDestroyed()) {
      alarmWindowInstance.show();
      alarmWindowInstance.focus();
      alarmWindowInstance.webContents.send('alarm-data', task);
    }
  });

  // Also send data once did-finish-load fires in case ready-to-show was early
  alarmWindowInstance.webContents.on('did-finish-load', () => {
    if (alarmWindowInstance && !alarmWindowInstance.isDestroyed() && currentAlarmTask) {
      alarmWindowInstance.webContents.send('alarm-data', currentAlarmTask);
    }
  });

  alarmWindowInstance.on('closed', () => {
    alarmWindowInstance = null;
    currentAlarmTask = null;
  });

  return alarmWindowInstance;
}

export function closeAlarmWindow(): void {
  if (alarmWindowInstance && !alarmWindowInstance.isDestroyed()) {
    alarmWindowInstance.close();
    alarmWindowInstance = null;
    currentAlarmTask = null;
  }
}
