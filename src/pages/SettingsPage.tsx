import React, { useState, useEffect } from 'react';
import {
  Volume2, Bell, Play, Square, HardDrive, Download, Upload, ShieldCheck, Check,
  Code2, Pin, CheckSquare, Calendar, Sparkles, Cpu, Trophy, Terminal, Palette,
  Monitor, Sun, Moon, Type, Zap, Heart, Info, Layers
} from 'lucide-react';
import { Settings, WidgetVariant, AppTheme, AccentColor, FontFamily } from '../types';
import { SOUND_OPTIONS, audioService } from '../services/audioService';
import { api } from '../services/api';
import logoSquircle from '../assets/logo-squircle.png';

interface SettingsPageProps {
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
  onDataImported: () => void;
}

const THEME_OPTIONS: Array<{
  id: AppTheme;
  name: string;
  category: 'macOS' | 'Windows';
  appearance: 'Dark' | 'Light';
  description: string;
  bgPreview: string;
  accentPreview: string;
  isWindows: boolean;
}> = [
  {
    id: 'mac-dark',
    name: 'macOS Sonoma Dark',
    category: 'macOS',
    appearance: 'Dark',
    description: 'Deep obsidian liquid glass with Apple traffic-light controls & vibrant dark glow',
    bgPreview: 'from-[#141419] to-[#0a0a0f] border-white/10',
    accentPreview: '#0a84ff',
    isWindows: false,
  },
  {
    id: 'mac-light',
    name: 'macOS Sonoma Light',
    category: 'macOS',
    appearance: 'Light',
    description: 'Frosted pearl glass with Apple traffic lights, subtle shadows & crisp readability',
    bgPreview: 'from-[#f5f5f7] to-[#e8e8ed] border-black/10',
    accentPreview: '#0071e3',
    isWindows: false,
  },
  {
    id: 'windows-dark',
    name: 'Windows 11 Mica Dark',
    category: 'Windows',
    appearance: 'Dark',
    description: 'Fluent Mica Dark acrylic styling, sleek borders & native Windows 11 window controls',
    bgPreview: 'from-[#202020] to-[#121212] border-white/10',
    accentPreview: '#60cdff',
    isWindows: true,
  },
  {
    id: 'windows-light',
    name: 'Windows 11 Mica Light',
    category: 'Windows',
    appearance: 'Light',
    description: 'Fluent Clean Light slate styling, sharp modern borders & native Windows title controls',
    bgPreview: 'from-[#f3f3f3] to-[#e9e9e9] border-black/10',
    accentPreview: '#005fb8',
    isWindows: true,
  },
];

const ACCENT_COLORS: Array<{
  id: AccentColor;
  name: string;
  hex: string;
}> = [
  { id: 'blue', name: 'Electric Blue', hex: '#0a84ff' },
  { id: 'purple', name: 'Neon Purple', hex: '#a855f7' },
  { id: 'green', name: 'Emerald Green', hex: '#22c55e' },
  { id: 'amber', name: 'Amber Sun', hex: '#f59e0b' },
  { id: 'coral', name: 'Coral Rose', hex: '#f43f5e' },
  { id: 'cyan', name: 'Cyber Cyan', hex: '#06b6d4' },
];

const FONT_OPTIONS: Array<{
  id: FontFamily;
  name: string;
  preview: string;
  desc: string;
}> = [
  { id: 'sf-pro', name: 'Apple SF Pro', preview: 'Aa Bb Gg 123', desc: 'macOS Sonoma native rounded typography' },
  { id: 'segoe-ui', name: 'Windows Segoe UI', preview: 'Aa Bb Gg 123', desc: 'Windows 11 Fluent interface typography' },
  { id: 'mono', name: 'JetBrains / Geist Mono', preview: 'const code = 1;', desc: 'High-precision monospace for developers' },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onDataImported
}) => {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [lcUsername, setLcUsername] = useState(settings.leetcodeUsername || '');
  const [ccUsername, setCcUsername] = useState(settings.codechefUsername || '');
  const [gfgUser, setGfgUser] = useState(settings.gfgUsername || '');
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

  const handleSaveCodeChef = () => {
    onUpdateSettings({ codechefUsername: ccUsername.trim() });
    setExportMessage('CodeChef username updated!');
    setTimeout(() => setExportMessage(null), 3000);
  };

  const handleSaveGfg = () => {
    onUpdateSettings({ gfgUsername: gfgUser.trim() });
    setExportMessage('GeeksforGeeks username updated!');
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

  const currentTheme = settings.theme || 'mac-dark';
  const currentAccent = settings.accentColor || 'blue';
  const currentFont = settings.fontFamily || 'sf-pro';

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 overflow-y-auto h-full w-full max-w-[1720px] mx-auto">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)] tracking-wide flex items-center gap-2">
          <Palette size={20} className="text-[var(--accent-primary)]" />
          Settings & Preferences
        </h2>
        <p className="text-xs text-[var(--text-sub)]">
          Customize themes, typography, desktop widgets, coding accounts, alarm profiles, and offline backups
        </p>
      </div>

      {/* 1. APPEARANCE & CUSTOMIZATION STUDIO */}
      <div className="liquid-glass-card rounded-2xl p-6 space-y-6 border border-[var(--border-glass)]">
        <div className="flex items-center justify-between border-b border-[var(--border-glass)] pb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <Palette size={16} className="text-[var(--accent-primary)]" />
              Appearance & Theme Studio
            </h3>
            <p className="text-[11px] text-[var(--text-sub)] mt-0.5">
              Choose between native macOS Sonoma and Windows 11 Fluent design engines with instant live preview
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 font-semibold">
            Active: {THEME_OPTIONS.find((t) => t.id === currentTheme)?.name || currentTheme}
          </span>
        </div>

        {/* 4 Theme Cards */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-sub)] mb-2.5 uppercase tracking-wider">
            System Theme Engines
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {THEME_OPTIONS.map((thm) => {
              const isSelected = currentTheme === thm.id || (thm.id === 'mac-dark' && currentTheme === 'dark') || (thm.id === 'mac-light' && currentTheme === 'light');
              return (
                <div
                  key={thm.id}
                  onClick={() => onUpdateSettings({ theme: thm.id })}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] shadow-[0_0_16px_rgba(10,132,255,0.25)] ring-2 ring-[var(--accent-primary)]/40'
                      : 'border-[var(--border-glass)] hover:border-[var(--accent-primary)]/40 bg-black/5 dark:bg-black/20 hover:bg-black/10 dark:hover:bg-black/30'
                  }`}
                >
                  <div>
                    {/* Mini Window Frame Mockup Preview */}
                    <div className={`w-full h-16 rounded-lg bg-gradient-to-br ${thm.bgPreview} border p-2 mb-3 shadow-inner flex flex-col justify-between`}>
                      <div className="flex items-center justify-between">
                        {thm.isWindows ? (
                          <>
                            <div className="w-8 h-1.5 rounded bg-white/30" />
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-0.5 bg-white/60 inline-block" />
                              <span className="w-1.5 h-1.5 border border-white/60 inline-block" />
                              <span className="text-[8px] text-red-400 font-bold leading-none">✕</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#ff5f56]" />
                              <span className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
                              <span className="w-2 h-2 rounded-full bg-[#27c93f]" />
                            </div>
                            <div className="w-10 h-1.5 rounded bg-white/20" />
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: thm.accentPreview }} />
                        <div className="w-16 h-1.5 rounded bg-white/20" />
                        <div className="w-8 h-1.5 rounded bg-white/10" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-[var(--accent-primary)] transition-colors">
                        {thm.name}
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[var(--text-sub)]">
                        {thm.category}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[var(--text-sub)] flex items-center gap-1">
                        {thm.appearance === 'Dark' ? <Moon size={9} /> : <Sun size={9} />}
                        {thm.appearance}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[var(--text-sub)] leading-relaxed mt-1">
                    {thm.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accent Color Palette & Typography Engine */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Dynamic Accent Colors */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[var(--text-sub)] uppercase tracking-wider">
              Accent Color Palette
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {ACCENT_COLORS.map((acc) => {
                const isSelected = currentAccent === acc.id;
                return (
                  <button
                    key={acc.id}
                    onClick={() => onUpdateSettings({ accentColor: acc.id })}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--text-main)] bg-black/10 dark:bg-white/10 shadow-sm ring-2 ring-[var(--accent-primary)]'
                        : 'border-[var(--border-glass)] bg-black/5 dark:bg-black/20 hover:border-white/30'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110"
                      style={{ backgroundColor: acc.hex }}
                    >
                      {isSelected && <Check size={13} className="text-white drop-shadow" strokeWidth={3} />}
                    </span>
                    <span className="text-[10px] font-medium text-[var(--text-main)] text-center leading-tight">
                      {acc.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Typography Engine */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[var(--text-sub)] uppercase tracking-wider">
              Typography Font Engine
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {FONT_OPTIONS.map((fnt) => {
                const isSelected = currentFont === fnt.id;
                return (
                  <button
                    key={fnt.id}
                    onClick={() => onUpdateSettings({ fontFamily: fnt.id })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] shadow-sm'
                        : 'border-[var(--border-glass)] bg-black/5 dark:bg-black/20 hover:border-white/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-main)]'}`}>
                          {fnt.name}
                        </span>
                        {isSelected && <Check size={12} className="text-[var(--accent-primary)]" />}
                      </div>
                      <p className="text-[10px] text-[var(--text-sub)] leading-tight">{fnt.desc}</p>
                    </div>
                    <div className="text-[11px] font-mono mt-2 pt-1 border-t border-[var(--border-glass)] text-[var(--text-main)] opacity-70">
                      {fnt.preview}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Performance & Visual Toggles */}
        <div className="pt-2 border-t border-[var(--border-glass)] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Glass & Acrylic Blur Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-glass)] bg-black/5 dark:bg-black/20">
            <div>
              <div className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                <Layers size={14} className="text-[var(--accent-primary)]" />
                Acrylic Glass & Backdrop Blur
              </div>
              <div className="text-[11px] text-[var(--text-sub)] mt-0.5">
                Enable translucent frosted glass styling. Disable for low-spec GPU/RAM speed boost.
              </div>
            </div>
            <label className="macos-switch flex-shrink-0 cursor-pointer ml-3">
              <input
                type="checkbox"
                checked={settings.glassEffects !== false}
                onChange={(e) => onUpdateSettings({ glassEffects: e.target.checked })}
              />
              <span className="macos-slider" />
            </label>
          </div>

          {/* Instant 0ms Widget Boot */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-glass)] bg-black/5 dark:bg-black/20">
            <div>
              <div className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                <Zap size={14} className="text-[#39d353]" />
                Instant Widget Startup (&lt;200ms)
              </div>
              <div className="text-[11px] text-[var(--text-sub)] mt-0.5">
                Hydrates widgets instantly from local cache without waiting for network or heavy windows.
              </div>
            </div>
            <label className="macos-switch flex-shrink-0 cursor-pointer ml-3">
              <input
                type="checkbox"
                checked={settings.instantStartup !== false}
                onChange={(e) => onUpdateSettings({ instantStartup: e.target.checked })}
              />
              <span className="macos-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* 2. Coding Account Integrations (3-Card Responsive Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* LeetCode Sync Settings */}
        <div className="liquid-glass-card rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 border-b border-[var(--border-glass)] pb-3">
              <Code2 size={16} className="text-[#f59e0b]" />
              LeetCode Integration
            </h3>

            <div className="mt-4">
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">
                LeetCode Username
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lcUsername}
                  onChange={(e) => setLcUsername(e.target.value)}
                  placeholder="e.g. 1har1prasanth"
                  className="flex-1 bg-black/5 dark:bg-black/40 border border-[var(--border-glass)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#f59e0b] font-mono"
                />
                <button
                  onClick={handleSaveLeetCode}
                  className="px-3.5 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-black text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Caches solved problems, streak, and calendar offline.
          </p>
        </div>

        {/* CodeChef Sync Settings */}
        <div className="liquid-glass-card rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 border-b border-[var(--border-glass)] pb-3">
              <Trophy size={16} className="text-[#eab308]" />
              CodeChef Integration
            </h3>

            <div className="mt-4">
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">
                CodeChef Username
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ccUsername}
                  onChange={(e) => setCcUsername(e.target.value)}
                  placeholder="e.g. tourist"
                  className="flex-1 bg-black/5 dark:bg-black/40 border border-[var(--border-glass)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#eab308] font-mono"
                />
                <button
                  onClick={handleSaveCodeChef}
                  className="px-3.5 py-2 bg-[#eab308] hover:bg-[#ca8a04] text-black text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Caches ratings, star tier, global rank, and division points offline.
          </p>
        </div>

        {/* GeeksforGeeks Sync Settings */}
        <div className="liquid-glass-card rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 border-b border-[var(--border-glass)] pb-3">
              <Terminal size={16} className="text-[#22c55e]" />
              GeeksforGeeks Integration
            </h3>

            <div className="mt-4">
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">
                GeeksforGeeks Username
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={gfgUser}
                  onChange={(e) => setGfgUser(e.target.value)}
                  placeholder="e.g. shariqsde"
                  className="flex-1 bg-black/5 dark:bg-black/40 border border-[var(--border-glass)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#22c55e] font-mono"
                />
                <button
                  onClick={handleSaveGfg}
                  className="px-3.5 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Caches coding score, POTD streaks, and campus leaderboard rank offline.
          </p>
        </div>
      </div>

      {/* 3. Alarm & Sound Settings */}
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

      {/* 4. Windows & Background Running Behavior */}
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
                Start Automatically with Windows (Instant Boot)
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

      {/* 5. Desktop Multi-Widget Manager */}
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
            <span>Windows Low-RAM Multi-Widget Architecture</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
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

      {/* 6. Offline Data & Local Backups */}
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

      {/* 7. ABOUT & DEVELOPER SHOWCASE CARD */}
      <div className="liquid-glass-card rounded-2xl p-6 border border-[var(--border-glass)] space-y-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-2xl border-2 border-white/20 bg-white p-1 flex-shrink-0">
            <img src={logoSquircle} alt="RemindGo" className="w-full h-full object-cover rounded-[18px]" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-extrabold text-[var(--text-main)] tracking-wide">
                  RemindGo
                </h3>
                <p className="text-xs text-[var(--text-sub)]">
                  Desktop Productivity Matrix & Coding Companion
                </p>
              </div>

              <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
                <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-[#0a84ff]/15 text-[#0a84ff] border border-[#0a84ff]/30 shadow-sm">
                  v3.5.0 Production
                </span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 shadow-sm flex items-center gap-1.5">
                  <ShieldCheck size={13} />
                  Code-Signed CN=HARIPRASANTH T
                </span>
              </div>
            </div>

            {/* Developer & License Badges */}
            <div className="pt-2 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 border border-blue-500/30 text-xs font-bold text-[var(--text-main)] flex items-center gap-2 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Developer: HARIPRASANTH T</span>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-black/10 dark:bg-white/10 border border-[var(--border-glass)] text-xs font-semibold text-[var(--text-sub)] flex items-center gap-1.5">
                <Heart size={13} className="text-red-400 fill-red-400" />
                <span>Free to Use, Open Source (MIT License)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Architecture Diagnostics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-[var(--border-glass)] text-[11px]">
          <div className="p-3 rounded-xl bg-black/5 dark:bg-black/30 border border-[var(--border-glass)]">
            <span className="text-[var(--text-muted)] block text-[10px] uppercase tracking-wider font-semibold">Engine</span>
            <span className="font-semibold text-[var(--text-main)] mt-0.5 block">Windows Low-RAM Multi-Widget</span>
            <span className="text-[10px] text-[var(--text-sub)]">~70MB shared memory footprint</span>
          </div>

          <div className="p-3 rounded-xl bg-black/5 dark:bg-black/30 border border-[var(--border-glass)]">
            <span className="text-[var(--text-muted)] block text-[10px] uppercase tracking-wider font-semibold">Cold Startup</span>
            <span className="font-semibold text-[#39d353] mt-0.5 block">&lt;200ms Instant Hydration</span>
            <span className="text-[10px] text-[var(--text-sub)]">Zero network blocking at boot</span>
          </div>

          <div className="p-3 rounded-xl bg-black/5 dark:bg-black/30 border border-[var(--border-glass)]">
            <span className="text-[var(--text-muted)] block text-[10px] uppercase tracking-wider font-semibold">Storage & Privacy</span>
            <span className="font-semibold text-[var(--text-main)] mt-0.5 block">100% Offline SQLite</span>
            <span className="text-[10px] text-[var(--text-sub)]">Zero telemetries, no login required</span>
          </div>

          <div className="p-3 rounded-xl bg-black/5 dark:bg-black/30 border border-[var(--border-glass)]">
            <span className="text-[var(--text-muted)] block text-[10px] uppercase tracking-wider font-semibold">Stack</span>
            <span className="font-semibold text-[var(--text-main)] mt-0.5 block">Electron 29 • React 18 • TS 5</span>
            <span className="text-[10px] text-[var(--text-sub)]">Tailwind CSS • Lucide Icons</span>
          </div>
        </div>
      </div>
    </div>
  );
};
