// Tests for src/spa.ts against the paper's own published values (Reda & Andreas, NREL/TP-560-34302,
// rev. January 2008): Table A4.1 (Julian Day) and Table A5.1 (the A.5 example). Plus a sanity
// comparison with the library's NOAA sunrise/transit/sunset.
import { describe, expect, it } from 'vitest'
import { julianDay as noaaJulianDay, utcNoon, utcSunrise, utcSunset } from '../src/noaa.js'
import { julianDay, spa, spaDay, spaEvent, spaSunTimes, SUNRISE_SUNSET_H0, sunMeanLongitude, zenithToH0 } from '../src/spa.js'

/** Day fraction -> seconds of day. */
const sec = (f: number): number => f * 86400

describe('Table A4.1 Julian Day examples (Gregorian rows)', () => {
  const rows: Array<[number, number, number, number, number, number]> = [
    [2000, 1, 1, 12, 0, 2451545.0],
    [1999, 1, 1, 0, 0, 2451179.5],
    [1987, 1, 27, 0, 0, 2446822.5],
    [1987, 6, 19, 12, 0, 2446966.0],
    [1988, 1, 27, 0, 0, 2447187.5],
    [1988, 6, 19, 12, 0, 2447332.0],
    [1900, 1, 1, 0, 0, 2415020.5],
    [1600, 1, 1, 0, 0, 2305447.5],
    [1600, 12, 31, 0, 0, 2305812.5],
  ]
  for (const [y, m, d, h, mi, jd] of rows) {
    it(`${y}-${m}-${d} ${h}h`, () => expect(julianDay(y, m, d, h, mi)).toBeCloseTo(jd, 9))
  }
})

describe('A.5 example (Table A5.1)', () => {
  const r = spa({
    jd: julianDay(2003, 10, 17, 12, 30, 30, -7),
    deltaT: 67,
    latitude: 39.742476,
    longitude: -105.1786,
    elevation: 1830.14,
    pressure: 820,
    temperature: 11,
    slope: 30,
    azimuthRotation: -10,
    atmosRefract: 0.5667,
  })

  it('JD', () => expect(r.jd).toBeCloseTo(2452930.312847, 6))
  it('L, B, R', () => {
    expect(r.L).toBeCloseTo(24.0182616917, 10)
    expect(r.B).toBeCloseTo(-0.0001011219, 10)
    expect(r.R).toBeCloseTo(0.9965422974, 10)
  })
  it('theta, beta', () => {
    expect(r.theta).toBeCloseTo(204.0182616917, 10)
    expect(r.beta).toBeCloseTo(0.0001011219, 10)
  })
  it('nutation, obliquity, apparent longitude', () => {
    expect(r.dPsi).toBeCloseTo(-0.00399840, 8)
    expect(r.dEps).toBeCloseTo(0.00166657, 8)
    expect(r.eps).toBeCloseTo(23.440465, 6)
    expect(r.lambda).toBeCloseTo(204.0085519281, 10)
  })
  it('alpha, delta, H', () => {
    expect(r.alpha).toBeCloseTo(202.22741, 5)
    expect(r.delta).toBeCloseTo(-9.31434, 5)
    // the paper's H is ~2e-6 degree (0.0005 s of time) from ours; see PROVENANCE.md
    expect(Math.abs(r.H - 11.105900)).toBeLessThan(5e-6)
  })
  it('topocentric alpha, delta, H', () => {
    expect(r.alphaPrime).toBeCloseTo(202.22704, 5)
    expect(r.deltaPrime).toBeCloseTo(-9.316179, 6)
    // Table A5.1 itself has H - (alpha' - alpha) = 11.10627, so H' is checked to 3e-5
    expect(Math.abs(r.hPrime - 11.10629)).toBeLessThan(3e-5)
  })
  it('zenith, azimuth, incidence', () => {
    expect(r.zenith).toBeCloseTo(50.11162, 5)
    expect(r.azimuth).toBeCloseTo(194.34024, 5)
    expect(r.azimuthAstro).toBeCloseTo(14.34024, 5)
    expect(r.incidence).toBeCloseTo(25.18700, 5)
  })
  it('sun mean longitude M and equation of time (A.1)', () => {
    expect(sunMeanLongitude(r.jme)).toBeCloseTo(205.8971722516, 9)
    // 8e-6 minute (0.0005 s) from the published value
    expect(Math.abs(r.eot - 14.641503)).toBeLessThan(1e-5)
  })

  it('transit, sunrise, sunset (A.2)', () => {
    const day = spaDay(2003, 10, 17, 67)
    const t = spaSunTimes(day, 39.742476, -105.1786)
    // 18:46:04.97, 13:12:43.46, 00:20:19.19 UT (printed to 0.01 s; we land within 0.013 s)
    expect(Math.abs(sec(t.transit) - (18 * 3600 + 46 * 60 + 4.97))).toBeLessThan(0.015)
    expect(Math.abs(sec(t.sunrise) - (13 * 3600 + 12 * 60 + 43.46))).toBeLessThan(0.015)
    expect(Math.abs(sec(t.sunset) - (0 * 3600 + 20 * 60 + 19.19))).toBeLessThan(0.015)
  })
})

describe('sanity vs NOAA (under ~1 minute)', () => {
  const places: Array<[string, number, number]> = [
    ['Jerusalem', 31.778, 35.2354],
    ['New York', 40.7128, -74.006],
    ['London', 51.5074, -0.1278],
    ['Melbourne', -37.8136, 144.9631],
    ['Denver', 39.742476, -105.1786],
  ]
  const dates: Array<[number, number, number]> = [[2024, 1, 15], [2025, 3, 20], [2025, 6, 21], [2026, 9, 23], [2026, 12, 21]]
  for (const [name, lat, lng] of places) {
    for (const [y, m, d] of dates) {
      it(`${name} ${y}-${m}-${d}`, () => {
        // The paper's A.2 returns the event that falls on the given UT date, while NOAA returns the
        // event of the given date wrapped into 0..24 h. Where an event crosses UT midnight the two
        // belong to neighbouring days, so the best of the UT dates d-1, d, d+1 is compared.
        const days = [spaDay(y, m, d - 1), spaDay(y, m, d), spaDay(y, m, d + 1)]
        const jd = noaaJulianDay(y, m, d)
        const diffMin = (h0: number, kind: -1 | 0 | 1, noaaHours: number): number => {
          let best = Infinity
          for (const day of days) {
            let diff = spaEvent(day, lat, lng, h0, kind, { iterations: 3 }) * 24 - noaaHours
            diff -= 24 * Math.round(diff / 24)
            best = Math.min(best, Math.abs(diff * 60))
          }
          return best
        }
        expect(diffMin(0, 0, utcNoon(jd, lng))).toBeLessThan(1)
        expect(diffMin(SUNRISE_SUNSET_H0, -1, utcSunrise(jd, lat, lng, 90))).toBeLessThan(1)
        expect(diffMin(SUNRISE_SUNSET_H0, 1, utcSunset(jd, lat, lng, 90))).toBeLessThan(1)
        // any zenith: 16.1 degrees below the horizon (skipped where the sun never gets that low)
        const noaaDawn = utcSunrise(jd, lat, lng, 106.1)
        if (!Number.isNaN(noaaDawn)) expect(diffMin(zenithToH0(106.1), -1, noaaDawn)).toBeLessThan(1)
      })
    }
  }
  it('polar night gives NaN', () => {
    expect(spaEvent(spaDay(2025, 12, 21), 80, 0, SUNRISE_SUNSET_H0, -1)).toBeNaN()
  })
})
