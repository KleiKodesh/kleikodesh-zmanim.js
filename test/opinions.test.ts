import { describe, expect, it } from 'vitest'
import { getPlace, ROUNDING, spa, ZMAN_NAMES, zmanInstants, type ZmanName } from '../src/index'
import { julianDayFromUtcMs } from '../src/spa'
import { tsvByKey, useFileAssets } from './helpers'

const ms = (v: bigint | null | undefined): number => (v == null ? NaN : Number(v / 1_000_000n))
/** True zenith of the sun's centre (no refraction) at [t] for [lat]/[lng]. */
const zenithAt = (t: number, lat: number, lng: number): number =>
  spa({ jd: julianDayFromUtcMs(t), latitude: lat, longitude: lng, atmosRefract: 0, pressure: 0 }).zenith

describe('opinion lines', () => {
  it('every name has a rounding', () => {
    for (const n of ZMAN_NAMES) expect(ROUNDING[n]).toBeDefined()
  })
  it('are in order at Jerusalem (equinox and summer)', async () => {
    useFileAssets()
    const p = await getPlace(1)
    for (const date of [{ year: 2026, month: 3, day: 20 }, { year: 2026, month: 6, day: 21 }, { year: 2026, month: 12, day: 21 }]) {
      const t = zmanInstants(p, date)
      const order: ZmanName[] = ['alot90Visible', 'alot90', 'alotVisible', 'alot', 'misheyakirVisible', 'misheyakir', 'misheyakir11', 'misheyakirLechumra',
        'misheyakir10p2', 'sunrise', 'chatzot', 'sunset', 'tzeitGeonim', 'tzeitGeonimVisible', 'tzeit7083', 'tzeit', 'tzeitVisible']
      for (let i = 1; i < order.length; i++) expect(ms(t[order[i]!]), order[i]).toBeGreaterThan(ms(t[order[i - 1]!]))
      // Visible lines: R0 (~0.5 deg) deeper, so 2-4 minutes beyond the geometric line.
      for (const [a, b] of [['alotVisible', 'alot'], ['tzeitVisible', 'tzeit']] as const) {
        const d = Math.abs(ms(t[a]) - ms(t[b])) / 60000
        expect(d).toBeGreaterThan(1.5); expect(d).toBeLessThan(5)
      }
      expect(ms(t.sofShmaMga16)).toBeLessThan(ms(t.sofShmaGra))
      expect(ms(t.sofTfillaMga16)).toBeLessThan(ms(t.sofTfillaGra))
      expect(ms(t.minchaGedola30)).toBe(Math.max(ms(t.chatzot) + 1_800_000, ms(t.minchaGedola)))
    }
  })
  it('minchaGedola30 is 30 minutes after chatzot in winter, plain minchaGedola in summer', async () => {
    useFileAssets()
    const p = await getPlace(1)
    const w = zmanInstants(p, { year: 2026, month: 12, day: 21 }, ['chatzot', 'minchaGedola30'])
    expect(ms(w.minchaGedola30) - ms(w.chatzot)).toBe(1_800_000)
    const s = zmanInstants(p, { year: 2026, month: 6, day: 21 }, ['minchaGedola', 'minchaGedola30'])
    expect(s.minchaGedola30).toBe(s.minchaGedola)
  })
})

describe('high latitudes in June: null or a correct time, never garbage', () => {
  const tsv = tsvByKey()
  const lines: Array<[ZmanName, number]> = [['alot90', 19.8], ['alot', 16.05], ['misheyakir', 11.5], ['misheyakir11', 11],
    ['misheyakir10p2', 10.2], ['misheyakirLechumra', 10.5], ['alot12', 12], ['tzeitGeonim', 3.7], ['tzeit7083', 7.083], ['tzeit', 8.5]]
  for (const key of ['london', 'manchester', 'amsterdam']) {
    it(key, async () => {
      useFileAssets()
      const row = tsv.get(key)
      expect(row, key).toBeDefined()
      const p = await getPlace(Number(row![0]))
      let checked = 0
      for (let day = 1; day <= 30; day++) {
        const t = zmanInstants(p, { year: 2026, month: 6, day })
        // The deepest the sun goes this night: if it never reaches the depression the value must be null.
        const midnight = ms(t.chatzot) - 12 * 3_600_000
        const deepest = Math.max(zenithAt(midnight, p.lat, p.lng), zenithAt(ms(t.chatzot) + 12 * 3_600_000, p.lat, p.lng)) - 90
        for (const [name, dep] of lines) {
          const v = ms(t[name])
          if (dep > deepest + 0.05) expect(t[name], `${name} ${day}`).toBeNull()
          if (Number.isNaN(v)) { expect(dep, `${name} ${day} null though reached`).toBeGreaterThan(deepest - 0.05); continue }
          expect(Math.abs(zenithAt(v, p.lat, p.lng) - 90 - dep), `${name} ${day}`).toBeLessThan(0.01)
          checked++
        }
        for (const [plain, fb] of [['alot', 'alotChatzot'], ['alot90', 'alot90Chatzot'], ['misheyakir', 'misheyakirChatzot']] as const) {
          expect(t[fb], fb).toBe(t[plain] ?? t.chatzotNight)
        }
        expect(ms(t.sofShmaMga16) || 0).not.toBeLessThan(0)
      }
      expect(checked).toBeGreaterThan(30)
    })
  }
})

describe('candle lighting and Rabbeinu Tam', () => {
  it('are in order and at the right offsets', async () => {
    useFileAssets()
    const p = await getPlace(1)
    for (const date of [{ year: 2026, month: 3, day: 20 }, { year: 2026, month: 6, day: 21 }, { year: 2026, month: 12, day: 21 }]) {
      const t = zmanInstants(p, date, ['candles40', 'candles30', 'candles22', 'candles20', 'candles18', 'sunrise', 'sunset', 'tzeit',
        'tzeitRt72', 'tzeitRt72Zmanis', 'tzeitRt16'])
      const order: ZmanName[] = ['candles40', 'candles30', 'candles22', 'candles20', 'candles18', 'sunset', 'tzeit', 'tzeitRt72']
      for (let i = 1; i < order.length; i++) expect(ms(t[order[i]!]), order[i]).toBeGreaterThan(ms(t[order[i - 1]!]))
      expect(ms(t.sunset) - ms(t.candles18)).toBe(18 * 60000)
      expect(ms(t.sunset) - ms(t.candles40)).toBe(40 * 60000)
      expect(ms(t.tzeitRt72) - ms(t.sunset)).toBe(72 * 60000)
      expect(ms(t.tzeitRt72Zmanis) - ms(t.sunset)).toBeCloseTo((ms(t.sunset) - ms(t.sunrise)) / 10, -1)
      // 16.05 deg is roughly 72 minutes after sunset in Jerusalem (more in summer).
      const rt16 = (ms(t.tzeitRt16) - ms(t.sunset)) / 60000
      expect(rt16).toBeGreaterThan(65); expect(rt16).toBeLessThan(95)
    }
    expect(ROUNDING.candles18).toBe('down'); expect(ROUNDING.tzeitRt72).toBe('up')
  })
})

describe('more MGA days, seasonal and fixed-minute lines', () => {
  it('are in order and at the right offsets', async () => {
    useFileAssets()
    const p = await getPlace(1)
    for (const date of [{ year: 2026, month: 3, day: 20 }, { year: 2026, month: 6, day: 21 }, { year: 2026, month: 12, day: 21 }]) {
      const t = zmanInstants(p, date)
      const M = 60000
      const day = ms(t.sunset) - ms(t.sunrise)
      for (const [n, m] of [['tzeit13p5', 13.5], ['tzeit18', 18], ['tzeit20', 20], ['tzeit24', 24], ['tzeit30', 30], ['tzeit40', 40],
        ['tzeit45', 45], ['tzeit50', 50], ['beinHashmashotRt', 58.5]] as const) expect(ms(t[n]) - ms(t.sunset), n).toBe(m * M)
      for (const [n, m] of [['misheyakir66', 66], ['misheyakir60', 60], ['misheyakir40', 40]] as const) expect(ms(t.sunrise) - ms(t[n]), n).toBe(m * M)
      expect(ms(t.sunrise) - ms(t.alot72z)).toBeCloseTo(day / 10, -1)
      expect(ms(t.sunrise) - ms(t.alot90z)).toBeCloseTo(day / 8, -1)
      expect(ms(t.tzeit90z) - ms(t.sunset)).toBeCloseTo(day / 8, -1)
      // Fixed-minute MGA days: the shaah is (day + 2x) / 12, counted from sunrise - x.
      for (const [suf, x] of [['90', 90], ['120', 120]] as const) {
        const start = ms(t.sunrise) - x * M, h = (day + 2 * x * M) / 12
        expect(ms(t[`sofShmaMga${suf}`]) - start).toBeCloseTo(3 * h, -1)
        expect(ms(t[`sofTfillaMga${suf}`]) - start).toBeCloseTo(4 * h, -1)
        expect(ms(t[`plagMga${suf}`]) - start).toBeCloseTo(10.75 * h, -1)
      }
      // Longer MGA day = earlier deadlines and later plag; seasonal 72z matches the 72 fixed day at a 12-hour day.
      expect(ms(t.sofShmaMga120)).toBeLessThan(ms(t.sofShmaMga90))
      expect(ms(t.sofShmaMga90)).toBeLessThan(ms(t.sofShmaMga))
      expect(ms(t.sofShmaMga90z)).toBeLessThan(ms(t.sofShmaMga72z))
      expect(ms(t.sofShmaMga72z)).toBeLessThan(ms(t.sofShmaGra))
      expect(ms(t.sofShmaMga19)).toBeLessThan(ms(t.sofShmaGra))
      expect(ms(t.plagMga120)).toBeGreaterThan(ms(t.plagMga90))
      expect(ms(t.plagMga90)).toBeGreaterThan(ms(t.plag))
      expect(ms(t.plagMga19)).toBeGreaterThan(ms(t.plag))
      expect(ms(t.tzeitRt72Zmanis) - ms(t.plagMga72z)).toBeCloseTo((ms(t.tzeitRt72Zmanis) - ms(t.alot72z)) / 12 * 1.25, -1)
      expect(ms(t.beinHashmashotRt)).toBeLessThan(ms(t.tzeitRt72))
      // Dr. Baruch Cohn's day: dawn at 12 deg (between alot and misheyakir), plag 1.25 of its hours before tzeit7083.
      expect(ms(t.alot12)).toBeGreaterThan(ms(t.alot)); expect(ms(t.alot12)).toBeLessThan(ms(t.misheyakir))
      expect(ms(t.tzeit7083) - ms(t.plagAlot12Tzeit7083)).toBeCloseTo((ms(t.tzeit7083) - ms(t.alot12)) / 12 * 1.25, -1)
    }
    for (const n of ['sofShmaMga90', 'sofTfillaMga120', 'sofShmaMga19', 'sofShmaMga72z', 'beinHashmashotRt'] as const) expect(ROUNDING[n]).toBe('down')
    for (const n of ['plagMga90', 'alot72z', 'alot90z', 'tzeit90z', 'tzeit13p5', 'tzeit50'] as const) expect(ROUNDING[n]).toBe('up')
  })
})
