import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  base: '/privacy-vaults/',
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5175, open: true },
  build: { outDir: 'dist', sourcemap: true, target: 'es2020' },
  define: {
    __TEST_SEAM__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
