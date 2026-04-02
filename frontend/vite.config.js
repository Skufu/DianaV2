import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Bundle visualizer - only in analyze mode
    mode === 'analyze' && visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }),
  ].filter(Boolean),
  server: {
    port: 4000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Enable source maps for debugging (optional, can disable for smaller builds)
    sourcemap: mode === 'analyze',
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
          // Animation library
          animation: ['framer-motion'],
        },
      },
    },
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Use esbuild for minification (faster, built-in)
    minify: 'esbuild',
    // Report chunk sizes
    reportCompressedSize: true,
  },
}));
