// data/places.tsv + data/climate.tsv -> assets/: climate.bin, names-he.txt, names-en.txt (line index = id), places.bin (11-byte records), tz.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const RECORD_SIZE = 11
const rows = readFileSync('data/places.tsv', 'utf8').trim().split(/\r?\n/).slice(1).map((line) => line.split('\t'))
const maxId = Math.max(...rows.map((r) => Number(r[0])))
const he = new Array(maxId + 1).fill('')
const en = new Array(maxId + 1).fill('')
const bin = new DataView(new ArrayBuffer((maxId + 1) * RECORD_SIZE))
const zones = [...new Set(rows.map((r) => r[7]))].sort()
if (zones.length > 255) throw new Error('more than 255 time zones')

/** The zone's standard offset in minutes: the smaller of its January and July 2025 offsets. */
function rawOffsetMinutes(tzid) {
  const offset = (ms) => {
    const name = new Intl.DateTimeFormat('en', { timeZone: tzid, timeZoneName: 'longOffset' })
      .formatToParts(ms).find((p) => p.type === 'timeZoneName').value
    const m = name.match(/GMT([+-])(\d\d):(\d\d)/)
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0
  }
  return Math.min(offset(Date.UTC(2025, 0, 15)), offset(Date.UTC(2025, 6, 15)))
}

const seen = new Set()
for (const [id, , heName, enName, lat, lng, elevation, tzid] of rows) {
  const n = Number(id)
  if (!Number.isInteger(n) || n < 1 || seen.has(n)) throw new Error(`bad or duplicate id ${id}`)
  seen.add(n)
  for (const name of [heName, enName]) if (!name || /[\t\r\n]/.test(name)) throw new Error(`bad name at id ${id}`)
  const latE5 = Math.round(Number(lat) * 1e5)
  const lngE5 = Math.round(Number(lng) * 1e5)
  if (latE5 / 1e5 !== Number(lat) || lngE5 / 1e5 !== Number(lng)) throw new Error(`id ${id}: more than 5 decimals`)
  const elev = Number(elevation)
  if (!Number.isInteger(elev) || elev < -32768 || elev > 32767) throw new Error(`id ${id}: bad elevation`)
  he[n] = heName
  en[n] = enName
  const o = n * RECORD_SIZE
  bin.setInt32(o, latE5, true)
  bin.setInt32(o + 4, lngE5, true)
  bin.setInt16(o + 8, elev, true)
  bin.setUint8(o + 10, zones.indexOf(tzid))
}

mkdirSync('assets', { recursive: true })
writeFileSync('assets/names-he.txt', he.join('\n') + '\n')
writeFileSync('assets/names-en.txt', en.join('\n') + '\n')
writeFileSync('assets/places.bin', new Uint8Array(bin.buffer))
// climate.bin: 12 int8 monthly mean temperatures (C) per id at offset id*12; -128 = unknown (data/climate.tsv).
const climate = new Int8Array((maxId + 1) * 12).fill(-128)
for (const line of readFileSync('data/climate.tsv', 'utf8').trim().split(/\r?\n/).slice(1)) {
  const [id, ...months] = line.split('\t')
  months.forEach((v, m) => { if (v !== '' && v !== undefined) climate[Number(id) * 12 + m] = Math.max(-127, Math.min(127, Math.round(Number(v)))) })
}
writeFileSync('assets/climate.bin', climate)
// lapse.bin: 12 int8 monthly mean near-ground temperature gradients per id at offset id*12, units of 0.25 K/km;
// -128 = unknown (data/lapse.tsv, scripts/fetch-lapse.mjs).
const lapse = new Int8Array((maxId + 1) * 12).fill(-128)
if (existsSync('data/lapse.tsv')) for (const line of readFileSync('data/lapse.tsv', 'utf8').trim().split(/\r?\n/).slice(1)) {
  const [id, ...months] = line.split('\t')
  months.forEach((v, m) => { if (v !== '' && v !== undefined) lapse[Number(id) * 12 + m] = Math.max(-127, Math.min(127, Math.round(Number(v) / 0.25))) })
}
writeFileSync('assets/lapse.bin', lapse)
writeFileSync('assets/tz.json', JSON.stringify({ ids: zones, rawOffsetMinutes: zones.map(rawOffsetMinutes) }))
console.log(`${rows.length} places, ${zones.length} zones`)
