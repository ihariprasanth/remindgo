import React, { useEffect, useState, useCallback } from 'react';
import { Task, Settings, LeetCodeData, TaskPriority } from './types';
import { api } from './services/api';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { TaskModal } from './components/TaskModal';
import { AlarmPopup } from './components/AlarmPopup';
import { audioService } from './services/audioService';
import { getMillisUntilMidnightIST } from './utils/istTime';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { SettingsPage } from './pages/SettingsPage';
import { LeetCodePage } from './pages/LeetCodePage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [history, setHistory] = useState<NavTab[]>(['dashboard']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<Settings>({
    alarmSound: 'digital-alarm',
    soundVolume: 0.8,
    snoozeDuration: 5,
    minimizeToTray: true,
    closeToTray: true,
    startWithWindows: true,
    leetcodeUsername: '',
    theme: 'dark'
  });

  const [leetCodeData, setLeetCodeData] = useState<LeetCodeData | null>(null);
  const [isLeetCodeLoading, setIsLeetCodeLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalPrefill, setModalPrefill] = useState<{
    title?: string;
    description?: string;
    category?: string;
    priority?: TaskPriority;
  } | undefined>(undefined);
  const [inAppAlarmTask, setInAppAlarmTask] = useState<Task | null>(null);

  // Pure Pitch-Black OLED Dark Mode Only
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [fetchedTasks, fetchedSettings, storedLeetCode] = await Promise.all([
        api.getTasks(),
        api.getSettings(),
        api.getStoredLeetCodeData()
      ]);
      setTasks(fetchedTasks);
      setSettings(fetchedSettings);
      if (storedLeetCode) {
        setLeetCodeData(storedLeetCode);
      }

      if (fetchedSettings.leetcodeUsername) {
        api.getLeetCodeData(fetchedSettings.leetcodeUsername, false)
          .then((liveData) => {
            if (liveData) setLeetCodeData(liveData);
          })
          .catch((err) => {
            console.warn('[App] Background LeetCode refresh:', err);
          });
      }
    } catch (err) {
      console.error('[App] Failed to load data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    let cleanupTrayAction: (() => void) | undefined;
    if ((api as any).onOpenAddTask) {
      cleanupTrayAction = (api as any).onOpenAddTask(() => {
        setEditingTask(null);
        setModalPrefill(undefined);
        setIsModalOpen(true);
      });
    }

    const cleanupAlarm = api.onAlarmTrigger((task) => {
      setInAppAlarmTask(task);
      loadData();
    });

    const cleanupAlarmDismissed = api.onAlarmDismissed?.(() => {
      audioService.stopLoop();
      setInAppAlarmTask(null);
      loadData();
    });

    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);

    // Exact 12:00 AM IST Midnight Auto-Reset
    let midnightTimer: any;
    const scheduleMidnight = () => {
      const delay = getMillisUntilMidnightIST();
      midnightTimer = setTimeout(() => {
        console.log('[App] 12:00 AM IST hit - refreshing tasks for the new day');
        loadData();
        scheduleMidnight();
      }, delay);
    };
    scheduleMidnight();

    return () => {
      cleanupTrayAction?.();
      cleanupAlarm();
      cleanupAlarmDismissed?.();
      window.removeEventListener('focus', handleFocus);
      if (midnightTimer) clearTimeout(midnightTimer);
    };
  }, [loadData]);

  // Tab navigation with history
  const navigateToTab = (tab: NavTab) => {
    if (tab === currentTab) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(tab);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentTab(tab);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentTab(history[newIndex]);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentTab(history[newIndex]);
    }
  };

  // LeetCode refresh
  const handleRefreshLeetCode = async (username: string, force: boolean = false) => {
    setIsLeetCodeLoading(true);
    try {
      const data = await api.getLeetCodeData(username, force);
      setLeetCodeData(data);
      setSettings((prev) => ({ ...prev, leetcodeUsername: username }));
    } finally {
      setIsLeetCodeLoading(false);
    }
  };

  // 1-Click create daily challenge task
  const handleAddLeetCodeDailyTask = (title: string, description: string, difficulty: string) => {
    let pri: TaskPriority = 'medium';
    if (difficulty.toLowerCase() === 'easy') pri = 'low';
    if (difficulty.toLowerCase() === 'hard') pri = 'high';

    setEditingTask(null);
    setModalPrefill({
      title,
      description,
      category: 'Study',
      priority: pri
    });
    setIsModalOpen(true);
  };

  // Task Handlers
  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'status'> & { id?: string }) => {
    if (taskData.id) {
      const existing = tasks.find((t) => t.id === taskData.id);
      if (existing) {
        await api.updateTask({
          ...existing,
          ...taskData
        });
      }
    } else {
      await api.createTask(taskData);
    }
    await loadData();
    setIsModalOpen(false);
    setEditingTask(null);
    setModalPrefill(undefined);
  };

  const handleToggleTask = async (id: string) => {
    await api.toggleTaskStatus(id);
    await loadData();
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await api.deleteTask(id);
      await loadData();
    }
  };

  const handleEditTask = (task: Task) => {
    setModalPrefill(undefined);
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleOpenAddTask = () => {
    setEditingTask(null);
    setModalPrefill(undefined);
    setIsModalOpen(true);
  };

  const handleUpdateSettings = async (partial: Partial<Settings>) => {
    const updated = await api.updateSettings(partial);
    setSettings(updated);
    if (partial.leetcodeUsername && partial.leetcodeUsername !== leetCodeData?.username) {
      handleRefreshLeetCode(partial.leetcodeUsername, true);
    }
  };

  const getHeaderTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Productivity Dashboard';
      case 'tasks':
        return 'All Tasks';
      case 'today':
        return 'Today’s Schedule';
      case 'leetcode':
        return 'LeetCode Tracker';
      case 'settings':
        return 'Settings';
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden dark">
      {/* Outer macOS Window Container with Liquid Glass Frame */}
      <div className="flex flex-col flex-1 overflow-hidden liquid-glass-base">
        {/* macOS Unified Titlebar & Toolbar */}
        <Header
          title={getHeaderTitle()}
          onOpenAddTask={handleOpenAddTask}
          onBack={handleBack}
          onForward={handleForward}
        />

        {/* Main Work Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* macOS Finder/Settings Sidebar */}
          <Sidebar
            currentTab={currentTab}
            onSelectTab={navigateToTab}
            tasks={tasks}
            hasLeetCodeUsername={Boolean(settings.leetcodeUsername || leetCodeData?.username)}
            theme={settings.theme}
          />

          {/* Content Area */}
          <main className="flex-1 overflow-hidden bg-transparent">
            {currentTab === 'dashboard' && (
              <DashboardPage
                tasks={tasks}
                leetCodeData={leetCodeData}
                onToggleTask={handleToggleTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onOpenAddTask={handleOpenAddTask}
              />
            )}

            {currentTab === 'tasks' && (
              <TasksPage
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onOpenAddTask={handleOpenAddTask}
                initialFilter="all"
              />
            )}

            {currentTab === 'today' && (
              <TasksPage
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onOpenAddTask={handleOpenAddTask}
                initialFilter="today"
              />
            )}

            {currentTab === 'leetcode' && (
              <LeetCodePage
                leetCodeData={leetCodeData}
                savedUsername={settings.leetcodeUsername || ''}
                onRefreshData={handleRefreshLeetCode}
                isLoading={isLeetCodeLoading}
                onAddDailyTask={handleAddLeetCodeDailyTask}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsPage
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onDataImported={loadData}
              />
            )}
          </main>
        </div>
      </div>

      {/* Add / Edit Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        initialTask={editingTask}
        prefill={modalPrefill}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
          setModalPrefill(undefined);
        }}
        onSave={handleSaveTask}
      />

      {/* In-app Alarm Overlay fallback */}
      {inAppAlarmTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md h-[440px]">
            <AlarmPopup
              task={inAppAlarmTask}
              settings={settings}
              onDismiss={async (markDone) => {
                audioService.stopLoop();
                await api.dismissAlarm(inAppAlarmTask.id, markDone);
                setInAppAlarmTask(null);
                loadData();
              }}
              onSnooze={async (minutes) => {
                audioService.stopLoop();
                await api.snoozeAlarm(inAppAlarmTask.id, minutes);
                setInAppAlarmTask(null);
                loadData();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
