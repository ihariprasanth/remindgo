import React, { useState } from 'react';
import { 
  Terminal, RefreshCw, ExternalLink, 
  PlusCircle, AlertCircle, CheckCircle, UserCheck, ShieldAlert, Award, Flame, Star, BookOpen
} from 'lucide-react';
import { GeeksForGeeksData } from '../types';

interface GeeksForGeeksPageProps {
  gfgData: GeeksForGeeksData | null;
  savedUsername: string;
  onRefreshData: (username: string, force: boolean) => Promise<void>;
  isLoading: boolean;
  onAddDailyTask: (title: string, description: string) => void;
}

export const GeeksForGeeksPage: React.FC<GeeksForGeeksPageProps> = ({
  gfgData,
  savedUsername,
  onRefreshData,
  isLoading,
  onAddDailyTask
}) => {
  const [inputUsername, setInputUsername] = useState(savedUsername || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSync = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUsername.trim()) {
      setErrorMsg('Please enter a valid GeeksforGeeks username.');
      return;
    }
    setErrorMsg(null);
    try {
      await onRefreshData(inputUsername.trim(), true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not fetch GeeksforGeeks profile.');
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 overflow-y-auto h-full w-full max-w-[1720px] mx-auto">
      {/* Top Header & Username Connect Bar */}
      <div className="liquid-glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30">
                <Terminal size={18} />
              </span>
              <h2 className="text-lg font-bold text-[var(--text-main)] tracking-wide">
                GeeksforGeeks Profile & POTD Tracker
              </h2>
            </div>
            <p className="text-xs text-[var(--text-sub)]">
              Track your GFG coding score, Problem of the Day streak, institute rank, and solved questions.
            </p>
          </div>

          <form onSubmit={handleSync} className="flex items-center gap-2.5">
            <input
              type="text"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              placeholder="GFG Handle (e.g. shariqsde)"
              className="bg-black/40 border border-[var(--border-glass)] rounded-xl px-4 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#22c55e] w-56 md:w-64 transition-all"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-gradient-to-r from-[#22c55e] to-[#15803d] hover:from-[#4ade80] hover:to-[#22c55e] text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </form>
        </div>

        {/* Status Indicators */}
        <div className="mt-4 pt-4 border-t border-[var(--border-glass)] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            {gfgData && !gfgData.isOffline ? (
              <span className="flex items-center gap-1.5 text-[#39d353] font-medium">
                <CheckCircle size={14} /> Live profile connected
              </span>
            ) : gfgData?.isOffline ? (
              <span className="flex items-center gap-1.5 text-[#ffbd2e] font-medium">
                <AlertCircle size={14} /> Offline cache
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <AlertCircle size={14} /> Not connected
              </span>
            )}

            {gfgData?.lastSynced && (
              <span className="text-[var(--text-muted)]">
                Last synced: {new Date(gfgData.lastSynced).toLocaleString()}
              </span>
            )}
          </div>

          <span className="text-[11px] text-[var(--text-muted)]">
            Auto-syncs on launch with network
          </span>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2.5">
            <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {gfgData ? (
        <>
          {/* Profile Overview Card (Wide Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* User Profile Card */}
            <div className="liquid-glass-card rounded-2xl p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#22c55e]/20 to-[#15803d]/30 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] font-bold text-xl overflow-hidden flex-shrink-0">
                <Terminal size={26} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[var(--text-main)] truncate">
                    {gfgData.name}
                  </h3>
                  <span className="p-0.5 text-[#39d353]" title="Verified GFG Developer">
                    <UserCheck size={14} />
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  @{gfgData.username}
                </p>
                {gfgData.designation && (
                  <span className="inline-block mt-1 text-[10px] text-white/70 truncate max-w-full">
                    {gfgData.designation}
                  </span>
                )}
              </div>
            </div>

            {/* Coding Score Card */}
            <div className="liquid-glass-card rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[var(--text-sub)]">
                <span>Coding Score</span>
                <Award size={16} className="text-[#22c55e]" />
              </div>
              <div className="mt-2">
                <span className="text-3xl font-extrabold text-[#22c55e] tracking-tight">
                  {gfgData.codingScore.toLocaleString()}
                </span>
                <span className="text-xs text-[var(--text-muted)] ml-2">practice points</span>
              </div>
            </div>

            {/* POTD Streak Card */}
            <div className="liquid-glass-card rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[var(--text-sub)]">
                <span>Longest Streak</span>
                <Flame size={16} className="text-[#f97316]" />
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#f97316] tracking-tight">
                    {gfgData.streak}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">days continuous</span>
                </div>
                <span className="text-[11px] text-white/50 block mt-0.5">
                  Current: {gfgData.currentStreak} days
                </span>
              </div>
            </div>

            {/* Total Problems Solved Card */}
            <div className="liquid-glass-card rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[var(--text-sub)]">
                <span>Total Solved</span>
                <BookOpen size={16} className="text-[#38bdf8]" />
              </div>
              <div className="mt-2">
                <span className="text-3xl font-extrabold text-[#38bdf8] tracking-tight">
                  {gfgData.totalSolved}
                </span>
                <span className="text-xs text-[var(--text-muted)] ml-2">
                  (POTD: {gfgData.potdSolved})
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action: Schedule GFG POTD Reminder */}
          <div className="liquid-glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-[#22c55e]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#22c55e]/20 text-[#22c55e]">
                  DAILY HABIT
                </span>
                <span className="text-xs font-bold text-[var(--text-main)]">
                  GeeksforGeeks Problem of the Day (POTD)
                </span>
              </div>
              <p className="text-xs text-[var(--text-sub)]">
                Never lose your POTD streak! Add an automated daily reminder to RemindGo.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`https://www.geeksforgeeks.org/user/${gfgData.username}/`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all"
              >
                <span>View on GFG</span>
                <ExternalLink size={13} />
              </a>
              <button
                onClick={() => onAddDailyTask(
                  'GFG Problem of the Day',
                  `Solve today\'s POTD on GeeksforGeeks to protect your streak (${gfgData.streak} days record). User: @${gfgData.username}.`
                )}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#22c55e] to-[#15803d] hover:from-[#4ade80] hover:to-[#22c55e] text-white shadow-lg transition-all cursor-pointer"
              >
                <PlusCircle size={14} />
                <span>Set POTD Reminder in RemindGo</span>
              </button>
            </div>
          </div>

          {/* Performance Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="liquid-glass-card rounded-2xl p-5">
              <span className="text-xs text-[var(--text-sub)]">Institute / University Rank</span>
              <div className="text-2xl font-bold text-white mt-1">
                #{gfgData.instituteRank}
              </div>
              <span className="text-[11px] text-white/50">Campus leaderboard standing</span>
            </div>

            <div className="liquid-glass-card rounded-2xl p-5">
              <span className="text-xs text-[var(--text-sub)]">POTD Submissions</span>
              <div className="text-2xl font-bold text-[#22c55e] mt-1">
                {gfgData.potdSolved}
              </div>
              <span className="text-[11px] text-white/50">Correct daily challenge answers</span>
            </div>

            <div className="liquid-glass-card rounded-2xl p-5">
              <span className="text-xs text-[var(--text-sub)]">Consistency Record</span>
              <div className="text-2xl font-bold text-[#f97316] mt-1">
                {gfgData.streak} Days
              </div>
              <span className="text-[11px] text-white/50">Longest problem of the day streak</span>
            </div>
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="liquid-glass-card rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center text-[#22c55e] mx-auto">
            <Terminal size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-main)] mb-1">
              Connect Your GeeksforGeeks Handle
            </h3>
            <p className="text-xs text-[var(--text-sub)]">
              Enter your GeeksforGeeks username above to track coding score, POTD streaks, problem solving progress, and campus rank offline in RemindGo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
