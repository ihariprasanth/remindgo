import React, { useEffect, useState } from 'react';
import { Bell, Clock, Check, Volume2, X } from 'lucide-react';
import { Task, Settings } from '../types';
import { audioService } from '../services/audioService';
import { api } from '../services/api';
import logoCircle from '../assets/logo-circle.png';
import logoSquircle from '../assets/logo-squircle.png';

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
    <div className="w-full h-full bg-[#000000] text-white flex flex-col justify-between p-6 select-none border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={logoSquircle} alt="RemindGo" className="w-5 h-5 rounded-[6px] shadow-sm border border-white/20" />
          <span className="w-2 h-2 rounded-full bg-[#0a84ff] animate-ping" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#0a84ff]">
            RemindGo Alarm
          </span>
        </div>
        <button
          onClick={() => handleDismiss(false)}
          className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Center Alarm Content */}
      <div className="my-auto text-center space-y-3">
        {/* Pulsing RemindGo Circular Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#0a84ff]/15 alarm-pulse p-1 border border-[#0a84ff]/30 shadow-[0_0_25px_rgba(10,132,255,0.35)] mb-1">
          <img src={logoCircle} alt="RemindGo" className="w-full h-full object-cover rounded-full shadow-inner" />
        </div>

        <div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10">
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

        <div className="flex items-center justify-center gap-1.5 text-xs text-[#0a84ff] font-mono">
          <Clock size={14} />
          <span>Scheduled for {task.time} ({task.date})</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="space-y-3 pt-2">
        {/* Mark Done Primary Button */}
        <button
          onClick={() => handleDismiss(true)}
          className="w-full py-2.5 px-4 bg-[#0a84ff] hover:bg-[#0066d6] text-white text-sm font-semibold rounded-xl shadow-[0_4px_16px_rgba(10,132,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
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
              className="w-20 px-2.5 py-1 macos-input text-xs font-mono"
            />
            <span className="text-xs text-white/60">minutes</span>
            <button
              onClick={() => handleSnooze(parseInt(customSnooze, 10) || 15)}
              className="ml-auto px-3.5 py-1 macos-btn macos-btn-secondary text-xs font-medium cursor-pointer"
            >
              Apply Snooze
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
