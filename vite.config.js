import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_URL = process.env.API_URL || 'http://localhost:3000';

export default defineConfig({
  root: 'web',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': API_URL,
      '/uploads': API_URL,
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
