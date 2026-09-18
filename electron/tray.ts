import { Tray, Menu, nativeImage, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { getMainWindow, setQuitting } from './windows/mainWindow';

let trayInstance: Tray | null = null;

function getTrayIcon(): nativeImage {
  // Check assets folder
  const iconPath = path.resolve(__dirname, '../assets/tray-icon.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }

  // Fallback: create a crisp 16x16 green pulse icon programmatically
  // 16x16 PNG buffer with GitHub green #39d353 circle
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);
  const cx = 7.5, cy = 7.5, radius = 6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= radius) {
        // #39d353: R=57, G=211, B=83, A=255
        buffer[idx] = 57;
        buffer[idx + 1] = 211;
        buffer[idx + 2] = 83;
        buffer[idx + 3] = 255;
      } else {
        buffer[idx + 3] = 0; // transparent
      }
    }
  }
  return nativeImage.createFromBitmap(buffer, { width: size, height: size });
}

export function setupTray(isDev: boolean, devServerUrl?: string): Tray {
  if (trayInstance) return trayInstance;

  const icon = getTrayIcon();
  trayInstance = new Tray(icon);
  trayInstance.setToolTip('TaskPulse - Offline Task Reminder');

  const showApp = () => {
    const mainWin = getMainWindow();
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.show();
      mainWin.focus();
    }
  };

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open TaskPulse',
      click: showApp
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
      label: 'Exit TaskPulse',
      click: () => {
        setQuitting(true);
        app.quit();
      }
    }
  ]);

  trayInstance.setContextMenu(contextMenu);

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
