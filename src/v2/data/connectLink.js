// 연결 링크: #connect= 뒤에 이메일·비밀번호를 담음 (주소의 # 뒷부분은 서버로 전송되지 않음)
export const encodeConnect = (email, password) => btoa(unescape(encodeURIComponent(JSON.stringify([email, password])))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
export const decodeConnect = (value) => { try { const [email, password] = JSON.parse(decodeURIComponent(escape(atob(value.replaceAll('-', '+').replaceAll('_', '/'))))); return email && password ? { email, password } : null } catch { return null } }

