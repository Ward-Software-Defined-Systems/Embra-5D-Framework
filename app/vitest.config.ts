import { defineConfig } from 'vitest/config'

// Pure-function unit tests run in a plain Node env — no Cloudflare/Vite plugin,
// no jsdom. The geometry core is framework-agnostic and browser-independent.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
