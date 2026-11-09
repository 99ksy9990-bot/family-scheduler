import { test } from 'node:test'
import assert from 'node:assert/strict'
import { logChanges } from './activity.js'

test('일정 추가·수정·삭제, 할 일 완료를 기록하고 바뀐 게 없으면 그대로', () => {
  const a = { events: [{ id: 'e1', title: '치과', date: '2026-11-10' }, { id: 'e2', title: '회식' }], tasks: [{ id: 't1', title: '우유' }] }
  const b = { ...a, events: [{ id: 'e1', title: '치과', date: '2026-11-11' }, { id: 'e3', title: '여행' }], tasks: [{ id: 't1', title: '우유', done: true }] }
  const out = logChanges(a, b, 'mom', 'T')
  assert.deepEqual(out.activity.map((x) => `${x.title}:${x.action}:${x.by}`).sort(), ['여행:add:mom', '우유:done:mom', '치과:edit:mom', '회식:remove:mom'])
  const same = { ...b }
  assert.equal(logChanges(b, same, 'mom'), same)
})
