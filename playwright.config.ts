import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  // Test tokens and passwords stay out of traces, videos, and persisted storage states.
  use: {
    baseURL: 'http://localhost:5174',
    channel: 'msedge',
    viewport: { width: 1440, height: 960 },
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  webServer: {
    // Exercise the deployable bundle; keep StrictMode checks enabled during development.
    command: 'npm run build && npm run preview -- --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    timeout: 60_000,
    env: { BACKEND_URL: 'https://localhost:7243', NODE_TLS_REJECT_UNAUTHORIZED: '1' },
  },
})
