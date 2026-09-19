import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Check, Plus, ExternalLink, X, 
  Calendar, CheckSquare, Lock, Unlock,
  Code2, Flame, LayoutGrid,
  Clock, Sparkles, Terminal
} from 'lucide-react';
import { format, subWeeks, startOfWeek, addDays, parseISO } from 'date-fns';
import { Task, LeetCodeData, WidgetVariant } from '../types';
import { api } from '../services/api';
import { getISTDate, getMillisUntilMidnightIST } from '../utils/istTime';

interface DesktopWidgetProps {
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const WIDGET_OPTIONS: { id: WidgetVariant; name: string; subtitle: string; icon: any }[] = [
  { id: 'tasks-heatmap', name: 'Task Activity Matrix', subtitle: '20-week to-do tasks heatmap & streak', icon: Calendar },
  { id: 'todo', name: 'Today\'s Daily Checklist', subtitle: '1-click checkoff for routine & to-dos', icon: CheckSquare },
  { id: 'leetcode', name: 'LeetCode Activity', subtitle: 'Submissions heatmap & solved problem stats', icon: Code2 },
  { id: 'leetcode-streak', name: 'LeetCode Daily Streak', subtitle: 'Dedicated flaming streak & rank counter', icon: Flame },
  { id: 'coding-platforms', name: 'Coding Platforms Hub', subtitle: 'LeetCode, CodeChef, GFG & GitHub tracker', icon: Terminal },
  { id: 'routine-progress', name: 'Routine & Streak Meter', subtitle: 'Daily progress bar, 8PM & 10PM status', icon: Sparkles },
  { id: 'mini-pill', name: 'Minimalist Compact Pill', subtitle: 'Ultra-compact mini heatmap desktop strip', icon: Flame },
];

export const DesktopWidget: React.FC<DesktopWidgetProps> = () => {
  const [variant, setVariant] = useState<WidgetVariant>(() => {
    const saved = localStorage.getItem('remindgo_widget_variant') as WidgetVariant;
    if (saved && WIDGET_OPTIONS.some((o) => o.id === saved)) {
      return saved;
    }
    return 'tasks-heatmap';
  });

  const [showMenu, setShowMenu] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leetCodeData, setLeetCodeData] = useState<LeetCodeData | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
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

  const adjustWindowSize = useCallback((v: WidgetVariant) => {
    if (!api.resizeWidget) return;
    switch (v) {
      case 'todo':
        api.resizeWidget(380, 360);
        break;
      case 'coding-platforms':
        api.resizeWidget(380, 270);
        break;
      case 'routine-progress':
        api.resizeWidget(380, 230);
        break;
      case 'leetcode-streak':
        api.resizeWidget(360, 205);
        break;
      case 'mini-pill':
        api.resizeWidget(320, 85);
        break;
      case 'leetcode':
      case 'tasks-heatmap':
      default:
        api.resizeWidget(415, 205);
        break;
    }
  }, []);

  const selectVariant = (newVariant: WidgetVariant) => {
    setVariant(newVariant);
    localStorage.setItem('remindgo_widget_variant', newVariant);
    adjustWindowSize(newVariant);
    setShowMenu(false);
  };

  useEffect(() => {
    loadData();
    adjustWindowSize(variant);

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
        loadData();
        scheduleMidnight();
      }, delay);
    };
    scheduleMidnight();

    // Polling fallback every 8 seconds to keep widget live
    const interval = setInterval(loadData, 8000);

    return () => {
      if (cleanup) cleanup();
      clearTimeout(midnightTimer);
      clearInterval(interval);
    };
  }, [loadData, adjustWindowSize, variant]);

  // Tasks filter for today
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.date === todayStr);
  }, [tasks, todayStr]);

  const completedTodayCount = useMemo(() => {
    return todayTasks.filter((t) => t.status === 'completed').length;
  }, [todayTasks]);

  const totalCompleted = useMemo(() => {
    return tasks.filter((t) => t.status === 'completed').length;
  }, [tasks]);

  // Build task map for completions
  const taskMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      if (t.status === 'completed' && t.completed_at) {
        try {
          const d = format(parseISO(t.completed_at), 'yyyy-MM-dd');
          map.set(d, (map.get(d) || 0) + 1);
        } catch {
          // ignore
        }
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

  // Helper to build 20-week grid (140 days) from map
  const buildWeeksGrid = useCallback((map: Map<string, number>, weekCount = 20) => {
    const now = new Date();
    const startDate = startOfWeek(subWeeks(now, weekCount - 1), { weekStartsOn: 0 });
    const weeksGrid: { dateStr: string; count: number; level: number }[][] = [];
    let iter = startDate;

    for (let w = 0; w < weekCount; w++) {
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

  const getCellColor = (level: number, colorType: 'green' | 'amber' = 'green') => {
    if (colorType === 'amber') {
      switch (level) {
        case 1:
          return 'bg-[#78350f] border-[#92400e]';
        case 2:
          return 'bg-[#b45309] border-[#d97706] shadow-[0_0_4px_rgba(245,158,11,0.3)]';
        case 3:
          return 'bg-[#d97706] border-[#f59e0b] shadow-[0_0_6px_rgba(245,158,11,0.5)]';
        case 4:
          return 'bg-[#f59e0b] border-[#fcd34d] shadow-[0_0_8px_rgba(245,158,11,0.7)]';
        default:
          return 'bg-[#161b22] border-[#21262d]';
      }
    }

    switch (level) {
      case 1:
        return 'bg-[#0e4429] border-[#006d32]';
      case 2:
        return 'bg-[#006d32] border-[#26a641] shadow-[0_0_4px_rgba(38,166,65,0.3)]';
      case 3:
        return 'bg-[#26a641] border-[#39d353] shadow-[0_0_6px_rgba(46,160,67,0.5)]';
      case 4:
        return 'bg-[#39d353] border-[#56e36d] shadow-[0_0_8px_rgba(57,211,83,0.7)]';
      default:
        return 'bg-[#161b22] border-[#21262d]';
    }
  };

  const handleToggleTask = async (id: string) => {
    try {
      await api.toggleTaskStatus(id);
      loadData();
    } catch (err) {
      console.error('[Widget] Failed to toggle task:', err);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    try {
      await api.createTask({
        title: quickTitle.trim(),
        category: 'Quick Note',
        date: todayStr,
        time: '20:00',
        repeat: 'none',
        priority: 'medium'
      });
      setQuickTitle('');
      loadData();
    } catch (err) {
      console.error('[Widget] Failed to add task:', err);
    }
  };

  const handleOpenFullApp = () => {
    if (api.openMainWindow) {
      api.openMainWindow();
    }
  };

  const handleClose = () => {
    if (api.toggleWidget) {
      api.toggleWidget();
    }
  };

  // Common Header for Standalone Widgets
  const renderHeader = (title: string, iconNode: React.ReactNode, rightContent?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/10 relative">
      <div className="flex items-center gap-1.5">
        <span className="text-[#39d353] flex-shrink-0">{iconNode}</span>
        <span className="font-bold text-xs text-white tracking-wide truncate">{title}</span>
      </div>

      <div className="flex items-center gap-1 no-drag">
        {rightContent}

        {/* Widget Selector Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            title="Switch Widget Option"
            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <LayoutGrid size={12} />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-6 z-50 w-52 bg-[#0d1117] border border-white/20 rounded-xl shadow-2xl p-1 text-xs">
              <div className="px-2 py-1 text-[10px] font-mono text-white/40 uppercase tracking-wider border-b border-white/10 mb-1">
                Individual Widgets
              </div>
              {WIDGET_OPTIONS.map((opt) => {
                const IconComp = opt.icon;
                const isSelected = variant === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => selectVariant(opt.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected ? 'bg-[#0a84ff] text-white font-bold' : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <IconComp size={13} className={isSelected ? 'text-white' : 'text-white/50'} />
                    <div className="truncate">
                      <div className="leading-tight text-[11px]">{opt.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Lock/Unlock Dragging */}
        <button
          onClick={toggleLock}
          title={isLocked ? 'Widget is Locked (Non-Draggable)' : 'Widget is Unlocked (Click & Drag)'}
          className={`p-1 rounded-md transition-all cursor-pointer ${
            isLocked ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-[#f59e0b] bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30'
          }`}
        >
          {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>

        {/* Open Full App */}
        <button
          onClick={handleOpenFullApp}
          title="Open RemindGo App"
          className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <ExternalLink size={12} />
        </button>

        {/* Close Widget */}
        <button
          onClick={handleClose}
          title="Close Widget"
          className="p-1 rounded-md text-white/50 hover:text-white hover:bg-red-500 transition-all cursor-pointer"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );

  // Render 20-week green grid
  const renderHeatmapGrid = (weeksGrid: { dateStr: string; count: number; level: number }[][], label: string, colorType: 'green' | 'amber' = 'green') => (
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
                className={`w-[11px] h-[11px] rounded-[2px] border transition-all cursor-pointer hover:scale-125 ${getCellColor(day.level, colorType)}`}
              />
            ))}
          </div>
        ))}
      </div>

      {hoveredDay && (
        <div
          style={{ 
            left: Math.max(90, Math.min(hoveredDay.x, 325)), 
            top: Math.max(35, hoveredDay.y) 
          }}
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full pointer-events-none bg-[#0d1117] text-white text-[10px] font-mono px-2.5 py-1 rounded-md shadow-2xl border border-white/20 whitespace-nowrap"
        >
          {hoveredDay.count === 0 
            ? `No ${label} on ${hoveredDay.dateStr}` 
            : `${hoveredDay.count} ${label} on ${hoveredDay.dateStr}`}
        </div>
      )}
    </>
  );

  const containerClasses = `w-full h-full p-2 select-none font-sans`;
  const cardClasses = `group relative p-3 rounded-2xl border border-white/15 shadow-2xl overflow-hidden transition-all bg-[#000000] text-white ${
    isLocked ? 'select-none' : 'titlebar-drag cursor-move ring-1 ring-[#0a84ff]/50'
  }`;

  // =========================================================================
  // 1. DEDICATED TO-DO TASKS HEATMAP WIDGET
  // =========================================================================
  if (variant === 'tasks-heatmap') {
    const weeksGrid = buildWeeksGrid(taskMap, 20);
    return (
      <div className={containerClasses}>
        <div className={cardClasses} style={{ backgroundColor: '#000000' }}>
          {renderHeader(
            'Task Activity Matrix',
            <Calendar size={13} className="text-[#39d353]" />,
            <div className="flex items-center gap-1.5 mr-1 font-mono text-[10px]">
              <span className="flex items-center gap-1 text-[#f43f5e]">
                <Flame size={11} />
                <span className="font-bold">{taskStreak}d</span>
              </span>
              <span className="text-white/40">•</span>
              <span className="text-[#39d353]">{completedTodayCount} done</span>
            </div>
          )}

          {renderHeatmapGrid(weeksGrid, 'completed tasks', 'green')}

          <div className="flex items-center justify-between text-[10px] text-white/50 pt-1.5 font-mono">
            <span>{totalCompleted} total tasks finished</span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((l) => (
                  <div key={l} className={`w-2 h-2 rounded-[1px] border ${getCellColor(l, 'green')}`} />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. DEDICATED TODAY'S TO-DO DAILY CHECKLIST WIDGET
  // =========================================================================
  if (variant === 'todo') {
    return (
      <div className={containerClasses}>
        <div className={cardClasses} style={{ backgroundColor: '#000000' }}>
          {renderHeader(
            'Daily Checklist',
            <CheckSquare size={13} className="text-[#0a84ff]" />,
            <span className="text-[10px] font-mono text-[#0a84ff] mr-1">
              {completedTodayCount}/{todayTasks.length} Done
            </span>
          )}

          {/* Scrollable list */}
          <div className="space-y-1.5 max-h-[225px] overflow-y-auto no-drag pr-1 py-1">
            {todayTasks.length === 0 ? (
              <div className="text-center py-6 text-xs text-white/40 border border-dashed border-white/10 rounded-xl">
                No tasks scheduled for today.
              </div>
            ) : (
              todayTasks.map((t) => {
                const isCompleted = t.status === 'completed';
                return (
                  <div
                    key={t.id}
                    onClick={() => handleToggleTask(t.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                      isCompleted
                        ? 'bg-white/[0.03] border-white/5 text-white/40'
                        : 'bg-white/[0.06] border-white/10 hover:border-[#0a84ff]/60 text-white'
                    }`}
                  >
                    <button
                      className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all flex-shrink-0 ${
                        isCompleted
                          ? 'bg-[#39d353] border-[#39d353] text-black'
                          : 'border-white/30 hover:border-[#0a84ff]'
                      }`}
                    >
                      {isCompleted && <Check size={11} strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs truncate ${isCompleted ? 'line-through text-white/40' : 'font-medium text-white'}`}>
                        {t.title}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-white/40 flex-shrink-0">
                      {t.time}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick-add task input */}
          <form onSubmit={handleQuickAdd} className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5 no-drag">
            <input
              type="text"
              placeholder="Add to-do for today..."
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="flex-1 px-2.5 py-1.5 bg-white/5 border border-white/15 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#0a84ff]"
            />
            <button
              type="submit"
              disabled={!quickTitle.trim()}
              className="p-1.5 rounded-lg bg-[#0a84ff] hover:bg-[#0066d6] disabled:opacity-40 text-white cursor-pointer transition-all"
            >
              <Plus size={13} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. DEDICATED LEETCODE SUBMISSIONS HEATMAP WIDGET
  // =========================================================================
  if (variant === 'leetcode') {
    const weeksGrid = buildWeeksGrid(leetCodeMap, 20);
    return (
      <div className={containerClasses}>
        <div className={cardClasses} style={{ backgroundColor: '#000000' }}>
          {renderHeader(
            'LeetCode Activity',
            <Code2 size={13} className="text-[#39d353]" />,
            leetCodeData && (
              <div className="flex items-center gap-1.5 mr-1 font-mono text-[10px]">
                <span className="flex items-center gap-1 text-[#f43f5e]">
                  <Flame size={11} />
                  <span className="font-bold">{leetCodeData.streak}d</span>
                </span>
                <span className="text-white/40">•</span>
                <span className="text-[#39d353]">#{leetCodeData.ranking ? leetCodeData.ranking.toLocaleString() : 'N/A'}</span>
              </div>
            )
          )}

          {renderHeatmapGrid(weeksGrid, 'submissions', 'green')}

          {/* Minimalist footer: total solved & green intensity legend */}
          <div className="flex items-center justify-between text-[10px] text-white/50 pt-1.5 font-mono">
            {leetCodeData ? (
              <>
                <span className="text-white font-bold">{leetCodeData.totalSolved} Problems Solved</span>
                <div className="flex items-center gap-1">
                  <span>Less</span>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((l) => (
                      <div key={l} className={`w-2 h-2 rounded-[1px] border ${getCellColor(l, 'green')}`} />
                    ))}
                  </div>
                  <span>More</span>
                </div>
              </>
            ) : (
              <span>Connect LeetCode username in App</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3b. DEDICATED LEETCODE DAILY STREAK FLAME WIDGET
  // =========================================================================
  if (variant === 'leetcode-streak') {
    return (
      <div className={containerClasses}>
        <div className={cardClasses} style={{ backgroundColor: '#000000' }}>
          {renderHeader(
            'LeetCode Streak',
            <Flame size={13} className="text-[#f43f5e]" />,
            <span className="text-[10px] font-mono text-[#39d353] mr-1">Daily Streak</span>
          )}

          <div className="flex items-center justify-between gap-3 py-1.5 no-drag">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#f43f5e]/15 border border-[#f43f5e]/30 flex flex-col items-center justify-center flex-shrink-0">
                <Flame size={24} className="text-[#f43f5e] animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-[#f43f5e] -mt-0.5">
                  {leetCodeData ? `${leetCodeData.streak}d` : '0d'}
                </span>
              </div>

              <div>
                <div className="text-sm font-bold text-white tracking-wide">
                  {leetCodeData ? `${leetCodeData.streak} Days Active` : 'No Streak'}
                </div>
                <div className="text-[11px] font-mono text-white/50 mt-0.5">
                  Rank: <span className="text-[#39d353]">#{leetCodeData?.ranking ? leetCodeData.ranking.toLocaleString() : 'N/A'}</span>
                </div>
                <div className="text-[11px] font-mono text-white/50">
                  Solved: <span className="text-white font-bold">{leetCodeData?.totalSolved || 0}</span> problems
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <button
                onClick={() => {
                  if (api.openExternal) {
                    api.openExternal('https://leetcode.com/problemset/all/');
                  } else {
                    window.open('https://leetcode.com/problemset/all/', '_blank');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-[#238636] hover:bg-[#2ea043] text-white text-[11px] font-semibold transition-all flex items-center gap-1 shadow-lg cursor-pointer"
              >
                <span>Solve Today</span>
                <ExternalLink size={10} />
              </button>
              <span className="text-[9px] font-mono text-white/40">POTD Active</span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50 font-mono">
            <span>Username: {leetCodeData?.username || 'Not set'}</span>
            <span className="text-[#39d353]">{leetCodeData?.streak && leetCodeData.streak > 0 ? 'On Fire' : 'Active'}</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. CODING PLATFORMS TRACKER WIDGET
  // =========================================================================
  if (variant === 'coding-platforms') {
    const platforms = [
      { name: 'LeetCode Daily Problem', key: 'leetcode', icon: Code2, color: 'text-[#f59e0b]' },
      { name: 'CodeChef Contest / Practice', key: 'codechef', icon: Terminal, color: 'text-[#0a84ff]' },
      { name: 'GeeksForGeeks POTD', key: 'gfg', icon: Sparkles, color: 'text-[#39d353]' },
      { name: 'JavaScript & Projects', key: 'projects', icon: CheckSquare, color: 'text-[#bc8cff]' },
    ];

    return (
      <div className={containerClasses}>
        <div className={cardClasses} style={{ backgroundColor: '#000000' }}>
          {renderHeader(
            'Coding Platforms Hub',
            <Terminal size={13} className="text-[#0a84ff]" />,
            <span className="text-[10px] font-mono text-[#39d353] mr-1">Active</span>
          )}

          <div className="space-y-1.5 no-drag py-1">
            {platforms.map((p) => {
              const matched = tasks.find((t) => t.date === todayStr && t.title.toLowerCase().includes(p.name.toLowerCase().slice(0, 10)));
              const isDone = matched?.status === 'completed';
              const IconComp = p.icon;

              return (
                <div
                  key={p.name}
                  onClick={() => {
                    if (matched) handleToggleTask(matched.id);
                  }}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                    isDone
                      ? 'bg-[#238636]/15 border-[#238636]/40 text-white'
                      : 'bg-white/[0.05] border-white/10 hover:border-white/25 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <IconComp size={14} className={p.color} />
                    <span className={`text-xs truncate ${isDone ? 'line-through text-white/50' : 'font-medium'}`}>
                      {p.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${
                        isDone ? 'bg-[#39d353] border-[#39d353] text-black' : 'border-white/30'
                      }`}
                    >
                      {isDone && <Check size={11} strokeWidth={3} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 mt-1 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50 font-mono">
            <span>Daily Coding Goals</span>
            <span className="text-[#39d353]">8:00 PM IST Notification</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. DAILY ROUTINE & STREAK PROGRESS WIDGET
  // =========================================================================
  if (variant === 'routine-progress') {
    const totalToday = todayTasks.length;
    const pct = totalToday > 0 ? Math.round((completedTodayCount / totalToday) * 100) : 0;

    return (
      <div className={containerClasses}>
        <div className={cardClasses} style={{ backgroundColor: '#000000' }}>
          {renderHeader(
            'Daily Routine Meter',
            <Sparkles size={13} className="text-[#39d353]" />,
            <span className="text-[10px] font-mono text-[#f43f5e] flex items-center gap-1 mr-1">
              <Flame size={11} /> {taskStreak}d streak
            </span>
          )}

          <div className="py-2 space-y-2.5 no-drag">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">Today's Progress</span>
              <span className="text-xs font-mono font-bold text-[#39d353]">{pct}% ({completedTodayCount}/{totalToday})</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0a84ff] to-[#39d353] rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-white/40">8:00 PM IST</div>
                <div className="text-white font-semibold mt-0.5">Tasks Reminder</div>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-white/40">10:00 PM IST</div>
                <div className="text-[#f59e0b] font-semibold mt-0.5">Warning Cutoff</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 6. MINIMALIST COMPACT HEATMAP PILL WIDGET
  // =========================================================================
  if (variant === 'mini-pill') {
    const miniWeeks = buildWeeksGrid(taskMap, 12);
    return (
      <div className="w-full h-full p-1 select-none font-sans">
        <div 
          className={`group flex items-center justify-between gap-2 p-2 rounded-xl border border-white/15 shadow-2xl bg-[#000000] text-white ${
            isLocked ? 'select-none' : 'titlebar-drag cursor-move ring-1 ring-[#0a84ff]/50'
          }`}
          style={{ backgroundColor: '#000000' }}
        >
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[#f43f5e]"><Flame size={12} /></span>
            <span className="font-mono text-xs font-bold text-white">{taskStreak}d</span>
          </div>

          {/* Mini 12-week strip */}
          <div className="flex gap-[2px] no-drag">
            {miniWeeks.map((wk, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-[2px]">
                {wk.slice(0, 4).map((day, dIdx) => (
                  <div
                    key={dIdx}
                    title={`${day.dateStr}: ${day.count} tasks`}
                    className={`w-[7px] h-[7px] rounded-[1px] border ${getCellColor(day.level, 'green')}`}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1 no-drag">
            <span className="text-[10px] font-mono text-[#39d353]">{completedTodayCount} done</span>
            <button
              onClick={() => selectVariant('tasks-heatmap')}
              title="Expand to Full Widget"
              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <ExternalLink size={11} />
            </button>
            <button
              onClick={handleClose}
              title="Close"
              className="p-1 rounded text-white/40 hover:text-white hover:bg-red-500 cursor-pointer"
            >
              <X size={11} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
