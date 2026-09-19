import React, { useEffect } from 'react';
import { Clock, Check, X } from 'lucide-react';
import { Task, Settings } from '../types';
import { audioService } from '../services/audioService';
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
  useEffect(() => {
    // Start audio loop when alarm popup mounts
    const sound = settings?.alarmSound || 'digital-alarm';
    const volume = settings?.soundVolume ?? 0.8;
    audioService.setVolume(volume);
    audioService.startLoop(sound);

    return () => {
      // Ensure audio stops strictly when unmounting
      audioService.stopLoop();
    };
  }, [settings]);

  const isDailyReminder = task.id.startsWith('daily-reminder') || task.id.startsWith('daily-warning') || task.title.includes('Complete Today Tasks');

  const handlePrimaryAction = async () => {
    // 1. Immediately silence audio
    audioService.stopLoop();

    // If it's a daily reminder / warning, complete today's pending tasks in DB
    if (isDailyReminder && api.markAllTodayTasksDone) {
      try {
        await api.markAllTodayTasksDone();
      } catch (err) {
        console.error('Failed to mark all today tasks done:', err);
      }
    }

    // 2. Mark as completed and close
    onDismiss(true);
  };

  const handleSnoozeMinutes = (minutes: number) => {
    // 1. Immediately silence audio
    audioService.stopLoop();
    // 2. Set snooze time in DB
    onSnooze(minutes);
  };

  const handleClose = () => {
    audioService.stopLoop();
    onDismiss(false);
  };

  return (
    <div className="w-full h-full bg-[#000000] text-white flex flex-col justify-between p-6 select-none border border-white/15 rounded-2xl shadow-2xl overflow-hidden font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={logoSquircle} alt="RemindGo" className="w-5 h-5 rounded-[6px] shadow-sm border border-white/20" />
          <span className="w-2 h-2 rounded-full bg-[#0a84ff] animate-ping" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#0a84ff]">
            {isDailyReminder ? 'Daily Task Reminder' : 'RemindGo Alarm'}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          title="Close Alarm"
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
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10 font-mono">
            {task.category || 'General'}
          </span>
        </div>

        <h1 className="text-xl font-bold text-[#e6edf3] px-2 leading-tight">
          {task.title}
        </h1>

        {task.description && (
          task.id.startsWith('batch-') ? (
            <div className="max-h-28 overflow-y-auto p-2.5 rounded-xl bg-white/5 border border-white/10 text-left space-y-1.5 my-1 max-w-md mx-auto text-xs">
              {task.description.split('\n').map((line, idx) => (
                <div key={idx} className="text-[#38bdf8] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0a84ff] flex-shrink-0" />
                  <span className="truncate">{line}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8b949e] max-w-sm mx-auto line-clamp-3">
              {task.description}
            </p>
          )
        )}

        <div className="flex items-center justify-center gap-1.5 text-xs text-[#0a84ff] font-mono">
          <Clock size={14} />
          <span>Scheduled for {task.time} ({task.date})</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="space-y-3 pt-2">
        {/* Primary Action Button: "Mark All as Done" / "Mark as Done" / "Thank you I will do it now" */}
        <button
          onClick={handlePrimaryAction}
          className="w-full py-3 px-4 bg-gradient-to-r from-[#0a84ff] to-[#0066d6] hover:from-[#389eff] hover:to-[#0a84ff] active:scale-[0.99] text-white text-sm font-semibold rounded-xl shadow-[0_4px_16px_rgba(10,132,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wide text-xs"
        >
          <Check size={16} strokeWidth={3} />
          <span>
            {task.id.startsWith('batch-')
              ? 'Mark All as Done'
              : isDailyReminder
              ? 'Mark as Done'
              : 'Thank you I will do it now'}
          </span>
        </button>

        {/* Options 2, 3, 4: "5MIN", "10MIN", "15MIN" Snooze Buttons */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => handleSnoozeMinutes(5)}
            className="py-2 px-3 bg-[#141414] hover:bg-[#222222] active:bg-[#2a2a2a] text-white text-xs font-mono font-semibold rounded-xl border border-white/15 transition-all text-center cursor-pointer shadow-sm hover:border-[#0a84ff]/50"
          >
            5 min
          </button>
          <button
            onClick={() => handleSnoozeMinutes(10)}
            className="py-2 px-3 bg-[#141414] hover:bg-[#222222] active:bg-[#2a2a2a] text-white text-xs font-mono font-semibold rounded-xl border border-white/15 transition-all text-center cursor-pointer shadow-sm hover:border-[#0a84ff]/50"
          >
            10 min
          </button>
          <button
            onClick={() => handleSnoozeMinutes(15)}
            className="py-2 px-3 bg-[#141414] hover:bg-[#222222] active:bg-[#2a2a2a] text-white text-xs font-mono font-semibold rounded-xl border border-white/15 transition-all text-center cursor-pointer shadow-sm hover:border-[#0a84ff]/50"
          >
            15 min
          </button>
        </div>
      </div>
    </div>
  );
};
