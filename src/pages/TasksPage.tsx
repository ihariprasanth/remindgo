import React, { useState, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { Task } from '../types';
import { TaskList } from '../components/TaskList';
import { format } from 'date-fns';

interface TasksPageProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onOpenAddTask: () => void;
  initialFilter?: 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
}

export const TasksPage: React.FC<TasksPageProps> = ({
  tasks,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onOpenAddTask,
  initialFilter = 'all'
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const now = Date.now();

  const categories = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [tasks]);

  const tabCounts = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let upcoming = 0;
    let completed = 0;

    tasks.forEach((t) => {
      if (t.status === 'completed') {
        completed++;
        return;
      }
      const [y, m, d] = t.date.split('-').map(Number);
      const [hh, mm] = t.time.split(':').map(Number);
      const taskDateTime = new Date(y, m - 1, d, hh, mm).getTime();

      if (t.date < todayStr || (t.date === todayStr && taskDateTime < now)) {
        overdue++;
      } else if (t.date === todayStr) {
        today++;
      } else {
        upcoming++;
      }
    });

    return {
      all: tasks.length,
      today,
      upcoming,
      overdue,
      completed
    };
  }, [tasks, todayStr, now]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (activeTab === 'today' && (t.status === 'completed' || t.date !== todayStr)) return false;
      if (activeTab === 'completed' && t.status !== 'completed') return false;
      if (activeTab === 'overdue') {
        if (t.status === 'completed') return false;
        const [y, m, d] = t.date.split('-').map(Number);
        const [hh, mm] = t.time.split(':').map(Number);
        const dt = new Date(y, m - 1, d, hh, mm).getTime();
        if (t.date > todayStr || (t.date === todayStr && dt >= now)) return false;
      }
      if (activeTab === 'upcoming') {
        if (t.status === 'completed') return false;
        const [y, m, d] = t.date.split('-').map(Number);
        const [hh, mm] = t.time.split(':').map(Number);
        const dt = new Date(y, m - 1, d, hh, mm).getTime();
        if (t.date < todayStr || (t.date === todayStr && dt < now)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchCat = t.category.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }

      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;

      return true;
    });
  }, [tasks, activeTab, searchQuery, selectedCategory, selectedPriority, todayStr, now]);

  const tabs = [
    { id: 'all' as const, label: 'All Tasks', count: tabCounts.all },
    { id: 'today' as const, label: 'Today', count: tabCounts.today, color: 'text-[#58a6ff]' },
    { id: 'upcoming' as const, label: 'Upcoming', count: tabCounts.upcoming, color: 'text-[#bc8cff]' },
    { id: 'overdue' as const, label: 'Overdue', count: tabCounts.overdue, color: 'text-[#f43f5e]' },
    { id: 'completed' as const, label: 'Completed', count: tabCounts.completed, color: 'text-[#0a84ff]' },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full max-w-5xl mx-auto">
      {/* Title & Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white tracking-wide">Task & Reminder Manager</h2>
          <p className="text-xs text-neutral-600 dark:text-white/50">
            Schedule exact alarms and manage your productivity
          </p>
        </div>

        <button
          onClick={onOpenAddTask}
          className="flex items-center gap-2 bg-gradient-to-r from-[#0a84ff] to-[#0066d6] hover:from-[#389eff] hover:to-[#0a84ff] text-white py-2.5 px-4 rounded-xl text-xs font-semibold shadow-[0_4px_16px_rgba(10,132,255,0.35)] transition-all cursor-pointer border border-white/15"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl liquid-glass-pill overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'liquid-glass-active-pill font-semibold'
                  : 'text-neutral-600 dark:text-white/60 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.05]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-[#0a84ff]/20 text-[#0a84ff]' : 'bg-neutral-200 dark:bg-white/10 text-neutral-700 dark:text-white/60'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Category Filter Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3.5 top-3 text-neutral-400 dark:text-white/40" />
          <input
            type="text"
            placeholder="Search tasks by title, category, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/15 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-white/40 focus:outline-none focus:border-[#0a84ff]"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-neutral-600 dark:text-white/50">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#0a84ff]"
          >
            <option value="all" className="bg-white text-neutral-900 dark:bg-[#141414] dark:text-white">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c} className="bg-white text-neutral-900 dark:bg-[#141414] dark:text-white">
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-neutral-600 dark:text-white/50">Priority:</span>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#0a84ff]"
          >
            <option value="all" className="bg-white text-neutral-900 dark:bg-[#141414] dark:text-white">All Priorities</option>
            <option value="high" className="bg-white text-neutral-900 dark:bg-[#141414] dark:text-white">High</option>
            <option value="medium" className="bg-white text-neutral-900 dark:bg-[#141414] dark:text-white">Medium</option>
            <option value="low" className="bg-white text-neutral-900 dark:bg-[#141414] dark:text-white">Low</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <TaskList
        tasks={filteredTasks}
        onToggle={onToggleTask}
        onEdit={onEditTask}
        onDelete={onDeleteTask}
        filterSection={activeTab}
      />
    </div>
  );
};
