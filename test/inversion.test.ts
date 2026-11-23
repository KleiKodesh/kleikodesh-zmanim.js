import { describe, expect, it } from 'vitest'
import { horizonRefractionArcmin, INVERSION_C, inversionFactor, standardPressure, temperatureOn } from '../src/refraction'
import { getPlace, horizonZenith, sunEventMs, zmanInstants } from '../src/index'
import { tsvByKey, useFileAssets } from './helpers'

// Published Edmonton sunset refraction (degrees): mean, SD, count.
const ALL_YEAR = { mean: 0.579, sd: 0.108, n: 135 } // Peterson, Lozowski, Hube, Sampson 2003
const WINTER = { mean: 0.699, sd: 0.118, n: 26 } // Sampson, Lozowski, Machel 2005
const WINTER_MONTHS = [12, 1, 2]
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

async function edmonton() {
  useFileAssets()
  const p = await getPlace(Number(tsvByKey().get('edmonton')![0]))
  const r0 = (m: number) => horizonRefractionArcmin(standardPressure(p.elevation), temperatureOn(p.monthlyTemperatureC, m, 15)) / 60
  const g = (m: number) => p.monthlyLapseKPerKm[m - 1]!
  const mean = (ms: number[], f: (m: number) => number) => ms.reduce((s, m) => s + f(m), 0) / ms.length
  const stats = (ms: number[]) => ({ r0: mean(ms, r0), x: mean(ms, (m) => Math.max(0, g(m)) / 27.7), r: mean(ms, (m) => r0(m) * inversionFactor(g(m))) })
  return { winter: stats(WINTER_MONTHS), year: stats(MONTHS) }
}

describe('inversion term', () => {
  it('Edmonton reproduces the published means within their SD (c = 1 from the curvature formula, not fitted)', async () => {
    const e = await edmonton()
    console.log(`Edmonton winter: no term ${e.winter.r0.toFixed(3)}, with term ${e.winter.r.toFixed(3)}, observed ${WINTER.mean}; `
      + `year: no term ${e.year.r0.toFixed(3)}, with term ${e.year.r.toFixed(3)}, observed ${ALL_YEAR.mean}`)
    expect(INVERSION_C).toBe(1)
    expect(Math.abs(e.winter.r - WINTER.mean)).toBeLessThan(WINTER.sd)
    expect(Math.abs(e.year.r - ALL_YEAR.mean)).toBeLessThan(ALL_YEAR.sd)
    // The term moves the model toward both observed means.
    expect(Math.abs(e.winter.r - WINTER.mean)).toBeLessThan(Math.abs(e.winter.r0 - WINTER.mean))
    expect(Math.abs(e.year.r - ALL_YEAR.mean)).toBeLessThan(Math.abs(e.year.r0 - ALL_YEAR.mean))
  })
  it('a 1/SE^2-weighted fit of c to the two Edmonton means agrees with c = 1 within 2 SE', async () => {
    const e = await edmonton()
    let num = 0; let den = 0
    for (const [m, o] of [[e.winter, WINTER], [e.year, ALL_YEAR]] as const) {
      const w = o.n / o.sd ** 2; const a = m.r0 * m.x
      num += w * a * (o.mean - m.r0); den += w * a * a
    }
    const c = num / den; const se = 1 / Math.sqrt(den)
    console.log(`fitted c = ${c.toFixed(2)} +- ${se.toFixed(2)}`)
    expect(Math.abs(c - INVERSION_C)).toBeLessThan(2 * se)
  })
  it('effect table; Israeli coastal < 5 s; degree zmanim unchanged', async () => {
    useFileAssets()
    const tsv = tsvByKey()
    const coastal = ['telAviv', 'haifa', 'ashdod', 'netanya', 'herzliya', 'ashkelon', 'batYam', 'hadera', 'nahariya']
    const lines: string[] = []
    for (const key of ['jerusalem', ...coastal, 'london', 'newYork', 'moscow', 'montreal', 'edmonton']) {
      const row = tsv.get(key)
      if (!row) continue
      const p = await getPlace(Number(row[0]))
      const flat = { ...p, monthlyLapseKPerKm: undefined }
      const shift = (m: number) => {
        const date = { year: 2026, month: m, day: 15 }
        const mid = Date.UTC(2026, m - 1, 15)
        return [-1, 1].map((k) => (sunEventMs(p.lat, p.lng, mid, horizonZenith(p, date), k as -1 | 1)
          - sunEventMs(p.lat, p.lng, mid, horizonZenith(flat, date), k as -1 | 1)) / 1000)
      }
      let max = 0
      for (const m of MONTHS) {
        max = Math.max(max, ...shift(m).map(Math.abs))
        const date = { year: 2026, month: m, day: 15 }
        const deg = ['alot', 'misheyakir', 'tzeit', 'chatzot'] as const
        expect(zmanInstants(p, date, deg)).toEqual(zmanInstants(flat, date, deg))
      }
      const [wr, ws] = shift(1); const [sr, ss] = shift(7)
      lines.push(`${key}: Jan rise ${wr!.toFixed(1)} s set ${ws!.toFixed(1)} s; Jul rise ${sr!.toFixed(1)} s set ${ss!.toFixed(1)} s; max ${max.toFixed(1)} s`)
      if (coastal.includes(key)) expect(max).toBeLessThan(5)
    }
    console.log(lines.join('\n'))
  })
})
