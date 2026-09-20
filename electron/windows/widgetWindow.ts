import { BrowserWindow, screen, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { dbInstance } from '../db/database';
import { WidgetVariant } from '../../src/types';
import { getMainWindow, getIsQuitting } from './mainWindow';

// Active standalone widget instances mapped by variant
const activeWidgetWindows = new Map<WidgetVariant, BrowserWindow>();
let isPinned = false;

function getPositionsFilePath(): string {
  const userData = app ? app.getPath('userData') : path.resolve(process.cwd(), '.data');
  return path.join(userData, 'widget-positions.json');
}

export function loadSavedWidgetPositions(): Record<string, { x: number; y: number }> {
  try {
    const p = getPositionsFilePath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (data && typeof data === 'object') return data;
    }
  } catch {}
  try {
    const settings = dbInstance.getSettings();
    if (settings.widgetPositions) return settings.widgetPositions;
  } catch {}
  return {};
}

export function saveWidgetPosition(variant: WidgetVariant, x: number, y: number): void {
  try {
    const p = getPositionsFilePath();
    let current: Record<string, { x: number; y: number }> = {};
    if (fs.existsSync(p)) {
      try {
        current = JSON.parse(fs.readFileSync(p, 'utf8')) || {};
      } catch {}
    }
    current[variant] = { x, y };
    fs.writeFileSync(p, JSON.stringify(current, null, 2), 'utf8');

    // Also update SQLite settings
    const currentSettings = dbInstance.getSettings();
    const currentPositions = currentSettings.widgetPositions || {};
    currentPositions[variant] = { x, y };
    dbInstance.updateSettings({ widgetPositions: currentPositions });
  } catch (err) {
    console.error(`[WidgetWindow] Error saving position for ${variant}:`, err);
  }
}

export function saveAllActiveWidgetPositions(): void {
  for (const [variant, win] of activeWidgetWindows.entries()) {
    if (win && !win.isDestroyed()) {
      const [x, y] = win.getPosition();
      saveWidgetPosition(variant, x, y);
    }
  }
}

export function getWidgetDimensions(variant: WidgetVariant): { width: number; height: number } {
  switch (variant) {
    case 'todo':
      return { width: 380, height: 360 };
    case 'coding-platforms':
      return { width: 380, height: 270 };
    case 'routine-progress':
      return { width: 380, height: 230 };
    case 'leetcode-streak':
      return { width: 360, height: 205 };
    case 'mini-pill':
      return { width: 320, height: 65 };
    case 'leetcode':
    case 'tasks-heatmap':
    default:
      return { width: 415, height: 205 };
  }
}

export function getWidgetWindow(variant?: WidgetVariant): BrowserWindow | null {
  if (variant) {
    return activeWidgetWindows.get(variant) || null;
  }
  // If none specified, return the first active widget window or null
  const first = activeWidgetWindows.values().next();
  return first.done ? null : first.value;
}

export function getAllWidgetWindows(): BrowserWindow[] {
  return Array.from(activeWidgetWindows.values()).filter((w) => !w.isDestroyed());
}

export function getActiveWidgetVariants(): WidgetVariant[] {
  return Array.from(activeWidgetWindows.keys());
}

export function isWidgetAlwaysOnTop(): boolean {
  return isPinned;
}

export function setWidgetAlwaysOnTop(pinned: boolean): void {
  isPinned = pinned;
  for (const win of activeWidgetWindows.values()) {
    if (win && !win.isDestroyed()) {
      win.setAlwaysOnTop(pinned);
    }
  }
}

function broadcastActiveWidgets(): void {
  const active = getActiveWidgetVariants();
  const mainWin = getMainWindow();
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('active-widgets-changed', active);
  }
}

function calculateDefaultPosition(variant: WidgetVariant, width: number, height: number): { x: number; y: number } {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x: workX, y: workY, width: screenWidth, height: screenHeight } = primaryDisplay.workArea;

  switch (variant) {
    case 'tasks-heatmap':
      return {
        x: Math.max(workX + 20, workX + screenWidth - width - 25),
        y: workY + 25
      };
    case 'todo':
      return {
        x: Math.max(workX + 20, workX + screenWidth - width - 25),
        y: workY + 245
      };
    case 'leetcode-streak':
      return {
        x: workX + 25,
        y: workY + 25
      };
    case 'leetcode':
      return {
        x: workX + 25,
        y: workY + 245
      };
    case 'coding-platforms':
      return {
        x: Math.max(workX + 20, workX + screenWidth - width - 425),
        y: workY + 25
      };
    case 'routine-progress':
      return {
        x: Math.max(workX + 20, workX + screenWidth - width - 25),
        y: Math.max(workY + 20, workY + screenHeight - height - 40)
      };
    case 'mini-pill':
      return {
        x: workX + Math.floor((screenWidth - width) / 2),
        y: workY + 25
      };
    default:
      return {
        x: Math.max(workX + 20, workX + screenWidth - width - 25),
        y: workY + 25
      };
  }
}

export function createOrShowWidgetWindow(
  variant: WidgetVariant = 'tasks-heatmap',
  isDev: boolean = false,
  devServerUrl?: string
): BrowserWindow {
  // If already open, focus it
  const existing = activeWidgetWindows.get(variant);
  if (existing && !existing.isDestroyed()) {
    if (!existing.isVisible()) {
      existing.showInactive();
    }
    return existing;
  }

  const { width: winWidth, height: winHeight } = getWidgetDimensions(variant);

  // Position retrieval: load saved or default
  const savedPositions = loadSavedWidgetPositions();
  const savedPos = savedPositions[variant];

  let x: number;
  let y: number;

  if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
    const displays = screen.getAllDisplays();
    const isVisible = displays.some((d) => {
      const { x: dx, y: dy, width: dw, height: dh } = d.bounds;
      return savedPos.x >= dx - 40 && savedPos.x < dx + dw && savedPos.y >= dy - 40 && savedPos.y < dy + dh;
    });

    if (isVisible) {
      x = Math.round(savedPos.x);
      y = Math.round(savedPos.y);
    } else {
      const computed = calculateDefaultPosition(variant, winWidth, winHeight);
      x = computed.x;
      y = computed.y;
    }
  } else {
    const computed = calculateDefaultPosition(variant, winWidth, winHeight);
    x = computed.x;
    y = computed.y;
  }

  const iconPath = isDev
    ? path.join(__dirname, '../../assets/icon.ico')
    : path.join(__dirname, '../assets/icon.ico');

  const settings = dbInstance.getSettings();
  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x,
    y,
    title: `RemindGo Widget • ${variant}`,
    icon: iconPath,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    alwaysOnTop: isPinned || Boolean(settings.widgetAlwaysOnTop),
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  activeWidgetWindows.set(variant, win);

  (win as any).__explicitCloseAllowed = false;

  // Prevent Alt+F4 from closing the desktop widget
  win.webContents.on('before-input-event', (event, input) => {
    if (input.alt && (input.key === 'F4' || input.key === 'f4' || input.code === 'F4')) {
      event.preventDefault();
    }
  });

  // Load URL with variant query param
  if (isDev && devServerUrl) {
    win.loadURL(`${devServerUrl}/widget.html?variant=${variant}`);
  } else {
    win.loadFile(path.join(__dirname, '../dist/widget.html'), { query: { variant } });
  }

  win.once('ready-to-show', () => {
    if (win && !win.isDestroyed()) {
      win.showInactive();
    }
  });

  // Fallback reveal
  setTimeout(() => {
    if (win && !win.isDestroyed() && !win.isVisible()) {
      win.showInactive();
    }
  }, 350);

  // Reliable, debounced position tracking for Windows
  let moveDebounceTimer: any = null;
  const persistCurrentPos = () => {
    if (moveDebounceTimer) clearTimeout(moveDebounceTimer);
    moveDebounceTimer = setTimeout(() => {
      if (win && !win.isDestroyed()) {
        const [currX, currY] = win.getPosition();
        saveWidgetPosition(variant, currX, currY);
      }
    }, 150);
  };

  win.on('move', persistCurrentPos);
  win.on('moved', persistCurrentPos);

  win.on('close', (event) => {
    if (!(win as any).__explicitCloseAllowed && !getIsQuitting()) {
      event.preventDefault();
      return;
    }

    if (win && !win.isDestroyed()) {
      const [currX, currY] = win.getPosition();
      saveWidgetPosition(variant, currX, currY);
    }
  });

  win.on('closed', () => {
    activeWidgetWindows.delete(variant);
    try {
      const currentActive = Array.from(activeWidgetWindows.keys());
      dbInstance.updateSettings({ activeWidgets: currentActive });
    } catch {}
    broadcastActiveWidgets();
  });

  // Save active widgets list
  try {
    const currentActive = Array.from(activeWidgetWindows.keys());
    dbInstance.updateSettings({ activeWidgets: currentActive });
  } catch {}
  broadcastActiveWidgets();

  return win;
}

export function closeWidgetWindow(variant: WidgetVariant): void {
  const win = activeWidgetWindows.get(variant);
  if (win && !win.isDestroyed()) {
    (win as any).__explicitCloseAllowed = true;
    win.close();
    activeWidgetWindows.delete(variant);
    broadcastActiveWidgets();
  }
}

export function closeAllWidgetWindows(): void {
  for (const [variant, win] of Array.from(activeWidgetWindows.entries())) {
    if (win && !win.isDestroyed()) {
      (win as any).__explicitCloseAllowed = true;
      win.close();
    }
    activeWidgetWindows.delete(variant);
  }
  try {
    dbInstance.updateSettings({ activeWidgets: [] });
  } catch {}
  broadcastActiveWidgets();
}

export function toggleWidgetWindow(
  variant: WidgetVariant = 'tasks-heatmap',
  isDev: boolean = false,
  devServerUrl?: string
): void {
  const win = activeWidgetWindows.get(variant);
  if (win && !win.isDestroyed()) {
    if (win.isVisible()) {
      (win as any).__explicitCloseAllowed = true;
      win.close();
      activeWidgetWindows.delete(variant);
      broadcastActiveWidgets();
    } else {
      win.showInactive();
    }
  } else {
    createOrShowWidgetWindow(variant, isDev, devServerUrl);
  }
}

export function launchAllPreferredWidgets(isDev: boolean = false, devServerUrl?: string): void {
  const settings = dbInstance.getSettings();
  const targets = (settings.activeWidgets && settings.activeWidgets.length > 0)
    ? settings.activeWidgets
    : (['tasks-heatmap', 'todo', 'leetcode-streak'] as WidgetVariant[]);

  for (const variant of targets) {
    createOrShowWidgetWindow(variant, isDev, devServerUrl);
  }
}

export function resizeWidgetWindow(variant: WidgetVariant, width: number, height: number): void {
  const win = activeWidgetWindows.get(variant);
  if (win && !win.isDestroyed()) {
    win.setSize(width, height);
  }
}
