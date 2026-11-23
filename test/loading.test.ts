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
    expect(en.length).toBe(565)
    await listPlaces('en')
    expect(reads).toEqual(['names-en.txt'])
  })

  it('search uses the names file only', async () => {
    const reads = useFileAssets()
    const hits = await searchPlaces('jerus', 'en')
    expect(hits[0]).toEqual({ id: 1, name: 'Jerusalem' })
    expect(reads).toEqual(['names-en.txt'])
  })

  it('getPlace and zmanim load places.bin and tz.json once, and no names', async () => {
    const reads = useFileAssets()
    const place = await getPlace(1)
    expect(place).toMatchObject({ lat: 31.76904, lng: 35.21633, elevation: 786, tzid: 'Asia/Jerusalem' })
    for (let id = 1; id <= 564; id++) await getPlace(id)
    await zmanim(42, new Date(2026, 0, 1), ['sunrise'])
    expect(reads.sort()).toEqual(['places.bin', 'tz.json'])
    await expect(getPlace(565)).rejects.toThrow(RangeError)
    await expect(getPlace(0)).rejects.toThrow(RangeError)
  })
})

describe('asset sizes', () => {
  const size = (f: string): number => statSync(new URL(`../assets/${f}`, import.meta.url)).size
  it('places.bin is one 11-byte record per id (plus unused record 0)', () => {
    expect(size('places.bin')).toBe(565 * RECORD_SIZE)
  })
  it('all assets together stay small', () => {
    const total = ['names-he.txt', 'names-en.txt', 'places.bin', 'tz.json'].reduce((s, f) => s + size(f), 0)
    expect(total).toBeLessThan(32 * 1024)
  })
})
