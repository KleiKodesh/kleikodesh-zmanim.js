// One-off, build time: monthly mean near-surface temperature gradient dT/dz (K/km) at sunrise and sunset per place
// -> data/lapse.tsv (id, 12 values). Source: Open-Meteo Historical Forecast API
// (https://open-meteo.com/en/docs/historical-forecast-api), CC BY 4.0: hourly 2 m temperature (at the place's own
// elevation) and temperature + geopotential height of one pressure level above the ground (925 hPa below 500 m,
// 850 hPa below 1200 m, else 700 hPa). Gradient = (T_level - T_2m) / (Z_level - elevation - 2), taken at each day's
// sunrise and sunset hour (simple solar formula, linear between hours), averaged per calendar month 2023-2025.
// Sharded like fetch-climate.mjs (SHARD/SHARDS/OUT), each CI runner with its own IP.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const OUT = process.env.OUT || 'data/lapse.tsv'
const SHARD = Number(process.env.SHARD || 0), SHARDS = Number(process.env.SHARDS || 1)
const START = '2023-01-01', END = '2025-12-31'
const BATCH = 10
const STALL_MS = 3_600_000
const rows = readFileSync('data/places.tsv', 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split('\t'))
const done = new Map()
for (const f of new Set(['data/lapse.tsv', OUT])) if (existsSync(f)) for (const l of readFileSync(f, 'utf8').trim().split(/\r?\n/).slice(1)) done.set(l.split('\t')[0], l)
const level = (elev) => (elev < 500 ? 925 : elev < 1200 ? 850 : 700)
const todo = rows.filter((r) => !done.has(r[0])).filter((_, i) => i % SHARDS === SHARD)
  .sort((a, b) => level(Number(a[6])) - level(Number(b[6])))
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const save = () => writeFileSync(OUT, 'id\t' + Array.from({ length: 12 }, (_, i) => `m${i + 1}`).join('\t') + '\n' +
  [...done.values()].sort((a, b) => Number(a.split('\t')[0]) - Number(b.split('\t')[0])).join('\n') + '\n')

const RAD = Math.PI / 180
// Sunrise/sunset in UTC hours for a day of year (a low-precision solar formula; an hour's accuracy is plenty).
function riseSetUtc(lat, lng, doy) {
  const g = 2 * Math.PI / 365 * (doy - 1)
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const c = (Math.cos(90.833 * RAD) - Math.sin(lat * RAD) * Math.sin(decl)) / (Math.cos(lat * RAD) * Math.cos(decl))
  if (c < -1 || c > 1) return null
  const ha = Math.acos(c) / RAD
  const noon = 720 - 4 * lng - eqt
  return [(noon - 4 * ha) / 60, (noon + 4 * ha) / 60]
}

while (todo.length) {
  const lv = level(Number(todo[0][6]))
  const batch = []
  while (batch.length < BATCH && todo.length && level(Number(todo[0][6])) === lv) batch.push(todo.shift())
  const url = 'https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=' + batch.map((r) => r[4]).join(',') +
    '&longitude=' + batch.map((r) => r[5]).join(',') + '&elevation=' + batch.map((r) => r[6]).join(',') +
    `&start_date=${START}&end_date=${END}&hourly=temperature_2m,temperature_${lv}hPa,geopotential_height_${lv}hPa&timezone=GMT`
  let json
  const since = Date.now()
  for (let wait = 60_000; ; wait = Math.min(wait * 2, 900_000)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000) })
      if (res.ok) { json = await res.json(); break }
      console.log(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}; waiting ${wait / 1000} s`)
    } catch (e) { console.log(`${e.name}: ${e.message}; waiting ${wait / 1000} s`) }
    if (Date.now() - since > STALL_MS) { console.log('STALLED'); process.exit(2) }
    await pause(wait)
  }
  const list = Array.isArray(json) ? json : [json]
  list.forEach((loc, k) => {
    const r = batch[k]; const lat = Number(r[4]), lng = Number(r[5]), elev = Number(r[6])
    const h = loc.hourly, T2 = h.temperature_2m, TL = h[`temperature_${lv}hPa`], ZL = h[`geopotential_height_${lv}hPa`]
    const t0 = Date.parse(h.time[0] + 'Z')
    const at = (arr, i, f) => (arr[i] == null || arr[i + 1] == null ? null : arr[i] + (arr[i + 1] - arr[i]) * f)
    const sum = new Array(12).fill(0); const n = new Array(12).fill(0)
    for (let day = 0; day * 24 < h.time.length; day++) {
      const d = new Date(t0 + day * 86_400_000)
      const doy = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000) + 1
      const rs = riseSetUtc(lat, lng, doy)
      if (!rs) continue
      for (const hr of rs) {
        const x = day * 24 + hr
        const i = Math.floor(x), f = x - i
        if (i < 0 || i + 1 >= h.time.length) continue
        const t2 = at(T2, i, f), tl = at(TL, i, f), zl = at(ZL, i, f)
        if (t2 == null || tl == null || zl == null) continue
        const dz = zl - elev - 2
        if (dz < 150) continue
        sum[d.getUTCMonth()] += (tl - t2) / dz * 1000; n[d.getUTCMonth()]++
      }
    }
    done.set(r[0], [r[0], ...sum.map((s, m) => (n[m] ? (s / n[m]).toFixed(2) : ''))].join('\t'))
  })
  save()
  console.log(`${done.size} rows, ${todo.length} left (${new Date().toISOString()})`)
  await pause(3000)
}
save()
console.log(`done: ${done.size} rows`)
