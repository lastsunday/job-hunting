import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ['tests/**/*.test.{js,ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    },
  },
})