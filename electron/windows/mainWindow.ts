import { BrowserWindow, app } from 'electron';
import path from 'path';
import { dbInstance } from '../db/database';

let mainWindowInstance: BrowserWindow | null = null;
let isQuitting = false;

export function setQuitting(val: boolean): void {
  isQuitting = val;
}

export function getIsQuitting(): boolean {
  return isQuitting;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindowInstance;
}

export function createMainWindow(isDev: boolean, devServerUrl?: string): BrowserWindow {
  mainWindowInstance = new BrowserWindow({
    width: 1140,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    title: 'TaskPulse',
    frame: false, // Clean custom frameless titlebar with GitHub theme
    backgroundColor: '#0d1117',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (isDev && devServerUrl) {
    mainWindowInstance.loadURL(devServerUrl);
  } else {
    mainWindowInstance.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindowInstance.once('ready-to-show', () => {
    if (mainWindowInstance) {
      mainWindowInstance.show();
      mainWindowInstance.focus();
    }
  });

  mainWindowInstance.on('close', (event) => {
    if (!isQuitting) {
      const settings = dbInstance.getSettings();
      if (settings.closeToTray) {
        event.preventDefault();
        mainWindowInstance?.hide();
      }
    }
  });

  mainWindowInstance.on('minimize', (event) => {
    const settings = dbInstance.getSettings();
    if (settings.minimizeToTray) {
      event.preventDefault();
      mainWindowInstance?.hide();
    }
  });

  mainWindowInstance.on('closed', () => {
    mainWindowInstance = null;
  });

  return mainWindowInstance;
}
