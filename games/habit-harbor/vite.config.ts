import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  base: '/habit-harbor/',
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5174, open: true },
  build: { outDir: 'dist', sourcemap: true, target: 'es2020' },
  define: {
    __TEST_SEAM__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
