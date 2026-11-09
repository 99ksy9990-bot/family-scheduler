import { test } from 'node:test'
import assert from 'node:assert/strict'
import { weatherNote } from './weather.js'

const day = (temps, probs, codes) => ({ time: temps.map((_, h) => `2026-11-09T${String(h).padStart(2, '0')}:00`), temperature_2m: temps, precipitation_probability: probs, weather_code: codes })
const at = (h) => new Date(2026, 10, 9, h)

test('비 소식은 시각과 우산, 없으면 기온·하늘', () => {
  const n = Array(24).fill(0)
  assert.match(weatherNote(day(Array(24).fill(15), n.map((_, h) => h === 15 ? 70 : 0), n), at(9)).tip, /^오후 3시쯤 비.*우산/)
  assert.ok(weatherNote(day(Array(24).fill(5), n, n), at(9)).tip)
  assert.match(weatherNote(day(Array(24).fill(18), n, n), at(9)).tip, /맑|햇살|나들이/)
  assert.equal(weatherNote(day(Array(24).fill(18), n, n), at(9)).temp, 18)
  assert.equal(weatherNote(null, at(9)), null)
})
