import { useEffect, useState } from 'react'

// 광양시 광양읍 날씨 (Open-Meteo, 가입 없이 무료). 한 시간마다 새로 받고 폰에 저장해 둠
const URL = 'https://api.open-meteo.com/v1/forecast?latitude=34.976&longitude=127.587&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&timezone=Asia%2FSeoul&forecast_days=2'
const KEY = 'family-scheduler-weather-v3' // 미세먼지 추가로 새 이름
const AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=34.976&longitude=127.587&hourly=pm10,pm2_5&timezone=Asia%2FSeoul&forecast_days=2'
const HOUR = 3600000

export function useWeather() {
  const [data, setData] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY))?.data || null } catch { return null } })
  useEffect(() => {
    let saved = null
    try { saved = JSON.parse(localStorage.getItem(KEY)) } catch { /* 없으면 새로 받기 */ }
    if (saved && Date.now() - saved.at < HOUR) return
    const get = (u) => fetch(u).then((r) => r.ok ? r.json() : null).catch(() => null)
    Promise.all([get(URL), get(AIR)]).then(([json, air]) => {
      if (!json?.hourly) return // 인터넷 없으면 날씨 줄만 안 보임
      const hourly = { ...json.hourly, air: air?.hourly || null }
      setData(hourly)
      try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data: hourly })) } catch { /* 저장 못 해도 화면엔 보임 */ }
    })
  }, [])
  return data
}

const isSnow = (c) => (c >= 71 && c <= 77) || c === 85 || c === 86
const isRain = (c) => (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95
const sky = (c) => isSnow(c) ? 'snow' : isRain(c) ? 'rain' : c <= 1 ? 'sun' : 'cloud'
const SKY_TEXT = { sun: '맑아요', cloud: '흐려요', rain: '비 와요', snow: '눈 와요' }

// 지금 시각 기준: 앞으로 12시간 안 비·눈 소식 → 기온 → 하늘 순으로 한마디
export function weatherNote(hourly, now = new Date()) {
  if (!hourly?.time?.length) return null
  const pad = (n) => String(n).padStart(2, '0')
  const key = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`
  const i = hourly.time.indexOf(key)
  if (i < 0) return null
  const temp = Math.round(hourly.temperature_2m[i])
  const code = hourly.weather_code[i]
  const ahead = hourly.time.slice(i, i + 12).map((t, k) => ({ h: Number(t.slice(11, 13)), p: hourly.precipitation_probability[i + k] ?? 0, c: hourly.weather_code[i + k], t: hourly.temperature_2m[i + k] }))
  const wet = ahead.find((x) => x.p >= 50 || isRain(x.c) || isSnow(x.c))
  const temps = ahead.map((x) => x.t)
  const low = Math.min(...temps), high = Math.max(...temps)
  const when = (h) => h === now.getHours() ? '지금' : `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}시쯤`
  const W = (h) => when(h)
  const ai = hourly.air?.time?.indexOf(key) ?? -1
  const dusty = ai >= 0 && ((hourly.air.pm10[ai] ?? 0) > 80 || (hourly.air.pm2_5[ai] ?? 0) > 35) // 나쁨 기준
  // 저녁 6시 넘으면 내일 아침(7~9시) 날씨를 미리
  const tmr = now.getHours() >= 18 && hourly.time.map((t, k) => ({ t, k })).filter(({ t }) => t > key && /T0[789]:/.test(t)).map(({ k }) => ({ p: hourly.precipitation_probability[k] ?? 0, c: hourly.weather_code[k], t: hourly.temperature_2m[k] }))
  const pick = (list) => list[(now.getDate() * 7 + now.getHours()) % list.length] // 시간마다 다른 말
  let tip, plain = false
  if (tmr?.length) {
    const tl = Math.round(Math.min(...tmr.map((x) => x.t)))
    const tw = tmr.find((x) => x.p >= 50 || isRain(x.c) || isSnow(x.c))
    tip = tw ? (isSnow(tw.c) ? '내일 아침 눈 소식, 길 조심해요' : pick(['내일 아침 비 소식, 우산 챙겨요', '내일 아침 비 와요, 우산 준비해요'])) : tl <= 3 ? `내일 아침 ${tl}°, 많이 추워요` : tl <= 9 ? pick([`내일 아침 ${tl}°, 겉옷 챙겨요`, `내일 아침 ${tl}°, 쌀쌀해요`]) : pick([`내일 아침 ${tl}°, 포근해요`, `내일 아침 ${tl}°, 다니기 좋아요`])
  }
  else if (dusty) tip = pick(['미세먼지 나빠요, 마스크 챙겨요', '공기가 탁해요, 마스크 써요', '미세먼지 많아요, 창문 닫아요'])
  else if (wet && isSnow(wet.c)) tip = pick([`${W(wet.h)} 눈 소식, 미끄럼 조심해요`, `${W(wet.h)} 눈 와요, 천천히 다녀요`, `${W(wet.h)} 눈 소식, 장갑 챙겨요`, `${W(wet.h)} 눈 예보, 길 조심해요`])
  else if (wet) tip = pick([`${W(wet.h)} 비 소식, 우산 챙겨요`, `${W(wet.h)} 비 와요, 우산 잊지 마요`, `${W(wet.h)} 비 예보, 우산 하나 챙겨요`, `${W(wet.h)} 비 올 것 같아요, 우산 챙겨요`])
  else if (low <= 0) tip = pick(['많이 추워요, 따뜻하게 입어요', '꽁꽁 추워요, 목도리 챙겨요', '영하예요, 두툼하게 입어요', '손 시려요, 장갑 챙겨요'])
  else if (low <= 8) tip = pick(['쌀쌀해요, 겉옷 챙겨요', '바람이 차요, 따뜻하게 입어요', '선선해요, 겉옷 하나 챙겨요', '조금 추워요, 감기 조심해요'])
  else if (high >= 31) tip = pick(['무더워요, 물 자주 마셔요', '푹푹 쪄요, 시원하게 지내요', '더워요, 그늘로 다녀요', '많이 더워요, 물 챙겨요'])
  else if ((hourly.wind_speed_10m?.[i] ?? 0) >= 30) tip = pick(['바람이 세요, 모자 조심해요', '바람 많이 불어요', '바람 쌩쌩, 단단히 입어요'])
  else if (high - low >= 10) tip = pick(['일교차가 커요, 겉옷 챙겨요', '아침저녁 쌀쌀해요, 겉옷 챙겨요', '낮엔 따뜻, 밤엔 쌀쌀해요'])
  else { plain = sky(code) === 'sun' || sky(code) === 'cloud'; tip = pick({ sun: ['오늘은 맑아요', '햇살 좋은 날이에요', '나들이하기 좋은 날', '하늘이 맑아요'], cloud: ['오늘은 흐려요', '구름 많은 날이에요', '하늘이 조금 흐려요', '포근하고 흐린 날'], rain: ['비 와요, 우산 챙겨요'], snow: ['눈 와요, 길 조심해요'] }[sky(code)]) }
  const soon = ahead.slice(0, 3).find((x) => x.p >= 50 || isRain(x.c) || isSnow(x.c)) // 3시간 안 비·눈이면 얼굴도
  const wind = hourly.wind_speed_10m?.[i] ?? 0
  const day = now.getHours() >= 7 && now.getHours() < 18
  const mood = dusty ? 'dust' : soon ? (isSnow(soon.c) ? 'snow' : 'rain') : temp <= 3 ? 'cold' : temp >= 30 ? 'hot' : wind >= 30 ? 'windy' : !day ? null : code <= 1 ? 'sunny' : 'cloudy'
  return { mood, dusty, temp, sky: wet && wet.h === now.getHours() ? sky(wet.c) : sky(code), tip, plain }
}

// 그 시각 비 올 확률 50% 이상인지 (일정 옆 우산 표시용, 저장된 예보 사용)
export function rainAt(date, hhmm) {
  let h
  try { h = JSON.parse(localStorage.getItem(KEY))?.data } catch { return false }
  if (!h?.time || !/^\d{2}:/.test(hhmm || '')) return false
  const i = h.time.indexOf(`${date}T${hhmm.slice(0, 2)}:00`)
  return i >= 0 && ((h.precipitation_probability[i] ?? 0) >= 50 || isRain(h.weather_code[i]) || isSnow(h.weather_code[i]))
}
