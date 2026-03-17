import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  root: 'wallet-src',
  build: {
    outDir: path.resolve(__dirname, 'public/js'),
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'wallet-src/wallet-entry.js'),
      output: {
        entryFileNames: 'wallet-bundle.js',
        assetFileNames: 'pikit.[ext]',
        // No code splitting
        inlineDynamicImports: true,
      },
    },
    minify: 'esbuild',
    sourcemap: false,
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
});
