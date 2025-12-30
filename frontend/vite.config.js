import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Enable source maps for debugging (optional, can disable for smaller builds)
    sourcemap: false,
    // Inline assets smaller than 4KB
    assetsInlineLimit: 4096,
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk (react core)
          vendor: ['react', 'react-dom'],
          // Charts library (large, loaded on-demand)
          charts: ['recharts'],
          // Icons library
          icons: ['lucide-react'],
        },
      },
    },
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Use esbuild for minification (faster, built-in)
    minify: 'esbuild',
  },
});
