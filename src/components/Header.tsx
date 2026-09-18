import React, { useEffect, useState } from 'react';
import { Sun, Moon, ChevronLeft, ChevronRight, Plus, Minus, Square, Copy, X, Pin } from 'lucide-react';
import { api } from '../services/api';
import logoSquircle from '../assets/logo-squircle.png';

interface HeaderProps {
  title: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenAddTask: () => void;
  onBack?: () => void;
  onForward?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  theme,
  onToggleTheme,
  onOpenAddTask,
  onBack,
  onForward
}) => {
  const [isMax, setIsMax] = useState(false);

  useEffect(() => {
    api.isMaximized().then(setIsMax);
  }, []);

  const handleMinimize = () => {
    api.minimizeWindow();
  };

  const handleMaximize = async () => {
    api.maximizeWindow();
    const max = await api.isMaximized();
    setIsMax(max);
  };

  const handleClose = () => {
    api.closeWindow();
  };

  const handleToggleWidget = () => {
    api.toggleWidget();
  };

  return (
    <header 
      onDoubleClick={handleMaximize}
      className="h-12 border-b border-[var(--border-glass)] flex items-center justify-between px-3 select-none titlebar-drag flex-shrink-0 z-30 transition-colors bg-white/70 dark:bg-black/40 backdrop-blur-xl"
    >
      {/* Left: Brand Logo & Navigation */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 no-drag">
          <div className="w-6 h-6 rounded-[7px] overflow-hidden shadow-sm border border-neutral-300 dark:border-white/20 bg-white p-0.5 flex-shrink-0">
            <img src={logoSquircle} alt="RemindGo" className="w-full h-full object-cover rounded-[5px]" />
          </div>
          <span className="font-bold text-xs tracking-tight text-neutral-900 dark:text-white hidden sm:inline">
            RemindGo
          </span>
        </div>

        {/* History Navigation Capsule (< >) */}
        <div className="flex items-center bg-neutral-200/60 dark:bg-white/10 rounded-lg p-0.5 border border-[var(--border-glass)] no-drag">
          <button
            onClick={onBack}
            className="p-1 text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-neutral-300 dark:hover:bg-white/10 rounded transition-colors cursor-pointer"
            title="Back"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={onForward}
            className="p-1 text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-neutral-300 dark:hover:bg-white/10 rounded transition-colors cursor-pointer"
            title="Forward"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Center: View Title Badge */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-200/60 dark:bg-white/10 border border-[var(--border-glass)] text-xs font-semibold text-neutral-800 dark:text-white pointer-events-none shadow-sm">
        <span className="w-2 h-2 rounded-full bg-[#0a84ff] shadow-[0_0_8px_#0a84ff]" />
        <span>{title}</span>
      </div>

      {/* Right: Actions, Theme Switcher & Windows Controls */}
      <div className="flex items-center gap-2 no-drag">
        {/* Desktop Widget Launcher Button */}
        <button
          onClick={handleToggleWidget}
          title="Open Floating Desktop Widget (To-Do List & Heatmap)"
          className="flex items-center gap-1.5 px-3 py-1.5 macos-btn bg-neutral-200/70 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/15 border border-[var(--border-glass)] text-xs font-semibold text-neutral-800 dark:text-white cursor-pointer shadow-sm"
        >
          <Pin size={12} className="text-[#0a84ff]" />
          <span className="hidden md:inline">Widget</span>
        </button>

        {/* Quick New Task Button */}
        <button
          onClick={onOpenAddTask}
          className="flex items-center gap-1.5 px-3.5 py-1.5 macos-btn macos-btn-primary text-xs font-semibold cursor-pointer"
        >
          <Plus size={13} strokeWidth={2.5} />
          <span className="hidden md:inline">New Task</span>
        </button>

        {/* Dark / Light Mode Toggle */}
        <button
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-2 macos-btn bg-neutral-200/70 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/15 border border-[var(--border-glass)] text-neutral-800 dark:text-white cursor-pointer flex items-center justify-center shadow-sm"
        >
          {theme === 'dark' ? (
            <Sun size={14} className="text-[#f59e0b]" />
          ) : (
            <Moon size={14} className="text-[#0a84ff]" />
          )}
        </button>

        {/* Vertical Divider */}
        <div className="w-[1px] h-4 bg-neutral-300 dark:bg-white/10 mx-0.5" />

        {/* Windows Window Controls */}
        <div className="flex items-center gap-0.5">
          {/* Minimize Button */}
          <button
            onClick={handleMinimize}
            title="Minimize"
            className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-600 dark:text-white/70 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/10 active:bg-neutral-300 dark:active:bg-white/20 transition-colors cursor-pointer"
          >
            <Minus size={13} />
          </button>

          {/* Maximize / Restore Button */}
          <button
            onClick={handleMaximize}
            title={isMax ? 'Restore' : 'Maximize'}
            className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-600 dark:text-white/70 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/10 active:bg-neutral-300 dark:active:bg-white/20 transition-colors cursor-pointer"
          >
            {isMax ? <Copy size={11} className="rotate-180" /> : <Square size={11} />}
          </button>

          {/* Close Button */}
          <button
            onClick={handleClose}
            title="Close"
            className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-600 dark:text-white/70 hover:text-white hover:bg-[#e81123] active:bg-[#c4101f] transition-colors cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </header>
  );
};
