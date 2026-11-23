import { describe, expect, it } from 'vitest'
import { julianDay, utcSunrise, utcSunset } from '../src/noaa'
import { horizonRefractionArcmin, standardPressure, standardTemperature } from '../src/refraction'
import { computeZmanim, getMonthlyTemperatures, getPlace, horizonZenith, zmanim, zmanInstants } from '../src/index'
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
        const jd = julianDay(2026, m, 15)
        const z = horizonZenith({ ...p, monthlyTemperatureC: temps }, date)
        for (const f of [utcSunrise, utcSunset]) {
          const d = Math.abs(f(jd, p.lat, p.lng, z) - f(jd, p.lat, p.lng, FIXED)) * 3600
          max = Math.max(max, d); sum += d; n++
        }
        const withT = zmanInstants({ ...p, monthlyTemperatureC: temps }, date, ['alot', 'misheyakir', 'tzeit', 'chatzot'])
        const noT = zmanInstants({ lat: p.lat, lng: p.lng, tzid: p.tzid }, date, ['alot', 'misheyakir', 'tzeit', 'chatzot'])
        expect(withT).toEqual(noT)
        // degree zmanim equal the raw NOAA result at their geometric zenith
        expect(utcSunrise(jd, p.lat, p.lng, 90 + 16.1)).toBe(utcSunrise(jd, p.lat, p.lng, 90 + 16.1))
      }
      lines.push(`${key} elev=${p.elevation} T=[${temps.join(',')}] mean=${(sum / n).toFixed(1)}s max=${max.toFixed(1)}s`)
      expect(max).toBeLessThan(90)
    }
    console.log(lines.join('\n'))
  })
})

describe('lazy climate.bin', () => {
  it('degree zmanim do not load climate.bin; sunrise does, once', async () => {
    const reads = useFileAssets()
    await zmanim(1, new Date(2026, 0, 1), ['alot', 'tzeit', 'chatzot'])
    expect(reads.sort()).toEqual(['places.bin', 'tz.json'])
    await zmanim(1, new Date(2026, 0, 1), ['sunrise'])
    await zmanim(2, new Date(2026, 0, 1), ['plag'])
    expect(reads.sort()).toEqual(['climate.bin', 'places.bin', 'tz.json'])
  })
  it('computeZmanim without data files still works (standard atmosphere)', () => {
    const r = computeZmanim({ lat: 31.77, lng: 35.22, tzid: 'Asia/Jerusalem', elevation: 786 }, { year: 2026, month: 6, day: 21 }, ['sunrise'])
    expect(r.sunrise).toMatch(/^05:3\d$/)
  })
})
