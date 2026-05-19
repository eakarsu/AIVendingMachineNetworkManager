import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Allow JSX inside .js files (used by custom-views components/page)
  plugins: [react({ include: /\.(js|jsx|ts|tsx)$/ })],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  server: {
    port: 4800,
    proxy: {
      '/api': {
        target: 'http://localhost:4801',
        changeOrigin: true,
      },
    },
  },
});
