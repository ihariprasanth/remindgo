import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { DesktopWidget } from './components/DesktopWidget';
import './styles/index.css';

import { WidgetVariant } from './types';

const WidgetApp: React.FC = () => {
  // Retrieve initial variant from URL query param (e.g. ?variant=leetcode-streak)
  const initialVariant = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const v = p.get('variant') as WidgetVariant;
      return v || undefined;
    } catch {
      return undefined;
    }
  })();

  useEffect(() => {
    // Strictly maintain dark mode and widget-transparent classes on document
    const root = document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
    root.classList.add('widget-transparent');
    document.body.classList.add('widget-transparent');
    document.body.classList.remove('light');
  }, []);

  return (
    <div 
      className="w-full h-full overflow-hidden bg-transparent select-none" 
      style={{ background: 'transparent', backgroundColor: 'transparent' }}
    >
      <DesktopWidget initialVariant={initialVariant} />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('widget-root')!).render(
  <React.StrictMode>
    <WidgetApp />
  </React.StrictMode>
);
