// One-off, build time (CI: fetch-climate-sunevent.yml): the climatological mean 2 m air temperature AT the local
// sunrise and AT the local sunset, per place and calendar month -> data/climate-sunevent.tsv (id, rise1..rise12,
// set1..set12, deg C, one decimal). Horizon refraction at sunrise/sunset depends on the air at that moment, which is
// neither the daily minimum (sunrise comes shortly after it) nor the daily maximum (sunset comes hours after it, when
// the air near the ground has already cooled).
//
// Source: Open-Meteo Historical Weather API (https://open-meteo.com/en/docs/historical-weather-api), CC BY 4.0,
// ERA5 / ERA5-Land reanalysis (Copernicus Climate Change Service): HOURLY temperature_2m in UTC, 2016-2025 - the
// same source, period and elevation downscaling as climate.tsv (monthly mean) and climate-minmax.tsv.
// Method, per day: sunrise and sunset in UT from this library's own SPA (dist/spa.js, A.2, h0 = -0.8333 deg), the
// hourly series interpolated linearly to that moment; then the mean over all days of each calendar month.
//
// Request volume: ten years of hourly data is heavy, so places are fetched per reanalysis cell (lat/lng rounded to
// 0.1 deg, the ERA5-Land grid): one representative place per cell is fetched at its own coordinates and elevation.
// Open-Meteo moves a cell's series to a place's elevation by a constant lapse-rate offset, so the cell's diurnal
// cycle holds for every place in it; each place gets
//     T_event(place) = T_mean(place) + [T_event(cell) - T_mean(cell)]
// with T_mean(place) from climate.tsv (same source, same years) and T_mean(cell) the mean of the fetched hours.
// Sun times are taken at the representative's coordinates (within 0.05 deg: under a minute).
//
// SHARD/SHARDS split the cells across parallel CI runners (own IP each); OUT is the shard's file. Resumes from rows
// already in data/climate-sunevent.tsv and OUT. Per-request timeout, retries with exponential backoff, a stall guard.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spaDay, spaSunTimes } from '../dist/spa.js'

const OUT = process.env.OUT || 'data/climate-sunevent.tsv'
const SHARD = Number(process.env.SHARD || 0), SHARDS = Number(process.env.SHARDS || 1)
const LIMIT = Number(process.env.LIMIT || 0) // >0: only this many cells (local sample)
const PAUSE_MS = Number(process.env.PAUSE_MS || 20_000) // between requests: 10 years hourly weighs many API calls
const STALL_MS = Number(process.env.STALL_MS || 5_400_000) // stop when 90 minutes pass without a successful request
const START = 2016, END = 2025

const rows = readFileSync('data/places.tsv', 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split('\t'))
const meanOf = new Map(readFileSync('data/climate.tsv', 'utf8').trim().split(/\r?\n/).slice(1)
  .map((l) => l.split('\t')).map(([id, ...m]) => [id, m.map((v) => (v === '' ? NaN : Number(v)))]))
const done = new Map()
for (const f of new Set(['data/climate-sunevent.tsv', OUT])) if (existsSync(f)) for (const l of readFileSync(f, 'utf8').trim().split(/\r?\n/).slice(1)) done.set(l.split('\t')[0], l)

// Cells in a stable order (by smallest id); shard by cell index.
const cells = new Map()
for (const r of rows) {
  const key = `${Math.round(Number(r[4]) * 10)},${Math.round(Number(r[5]) * 10)}`
  if (!cells.has(key)) cells.set(key, [])
  cells.get(key).push(r)
}
let todo = [...cells.values()].filter((_, i) => i % SHARDS === SHARD).filter((c) => c.some((r) => !done.has(r[0])))
if (LIMIT > 0) todo = todo.slice(0, LIMIT)
const header = 'id\t' + [...Array.from({ length: 12 }, (_, i) => `rise${i + 1}`), ...Array.from({ length: 12 }, (_, i) => `set${i + 1}`)].join('\t')
const save = () => writeFileSync(OUT, header + '\n' +
  [...done.values()].sort((a, b) => Number(a.split('\t')[0]) - Number(b.split('\t')[0])).join('\n') + '\n')
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const stamp = () => new Date().toISOString().slice(11, 19)
console.log(`${stamp()} shard ${SHARD}/${SHARDS}: ${todo.length} cells (${todo.reduce((s, c) => s + c.length, 0)} places) to fetch`)

/** Value of the hourly series (UTC, starting at START-01-01T00:00) at day [day] (index), UT fraction [f]. */
const at = (values, day, f) => {
  const x = day * 24 + f * 24
  const i = Math.floor(x)
  if (i < 0 || i + 1 >= values.length) return NaN
  const a = values[i], b = values[i + 1]
  return a == null || b == null ? NaN : a + (b - a) * (x - i)
}

/** Monthly means at sunrise and sunset and the overall monthly mean, from the hourly series of a place. */
export function sunEventMeans(lat, lng, values) {
  const rise = new Array(12).fill(0), set = new Array(12).fill(0), nr = new Array(12).fill(0), ns = new Array(12).fill(0)
  const all = new Array(12).fill(0), na = new Array(12).fill(0)
  let day = 0
  for (let y = START; y <= END; y++) for (let m = 1; m <= 12; m++) {
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
    for (let d = 1; d <= days; d++, day++) {
      const t = spaSunTimes(spaDay(y, m, d), lat, lng)
      const r = at(values, day, t.sunrise), s = at(values, day, t.sunset)
      if (!Number.isNaN(r)) { rise[m - 1] += r; nr[m - 1]++ }
      if (!Number.isNaN(s)) { set[m - 1] += s; ns[m - 1]++ }
      for (let h = 0; h < 24; h++) { const v = values[day * 24 + h]; if (v != null) { all[m - 1] += v; na[m - 1]++ } }
    }
  }
  const div = (s, n) => s.map((v, k) => (n[k] ? v / n[k] : NaN))
  return { rise: div(rise, nr), set: div(set, ns), mean: div(all, na) }
}

if (process.argv[1]?.endsWith('fetch-climate-sunevent.mjs')) {
  let n = 0
  for (const cell of todo) {
    const rep = cell[0]
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${rep[4]}&longitude=${rep[5]}&elevation=${rep[6]}` +
      `&start_date=${START}-01-01&end_date=${END}-12-31&hourly=temperature_2m&timezone=GMT`
    let json
    const since = Date.now()
    for (let wait = 60_000; ; wait = Math.min(wait * 2, 900_000)) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(180_000) })
        if (res.ok) { json = await res.json(); break }
        console.log(`${stamp()} HTTP ${res.status} ${(await res.text()).slice(0, 120)}; waiting ${wait / 1000} s`)
      } catch (e) {
        console.log(`${stamp()} ${e.name}: ${e.message}; waiting ${wait / 1000} s`)
      }
      if (Date.now() - since > STALL_MS) { save(); console.log(`${stamp()} STALLED after ${n} cells; stopping (rerun resumes)`); process.exit(2) }
      await pause(wait)
    }
    const { rise, set, mean } = sunEventMeans(Number(rep[4]), Number(rep[5]), json.hourly.temperature_2m)
    for (const r of cell) {
      const pm = meanOf.get(r[0]) ?? []
      const shift = (m) => (Number.isFinite(pm[m]) ? pm[m] - mean[m] : 0)
      const f = (v, m) => (Number.isFinite(v) ? (v + shift(m)).toFixed(1) : '')
      done.set(r[0], [r[0], ...rise.map(f), ...set.map(f)].join('\t'))
    }
    save()
    n++
    console.log(`${stamp()} ${n}/${todo.length} cell ${rep[0]} (${cell.length} places): Jan rise ${rise[0].toFixed(1)} set ${set[0].toFixed(1)} mean ${mean[0].toFixed(1)}; Jul rise ${rise[6].toFixed(1)} set ${set[6].toFixed(1)} mean ${mean[6].toFixed(1)}`)
    if (n < todo.length) await pause(PAUSE_MS)
  }
  save()
  console.log(`${stamp()} done: shard ${SHARD} holds ${done.size} rows`)
}
