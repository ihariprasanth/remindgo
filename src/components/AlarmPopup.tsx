import React, { useEffect, useState } from 'react';
import { Bell, Clock, Check, Volume2, X } from 'lucide-react';
import { Task, Settings } from '../types';
import { audioService } from '../services/audioService';
import { api } from '../services/api';

interface AlarmPopupProps {
  task: Task;
  settings?: Settings;
  onDismiss: (markDone?: boolean) => void;
  onSnooze: (minutes: number) => void;
}

export const AlarmPopup: React.FC<AlarmPopupProps> = ({
  task,
  settings,
  onDismiss,
  onSnooze
}) => {
  const [customSnooze, setCustomSnooze] = useState('15');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    // Start audio loop when alarm popup mounts
    const sound = settings?.alarmSound || 'digital-alarm';
    const volume = settings?.soundVolume ?? 0.8;
    audioService.setVolume(volume);
    audioService.startLoop(sound);

    return () => {
      // Ensure audio stops when unmounting
      audioService.stopLoop();
    };
  }, [settings]);

  const handleDismiss = (markDone: boolean = false) => {
    audioService.stopLoop();
    onDismiss(markDone);
  };

  const handleSnooze = (minutes: number) => {
    audioService.stopLoop();
    onSnooze(minutes);
  };

  return (
    <div className="w-full h-full bg-[#0d1117] text-[#e6edf3] flex flex-col justify-between p-6 select-none border border-[#30363d] rounded-xl shadow-2xl overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#39d353] animate-ping" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#39d353]">
            Reminder Alarm
          </span>
        </div>
        <button
          onClick={() => handleDismiss(false)}
          className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded hover:bg-[#21262d] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Center Alarm Content */}
      <div className="my-auto text-center space-y-3">
        {/* Pulsing Bell Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#39d353]/15 text-[#39d353] alarm-pulse mb-1">
          <Bell size={32} strokeWidth={2.5} />
        </div>

        <div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d]">
            {task.category}
          </span>
        </div>

        <h1 className="text-xl font-bold text-[#e6edf3] px-2 leading-tight">
          {task.title}
        </h1>

        {task.description && (
          <p className="text-xs text-[#8b949e] max-w-sm mx-auto line-clamp-3">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-center gap-1.5 text-xs text-[#58a6ff] font-mono">
          <Clock size={14} />
          <span>Scheduled for {task.time} ({task.date})</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="space-y-3 pt-2">
        {/* Mark Done Primary Button */}
        <button
          onClick={() => handleDismiss(true)}
          className="w-full py-2.5 px-4 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-semibold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Check size={16} strokeWidth={3} />
          <span>Mark as Completed</span>
        </button>

        {/* Snooze & Dismiss Row */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => handleSnooze(5)}
            className="py-1.5 px-2 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-xs font-mono font-medium rounded-md border border-[#30363d] transition-colors cursor-pointer"
          >
            +5 min
          </button>
          <button
            onClick={() => handleSnooze(10)}
            className="py-1.5 px-2 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-xs font-mono font-medium rounded-md border border-[#30363d] transition-colors cursor-pointer"
          >
            +10 min
          </button>
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="py-1.5 px-2 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-xs font-medium rounded-md border border-[#30363d] transition-colors cursor-pointer"
          >
            Custom
          </button>
          <button
            onClick={() => handleDismiss(false)}
            className="py-1.5 px-2 bg-[#21262d] hover:bg-[#da3633]/20 hover:text-[#f85149] text-[#8b949e] text-xs font-medium rounded-md border border-[#30363d] hover:border-[#f85149]/40 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>

        {/* Custom Snooze Input dropdown if opened */}
        {showCustom && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="number"
              min="1"
              max="120"
              value={customSnooze}
              onChange={(e) => setCustomSnooze(e.target.value)}
              className="w-20 px-2 py-1 bg-[#161b22] border border-[#30363d] rounded text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#39d353]"
            />
            <span className="text-xs text-[#8b949e]">minutes</span>
            <button
              onClick={() => handleSnooze(parseInt(customSnooze, 10) || 15)}
              className="ml-auto px-3 py-1 bg-[#30363d] hover:bg-[#39d353] hover:text-black text-xs font-medium rounded transition-colors"
            >
              Apply Snooze
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
