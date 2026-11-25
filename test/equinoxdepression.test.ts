import { describe, expect, it } from 'vitest'
import { equinoxDepression, JERUSALEM_LAT } from '../src/zmanim.js'

// Re-derives the minutes-at-the-Jerusalem-equinox degrees independently: step the sun along the equator
// (declination 0) at 31.778 N, find visible sea-level sunset (-0.833 deg) by bisection, then read the altitude N minutes later.
const r = Math.PI / 180
const alt = (H: number): number => Math.asin(Math.cos(JERUSALEM_LAT * r) * Math.cos(H * r)) / r
function bySearch(minutes: number): number {
  let lo = 0, hi = 180
  for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (alt(m) > -0.833333333) lo = m; else hi = m }
  return -alt(lo + minutes / 4)
}

describe('equinoxDepression', () => {
  it('uses Har HaBayit latitude', () => expect(JERUSALEM_LAT).toBe(31.778))
  for (const [n, want] of [[72, 16.0503], [90, 19.7978], [13.5, 3.7011], [18, 4.6565], [-18, -2.9919]] as const) {
    it(`${n} min`, () => {
      expect(equinoxDepression(n)).toBeCloseTo(bySearch(n), 9)
      expect(equinoxDepression(n)).toBeCloseTo(want, 3)
    })
  }
})
