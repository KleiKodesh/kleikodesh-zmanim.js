// One-off, build time: monthly mean daily MINIMUM and MAXIMUM 2 m air temperature per place
// -> data/climate-minmax.tsv (id, min1..min12, max1..max12, deg C). Sunrise refraction uses the minima (sunrise
// comes near the coldest hour), sunset the maxima. Same source and method as fetch-climate.mjs (climate.tsv):
// Open-Meteo Historical Weather API (https://open-meteo.com/en/docs/historical-weather-api), CC BY 4.0,
// ERA5 / ERA5-Land reanalysis (Copernicus Climate Change Service), downscaled by Open-Meteo to the place's
// elevation - chosen over gridded station normals (e.g. WorldClim, ~1 km but 1970-2000) because it is recent
// (2016-2025), covers every place worldwide alike and is consistent with the mean already in climate.bin.
// Mean of the daily minima / maxima 2016-2025 per calendar month.
// SHARD/SHARDS split the places across parallel CI runners; each writes its own OUT file.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const OUT = process.env.OUT || 'data/climate-minmax.tsv'
const SHARD = Number(process.env.SHARD || 0), SHARDS = Number(process.env.SHARDS || 1)
const BATCH = 10
const STALL_MS = 3_000_000 // stop when 50 minutes pass without a successful request
const rows = readFileSync('data/places.tsv', 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split('\t'))
const done = new Map()
for (const f of new Set(['data/climate-minmax.tsv', OUT])) if (existsSync(f)) for (const l of readFileSync(f, 'utf8').trim().split(/\r?\n/).slice(1)) done.set(l.split('\t')[0], l)
const todo = rows.filter((r) => !done.has(r[0])).filter((_, i) => i % SHARDS === SHARD)
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const header = 'id\t' + [...Array.from({ length: 12 }, (_, i) => `min${i + 1}`), ...Array.from({ length: 12 }, (_, i) => `max${i + 1}`)].join('\t')
const save = () => writeFileSync(OUT, header + '\n' +
  [...done.values()].sort((a, b) => Number(a.split('\t')[0]) - Number(b.split('\t')[0])).join('\n') + '\n')
console.log(`shard ${SHARD}/${SHARDS}: ${todo.length} places to fetch`)

const monthlyMean = (time, values) => {
  const sum = new Array(12).fill(0); const n = new Array(12).fill(0)
  time.forEach((t, j) => { const v = values[j]; if (v == null) return; const m = Number(t.slice(5, 7)) - 1; sum[m] += v; n[m]++ })
  return sum.map((s, m) => (n[m] ? (s / n[m]).toFixed(1) : ''))
}

for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH)
  const url = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + batch.map((r) => r[4]).join(',') +
    '&longitude=' + batch.map((r) => r[5]).join(',') + '&elevation=' + batch.map((r) => r[6]).join(',') +
    '&start_date=2016-01-01&end_date=2025-12-31&daily=temperature_2m_min,temperature_2m_max&timezone=auto'
  let json
  const since = Date.now()
  for (let wait = 30_000; ; wait = Math.min(wait * 2, 600_000)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90_000) })
      if (res.ok) { json = await res.json(); break }
      console.log(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}; waiting ${wait / 1000} s`)
    } catch (e) {
      console.log(`${e.name}: ${e.message}; waiting ${wait / 1000} s`)
    }
    if (Date.now() - since > STALL_MS) { save(); console.log(`STALLED at ${done.size}; stopping`); process.exit(2) }
    await pause(wait)
  }
  const list = Array.isArray(json) ? json : [json]
  list.forEach((loc, k) => {
    const d = loc.daily
    done.set(batch[k][0], [batch[k][0], ...monthlyMean(d.time, d.temperature_2m_min), ...monthlyMean(d.time, d.temperature_2m_max)].join('\t'))
  })
  save()
  console.log(`${Math.min(i + BATCH, todo.length)}/${todo.length} (${new Date().toISOString()})`)
  await pause(4000)
}
save()
console.log(`done: shard ${SHARD} wrote ${done.size} rows`)
