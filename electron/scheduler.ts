import { Notification, powerMonitor } from 'electron';
import { dbInstance } from './db/database';
import { createOrShowAlarmWindow } from './windows/alarmWindow';
import { getMainWindow } from './windows/mainWindow';
import { getWidgetWindow } from './windows/widgetWindow';
import { Task } from '../src/types';

export class AlarmScheduler {
  private timer: NodeJS.Timeout | null = null;
  private midnightTimer: NodeJS.Timeout | null = null;
  private intervalMs: number = 10000; // Check every 10 seconds for high precision
  private isDev: boolean;
  private devServerUrl?: string;

  constructor(isDev: boolean, devServerUrl?: string) {
    this.isDev = isDev;
    this.devServerUrl = devServerUrl;
  }

  public start(): void {
    console.log('[AlarmScheduler] Starting scheduler with IST (+5:30) precision...');
    // Initial check on startup
    this.checkDueTasks();

    this.timer = setInterval(() => {
      this.checkDueTasks();
    }, this.intervalMs);

    // Schedule exact 12:00 AM IST midnight reset
    this.scheduleMidnightResetIST();

    // Check missed alarms immediately when system wakes up from sleep or screen is unlocked
    powerMonitor.on('resume', () => {
      console.log('[AlarmScheduler] System resumed from sleep. Checking missed alarms...');
      this.checkDueTasks();
      this.scheduleMidnightResetIST();
    });

    powerMonitor.on('unlock-screen', () => {
      console.log('[AlarmScheduler] Screen unlocked. Checking alarms...');
      this.checkDueTasks();
    });
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.midnightTimer) {
      clearTimeout(this.midnightTimer);
      this.midnightTimer = null;
    }
  }

  /**
   * Schedules a timer to fire at the exact 12:00:00 AM IST midnight mark,
   * broadcasting refresh signals to both main window and desktop widget.
   */
  private scheduleMidnightResetIST(): void {
    if (this.midnightTimer) {
      clearTimeout(this.midnightTimer);
      this.midnightTimer = null;
    }

    const now = Date.now();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const elapsedTodayInIST = (now + istOffsetMs) % 86400000;
    const delay = 86400000 - elapsedTodayInIST + 250;

    console.log(`[AlarmScheduler] Next 12:00 AM IST midnight reset in ${Math.round(delay / 1000)}s`);

    this.midnightTimer = setTimeout(() => {
      console.log('[AlarmScheduler] 12:00 AM IST hit! Automatically tracking new day.');
      const mainWin = getMainWindow();
      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.webContents.send('midnight-reset');
        mainWin.webContents.send('tasks-changed');
      }

      const widgetWin = getWidgetWindow();
      if (widgetWin && !widgetWin.isDestroyed()) {
        widgetWin.webContents.send('midnight-reset');
        widgetWin.webContents.send('tasks-changed');
      }

      this.checkDueTasks();
      this.scheduleMidnightResetIST();
    }, delay);
  }

  public checkDueTasks(): void {
    try {
      const allTasks = dbInstance.getAllTasks();
      const now = Date.now();

      for (const task of allTasks) {
        if (task.status === 'completed') continue;

        let isDue = false;

        if (task.status === 'snoozed' && task.snoozed_until) {
          const snoozeTime = new Date(task.snoozed_until).getTime();
          if (snoozeTime <= now) {
            isDue = true;
          }
        } else if (task.status === 'pending') {
          // Parse date + time strictly in Indian Standard Time (IST, UTC+05:30)
          const [year, month, day] = task.date.split('-').map(Number);
          const [hour, minute] = task.time.split(':').map(Number);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hour) && !isNaN(minute)) {
            // Convert to exact UTC milliseconds based on UTC+05:30
            const scheduledTime = Date.UTC(year, month - 1, day, hour, minute) - (5.5 * 60 * 60 * 1000);

            if (scheduledTime <= now) {
              // Check if we already notified for this scheduled occurrence
              if (!task.last_notified_at) {
                isDue = true;
              } else {
                const lastNotifiedTime = new Date(task.last_notified_at).getTime();
                if (lastNotifiedTime < scheduledTime) {
                  isDue = true;
                }
              }
            }
          }
        }

        if (isDue) {
          this.triggerAlarm(task);
        }
      }
    } catch (err) {
      console.error('[AlarmScheduler] Error checking due tasks:', err);
    }
  }

  private triggerAlarm(task: Task): void {
    console.log(`[AlarmScheduler] Triggering alarm for task: "${task.title}" (ID: ${task.id})`);

    // Record notification timestamp in SQLite DB
    const nowIso = new Date().toISOString();
    dbInstance.markTaskNotified(task.id, nowIso);
    task.last_notified_at = nowIso;

    // 1. Popup the prominent always-on-top alarm window
    const alarmWin = createOrShowAlarmWindow(task, this.isDev, this.devServerUrl);

    // 2. Also show native Windows Notification
    if (Notification.isSupported()) {
      try {
        const notif = new Notification({
          title: `RemindGo: ${task.title}`,
          body: task.description ? `${task.description} - Due: ${task.time}` : `Scheduled at ${task.time}`,
          urgency: 'critical',
          silent: true // Custom alarm popup handles looping sound
        });
        notif.on('click', () => {
          createOrShowAlarmWindow(task, this.isDev, this.devServerUrl);
        });
        notif.show();
      } catch (notifErr) {
        console.warn('[AlarmScheduler] Native notification error:', notifErr);
      }
    }

    // 3. Inform main window of task updates; only trigger in-app overlay if dedicated alarm window is unavailable
    const mainWin = getMainWindow();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('tasks-changed');
      if (!alarmWin) {
        mainWin.webContents.send('alarm-triggered', task);
      }
    }
  }
}
