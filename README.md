# TaskPulse

A Windows desktop task and reminder manager built with Electron, React, TypeScript, and SQLite.

TaskPulse allows users to create scheduled tasks and receive reminders at specific dates and times. It runs in the background through the Windows system tray and stores all data locally.

## Features

### Task Management

- Create, edit, complete, and delete tasks
- Schedule tasks with date and exact time
- Set task priority: Low, Medium, High
- Add categories and tags
- Daily and weekly recurring tasks
- Search and filter tasks
- Separate views for today, upcoming, overdue, and completed tasks

### Reminder System

- Always-on-top alarm popup
- Continuous alarm sound until dismissed or snoozed
- Native Windows notifications
- Snooze options: 5, 10, 15 minutes, or custom duration
- Automatically handles missed alarms after sleep or screen unlock
- Prevents dismissed alarms from triggering again after application restart

### Productivity Heatmap

- GitHub-style 52-week activity heatmap
- Daily task completion tracking
- Different intensity levels based on completed tasks
- Interactive date tooltips
- View the last 12 months or current year
- Select a date to view completed tasks

### Productivity Statistics

- Current daily streak
- Best all-time streak
- Tasks completed today
- Total completed tasks

### Privacy and Offline Storage

- Fully offline application
- No account or login required
- No external servers
- No telemetry
- Local SQLite database
- JSON backup and restore support

Data is stored locally at:

```text
%APPDATA%/TaskPulse/taskpulse.db
```

### Windows Integration

- System tray support
- Minimize to tray
- Close to tray option
- Launch automatically with Windows
- Windows installer and portable executable support

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

TaskPulse uses a GitHub-inspired dark theme.

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

Clone the repository and install the dependencies:

```bash
cd C:\Users\HARIPRASANTH\.gemini\antigravity\scratch\taskpulse

npm.cmd install
```

### Development

Start the application in development mode:

```bash
npm.cmd run dev
```

This starts the Vite development server and Electron application.

## Build

Build the application:

```bash
npm.cmd run build
```

Create Windows installer and portable executable:

```bash
npm.cmd run build:win
```

The generated files will be available in:

```text
release/
```

Example output:

```text
release/TaskPulse Setup 1.0.0.exe
release/TaskPulse-Portable-1.0.0.exe
```

## Alarm Sounds

TaskPulse includes several built-in alarm sound profiles:

1. Digital Alarm
2. Gentle Chime
3. Radar Pulse
4. Synth Bell
5. Classic Beep

The default audio file is located at:

```text
assets/sounds/alarm.wav
```

Custom `.wav` and `.mp3` files can be added to:

```text
assets/sounds/
```

## Project Structure

```text
taskpulse/
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
│   │
│   ├── components/
│   │   ├── Heatmap.tsx
│   │   ├── StatsCard.tsx
│   │   ├── TaskList.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskModal.tsx
│   │   └── AlarmPopup.tsx
│   │
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── TasksPage.tsx
│   │   └── SettingsPage.tsx
│   │
│   ├── services/
│   │   ├── audioService.ts
│   │   └── api.ts
│   │
│   ├── styles/
│   │   └── index.css
│   │
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
