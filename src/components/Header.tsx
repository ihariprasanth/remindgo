import React, { useEffect, useState } from 'react';
import { Sun, Moon, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { api } from '../services/api';

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
  const [hoverControls, setHoverControls] = useState(false);

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

  return (
    <header className="h-12 border-b border-[var(--border-glass)] flex items-center justify-between px-4 select-none titlebar-drag flex-shrink-0 z-30 transition-colors">
      {/* Left: macOS Traffic Lights & Nav Capsule */}
      <div className="flex items-center gap-4">
        {/* Traffic Lights */}
        <div
          className="flex items-center gap-2 no-drag cursor-pointer py-1"
          onMouseEnter={() => setHoverControls(true)}
          onMouseLeave={() => setHoverControls(false)}
        >
          {/* Red: Close */}
          <button
            onClick={handleClose}
            title="Close RemindGo"
            className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] border border-[#e0443e] flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
          >
            {hoverControls && <span className="text-[9px] text-[#4d0000] font-bold leading-none">×</span>}
          </button>

          {/* Yellow: Minimize */}
          <button
            onClick={handleMinimize}
            title="Minimize to Tray"
            className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] border border-[#dea123] flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
          >
            {hoverControls && <span className="text-[9px] text-[#5c3c00] font-bold leading-none mb-0.5">–</span>}
          </button>

          {/* Green: Maximize */}
          <button
            onClick={handleMaximize}
            title={isMax ? 'Restore' : 'Maximize'}
            className="w-3.5 h-3.5 rounded-full bg-[#27c93f] border border-[#1aab29] flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
          >
            {hoverControls && <span className="text-[8px] text-[#004d11] font-bold leading-none">⤢</span>}
          </button>
        </div>

        {/* macOS History Navigation Capsule (< >) */}
        <div className="hidden sm:flex items-center bg-black/10 dark:bg-white/10 rounded-lg p-0.5 border border-[var(--border-glass)] no-drag">
          <button
            onClick={onBack}
            className="p-1 text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-white/10 rounded transition-colors cursor-pointer"
            title="Back"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={onForward}
            className="p-1 text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-white/10 rounded transition-colors cursor-pointer"
            title="Forward"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Center: View Title Badge */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 border border-[var(--border-glass)] text-xs font-semibold text-[var(--text-main)] pointer-events-none shadow-sm">
        <span className="w-2 h-2 rounded-full bg-[#39d353] shadow-[0_0_8px_#39d353]" />
        <span>{title}</span>
      </div>

      {/* Right: Actions & Theme Switcher */}
      <div className="flex items-center gap-2 no-drag">
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
          className="p-2 macos-btn bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 border border-[var(--border-glass)] text-[var(--text-main)] cursor-pointer flex items-center justify-center shadow-sm"
        >
          {theme === 'dark' ? (
            <Sun size={14} className="text-[#f59e0b]" />
          ) : (
            <Moon size={14} className="text-[#3b82f6]" />
          )}
        </button>
      </div>
    </header>
  );
};
