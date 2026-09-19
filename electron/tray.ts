import { Tray, Menu, nativeImage, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { getMainWindow, setQuitting } from './windows/mainWindow';
import {
  toggleWidgetWindow,
  closeAllWidgetWindows,
  launchAllPreferredWidgets,
  getActiveWidgetVariants
} from './windows/widgetWindow';
import { WidgetVariant } from '../src/types';

let trayInstance: Tray | null = null;

function getTrayIcon(): nativeImage {
  // Check assets folder
  const iconPath = path.resolve(__dirname, '../assets/tray-icon.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }

  // Fallback: create a crisp 16x16 icon programmatically
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);
  const cx = 7.5, cy = 7.5, radius = 6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= radius) {
        buffer[idx] = 10;
        buffer[idx + 1] = 132;
        buffer[idx + 2] = 255;
        buffer[idx + 3] = 255;
      } else {
        buffer[idx + 3] = 0;
      }
    }
  }
  return nativeImage.createFromBitmap(buffer, { width: size, height: size });
}

export function refreshTrayMenu(isDev: boolean = false, devServerUrl?: string): void {
  if (!trayInstance) return;

  const showApp = () => {
    const mainWin = getMainWindow();
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.show();
      mainWin.focus();
    }
  };

  const activeVariants = getActiveWidgetVariants();
  const widgetOptions: { id: WidgetVariant; name: string }[] = [
    { id: 'tasks-heatmap', name: 'Task Activity Matrix' },
    { id: 'todo', name: "Today's Daily Checklist" },
    { id: 'leetcode', name: 'LeetCode Activity' },
    { id: 'leetcode-streak', name: 'LeetCode Daily Streak' },
    { id: 'coding-platforms', name: 'Coding Platforms Hub' },
    { id: 'routine-progress', name: 'Routine & Streak Meter' },
    { id: 'mini-pill', name: 'Minimalist Compact Pill' }
  ];

  const widgetSubmenu = widgetOptions.map((opt) => ({
    label: opt.name,
    type: 'checkbox' as const,
    checked: activeVariants.includes(opt.id),
    click: () => {
      toggleWidgetWindow(opt.id, isDev, devServerUrl);
      setTimeout(() => refreshTrayMenu(isDev, devServerUrl), 150);
    }
  }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open RemindGo',
      click: showApp
    },
    {
      label: 'Desktop Widgets',
      submenu: [
        ...widgetSubmenu,
        { type: 'separator' },
        {
          label: 'Launch All 7 Widgets',
          click: () => {
            launchAllPreferredWidgets(isDev, devServerUrl);
            setTimeout(() => refreshTrayMenu(isDev, devServerUrl), 150);
          }
        },
        {
          label: 'Close All Widgets',
          click: () => {
            closeAllWidgetWindows();
            setTimeout(() => refreshTrayMenu(isDev, devServerUrl), 150);
          }
        }
      ]
    },
    {
      label: 'Add Task...',
      click: () => {
        showApp();
        const mainWin = getMainWindow();
        mainWin?.webContents.send('open-add-task');
      }
    },
    { type: 'separator' },
    {
      label: 'Exit RemindGo',
      click: () => {
        setQuitting(true);
        app.quit();
      }
    }
  ]);

  trayInstance.setContextMenu(contextMenu);
}

export function setupTray(isDev: boolean, devServerUrl?: string): Tray {
  if (trayInstance) return trayInstance;

  const icon = getTrayIcon();
  trayInstance = new Tray(icon);
  trayInstance.setToolTip('RemindGo - Offline Task Reminder');

  refreshTrayMenu(isDev, devServerUrl);

  const showApp = () => {
    const mainWin = getMainWindow();
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.show();
      mainWin.focus();
    }
  };

  trayInstance.on('click', () => {
    showApp();
  });

  trayInstance.on('double-click', () => {
    showApp();
  });

  return trayInstance;
}

export function destroyTray(): void {
  if (trayInstance) {
    trayInstance.destroy();
    trayInstance = null;
  }
}
