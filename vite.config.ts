import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        alarm: path.resolve(__dirname, 'alarm.html'),
        widget: path.resolve(__dirname, 'widget.html')
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
