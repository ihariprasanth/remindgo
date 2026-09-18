import React, { useState } from 'react';
import { 
  Code2, RefreshCw, Flame, Trophy, ExternalLink, 
  PlusCircle, AlertCircle, CheckCircle, UserCheck, ShieldAlert, Sparkles 
} from 'lucide-react';
import { LeetCodeData } from '../types';

interface LeetCodePageProps {
  leetCodeData: LeetCodeData | null;
  savedUsername: string;
  onRefreshData: (username: string, force: boolean) => Promise<void>;
  isLoading: boolean;
  onAddDailyTask: (title: string, description: string, difficulty: string) => void;
}

export const LeetCodePage: React.FC<LeetCodePageProps> = ({
  leetCodeData,
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
      setErrorMsg('Please enter a valid LeetCode username.');
      return;
    }
    setErrorMsg(null);
    try {
      await onRefreshData(inputUsername.trim(), true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not fetch LeetCode profile.');
    }
  };

  const getPercentage = (solved: number, total: number) => {
    if (!total || total === 0) return 0;
    return Math.min(100, Math.round((solved / total) * 100));
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full max-w-5xl mx-auto">
      {/* Top Header & Username Connect Bar */}
      <div className="liquid-glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30">
                <Code2 size={18} />
              </span>
              <h2 className="text-lg font-bold text-[var(--text-main)] tracking-wide">
                LeetCode Profile & Daily Tracker
              </h2>
            </div>
            <p className="text-xs text-[var(--text-sub)]">
              Track your LeetCode progress, daily challenges, and submission streaks offline.
            </p>
          </div>

          {/* Username Input form */}
          <form onSubmit={handleSync} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="LeetCode username..."
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              className="px-3.5 py-2 bg-black/5 dark:bg-black/40 border border-[var(--border-glass)] rounded-xl text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#f59e0b] w-48 sm:w-56 font-mono"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-black font-semibold text-xs rounded-xl transition-all shadow-[0_2px_12px_rgba(245,158,11,0.3)] cursor-pointer"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </form>
        </div>

        {/* Status indicator bar */}
        {leetCodeData && (
          <div className="mt-4 pt-3 border-t border-[var(--border-glass)] flex items-center justify-between text-[11px] text-[var(--text-sub)] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {leetCodeData.isOffline ? (
                <span className="flex items-center gap-1.5 text-[#f59e0b]">
                  <ShieldAlert size={14} />
                  <span>Offline (Cached local data)</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[#39d353]">
                  <CheckCircle size={14} />
                  <span>Live profile connected</span>
                </span>
              )}
              <span>•</span>
              <span>Last synced: {new Date(leetCodeData.lastSynced).toLocaleString()}</span>
            </div>

            <div className="text-[var(--text-muted)] font-mono text-[10px]">
              Auto-syncs on launch with network
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2.5">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold">{errorMsg}</div>
              <div className="text-[11px] text-[var(--text-sub)] mt-1">
                Tip: Make sure the username exists on leetcode.com. You can test with username <button onClick={() => { setInputUsername('neal_wu'); onRefreshData('neal_wu', true); }} className="underline font-mono text-[#f59e0b] cursor-pointer">neal_wu</button>.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* If No Data Connected */}
      {!leetCodeData && !isLoading && (
        <div className="liquid-glass-card rounded-2xl p-12 text-center border-dashed border-[var(--border-glass)]">
          <Code2 size={44} className="mx-auto text-[#f59e0b] mb-3 opacity-80" />
          <h3 className="text-base font-semibold text-[var(--text-main)]">No LeetCode profile connected</h3>
          <p className="text-xs text-[var(--text-sub)] max-w-md mx-auto mt-1 mb-5">
            Enter your LeetCode username above to fetch your solved problem stats, global ranking, and today's daily coding challenge.
          </p>
          <div className="inline-flex gap-2">
            <button
              onClick={() => {
                setInputUsername('neal_wu');
                onRefreshData('neal_wu', true);
              }}
              className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs text-[var(--text-main)] font-semibold border border-[var(--border-glass)] transition-colors cursor-pointer"
            >
              Test with sample: neal_wu
            </button>
          </div>
        </div>
      )}

      {/* Main LeetCode Stats View */}
      {leetCodeData && (
        <>
          {/* User Profile Banner & Streak Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* User Details */}
            <div className="liquid-glass-card rounded-2xl p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#f59e0b] to-[#fbbf24] p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.25)] flex-shrink-0">
                {leetCodeData.userAvatar ? (
                  <img
                    src={leetCodeData.userAvatar}
                    alt={leetCodeData.username}
                    className="w-full h-full object-cover rounded-[14px]"
                  />
                ) : (
                  <div className="w-full h-full bg-black/40 rounded-[14px] flex items-center justify-center text-lg font-bold text-[#f59e0b]">
                    {leetCodeData.username.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold text-[var(--text-main)] truncate">
                  {leetCodeData.realName || leetCodeData.username}
                </div>
                <div className="text-xs text-[var(--text-sub)] font-mono">@{leetCodeData.username}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#f59e0b] bg-[#f59e0b]/15 px-2 py-0.5 rounded-full border border-[#f59e0b]/30">
                  <UserCheck size={11} /> Verified Member
                </div>
              </div>
            </div>

            {/* Global Ranking */}
            <div className="liquid-glass-card rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-sub)] font-medium">Global Ranking</span>
                <span className="p-2 rounded-xl bg-[#bc8cff]/15 text-[#bc8cff]">
                  <Trophy size={16} />
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-[var(--text-main)]">
                  #{leetCodeData.ranking ? leetCodeData.ranking.toLocaleString() : 'N/A'}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Top percentile coder</div>
              </div>
            </div>

            {/* Active Streak */}
            <div className="liquid-glass-card rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-sub)] font-medium">Coding Streak</span>
                <span className="p-2 rounded-xl bg-[#f43f5e]/15 text-[#f43f5e]">
                  <Flame size={16} />
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-[#f43f5e] flex items-center gap-1">
                  <span>{leetCodeData.streak}</span>
                  <span className="text-sm font-normal text-[var(--text-sub)]">days</span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {leetCodeData.totalActiveDays} total active days
                </div>
              </div>
            </div>
          </div>

          {/* Today's Daily Coding Challenge Widget */}
          {leetCodeData.dailyChallenge && (
            <div className="liquid-glass-card rounded-2xl p-6 border border-[#f59e0b]/30 bg-gradient-to-r from-[#f59e0b]/10 to-transparent">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#f59e0b] text-black">
                      Today's Daily Challenge
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        leetCodeData.dailyChallenge.difficulty === 'Easy'
                          ? 'bg-[#39d353]/15 text-[#39d353] border-[#39d353]/30'
                          : leetCodeData.dailyChallenge.difficulty === 'Medium'
                          ? 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30'
                          : 'bg-[#f43f5e]/15 text-[#f43f5e] border-[#f43f5e]/30'
                      }`}
                    >
                      {leetCodeData.dailyChallenge.difficulty}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                    <span>{leetCodeData.dailyChallenge.questionFrontendId}.</span>
                    <span>{leetCodeData.dailyChallenge.title}</span>
                  </h3>
                  <p className="text-xs text-[var(--text-sub)] mt-1">
                    Solve today's challenge to keep your LeetCode streak alive!
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <a
                    href={leetCodeData.dailyChallenge.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs text-[var(--text-main)] font-medium flex items-center gap-1.5 border border-[var(--border-glass)] transition-colors"
                  >
                    <span>Open in LeetCode</span>
                    <ExternalLink size={13} />
                  </a>

                  <button
                    onClick={() => {
                      if (leetCodeData.dailyChallenge) {
                        onAddDailyTask(
                          `LeetCode Daily: ${leetCodeData.dailyChallenge.questionFrontendId}. ${leetCodeData.dailyChallenge.title}`,
                          `Solve daily challenge (${leetCodeData.dailyChallenge.difficulty}): ${leetCodeData.dailyChallenge.link}`,
                          leetCodeData.dailyChallenge.difficulty
                        );
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <PlusCircle size={15} />
                    <span>Set Reminder in RemindGo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Solved Problems Breakdown */}
          <div className="liquid-glass-card rounded-2xl p-6">
            <h3 className="text-sm font-bold text-[var(--text-main)] mb-5 flex items-center gap-2">
              <Sparkles size={16} className="text-[#39d353]" />
              Solved Problems Breakdown
            </h3>

            {/* Total Solved Overview */}
            <div className="mb-6 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-glass)] flex items-center justify-between flex-wrap gap-4">
              <div>
                <span className="text-xs text-[var(--text-sub)] block">Total Solved</span>
                <span className="text-3xl font-bold font-mono text-[var(--text-main)]">
                  {leetCodeData.totalSolved}
                  <span className="text-sm font-normal text-[var(--text-muted)] ml-1.5">
                    / {leetCodeData.totalQuestions} questions
                  </span>
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-[var(--text-sub)] block">Solved Rate</span>
                <span className="text-xl font-bold font-mono text-[#39d353]">
                  {getPercentage(leetCodeData.totalSolved, leetCodeData.totalQuestions)}%
                </span>
              </div>
            </div>

            {/* Difficulty Bars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Easy */}
              <div className="p-4 rounded-xl bg-[#39d353]/[0.08] border border-[#39d353]/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#39d353]">Easy</span>
                    <span className="text-xs font-mono text-[var(--text-main)]">
                      {leetCodeData.easySolved} / {leetCodeData.totalEasy}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-black/20 dark:bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#39d353] rounded-full transition-all duration-500"
                      style={{ width: `${getPercentage(leetCodeData.easySolved, leetCodeData.totalEasy)}%` }}
                    />
                  </div>
                </div>
                <div className="text-[11px] text-[var(--text-sub)] mt-3 text-right font-mono">
                  {getPercentage(leetCodeData.easySolved, leetCodeData.totalEasy)}% completed
                </div>
              </div>

              {/* Medium */}
              <div className="p-4 rounded-xl bg-[#f59e0b]/[0.08] border border-[#f59e0b]/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#f59e0b]">Medium</span>
                    <span className="text-xs font-mono text-[var(--text-main)]">
                      {leetCodeData.mediumSolved} / {leetCodeData.totalMedium}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-black/20 dark:bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#f59e0b] rounded-full transition-all duration-500"
                      style={{ width: `${getPercentage(leetCodeData.mediumSolved, leetCodeData.totalMedium)}%` }}
                    />
                  </div>
                </div>
                <div className="text-[11px] text-[var(--text-sub)] mt-3 text-right font-mono">
                  {getPercentage(leetCodeData.mediumSolved, leetCodeData.totalMedium)}% completed
                </div>
              </div>

              {/* Hard */}
              <div className="p-4 rounded-xl bg-[#f43f5e]/[0.08] border border-[#f43f5e]/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#f43f5e]">Hard</span>
                    <span className="text-xs font-mono text-[var(--text-main)]">
                      {leetCodeData.hardSolved} / {leetCodeData.totalHard}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-black/20 dark:bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#f43f5e] rounded-full transition-all duration-500"
                      style={{ width: `${getPercentage(leetCodeData.hardSolved, leetCodeData.totalHard)}%` }}
                    />
                  </div>
                </div>
                <div className="text-[11px] text-[var(--text-sub)] mt-3 text-right font-mono">
                  {getPercentage(leetCodeData.hardSolved, leetCodeData.totalHard)}% completed
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
