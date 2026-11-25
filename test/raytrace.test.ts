// Ray-traced refraction (src/atmosphere.ts) against published values and an independent ray integration.
import { describe, expect, it } from 'vitest'
import { Atmosphere, getAtmospheres, levelAt, parseAtmospheres, refractionArcmin, usStandard1976, zmanInstants } from '../src/index'
import { readFileSync } from 'node:fs'
import { useFileAssets } from './helpers'

const us = usStandard1976()
const sea = new Atmosphere(us, 0)
/** Bennett / Saemundsson (true -> apparent inverse) scaled to the US 1976 sea level, 1013.25 hPa / 15 C. */
const bennett = (apparent: number): number => 1 / Math.tan((apparent + 7.31 / (apparent + 4.4)) * Math.PI / 180) * (1013.25 / 1010) * (283 / 288.15)

describe('ray-traced refraction, US Standard Atmosphere 1976 at sea level', () => {
  it('45 deg: the refraction constant, 60.4" at 0 C / 1013.25 hPa scaled by density (Explanatory Supplement 3.28), within 0.6%', () => {
    expect(sea.refraction(45) * 60).toBeCloseTo(60.4 * 273.15 / 288.15, -0.5)
    expect(Math.abs(sea.refraction(45) * 60 / (60.4 * 273.15 / 288.15) - 1)).toBeLessThan(0.006)
  })
  it('5-60 deg: within 0.12 arcmin of Bennett (1982) scaled to the same pressure and temperature', () => {
    for (const a of [5, 10, 20, 30, 45, 60]) expect(Math.abs(sea.refraction(a) - bennett(a))).toBeLessThan(0.12)
  })
  it('horizon: 33-35 arcmin (standard atmosphere 15 C; the classic 34-35\' are for cooler 10 C air with observed lapse)', () => {
    const r0 = sea.refraction(0)
    expect(r0).toBeGreaterThan(32.5)
    expect(r0).toBeLessThan(35.5)
    // the old closed formula at the same pressure/temperature lies within 1.5'
    expect(Math.abs(r0 - bennett(0))).toBeLessThan(1.5)
    void refractionArcmin
  })
  it('agrees with an independent step-by-step ray integration (curvature from grad n) to 0.05 arcmin at 0 and 2 deg', () => {
    // March a ray from the observer in the plane, d(n t)/ds = grad n, then measure its total turn.
    const RE = 6371008.8
    const nOf = (r: number): number => 1 + sea.nm1(r)
    for (const alt of [0, 2]) {
      let x = 0, y = RE, dx = Math.cos(alt * Math.PI / 180), dy = Math.sin(alt * Math.PI / 180)
      const start = Math.atan2(dy, dx)
      let ds = 10
      for (;;) {
        const r = Math.hypot(x, y)
        if (r - RE > 80_000) break
        const n = nOf(r), dn = (nOf(r + 0.5) - nOf(r - 0.5))
        const gx = dn * x / r, gy = dn * y / r, gt = gx * dx + gy * dy
        dx += ds * (gx - gt * dx) / n; dy += ds * (gy - gt * dy) / n
        const m = Math.hypot(dx, dy); dx /= m; dy /= m
        x += dx * ds; y += dy * ds
        ds = r - RE > 3000 ? 100 : 10
      }
      // turn of the ray relative to a straight line, measured in the fixed frame: start angle minus end angle,
      // plus the angle the ray is rotated by moving around the Earth (none: the frame is fixed).
      const turn = (start - Math.atan2(dy, dx)) * 180 / Math.PI * 60
      expect(Math.abs(turn - sea.refraction(alt))).toBeLessThan(0.05)
    }
  })
  it('dip of the sea horizon from height matches the navigators\' 1.76\' sqrt(h) within 3%', () => {
    for (const h of [30, 200, 800, 2000]) {
      const d = new Atmosphere(us, h).dip() * 60
      expect(Math.abs(d / (1.76 * Math.sqrt(h)) - 1)).toBeLessThan(0.03)
    }
  })
  it('negative apparent altitude (from 800 m): refraction exceeds the horizon value, smoothly', () => {
    const a = new Atmosphere(us, 800)
    const d = a.dip()
    expect(a.refraction(-d)).toBeGreaterThan(a.refraction(0))
    expect(a.refraction(-d / 2)).toBeGreaterThan(a.refraction(0))
    expect(a.refraction(-d / 2)).toBeLessThan(a.refraction(-d))
  })
  it('surface layer: a hill anomaly stays over the hill; the far low horizon keeps the profile air', () => {
    // A warm hill (anomaly +6 K) over the plain's profile: only the air near the observer changes, so the dip differs
    // from warming the whole column below; no anomaly = the plain profile; Infinity = the full column (old way).
    const plain = new Atmosphere(us, 800), full = new Atmosphere(us, 800, 6), layer = new Atmosphere(us, 800, 6, 200)
    expect(layer.dip()).not.toBeCloseTo(full.dip(), 6)
    expect(new Atmosphere(us, 800, 0, 200).dip()).toBeCloseTo(plain.dip(), 6)
    expect(new Atmosphere(us, 800, 6, Infinity).dip()).toBe(full.dip())
  })
  it('hydrostatic pressure at the observer: 1013.25 at 0 m, levelAt follows US 1976 at 1 km (898.7 hPa)', () => {
    expect(levelAt(us, 1000).p).toBeCloseTo(898.7, 0)
  })
})

describe('model atmospheres asset', () => {
  it('29 profiles: AFGL x5 + Bet Dagan 12 months x {00, 12 UTC}; summer afternoons warmer than nights', async () => {
    const bytes = readFileSync(new URL('../assets/atmosphere.bin', import.meta.url))
    const t = parseAtmospheres(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
    expect(t.length).toBe(29)
    const jul00 = t[5 + 6 * 2]!, jul12 = t[5 + 6 * 2 + 1]!
    expect(levelAt(jul12, 50).t - levelAt(jul00, 50).t).toBeGreaterThan(3)
    for (const p of t) expect(p[p.length - 1]!.z).toBeGreaterThan(70_000)
    useFileAssets()
    expect((await getAtmospheres()).length).toBe(29)
  })
  it('sunrise/sunset move by seconds, not minutes, against the old closed formula (Jerusalem, Bnei Brak, London)', () => {
    const bytes = readFileSync(new URL('../assets/atmosphere.bin', import.meta.url))
    const atmospheres = parseAtmospheres(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
    for (const [lat, lng, elevation, tzid] of [[31.778, 35.235, 800, 'Asia/Jerusalem'], [32.084, 34.834, 30, 'Asia/Jerusalem'], [51.507, -0.128, 11, 'Europe/London']] as const) {
      for (const month of [1, 7]) {
        const place = { lat, lng, elevation, tzid, monthlyTemperatureC: 'standard' as const }
        const a = zmanInstants({ ...place, atmospheres }, { year: 2026, month, day: 15 }, ['sunrise', 'sunset'])
        const b = zmanInstants(place, { year: 2026, month, day: 15 }, ['sunrise', 'sunset'])
        expect(Math.abs(Number(a.sunrise! - b.sunrise!)) / 1e9).toBeLessThan(120)
      }
    }
  })
})
