import { defineConfig } from 'vitest/config';

// Unit tests for the pure calculations; kept apart from vite.config.ts (shell loader plugin).
export default defineConfig({ test: { include: ['test/**/*.test.ts'] } });
