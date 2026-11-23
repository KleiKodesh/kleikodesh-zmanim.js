import { describe, expect, it } from 'vitest'
import { getPlace, zmanInstants } from '../src/index'
import { useFileAssets } from './helpers'

const ms = (v: bigint | null | undefined): number => (v == null ? NaN : Number(v / 1_000_000n))

describe('tzeit18Sun (18 minutes by the sun)', () => {
  it('is 18 minutes after sea-level sunset in Jerusalem at the equinox, later in summer, earlier in winter', async () => {
    useFileAssets()
    const p = { ...(await getPlace(1)), elevation: 0, monthlyTemperatureC: 'standard' as const }
    const gap = (month: number, day: number) => {
      const t = zmanInstants(p, { year: 2026, month, day }, ['sunset', 'tzeit18Sun'])
      return (ms(t.tzeit18Sun) - ms(t.sunset)) / 60000
    }
    expect(gap(3, 20)).toBeCloseTo(18, 0)
    expect(gap(9, 23)).toBeCloseTo(18, 0)
    expect(gap(6, 21)).toBeGreaterThan(18.5)
    expect(gap(12, 21)).toBeGreaterThan(18.5) // the winter solstice is also a bit longer than the equinox
    expect(gap(6, 21)).toBeLessThan(23)
  })
})
