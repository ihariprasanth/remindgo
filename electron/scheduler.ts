import { Notification, powerMonitor } from 'electron';
import { dbInstance } from './db/database';
import { createOrShowAlarmWindow } from './windows/alarmWindow';
import { getMainWindow } from './windows/mainWindow';
import { Task } from '../src/types';

export class AlarmScheduler {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number = 10000; // Check every 10 seconds for high precision
  private isDev: boolean;
  private devServerUrl?: string;

  constructor(isDev: boolean, devServerUrl?: string) {
    this.isDev = isDev;
    this.devServerUrl = devServerUrl;
  }

  public start(): void {
    console.log('[AlarmScheduler] Starting scheduler...');
    // Initial check on startup
    this.checkDueTasks();

    this.timer = setInterval(() => {
      this.checkDueTasks();
    }, this.intervalMs);

    // Check missed alarms immediately when the system wakes up from sleep or screen is unlocked
    powerMonitor.on('resume', () => {
      console.log('[AlarmScheduler] System resumed from sleep. Checking missed alarms...');
      this.checkDueTasks();
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
          // Parse local date + time
          const [year, month, day] = task.date.split('-').map(Number);
          const [hour, minute] = task.time.split(':').map(Number);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hour) && !isNaN(minute)) {
            const scheduledDate = new Date(year, month - 1, day, hour, minute, 0, 0);
            const scheduledTime = scheduledDate.getTime();

            if (scheduledTime <= now) {
              // Check if we already notified for this scheduled occurrence
              if (!task.last_notified_at) {
                isDue = true;
              } else {
                const lastNotifiedTime = new Date(task.last_notified_at).getTime();
                // If last notified before the scheduled time, it hasn't fired for this occurrence yet
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
    createOrShowAlarmWindow(task, this.isDev, this.devServerUrl);

    // 2. Also show native Windows Notification
    if (Notification.isSupported()) {
      try {
        const notif = new Notification({
          title: `TaskPulse: ${task.title}`,
          body: task.description ? `${task.description} - Due: ${task.time}` : `Scheduled at ${task.time}`,
          urgency: 'critical',
          silent: true // The custom alarm popup handles looping sound
        });
        notif.on('click', () => {
          createOrShowAlarmWindow(task, this.isDev, this.devServerUrl);
        });
        notif.show();
      } catch (notifErr) {
        console.warn('[AlarmScheduler] Native notification error:', notifErr);
      }
    }

    // 3. Inform main window if open
    const mainWin = getMainWindow();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('alarm-triggered', task);
    }
  }
}
