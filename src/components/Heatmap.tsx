import React, { useState, useMemo } from 'react';
import { format, subWeeks, startOfWeek, addDays, parseISO } from 'date-fns';
import { Task, LeetCodeData } from '../types';
import { Sparkles, Code2, CheckCircle2 } from 'lucide-react';

interface HeatmapProps {
  tasks: Task[];
  leetCodeData?: LeetCodeData | null;
  onSelectDate?: (dateStr: string) => void;
  selectedDate?: string | null;
}

interface CellData {
  date: Date;
  dateStr: string;
  count: number;
  level: number;
  taskCount: number;
  leetcodeCount: number;
}

export const Heatmap: React.FC<HeatmapProps> = ({ tasks, leetCodeData, onSelectDate, selectedDate }) => {
  const [viewMode, setViewMode] = useState<'last12Months' | 'currentYear'>('last12Months');
  const [dataSource, setDataSource] = useState<'all' | 'tasks' | 'leetcode'>('all');
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
      return 'bg-[#38bdf8] border-[#38bdf8] shadow-[0_0_10px_#38bdf8] scale-110';
    }
    switch (level) {
      case 1:
        return 'bg-[#0d2744] border-[#163a66]/60 hover:border-[#38bdf8]';
      case 2:
        return 'bg-[#134982] border-[#1a5b9e]/60 hover:border-[#38bdf8] shadow-[0_0_4px_rgba(19,73,130,0.5)]';
      case 3:
        return 'bg-[#1d6fd8] border-[#2684fc] hover:border-white shadow-[0_0_6px_rgba(29,111,216,0.6)]';
      case 4:
        return 'bg-[#0a84ff] border-[#38bdf8] hover:border-white shadow-[0_0_10px_rgba(10,132,255,0.85)]';
      case 0:
      default:
        return 'bg-white/[0.04] border-white/[0.06] hover:border-white/30';
    }
  };

  return (
    <div className="liquid-glass-card rounded-2xl p-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white tracking-wide">
            {totalCount} contribution{totalCount === 1 ? '' : 's'} in{' '}
            {viewMode === 'currentYear' ? new Date().getFullYear() : 'the last year'}
          </span>
          {leetCodeData && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30">
              +{leetCodeData.totalSolved} LeetCode
            </span>
          )}
        </div>

        {/* Data Source & Year Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source filter */}
          {leetCodeData && (
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setDataSource('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  dataSource === 'all'
                    ? 'bg-white/15 text-white font-medium shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Sparkles size={11} /> All
              </button>
              <button
                onClick={() => setDataSource('tasks')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  dataSource === 'tasks'
                    ? 'bg-white/15 text-white font-medium shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <CheckCircle2 size={11} /> Tasks
              </button>
              <button
                onClick={() => setDataSource('leetcode')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  dataSource === 'leetcode'
                    ? 'bg-white/15 text-white font-medium shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Code2 size={11} /> LeetCode
              </button>
            </div>
          )}

          {/* Time range toggle */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setViewMode('last12Months')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'last12Months'
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              12 Months
            </button>
            <button
              onClick={() => setViewMode('currentYear')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'currentYear'
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-white/50 hover:text-white'
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
          <div className="flex ml-8 mb-2 h-4 relative text-[11px] text-white/40 font-mono">
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
            <div className="flex flex-col justify-between text-[10px] text-white/40 font-mono pr-2.5 h-[104px] pt-[15px] pb-[4px]">
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
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] mt-3 text-xs text-white/50">
        <div>
          {selectedDate && (
            <button
              onClick={() => onSelectDate?.('')}
              className="text-[#58a6ff] hover:underline flex items-center gap-1 font-medium"
            >
              Showing items for {selectedDate} • Clear filter
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto text-[11px]">
          <span>Less</span>
          <span className="w-[11px] h-[11px] rounded-[3px] bg-white/[0.05] border border-white/[0.08]" />
          <span className="w-[11px] h-[11px] rounded-[3px] bg-[#0d2744] border border-[#163a66]" />
          <span className="w-[11px] h-[11px] rounded-[3px] bg-[#134982] border border-[#1a5b9e]" />
          <span className="w-[11px] h-[11px] rounded-[3px] bg-[#1d6fd8] border border-[#2684fc]" />
          <span className="w-[11px] h-[11px] rounded-[3px] bg-[#0a84ff] border border-[#38bdf8] shadow-[0_0_4px_#0a84ff]" />
          <span>More</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-2 pointer-events-none liquid-glass-pill text-white text-xs px-3 py-2 rounded-xl shadow-2xl whitespace-nowrap border border-white/20"
          style={{
            left: `${hoveredCell.x}px`,
            top: `${hoveredCell.y - 8}px`
          }}
        >
          <div className="font-semibold text-[#38bdf8]">
            {hoveredCell.cell.count === 0
              ? 'No activity'
              : `${hoveredCell.cell.count} total contribution${hoveredCell.cell.count === 1 ? '' : 's'}`}
          </div>
          <div className="text-white/60 text-[11px]">
            on {format(hoveredCell.cell.date, 'MMM d, yyyy')}
          </div>
          {(hoveredCell.cell.taskCount > 0 || hoveredCell.cell.leetcodeCount > 0) && (
            <div className="text-[10px] text-white/50 pt-1 border-t border-white/10 mt-1 flex gap-2">
              <span>Tasks: {hoveredCell.cell.taskCount}</span>
              <span>LeetCode: {hoveredCell.cell.leetcodeCount}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
