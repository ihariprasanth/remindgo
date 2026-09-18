/**
 * Indian Standard Time (IST, UTC+05:30) Utility
 * Ensures all task scheduling, dates, and midnight resets adhere strictly to IST.
 */

// IST offset in milliseconds: +5 hours and 30 minutes
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns current date string in IST format: 'YYYY-MM-DD'
 */
export function getISTDate(date: Date = new Date()): string {
  const istTime = new Date(date.getTime() + IST_OFFSET_MS);
  return istTime.toISOString().slice(0, 10);
}

/**
 * Returns current time string in IST 24-hour format: 'HH:mm'
 */
export function getISTTime(date: Date = new Date()): string {
  const istTime = new Date(date.getTime() + IST_OFFSET_MS);
  return istTime.toISOString().slice(11, 16);
}

/**
 * Returns exact milliseconds remaining until the upcoming 12:00:00 AM midnight in IST.
 * Adds a 250ms buffer to guarantee the timeout executes inside the new day.
 */
export function getMillisUntilMidnightIST(): number {
  const now = Date.now();
  const elapsedTodayInIST = (now + IST_OFFSET_MS) % 86400000;
  const remaining = 86400000 - elapsedTodayInIST;
  return remaining + 250;
}

/**
 * Returns whether a given YYYY-MM-DD date matches today in IST.
 */
export function isISTToday(dateStr: string): boolean {
  return dateStr === getISTDate();
}
