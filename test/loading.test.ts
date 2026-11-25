import { statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getPlace, listPlaces, RECORD_SIZE, searchPlaces, zmanim } from '../src/index'
import { useFileAssets } from './helpers'

describe('lazy loading', () => {
  it('importing loads nothing; listPlaces loads only its names file', async () => {
    const reads = useFileAssets()
    expect(reads).toEqual([])
    const en = await listPlaces('en')
    expect(en[1]).toBe('Jerusalem')
    expect(en.length).toBe(1939)
    await listPlaces('en')
    expect(reads).toEqual(['names-en.txt'])
  })

  it('search uses the names file only', async () => {
    const reads = useFileAssets()
    const hits = await searchPlaces('jerus', 'en')
    expect(hits[0]).toEqual({ id: 1, name: 'Jerusalem' })
    expect(reads).toEqual(['names-en.txt'])
  })

  it('getPlace and zmanim load places.bin and tz.json once (sunrise adds climate.bin), and no names', async () => {
    const reads = useFileAssets()
    const place = await getPlace(1)
    expect(place).toMatchObject({ lat: 31.76904, lng: 35.21633, elevation: 786, tzid: 'Asia/Jerusalem' })
    for (let id = 1; id <= 1938; id++) await getPlace(id)
    await zmanim(42, new Date(2026, 0, 1), ['sunrise'])
    // sunrise needs the refraction temperature and model atmospheres: climate.bin and atmosphere.bin
    // every place has its sunrise/sunset temperatures, so the min/max fallback is never loaded
    expect(reads.sort()).toEqual(['atmosphere.bin', 'climate-sunevent.bin', 'climate.bin', 'places.bin', 'tz.json'])
    await expect(getPlace(1939)).rejects.toThrow(RangeError)
    await expect(getPlace(0)).rejects.toThrow(RangeError)
  })
})

describe('asset sizes', () => {
  const size = (f: string): number => statSync(new URL(`../assets/${f}`, import.meta.url)).size
  it('places.bin is one 11-byte record per id (plus unused record 0)', () => {
    expect(size('places.bin')).toBe(1939 * RECORD_SIZE)
  })
  it('climate.bin is 12 bytes per id (plus unused record 0)', () => {
    expect(size('climate.bin')).toBe(1939 * 12)
    expect(size('climate-minmax.bin')).toBe(1939 * 24)
    expect(size('climate-sunevent.bin')).toBe(1939 * 24)
  })
  it('all assets together stay small', () => {
    const total = ['names-he.txt', 'names-en.txt', 'places.bin', 'tz.json', 'climate.bin'].reduce((s, f) => s + size(f), 0)
    expect(total).toBeLessThan(120 * 1024) // 1938 places: about 92 KB
  })
})
