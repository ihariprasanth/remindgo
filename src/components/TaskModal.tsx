import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Repeat, Tag, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { Task, TaskPriority, TaskRepeat } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id' | 'created_at' | 'status'> & { id?: string }) => void;
  initialTask?: Task | null;
  prefill?: { title?: string; description?: string; category?: string; priority?: TaskPriority };
}

const CATEGORIES = ['General', 'Study', 'Work', 'Personal', 'Health', 'Finance', 'Projects'];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
  prefill
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [repeat, setRepeat] = useState<TaskRepeat>('none');

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      if (CATEGORIES.includes(initialTask.category)) {
        setCategory(initialTask.category);
        setCustomCategory('');
      } else {
        setCategory('Other');
        setCustomCategory(initialTask.category);
      }
      setDate(initialTask.date);
      setTime(initialTask.time);
      setPriority(initialTask.priority || 'medium');
      setRepeat(initialTask.repeat || 'none');
    } else {
      const now = new Date();
      setDate(format(now, 'yyyy-MM-dd'));
      now.setMinutes(now.getMinutes() + 15);
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hours}:${minutes}`);

      setTitle(prefill?.title || '');
      setDescription(prefill?.description || '');
      setCategory(prefill?.category || 'General');
      setCustomCategory('');
      setPriority(prefill?.priority || 'medium');
      setRepeat('none');
    }
  }, [initialTask, prefill, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) return;

    const finalCategory = category === 'Other' && customCategory.trim() ? customCategory.trim() : category;

    onSave({
      ...(initialTask ? { id: initialTask.id } : {}),
      title: title.trim(),
      description: description.trim(),
      category: finalCategory,
      date,
      time,
      priority,
      repeat
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl border border-neutral-200 dark:border-white/15 rounded-3xl w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.25)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-white/10">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white tracking-wide">
            {initialTask ? 'Edit Task & Reminder' : 'Create New Task & Reminder'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:text-white/70 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-white/60 mb-1.5">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Solve LeetCode daily problem"
              className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-white/30 focus:outline-none focus:border-[#0a84ff] focus:ring-1 focus:ring-[#0a84ff]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-white/60 mb-1.5">
              Description (optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Extra details, links, or notes..."
              className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/15 rounded-xl px-3.5 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-white/30 focus:outline-none focus:border-[#0a84ff] focus:ring-1 focus:ring-[#0a84ff] resize-none"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-white/60 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-[#0a84ff]" /> Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/15 rounded-xl px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-[#0a84ff]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-white/60 mb-1.5 flex items-center gap-1.5">
                <Clock size={13} className="text-[#0a84ff]" /> Reminder Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/15 rounded-xl px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-[#0a84ff]"
              />
            </div>
          </div>

          {/* Category & Repeat */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-white/60 mb-1.5 flex items-center gap-1.5">
                <Tag size={13} className="text-[#f59e0b]" /> Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/15 rounded-xl px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-[#0a84ff]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-white text-neutral-900 dark:bg-[#141414] dark:text-white">
                    {c}
                  </option>
                ))}
                <option value="Other" className="bg-white text-neutral-900 dark:bg-[#141414] dark:text-white">Custom...</option>
              </select>
            </div>

            {category === 'Other' ? (
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-white/60 mb-1.5">
                  Custom Category Name
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g., Coding"
                  className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/15 rounded-xl px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-[#0a84ff]"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-white/60 mb-1.5 flex items-center gap-1.5">
                  <Repeat size={13} className="text-[#bc8cff]" /> Repeat
                </label>
                <select
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value as TaskRepeat)}
                  className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/15 rounded-xl px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-[#0a84ff]"
                >
                  <option value="none" className="bg-white text-neutral-900 dark:bg-[#141414] dark:text-white">Does not repeat</option>
                  <option value="daily" className="bg-white text-neutral-900 dark:bg-[#141414] dark:text-white">Daily</option>
                  <option value="weekly" className="bg-white text-neutral-900 dark:bg-[#141414] dark:text-white">Weekly</option>
                </select>
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-white/60 mb-1.5 flex items-center gap-1.5">
              <Flag size={13} /> Priority
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => {
                const isSelected = priority === p;
                let colorClass = '';
                if (p === 'low') {
                  colorClass = isSelected ? 'bg-[#58a6ff]/25 text-[#0a84ff] border-[#0a84ff]' : 'text-neutral-600 dark:text-white/50 border-neutral-300 dark:border-white/10';
                } else if (p === 'medium') {
                  colorClass = isSelected ? 'bg-[#f59e0b]/25 text-[#b45309] dark:text-[#f59e0b] border-[#f59e0b]' : 'text-neutral-600 dark:text-white/50 border-neutral-300 dark:border-white/10';
                } else {
                  colorClass = isSelected ? 'bg-[#f43f5e]/25 text-[#e11d48] dark:text-[#f43f5e] border-[#f43f5e]' : 'text-neutral-600 dark:text-white/50 border-neutral-300 dark:border-white/10';
                }

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border capitalize transition-all cursor-pointer ${colorClass} ${
                      !isSelected ? 'hover:bg-black/5 dark:hover:bg-white/[0.05]' : 'shadow-md'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#0a84ff] to-[#0066d6] hover:from-[#389eff] hover:to-[#0a84ff] rounded-xl shadow-[0_4px_14px_rgba(10,132,255,0.4)] transition-all cursor-pointer border border-white/15"
            >
              {initialTask ? 'Update Task' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
