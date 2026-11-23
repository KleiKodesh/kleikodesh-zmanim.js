import { describe, expect, it } from 'vitest'
import { getPlace, nearestPlaceId, zmanInstants, type ZmanName } from '../src/index'
import { useFileAssets } from './helpers'

const ms = (v: bigint | null | undefined): number => (v == null ? NaN : Number(v / 1_000_000n))
const MIN = 60_000
const names: ZmanName[] = ['alot', 'alot72z', 'alotBaalHatanya', 'misheyakir7p65', 'misheyakir12p85', 'misheyakir', 'sunrise',
  'sunriseBaalHatanya', 'sunset', 'sunsetBaalHatanya', 'chatzot', 'chatzotFixedLocal', 'tzeitGeonim', 'tzeitBaalHatanya', 'tzeit50',
  'sofShmaGra', 'sofShmaBaalHatanya', 'sofTfillaBaalHatanya', 'minchaGedolaBaalHatanya', 'minchaKetanaBaalHatanya', 'plagBaalHatanya',
  'sofShmaHarari40', 'sofShmaHarari25', 'plagHarari40', 'plagHarari25', 'minchaGedolaHillel', 'minchaKetanaHillel', 'plagHillel',
  'sofShmaGraFixed', 'sofTfillaGraFixed', 'sofShmaMga72Fixed', 'sofShmaMga16Fixed', 'minchaGedolaFixed', 'minchaKetanaFixed', 'plagFixed',
  'sofShmaAsym', 'sofTfillaAsym', 'plagAsym', 'minchaGedola', 'plag']
const dates = [{ year: 2026, month: 3, day: 20 }, { year: 2026, month: 6, day: 21 }, { year: 2026, month: 12, day: 21 }]

async function check(id: number): Promise<void> {
  const p = await getPlace(id)
  for (const date of dates) {
    const t = Object.fromEntries(Object.entries(zmanInstants(p, date, names)).map(([k, v]) => [k, ms(v)])) as Record<ZmanName, number>
    for (const n of names) expect(t[n], n).not.toBeNaN()
    // Fixed chatzot is 12:00 local mean time.
    const lmt = Date.UTC(date.year, date.month - 1, date.day, 12) - p.lng * 240_000
    expect(t.chatzotFixedLocal).toBe(Math.floor(lmt))
    expect(Math.abs(t.chatzotFixedLocal - t.chatzot)).toBeLessThan(17 * MIN)
    // Netz / shkia amiti: a few minutes before sea-level sunrise and after sea-level sunset.
    for (const d of [t.sunrise - t.sunriseBaalHatanya, t.sunsetBaalHatanya - t.sunset]) {
      expect(d).toBeGreaterThan(2.5 * MIN); expect(d).toBeLessThan(6 * MIN)
    }
    const order: ZmanName[] = ['alotBaalHatanya', 'alot', 'misheyakir12p85', 'misheyakir', 'misheyakir7p65', 'sunriseBaalHatanya', 'sunrise',
      'sofShmaBaalHatanya', 'sofTfillaBaalHatanya', 'chatzot', 'minchaGedolaBaalHatanya', 'minchaKetanaBaalHatanya', 'plagBaalHatanya',
      'sunset', 'sunsetBaalHatanya', 'tzeitBaalHatanya']
    for (let i = 1; i < order.length; i++) expect(t[order[i]!], order[i]).toBeGreaterThan(t[order[i - 1]!])
    expect(t.sofShmaHarari40).toBeGreaterThan(t.sofShmaHarari25)
    expect(t.plagHarari40).toBeGreaterThan(t.plagHarari25)
    expect(t.plagHarari25).toBeGreaterThan(t.plag)
    expect(t.minchaGedolaHillel).toBeGreaterThanOrEqual(t.chatzot + 30 * MIN - 1)
    expect(t.minchaKetanaHillel).toBeLessThan(t.plagHillel)
    expect(t.plagHillel).toBeLessThan(t.sunset)
    expect(Math.abs(t.sofShmaGraFixed - (t.sunrise + t.chatzotFixedLocal) / 2)).toBeLessThan(2)
    expect(Math.abs(t.sofTfillaGraFixed - (t.sunrise + (t.chatzotFixedLocal - t.sunrise) * 2 / 3))).toBeLessThan(2)
    expect(t.sofShmaMga72Fixed).toBeLessThan(t.sofShmaGraFixed)
    expect(t.minchaGedolaFixed - t.chatzotFixedLocal).toBe(30 * MIN)
    expect(t.chatzotFixedLocal).toBeLessThan(t.minchaKetanaFixed)
    expect(t.minchaKetanaFixed).toBeLessThan(t.plagFixed)
    expect(t.plagFixed).toBeLessThan(t.sunset)
    expect(t.tzeit50 - t.sunset).toBeGreaterThanOrEqual(50 * MIN - 1)
    expect(t.sofShmaAsym).toBeLessThan(t.sofTfillaAsym)
    expect(t.sofShmaAsym).toBeLessThan(t.sofShmaGra)
    expect(t.plagAsym).toBeGreaterThan(t.plag)
  }
}

describe('named methods', () => {
  it('are in order at Jerusalem', async () => { useFileAssets(); await check(1) })
  it('are in order at New York', async () => { useFileAssets(); await check(await nearestPlaceId(40.7128, -74.006)) })
})
