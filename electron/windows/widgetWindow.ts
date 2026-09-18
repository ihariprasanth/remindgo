import { BrowserWindow, screen } from 'electron';
import path from 'path';

let widgetWindowInstance: BrowserWindow | null = null;
let isPinned = false;

export function getWidgetWindow(): BrowserWindow | null {
  return widgetWindowInstance;
}

export function isWidgetAlwaysOnTop(): boolean {
  return isPinned;
}

export function setWidgetAlwaysOnTop(pinned: boolean): void {
  isPinned = pinned;
  if (widgetWindowInstance && !widgetWindowInstance.isDestroyed()) {
    widgetWindowInstance.setAlwaysOnTop(pinned);
  }
}

export function createOrShowWidgetWindow(isDev: boolean, devServerUrl?: string): BrowserWindow {
  if (widgetWindowInstance && !widgetWindowInstance.isDestroyed()) {
    widgetWindowInstance.show();
    widgetWindowInstance.focus();
    return widgetWindowInstance;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { x: workX, y: workY, width: screenWidth, height: screenHeight } = primaryDisplay.workArea;
  const winWidth = 415;
  const winHeight = 210;

  // Position neatly on the top-right corner of the desktop wallpaper
  const x = Math.max(workX + 20, workX + screenWidth - winWidth - 25);
  const y = workY + 25;

  const iconPath = isDev
    ? path.join(__dirname, '../../assets/icon.ico')
    : path.join(__dirname, '../assets/icon.ico');

  widgetWindowInstance = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x,
    y,
    title: 'RemindGo Desktop Widget',
    icon: iconPath,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    alwaysOnTop: isPinned,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (isDev && devServerUrl) {
    widgetWindowInstance.loadURL(`${devServerUrl}/widget.html`);
  } else {
    widgetWindowInstance.loadFile(path.join(__dirname, '../dist/widget.html'));
  }

  widgetWindowInstance.once('ready-to-show', () => {
    if (widgetWindowInstance && !widgetWindowInstance.isDestroyed()) {
      widgetWindowInstance.showInactive();
    }
  });

  // Fallback to guarantee the widget shows immediately even if ready-to-show is delayed
  setTimeout(() => {
    if (widgetWindowInstance && !widgetWindowInstance.isDestroyed() && !widgetWindowInstance.isVisible()) {
      widgetWindowInstance.showInactive();
    }
  }, 400);

  widgetWindowInstance.webContents.on('did-fail-load', (_event, errorCode, errorDesc) => {
    console.error(`[WidgetWindow] Failed to load: ${errorCode} - ${errorDesc}`);
  });

  widgetWindowInstance.on('closed', () => {
    widgetWindowInstance = null;
  });

  return widgetWindowInstance;
}

export function toggleWidgetWindow(isDev: boolean, devServerUrl?: string): void {
  if (widgetWindowInstance && !widgetWindowInstance.isDestroyed()) {
    if (widgetWindowInstance.isVisible()) {
      widgetWindowInstance.hide();
    } else {
      widgetWindowInstance.show();
      widgetWindowInstance.focus();
    }
  } else {
    createOrShowWidgetWindow(isDev, devServerUrl);
  }
}

export function closeWidgetWindow(): void {
  if (widgetWindowInstance && !widgetWindowInstance.isDestroyed()) {
    widgetWindowInstance.close();
    widgetWindowInstance = null;
  }
}

export function resizeWidgetWindow(width: number, height: number): void {
  if (widgetWindowInstance && !widgetWindowInstance.isDestroyed()) {
    widgetWindowInstance.setSize(width, height);
  }
}
