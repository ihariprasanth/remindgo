import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Check, Plus, ExternalLink, X, 
  Calendar, CheckSquare, Lock, Unlock,
  Code2, Flame, Layers
} from 'lucide-react';
import { format, subWeeks, startOfWeek, addDays, parseISO } from 'date-fns';
import { Task, LeetCodeData, TaskPriority } from '../types';
import { api } from '../services/api';
import { getISTDate, getMillisUntilMidnightIST } from '../utils/istTime';

export type WidgetMode = 'leetcode' | 'tasks-heatmap' | 'todo' | 'combined';

interface DesktopWidgetProps {
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const DesktopWidget: React.FC<DesktopWidgetProps> = () => {
  const [mode, setMode] = useState<WidgetMode>(() => {
    const saved = localStorage.getItem('remindgo_widget_variant') as WidgetMode;
    if (saved && ['leetcode', 'tasks-heatmap', 'todo', 'combined'].includes(saved)) {
      return saved;
    }
    return 'leetcode';
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [leetCodeData, setLeetCodeData] = useState<LeetCodeData | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const quickPriority: TaskPriority = 'medium';
  const [hoveredDay, setHoveredDay] = useState<{ dateStr: string; count: number; x: number; y: number } | null>(null);

  // Widget Lock state - when locked, widget is strictly non-draggable
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

    // Resize appropriately on initial load
    if (api.resizeWidget) {
      if (mode === 'todo') {
        api.resizeWidget(360, 360);
      } else {
        api.resizeWidget(415, 210);
      }
    }

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
  }, [loadData, mode]);

  // Switch mode and resize window dynamically
  const switchMode = async (nextMode: WidgetMode) => {
    setMode(nextMode);
    localStorage.setItem('remindgo_widget_variant', nextMode);
    if (api.resizeWidget) {
      if (nextMode === 'todo') {
        await api.resizeWidget(360, 360);
      } else {
        await api.resizeWidget(415, 210);
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
      category: 'General',
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

  const totalCompleted = useMemo(() => {
    return tasks.filter((t) => t.status === 'completed').length;
  }, [tasks]);

  // Build task map
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

  // Build LeetCode map
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

  // Build Combined map
  const combinedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const [d, count] of taskMap.entries()) {
      map.set(d, (map.get(d) || 0) + count);
    }
    for (const [d, count] of leetCodeMap.entries()) {
      map.set(d, (map.get(d) || 0) + count);
    }
    return map;
  }, [taskMap, leetCodeMap]);

  // Task Streak calculation
  const taskStreak = useMemo(() => {
    let streak = 0;
    let checkDate = new Date();
    const todayFormatted = format(checkDate, 'yyyy-MM-dd');
    const hasToday = (taskMap.get(todayFormatted) || 0) > 0;
    if (!hasToday) {
      checkDate = new Date(Date.now() - 86400000);
    }
    while (true) {
      const dStr = format(checkDate, 'yyyy-MM-dd');
      if ((taskMap.get(dStr) || 0) > 0) {
        streak++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else {
        break;
      }
    }
    return streak;
  }, [taskMap]);

  // Helper to build 20-week grid (140 days) from any count map
  const buildWeeksGrid = useCallback((map: Map<string, number>) => {
    const now = new Date();
    const startDate = startOfWeek(subWeeks(now, 19), { weekStartsOn: 0 });
    const weeksGrid: { dateStr: string; count: number; level: number }[][] = [];
    let iter = startDate;

    for (let w = 0; w < 20; w++) {
      const days: { dateStr: string; count: number; level: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const dStr = format(iter, 'yyyy-MM-dd');
        const count = map.get(dStr) || 0;

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
    return weeksGrid;
  }, []);

  const leetCodeWeeks = useMemo(() => buildWeeksGrid(leetCodeMap), [buildWeeksGrid, leetCodeMap]);
  const taskWeeks = useMemo(() => buildWeeksGrid(taskMap), [buildWeeksGrid, taskMap]);
  const combinedWeeks = useMemo(() => buildWeeksGrid(combinedMap), [buildWeeksGrid, combinedMap]);

  const getCellColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-[#0e4429] border-[#006d32]/70';
      case 2:
        return 'bg-[#006d32] border-[#26a641]/70';
      case 3:
        return 'bg-[#26a641] border-[#39d353]/70';
      case 4:
        return 'bg-[#39d353] border-[#56e36d] shadow-[0_0_6px_rgba(57,211,83,0.6)]';
      case 0:
      default:
        return 'bg-white/[0.05] border-white/[0.07]';
    }
  };

  // Render common top bar with segmented mode selector and right action controls
  const renderTopBar = (currentTitle: string, rightTag?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/10">
      {/* Segmented Mode Switcher */}
      <div className="flex items-center bg-black/60 border border-white/10 rounded-lg p-0.5 text-[10px] gap-0.5 no-drag">
        <button
          onClick={() => switchMode('leetcode')}
          title="Dedicated LeetCode Submissions Heatmap"
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
            mode === 'leetcode'
              ? 'bg-[#f59e0b] text-black font-bold shadow-sm'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Code2 size={10} />
          <span>LeetCode</span>
        </button>

        <button
          onClick={() => switchMode('tasks-heatmap')}
          title="Dedicated Task Completion Heatmap"
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
            mode === 'tasks-heatmap'
              ? 'bg-[#22c55e] text-black font-bold shadow-sm'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Calendar size={10} />
          <span>Tasks</span>
        </button>

        <button
          onClick={() => switchMode('todo')}
          title="Today's To-Do Task Checklist"
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
            mode === 'todo'
              ? 'bg-[#0a84ff] text-white font-bold shadow-sm'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <CheckSquare size={10} />
          <span>To-Do</span>
        </button>

        <button
          onClick={() => switchMode('combined')}
          title="Combined Productivity Overview"
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
            mode === 'combined'
              ? 'bg-[#bc8cff] text-black font-bold shadow-sm'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Layers size={10} />
          <span>All</span>
        </button>
      </div>

      {/* Right Controls: Lock, Open Full App, Close */}
      <div className="flex items-center gap-1.5 no-drag">
        {rightTag}

        {/* Lock / Unlock Toggle */}
        <button
          onClick={toggleLock}
          title={isLocked ? "Pinned & Locked to Desktop (Non-draggable). Click to unlock." : "Unlocked (Draggable). Click to lock in place."}
          className={`p-1 rounded-md transition-all cursor-pointer ${
            isLocked 
              ? 'text-white/40 hover:text-white hover:bg-white/10' 
              : 'text-[#f59e0b] bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30'
          }`}
        >
          {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>

        {/* Open Main App */}
        <button
          onClick={handleOpenFullApp}
          title="Open RemindGo Full App"
          className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <ExternalLink size={11} />
        </button>

        {/* Close Widget */}
        <button
          onClick={handleClose}
          title="Close Widget"
          className="p-1 rounded-md text-white/50 hover:text-white hover:bg-red-500 transition-all cursor-pointer"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );

  // Render 20-week green grid component
  const renderHeatmapGrid = (weeksGrid: { dateStr: string; count: number; level: number }[][], label: string) => (
    <>
      <div className="flex gap-[3px] justify-center no-drag pb-0.5">
        {weeksGrid.map((wk, wIdx) => (
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

      {hoveredDay && (
        <div
          style={{ left: hoveredDay.x, top: hoveredDay.y }}
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full pointer-events-none bg-neutral-900 text-white text-[10px] font-mono px-2 py-1 rounded-md shadow-xl border border-white/20 whitespace-nowrap"
        >
          {hoveredDay.dateStr}: {hoveredDay.count} {label}
        </div>
      )}
    </>
  );

  // =========================================================================
  // VARIANT 1: DEDICATED LEETCODE HEATMAP & STATS WIDGET
  // =========================================================================
  if (mode === 'leetcode') {
    return (
      <div className="w-full h-full p-2 select-none">
        <div 
          className={`liquid-glass-card group relative p-3 rounded-2xl border border-white/10 shadow-2xl overflow-hidden transition-all ${
            isLocked ? 'select-none' : 'titlebar-drag cursor-move ring-1 ring-[#f59e0b]/50'
          }`}
          style={{ backdropFilter: 'blur(30px) saturate(180%)' }}
        >
          {renderTopBar(
            'LeetCode Activity',
            leetCodeData?.streak ? (
              <span className="flex items-center gap-1 text-[10px] font-mono text-[#f43f5e] bg-[#f43f5e]/15 px-1.5 py-0.5 rounded-md font-semibold">
                <Flame size={10} />
                <span>{leetCodeData.streak}d</span>
              </span>
            ) : null
          )}

          {/* Subheader: Username & Solved Stats */}
          <div className="flex items-center justify-between text-[11px] font-mono mb-2">
            <span className="text-white/80 font-semibold truncate max-w-[200px]">
              {leetCodeData?.username ? `@${leetCodeData.username}` : 'LeetCode Submissions'}
            </span>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-[#39d353] font-medium">E:{leetCodeData?.easySolved || 0}</span>
              <span className="text-[#f59e0b] font-medium">M:{leetCodeData?.mediumSolved || 0}</span>
              <span className="text-[#f43f5e] font-medium">H:{leetCodeData?.hardSolved || 0}</span>
              <span className="text-white/60 font-bold">{leetCodeData?.totalSolved || 0} Solved</span>
            </div>
          </div>

          {/* 20-Week LeetCode Submissions Heatmap Grid */}
          {renderHeatmapGrid(leetCodeWeeks, 'submissions')}

          {/* Bottom Bar: Daily Challenge link */}
          <div className="flex items-center justify-between text-[10px] text-white/50 pt-2 border-t border-white/10 mt-2 font-mono">
            <span>Rank: #{leetCodeData?.ranking?.toLocaleString() || 'N/A'}</span>
            {leetCodeData?.dailyChallenge ? (
              <button
                onClick={handleOpenFullApp}
                title="View Daily Challenge in RemindGo"
                className="text-[#f59e0b] hover:text-[#fbbf24] font-medium truncate max-w-[220px] transition-colors cursor-pointer"
              >
                Today: {leetCodeData.dailyChallenge.title}
              </button>
            ) : (
              <span>20-Week Submissions</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VARIANT 2: DEDICATED TASKS COMPLETION HEATMAP WIDGET
  // =========================================================================
  if (mode === 'tasks-heatmap') {
    return (
      <div className="w-full h-full p-2 select-none">
        <div 
          className={`liquid-glass-card group relative p-3 rounded-2xl border border-white/10 shadow-2xl overflow-hidden transition-all ${
            isLocked ? 'select-none' : 'titlebar-drag cursor-move ring-1 ring-[#22c55e]/50'
          }`}
          style={{ backdropFilter: 'blur(30px) saturate(180%)' }}
        >
          {renderTopBar(
            'Task History',
            taskStreak > 0 ? (
              <span className="flex items-center gap-1 text-[10px] font-mono text-[#22c55e] bg-[#22c55e]/15 px-1.5 py-0.5 rounded-md font-semibold">
                <Flame size={10} />
                <span>{taskStreak}d streak</span>
              </span>
            ) : null
          )}

          {/* Subheader: Task Metrics */}
          <div className="flex items-center justify-between text-[11px] font-mono mb-2">
            <span className="text-white/80 font-semibold">
              Tasks Completed Over Time
            </span>
            <span className="text-[10px] text-white/60">
              <strong className="text-[#22c55e]">{totalCompleted}</strong> tasks completed
            </span>
          </div>

          {/* 20-Week Task Completion Heatmap Grid */}
          {renderHeatmapGrid(taskWeeks, 'tasks completed')}

          {/* Bottom Bar: Today stats & legend */}
          <div className="flex items-center justify-between text-[10px] text-white/50 pt-2 border-t border-white/10 mt-2 font-mono">
            <span>Today: {completedTodayCount} done</span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              <span className="w-2 h-2 rounded-[2px] bg-white/[0.05] border border-white/[0.08]" />
              <span className="w-2 h-2 rounded-[2px] bg-[#0e4429] border border-[#006d32]/60" />
              <span className="w-2 h-2 rounded-[2px] bg-[#006d32] border border-[#26a641]/60" />
              <span className="w-2 h-2 rounded-[2px] bg-[#26a641] border border-[#39d353]/60" />
              <span className="w-2 h-2 rounded-[2px] bg-[#39d353] border border-[#56e36d]" />
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VARIANT 3: COMBINED PRODUCTIVITY OVERVIEW WIDGET
  // =========================================================================
  if (mode === 'combined') {
    return (
      <div className="w-full h-full p-2 select-none">
        <div 
          className={`liquid-glass-card group relative p-3 rounded-2xl border border-white/10 shadow-2xl overflow-hidden transition-all ${
            isLocked ? 'select-none' : 'titlebar-drag cursor-move ring-1 ring-[#bc8cff]/50'
          }`}
          style={{ backdropFilter: 'blur(30px) saturate(180%)' }}
        >
          {renderTopBar('All Activity')}

          {/* Subheader: Summary pills */}
          <div className="flex items-center justify-between text-[11px] font-mono mb-2">
            <span className="text-white/80 font-semibold">
              Tasks + LeetCode Submissions
            </span>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-[#38bdf8] font-medium">{todayTasks.length - completedTodayCount} Pending</span>
              <span className="text-[#bc8cff] font-medium">{leetCodeData?.streak || 0}d LC Streak</span>
            </div>
          </div>

          {/* 20-Week Combined Heatmap Grid */}
          {renderHeatmapGrid(combinedWeeks, 'total items')}

          {/* Bottom Bar: Legend */}
          <div className="flex items-center justify-between text-[10px] text-white/50 pt-2 border-t border-white/10 mt-2 font-mono">
            <span>20-Week Unified Heatmap</span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              <span className="w-2 h-2 rounded-[2px] bg-white/[0.05] border border-white/[0.08]" />
              <span className="w-2 h-2 rounded-[2px] bg-[#0e4429] border border-[#006d32]/60" />
              <span className="w-2 h-2 rounded-[2px] bg-[#006d32] border border-[#26a641]/60" />
              <span className="w-2 h-2 rounded-[2px] bg-[#26a641] border border-[#39d353]/60" />
              <span className="w-2 h-2 rounded-[2px] bg-[#39d353] border border-[#56e36d]" />
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VARIANT 4: DEDICATED TODAY'S TO-DO TASK CHECKLIST WIDGET
  // =========================================================================
  return (
    <div className="w-full h-full p-2 select-none">
      <div 
        className={`liquid-glass-card h-full flex flex-col justify-between p-3.5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden transition-all ${
          isLocked ? 'select-none' : 'titlebar-drag cursor-move ring-1 ring-[#0a84ff]/40'
        }`}
        style={{ backdropFilter: 'blur(30px) saturate(180%)' }}
      >
        {/* Header with segmented switch */}
        <div className="flex-shrink-0">
          {renderTopBar(
            "Today's To-Do",
            <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded-md text-white/80 font-bold">
              {completedTodayCount}/{todayTasks.length}
            </span>
          )}
        </div>

        {/* Task List Items */}
        <div className="flex-1 overflow-y-auto py-1.5 space-y-1.5 pr-1 my-1">
          {todayTasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-3 text-white/40">
              <CheckSquare size={22} className="mb-1 text-[#0a84ff]/70" />
              <div className="text-xs font-semibold text-white/70">All tasks completed today!</div>
              <div className="text-[10px] mt-0.5">Type below to add a task</div>
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
                      ? 'bg-white/[0.03] border-transparent opacity-60'
                      : 'bg-white/[0.07] border-white/10 hover:border-[#0a84ff]/50'
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
                        : 'border-white/30 hover:border-[#0a84ff]'
                    }`}
                  >
                    {isDone && <Check size={11} strokeWidth={3} />}
                  </button>

                  <span
                    className={`text-xs flex-1 truncate ${
                      isDone
                        ? 'line-through text-white/40'
                        : 'text-white font-medium'
                    }`}
                  >
                    {t.title}
                  </span>

                  {t.time && (
                    <span className="text-[10px] font-mono text-white/40 flex-shrink-0">
                      {t.time}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Quick Add Bar */}
        <form onSubmit={handleQuickAdd} className="flex gap-1.5 pt-2 border-t border-white/10 flex-shrink-0 no-drag">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Add task for today..."
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#0a84ff]"
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

