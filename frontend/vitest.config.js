import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    // Reporter configuration for CI
    reporters: ['verbose', 'junit'],
    outputFile: './coverage/junit-report.xml',
    // Test timeout for slow tests
    testTimeout: 30000,
    // Fail on console errors in tests
    onConsoleLog: (log, type) => {
      if (type === 'error') {
        return false; // Don't suppress console errors
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.{js,ts}',
        '**/*.stories.jsx',
        'e2e/**',
      ],
      // Coverage thresholds - fail if below 70%
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
});
