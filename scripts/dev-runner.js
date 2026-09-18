const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

function checkViteReady(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const tryConnect = () => {
      const req = http.get(`http://localhost:${port}/`, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Timed out waiting for Vite dev server'));
        } else {
          setTimeout(tryConnect, 300);
        }
      });
    };
    tryConnect();
  });
}

async function start() {
  console.log('[dev-runner] Waiting for Vite server on port 5173...');
  try {
    await checkViteReady(5173);
    console.log('[dev-runner] Vite server is ready. Building electron scripts...');
    
    // Run build:electron first
    const buildProcess = spawn('node', ['./scripts/build-electron.js'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      shell: true
    });

    buildProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('[dev-runner] Build electron failed with code', code);
        return;
      }

      console.log('[dev-runner] Starting Electron...');
      const electronCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const electronProcess = spawn(electronCmd, ['electron', '.'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'development', VITE_DEV_SERVER_URL: 'http://localhost:5173' },
        shell: true
      });

      electronProcess.on('close', (eCode) => {
        console.log('[dev-runner] Electron exited with code', eCode);
        process.exit(eCode || 0);
      });
    });
  } catch (err) {
    console.error('[dev-runner]', err);
    process.exit(1);
  }
}

start();
