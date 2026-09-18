import React, { useEffect, useState } from 'react';
import { Sun, Moon, Minus, Square, Copy, X } from 'lucide-react';
import { api } from '../services/api';

interface HeaderProps {
  title?: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenAddTask?: () => void;
  onBack?: () => void;
  onForward?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme
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

  return (
    <header 
      onDoubleClick={handleMaximize}
      className="h-9 border-b border-[var(--border-glass)] flex items-center justify-end px-2 select-none titlebar-drag flex-shrink-0 z-30 transition-colors bg-white/60 dark:bg-black/40 backdrop-blur-xl"
    >
      {/* Right: Theme Switcher & Windows Controls */}
      <div className="flex items-center gap-1.5 no-drag">
        {/* Dark / Light Mode Toggle */}
        <button
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-1.5 macos-btn bg-neutral-200/70 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/15 border border-[var(--border-glass)] text-neutral-800 dark:text-white cursor-pointer flex items-center justify-center shadow-sm rounded-md"
        >
          {theme === 'dark' ? (
            <Sun size={13} className="text-[#f59e0b]" />
          ) : (
            <Moon size={13} className="text-[#0a84ff]" />
          )}
        </button>

        {/* Vertical Divider */}
        <div className="w-[1px] h-3.5 bg-neutral-300 dark:bg-white/10 mx-0.5" />

        {/* Windows Window Controls */}
        <div className="flex items-center gap-0.5">
          {/* Minimize Button */}
          <button
            onClick={handleMinimize}
            title="Minimize"
            className="w-7 h-6 rounded-md flex items-center justify-center text-neutral-600 dark:text-white/70 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/10 active:bg-neutral-300 dark:active:bg-white/20 transition-colors cursor-pointer"
          >
            <Minus size={12} />
          </button>

          {/* Maximize / Restore Button */}
          <button
            onClick={handleMaximize}
            title={isMax ? 'Restore' : 'Maximize'}
            className="w-7 h-6 rounded-md flex items-center justify-center text-neutral-600 dark:text-white/70 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/10 active:bg-neutral-300 dark:active:bg-white/20 transition-colors cursor-pointer"
          >
            {isMax ? <Copy size={10} className="rotate-180" /> : <Square size={10} />}
          </button>

          {/* Close Button */}
          <button
            onClick={handleClose}
            title="Close"
            className="w-7 h-6 rounded-md flex items-center justify-center text-neutral-600 dark:text-white/70 hover:text-white hover:bg-[#e81123] active:bg-[#c4101f] transition-colors cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </header>
  );
};
