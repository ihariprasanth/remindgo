import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Pin, Check, Plus, ExternalLink, X, Sun, Moon, 
  Flame, Calendar, Code2, CheckCircle2, Clock
} from 'lucide-react';
import { format, subWeeks, startOfWeek, addDays, parseISO } from 'date-fns';
import { Task, LeetCodeData, TaskPriority } from '../types';
import { api } from '../services/api';
import logoSquircle from '../assets/logo-squircle.png';

interface DesktopWidgetProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const DesktopWidget: React.FC<DesktopWidgetProps> = ({ theme, onToggleTheme }) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'heatmap' | 'leetcode'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leetCodeData, setLeetCodeData] = useState<LeetCodeData | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('medium');

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    try {
      const [fetchedTasks, storedLeetCode, pinned] = await Promise.all([
        api.getTasks(),
        api.getStoredLeetCodeData(),
        api.isWidgetPinned()
      ]);
      setTasks(fetchedTasks);
      setIsPinned(pinned);
      if (storedLeetCode) {
        setLeetCodeData(storedLeetCode);
      }
    } catch (err) {
      console.error('[Widget] Failed to load data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen for real-time task mutations from main app
    let cleanup: (() => void) | undefined;
    if (api.onTasksChanged) {
      cleanup = api.onTasksChanged(() => {
        loadData();
      });
    }

    // Polling fallback every 6 seconds to keep widget live
    const interval = setInterval(loadData, 6000);

    return () => {
      cleanup?.();
      clearInterval(interval);
    };
  }, [loadData]);

  const handleTogglePin = async () => {
    const next = !isPinned;
    setIsPinned(next);
    await api.setWidgetAlwaysOnTop(next);
  };

  const handleOpenFullApp = () => {
    api.openMainWindow();
  };

  const handleClose = () => {
    api.closeWindow();
  };

  const handleToggleTask = async (id: string) => {
    await api.toggleTaskStatus(id);
    await loadData();
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    const timeStr = format(now, 'HH:mm');

    await api.createTask({
      title: quickTitle.trim(),
      category: 'General',
      date: todayStr,
      time: timeStr,
      priority: quickPriority,
      repeat: 'none'
    });

    setQuickTitle('');
    await loadData();
  };

  // Today's tasks
  const todayTasks = useMemo(() => {
    return tasks
      .filter((t) => t.date === todayStr)
      .sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        return a.time.localeCompare(b.time);
      });
  }, [tasks, todayStr]);

  const todayCompletedCount = todayTasks.filter((t) => t.status === 'completed').length;

  // Heatmap Data (compact 20-week view for widget)
  const taskMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      if (t.status === 'completed' && t.completed_at) {
        try {
          const dStr = format(parseISO(t.completed_at), 'yyyy-MM-dd');
          map.set(dStr, (map.get(dStr) || 0) + 1);
        } catch {
          // ignore
        }
      }
    }
    return map;
  }, [tasks]);

  const leetCodeMap = useMemo(() => {
    const map = new Map<string, number>();
    if (leetCodeData?.submissionCalendar) {
      for (const [tsStr, count] of Object.entries(leetCodeData.submissionCalendar)) {
        try {
          const ts = parseInt(tsStr, 10);
          if (!isNaN(ts)) {
            const dStr = format(new Date(ts * 1000), 'yyyy-MM-dd');
            map.set(dStr, (map.get(dStr) || 0) + count);
          }
        } catch {
          // ignore
        }
      }
    }
    return map;
  }, [leetCodeData]);

  const { miniWeeks, totalRecentCount, currentStreak } = useMemo(() => {
    const now = new Date();
    const past = subWeeks(now, 20); // 20 weeks fit nicely in widget
    const startDate = startOfWeek(past, { weekStartsOn: 0 });

    const weeksGrid: { dateStr: string; count: number; level: number }[][] = [];
    let iter = startDate;
    let total = 0;

    for (let w = 0; w < 21; w++) {
      const days: { dateStr: string; count: number; level: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const dStr = format(iter, 'yyyy-MM-dd');
        const count = (taskMap.get(dStr) || 0) + (leetCodeMap.get(dStr) || 0);
        total += count;

        let level = 0;
        if (count === 1) level = 1;
        else if (count >= 2 && count <= 3) level = 2;
        else if (count >= 4 && count <= 6) level = 3;
        else if (count >= 7) level = 4;

        days.push({ dateStr: dStr, count, level });
        iter = addDays(iter, 1);
      }
      weeksGrid.push(days);
      if (iter > now) break;
    }

    // Compute streak
    let streak = 0;
    let check = now;
    const hasActivity = (dateObj: Date) => {
      const s = format(dateObj, 'yyyy-MM-dd');
      return (taskMap.get(s) || 0) + (leetCodeMap.get(s) || 0) > 0;
    };

    if (hasActivity(check)) {
      streak++;
      check = addDays(check, -1);
      while (hasActivity(check)) {
        streak++;
        check = addDays(check, -1);
      }
    } else {
      check = addDays(check, -1);
      while (hasActivity(check)) {
        streak++;
        check = addDays(check, -1);
      }
    }

    return { miniWeeks: weeksGrid, totalRecentCount: total, currentStreak: streak };
  }, [taskMap, leetCodeMap]);

  const getCellColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-[#9be9a8] dark:bg-[#0e4429] border-[#7bc96f]/60 dark:border-[#006d32]/60';
      case 2:
        return 'bg-[#40c463] dark:bg-[#006d32] border-[#30a14e]/60 dark:border-[#26a641]/60';
      case 3:
        return 'bg-[#30a14e] dark:bg-[#26a641] border-[#216e39]/70 dark:border-[#39d353]/60';
      case 4:
        return 'bg-[#216e39] dark:bg-[#39d353] border-[#19582d] dark:border-[#56e36d] shadow-[0_0_6px_rgba(57,211,83,0.6)]';
      case 0:
      default:
        return 'bg-neutral-200/80 dark:bg-white/[0.05] border-neutral-300 dark:border-white/[0.06]';
    }
  };

  return (
    <div className="w-full h-full flex flex-col liquid-glass-base border border-[var(--border-glass)] rounded-2xl shadow-2xl select-none overflow-hidden transition-colors">
      {/* Widget Header & Window Drag Bar */}
      <div className="h-11 px-3 border-b border-[var(--border-glass)] flex items-center justify-between titlebar-drag bg-white/80 dark:bg-black/40 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-2 no-drag">
          <div className="w-5 h-5 rounded-[6px] overflow-hidden shadow-sm border border-neutral-300 dark:border-white/20 bg-white p-0.5">
            <img src={logoSquircle} alt="RemindGo" className="w-full h-full object-cover rounded-[4px]" />
          </div>
          <span className="font-bold text-xs text-neutral-900 dark:text-white tracking-tight">
            RemindGo
          </span>
          <span className="text-[10px] text-neutral-500 dark:text-white/40 font-mono">
            Widget
          </span>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1 no-drag">
          {/* Always-on-top Pin */}
          <button
            onClick={handleTogglePin}
            title={isPinned ? 'Unpin from Top' : 'Pin Always on Top'}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isPinned
                ? 'bg-[#0a84ff] text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/10'
            }`}
          >
            <Pin size={12} className={isPinned ? 'rotate-45' : ''} />
          </button>

          {/* Open Main App */}
          <button
            onClick={handleOpenFullApp}
            title="Open RemindGo Full App"
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <ExternalLink size={12} />
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleTheme}
            title="Toggle Light / Dark Mode"
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun size={12} className="text-[#f59e0b]" /> : <Moon size={12} className="text-[#0a84ff]" />}
          </button>

          {/* Close Widget */}
          <button
            onClick={handleClose}
            title="Close Widget"
            className="p-1.5 text-neutral-500 hover:text-white hover:bg-[#e81123] rounded-lg transition-colors cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Widget Tabs Capsule */}
      <div className="px-3 pt-2.5 pb-1 flex-shrink-0">
        <div className="flex items-center justify-between p-1 rounded-xl bg-neutral-200/70 dark:bg-black/40 border border-[var(--border-glass)] text-xs">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-white dark:bg-white/15 text-neutral-900 dark:text-white shadow-sm font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-white/50 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 size={12} className="text-[#0a84ff]" />
            <span>To-Do</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#0a84ff]/15 text-[#0a84ff]">
              {todayTasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('heatmap')}
            className={`flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'heatmap'
                ? 'bg-white dark:bg-white/15 text-neutral-900 dark:text-white shadow-sm font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-white/50 dark:hover:text-white'
            }`}
          >
            <Calendar size={12} className="text-[#22c55e]" />
            <span>Heatmap</span>
          </button>

          <button
            onClick={() => setActiveTab('leetcode')}
            className={`flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'leetcode'
                ? 'bg-white dark:bg-white/15 text-neutral-900 dark:text-white shadow-sm font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-white/50 dark:hover:text-white'
            }`}
          >
            <Code2 size={12} className="text-[#f59e0b]" />
            <span>LeetCode</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5">
        {/* TAB 1: TO-DO LIST */}
        {activeTab === 'tasks' && (
          <div className="flex flex-col h-full justify-between">
            {/* Task list container */}
            <div className="space-y-1.5 flex-1 overflow-y-auto pr-0.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-white/50 mb-2 px-1">
                <span>Today's Tasks</span>
                <span>{todayCompletedCount}/{todayTasks.length} done</span>
              </div>

              {todayTasks.length === 0 ? (
                <div className="text-center py-10 px-3 border border-dashed border-neutral-300 dark:border-white/10 rounded-xl">
                  <div className="text-xs font-semibold text-neutral-700 dark:text-white/80">No tasks for today!</div>
                  <div className="text-[11px] text-neutral-500 dark:text-white/40 mt-1">
                    Add a quick reminder below to get started.
                  </div>
                </div>
              ) : (
                todayTasks.map((t) => {
                  const isDone = t.status === 'completed';
                  return (
                    <div
                      key={t.id}
                      className={`p-2 rounded-xl border transition-all flex items-center gap-2.5 ${
                        isDone
                          ? 'bg-black/5 dark:bg-black/20 border-neutral-200 dark:border-white/[0.04] opacity-60'
                          : 'bg-white/80 dark:bg-black/40 border-neutral-200 dark:border-white/10 hover:border-[#0a84ff]/40 shadow-sm'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleTask(t.id)}
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                          isDone
                            ? 'bg-[#0a84ff] border-[#38bdf8] text-white'
                            : 'border-neutral-300 dark:border-white/30 hover:border-[#0a84ff]'
                        }`}
                      >
                        {isDone && <Check size={10} strokeWidth={3} />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs font-medium truncate ${
                            isDone ? 'line-through text-neutral-400 dark:text-white/40' : 'text-neutral-900 dark:text-white'
                          }`}
                        >
                          {t.title}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 font-mono text-[10px] text-neutral-500 dark:text-white/50 flex-shrink-0">
                        <Clock size={10} className="text-[#0a84ff]" />
                        <span>{t.time}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Add Bar */}
            <form onSubmit={handleQuickAdd} className="pt-2 border-t border-[var(--border-glass)] mt-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Quick task for today..."
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/15 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-white/40 focus:outline-none focus:border-[#0a84ff]"
                />

                <select
                  value={quickPriority}
                  onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
                  className="text-[11px] px-2 py-1.5 rounded-xl bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/15 text-neutral-700 dark:text-white focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Med</option>
                  <option value="high">High</option>
                </select>

                <button
                  type="submit"
                  title="Add Task"
                  className="p-1.5 bg-[#0a84ff] hover:bg-[#0066d6] text-white rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: CLASSICAL GREEN HEATMAP */}
        {activeTab === 'heatmap' && (
          <div className="space-y-3">
            {/* Metric Banner */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-black/30 border border-[var(--border-glass)]">
                <div className="text-[10px] text-neutral-500 dark:text-white/50 flex items-center gap-1">
                  <Flame size={12} className="text-[#f43f5e]" /> Current Streak
                </div>
                <div className="text-lg font-bold font-mono text-neutral-900 dark:text-white mt-0.5">
                  {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-black/30 border border-[var(--border-glass)]">
                <div className="text-[10px] text-neutral-500 dark:text-white/50 flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-[#22c55e]" /> Contributions
                </div>
                <div className="text-lg font-bold font-mono text-neutral-900 dark:text-white mt-0.5">
                  {totalRecentCount}
                </div>
              </div>
            </div>

            {/* Classical GitHub Green Heatmap Grid */}
            <div className="p-3 rounded-xl bg-neutral-100 dark:bg-black/30 border border-[var(--border-glass)]">
              <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-white/40 mb-2 font-mono">
                <span>Recent Activity</span>
                <span>Classical Green Grid</span>
              </div>

              <div className="overflow-x-auto pb-1">
                <div className="flex gap-[3px] justify-center">
                  {miniWeeks.map((wk, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[3px]">
                      {wk.map((day, dIdx) => (
                        <div
                          key={dIdx}
                          title={`${day.dateStr}: ${day.count} items`}
                          className={`w-[11px] h-[11px] rounded-[2px] border transition-all ${getCellColor(day.level)}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-white/40 pt-2 border-t border-[var(--border-glass)] mt-2">
                <span>Less</span>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-neutral-200 dark:bg-white/[0.05] border border-neutral-300 dark:border-white/[0.08]" />
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#9be9a8] dark:bg-[#0e4429] border border-[#7bc96f] dark:border-[#006d32]" />
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#40c463] dark:bg-[#006d32] border border-[#30a14e] dark:border-[#26a641]" />
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#30a14e] dark:bg-[#26a641] border border-[#216e39] dark:border-[#39d353]" />
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#216e39] dark:bg-[#39d353] border border-[#19582d] dark:border-[#56e36d]" />
                </div>
                <span>More</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LEETCODE TRACKER */}
        {activeTab === 'leetcode' && (
          <div className="space-y-2.5">
            {leetCodeData ? (
              <>
                {/* User Stats Card */}
                <div className="p-3 rounded-xl bg-neutral-100 dark:bg-black/30 border border-[var(--border-glass)] flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f59e0b] to-[#fbbf24] p-0.5 flex-shrink-0">
                      {leetCodeData.userAvatar ? (
                        <img src={leetCodeData.userAvatar} alt="avatar" className="w-full h-full object-cover rounded-[10px]" />
                      ) : (
                        <div className="w-full h-full bg-black/40 rounded-[10px] flex items-center justify-center text-xs font-bold text-[#f59e0b]">
                          {leetCodeData.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                        @{leetCodeData.username}
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-white/50 font-mono">
                        Rank #{leetCodeData.ranking?.toLocaleString() || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold font-mono text-[#f59e0b]">
                      {leetCodeData.totalSolved}
                    </div>
                    <div className="text-[10px] text-neutral-500 dark:text-white/40">Solved</div>
                  </div>
                </div>

                {/* Solved Breakdown Pills */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="p-2 rounded-xl bg-[#39d353]/10 border border-[#39d353]/30">
                    <div className="text-[10px] font-semibold text-[#39d353]">Easy</div>
                    <div className="text-xs font-bold font-mono text-neutral-900 dark:text-white mt-0.5">
                      {leetCodeData.easySolved}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/30">
                    <div className="text-[10px] font-semibold text-[#f59e0b]">Med</div>
                    <div className="text-xs font-bold font-mono text-neutral-900 dark:text-white mt-0.5">
                      {leetCodeData.mediumSolved}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#f43f5e]/10 border border-[#f43f5e]/30">
                    <div className="text-[10px] font-semibold text-[#f43f5e]">Hard</div>
                    <div className="text-xs font-bold font-mono text-neutral-900 dark:text-white mt-0.5">
                      {leetCodeData.hardSolved}
                    </div>
                  </div>
                </div>

                {/* Today's Daily Challenge */}
                {leetCodeData.dailyChallenge && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-[#f59e0b]/15 to-transparent border border-[#f59e0b]/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-[#f59e0b] text-black px-1.5 py-0.2 rounded-full">
                        Daily Challenge
                      </span>
                      <span className="text-[10px] font-mono text-[#f59e0b]">
                        {leetCodeData.dailyChallenge.difficulty}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                      {leetCodeData.dailyChallenge.questionFrontendId}. {leetCodeData.dailyChallenge.title}
                    </div>

                    <div className="mt-2 flex justify-end">
                      <a
                        href={leetCodeData.dailyChallenge.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-[#0a84ff] hover:underline flex items-center gap-1"
                      >
                        Solve on LeetCode <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10 px-3 border border-dashed border-neutral-300 dark:border-white/10 rounded-xl">
                <div className="text-xs font-semibold text-neutral-700 dark:text-white/80">
                  No LeetCode Account Connected
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-white/40 mt-1 mb-3">
                  Connect your username in RemindGo Settings to track daily challenges here.
                </div>
                <button
                  onClick={handleOpenFullApp}
                  className="px-3 py-1.5 text-xs bg-[#0a84ff] text-white rounded-xl font-semibold cursor-pointer"
                >
                  Open Settings
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Shortcut to Full App */}
      <div className="p-2.5 border-t border-[var(--border-glass)] bg-white/50 dark:bg-black/40 flex items-center justify-between text-[11px] flex-shrink-0">
        <button
          onClick={handleOpenFullApp}
          className="text-[#0a84ff] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
        >
          <span>Open Full RemindGo App</span>
          <ExternalLink size={11} />
        </button>
        <span className="text-[10px] text-neutral-400 dark:text-white/40 font-mono">
          v2.5.1
        </span>
      </div>
    </div>
  );
};
