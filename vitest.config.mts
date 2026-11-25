import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * The logic layer (data, engine, store) imports nothing from React Native, so
 * it runs under plain Node with no native mocking. UI and 3D rendering are not
 * covered here — those are verified by running the app.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
