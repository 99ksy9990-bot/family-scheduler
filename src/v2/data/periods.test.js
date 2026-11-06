import test from 'node:test'
import assert from 'node:assert/strict'
import { periodName } from './periods.js'
const now = new Date(2026, 10, 6)
test('기간 이름', () => {
  assert.equal(periodName({ season: '학기', start: '2026-08-18' }, { grade: 2 }, now), '2학년 2학기')
  assert.equal(periodName({ season: 'term', start: '2026-03-02' }, { grade: 2 }, now), '2학년 1학기')
  assert.equal(periodName({ season: '학기', start: '2025-08-18' }, { grade: 2 }, now), '1학년 2학기')
  assert.equal(periodName({ season: '방학', start: '2026-07-16' }, { grade: 2 }, now), '2학년 여름방학')
  assert.equal(periodName({ season: 'vacation', start: '2027-01-09' }, null, now), '겨울방학')
  assert.equal(periodName({ season: '학기', start: '2026-08-18', name: '특강' }, { grade: 2 }, now), '특강')
  assert.equal(periodName({ season: '방학', grade: '5', term: '겨울방학', start: '2027-01-09' }, null, now), '5학년 겨울방학')
})
