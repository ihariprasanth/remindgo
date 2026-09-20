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

export function createMainWindow(isDev: boolean, devServerUrl?: string, startHidden: boolean = false): BrowserWindow {
  const iconPath = isDev
    ? path.join(__dirname, '../../assets/icon.ico')
    : path.join(__dirname, '../assets/icon.ico');

  mainWindowInstance = new BrowserWindow({
    width: 1140,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    title: 'RemindGo',
    icon: iconPath,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
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
    if (mainWindowInstance && !startHidden) {
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

  // Standard Windows minimize: remains in Windows Taskbar & Task Manager
  mainWindowInstance.on('closed', () => {
    mainWindowInstance = null;
  });

  return mainWindowInstance;
}
