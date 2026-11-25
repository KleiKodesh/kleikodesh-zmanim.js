import { describe, expect, it } from 'vitest'
import { defaultDeltaT, polynomialDeltaT } from '../src/spa.js'

describe('defaultDeltaT', () => {
  it('follows the observed table (IERS/USNO)', () => {
    expect(defaultDeltaT(2020)).toBeCloseTo(69.36, 2)
    expect(defaultDeltaT(2016.5)).toBeCloseTo((68.10 + 68.59) / 2, 2)
    expect(Math.abs(defaultDeltaT(2026.9) - 69.2)).toBeLessThan(0.3)
  })
  it('falls back to the polynomial outside the table, continuously', () => {
    expect(defaultDeltaT(1990)).toBe(polynomialDeltaT(1990))
    expect(Math.abs(defaultDeltaT(2028.0001) - defaultDeltaT(2028))).toBeLessThan(0.01)
    expect(defaultDeltaT(2200)).toBe(polynomialDeltaT(2200))
  })
})
