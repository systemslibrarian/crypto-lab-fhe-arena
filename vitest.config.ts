import { defineConfig } from 'vitest/config'

// Unit tests live in src/ next to the code they exercise. The Playwright a11y
// suite lives in e2e/ and must NOT be collected by vitest (it needs a browser).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    environment: 'node'
  }
})
