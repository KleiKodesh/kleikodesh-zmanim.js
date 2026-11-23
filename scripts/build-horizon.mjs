// TSV from scripts/compute-horizon.py (id, then one value per azimuth bin) -> assets/horizon.bin:
// per id (record 0 unused) HORIZON_BINS int16 LE, hundredths of a degree; -32768 = no data.
// Bins: azimuth 30..150 then 210..330, one per degree (src/horizon.ts).
import { readFileSync, writeFileSync } from 'node:fs'

const BINS = 242
const maxId = Math.max(...readFileSync('data/places.tsv', 'utf8').trim().split(/\r?\n/).slice(1).map((l) => Number(l.split('\t')[0])))
const out = new Int16Array((maxId + 1) * BINS).fill(-32768)
let n = 0
for (const line of readFileSync(process.argv[2], 'utf8').trim().split(/\r?\n/)) {
  const [id, ...v] = line.split('\t').map(Number)
  if (v.length !== BINS || !(id >= 1 && id <= maxId)) throw new Error(`bad row for id ${id}`)
  v.forEach((x, i) => { out[id * BINS + i] = Math.max(-32767, Math.min(32767, x)) })
  n++
}
writeFileSync('assets/horizon.bin', new Uint8Array(out.buffer))
console.log(`${n} places, ${out.byteLength} bytes`)
