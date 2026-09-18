import React, { useState } from 'react';
import { Volume2, Bell, Play, Square, HardDrive, Download, Upload, ShieldCheck, Check, Code2 } from 'lucide-react';
import { Settings } from '../types';
import { SOUND_OPTIONS, audioService } from '../services/audioService';
import { api } from '../services/api';
import logoSquircle from '../assets/logo-squircle.png';

interface SettingsPageProps {
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
  onDataImported: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onDataImported
}) => {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [lcUsername, setLcUsername] = useState(settings.leetcodeUsername || '');

  const handleToggleSoundPreview = async () => {
    if (isPlayingPreview) {
      audioService.stopLoop();
      setIsPlayingPreview(false);
    } else {
      setIsPlayingPreview(true);
      audioService.setVolume(settings.soundVolume);
      await audioService.preview(settings.alarmSound);
      setIsPlayingPreview(false);
    }
  };

  const handleSoundChange = (soundId: string) => {
    onUpdateSettings({ alarmSound: soundId });
    audioService.setVolume(settings.soundVolume);
    audioService.preview(soundId);
  };

  const handleSaveLeetCode = () => {
    onUpdateSettings({ leetcodeUsername: lcUsername.trim() });
    setExportMessage('LeetCode username updated!');
    setTimeout(() => setExportMessage(null), 3000);
  };

  const handleExport = async () => {
    setExportMessage(null);
    const res = await api.exportData();
    if (res.success) {
      setExportMessage('Backup file successfully exported!');
      setTimeout(() => setExportMessage(null), 4000);
    }
  };

  const handleImport = async () => {
    setImportMessage(null);
    const res = await api.importData();
    if (res.success) {
      setImportMessage(`Successfully imported ${res.count || 0} tasks!`);
      onDataImported();
      setTimeout(() => setImportMessage(null), 4000);
    } else if (res.error) {
      setImportMessage(`Import error: ${res.error}`);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full max-w-4xl mx-auto">
      <div>
        <h2 className="text-lg font-bold text-white tracking-wide">Application Preferences</h2>
        <p className="text-xs text-white/50">
          Configure alarms, tray behavior, sound alerts, LeetCode profile, and offline backups
        </p>
      </div>

      {/* LeetCode Sync Settings */}
      <div className="liquid-glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
          <Code2 size={16} className="text-[#f59e0b]" />
          LeetCode Account Integration
        </h3>

        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Default LeetCode Username
          </label>
          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={lcUsername}
              onChange={(e) => setLcUsername(e.target.value)}
              placeholder="e.g. neal_wu"
              className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#f59e0b] font-mono"
            />
            <button
              onClick={handleSaveLeetCode}
              className="px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-black text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Save
            </button>
          </div>
          <p className="text-[11px] text-white/40 mt-1.5">
            Your LeetCode profile data and submission activity will be cached offline in local SQLite.
          </p>
        </div>
      </div>

      {/* Alarm & Sound Settings */}
      <div className="liquid-glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
          <Bell size={16} className="text-[#39d353]" />
          Alarm & Sound Alerts
        </h3>

        {/* Sound Selection */}
        <div>
          <label className="block text-xs font-medium text-white/60 mb-2">
            Alarm Audio Profile
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SOUND_OPTIONS.map((opt) => {
              const isSelected = settings.alarmSound === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSoundChange(opt.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white/[0.08] border-[#39d353] shadow-[0_0_12px_rgba(57,211,83,0.25)]'
                      : 'border-white/10 hover:border-white/25 bg-black/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isSelected ? 'text-[#39d353]' : 'text-white'}`}>
                      {opt.name}
                    </span>
                    {isSelected && <Check size={14} className="text-[#39d353]" />}
                  </div>
                  <p className="text-[11px] text-white/50 mt-1">{opt.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Volume & Preview Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Volume2 size={14} /> Alarm Volume
              </span>
              <span className="font-mono text-[11px] text-white/80">{Math.round(settings.soundVolume * 100)}%</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={settings.soundVolume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                onUpdateSettings({ soundVolume: vol });
                audioService.setVolume(vol);
              }}
              className="w-full accent-[#39d353] cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              Test Audio Sound
            </label>
            <button
              onClick={handleToggleSoundPreview}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                isPlayingPreview
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                  : 'bg-white/10 text-white border-white/15 hover:border-[#39d353]'
              }`}
            >
              {isPlayingPreview ? (
                <>
                  <Square size={13} fill="currentColor" /> Stop Test
                </>
              ) : (
                <>
                  <Play size={13} fill="currentColor" /> Preview Sound
                </>
              )}
            </button>
          </div>
        </div>

        {/* Default Snooze Duration */}
        <div className="pt-2">
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Default Snooze Duration
          </label>
          <div className="flex gap-2">
            {[5, 10, 15, 30].map((mins) => (
              <button
                key={mins}
                onClick={() => onUpdateSettings({ snoozeDuration: mins })}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer ${
                  settings.snoozeDuration === mins
                    ? 'bg-[#238636] text-white border-[#39d353] shadow-[0_0_12px_rgba(57,211,83,0.3)]'
                    : 'bg-black/30 text-white/60 border-white/10 hover:border-white/30'
                }`}
              >
                {mins} mins
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Windows & Background Running Behavior */}
      <div className="liquid-glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
          <HardDrive size={16} className="text-[#58a6ff]" />
          Windows Background Behavior
        </h3>

        <div className="space-y-3">
          {/* Close to tray */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-glass)] bg-black/5 dark:bg-black/20">
            <div>
              <div className="text-xs font-semibold text-[var(--text-main)]">
                Keep Running in System Tray on Close
              </div>
              <div className="text-[11px] text-[var(--text-sub)] mt-0.5">
                Closing the window hides it to the tray so alarms continue to fire.
              </div>
            </div>
            <label className="macos-switch flex-shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.closeToTray}
                onChange={(e) => onUpdateSettings({ closeToTray: e.target.checked })}
              />
              <span className="macos-slider" />
            </label>
          </div>

          {/* Minimize to tray */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-glass)] bg-black/5 dark:bg-black/20">
            <div>
              <div className="text-xs font-semibold text-[var(--text-main)]">
                Minimize Directly to Tray
              </div>
              <div className="text-[11px] text-[var(--text-sub)] mt-0.5">
                When clicking the minimize button, hide RemindGo into the tray icon.
              </div>
            </div>
            <label className="macos-switch flex-shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.minimizeToTray}
                onChange={(e) => onUpdateSettings({ minimizeToTray: e.target.checked })}
              />
              <span className="macos-slider" />
            </label>
          </div>

          {/* Start with Windows */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-glass)] bg-black/5 dark:bg-black/20">
            <div>
              <div className="text-xs font-semibold text-[var(--text-main)]">
                Start Automatically with Windows
              </div>
              <div className="text-[11px] text-[var(--text-sub)] mt-0.5">
                Launches RemindGo in background when Windows boots up so no reminders are missed.
              </div>
            </div>
            <label className="macos-switch flex-shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.startWithWindows}
                onChange={(e) => onUpdateSettings({ startWithWindows: e.target.checked })}
              />
              <span className="macos-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Backup & Local Data */}
      <div className="liquid-glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
          <ShieldCheck size={16} className="text-[#bc8cff]" />
          Offline Data & Local Backups
        </h3>

        <p className="text-xs text-white/50">
          All tasks, activity history, and settings are saved locally inside an SQLite database file. No external internet or cloud account is required.
        </p>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/15 py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download size={14} className="text-[#39d353]" />
            Export Backup (JSON)
          </button>

          <button
            onClick={handleImport}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/15 py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Upload size={14} className="text-[#58a6ff]" />
            Import Backup (JSON)
          </button>
        </div>

        {exportMessage && (
          <div className="p-3 rounded-xl bg-[#238636]/20 border border-[#238636]/40 text-xs text-[#39d353]">
            {exportMessage}
          </div>
        )}

        {importMessage && (
          <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/40 text-xs text-blue-400">
            {importMessage}
          </div>
        )}
      </div>

      {/* About Section */}
      <div className="text-center text-xs text-[var(--text-muted)] pt-6 pb-4 flex flex-col items-center">
        <div className="w-16 h-16 rounded-[16px] overflow-hidden shadow-xl border border-white/20 mb-3 bg-white p-0.5">
          <img src={logoSquircle} alt="RemindGo" className="w-full h-full object-cover rounded-[14px]" />
        </div>
        <div className="font-semibold text-sm text-[var(--text-main)]">RemindGo v2.5 • Liquid Glass Edition</div>
        <div className="text-[11px] text-[var(--text-sub)] mt-0.5">
          Liquid Glass Architecture • LeetCode Integration • Local SQLite Engine
        </div>
        <div className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
          Developed with ❤️ by Hariprasanth
        </div>
      </div>
    </div>
  );
};
