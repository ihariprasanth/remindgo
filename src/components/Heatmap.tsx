import React, { useState, useMemo } from 'react';
import { format, subWeeks, startOfWeek, addDays, parseISO } from 'date-fns';
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

export const Heatmap: React.FC<HeatmapProps> = ({ tasks = [], leetCodeData, onSelectDate, selectedDate, mode = 'all' }) => {
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

  // Compute 52-53 weeks of days
  const { weeks, monthLabels, totalCount } = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    if (viewMode === 'currentYear') {
      const year = now.getFullYear();
      const firstDayOfYear = new Date(year, 0, 1);
      startDate = startOfWeek(firstDayOfYear, { weekStartsOn: 0 });
    } else {
      const past = subWeeks(now, 52);
      startDate = startOfWeek(past, { weekStartsOn: 0 });
    }

    const calculatedWeeks: CellData[][] = [];
    const months: { label: string; colIndex: number }[] = [];
    let currentIterDate = startDate;
    let lastMonth = -1;
    let runningTotal = 0;

    for (let w = 0; w < 53; w++) {
      const weekDays: CellData[] = [];
      let weekHasFirstDayOfMonth = false;
      let monthLabel = '';

      for (let d = 0; d < 7; d++) {
        const dateStr = format(currentIterDate, 'yyyy-MM-dd');
        const tCount = taskMap.get(dateStr) || 0;
        const lCount = leetCodeMap.get(dateStr) || 0;

        let displayCount = 0;
        if (dataSource === 'tasks') displayCount = tCount;
        else if (dataSource === 'leetcode') displayCount = lCount;
        else displayCount = tCount + lCount;

        runningTotal += displayCount;

        let level = 0;
        if (displayCount === 1) level = 1;
        else if (displayCount >= 2 && displayCount <= 3) level = 2;
        else if (displayCount >= 4 && displayCount <= 6) level = 3;
        else if (displayCount >= 7) level = 4;

        weekDays.push({
          date: currentIterDate,
          dateStr,
          count: displayCount,
          level,
          taskCount: tCount,
          leetcodeCount: lCount
        });

        const month = currentIterDate.getMonth();
        if (month !== lastMonth && currentIterDate.getDate() <= 7) {
          weekHasFirstDayOfMonth = true;
          monthLabel = format(currentIterDate, 'MMM');
          lastMonth = month;
        }

        currentIterDate = addDays(currentIterDate, 1);
      }

      if (weekHasFirstDayOfMonth && monthLabel) {
        months.push({ label: monthLabel, colIndex: w });
      }

      calculatedWeeks.push(weekDays);

      if (viewMode === 'currentYear' && currentIterDate.getFullYear() > now.getFullYear()) {
        break;
      }
    }

    return { weeks: calculatedWeeks, monthLabels: months, totalCount: runningTotal };
  }, [taskMap, leetCodeMap, viewMode, dataSource]);

  const getCellColor = (level: number, isSelected: boolean) => {
    if (isSelected) {
      return 'bg-[#22c55e] border-[#16a34a] shadow-[0_0_10px_#22c55e] scale-110';
    }
    switch (level) {
      case 1:
        return 'bg-[#9be9a8] border-[#7bc96f]/60 dark:bg-[#0e4429] dark:border-[#006d32]/60 hover:border-[#22c55e]';
      case 2:
        return 'bg-[#40c463] border-[#30a14e]/60 dark:bg-[#006d32] dark:border-[#26a641]/60 hover:border-[#22c55e] shadow-[0_0_4px_rgba(38,166,65,0.3)]';
      case 3:
        return 'bg-[#30a14e] border-[#216e39]/70 dark:bg-[#26a641] dark:border-[#39d353]/60 hover:border-[#22c55e] shadow-[0_0_6px_rgba(46,160,67,0.5)]';
      case 4:
        return 'bg-[#216e39] border-[#19582d] dark:bg-[#39d353] dark:border-[#56e36d] hover:border-emerald-400 shadow-[0_0_8px_rgba(57,211,83,0.7)]';
      case 0:
      default:
        return 'bg-neutral-200/70 border-neutral-300/80 hover:border-neutral-400 dark:bg-white/[0.05] dark:border-white/[0.06] dark:hover:border-white/30';
    }
  };

  return (
    <div className="liquid-glass-card rounded-2xl p-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-neutral-900 dark:text-white tracking-wide">
            {mode === 'tasks-only'
              ? `${totalCount} task completion${totalCount === 1 ? '' : 's'}`
              : mode === 'leetcode-only'
              ? `${totalCount} submission${totalCount === 1 ? '' : 's'}`
              : `${totalCount} contribution${totalCount === 1 ? '' : 's'}`}{' '}
            in {viewMode === 'currentYear' ? new Date().getFullYear() : 'the last year'}
          </span>
          {mode === 'all' && leetCodeData && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f59e0b]/15 text-[#b45309] dark:text-[#f59e0b] border border-[#f59e0b]/30">
              +{leetCodeData.totalSolved} LeetCode
            </span>
          )}
        </div>

        {/* Data Source & Year Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source filter - only visible when mode is 'all' */}
          {mode === 'all' && leetCodeData && (
            <div className="flex items-center bg-neutral-200/70 dark:bg-black/40 p-1 rounded-xl border border-neutral-300/80 dark:border-white/10 text-xs">
              <button
                onClick={() => setDataSource('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  dataSource === 'all'
                    ? 'bg-white dark:bg-white/15 text-neutral-900 dark:text-white font-medium shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-white/50 dark:hover:text-white'
                }`}
              >
                <Sparkles size={11} /> All
              </button>
              <button
                onClick={() => setDataSource('tasks')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  dataSource === 'tasks'
                    ? 'bg-white dark:bg-white/15 text-neutral-900 dark:text-white font-medium shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-white/50 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 size={11} /> Tasks
              </button>
              <button
                onClick={() => setDataSource('leetcode')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  dataSource === 'leetcode'
                    ? 'bg-white dark:bg-white/15 text-neutral-900 dark:text-white font-medium shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-white/50 dark:hover:text-white'
                }`}
              >
                <Code2 size={11} /> LeetCode
              </button>
            </div>
          )}

          {/* Time range toggle */}
          <div className="flex items-center bg-neutral-200/70 dark:bg-black/40 p-1 rounded-xl border border-neutral-300/80 dark:border-white/10 text-xs">
            <button
              onClick={() => setViewMode('last12Months')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'last12Months'
                  ? 'bg-white dark:bg-white/15 text-neutral-900 dark:text-white font-medium shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-white/50 dark:hover:text-white'
              }`}
            >
              12 Months
            </button>
            <button
              onClick={() => setViewMode('currentYear')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'currentYear'
                  ? 'bg-white dark:bg-white/15 text-neutral-900 dark:text-white font-medium shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-white/50 dark:hover:text-white'
              }`}
            >
              {new Date().getFullYear()}
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap Grid Container */}
      <div className="overflow-x-auto pb-2 relative">
        <div className="inline-block min-w-full">
          {/* Month labels header */}
          <div className="flex ml-8 mb-2 h-4 relative text-[11px] text-neutral-500 dark:text-white/40 font-mono">
            {monthLabels.map((m, idx) => (
              <span
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${m.colIndex * 15}px`
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid with Day Labels */}
          <div className="flex">
            {/* Day Labels (Mon, Wed, Fri) */}
            <div className="flex flex-col justify-between text-[10px] text-neutral-500 dark:text-white/40 font-mono pr-2.5 h-[104px] pt-[15px] pb-[4px]">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            {/* Week Columns */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px]">
                  {week.map((cell, dIdx) => {
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
          </div>
        </div>
      </div>

      {/* Footer: Legend & Day Filter Reset */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-white/[0.08] mt-3 text-xs text-neutral-600 dark:text-white/50">
        <div>
          {selectedDate && (
            <button
              onClick={() => onSelectDate?.('')}
              className="text-[#0a84ff] dark:text-[#58a6ff] hover:underline flex items-center gap-1 font-medium"
            >
              Showing items for {selectedDate} • Clear filter
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto text-[11px]">
          <span>Less</span>
          <span className="w-[11px] h-[11px] rounded-[3px] bg-neutral-200 dark:bg-white/[0.05] border border-neutral-300 dark:border-white/[0.08]" />
          <span className="w-[11px] h-[11px] rounded-[3px] bg-[#9be9a8] dark:bg-[#0e4429] border border-[#7bc96f] dark:border-[#006d32]" />
          <span className="w-[11px] h-[11px] rounded-[3px] bg-[#40c463] dark:bg-[#006d32] border border-[#30a14e] dark:border-[#26a641]" />
          <span className="w-[11px] h-[11px] rounded-[3px] bg-[#30a14e] dark:bg-[#26a641] border border-[#216e39] dark:border-[#39d353]" />
          <span className="w-[11px] h-[11px] rounded-[3px] bg-[#216e39] dark:bg-[#39d353] border border-[#19582d] dark:border-[#56e36d] shadow-[0_0_4px_#39d353]" />
          <span>More</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (() => {
        const isNearTop = hoveredCell.y < 90;
        const safeX = typeof window !== 'undefined' 
          ? Math.max(120, Math.min(hoveredCell.x, window.innerWidth - 120))
          : hoveredCell.x;
        const safeY = isNearTop ? hoveredCell.y + 20 : hoveredCell.y - 10;

        return (
          <div
            className={`fixed z-50 transform -translate-x-1/2 ${
              isNearTop ? '' : '-translate-y-full'
            } pointer-events-none bg-[#0d1117] text-white text-xs px-3.5 py-2 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.8)] border border-white/20 whitespace-nowrap text-center font-sans transition-opacity`}
            style={{
              left: `${safeX}px`,
              top: `${safeY}px`
            }}
          >
            <div className="font-bold text-[#39d353]">
              {mode === 'tasks-only'
                ? hoveredCell.cell.taskCount === 0
                  ? 'No tasks completed'
                  : `${hoveredCell.cell.taskCount} task${hoveredCell.cell.taskCount === 1 ? '' : 's'} completed`
                : mode === 'leetcode-only'
                ? hoveredCell.cell.leetcodeCount === 0
                  ? 'No submissions'
                  : `${hoveredCell.cell.leetcodeCount} LeetCode submission${hoveredCell.cell.leetcodeCount === 1 ? '' : 's'}`
                : hoveredCell.cell.count === 0
                ? 'No activity'
                : `${hoveredCell.cell.count} total contribution${hoveredCell.cell.count === 1 ? '' : 's'}`}
            </div>
            <div className="text-white/60 text-[11px] font-mono mt-0.5">
              {format(hoveredCell.cell.date, 'EEEE, MMM d, yyyy')}
            </div>
            {mode === 'all' && (hoveredCell.cell.taskCount > 0 || hoveredCell.cell.leetcodeCount > 0) && (
              <div className="text-[10px] text-white/50 pt-1 border-t border-white/10 mt-1 flex justify-center gap-3 font-mono">
                <span>Tasks: <strong className="text-white">{hoveredCell.cell.taskCount}</strong></span>
                <span>LeetCode: <strong className="text-[#f59e0b]">{hoveredCell.cell.leetcodeCount}</strong></span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
