import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Check, Plus, ExternalLink, X, 
  Calendar, CheckSquare, Lock, Unlock
} from 'lucide-react';
import { format, subWeeks, startOfWeek, addDays, parseISO } from 'date-fns';
import { Task, LeetCodeData, TaskPriority } from '../types';
import { api } from '../services/api';
import { getISTDate, getMillisUntilMidnightIST } from '../utils/istTime';

interface DesktopWidgetProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const DesktopWidget: React.FC<DesktopWidgetProps> = ({ theme: _theme, onToggleTheme: _onToggleTheme }) => {
  const [mode, setMode] = useState<'heatmap' | 'tasks'>('heatmap');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leetCodeData, setLeetCodeData] = useState<LeetCodeData | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const quickPriority: TaskPriority = 'medium';
  const [hoveredDay, setHoveredDay] = useState<{ dateStr: string; count: number; x: number; y: number } | null>(null);

  // Widget Lock/Pin state - when locked, widget is strictly NOT draggable
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const saved = localStorage.getItem('remindgo_widget_locked');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleLock = () => {
    setIsLocked((prev) => {
      const next = !prev;
      localStorage.setItem('remindgo_widget_locked', String(next));
      return next;
    });
  };

  const todayStr = getISTDate();

  const loadData = useCallback(async () => {
    try {
      const [fetchedTasks, storedLeetCode] = await Promise.all([
        api.getTasks(),
        api.getStoredLeetCodeData()
      ]);
      setTasks(fetchedTasks || []);
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

    // Exact 12:00 AM IST Midnight Auto-Reset
    let midnightTimer: any;
    const scheduleMidnight = () => {
      const delay = getMillisUntilMidnightIST();
      midnightTimer = setTimeout(() => {
        console.log('[Widget] 12:00 AM IST hit - refreshing tasks');
        loadData();
        scheduleMidnight();
      }, delay);
    };
    scheduleMidnight();

    // Polling fallback every 8 seconds to keep widget live
    const interval = setInterval(loadData, 8000);

    return () => {
      cleanup?.();
      clearInterval(interval);
      if (midnightTimer) clearTimeout(midnightTimer);
    };
  }, [loadData]);

  // Switch mode and resize window dynamically
  const switchMode = async (nextMode: 'heatmap' | 'tasks') => {
    setMode(nextMode);
    if (api.resizeWidget) {
      if (nextMode === 'heatmap') {
        await api.resizeWidget(390, 185);
      } else {
        await api.resizeWidget(340, 340);
      }
    }
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

    await api.createTask({
      title: quickTitle.trim(),
      description: '',
      category: 'Work',
      date: todayStr,
      time: format(new Date(), 'HH:mm'),
      repeat: 'none',
      priority: quickPriority
    });

    setQuickTitle('');
    await loadData();
  };

  // Today's tasks for to-do mode
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.date === todayStr);
  }, [tasks, todayStr]);

  const completedTodayCount = useMemo(() => {
    return todayTasks.filter((t) => t.status === 'completed').length;
  }, [todayTasks]);

  // Build 20-week Heatmap Grid (140 days)
  const taskMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      if (t.status === 'completed' && t.completed_at) {
        const d = format(parseISO(t.completed_at), 'yyyy-MM-dd');
        map.set(d, (map.get(d) || 0) + 1);
      } else if (t.status === 'completed' && t.date) {
        map.set(t.date, (map.get(t.date) || 0) + 1);
      }
    }
    return map;
  }, [tasks]);

  const leetCodeMap = useMemo(() => {
    const map = new Map<string, number>();
    if (leetCodeData?.submissionCalendar) {
      for (const [timestampStr, count] of Object.entries(leetCodeData.submissionCalendar)) {
        const ts = parseInt(timestampStr, 10);
        if (!isNaN(ts)) {
          const d = format(new Date(ts * 1000), 'yyyy-MM-dd');
          map.set(d, (map.get(d) || 0) + count);
        }
      }
    }
    return map;
  }, [leetCodeData]);

  const { miniWeeks } = useMemo(() => {
    const now = new Date();
    const startDate = startOfWeek(subWeeks(now, 19), { weekStartsOn: 0 });

    const weeksGrid: { dateStr: string; count: number; level: number }[][] = [];
    let iter = startDate;

    for (let w = 0; w < 20; w++) {
      const days: { dateStr: string; count: number; level: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const dStr = format(iter, 'yyyy-MM-dd');
        const count = (taskMap.get(dStr) || 0) + (leetCodeMap.get(dStr) || 0);

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

    return { miniWeeks: weeksGrid };
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

  // =========================================================================
  // MODE 1: INDIVIDUAL CLASSICAL GREEN HEATMAP WIDGET (Matches User's Images)
  // =========================================================================
  if (mode === 'heatmap') {
    return (
      <div className="w-full h-full p-2 select-none">
        <div 
          className={`liquid-glass-card group relative p-3 rounded-2xl border border-[var(--border-glass)] shadow-2xl overflow-hidden transition-all ${
            isLocked ? 'select-none' : 'titlebar-drag cursor-move ring-1 ring-[#0a84ff]/50'
          }`}
          style={{ backdropFilter: 'blur(30px) saturate(180%)' }}
        >
          {/* Top Row: Title + Discreet Hover Controls */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-sub)] mb-2.5">
            <span className="font-semibold text-neutral-600 dark:text-white/70 tracking-tight">
              Recent Activity
            </span>

            {/* Hover Action Controls */}
            <div className="flex items-center gap-1.5 no-drag">
              {/* Lock / Unlock Toggle (Pinned to Desktop) */}
              <button
                onClick={toggleLock}
                title={isLocked ? "Pinned & Locked to Desktop (Non-draggable). Click to unlock." : "Unlocked (Draggable). Click to lock in place."}
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  isLocked 
                    ? 'text-neutral-400 dark:text-white/40 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/15' 
                    : 'text-[#f59e0b] bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30'
                }`}
              >
                {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
              </button>
              {/* Switch to Tasks Mode */}
              <button
                onClick={() => switchMode('tasks')}
                title="Switch to Today's Tasks Widget"
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-white/15 text-neutral-600 dark:text-white/70 transition-all cursor-pointer"
              >
                <CheckSquare size={11} />
              </button>

              {/* Open Main App */}
              <button
                onClick={handleOpenFullApp}
                title="Open RemindGo Full App"
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-white/15 text-neutral-600 dark:text-white/70 transition-all cursor-pointer"
              >
                <ExternalLink size={11} />
              </button>

              {/* Close Widget */}
              <button
                onClick={handleClose}
                title="Close Widget"
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500 hover:text-white text-neutral-600 dark:text-white/70 transition-all cursor-pointer"
              >
                <X size={11} />
              </button>

              <span className="text-[10px] text-neutral-400 dark:text-white/40 ml-1">
                Classical Green Grid
              </span>
            </div>
          </div>

          {/* 20-Week Classical GitHub Green Grid */}
          <div className="flex gap-[3px] justify-center no-drag pb-0.5">
            {miniWeeks.map((wk, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-[3px]">
                {wk.map((day, dIdx) => (
                  <div
                    key={dIdx}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredDay({
                        dateStr: day.dateStr,
                        count: day.count,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8
                      });
                    }}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`w-[11px] h-[11px] rounded-[2px] border transition-all cursor-pointer hover:scale-125 ${getCellColor(day.level)}`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend Bottom Row */}
          <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-white/40 pt-2 border-t border-[var(--border-glass)] mt-2 font-mono">
            <span>Less</span>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-neutral-200/80 dark:bg-white/[0.05] border border-neutral-300 dark:border-white/[0.08]" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#9be9a8] dark:bg-[#0e4429] border border-[#7bc96f]/60 dark:border-[#006d32]/60" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#40c463] dark:bg-[#006d32] border border-[#30a14e]/60 dark:border-[#26a641]/60" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#30a14e] dark:bg-[#26a641] border border-[#216e39]/70 dark:border-[#39d353]/60" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#216e39] dark:bg-[#39d353] border border-[#19582d] dark:border-[#56e36d]" />
            </div>
            <span>More</span>
          </div>

          {/* Floating Tooltip matching image */}
          {hoveredDay && (
            <div
              style={{ left: hoveredDay.x, top: hoveredDay.y }}
              className="fixed z-50 transform -translate-x-1/2 -translate-y-full pointer-events-none bg-neutral-900 text-white text-[10px] font-mono px-2 py-1 rounded-md shadow-xl border border-white/20 whitespace-nowrap"
            >
              {hoveredDay.dateStr}: {hoveredDay.count} items
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // MODE 2: TODAY'S TO-DO WIDGET (Compact Daily Checklist)
  // =========================================================================
  return (
    <div className="w-full h-full p-2 select-none">
      <div 
        className="liquid-glass-card h-full flex flex-col justify-between p-3.5 rounded-2xl border border-[var(--border-glass)] shadow-2xl overflow-hidden transition-all"
        style={{ backdropFilter: 'blur(30px) saturate(180%)' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-2.5 border-b border-[var(--border-glass)] flex-shrink-0 ${
          isLocked ? 'select-none' : 'titlebar-drag cursor-move ring-1 ring-[#0a84ff]/40 rounded-lg p-0.5'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-neutral-900 dark:text-white tracking-tight">
              Today's To-Do
            </span>
            <span className="text-[10px] font-mono bg-neutral-200 dark:bg-white/10 px-1.5 py-0.5 rounded-full text-neutral-700 dark:text-white/70">
              {completedTodayCount}/{todayTasks.length}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 no-drag">
            {/* Lock / Unlock Toggle */}
            <button
              onClick={toggleLock}
              title={isLocked ? "Pinned & Locked to Desktop (Non-draggable). Click to unlock." : "Unlocked (Draggable). Click to lock in place."}
              className={`p-1 rounded-md transition-all cursor-pointer ${
                isLocked 
                  ? 'text-neutral-400 dark:text-white/40 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/15' 
                  : 'text-[#f59e0b] bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30'
              }`}
            >
              {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
            </button>

            {/* Switch to Heatmap */}
            <button
              onClick={() => switchMode('heatmap')}
              title="Switch to Classical Green Heatmap Widget"
              className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-white/15 text-[#22c55e] transition-colors cursor-pointer"
            >
              <Calendar size={13} />
            </button>

            {/* Open Main App */}
            <button
              onClick={handleOpenFullApp}
              title="Open Full App"
              className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-white/15 text-neutral-600 dark:text-white/70 transition-colors cursor-pointer"
            >
              <ExternalLink size={13} />
            </button>

            {/* Close */}
            <button
              onClick={handleClose}
              title="Close Widget"
              className="p-1 rounded-md hover:bg-red-500 hover:text-white text-neutral-600 dark:text-white/70 transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Task List Items */}
        <div className="flex-1 overflow-y-auto py-2 space-y-1.5 pr-1 my-1">
          {todayTasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-3 text-neutral-400 dark:text-white/40">
              <CheckSquare size={20} className="mb-1 text-[#0a84ff]/60" />
              <div className="text-xs font-medium">All clear for today!</div>
              <div className="text-[10px] mt-0.5">Add a quick task below</div>
            </div>
          ) : (
            todayTasks.map((t) => {
              const isDone = t.status === 'completed';
              return (
                <div
                  key={t.id}
                  onClick={() => handleToggleTask(t.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                    isDone
                      ? 'bg-black/5 dark:bg-white/[0.03] border-transparent opacity-60'
                      : 'bg-black/5 dark:bg-white/[0.07] border-[var(--border-glass)] hover:border-[#0a84ff]/50'
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTask(t.id);
                    }}
                    className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all flex-shrink-0 ${
                      isDone
                        ? 'bg-[#0a84ff] border-[#0a84ff] text-white'
                        : 'border-neutral-400 dark:border-white/30 hover:border-[#0a84ff]'
                    }`}
                  >
                    {isDone && <Check size={11} strokeWidth={3} />}
                  </button>

                  <span
                    className={`text-xs flex-1 truncate ${
                      isDone
                        ? 'line-through text-neutral-400 dark:text-white/40'
                        : 'text-neutral-900 dark:text-white font-medium'
                    }`}
                  >
                    {t.title}
                  </span>

                  {t.time && (
                    <span className="text-[10px] font-mono text-neutral-400 dark:text-white/40 flex-shrink-0">
                      {t.time}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Quick Add Bar */}
        <form onSubmit={handleQuickAdd} className="flex gap-1.5 pt-2 border-t border-[var(--border-glass)] flex-shrink-0 no-drag">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Add task for today..."
            className="flex-1 bg-black/5 dark:bg-black/40 border border-[var(--border-glass)] rounded-xl px-2.5 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-white/30 focus:outline-none focus:border-[#0a84ff]"
          />
          <button
            type="submit"
            disabled={!quickTitle.trim()}
            className="px-3 py-1.5 bg-[#0a84ff] hover:bg-[#0066d6] disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            <Plus size={13} strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </div>
  );
};
