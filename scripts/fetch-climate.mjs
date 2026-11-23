// One-off, build time: monthly mean 2 m air temperature per place -> data/climate.tsv (id, 12 values in deg C).
// Source: Open-Meteo Historical Weather API (https://open-meteo.com/en/docs/historical-weather-api), CC BY 4.0,
// ERA5 / ERA5-Land reanalysis (Copernicus Climate Change Service), downscaled by Open-Meteo to the place's elevation.
// Mean of the daily means 2016-2025 per calendar month. Sequential requests with pauses, to be polite.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const OUT = 'data/climate.tsv'
const BATCH = 10
const rows = readFileSync('data/places.tsv', 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split('\t'))
const done = new Map()
if (existsSync(OUT)) for (const l of readFileSync(OUT, 'utf8').trim().split(/\r?\n/).slice(1)) done.set(l.split('\t')[0], l)
const todo = rows.filter((r) => !done.has(r[0]))
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const save = () => writeFileSync(OUT, 'id\t' + Array.from({ length: 12 }, (_, i) => `m${i + 1}`).join('\t') + '\n' +
  [...done.values()].sort((a, b) => Number(a.split('\t')[0]) - Number(b.split('\t')[0])).join('\n') + '\n')

for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH)
  const url = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + batch.map((r) => r[4]).join(',') +
    '&longitude=' + batch.map((r) => r[5]).join(',') + '&elevation=' + batch.map((r) => r[6]).join(',') +
    '&start_date=2016-01-01&end_date=2025-12-31&daily=temperature_2m_mean&timezone=GMT'
  // Per-request timeout; on failure back off (1, 2, 4 ... capped at 15 minutes; the free tier has hourly limits).
  let json
  for (let wait = 60_000; ; wait = Math.min(wait * 2, 900_000)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
      if (res.ok) { json = await res.json(); break }
      console.log(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}; waiting ${wait / 1000} s`)
    } catch (e) {
      console.log(`${e.name}: ${e.message}; waiting ${wait / 1000} s`)
    }
    await pause(wait)
  }
  const list = Array.isArray(json) ? json : [json]
  list.forEach((loc, k) => {
    const sum = new Array(12).fill(0); const n = new Array(12).fill(0)
    loc.daily.time.forEach((t, j) => {
      const v = loc.daily.temperature_2m_mean[j]
      if (v == null) return
      const m = Number(t.slice(5, 7)) - 1
      sum[m] += v; n[m]++
    })
    const vals = sum.map((s, m) => (n[m] ? (s / n[m]).toFixed(1) : ''))
    done.set(batch[k][0], [batch[k][0], ...vals].join('\t'))
  })
  save()
  console.log(`${Math.min(i + BATCH, todo.length)}/${todo.length}`)
  await pause(4000)
}
console.log(`done: ${done.size} of ${rows.length} places have rows`)
