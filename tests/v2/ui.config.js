import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.', testMatch: 'ui.spec.js', forbidOnly: Boolean(process.env.CI), workers: 2,
  reporter: 'list', use: { baseURL: 'http://127.0.0.1:4176', timezoneId: 'Asia/Seoul', trace: 'off' },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'], viewport: { width: 393, height: 852 }, browserName: 'chromium' } },
    { name: 'wide-phone', use: { viewport: { width: 1920, height: 945 } } },
  ],
  webServer: { command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4176 --strictPort', url: 'http://127.0.0.1:4176', reuseExistingServer: false },
})
