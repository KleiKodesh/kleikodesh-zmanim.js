// data/horizon.bin (from scripts/build-horizon.mjs: per id 242 int16 LE, hundredths of a degree, -32768 = none)
// -> assets/horizon-NN.bin: HORIZON_CHUNK places per file (chunk NN = ids NN*64 .. NN*64+63), same int16 values, so an
// app loads only the chosen place's chunk (about 31 KB). Every angle is kept, however steep.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const BINS = 242, CHUNK = 64
if (!existsSync('data/horizon.bin')) process.exit(0)
const b = readFileSync('data/horizon.bin')
const src = new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
const ids = src.length / BINS
let min = Infinity, max = -Infinity
for (const v of src) if (v !== -32768) { min = Math.min(min, v); max = Math.max(max, v) }
mkdirSync('assets', { recursive: true })
for (const f of readdirSync('assets')) if (/^horizon(-\d+)?\.bin$/.test(f)) rmSync(`assets/${f}`)
for (let c = 0; c * CHUNK < ids; c++) {
  const out = new Int16Array(CHUNK * BINS).fill(-32768)
  const n = Math.min(CHUNK, ids - c * CHUNK)
  out.set(src.subarray(c * CHUNK * BINS, (c * CHUNK + n) * BINS))
  writeFileSync(`assets/horizon-${String(c).padStart(2, '0')}.bin`, new Uint8Array(out.buffer))
}
console.log(`horizon: ${ids} ids in ${Math.ceil(ids / CHUNK)} chunks, range ${min / 100}..${max / 100} deg`)
