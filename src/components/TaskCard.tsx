import React from 'react';
import { format, parseISO } from 'date-fns';
import { Check, Clock, Repeat, Edit2, Trash2, Bell, AlertTriangle } from 'lucide-react';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onEdit, onDelete }) => {
  const isCompleted = task.status === 'completed';

  let isOverdue = false;
  try {
    if (!isCompleted) {
      const [y, m, d] = task.date.split('-').map(Number);
      const [hh, mm] = task.time.split(':').map(Number);
      const taskDateTime = new Date(y, m - 1, d, hh, mm);
      if (taskDateTime.getTime() < Date.now()) {
        isOverdue = true;
      }
    }
  } catch {
    // ignore
  }

  const priorityBadge = () => {
    switch (task.priority) {
      case 'high':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#f43f5e]/15 text-[#f43f5e] border border-[#f43f5e]/30">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30">
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#58a6ff]/15 text-[#58a6ff] border border-[#58a6ff]/30">
            Low
          </span>
        );
    }
  };

  return (
    <div
      className={`group relative rounded-2xl p-4 transition-all liquid-glass-card ${
        isCompleted
          ? 'opacity-60 bg-black/5 dark:bg-black/20 border-neutral-200 dark:border-white/[0.04]'
          : isOverdue
          ? 'border-red-500/30 bg-red-50 dark:bg-red-950/10'
          : ''
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Completion Checkbox */}
        <button
          type="button"
          onClick={() => onToggle(task.id)}
          className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
            isCompleted
              ? 'bg-[#0a84ff] border-[#38bdf8] text-white shadow-[0_0_10px_rgba(10,132,255,0.5)]'
              : 'border-neutral-300 dark:border-white/20 hover:border-[#0a84ff] bg-neutral-100 dark:bg-black/40'
          }`}
        >
          {isCompleted && <Check size={12} strokeWidth={3} />}
        </button>

        {/* Task Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <h3
              className={`text-sm font-semibold leading-tight ${
                isCompleted ? 'line-through text-neutral-400 dark:text-white/40' : 'text-neutral-900 dark:text-white'
              }`}
            >
              {task.title}
            </h3>

            {/* Category tag */}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/[0.06] text-neutral-600 dark:text-white/60 border border-neutral-200 dark:border-white/[0.08]">
              {task.category}
            </span>

            {/* Priority Badge */}
            {priorityBadge()}

            {/* Repeat indicator */}
            {task.repeat !== 'none' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#bc8cff]/15 text-[#9333ea] dark:text-[#bc8cff] border border-[#bc8cff]/30 flex items-center gap-1">
                <Repeat size={10} /> {task.repeat}
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-neutral-600 dark:text-white/50 line-clamp-2 mb-2">
              {task.description}
            </p>
          )}

          {/* Metadata footer */}
          <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-white/50 flex-wrap mt-2">
            <div
              className={`flex items-center gap-1.5 font-mono text-[11px] ${
                isOverdue ? 'text-[#f43f5e] font-semibold' : ''
              }`}
            >
              {isOverdue ? <AlertTriangle size={13} /> : <Clock size={13} className="text-[#0a84ff] dark:text-[#58a6ff]" />}
              <span>{task.date}</span>
              <span>•</span>
              <span>{task.time}</span>
            </div>

            {task.status === 'snoozed' && task.snoozed_until && (
              <div className="flex items-center gap-1 text-[#f59e0b] text-[11px] font-mono">
                <Bell size={12} />
                <span>Snoozed to {format(parseISO(task.snoozed_until), 'HH:mm')}</span>
              </div>
            )}

            {isCompleted && task.completed_at && (
              <div className="text-[11px] text-[#0a84ff]">
                Done {format(parseISO(task.completed_at), 'MMM d, HH:mm')}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            title="Edit task"
            className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:text-white/50 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            title="Delete task"
            className="p-1.5 text-neutral-400 hover:text-red-600 dark:text-white/50 dark:hover:text-red-400 hover:bg-red-500/15 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
