import React from 'react';
import { CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react';
import { Task } from '../types';
import { TaskCard } from './TaskCard';
import logoSquircle from '../assets/logo-squircle.png';
import logoCircle from '../assets/logo-circle.png';
import { getISTDate } from '../utils/istTime';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  filterSection?: 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggle,
  onEdit,
  onDelete,
  filterSection = 'all'
}) => {
  const todayStr = getISTDate();
  const now = Date.now();

  const overdueTasks: Task[] = [];
  const todayTasks: Task[] = [];
  const upcomingTasks: Task[] = [];
  const completedTasks: Task[] = [];

  for (const t of tasks) {
    if (t.status === 'completed') {
      completedTasks.push(t);
      continue;
    }

    const [y, m, d] = t.date.split('-').map(Number);
    const [hh, mm] = t.time.split(':').map(Number);
    const taskDateTime = new Date(y, m - 1, d, hh, mm).getTime();

    if (t.date < todayStr || (t.date === todayStr && taskDateTime < now)) {
      overdueTasks.push(t);
    } else if (t.date === todayStr) {
      todayTasks.push(t);
    } else {
      upcomingTasks.push(t);
    }
  }

  // Sort groups
  const sortByDateTimeAsc = (a: Task, b: Task) => {
    const dtA = `${a.date} ${a.time}`;
    const dtB = `${b.date} ${b.time}`;
    return dtA.localeCompare(dtB);
  };

  const sortByCompletedDesc = (a: Task, b: Task) => {
    const cA = a.completed_at || a.created_at;
    const cB = b.completed_at || b.created_at;
    return cB.localeCompare(cA);
  };

  overdueTasks.sort(sortByDateTimeAsc);
  todayTasks.sort(sortByDateTimeAsc);
  upcomingTasks.sort(sortByDateTimeAsc);
  completedTasks.sort(sortByCompletedDesc);

  const renderSection = (title: string, count: number, items: Task[], icon: React.ReactNode, titleColor: string) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2 mb-6">
        <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${titleColor}`}>
          {icon}
          <span>{title}</span>
          <span className="bg-neutral-200 dark:bg-white/10 text-neutral-700 dark:text-white/60 px-2 py-0.5 rounded-full text-[10px] font-mono">
            {count}
          </span>
        </div>
        <div className="space-y-2">
          {items.map((t) => (
            <TaskCard key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </div>
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 px-4 border border-dashed border-[var(--border-glass)] rounded-2xl liquid-glass-card">
        <div className="w-16 h-16 rounded-[16px] overflow-hidden shadow-lg border border-white/10 mx-auto mb-4 bg-white p-0.5">
          <img src={logoSquircle} alt="RemindGo" className="w-full h-full object-cover rounded-[14px]" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-main)]">No reminders scheduled</h3>
        <p className="text-xs text-[var(--text-sub)] mt-1 max-w-sm mx-auto">
          Add tasks with exact dates and reminder times. RemindGo will alert you with audio and popups offline.
        </p>
      </div>
    );
  }

  if (filterSection === 'today') {
    return (
      <div>
        {renderSection('Today’s Tasks', todayTasks.length, todayTasks, <Clock size={14} />, 'text-[#58a6ff]')}
        {todayTasks.length === 0 && (
          <div className="text-center py-8 text-xs text-[var(--text-sub)] flex flex-col items-center gap-2.5">
            <img src={logoCircle} alt="RemindGo" className="w-9 h-9 rounded-full border border-white/10 shadow-sm" />
            <span>No tasks scheduled for today. You are all caught up!</span>
          </div>
        )}
      </div>
    );
  }

  if (filterSection === 'upcoming') {
    return (
      <div>
        {renderSection('Upcoming Tasks', upcomingTasks.length, upcomingTasks, <Calendar size={14} />, 'text-[#bc8cff]')}
        {upcomingTasks.length === 0 && (
          <div className="text-center py-8 text-xs text-neutral-500 dark:text-[#8b949e]">No upcoming tasks scheduled yet.</div>
        )}
      </div>
    );
  }

  if (filterSection === 'overdue') {
    return (
      <div>
        {renderSection('Overdue Tasks', overdueTasks.length, overdueTasks, <AlertCircle size={14} />, 'text-[#f85149]')}
        {overdueTasks.length === 0 && (
          <div className="text-center py-8 text-xs text-neutral-500 dark:text-[#8b949e]">No overdue tasks! You are all caught up.</div>
        )}
      </div>
    );
  }

  if (filterSection === 'completed') {
    return (
      <div>
        {renderSection('Completed Tasks', completedTasks.length, completedTasks, <CheckCircle size={14} />, 'text-[#0a84ff]')}
        {completedTasks.length === 0 && (
          <div className="text-center py-8 text-xs text-neutral-500 dark:text-[#8b949e]">No completed tasks yet. Finish a task to build your streak!</div>
        )}
      </div>
    );
  }

  // All grouped
  return (
    <div>
      {renderSection('Overdue', overdueTasks.length, overdueTasks, <AlertCircle size={14} />, 'text-[#f85149]')}
      {renderSection('Today', todayTasks.length, todayTasks, <Clock size={14} />, 'text-[#58a6ff]')}
      {renderSection('Upcoming', upcomingTasks.length, upcomingTasks, <Calendar size={14} />, 'text-[#bc8cff]')}
      {renderSection('Completed', completedTasks.length, completedTasks, <CheckCircle size={14} />, 'text-[#0a84ff]')}
    </div>
  );
};
