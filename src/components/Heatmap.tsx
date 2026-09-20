import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Task, LeetCodeData } from '../types';
import { Sparkles, Code2, CheckCircle2 } from 'lucide-react';

interface HeatmapProps {
  tasks?: Task[];
  leetCodeData?: LeetCodeData | null;
  onSelectDate?: (dateStr: string) => void;
  selectedDate?: string | null;
  mode?: 'tasks-only' | 'leetcode-only' | 'all';
}

interface CellData {
  date: Date;
  dateStr: string;
  count: number;
  level: number;
  taskCount: number;
  leetcodeCount: number;
}

interface MonthCluster {
  monthName: string;
  year: number;
  monthIndex: number;
  weeks: (CellData | null)[][]; // Array of 7-day columns (0=Sun .. 6=Sat). null indicates out-of-month or future day
}

export const Heatmap: React.FC<HeatmapProps> = ({
  tasks = [],
  leetCodeData,
  onSelectDate,
  selectedDate,
  mode = 'all'
}) => {
  const [viewMode, setViewMode] = useState<'last12Months' | 'currentYear'>('last12Months');
  const [dataSource, setDataSource] = useState<'all' | 'tasks' | 'leetcode'>(
    mode === 'tasks-only' ? 'tasks' : mode === 'leetcode-only' ? 'leetcode' : 'all'
  );

  const [hoveredCell, setHoveredCell] = useState<{
    cell: CellData;
    x: number;
    y: number;
  } | null>(null);

  // Map of completed_at date (YYYY-MM-DD) -> task count
  const taskMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks) {
      if (task.status === 'completed' && task.completed_at) {
        try {
          const dateStr = format(parseISO(task.completed_at), 'yyyy-MM-dd');
          map.set(dateStr, (map.get(dateStr) || 0) + 1);
        } catch {
          // ignore
        }
      }
    }
    return map;
  }, [tasks]);

  // Map of LeetCode submissionCalendar (unix timestamp seconds) -> count
  const leetCodeMap = useMemo(() => {
    const map = new Map<string, number>();
    if (leetCodeData?.submissionCalendar) {
      for (const [timestampStr, count] of Object.entries(leetCodeData.submissionCalendar)) {
        try {
          const ts = parseInt(timestampStr, 10);
          if (!isNaN(ts)) {
            const dateStr = format(new Date(ts * 1000), 'yyyy-MM-dd');
            map.set(dateStr, (map.get(dateStr) || 0) + count);
          }
        } catch {
          // ignore
        }
      }
    }
    return map;
  }, [leetCodeData]);

  // Generate LeetCode-style monthly clusters up to today
  const { clusters, totalCount, activeDays, maxStreak } = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    let total = 0;
    let active = 0;
    const generatedClusters: MonthCluster[] = [];

    // Calculate month range
    let startMonthDate: Date;
    let endMonthDate = now;

    if (viewMode === 'currentYear') {
      startMonthDate = new Date(now.getFullYear(), 0, 1);
    } else {
      // Past 12-13 months (e.g. Sep 2025 to Sep 2026)
      startMonthDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    }

    // Determine total number of months to iterate
    const totalMonths =
      (endMonthDate.getFullYear() - startMonthDate.getFullYear()) * 12 +
      (endMonthDate.getMonth() - startMonthDate.getMonth()) +
      1;

    for (let m = 0; m < totalMonths; m++) {
      const curMonthDate = new Date(startMonthDate.getFullYear(), startMonthDate.getMonth() + m, 1);
      const year = curMonthDate.getFullYear();
      const month = curMonthDate.getMonth();
      const monthName = format(curMonthDate, 'MMM');

      const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
      // If current month, only go up to today; otherwise, last day of month
      const lastDayOfMonth = isCurrentMonth ? now.getDate() : new Date(year, month + 1, 0).getDate();

      const weeks: (CellData | null)[][] = [];
      let currentWeek: (CellData | null)[] = new Array(7).fill(null);

      for (let dayNum = 1; dayNum <= lastDayOfMonth; dayNum++) {
        const dayDate = new Date(year, month, dayNum);
        const dayOfWeek = dayDate.getDay(); // 0 = Sun, 6 = Sat
        const dateStr = format(dayDate, 'yyyy-MM-dd');

        const tCount = taskMap.get(dateStr) || 0;
        const lCount = leetCodeMap.get(dateStr) || 0;

        let displayCount = 0;
        if (dataSource === 'tasks') displayCount = tCount;
        else if (dataSource === 'leetcode') displayCount = lCount;
        else displayCount = tCount + lCount;

        if (displayCount > 0) active++;
        total += displayCount;

        let level = 0;
        if (displayCount === 1) level = 1;
        else if (displayCount >= 2 && displayCount <= 3) level = 2;
        else if (displayCount >= 4 && displayCount <= 6) level = 3;
        else if (displayCount >= 7) level = 4;

        currentWeek[dayOfWeek] = {
          date: dayDate,
          dateStr,
          count: displayCount,
          level,
          taskCount: tCount,
          leetcodeCount: lCount
        };

        // If Saturday or last day of this month slice, push week column
        if (dayOfWeek === 6 || dayNum === lastDayOfMonth) {
          weeks.push(currentWeek);
          currentWeek = new Array(7).fill(null);
        }
      }

      generatedClusters.push({
        monthName,
        year,
        monthIndex: month,
        weeks
      });
    }

    // Calculate max consecutive streak across the past 365 days
    let max = 0;
    let temp = 0;
    for (let i = 365; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = format(d, 'yyyy-MM-dd');
      const tCount = taskMap.get(dStr) || 0;
      const lCount = leetCodeMap.get(dStr) || 0;
      const c = dataSource === 'tasks' ? tCount : dataSource === 'leetcode' ? lCount : tCount + lCount;

      if (c > 0) {
        temp++;
        if (temp > max) max = temp;
      } else {
        temp = 0;
      }
    }

    return {
      clusters: generatedClusters,
      totalCount: total,
      activeDays: active,
      maxStreak: max
    };
  }, [taskMap, leetCodeMap, viewMode, dataSource]);

  // Authentic LeetCode Emerald Color Palette
  const getCellColor = (level: number, isSelected: boolean) => {
    if (isSelected) {
      return 'bg-[#39d353] border-white ring-2 ring-white/50 scale-110';
    }
    switch (level) {
      case 1:
        return 'bg-[#0e4429] border-[#006d32]/50 hover:brightness-125';
      case 2:
        return 'bg-[#006d32] border-[#26a641]/60 hover:brightness-125';
      case 3:
        return 'bg-[#26a641] border-[#39d353]/70 hover:brightness-125';
      case 4:
        return 'bg-[#39d353] border-[#56e36d] shadow-[0_0_6px_rgba(57,211,83,0.4)] hover:brightness-125';
      case 0:
      default:
        return 'bg-[#282828] border-white/[0.04] hover:border-white/20';
    }
  };

  return (
    <div className="liquid-glass-card rounded-2xl p-6 bg-[#161616]/95 border border-white/[0.08] shadow-2xl relative font-sans">
      {/* Header with authentic LeetCode Stats bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.06]">
        {/* Left: Submissions in the past one year */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-white tracking-tight font-sans">
            {totalCount}
          </span>
          <span className="text-sm text-[#8b949e] font-normal">
            {mode === 'tasks-only'
              ? 'tasks in the past one year'
              : mode === 'leetcode-only'
              ? 'submissions in the past one year'
              : 'submissions in the past one year'}
          </span>
          <span
            className="w-4 h-4 rounded-full bg-white/[0.08] text-[#8b949e] text-[10px] flex items-center justify-center cursor-pointer hover:text-white"
            title="Activity tracked across the past 365 days"
          >
            i
          </span>
        </div>

        {/* Right: Active Days, Max Streak, & Controls */}
        <div className="flex items-center gap-4 flex-wrap text-xs text-[#8b949e]">
          <div className="flex items-center gap-4 mr-2">
            <span>
              Total active days: <strong className="text-white font-semibold font-mono">{activeDays}</strong>
            </span>
            <span>
              Max streak: <strong className="text-white font-semibold font-mono">{maxStreak}</strong>
            </span>
          </div>

          {/* Source Filter - if in 'all' mode */}
          {mode === 'all' && leetCodeData && (
            <div className="flex items-center bg-[#212121] p-0.5 rounded-lg border border-white/[0.08]">
              <button
                onClick={() => setDataSource('all')}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                  dataSource === 'all'
                    ? 'bg-white/15 text-white font-medium shadow-sm'
                    : 'text-[#8b949e] hover:text-white'
                }`}
              >
                <Sparkles size={10} /> All
              </button>
              <button
                onClick={() => setDataSource('tasks')}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                  dataSource === 'tasks'
                    ? 'bg-white/15 text-white font-medium shadow-sm'
                    : 'text-[#8b949e] hover:text-white'
                }`}
              >
                <CheckCircle2 size={10} /> Tasks
              </button>
              <button
                onClick={() => setDataSource('leetcode')}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                  dataSource === 'leetcode'
                    ? 'bg-white/15 text-white font-medium shadow-sm'
                    : 'text-[#8b949e] hover:text-white'
                }`}
              >
                <Code2 size={10} /> LeetCode
              </button>
            </div>
          )}

          {/* Time View Toggle */}
          <div className="flex items-center bg-[#212121] p-0.5 rounded-lg border border-white/[0.08] text-[11px]">
            <button
              onClick={() => setViewMode('last12Months')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'last12Months'
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => setViewMode('currentYear')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'currentYear'
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              {new Date().getFullYear()}
            </button>
          </div>
        </div>
      </div>

      {/* LeetCode Monthly Clustered Grid */}
      <div className="overflow-x-auto pb-2 relative scrollbar-thin">
        <div className="inline-flex items-start gap-3 sm:gap-3.5 pt-1 pb-2">
          {clusters.map((cluster, cIdx) => (
            <div key={cIdx} className="flex flex-col items-center">
              {/* Week columns for this month */}
              <div className="flex gap-[3px]">
                {cluster.weeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-[3px]">
                    {week.map((cell, dIdx) => {
                      if (!cell) {
                        // Invisible placeholder preserving Sun-Sat row alignment
                        return (
                          <div
                            key={dIdx}
                            className="w-[12px] h-[12px] rounded-[3px] opacity-0 pointer-events-none"
                          />
                        );
                      }

                      const isSelected = selectedDate === cell.dateStr;
                      return (
                        <div
                          key={dIdx}
                          onClick={() => onSelectDate?.(cell.dateStr)}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredCell({
                              cell,
                              x: rect.left + rect.width / 2,
                              y: rect.top
                            });
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`w-[12px] h-[12px] rounded-[3px] border transition-all cursor-pointer ${getCellColor(
                            cell.level,
                            isSelected
                          )}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Month label below cluster */}
              <span className="mt-2.5 text-[11px] text-[#8b949e] font-sans font-medium select-none">
                {cluster.monthName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: Filter & Legend */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] mt-2 text-xs text-[#8b949e]">
        <div>
          {selectedDate && (
            <button
              onClick={() => onSelectDate?.('')}
              className="text-[#58a6ff] hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              Showing items for {selectedDate} • Clear filter
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto text-[11px]">
          <span>Less</span>
          <span className="w-[10px] h-[10px] rounded-[2px] bg-[#282828] border border-white/[0.04]" />
          <span className="w-[10px] h-[10px] rounded-[2px] bg-[#0e4429] border border-[#006d32]/50" />
          <span className="w-[10px] h-[10px] rounded-[2px] bg-[#006d32] border border-[#26a641]/60" />
          <span className="w-[10px] h-[10px] rounded-[2px] bg-[#26a641] border border-[#39d353]/70" />
          <span className="w-[10px] h-[10px] rounded-[2px] bg-[#39d353] border border-[#56e36d] shadow-[0_0_4px_#39d353]" />
          <span>More</span>
        </div>
      </div>

      {/* LeetCode Reference Floating Tooltip Pill */}
      {hoveredCell && (
        <div
          style={{
            left: `${hoveredCell.x}px`,
            top: `${hoveredCell.y - 8}px`
          }}
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full pointer-events-none bg-[#1f1f1f] border border-white/20 text-white text-xs px-3 py-1.5 rounded-lg shadow-2xl font-sans whitespace-nowrap"
        >
          <span className="font-semibold">
            {hoveredCell.cell.count === 0
              ? `No ${dataSource === 'leetcode' ? 'submissions' : 'tasks'}`
              : `${hoveredCell.cell.count} ${
                  dataSource === 'leetcode'
                    ? hoveredCell.cell.count === 1
                      ? 'submission'
                      : 'submissions'
                    : hoveredCell.cell.count === 1
                    ? 'task'
                    : 'tasks'
                }`}
          </span>
          <span className="text-[#8b949e]"> on {format(hoveredCell.cell.date, 'MMM d, yyyy')}</span>
        </div>
      )}
    </div>
  );
};
