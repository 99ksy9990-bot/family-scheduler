import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeConnect, decodeConnect } from './connectLink.js'
test('연결 링크 왕복 (한글·특수문자)', () => {
  const v = encodeConnect('a+b@daum.net', 'pw/한글*=')
  assert.ok(!/[+/=]/.test(v))
  assert.deepEqual(decodeConnect(v), { email: 'a+b@daum.net', password: 'pw/한글*=' })
  assert.equal(decodeConnect('broken!!'), null)
})
