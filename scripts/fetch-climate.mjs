// One-off, build time: monthly mean 2 m air temperature per place -> data/climate.tsv (id, 12 values in deg C).
// Source: Open-Meteo Historical Weather API (https://open-meteo.com/en/docs/historical-weather-api), CC BY 4.0,
// ERA5 / ERA5-Land reanalysis (Copernicus Climate Change Service), downscaled by Open-Meteo to the place's elevation.
// Mean of the daily means 2016-2025 per calendar month. Sequential requests with pauses, to be polite.
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

// In CI (CHECKPOINT=1): commit and push data/climate.tsv every CHECKPOINT_EVERY places, so progress shows in git.
const CHECKPOINT = process.env.CHECKPOINT === '1'
const CHECKPOINT_EVERY = 50
const STALL_MS = 3_600_000 // stop when a whole hour passes without a successful request
function checkpoint(label) {
  if (!CHECKPOINT) return
  execSync('git add data/climate.tsv')
  try { execSync('git diff --cached --quiet') } catch {
    execSync(`git commit -q -m "data: climate.tsv ${label} (CI fetch)" -m "User-facing: none"`)
    execSync('git push -q')
    console.log(`checkpoint pushed: ${label}`)
  }
}

// Parallel CI: SHARD/SHARDS split the remaining places across runners (each runner has its own IP,
// so Open-Meteo's per-IP limit applies per shard); each shard writes its own OUT file.
const OUT = process.env.OUT || 'data/climate.tsv'
const SHARD = Number(process.env.SHARD || 0), SHARDS = Number(process.env.SHARDS || 1)
const BATCH = 10
const rows = readFileSync('data/places.tsv', 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split('\t'))
const done = new Map()
for (const f of new Set(['data/climate.tsv', OUT])) if (existsSync(f)) for (const l of readFileSync(f, 'utf8').trim().split(/\r?\n/).slice(1)) done.set(l.split('\t')[0], l)
const todo = rows.filter((r) => !done.has(r[0])).filter((_, i) => i % SHARDS === SHARD)
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
  const since = Date.now()
  for (let wait = 60_000; ; wait = Math.min(wait * 2, 900_000)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
      if (res.ok) { json = await res.json(); break }
      console.log(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}; waiting ${wait / 1000} s`)
    } catch (e) {
      console.log(`${e.name}: ${e.message}; waiting ${wait / 1000} s`)
    }
    if (Date.now() - since > STALL_MS) {
      checkpoint(`${done.size} rows (stalled)`)
      console.log(`STALLED: no successful request for an hour at ${done.size}/${rows.length}; stopping`)
      process.exit(2)
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
  const n = Math.min(i + BATCH, todo.length)
  console.log(`${n}/${todo.length} (${new Date().toISOString()})`)
  if (n % CHECKPOINT_EVERY === 0) checkpoint(`${done.size} rows`)
  await pause(4000)
}
checkpoint(`${done.size} rows (complete)`)
console.log(`done: ${done.size} of ${rows.length} places have rows`)
