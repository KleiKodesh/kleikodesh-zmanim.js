import { describe, expect, it } from 'vitest'
import { CLIMATE_SUNEVENT_RECORD_SIZE, getAtmospheres, getMonthlyMinMaxTemperatures, getMonthlySunEventTemperatures, getMonthlyTemperatures, getPlace, zmanInstants } from '../src/index'
import { useFileAssets } from './helpers'

const minutes = (a: bigint, b: bigint) => Number(b - a) / 6e10
const IDS = [1, 85, 100, 109] // Jerusalem, Bnei Brak, Tiberias, London

describe('mean temperature at sunrise / sunset for horizon refraction', () => {
  it('climate-sunevent.bin: daily minimum <= sunrise < sunset <= daily maximum (half-degree steps)', async () => {
    useFileAssets()
    expect(CLIMATE_SUNEVENT_RECORD_SIZE).toBe(24)
    for (const id of IDS) {
      const { sunrise, sunset } = await getMonthlySunEventTemperatures(id)
      const { min, max } = await getMonthlyMinMaxTemperatures(id)
      const mean = await getMonthlyTemperatures(id)
      for (let m = 0; m < 12; m++) {
        expect(sunrise[m]! * 2).toBe(Math.round(sunrise[m]! * 2))
        expect(sunrise[m]!).toBeGreaterThanOrEqual(min[m]! - 1)
        expect(sunrise[m]!).toBeLessThan(sunset[m]!)
        expect(sunset[m]!).toBeLessThanOrEqual(max[m]! + 1)
        expect(sunrise[m]!).toBeLessThanOrEqual(mean[m]! + 1)
      }
    }
    // Inland summer: by sunset the air has cooled well below the afternoon maximum.
    const j = await getMonthlySunEventTemperatures(1), jm = await getMonthlyMinMaxTemperatures(1)
    expect(jm.max[6]! - j.sunset[6]!).toBeGreaterThan(3)
  })
  it('getPlace attaches them, and loads the min/max fallback only when needed', async () => {
    useFileAssets()
    const p = await getPlace(109)
    expect(p.monthlySunriseTemperatureC).toEqual((await getMonthlySunEventTemperatures(109)).sunrise)
    expect(p.monthlySunsetTemperatureC).toEqual((await getMonthlySunEventTemperatures(109)).sunset)
    expect(p.monthlyMinTemperatureC).toBeUndefined()
  })
  it('fallback chain: sunrise/sunset -> daily min/max -> mean', async () => {
    useFileAssets()
    const atmospheres = await getAtmospheres()
    const base = { ...(await getPlace(1)), atmospheres }
    const { min, max } = await getMonthlyMinMaxTemperatures(1)
    const d = { year: 2026, month: 7, day: 15 }
    const which = ['sunrise', 'sunset', 'sunriseElevated', 'sunsetElevated'] as const
    const nan = new Array(12).fill(NaN)
    const withMinMax = { ...base, monthlyMinTemperatureC: min, monthlyMaxTemperatureC: max }
    expect(zmanInstants({ ...withMinMax, monthlySunriseTemperatureC: nan, monthlySunsetTemperatureC: nan }, d, which))
      .toEqual(zmanInstants({ ...withMinMax, monthlySunriseTemperatureC: undefined, monthlySunsetTemperatureC: undefined }, d, which))
    expect(zmanInstants({ ...base, monthlySunriseTemperatureC: nan, monthlySunsetTemperatureC: nan }, d, which))
      .toEqual(zmanInstants({ ...base, monthlySunriseTemperatureC: undefined, monthlySunsetTemperatureC: undefined, monthlyMinTemperatureC: undefined, monthlyMaxTemperatureC: undefined }, d, which))
    // The sunset-hour air (cooler than the maximum) refracts more: sunset later than with the maximum.
    const a = zmanInstants({ ...withMinMax, monthlySunsetTemperatureC: undefined }, d, ['sunset'])
    const b = zmanInstants(withMinMax, d, ['sunset'])
    expect(minutes(a.sunset!, b.sunset!)).toBeGreaterThan(0.05)
    expect(minutes(a.sunset!, b.sunset!)).toBeLessThan(1)
  })
})
