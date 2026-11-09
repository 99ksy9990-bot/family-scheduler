import { useEffect, useState } from 'react'

// 광양시 광양읍 날씨 (Open-Meteo, 가입 없이 무료). 한 시간마다 새로 받고 폰에 저장해 둠
const URL = 'https://api.open-meteo.com/v1/forecast?latitude=34.976&longitude=127.587&hourly=temperature_2m,precipitation_probability,weather_code&timezone=Asia%2FSeoul&forecast_days=2'
const KEY = 'family-scheduler-weather'
const HOUR = 3600000

export function useWeather() {
  const [data, setData] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY))?.data || null } catch { return null } })
  useEffect(() => {
    let saved = null
    try { saved = JSON.parse(localStorage.getItem(KEY)) } catch { /* 없으면 새로 받기 */ }
    if (saved && Date.now() - saved.at < HOUR) return
    fetch(URL).then((r) => r.ok ? r.json() : null).then((json) => {
      if (!json?.hourly) return
      setData(json.hourly)
      try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data: json.hourly })) } catch { /* 저장 못 해도 화면엔 보임 */ }
    }).catch(() => {}) // 인터넷 없으면 날씨 줄만 안 보임
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
  let tip
  if (wet && (isSnow(wet.c))) tip = `${when(wet.h)} 눈 소식, 미끄럼 조심해요`
  else if (wet) tip = `${when(wet.h)} 비 소식, 우산 챙겨요`
  else if (low <= 0) tip = '많이 추워요, 따뜻하게 입어요'
  else if (low <= 8) tip = '쌀쌀해요, 겉옷 챙겨요'
  else if (high >= 31) tip = '무더워요, 물 자주 마셔요'
  else if (high - low >= 10) tip = '일교차가 커요, 겉옷 챙겨요'
  else tip = `오늘은 ${SKY_TEXT[sky(code)]}`
  return { temp, sky: wet && wet.h === now.getHours() ? sky(wet.c) : sky(code), tip }
}
