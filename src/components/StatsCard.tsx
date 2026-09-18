import React, { useMemo } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import { Flame, Trophy, CheckCircle2, CalendarCheck } from 'lucide-react';
import { Task, DashboardStats } from '../types';

interface StatsCardProps {
  tasks: Task[];
}

export const StatsCard: React.FC<StatsCardProps> = ({ tasks }) => {
  const stats: DashboardStats = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    let completedToday = 0;
    let pendingCount = 0;
    let totalCompleted = 0;

    const completionDates = new Set<string>();

    for (const task of tasks) {
      if (task.status === 'completed') {
        totalCompleted++;
        if (task.completed_at) {
          try {
            const dateStr = format(parseISO(task.completed_at), 'yyyy-MM-dd');
            completionDates.add(dateStr);
            if (dateStr === todayStr) {
              completedToday++;
            }
          } catch {
            // ignore
          }
        }
      } else {
        pendingCount++;
      }
    }

    // Current streak
    let currentStreak = 0;
    let checkDate = today;

    if (completionDates.has(todayStr)) {
      currentStreak++;
      checkDate = subDays(today, 1);
      while (completionDates.has(format(checkDate, 'yyyy-MM-dd'))) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      }
    } else {
      checkDate = subDays(today, 1);
      while (completionDates.has(format(checkDate, 'yyyy-MM-dd'))) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      }
    }

    // Longest streak
    const sortedDates = Array.from(completionDates).sort();
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    for (const dStr of sortedDates) {
      const d = parseISO(dStr);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      prevDate = d;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    const totalTracked = totalCompleted + pendingCount;
    const completionRate = totalTracked > 0 ? Math.round((totalCompleted / totalTracked) * 100) : 0;

    return {
      currentStreak,
      longestStreak,
      completedToday,
      totalCompleted,
      pendingCount,
      completionRate
    };
  }, [tasks]);

  const cards = [
    {
      title: 'Current Streak',
      value: `${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'}`,
      subtitle: stats.currentStreak > 0 ? 'Active continuous streak' : 'Complete a task today',
      icon: Flame,
      color: '#0a84ff',
      bgGradient: 'from-[#0a84ff]/20 to-[#0a84ff]/5',
      glow: 'shadow-[0_0_20px_rgba(10,132,255,0.25)]'
    },
    {
      title: 'Best Record',
      value: `${stats.longestStreak} day${stats.longestStreak === 1 ? '' : 's'}`,
      subtitle: 'All-time longest',
      icon: Trophy,
      color: '#f59e0b',
      bgGradient: 'from-[#f59e0b]/20 to-[#f59e0b]/5',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]'
    },
    {
      title: 'Completed Today',
      value: `${stats.completedToday}`,
      subtitle: `${stats.pendingCount} still pending`,
      icon: CheckCircle2,
      color: '#58a6ff',
      bgGradient: 'from-[#58a6ff]/20 to-[#58a6ff]/5',
      glow: 'shadow-[0_0_20px_rgba(88,166,255,0.25)]'
    },
    {
      title: 'All-Time Tasks',
      value: `${stats.totalCompleted}`,
      subtitle: `${stats.completionRate}% completion rate`,
      icon: CalendarCheck,
      color: '#bc8cff',
      bgGradient: 'from-[#bc8cff]/20 to-[#bc8cff]/5',
      glow: 'shadow-[0_0_20px_rgba(188,140,255,0.25)]'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`liquid-glass-card rounded-2xl p-4 flex flex-col justify-between ${c.glow}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-neutral-600 dark:text-white/50">{c.title}</span>
              <div
                className={`w-8 h-8 rounded-xl bg-gradient-to-br ${c.bgGradient} flex items-center justify-center border border-neutral-200 dark:border-white/10`}
                style={{ color: c.color }}
              >
                <Icon size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">
                {c.value}
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-white/40 mt-0.5">{c.subtitle}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
