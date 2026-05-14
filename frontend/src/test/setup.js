import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

const createMemoryStorage = () => {
  let store = new Map();
  return {
    getItem: key => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => {
      store.set(String(key), String(value));
    },
    removeItem: key => {
      store.delete(String(key));
    },
    clear: () => {
      store = new Map();
    },
    key: index => Array.from(store.keys())[index] || null,
    get length() {
      return store.size;
    },
  };
};

if (!globalThis.localStorage || typeof globalThis.localStorage.clear !== 'function') {
  const storage = createMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });
  }
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});
