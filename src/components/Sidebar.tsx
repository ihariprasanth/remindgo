import React, { useState } from 'react';
import { 
  LayoutDashboard, CheckSquare, Clock, Settings as SettingsIcon, 
  Code2, Search, HardDrive, Sparkles 
} from 'lucide-react';
import { Task } from '../types';
import { format } from 'date-fns';

export type NavTab = 'dashboard' | 'tasks' | 'today' | 'leetcode' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  tasks: Task[];
  hasLeetCodeUsername: boolean;
  theme: 'dark' | 'light';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  tasks,
  hasLeetCodeUsername,
  theme
}) => {
  const [filterText, setFilterText] = useState('');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayPendingCount = tasks.filter((t) => t.status !== 'completed' && t.date === todayStr).length;
  const totalPendingCount = tasks.filter((t) => t.status !== 'completed').length;

  const sections = [
    {
      title: 'FAVORITES',
      items: [
        {
          id: 'dashboard' as const,
          label: 'Dashboard',
          icon: LayoutDashboard,
          badge: null
        },
        {
          id: 'today' as const,
          label: 'Today',
          icon: Clock,
          badge: todayPendingCount > 0 ? todayPendingCount : null
        }
      ]
    },
    {
      title: 'TRACKING',
      items: [
        {
          id: 'tasks' as const,
          label: 'All Tasks',
          icon: CheckSquare,
          badge: totalPendingCount > 0 ? totalPendingCount : null
        },
        {
          id: 'leetcode' as const,
          label: 'LeetCode',
          icon: Code2,
          badge: hasLeetCodeUsername ? 'Live' : 'Connect'
        }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        {
          id: 'settings' as const,
          label: 'Settings',
          icon: SettingsIcon,
          badge: null
        }
      ]
    }
  ];

  return (
    <aside className="w-56 liquid-glass-sidebar flex flex-col justify-between select-none p-3 z-20 transition-colors">
      <div>
        {/* App Title Pill */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 mb-3">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#238636] to-[#39d353] p-0.5 shadow-sm flex items-center justify-center">
            <div className="w-full h-full bg-black/40 rounded-[9px] flex items-center justify-center">
              <Sparkles size={14} className="text-[#39d353]" />
            </div>
          </div>
          <div>
            <span className="font-bold text-xs tracking-wide text-[var(--text-main)] block leading-tight">
              RemindGo
            </span>
            <span className="text-[10px] text-[var(--text-muted)] block leading-tight font-mono">
              macOS 26 Edition
            </span>
          </div>
        </div>

        {/* Sidebar Search Bar (matching macOS System Settings / Finder search) */}
        <div className="relative mb-3.5">
          <Search size={13} className="absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search views..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 bg-black/5 dark:bg-white/5 border border-[var(--border-glass)] rounded-xl text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#007AFF] dark:focus:border-[#39d353] transition-colors"
          />
        </div>

        {/* Categorized Sections */}
        <div className="space-y-4">
          {sections.map((sec, sIdx) => {
            const visibleItems = sec.items.filter((item) =>
              item.label.toLowerCase().includes(filterText.toLowerCase())
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx}>
                <div className="text-[10px] font-bold text-[var(--text-muted)] px-2.5 mb-1 tracking-wider">
                  {sec.title}
                </div>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelectTab(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'liquid-nav-pill-active font-semibold'
                            : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon size={15} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge !== null && (
                          <span
                            className={`text-[10px] font-mono px-2 py-0.2 rounded-full border ${
                              isActive
                                ? 'bg-white/20 text-white border-white/20'
                                : 'bg-black/5 dark:bg-white/10 text-[var(--text-sub)] border-transparent'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer System Status Badge */}
      <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-glass)] text-[11px] text-[var(--text-sub)] space-y-0.5">
        <div className="flex items-center gap-2">
          <HardDrive size={13} className="text-[#39d353]" />
          <span className="font-semibold text-[var(--text-main)]">100% Offline SQLite</span>
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">
          Local Storage • No Telemetry
        </div>
      </div>
    </aside>
  );
};
