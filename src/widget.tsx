import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { DesktopWidget } from './components/DesktopWidget';
import { api } from './services/api';
import './styles/index.css';

import { WidgetVariant } from './types';

const WidgetApp: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Retrieve initial variant from URL query param (e.g. ?variant=leetcode-streak)
  const [initialVariant] = useState<WidgetVariant | undefined>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const v = p.get('variant') as WidgetVariant;
      return v || undefined;
    } catch {
      return undefined;
    }
  });

  useEffect(() => {
    api.getSettings().then((s) => {
      if (s?.theme) {
        setTheme(s.theme);
        applyTheme(s.theme);
      }
    });
  }, []);

  const applyTheme = (th: 'dark' | 'light') => {
    const root = document.documentElement;
    if (th === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  };

  const handleToggleTheme = async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    await api.updateSettings({ theme: nextTheme });
  };

  return (
    <div className={`w-screen h-screen overflow-hidden ${theme}`}>
      <DesktopWidget initialVariant={initialVariant} theme={theme} onToggleTheme={handleToggleTheme} />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('widget-root')!).render(
  <React.StrictMode>
    <WidgetApp />
  </React.StrictMode>
);
