import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, '../../..'), 'server-only': path.resolve(import.meta.dirname, 'server-only.ts') } },
  test: { environment: 'node', include: ['src/app/admin/_tests/*.test.ts'], restoreMocks: true },
});
