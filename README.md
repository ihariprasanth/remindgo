# RemindGo

A privacy-first Windows task and reminder manager built with Electron, React, TypeScript, and SQLite.

RemindGo helps you create scheduled tasks, receive precise reminders, track productivity, and manage daily activities from a simple desktop application.

## Features

### Task Management

- Create, edit, complete, and delete tasks
- Schedule tasks with exact date and time
- Set task priority: Low, Medium, High
- Add categories and tags
- Daily and weekly recurring tasks
- Search and filter tasks
- Track today, upcoming, overdue, and completed tasks

### Reminder System

- Always-on-top alarm popup
- Continuous alarm sound
- Native Windows notifications
- Snooze for 5, 10, 15 minutes, or custom duration
- Missed alarm recovery after sleep or screen unlock
- Prevents dismissed alarms from triggering again

### Productivity Heatmap

- GitHub-style 52-week activity heatmap
- Daily task completion tracking
- Completion intensity based on activity
- Interactive date tooltips
- Last 12 months and current year views
- Click a date to view completed tasks

### Productivity Statistics

- Current daily streak
- Best all-time streak
- Tasks completed today
- Total completed tasks

### Offline and Privacy

- 100% offline
- No account or login required
- No external servers
- No telemetry
- Local SQLite database
- JSON backup and restore

Data is stored locally at:

```text
%APPDATA%/RemindGo/remindgo.db
```

### Windows Integration

- System tray support
- Minimize to tray
- Close to tray
- Launch on Windows startup
- Windows installer
- Portable executable

## Technology Stack

- Electron
- React
- TypeScript
- Vite
- SQLite
- sql.js
- Tailwind CSS
- Electron Builder
- Web Audio API

## Theme

RemindGo uses a GitHub-inspired dark theme.

```text
Background:        #0d1117
Cards / Surfaces:  #161b22
Borders:           #30363d
```

Contribution colors:

```text
#0e4429
#006d32
#26a641
#39d353
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm
- Windows

### Installation

```bash
git clone <repository-url>
cd RemindGo
npm.cmd install
```

### Development

```bash
npm.cmd run dev
```

This starts the Vite development server and Electron application.

## Build

Build the application:

```bash
npm.cmd run build
```

Create the Windows installer and portable executable:

```bash
npm.cmd run build:win
```

Generated files will be available in:

```text
release/
```

Example:

```text
release/RemindGo Setup 1.0.0.exe
release/RemindGo-Portable-1.0.0.exe
```

## Alarm Sounds

RemindGo includes multiple built-in alarm profiles:

1. Digital Alarm
2. Gentle Chime
3. Radar Pulse
4. Synth Bell
5. Classic Beep

Default sound:

```text
assets/sounds/alarm.wav
```

Custom `.wav` and `.mp3` files can be added to:

```text
assets/sounds/
```

## Project Structure

```text
RemindGo/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── scheduler.ts
│   ├── tray.ts
│   ├── db/
│   │   ├── database.ts
│   │   └── schema.ts
│   └── windows/
│       ├── mainWindow.ts
│       └── alarmWindow.ts
│
├── src/
│   ├── index.html
│   ├── alarm.html
│   ├── main.tsx
│   ├── alarm.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── Heatmap.tsx
│   │   ├── StatsCard.tsx
│   │   ├── TaskList.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskModal.tsx
│   │   └── AlarmPopup.tsx
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── TasksPage.tsx
│   │   └── SettingsPage.tsx
│   ├── services/
│   │   ├── audioService.ts
│   │   └── api.ts
│   ├── styles/
│   │   └── index.css
│   └── types/
│       └── index.ts
│
├── assets/
│   ├── icon.ico
│   ├── icon.png
│   ├── tray-icon.png
│   └── sounds/
│
├── electron-builder.json
└── package.json
```

## License

MIT License
