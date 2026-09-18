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
      className="h-9 border-b border-white/10 flex items-center justify-end px-3 select-none titlebar-drag flex-shrink-0 z-30 bg-black/60 backdrop-blur-xl"
    >
      {/* Right Side: macOS Traffic Light Window Controls */}
      <div className="flex items-center gap-2 no-drag pr-1">
        {/* Yellow: Minimize */}
        <button
          onClick={handleMinimize}
          title="Minimize"
          className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#d89e24] hover:brightness-110 flex items-center justify-center group cursor-pointer transition-all shadow-sm active:scale-95"
        >
          <span className="opacity-0 group-hover:opacity-100 text-black text-[8px] font-bold leading-none select-none transition-opacity">
            &minus;
          </span>
        </button>

        {/* Green: Maximize / Restore */}
        <button
          onClick={handleMaximize}
          title={isMax ? "Restore" : "Maximize"}
          className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:brightness-110 flex items-center justify-center group cursor-pointer transition-all shadow-sm active:scale-95"
        >
          <span className="opacity-0 group-hover:opacity-100 text-black text-[8px] font-bold leading-none select-none transition-opacity">
            +
          </span>
        </button>

        {/* Red: Close */}
        <button
          onClick={handleClose}
          title="Close"
          className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-110 flex items-center justify-center group cursor-pointer transition-all shadow-sm active:scale-95"
        >
          <span className="opacity-0 group-hover:opacity-100 text-black text-[9px] font-bold leading-none select-none transition-opacity">
            &times;
          </span>
        </button>
      </div>
    </header>
  );
};
