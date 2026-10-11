import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@shared': resolve('src/shared') } },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 300000, hookTimeout: 300000 }
})
