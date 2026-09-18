import React, { useState } from 'react';
import { Plus, CheckCircle2, Clock, Calendar, Sparkles } from 'lucide-react';
import { Task, LeetCodeData } from '../types';
import { Heatmap } from '../components/Heatmap';
import { StatsCard } from '../components/StatsCard';
import { TaskCard } from '../components/TaskCard';
import { getISTDate } from '../utils/istTime';

interface DashboardPageProps {
  tasks: Task[];
  leetCodeData?: LeetCodeData | null;
  onToggleTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onOpenAddTask: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  tasks,
  leetCodeData,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onOpenAddTask
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayStr = getISTDate();

  // Filter tasks if a date is selected from the heatmap
  const dateFilteredTasks = selectedDate
    ? tasks.filter((t) => {
        if (t.status === 'completed' && t.completed_at) {
          return t.completed_at.startsWith(selectedDate);
        }
        return t.date === selectedDate;
      })
    : null;

  // Today's pending tasks
  const todayPending = tasks
    .filter((t) => t.status !== 'completed' && t.date === todayStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Today's completed tasks
  const todayCompleted = tasks.filter(
    (t) => t.status === 'completed' && t.completed_at && t.completed_at.startsWith(todayStr)
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full max-w-6xl mx-auto">
      {/* Activity Heatmap Header Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-[#0a84ff]" />
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white tracking-wide">
                Productivity & Activity Heatmap
              </h2>
            </div>
            <p className="text-xs text-neutral-600 dark:text-white/50">
              Activity tracking based on your completed tasks and LeetCode submissions.
            </p>
          </div>
        </div>

        {/* Heatmap with LeetCode integration */}
        <Heatmap
          tasks={tasks}
          leetCodeData={leetCodeData}
          selectedDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(d || null)}
        />
      </div>

      {/* Streak & Metric Cards */}
      <StatsCard tasks={tasks} />

      {/* Selected Date View from Heatmap */}
      {selectedDate && dateFilteredTasks && (
        <div className="liquid-glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Calendar size={15} className="text-[#0a84ff]" />
              Activity for {selectedDate} ({dateFilteredTasks.length} task{dateFilteredTasks.length === 1 ? '' : 's'})
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs text-[#0a84ff] hover:underline cursor-pointer"
            >
              Close date view
            </button>
          </div>

          <div className="space-y-2.5">
            {dateFilteredTasks.length === 0 ? (
              <div className="text-xs text-neutral-500 dark:text-white/50 py-4 text-center">
                No tasks completed on this date.
              </div>
            ) : (
              dateFilteredTasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onToggle={onToggleTask}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Today's Agenda Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Due Tasks */}
        <div className="liquid-glass-card rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Clock size={16} className="text-[#0a84ff]" />
                Today’s Agenda
              </h3>
              <span className="text-xs font-mono text-neutral-700 dark:text-white/60 bg-neutral-200/80 dark:bg-white/10 px-2 py-0.5 rounded-full">
                {todayPending.length} pending
              </span>
            </div>

            <div className="space-y-2.5">
              {todayPending.length === 0 ? (
                <div className="text-center py-8 text-xs text-neutral-500 dark:text-white/40 border border-dashed border-neutral-300 dark:border-white/10 rounded-xl">
                  No more pending tasks for today!
                </div>
              ) : (
                todayPending.slice(0, 5).map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onToggle={onToggleTask}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                  />
                ))
              )}
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-neutral-200 dark:border-white/10">
            <button
              onClick={onOpenAddTask}
              className="w-full py-2.5 text-xs font-semibold text-[#0a84ff] hover:bg-blue-500/10 border border-dashed border-[#0a84ff]/40 hover:border-[#0a84ff] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={14} /> Add Task for Today
            </button>
          </div>
        </div>

        {/* Recently Completed */}
        <div className="liquid-glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#0a84ff]" />
              Completed Today
            </h3>
            <span className="text-xs font-mono text-neutral-700 dark:text-white/60 bg-neutral-200/80 dark:bg-white/10 px-2 py-0.5 rounded-full">
              {todayCompleted.length} finished
            </span>
          </div>

          <div className="space-y-2.5">
            {todayCompleted.length === 0 ? (
              <div className="text-center py-8 text-xs text-neutral-500 dark:text-white/40 border border-dashed border-neutral-300 dark:border-white/10 rounded-xl">
                No tasks finished yet today. Complete one to illuminate your heatmap!
              </div>
            ) : (
              todayCompleted.slice(0, 5).map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onToggle={onToggleTask}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
