// data/horizon.bin (from scripts/build-horizon.mjs: per id 242 int16 LE, hundredths of a degree, -32768 = none)
// -> assets/horizon-NN.bin: HORIZON_CHUNK places per file (chunk NN = ids NN*64 .. NN*64+63), so an app loads only
// the chosen place's chunk. Each value is one uint8: tenths of a degree plus 30 (-3.0 .. +22.4 deg); 255 = no data.
// A bin steeper than 22.4 deg (a cliff right beside a few places) is stored as no data, so its line is null there.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const BINS = 242, CHUNK = 64
if (!existsSync('data/horizon.bin')) process.exit(0)
const b = readFileSync('data/horizon.bin')
const src = new Int16Array(b.buffer, b.byteOffset, b.byteLength / 2)
const ids = src.length / BINS
let min = Infinity, max = -Infinity
for (const v of src) if (v !== -32768) { min = Math.min(min, v); max = Math.max(max, v) }
if (min < -300) throw new Error(`horizon minimum ${min / 100} deg below -3.0`)
let over = 0
mkdirSync('assets', { recursive: true })
for (const f of readdirSync('assets')) if (/^horizon(-\d+)?\.bin$/.test(f)) rmSync(`assets/${f}`)
for (let c = 0; c * CHUNK < ids; c++) {
  const out = new Uint8Array(CHUNK * BINS).fill(255)
  for (let i = 0; i < CHUNK && c * CHUNK + i < ids; i++) {
    for (let k = 0; k < BINS; k++) {
      const v = src[(c * CHUNK + i) * BINS + k]
      if (v === -32768) continue
      const q = Math.round(v / 10) + 30
      if (q > 254) over++
      else out[i * BINS + k] = q
    }
  }
  writeFileSync(`assets/horizon-${String(c).padStart(2, '0')}.bin`, out)
}
console.log(`horizon: ${ids} ids in ${Math.ceil(ids / CHUNK)} chunks, range ${min / 100}..${max / 100} deg, ${over} bins above 22.4 deg left empty`)
