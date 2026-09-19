import React, { useState, useEffect } from 'react';
import { Volume2, Bell, Play, Square, HardDrive, Download, Upload, ShieldCheck, Check, Code2, Pin, ExternalLink, CheckSquare, Calendar, Sparkles, Cpu } from 'lucide-react';
import { Settings, WidgetVariant } from '../types';
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
  const [activeWidgets, setActiveWidgets] = useState<WidgetVariant[]>(settings.activeWidgets || ['tasks-heatmap']);

  useEffect(() => {
    if (api.getActiveWidgets) {
      api.getActiveWidgets().then((active) => {
        if (active) setActiveWidgets(active as WidgetVariant[]);
      });
    }
    if (api.onActiveWidgetsChanged) {
      const unsub = api.onActiveWidgetsChanged((active) => {
        setActiveWidgets(active as WidgetVariant[]);
      });
      return () => unsub();
    }
  }, []);

  const handleToggleWidget = async (widgetId: WidgetVariant) => {
    const isRunning = activeWidgets.includes(widgetId);
    if (isRunning) {
      if (api.closeWidget) await api.closeWidget(widgetId);
      const updated = activeWidgets.filter((w) => w !== widgetId);
      setActiveWidgets(updated);
      onUpdateSettings({ activeWidgets: updated });
    } else {
      if (api.openWidget) await api.openWidget(widgetId);
      const updated = [...activeWidgets, widgetId];
      setActiveWidgets(updated);
      onUpdateSettings({ activeWidgets: updated });
    }
  };

  const handleLaunchAll = async () => {
    const allVariants: WidgetVariant[] = [
      'tasks-heatmap', 'todo', 'leetcode', 'leetcode-streak', 'coding-platforms', 'routine-progress', 'mini-pill'
    ];
    if (api.launchAllWidgets) await api.launchAllWidgets();
    setActiveWidgets(allVariants);
    onUpdateSettings({ activeWidgets: allVariants });
  };

  const handleCloseAll = async () => {
    if (api.closeAllWidgets) await api.closeAllWidgets();
    setActiveWidgets([]);
    onUpdateSettings({ activeWidgets: [] });
  };

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
        <h2 className="text-lg font-bold text-[var(--text-main)] tracking-wide">Application Preferences</h2>
        <p className="text-xs text-[var(--text-sub)]">
          Configure alarms, tray behavior, sound alerts, LeetCode profile, and offline backups
        </p>
      </div>

      {/* LeetCode Sync Settings */}
      <div className="liquid-glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 border-b border-[var(--border-glass)] pb-3">
          <Code2 size={16} className="text-[#f59e0b]" />
          LeetCode Account Integration
        </h3>

        <div>
          <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">
            Default LeetCode Username
          </label>
          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={lcUsername}
              onChange={(e) => setLcUsername(e.target.value)}
              placeholder="e.g. neal_wu"
              className="flex-1 bg-black/5 dark:bg-black/40 border border-[var(--border-glass)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#f59e0b] font-mono"
            />
            <button
              onClick={handleSaveLeetCode}
              className="px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-black text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Save
            </button>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
            Your LeetCode profile data and submission activity will be cached offline in local SQLite.
          </p>
        </div>
      </div>

      {/* Alarm & Sound Settings */}
      <div className="liquid-glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 border-b border-[var(--border-glass)] pb-3">
          <Bell size={16} className="text-[#0a84ff]" />
          Alarm & Sound Alerts
        </h3>

        {/* Sound Selection */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-sub)] mb-2">
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
                      ? 'bg-blue-500/10 dark:bg-white/[0.08] border-[#0a84ff] shadow-[0_0_12px_rgba(10,132,255,0.25)]'
                      : 'border-[var(--border-glass)] hover:border-[#0a84ff]/50 bg-black/5 dark:bg-black/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isSelected ? 'text-[#0a84ff]' : 'text-[var(--text-main)]'}`}>
                      {opt.name}
                    </span>
                    {isSelected && <Check size={14} className="text-[#0a84ff]" />}
                  </div>
                  <p className="text-[11px] text-[var(--text-sub)] mt-1">{opt.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Volume & Preview Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Volume2 size={14} /> Alarm Volume
              </span>
              <span className="font-mono text-[11px] text-[var(--text-main)]">{Math.round(settings.soundVolume * 100)}%</span>
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
              className="w-full accent-[#0a84ff] cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">
              Test Audio Sound
            </label>
            <button
              onClick={handleToggleSoundPreview}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                isPlayingPreview
                  ? 'bg-red-500/20 text-red-500 dark:text-red-400 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                  : 'bg-black/5 dark:bg-white/10 text-[var(--text-main)] border-[var(--border-glass)] hover:border-[#0a84ff]'
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
          <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">
            Default Snooze Duration
          </label>
          <div className="flex gap-2">
            {[5, 10, 15, 30].map((mins) => (
              <button
                key={mins}
                onClick={() => onUpdateSettings({ snoozeDuration: mins })}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer ${
                  settings.snoozeDuration === mins
                    ? 'bg-[#0a84ff] text-white border-[#38bdf8] shadow-[0_0_12px_rgba(10,132,255,0.3)]'
                    : 'bg-black/5 dark:bg-black/30 text-[var(--text-sub)] border-[var(--border-glass)] hover:border-[#0a84ff]'
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
        <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 border-b border-[var(--border-glass)] pb-3">
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

      {/* Desktop Multi-Widget Manager */}
      <div className="liquid-glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-glass)] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Pin size={16} className="text-[#0a84ff]" />
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              Desktop Multi-Widget Manager
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#39d353]/15 text-[#39d353] border border-[#39d353]/30">
              {activeWidgets.length} Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLaunchAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Sparkles size={12} />
              <span>Launch All 7</span>
            </button>
            <button
              onClick={handleCloseAll}
              disabled={activeWidgets.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              <span>Close All</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-[var(--text-sub)]">
          Run individual standalone widgets simultaneously on your Windows desktop wallpaper. Each widget can be freely dragged, placed anywhere, and remembers its exact desktop coordinates.
        </p>

        {/* Windows Low-RAM Status Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-[#238636]/30 text-xs">
          <div className="flex items-center gap-2 text-[#39d353] font-medium">
            <Cpu size={15} />
            <span>Windows Low-RAM Engine Active</span>
          </div>
          <span className="text-[10px] font-mono text-white/50">~70–90MB Footprint • Shared Process</span>
        </div>

        {/* Individual Desktop Widgets Selection */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl border border-[var(--border-glass)] bg-black/5 dark:bg-black/20">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-semibold text-[var(--text-main)]">
                  Standalone Desktop Widgets (Simultaneous Multi-Widget Support)
                </div>
                <div className="text-[11px] text-[var(--text-sub)] mt-0.5">
                  Click any widget card or toggle to launch or close it individually on your desktop.
                </div>
              </div>
            </div>

            {/* Visual Cards for Individual Standalone Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {[
                { id: 'tasks-heatmap', name: 'Task Activity Matrix', desc: '20-week to-do tasks heatmap & streak', color: 'text-[#39d353]' },
                { id: 'todo', name: 'Today\'s Daily Checklist', desc: '1-click checkoff for routine & to-dos', color: 'text-[#0a84ff]' },
                { id: 'leetcode', name: 'LeetCode Activity', desc: 'Submissions heatmap & solved problem stats', color: 'text-[#39d353]' },
                { id: 'leetcode-streak', name: 'LeetCode Daily Streak', desc: 'Dedicated flaming streak & rank counter', color: 'text-[#f43f5e]' },
                { id: 'coding-platforms', name: 'Coding Platforms Hub', desc: 'LeetCode, CodeChef, GFG & GitHub tracker', color: 'text-[#38bdf8]' },
                { id: 'routine-progress', name: 'Routine & Streak Meter', desc: 'Daily progress bar, 8PM & 10PM status', color: 'text-[#bc8cff]' },
                { id: 'mini-pill', name: 'Minimalist Compact Pill', desc: 'Ultra-compact mini heatmap desktop strip', color: 'text-[#f43f5e]' },
              ].map((opt) => {
                const isRunning = activeWidgets.includes(opt.id as WidgetVariant);
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleToggleWidget(opt.id as WidgetVariant)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isRunning
                        ? 'bg-[#0a84ff]/15 border-[#0a84ff] text-white shadow-[0_0_12px_rgba(10,132,255,0.25)] ring-1 ring-[#0a84ff]/30'
                        : 'bg-black/20 border-white/10 hover:border-white/25 text-white/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className={`text-xs font-bold ${opt.color}`}>{opt.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#39d353] shadow-[0_0_6px_#39d353]' : 'bg-white/20'}`} />
                        <span className={`text-[10px] font-mono ${isRunning ? 'text-[#39d353] font-semibold' : 'text-white/40'}`}>
                          {isRunning ? 'Active' : 'Off'}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/50 leading-relaxed mb-2">{opt.desc}</p>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-white/40">Desktop Widget</span>
                      <span className={isRunning ? 'text-red-400 hover:underline' : 'text-[#0a84ff] hover:underline'}>
                        {isRunning ? 'Click to Close' : 'Click to Launch'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Always on top toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-glass)] bg-black/5 dark:bg-black/20">
            <div>
              <div className="text-xs font-semibold text-[var(--text-main)]">
                Pin Widget Always on Top
              </div>
              <div className="text-[11px] text-[var(--text-sub)] mt-0.5">
                Keep the widget floating on top of all windows (leave disabled for desktop-only display).
              </div>
            </div>
            <label className="macos-switch flex-shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(settings.widgetAlwaysOnTop)}
                onChange={(e) => {
                  const val = e.target.checked;
                  onUpdateSettings({ widgetAlwaysOnTop: val });
                  api.setWidgetAlwaysOnTop(val);
                }}
              />
              <span className="macos-slider" />
            </label>
          </div>

          {/* Auto open on launch */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-glass)] bg-black/5 dark:bg-black/20">
            <div>
              <div className="text-xs font-semibold text-[var(--text-main)]">
                Open Widget Automatically on Launch
              </div>
              <div className="text-[11px] text-[var(--text-sub)] mt-0.5">
                Automatically display the desktop companion widget whenever RemindGo starts up.
              </div>
            </div>
            <label className="macos-switch flex-shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(settings.autoOpenWidget)}
                onChange={(e) => onUpdateSettings({ autoOpenWidget: e.target.checked })}
              />
              <span className="macos-slider" />
            </label>
          </div>
        </div>

        {/* Feature Overview Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-black/5 dark:bg-black/30 border border-[var(--border-glass)]">
            <div className="text-xs font-semibold text-[#0a84ff] flex items-center gap-1.5 mb-1">
              <CheckSquare size={13} /> To-Do Checklist
            </div>
            <div className="text-[11px] text-[var(--text-sub)]">
              Inline task toggle, view pending items, and add instant tasks for today.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/5 dark:bg-black/30 border border-[var(--border-glass)]">
            <div className="text-xs font-semibold text-[#22c55e] flex items-center gap-1.5 mb-1">
              <Calendar size={13} /> Activity Heatmap
            </div>
            <div className="text-[11px] text-[var(--text-sub)]">
              Compact 20-week green grid with current streaks and contribution count.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/5 dark:bg-black/30 border border-[var(--border-glass)]">
            <div className="text-xs font-semibold text-[#f59e0b] flex items-center gap-1.5 mb-1">
              <Code2 size={13} /> LeetCode Daily
            </div>
            <div className="text-[11px] text-[var(--text-sub)]">
              Solved breakdown, ranking, and direct link to solve today's challenge.
            </div>
          </div>
        </div>
      </div>
      <div className="liquid-glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 border-b border-[var(--border-glass)] pb-3">
          <ShieldCheck size={16} className="text-[#bc8cff]" />
          Offline Data & Local Backups
        </h3>

        <p className="text-xs text-[var(--text-sub)]">
          All tasks, activity history, and settings are saved locally inside an SQLite database file. No external internet or cloud account is required.
        </p>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-main)] border border-[var(--border-glass)] py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download size={14} className="text-[#0a84ff]" />
            Export Backup (JSON)
          </button>

          <button
            onClick={handleImport}
            className="flex items-center gap-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-main)] border border-[var(--border-glass)] py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Upload size={14} className="text-[#58a6ff]" />
            Import Backup (JSON)
          </button>
        </div>

        {exportMessage && (
          <div className="p-3 rounded-xl bg-[#0a84ff]/20 border border-[#0a84ff]/40 text-xs text-[#38bdf8]">
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
        <div className="font-semibold text-sm text-[var(--text-main)]">RemindGo v2.7.0 Final • Liquid Glass Edition</div>
        <div className="text-[11px] text-[var(--text-sub)] mt-0.5">
          Multi-Widget Desktop Engine • Windows Low-RAM Architecture • Local SQLite
        </div>
        <div className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
          Developed by HARIPRASANTH T
        </div>
      </div>
    </div>
  );
};
