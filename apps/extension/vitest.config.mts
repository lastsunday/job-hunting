import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: "jsdom",
    testTimeout: 120_000,
    include: ['tests/**/*.test.{js,ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    },
  },
})