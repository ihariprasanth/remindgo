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
  private notified8pmDates: Set<string> = new Set<string>();
  private notified10pmDates: Set<string> = new Set<string>();

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
      dbInstance.ensureDailyDeveloperTasks();

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

      // Current IST Date & Time
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const istNowObj = new Date(now + istOffsetMs);
      const istDateStr = istNowObj.toISOString().slice(0, 10);
      const istHour = istNowObj.getUTCHours();
      const istMinute = istNowObj.getUTCMinutes();

      // Ensure today's core developer routine tasks are present in DB
      dbInstance.ensureDailyDeveloperTasks(istDateStr);

      // Check standard scheduled tasks
      const dueTasks: Task[] = [];
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
          dueTasks.push(task);
        }
      }

      if (dueTasks.length === 1) {
        this.triggerAlarm(dueTasks[0]);
      } else if (dueTasks.length > 1) {
        this.triggerConsolidatedAlarm(dueTasks);
      }

      // 1. Daily 8:00 PM IST Reminder: "Complete Today Tasks"
      if ((istHour === 20 || (istHour > 20 && istHour < 22)) && !this.notified8pmDates.has(istDateStr)) {
        const todayPending = allTasks.filter((t) => t.date === istDateStr && t.status !== 'completed');
        if (todayPending.length > 0) {
          this.notified8pmDates.add(istDateStr);
          const taskSummary = todayPending.slice(0, 3).map((t) => t.title).join(', ');
          const reminderTask: Task = {
            id: `daily-reminder-8pm-${istDateStr}`,
            title: 'Complete Today Tasks',
            description: `${todayPending.length} task${todayPending.length > 1 ? 's' : ''} remaining: ${taskSummary}${todayPending.length > 3 ? '...' : ''}. Finish them now to protect your daily streak!`,
            category: 'Daily Routine',
            date: istDateStr,
            time: '20:00',
            repeat: 'none',
            status: 'pending',
            priority: 'high',
            created_at: new Date().toISOString()
          };
          console.log(`[AlarmScheduler] 8:00 PM IST triggered: "Complete Today Tasks" (${todayPending.length} tasks remaining)`);
          this.triggerAlarm(reminderTask);
        }
      }

      // 2. Daily 10:00 PM IST Warning: Incomplete Tasks Alert
      if (istHour >= 22 && !this.notified10pmDates.has(istDateStr)) {
        const todayPending = allTasks.filter((t) => t.date === istDateStr && t.status !== 'completed');
        if (todayPending.length > 0) {
          this.notified10pmDates.add(istDateStr);
          const warningTask: Task = {
            id: `daily-warning-10pm-${istDateStr}`,
            title: 'Warning: Incomplete Tasks Pending!',
            description: `You have ${todayPending.length} incomplete task(s) remaining for today! Complete them before midnight (12:00 AM) to maintain your daily streak.`,
            category: 'Streak Warning',
            date: istDateStr,
            time: '22:00',
            repeat: 'none',
            status: 'pending',
            priority: 'high',
            created_at: new Date().toISOString()
          };
          console.log(`[AlarmScheduler] 10:00 PM IST Warning triggered: ${todayPending.length} incomplete tasks remaining`);
          this.triggerAlarm(warningTask);
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

  private triggerConsolidatedAlarm(tasks: Task[]): void {
    console.log(`[AlarmScheduler] Triggering consolidated alarm for ${tasks.length} tasks scheduled for ${tasks[0].time}`);

    const nowIso = new Date().toISOString();
    for (const t of tasks) {
      dbInstance.markTaskNotified(t.id, nowIso);
      t.last_notified_at = nowIso;
    }

    const taskTitles = tasks.map((t, idx) => `${idx + 1}. ${t.title}`).join('\n');
    const batchId = `batch-${tasks.map((t) => t.id).join('__')}`;

    const consolidatedTask: Task = {
      id: batchId,
      title: `${tasks.length} Tasks Scheduled for ${tasks[0].time}`,
      description: taskTitles,
      category: 'Multiple Tasks Due',
      date: tasks[0].date,
      time: tasks[0].time,
      repeat: 'none',
      status: 'pending',
      priority: 'high',
      created_at: nowIso
    };

    // 1. Popup the prominent always-on-top alarm window once
    const alarmWin = createOrShowAlarmWindow(consolidatedTask, this.isDev, this.devServerUrl);

    // 2. Show native Windows Notification once
    if (Notification.isSupported()) {
      try {
        const notif = new Notification({
          title: `RemindGo: ${tasks.length} Tasks Scheduled`,
          body: tasks.slice(0, 3).map((t) => t.title).join(', ') + (tasks.length > 3 ? '...' : ''),
          urgency: 'critical',
          silent: true
        });
        notif.on('click', () => {
          createOrShowAlarmWindow(consolidatedTask, this.isDev, this.devServerUrl);
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
        mainWin.webContents.send('alarm-triggered', consolidatedTask);
      }
    }
  }
}
