import { describe, expect, it } from 'vitest'
import { CLIMATE_MINMAX_RECORD_SIZE, getAtmospheres, getMonthlyMinMaxTemperatures, getMonthlyTemperatures, getPlace, zmanInstants } from '../src/index'
import { useFileAssets } from './helpers'

const minutes = (a: bigint, b: bigint) => Number(b - a) / 6e10

describe('daily minimum / maximum temperature for sunrise / sunset refraction', () => {
  it('climate-minmax.bin: min <= mean <= max for the test places', async () => {
    useFileAssets()
    for (const id of [1, 85, 100, 109]) {
      const { min, max } = await getMonthlyMinMaxTemperatures(id)
      const mean = await getMonthlyTemperatures(id)
      expect(min).toHaveLength(12)
      for (let m = 0; m < 12; m++) {
        expect(min[m]!).toBeLessThanOrEqual(mean[m]! + 0.5)
        expect(max[m]!).toBeGreaterThanOrEqual(mean[m]! - 0.5)
        expect(max[m]! - min[m]!).toBeGreaterThan(2)
      }
    }
    expect(CLIMATE_MINMAX_RECORD_SIZE).toBe(24)
  })
  it('getPlace attaches them', async () => {
    useFileAssets()
    const p = await getPlace(109)
    expect(p.monthlyMinTemperatureC).toEqual((await getMonthlyMinMaxTemperatures(109)).min)
    expect(p.monthlyMaxTemperatureC).toEqual((await getMonthlyMinMaxTemperatures(109)).max)
  })
  it('colder sunrise air refracts more (earlier sunrise), warmer sunset air less (earlier sunset)', async () => {
    useFileAssets()
    const atmospheres = await getAtmospheres()
    const place = { ...(await getPlace(109)), atmospheres } // London: AFGL profiles
    const mean = { ...place, monthlyMinTemperatureC: undefined, monthlyMaxTemperatureC: undefined }
    const d = { year: 2026, month: 7, day: 15 }
    const which = ['sunrise', 'sunset'] as const
    const a = zmanInstants(mean, d, which), b = zmanInstants(place, d, which)
    expect(minutes(a.sunrise!, b.sunrise!)).toBeLessThan(-0.1)
    expect(minutes(a.sunrise!, b.sunrise!)).toBeGreaterThan(-0.6)
    expect(minutes(a.sunset!, b.sunset!)).toBeLessThan(-0.1)
    expect(minutes(a.sunset!, b.sunset!)).toBeGreaterThan(-0.6)
  })
  it('falls back to the mean where min/max are unknown, and ignores them for standard', async () => {
    useFileAssets()
    const atmospheres = await getAtmospheres()
    const place = { ...(await getPlace(1)), atmospheres }
    const d = { year: 2026, month: 1, day: 15 }
    const which = ['sunrise', 'sunset', 'sunriseElevated'] as const
    const nan = new Array(12).fill(NaN)
    expect(zmanInstants({ ...place, monthlyMinTemperatureC: nan, monthlyMaxTemperatureC: nan }, d, which))
      .toEqual(zmanInstants({ ...place, monthlyMinTemperatureC: undefined, monthlyMaxTemperatureC: undefined }, d, which))
    expect(zmanInstants({ ...place, monthlyTemperatureC: 'standard' }, d, which))
      .toEqual(zmanInstants({ ...place, monthlyTemperatureC: 'standard', monthlyMinTemperatureC: undefined, monthlyMaxTemperatureC: undefined }, d, which))
  })
})
