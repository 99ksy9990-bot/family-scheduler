import { defineConfig } from '@playwright/test'

// 브라우저·개발 서버 없이 데이터 변환만 Node에서 검증한다.
export default defineConfig({
  testDir: '.',
  testMatch: ['migrate.spec.js', 'schedule.spec.js', 'tasks.spec.js', 'eventTime.spec.js', 'house.spec.js'],
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  reporter: 'list',
})
