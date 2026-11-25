// Build time (CI: workflow build-atmosphere.yml): the layered model atmospheres for ray-traced horizon refraction
// -> data/atmosphere.tsv (readable) and assets/atmosphere.bin (what the library loads, lazily).
//
// Inputs (both public domain, U.S. government works):
// 1. AFGL atmospheric constituent profiles, G. P. Anderson et al., AFGL-TR-86-0110 (1986): tropical, midlatitude
//    summer/winter, subarctic summer/winter (z, p, T, water-vapour number density). Read from the copies shipped
//    as data/atmmod/afgl*.dat with libRadtran (AFGL_DIR).
// 2. NOAA NCEI IGRA v2 (Integrated Global Radiosonde Archive, Durre et al. 2016, doi:10.7289/V5X63K0Q), station
//    ISM00040179 BET DAGAN, period-of-record file (IGRA_FILE, the unzipped ISM00040179-data.txt).
//    Format: igra2-data-format.txt (header '#' record: year 14-17, month 19-20, hour 25-26; data record: LVLTYP2 col 2
//    (1 = surface), PRESS 10-15 Pa, GPH 17-21 m, TEMP 23-27 0.1 C, RH 29-33 0.1 %, DPDP 35-39 0.1 C; -8888/-9999
//    missing).
//    Every 00, 06, 12 and 18 UTC sounding of YEARS is put on a fixed height grid (T linear in height, ln p linear,
//    vapour pressure linear; heights of levels without GPH by the hypsometric equation from the level below),
//    then averaged per calendar month and launch hour: 48 mean profiles. Bet Dagan launched at all four hours almost
//    daily until early 2010 (the record holds about 340-365 soundings a year at each hour 1995-2009), so the
//    sunrise (02:30-04:50 UTC) and sunset (14:30-17:00 UTC) hours are bracketed by launches 6 hours apart and the
//    library blends the two in time (src/horizon.ts). Where a 06/18 UTC mean profile is shallower than the month's
//    00/12 UTC profiles, their mean continues it; above the top of the grid the AFGL midlatitude profile of the
//    season continues it (pressure scaled to join each time).
//
// Output profile order (assets/atmosphere.bin): AFGL t, ms, mw, ss, sw, then Bet Dagan month 1..12 x {00, 06, 12, 18 UTC}.
// Binary: uint16 profile count; per profile uint16 level count, then per level float32 z (geometric m above sea
// level), T (K), p (hPa), e (water-vapour pressure, hPa). Little-endian.
import { readFileSync, writeFileSync } from 'node:fs'

const AFGL_DIR = process.env.AFGL_DIR || 'afgl'
const IGRA_FILE = process.env.IGRA_FILE || 'ISM00040179-data.txt'
const YEARS = [1995, 2024]
const TOP_M = 80_000
const K_BOLTZMANN = 1.380649e-23
const RD = 287.05, G0 = 9.80665, RE_GEOPOT = 6356766
// Geometric heights (m) of the Bet Dagan grid: dense near the ground, where horizon refraction is decided.
const GRID = [50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000, 2500, 3000, 3500,
  4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 20000, 22000, 24000, 26000, 28000, 30000]

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

function readAfgl(name) {
  const rows = readFileSync(`${AFGL_DIR}/${name}.dat`, 'utf8').split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => l.trim().split(/\s+/).map(Number))
  const levels = rows.map(([zkm, p, t, , , , h2o]) => ({ z: zkm * 1000, t, p, e: h2o * 1e6 * K_BOLTZMANN * t / 100 }))
    .filter((l) => l.z <= TOP_M).sort((a, b) => a.z - b.z)
  log(`AFGL ${name}: ${levels.length} levels, surface T ${levels[0].t} K p ${levels[0].p} hPa e ${levels[0].e.toFixed(2)} hPa`)
  return levels
}

const esWater = (tc) => 6.112 * Math.exp(17.62 * tc / (243.12 + tc)) // Magnus (WMO-No. 8, annex 4.B), hPa
const geometric = (h) => RE_GEOPOT * h / (RE_GEOPOT - h)

/** One sounding's levels -> values on GRID (NaN outside its coverage). */
function onGrid(levels) {
  const lv = levels.filter((l) => l.p > 0 && Number.isFinite(l.t)).sort((a, b) => b.p - a.p)
  if (lv.length < 3) return null
  // Heights: GPH where reported, else hypsometric from the level below.
  let k = lv.findIndex((l) => Number.isFinite(l.gph))
  if (k < 0) return null
  for (let i = k + 1; i < lv.length; i++) if (!Number.isFinite(lv[i].gph)) {
    const tm = (lv[i].t + lv[i - 1].t) / 2 + 273.15
    lv[i].gph = lv[i - 1].gph + RD * tm / G0 * Math.log(lv[i - 1].p / lv[i].p)
  }
  for (let i = k - 1; i >= 0; i--) if (!Number.isFinite(lv[i].gph)) {
    const tm = (lv[i].t + lv[i + 1].t) / 2 + 273.15
    lv[i].gph = lv[i + 1].gph - RD * tm / G0 * Math.log(lv[i].p / lv[i + 1].p)
  }
  for (const l of lv) l.z = geometric(l.gph)
  const out = GRID.map(() => ({ t: NaN, lp: NaN, e: NaN }))
  for (let g = 0; g < GRID.length; g++) {
    const z = GRID[g]
    for (let i = 1; i < lv.length; i++) {
      const a = lv[i - 1], b = lv[i]
      if (a.z <= z && z <= b.z && b.z > a.z) {
        if (b.z - a.z > 4000) break // too sparse here
        const f = (z - a.z) / (b.z - a.z)
        out[g].t = a.t + (b.t - a.t) * f + 273.15
        out[g].lp = Math.log(a.p) + (Math.log(b.p) - Math.log(a.p)) * f
        if (Number.isFinite(a.e) && Number.isFinite(b.e)) out[g].e = a.e + (b.e - a.e) * f
        break
      }
    }
  }
  return out
}

function readIgra() {
  const text = readFileSync(IGRA_FILE, 'utf8')
  const lines = text.split(/\r?\n/)
  log(`IGRA: ${lines.length} lines`)
  const sums = Array.from({ length: 48 }, () => GRID.map(() => ({ n: 0, t: 0, t2: 0, lp: 0, ne: 0, e: 0 })))
  const counts = new Array(48).fill(0)
  let cur = null, used = 0, seen = 0
  const flush = () => {
    if (!cur) return
    seen++
    const g = onGrid(cur.levels)
    if (g) {
      used++
      counts[cur.slot]++
      g.forEach((v, i) => {
        const s = sums[cur.slot][i]
        if (Number.isFinite(v.t) && Number.isFinite(v.lp)) { s.n++; s.t += v.t; s.t2 += v.t * v.t; s.lp += v.lp }
        if (Number.isFinite(v.e)) { s.ne++; s.e += v.e }
      })
    }
    if (seen % 5000 === 0) log(`  soundings read ${seen}, used ${used}`)
    cur = null
  }
  for (const l of lines) {
    if (l.startsWith('#')) {
      flush()
      const year = Number(l.slice(13, 17)), month = Number(l.slice(18, 20)), hour = Number(l.slice(24, 26))
      if (year < YEARS[0] || year > YEARS[1]) continue
      // Launch hour 00/06/12/18 UTC within +-2 h (nominal hours, 99 = unknown is skipped).
      const k = hour >= 22 || hour <= 2 ? 0 : hour >= 4 && hour <= 8 ? 1 : hour >= 10 && hour <= 14 ? 2 : hour >= 16 && hour <= 20 ? 3 : -1
      if (k < 0) continue
      cur = { slot: (month - 1) * 4 + k, levels: [] }
      continue
    }
    if (!cur || l.length < 39) continue
    const num = (a, b) => { const v = Number(l.slice(a, b).replace(/[AB]/g, '')); return v === -9999 || v === -8888 ? NaN : v }
    const p = num(9, 15), gph = num(16, 21), t = num(22, 27), rh = num(28, 33), dpdp = num(34, 39)
    if (!(p > 0)) continue
    const tc = t / 10
    if (!(tc > -95 && tc < 55)) continue
    let e = NaN
    if (Number.isFinite(dpdp) && dpdp >= 0) e = esWater(tc - dpdp / 10)
    else if (Number.isFinite(rh) && rh >= 0) e = esWater(tc) * rh / 1000
    cur.levels.push({ p: p / 100, gph: Number.isFinite(gph) ? gph : NaN, t: tc, e })
  }
  flush()
  log(`IGRA: ${seen} soundings in ${YEARS.join('-')} at 00/06/12/18 UTC, ${used} used; per month x hour: ${counts.join(' ')}`)
  return sums.map((slot) => slot.map((s, i) => s.n < 20 ? null : {
    z: GRID[i], t: s.t / s.n, p: Math.exp(s.lp / s.n), e: s.ne >= 20 ? s.e / s.ne : 0,
    sd: Math.sqrt(Math.max(0, s.t2 / s.n - (s.t / s.n) ** 2)),
  }).filter(Boolean))
}

const afgl = ['afglt', 'afglms', 'afglmw', 'afglss', 'afglsw'].map(readAfgl)
const [, ms, mw] = afgl
const HOURS = ['00', '06', '12', '18']
const raw = readIgra()
// 06/18 UTC profiles shallower than the month's 00/12 UTC ones: continued by the mean of those (pressure joined).
for (let slot = 0; slot < 48; slot++) {
  if (slot % 2 === 0) continue
  const levels = raw[slot], a = raw[slot - 1], b = raw[(slot + 1) % 4 === 0 ? slot - 3 : slot + 1]
  const top = levels[levels.length - 1]
  const ref = a.filter((l) => l.z > top.z).map((l) => ({ l, m: b.find((x) => x.z === l.z) })).filter(({ m }) => m)
    .map(({ l, m }) => ({ z: l.z, t: (l.t + m.t) / 2, p: Math.sqrt(l.p * m.p), e: (l.e + m.e) / 2 }))
  if (!ref.length) continue
  const pa = a.find((l) => l.z === top.z), pb = b.find((l) => l.z === top.z)
  const scale = pa && pb ? top.p / Math.sqrt(pa.p * pb.p) : 1
  levels.push(...ref.map((l) => ({ ...l, p: l.p * scale })))
  log(`Bet Dagan m${Math.floor(slot / 4) + 1} ${HOURS[slot % 4]}Z: own levels to ${top.z} m, continued by the 00/12 UTC mean to ${ref[ref.length - 1].z} m`)
}
const il = raw.map((levels, slot) => {
  const month = Math.floor(slot / 4) + 1
  // Season weight of the AFGL continuation: 0 mid-January, 1 mid-July.
  const w = (1 - Math.cos(2 * Math.PI * (month - 1) / 12)) / 2
  const top = levels[levels.length - 1]
  const lerpAt = (prof, z) => {
    for (let i = 1; i < prof.length; i++) if (prof[i].z >= z) {
      const a = prof[i - 1], b = prof[i], f = (z - a.z) / (b.z - a.z)
      return { t: a.t + (b.t - a.t) * f, p: Math.exp(Math.log(a.p) + (Math.log(b.p) - Math.log(a.p)) * f), e: a.e + (b.e - a.e) * f }
    }
  }
  const mixAt = (z) => { const s = lerpAt(ms, z), wi = lerpAt(mw, z); return { t: s.t * w + wi.t * (1 - w), p: s.p * w + wi.p * (1 - w), e: s.e * w + wi.e * (1 - w) } }
  const scale = top.p / mixAt(top.z).p
  const above = ms.filter((l) => l.z > top.z + 1000).map((l) => { const m = mixAt(l.z); return { z: l.z, t: m.t, p: m.p * scale, e: m.e } })
  const hh = HOURS[slot % 4]
  const s = levels[0], k1 = levels.find((l) => l.z === 1000), k3 = levels.find((l) => l.z === 3000)
  const c = (l) => (l ? (l.t - 273.15).toFixed(1) : '?')
  log(`Bet Dagan m${month} ${hh}Z: ${levels.length} grid levels to ${top.z} m (+${above.length} AFGL); 50 m T ${c(s)} C ` +
    `(sd ${s.sd?.toFixed(1) ?? '?'}) p ${s.p.toFixed(1)} e ${s.e.toFixed(1)}; 1 km ${c(k1)} C; 3 km ${c(k3)} C`)
  return [...levels.map(({ z, t, p, e }) => ({ z, t, p, e })), ...above]
})
if (il.length !== 48) throw new Error('expected 48 Bet Dagan profiles')

const profiles = [...afgl, ...il]
const names = ['afglt', 'afglms', 'afglmw', 'afglss', 'afglsw', ...il.map((_, s) => `betdagan-m${Math.floor(s / 4) + 1}-${HOURS[s % 4]}z`)]
let tsv = 'profile\tz_m\tT_K\tp_hPa\te_hPa\n'
profiles.forEach((pr, i) => { for (const l of pr) tsv += `${names[i]}\t${l.z.toFixed(0)}\t${l.t.toFixed(2)}\t${l.p.toPrecision(6)}\t${l.e.toPrecision(4)}\n` })
writeFileSync('data/atmosphere.tsv', tsv)
const size = 2 + profiles.reduce((s, p) => s + 2 + p.length * 16, 0)
const buf = Buffer.alloc(size)
let o = buf.writeUInt16LE(profiles.length, 0)
for (const p of profiles) {
  o = buf.writeUInt16LE(p.length, o)
  for (const l of p) { o = buf.writeFloatLE(l.z, o); o = buf.writeFloatLE(l.t, o); o = buf.writeFloatLE(l.p, o); o = buf.writeFloatLE(l.e, o) }
}
writeFileSync('assets/atmosphere.bin', buf)
log(`wrote assets/atmosphere.bin: ${profiles.length} profiles, ${size} bytes`)
