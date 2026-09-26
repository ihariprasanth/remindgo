import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AppTheme } from '../types';

interface HeaderProps {
  title?: string;
  theme?: AppTheme | 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenAddTask?: () => void;
  onBack?: () => void;
  onForward?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, theme = 'mac-dark' }) => {
  const [isMax, setIsMax] = useState(false);

  const isWindowsTheme = theme === 'windows-dark' || theme === 'windows-light';
  const isLight = theme === 'mac-light' || theme === 'windows-light';

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
      className={`h-10 border-b flex items-center justify-between px-3 select-none titlebar-drag flex-shrink-0 z-30 transition-colors ${
        isLight
          ? 'bg-white/80 border-black/10 text-neutral-800'
          : 'bg-black/60 border-white/10 text-white'
      } backdrop-blur-xl`}
    >
      {/* Left side: Window Title / Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium pl-2">
        <span className="font-semibold tracking-wide">RemindGo</span>
        {title && (
          <>
            <span className="opacity-40">•</span>
            <span className="opacity-70">{title}</span>
          </>
        )}
      </div>

      {/* Right Side: Adaptive Window Controls */}
      {isWindowsTheme ? (
        /* Windows 11 Fluent Window Controls */
        <div className="flex items-center no-drag -mr-3 h-full">
          {/* Minimize */}
          <button
            onClick={handleMinimize}
            title="Minimize"
            className="w-11 h-10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
              <rect width="10" height="1" />
            </svg>
          </button>

          {/* Maximize / Restore */}
          <button
            onClick={handleMaximize}
            title={isMax ? "Restore" : "Maximize"}
            className="w-11 h-10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isMax ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="2.5" y="0.5" width="7" height="7" />
                <path d="M0.5 2.5 H 7.5 V 9.5 H 0.5 Z" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="0.5" y="0.5" width="9" height="9" />
              </svg>
            )}
          </button>

          {/* Close (Windows Red Hover) */}
          <button
            onClick={handleClose}
            title="Close"
            className="w-11 h-10 flex items-center justify-center hover:bg-[#e81123] hover:text-white transition-colors cursor-pointer"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M0.707 0L0 0.707L4.293 5L0 9.293L0.707 10L5 5.707L9.293 10L10 9.293L5.707 5L10 0.707L9.293 0L5 4.293L0.707 0Z" />
            </svg>
          </button>
        </div>
      ) : (
        /* macOS Traffic Light Window Controls */
        <div className="flex items-center gap-2.5 no-drag pr-1">
          {/* Yellow: Minimize */}
          <button
            onClick={handleMinimize}
            title="Minimize"
            className="w-[14px] h-[14px] rounded-full bg-[#ffbd2e] border border-[#d89e24] shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] hover:brightness-110 flex items-center justify-center group cursor-pointer transition-all active:scale-90"
          >
            <span className="opacity-0 group-hover:opacity-100 text-[#5c3c00] text-[9px] font-extrabold leading-none select-none transition-opacity">
              &minus;
            </span>
          </button>

          {/* Green: Maximize / Restore */}
          <button
            onClick={handleMaximize}
            title={isMax ? "Restore" : "Maximize"}
            className="w-[14px] h-[14px] rounded-full bg-[#27c93f] border border-[#1aab29] shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] hover:brightness-110 flex items-center justify-center group cursor-pointer transition-all active:scale-90"
          >
            <span className="opacity-0 group-hover:opacity-100 text-[#074710] text-[9px] font-extrabold leading-none select-none transition-opacity">
              +
            </span>
          </button>

          {/* Red: Close */}
          <button
            onClick={handleClose}
            title="Close"
            className="w-[14px] h-[14px] rounded-full bg-[#ff5f56] border border-[#e0443e] shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] hover:brightness-110 flex items-center justify-center group cursor-pointer transition-all active:scale-90"
          >
            <span className="opacity-0 group-hover:opacity-100 text-[#4d0000] text-[10px] font-extrabold leading-none select-none transition-opacity">
              &times;
            </span>
          </button>
        </div>
      )}
    </header>
  );
};
