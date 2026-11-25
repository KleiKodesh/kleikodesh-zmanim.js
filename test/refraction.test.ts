import { describe, expect, it } from 'vitest'
import { horizonRefractionArcmin, standardPressure, standardTemperature } from '../src/refraction'
import { computeZmanim, getMonthlyTemperatures, getPlace, horizonDip, horizonZenith, sunEventMs, zmanim, zmanInstants } from '../src/index'
import { tsvByKey, useFileAssets } from './helpers'

describe('refraction model', () => {
  it('standard atmosphere pressure', () => {
    expect(standardPressure(0)).toBeCloseTo(1013.25, 2)
    expect(standardPressure(1000)).toBeCloseTo(898.7, 0)
    expect(standardPressure(2240)).toBeCloseTo(772, 0)
    expect(standardTemperature(1000)).toBeCloseTo(8.5, 5)
  })
  it('horizon refraction is about 34-35 arcmin at 1010 hPa / 10 C and scales with P/T', () => {
    const r = horizonRefractionArcmin(1010, 10)
    expect(r).toBeGreaterThan(33.5)
    expect(r).toBeLessThan(35.5)
    expect(horizonRefractionArcmin(800, 10)).toBeLessThan(r)
    expect(horizonRefractionArcmin(1010, -20)).toBeGreaterThan(r)
  })
})

const KEYS = ['jerusalem', 'telAviv', 'eilat', 'tzfat', 'london', 'newYork', 'moscow', 'mexicoCity', 'johannesburg']
const FIXED = 90 + 50 / 60 // the old fixed 16' radius + 34' refraction

describe('sunrise/sunset vs the old fixed 34 arcmin', () => {
  const tsv = tsvByKey()
  it('shift stays small; degree zmanim unchanged', async () => {
    useFileAssets()
    const lines: string[] = []
    for (const key of KEYS) {
      const row = tsv.get(key)
      if (!row) continue
      const p = await getPlace(Number(row[0]))
      const temps = await getMonthlyTemperatures(p.id)
      let max = 0; let sum = 0; let n = 0
      for (let m = 1; m <= 12; m++) {
        const date = { year: 2026, month: m, day: 15 }
        const midnight = Date.UTC(2026, m - 1, 15)
        const z = horizonZenith({ ...p, monthlyTemperatureC: temps }, date)
        for (const kind of [-1, 1] as const) {
          const d = Math.abs(sunEventMs(p.lat, p.lng, midnight, z, kind) - sunEventMs(p.lat, p.lng, midnight, FIXED, kind)) / 1000
          max = Math.max(max, d); sum += d; n++
        }
        const withT = zmanInstants({ ...p, monthlyTemperatureC: temps }, date, ['alot', 'misheyakir', 'tzeit', 'chatzot'])
        const noT = zmanInstants({ lat: p.lat, lng: p.lng, tzid: p.tzid }, date, ['alot', 'misheyakir', 'tzeit', 'chatzot'])
        expect(withT).toEqual(noT)
      }
      lines.push(`${key} elev=${p.elevation} T=[${temps.join(',')}] mean=${(sum / n).toFixed(1)}s max=${max.toFixed(1)}s`)
      expect(max).toBeLessThan(90)
    }
    console.log(lines.join('\n'))
  })
})

describe('lazy climate.bin', () => {
  it('getPlace attaches the climate (climate.bin loaded once, with places.bin and tz.json)', async () => {
    const reads = useFileAssets()
    await zmanim(1, new Date(2026, 0, 1), ['alot', 'tzeit', 'chatzot'])
    expect(reads.sort()).toEqual(['climate.bin', 'places.bin', 'tz.json'])
    expect((await getPlace(1)).monthlyTemperatureC).toEqual(await getMonthlyTemperatures(1))
    await zmanim(1, new Date(2026, 0, 1), ['sunrise'])
    await zmanim(2, new Date(2026, 0, 1), ['plag'])
    expect(reads.sort()).toEqual(['atmosphere.bin', 'climate.bin', 'places.bin', 'tz.json'])
  })
  it('bare coordinates throw for climate zmanim; explicit standard atmosphere works', () => {
    const bare = { lat: 31.77, lng: 35.22, tzid: 'Asia/Jerusalem', elevation: 786 }
    const day = { year: 2026, month: 6, day: 21 }
    expect(() => computeZmanim(bare, day, ['sunrise'])).toThrow(/temperatures/)
    expect(() => zmanInstants(bare, day, ['sunset'])).toThrow(/temperatures/)
    expect(computeZmanim(bare, day, ['alot', 'tzeit']).alot).toMatch(/^\d\d:\d\d$/)
    const r = computeZmanim({ ...bare, monthlyTemperatureC: 'standard' }, { year: 2026, month: 6, day: 21 }, ['sunrise'])
    expect(r.sunrise).toMatch(/^05:3\d$/)
  })
})

describe('sunrise/sunset from the place height', () => {
  it('dip grows with height; elevated sunset is later, sunrise earlier', () => {
    expect(horizonDip(0)).toBe(0)
    expect(horizonDip(-400)).toBe(0)
    // Nautical Almanac / Bowditch dip with terrestrial refraction, 1.76' sqrt(h): 750 m -> 48.2', smaller than the geometric 52.7'.
    expect(horizonDip(750) * 60).toBeCloseTo(48.2, 1)
    expect(horizonDip(30) * 60).toBeCloseTo(9.64, 1)
    expect(horizonDip(750) * 60).toBeLessThan(Math.acos(6_371_000 / (6_371_000 + 750)) * 180 / Math.PI * 60 - 4)
    const place = { lat: 31.77, lng: 35.22, tzid: 'Asia/Jerusalem', elevation: 800, monthlyTemperatureC: 'standard' as const }
    const date = { year: 2026, month: 6, day: 21 }
    const t = zmanInstants(place, date, ['sunrise', 'sunriseElevated', 'sunset', 'sunsetElevated'])
    const min = (a: bigint | null | undefined, b: bigint | null | undefined) => Number(a! - b!) / 6e10
    expect(min(t.sunsetElevated, t.sunset)).toBeGreaterThan(3)
    expect(min(t.sunsetElevated, t.sunset)).toBeLessThan(8)
    expect(min(t.sunrise, t.sunriseElevated)).toBeGreaterThan(3)
    const sea = zmanInstants({ ...place, elevation: 0 }, date, ['sunset', 'sunsetElevated'])
    expect(sea.sunsetElevated).toBe(sea.sunset)
  })
  it('extra opinions are in order', () => {
    const r = computeZmanim({ lat: 31.77, lng: 35.22, tzid: 'Asia/Jerusalem', elevation: 786, monthlyTemperatureC: 'standard' }, { year: 2026, month: 3, day: 20 },
      ['alot90', 'alot', 'plag', 'plagMga', 'sunset', 'tzeitGeonim', 'tzeit'])
    expect(r.alot90! < r.alot!).toBe(true)
    expect(r.plag! < r.plagMga!).toBe(true)
    expect(r.sunset! < r.tzeitGeonim! && r.tzeitGeonim! < r.tzeit!).toBe(true)
  })
})

describe('elevated sunset: dip and refraction traced in one atmosphere', () => {
  // Elevated minus level = D + R(-D) - R(0): the grazing ray crosses the denser air below the observer, so it is a
  // little more than the old closed-form value (4.8-5.2 min at 750 m).
  it('Jerusalem 750 m / Bnei Brak 30 m, 21 Jun and 21 Dec: dip with terrestrial refraction', () => {
    const cases = [
      [31.778, 35.235, 750, 6, 4.9, 5.6], [31.778, 35.235, 750, 12, 4.8, 5.5],
      [32.084, 34.834, 30, 6, 0.95, 1.1], [32.084, 34.834, 30, 12, 0.95, 1.1],
    ] as const
    for (const [lat, lng, elevation, month, lo, hi] of cases) {
      const t = zmanInstants({ lat, lng, tzid: 'Asia/Jerusalem', elevation, monthlyTemperatureC: 'standard' }, { year: 2026, month, day: 21 }, ['sunset', 'sunsetElevated'])
      const later = (Number(t.sunsetElevated!) - Number(t.sunset!)) / 6e10
      expect(later).toBeGreaterThan(lo)
      expect(later).toBeLessThan(hi)
    }
  })
})
