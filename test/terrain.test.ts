import { describe, expect, it } from 'vitest'
import { epochMs, getPlace, getTerrainHorizon, NO_TERRAIN, TERRAIN_BINS, terrainAltitude, zmanInstants, zmanim } from '../src/index'
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
})
