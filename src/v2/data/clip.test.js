import test from 'node:test'
import assert from 'node:assert/strict'
import { pasteAt } from './clip.js'
test('붙여넣기: 새 날짜, id 없음, 여러 날 길이 유지', () => {
  const r = pasteAt({ id: 'a', title: '여행', date: '2026-11-01', endDate: '2026-11-03', time: '09:00' }, '2026-11-30')
  assert.equal(r.id, undefined); assert.equal(r.date, '2026-11-30'); assert.equal(r.endDate, '2026-12-02'); assert.equal(r.title, '여행')
  assert.equal(pasteAt({ id: 'b', date: '2026-11-01', endDate: '2026-11-01' }, '2026-11-05').endDate, '2026-11-05')
})
