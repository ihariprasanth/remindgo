import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Task, Settings } from './types';
import { AlarmPopup } from './components/AlarmPopup';
import { api } from './services/api';
import './styles/index.css';

const AlarmApp: React.FC = () => {
  const [task, setTask] = useState<Task | null>(null);
  const [settings, setSettings] = useState<Settings | undefined>(undefined);

  useEffect(() => {
    // Fetch settings
    api.getSettings().then(setSettings);

    // Listen for alarm payload
    const cleanup = api.onAlarmTrigger((incomingTask) => {
      console.log('[AlarmApp] Received alarm task:', incomingTask);
      setTask(incomingTask);
    });

    return () => {
      cleanup();
    };
  }, []);

  const handleDismiss = async (markDone: boolean = false) => {
    if (task) {
      await api.dismissAlarm(task.id, markDone);
    }
  };

  const handleSnooze = async (minutes: number) => {
    if (task) {
      await api.snoozeAlarm(task.id, minutes);
    }
  };

  if (!task) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#000000] text-[#8b949e] text-xs font-mono">
        Waiting for alarm data...
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-[#000000]">
      <AlarmPopup
        task={task}
        settings={settings}
        onDismiss={handleDismiss}
        onSnooze={handleSnooze}
      />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('alarm-root')!).render(
  <React.StrictMode>
    <AlarmApp />
  </React.StrictMode>
);
