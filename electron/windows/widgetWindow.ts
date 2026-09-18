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
  const winWidth = 380;
  const winHeight = 540;

  // Position nicely on the right side of the screen like a Windows widget
  const x = Math.max(workX + 20, workX + screenWidth - winWidth - 30);
  const y = Math.max(workY + 40, workY + Math.round((screenHeight - winHeight) / 2));

  const iconPath = isDev
    ? path.join(__dirname, '../../assets/icon.ico')
    : path.join(__dirname, '../assets/icon.ico');

  widgetWindowInstance = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    minWidth: 340,
    minHeight: 460,
    x,
    y,
    title: 'RemindGo Widget',
    icon: iconPath,
    frame: false,
    resizable: true,
    alwaysOnTop: isPinned,
    skipTaskbar: false,
    show: false,
    backgroundColor: '#000000',
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
      widgetWindowInstance.show();
      widgetWindowInstance.focus();
    }
  });

  // Fallback to guarantee the widget shows immediately even if ready-to-show is delayed
  setTimeout(() => {
    if (widgetWindowInstance && !widgetWindowInstance.isDestroyed() && !widgetWindowInstance.isVisible()) {
      widgetWindowInstance.show();
      widgetWindowInstance.focus();
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
