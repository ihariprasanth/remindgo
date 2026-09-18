# TaskPulse ⏱️

> **100% Offline Windows Task & Reminder Manager with GitHub-Style Productivity Heatmap**

TaskPulse is a modern, privacy-first Windows desktop application built with **Electron**, **React**, **TypeScript**, and an embedded **SQLite** local database. It alerts you at the exact scheduled date and time with a high-priority, always-on-top alarm popup window, native Windows notifications, and looping audio, even when minimized to the Windows system tray.

---

## ✨ Features

- 📅 **Task & Exact-Time Reminders**: Schedule tasks with date, time, priority (Low/Medium/High), category tags, and recurrence (Daily / Weekly).
- 🔔 **Persistent Alarm System**:
  - Always-on-top centered alarm popup window.
  - Looping alarm audio chime that rings continuously until dismissed or snoozed.
  - Backup native Windows notification with actionable click.
  - Multi-tiered snooze: 5 minutes, 10 minutes, 15 minutes, or custom duration.
  - Missed alarm catch-up: catches up immediately after waking from sleep or unlocking screen.
  - Persisted notification state: dismissed alarms are never re-triggered on restart.
- 🟩 **GitHub-Style Contribution Heatmap**:
  - 52-week x 7-day activity calendar grid with authentic GitHub dark styling.
  - Green intensity blocks reflecting the count of completed tasks per day.
  - Interactive tooltip showing exact completion counts and formatted dates.
  - Toggle between "Last 12 Months" and "Current Year".
  - Click any square to filter and inspect completed tasks on that day.
- 🔥 **Productivity Stats & Streaks**:
  - Current consecutive day streak calculation.
  - Best all-time streak tracker.
  - Completed today count & total all-time metrics.
- 📴 **100% Offline & Private**:
  - Zero external servers, zero telemetry, zero accounts or logins.
  - Data is saved directly in `%APPDATA%/TaskPulse/taskpulse.db`.
  - Easy JSON backup export and import for seamless offline migration.
- 💻 **Tray & Windows Integration**:
  - Runs in background with custom system tray icon and context menu.
  - Minimize to tray and close-to-tray toggles.
  - Optional "Launch on Windows Startup" setting (`openAtLogin`).

---

## 🎨 GitHub Dark Mode Theme

- Background: `#0d1117`
- Surfaces / Cards: `#161b22`
- Borders: `#30363d`
- Contribution Green: `#0e4429`, `#006d32`, `#26a641`, `#39d353`
- Typography: System font stack + JetBrains Mono for dates and numbers

---

## 🚀 Quick Start & Development

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation
```bash
# Clone or navigate to the project folder
cd C:\Users\HARIPRASANTH\.gemini\antigravity\scratch\taskpulse

# Install dependencies
npm.cmd install
```

### Running in Development Mode
```bash
npm.cmd run dev
```
This runs the Vite React development server concurrently with Electron.

---

## 📦 Building the Windows Executable (.exe)

TaskPulse uses `electron-builder` to package both an NSIS installer and a standalone portable `.exe`:

```bash
# Compile both frontend and backend
npm.cmd run build

# Package Windows installer and portable .exe
npm.cmd run build:win
```

Output binaries will be generated in the `release/` directory:
- `release/TaskPulse Setup 1.0.0.exe` (Full Windows installer with desktop shortcut and Start Menu entry)
- `release/TaskPulse-Portable-1.0.0.exe` (Single standalone executable that runs without installation)

---

## 🎵 Custom Alarm Sounds

TaskPulse comes with 5 synthesized alarm sound profiles that work with zero external dependencies:
1. **Digital Alarm**: Classic rhythmic electronic beeper
2. **Gentle Chime**: Harmonic crystalline bells
3. **Radar Pulse**: Sonar ping with reverberation
4. **Synth Bell**: Warm FM synthesizer chime
5. **Classic Beep**: Rapid double alert beeps

A standard sample audio file is included in:
`assets/sounds/alarm.wav`

To use custom `.wav` or `.mp3` files, place your audio files into `assets/sounds/` and reference them in the application settings.

---

## 📂 Project Architecture

```
taskpulse/
├── electron/
│   ├── main.ts              # Electron main process, single instance lock, IPC
│   ├── preload.ts           # Context bridge exposing typed window.electronAPI
│   ├── scheduler.ts         # 10s background alarm polling engine & powerMonitor
│   ├── tray.ts              # System tray icon, context menu, minimize actions
│   ├── db/
│   │   ├── database.ts      # SQLite storage engine using sql.js with disk persistence
│   │   └── schema.ts        # Table schemas, indices, and default preferences
│   └── windows/
│       ├── mainWindow.ts    # Main application window
│       └── alarmWindow.ts   # Always-on-top centered alarm popup window
├── src/
│   ├── index.html           # Main application HTML
│   ├── alarm.html           # Dedicated alarm popup HTML
│   ├── main.tsx             # React main mount
│   ├── alarm.tsx            # Dedicated alarm popup React mount
│   ├── App.tsx              # Application layout, sidebar, and routing
│   ├── components/
│   │   ├── Heatmap.tsx      # 52-week contribution heatmap
│   │   ├── StatsCard.tsx    # Streak and metric counters
│   │   ├── TaskList.tsx     # Grouped task list (Today/Upcoming/Overdue/Done)
│   │   ├── TaskCard.tsx     # Individual task item card
│   │   ├── TaskModal.tsx    # Add / Edit task modal dialog
│   │   └── AlarmPopup.tsx   # Alarm modal with snooze and dismiss controls
│   ├── pages/
│   │   ├── DashboardPage.tsx# Heatmap + Today Agenda
│   │   ├── TasksPage.tsx    # Task manager with filters and search
│   │   └── SettingsPage.tsx # Audio preview, tray settings, JSON backup
│   ├── services/
│   │   ├── audioService.ts  # Web Audio API sound synthesizer with infinite loop
│   │   └── api.ts           # Typed IPC wrapper with dev fallback
│   ├── styles/
│   │   └── index.css        # Tailwind and GitHub dark theme styles
│   └── types/
│       └── index.ts         # Data contracts & interfaces
├── assets/
│   ├── icon.ico             # Windows executable icon
│   ├── icon.png             # Application logo
│   ├── tray-icon.png        # System tray icon
│   └── sounds/              # Audio files
├── electron-builder.json     # Packaging config for Windows
└── package.json
```

---

## 📄 License
MIT License
