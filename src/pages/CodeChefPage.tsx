import React, { useState } from 'react';
import { 
  Trophy, RefreshCw, ExternalLink, 
  PlusCircle, AlertCircle, CheckCircle, UserCheck, ShieldAlert, Award, Star, Globe, Flag
} from 'lucide-react';
import { CodeChefData } from '../types';

interface CodeChefPageProps {
  codeChefData: CodeChefData | null;
  savedUsername: string;
  onRefreshData: (username: string, force: boolean) => Promise<void>;
  isLoading: boolean;
  onAddContestTask: (title: string, description: string) => void;
}

export const CodeChefPage: React.FC<CodeChefPageProps> = ({
  codeChefData,
  savedUsername,
  onRefreshData,
  isLoading,
  onAddContestTask
}) => {
  const [inputUsername, setInputUsername] = useState(savedUsername || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSync = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUsername.trim()) {
      setErrorMsg('Please enter a valid CodeChef username.');
      return;
    }
    setErrorMsg(null);
    try {
      await onRefreshData(inputUsername.trim(), true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not fetch CodeChef profile.');
    }
  };

  const getStarColor = (stars: string) => {
    if (stars.includes('7★') || stars.includes('6★')) return 'from-[#d0011b] to-[#990000] text-red-400 border-red-500/40';
    if (stars.includes('5★')) return 'from-[#f5a623] to-[#d48806] text-amber-400 border-amber-500/40';
    if (stars.includes('4★')) return 'from-[#bd10e0] to-[#7b0099] text-purple-400 border-purple-500/40';
    if (stars.includes('3★')) return 'from-[#4a90e2] to-[#1b55a0] text-blue-400 border-blue-500/40';
    if (stars.includes('2★')) return 'from-[#7ed321] to-[#417505] text-green-400 border-green-500/40';
    return 'from-neutral-700 to-neutral-900 text-neutral-300 border-white/20';
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 overflow-y-auto h-full w-full max-w-[1720px] mx-auto">
      {/* Top Header & Username Connect Bar */}
      <div className="liquid-glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/30">
                <Trophy size={18} />
              </span>
              <h2 className="text-lg font-bold text-[var(--text-main)] tracking-wide">
                CodeChef Profile & Rating Tracker
              </h2>
            </div>
            <p className="text-xs text-[var(--text-sub)]">
              Track your competitive rating, star tier, contest rank, and solved problems offline.
            </p>
          </div>

          <form onSubmit={handleSync} className="flex items-center gap-2.5">
            <input
              type="text"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              placeholder="CodeChef Username (e.g. tourist)"
              className="bg-black/40 border border-[var(--border-glass)] rounded-xl px-4 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#eab308] w-56 md:w-64 transition-all"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-gradient-to-r from-[#eab308] to-[#ca8a04] hover:from-[#facc15] hover:to-[#eab308] text-black font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </form>
        </div>

        {/* Status Indicators */}
        <div className="mt-4 pt-4 border-t border-[var(--border-glass)] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            {codeChefData && !codeChefData.isOffline ? (
              <span className="flex items-center gap-1.5 text-[#39d353] font-medium">
                <CheckCircle size={14} /> Live profile connected
              </span>
            ) : codeChefData?.isOffline ? (
              <span className="flex items-center gap-1.5 text-[#ffbd2e] font-medium">
                <AlertCircle size={14} /> Offline cache
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <AlertCircle size={14} /> Not connected
              </span>
            )}

            {codeChefData?.lastSynced && (
              <span className="text-[var(--text-muted)]">
                Last synced: {new Date(codeChefData.lastSynced).toLocaleString()}
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

      {codeChefData ? (
        <>
          {/* Profile Overview Card (Wide Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* User Profile Card */}
            <div className="liquid-glass-card rounded-2xl p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#eab308]/20 to-[#ca8a04]/30 border border-[#eab308]/30 flex items-center justify-center text-[#eab308] font-bold text-xl overflow-hidden flex-shrink-0">
                <Trophy size={26} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[var(--text-main)] truncate">
                    {codeChefData.name}
                  </h3>
                  <span className="p-0.5 text-[#39d353]" title="Verified Competitor">
                    <UserCheck size={14} />
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  @{codeChefData.username}
                </p>
                {codeChefData.division && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-semibold text-white/80 border border-white/10">
                    {codeChefData.division}
                  </span>
                )}
              </div>
            </div>

            {/* Current Rating & Star Tier Card */}
            <div className="liquid-glass-card rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[var(--text-sub)]">
                <span>Current Rating</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r ${getStarColor(codeChefData.stars)} border`}>
                  {codeChefData.stars}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
                  {codeChefData.rating}
                </span>
                <span className="text-xs text-[var(--text-muted)] ml-2">division points</span>
              </div>
            </div>

            {/* Global Rank Card */}
            <div className="liquid-glass-card rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[var(--text-sub)]">
                <span>Global Rank</span>
                <Globe size={16} className="text-[#38bdf8]" />
              </div>
              <div className="mt-2">
                <span className="text-3xl font-extrabold text-[#38bdf8] tracking-tight">
                  #{typeof codeChefData.globalRank === 'number' ? codeChefData.globalRank.toLocaleString() : codeChefData.globalRank}
                </span>
                <span className="text-xs text-[var(--text-muted)] block mt-0.5">worldwide rank</span>
              </div>
            </div>

            {/* Country Rank Card */}
            <div className="liquid-glass-card rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[var(--text-sub)]">
                <span>Country Rank</span>
                <Flag size={16} className="text-[#a855f7]" />
              </div>
              <div className="mt-2">
                <span className="text-3xl font-extrabold text-[#a855f7] tracking-tight">
                  #{typeof codeChefData.countryRank === 'number' ? codeChefData.countryRank.toLocaleString() : codeChefData.countryRank}
                </span>
                <span className="text-xs text-[var(--text-muted)] block mt-0.5">national rank</span>
              </div>
            </div>
          </div>

          {/* Quick Action: Schedule Next Contest Challenge */}
          <div className="liquid-glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-[#eab308]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eab308]/20 text-[#eab308]">
                  COMPETITIVE ROUTINE
                </span>
                <span className="text-xs font-bold text-[var(--text-main)]">
                  CodeChef Contest & Practice Goal
                </span>
              </div>
              <p className="text-xs text-[var(--text-sub)]">
                Keep your ratings active! Add a daily CodeChef practice alarm to RemindGo.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`https://www.codechef.com/users/${codeChefData.username}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all"
              >
                <span>View on CodeChef</span>
                <ExternalLink size={13} />
              </a>
              <button
                onClick={() => onAddContestTask(
                  'CodeChef Contest / Practice Session',
                  `Solve competitive problems on CodeChef for user @${codeChefData.username}. Current rating: ${codeChefData.rating} (${codeChefData.stars}).`
                )}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#eab308] to-[#ca8a04] hover:from-[#facc15] hover:to-[#eab308] text-black shadow-lg transition-all cursor-pointer"
              >
                <PlusCircle size={14} />
                <span>Set Reminder in RemindGo</span>
              </button>
            </div>
          </div>

          {/* Solved Problems Breakdown */}
          <div className="liquid-glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-[#eab308]" />
                <h3 className="text-sm font-bold text-[var(--text-main)] tracking-wide">
                  Problem Solving Record
                </h3>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                Total Solved: <strong className="text-white">{codeChefData.fullySolved + codeChefData.partiallySolved}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fully Solved */}
              <div className="p-4 rounded-xl bg-black/20 border border-[#39d353]/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-[#39d353]">Fully Solved</span>
                  <div className="text-2xl font-bold text-white mt-1">
                    {codeChefData.fullySolved}
                  </div>
                  <span className="text-[11px] text-white/50">Accepted on all test cases</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#39d353]/20 flex items-center justify-center text-[#39d353]">
                  <CheckCircle size={24} />
                </div>
              </div>

              {/* Partially Solved */}
              <div className="p-4 rounded-xl bg-black/20 border border-[#eab308]/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-[#eab308]">Partially Solved</span>
                  <div className="text-2xl font-bold text-white mt-1">
                    {codeChefData.partiallySolved}
                  </div>
                  <span className="text-[11px] text-white/50">Subtask points earned</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#eab308]/20 flex items-center justify-center text-[#eab308]">
                  <Star size={24} />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="liquid-glass-card rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#eab308]/10 border border-[#eab308]/20 flex items-center justify-center text-[#eab308] mx-auto">
            <Trophy size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-main)] mb-1">
              Connect Your CodeChef Handle
            </h3>
            <p className="text-xs text-[var(--text-sub)]">
              Enter your CodeChef username above to track ratings, division, global rank, and problem solving milestones offline in RemindGo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
