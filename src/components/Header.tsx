import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface HeaderProps {
  title?: string;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenAddTask?: () => void;
  onBack?: () => void;
  onForward?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
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
      className="h-10 border-b border-white/10 flex items-center justify-end px-4 select-none titlebar-drag flex-shrink-0 z-30 bg-black/60 backdrop-blur-xl"
    >
      {/* Right Side: Clean Standard Window Controls */}
      <div className="flex items-center no-drag">
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          title="Minimize"
          className="w-11 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-sm cursor-pointer"
        >
          <svg width="10" height="1" viewBox="0 0 10 1">
            <rect width="10" height="1" fill="currentColor" />
          </svg>
        </button>

        {/* Maximize / Restore */}
        <button
          onClick={handleMaximize}
          title={isMax ? "Restore" : "Maximize"}
          className="w-11 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-sm cursor-pointer"
        >
          {isMax ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M2.5,0.5 H9.5 V7.5 H7.5 V9.5 H0.5 V2.5 H2.5 Z M2.5,2.5 H7.5 V7.5" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          title="Close"
          className="w-11 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-[#e81123] active:bg-[#bf0f1d] transition-colors rounded-sm cursor-pointer"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1,1 L9,9 M9,1 L1,9" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </header>
  );
};
