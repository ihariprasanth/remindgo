import React from 'react';
import { HardDrive, CheckCircle2, Code2 } from 'lucide-react';
import { Task, LeetCodeData } from '../types';

interface StatusBarProps {
  tasks: Task[];
  leetCodeData?: LeetCodeData | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({ tasks, leetCodeData }) => {
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const pendingCount = tasks.filter((t) => t.status !== 'completed').length;

  return (
    <footer className="h-7 border-t border-[var(--border-glass)] bg-[var(--status-bar-bg)] backdrop-blur-xl flex items-center justify-between px-4 text-[11px] text-[var(--text-muted)] select-none flex-shrink-0 z-20 font-mono transition-colors">
      {/* Left: Task statistics */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <CheckCircle2 size={12} className="text-[#0a84ff]" />
          <span>{completedCount} completed</span>
        </span>
        <span>•</span>
        <span>{pendingCount} pending</span>
        <span>•</span>
        <span>{tasks.length} total tasks</span>
      </div>

      {/* Center/Right: LeetCode & DB Status */}
      <div className="flex items-center gap-3">
        {leetCodeData && (
          <span className="flex items-center gap-1.5">
            <Code2 size={12} className="text-[#f59e0b]" />
            <span className="text-[var(--text-sub)] font-medium">
              @{leetCodeData.username} ({leetCodeData.totalSolved} solved)
            </span>
          </span>
        )}

        <span>•</span>

        <span className="flex items-center gap-1 text-[var(--text-sub)]">
          <HardDrive size={12} className="text-[#0a84ff]" />
          <span>SQLite Engine</span>
        </span>
      </div>
    </footer>
  );
};
