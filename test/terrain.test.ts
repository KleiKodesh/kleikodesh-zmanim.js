import { describe, expect, it } from 'vitest'
import { configure, epochMs, getAtmospheres, getPlace, getTerrainHorizon, NO_TERRAIN, TERRAIN_BINS, terrainAltitude, zmanInstants, zmanim } from '../src/index'
import { useFileAssets } from './helpers'

const JERUSALEM = 1, TEL_AVIV = 45, EILAT = 97, SAFED = 98, BEIT_SHEMESH = 188
const minutes = (a: bigint | null | undefined, b: bigint | null | undefined): number => (epochMs(a!) - epochMs(b!)) / 60000

async function lines(id: number, date: { year: number, month: number, day: number }) {
  const place = { ...(await getPlace(id)), terrainHorizon: await getTerrainHorizon(id) }
  return zmanInstants(place, date, ['sunrise', 'sunriseTerrain', 'sunset', 'sunsetTerrain'])
}

describe('terrain sunrise/sunset', () => {
  const summer = { year: 2026, month: 6, day: 21 }
  const winter = { year: 2026, month: 12, day: 21 }

  it('Tel Aviv faces the sea: terrain sunset is within about a minute of sea-level sunset', async () => {
    useFileAssets()
    for (const d of [summer, winter]) {
      const t = await lines(TEL_AVIV, d)
      expect(Math.abs(minutes(t.sunsetTerrain, t.sunset))).toBeLessThan(1.5)
    }
  })

  it('Beit Shemesh (valley) sees the sun rise later than at sea level', async () => {
    useFileAssets()
    for (const id of [BEIT_SHEMESH, EILAT]) {
      for (const d of [summer, winter]) {
        const t = await lines(id, d)
        expect(minutes(t.sunriseTerrain, t.sunrise), `id ${id}`).toBeGreaterThan(2)
      }
    }
  })

  it('every terrain line stays within 40 minutes of the sea-level one', async () => {
    useFileAssets()
    for (const id of [JERUSALEM, TEL_AVIV, EILAT, SAFED, BEIT_SHEMESH]) {
      const t = await lines(id, winter)
      expect(Math.abs(minutes(t.sunriseTerrain, t.sunrise))).toBeLessThan(40)
      expect(Math.abs(minutes(t.sunsetTerrain, t.sunset))).toBeLessThan(40)
    }
  })

  it('null without terrain data (a place newer than horizon.bin, or a bare place)', async () => {
    useFileAssets()
    expect(await getTerrainHorizon(99999)).toBeNull()
    const place = await getPlace(JERUSALEM)
    const t = zmanInstants({ ...place, terrainHorizon: null }, summer, ['sunriseTerrain', 'sunsetTerrain'])
    expect(t).toEqual({ sunriseTerrain: null, sunsetTerrain: null })
    const empty = new Int16Array(TERRAIN_BINS).fill(NO_TERRAIN)
    expect(terrainAltitude(empty, 90)).toBeNaN()
    expect(terrainAltitude(new Int16Array(TERRAIN_BINS), 180)).toBeNaN()
  })

  it('only the own horizon chunk of the place loads, only for a terrain line, once', async () => {
    const reads = useFileAssets()
    await zmanim(JERUSALEM, summer, ['sunrise', 'sunset'])
    expect(reads.filter((f) => f.startsWith('horizon'))).toEqual([])
    const out = await zmanim(JERUSALEM, summer, ['sunriseTerrain', 'sunsetTerrain'])
    await zmanim(SAFED, winter, ['sunsetTerrain']) // id 98 is in chunk 01 (98 / 64), Jerusalem in 00
    expect(reads.filter((f) => f.startsWith('horizon'))).toEqual(['horizon-00.bin', 'horizon-01.bin'])
    await zmanim(JERUSALEM, winter, ['sunriseTerrain'])
    expect(reads.filter((f) => f.startsWith('horizon')).length).toBe(2)
    expect(out.sunriseTerrain).toMatch(/^\d\d:\d\d$/)
  })

  // Keller & Hall, Computers & Geosciences 161 (2022) 105044: terrain lines through a standard column at the place's
  // event-hour temperature; sunrise 15 s earlier after a night over 13 h when the horizon is within 0.01 deg of level.
  const flat = (centi: number): Int16Array => new Int16Array(TERRAIN_BINS).fill(centi)
  async function terrainRise(id: number, date: { year: number, month: number, day: number }, horizon: Int16Array, atmospheres?: null) {
    const place = { ...(await getPlace(id)), terrainHorizon: horizon, atmospheres: atmospheres === null ? null : await getAtmospheres() }
    return epochMs(zmanInstants(place, date, ['sunriseTerrain']).sunriseTerrain!)
  }

  it('winter inversion: 15 s earlier over a level horizon after a long night, in Israel only', async () => {
    const jan = { year: 2026, month: 1, day: 15 }, jul = { year: 2026, month: 7, day: 15 }
    // A horizon 0.02 deg higher rises a few seconds later; in January the level one also gets the 15 s.
    const step = async (id: number, d: typeof jan) => (await terrainRise(id, d, flat(2)) - await terrainRise(id, d, flat(0))) / 1000
    expect(await step(JERUSALEM, jan) - await step(JERUSALEM, jul)).toBeCloseTo(15, -0.5)
    const LONDON = 109 // long winter nights too, but not where it was observed
    expect(Math.abs(await step(LONDON, jan) - await step(LONDON, jul))).toBeLessThan(3)
  })

  it('winter inversion can be switched off from code, and is on by default', async () => {
    const jan = { year: 2026, month: 1, day: 15 }, jul = { year: 2026, month: 7, day: 15 }
    const step = async (d: typeof jan) => (await terrainRise(JERUSALEM, d, flat(2)) - await terrainRise(JERUSALEM, d, flat(0))) / 1000
    try {
      configure({ empiricalInversionCorrection: false })
      useFileAssets()
      expect(Math.abs(await step(jan) - await step(jul))).toBeLessThan(3)
    } finally {
      configure({ empiricalInversionCorrection: true })
      useFileAssets()
    }
    expect(await step(jan) - await step(jul)).toBeCloseTo(15, -0.5)
  })

  it('terrain lines in Israel trace the standard column, not the coastal soundings', async () => {
    const jul = { year: 2026, month: 7, day: 15 }
    const horizon = (await getTerrainHorizon(JERUSALEM))!
    expect(Math.abs(await terrainRise(JERUSALEM, jul, horizon) - await terrainRise(JERUSALEM, jul, horizon, null))).toBeLessThan(1500)
  })
})
