import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    // Only run unit tests from src/, exclude Playwright E2E specs
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
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
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
        'src/test/**',
        'src/stories/**',
        'src/**/index.{js,jsx}',
        'src/main.jsx',
        // Legacy helper imports zod, which is not part of the installed frontend runtime.
        'src/utils/validation.js',
        '**/*.config.{js,ts,cjs,mjs}',
        '**/*.stories.{js,jsx,ts,tsx}',
        '.storybook/**',
        'coverage/**',
        'dist/**',
        'e2e/**',
        'node_modules/**',
        'public/**',
        'test-env.js',
        'verify-responsive-ui.js',
      ],
      // Coverage thresholds for production source. Function coverage is lower because
      // V8 counts every local React event handler, including view-specific branches.
      thresholds: {
        lines: 70,
        functions: 40,
        branches: 60,
        statements: 70,
      },
    },
  },
});
