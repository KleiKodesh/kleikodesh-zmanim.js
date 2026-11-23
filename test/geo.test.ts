import { statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GEO_RECORD_SIZE, listPlaceGeo, listPlaces } from '../src/index'
import { useFileAssets } from './helpers'

describe('place geo (country, city)', () => {
  it('loads only geo.bin and countries.json', async () => {
    const reads = useFileAssets()
    await listPlaceGeo()
    expect(reads.sort()).toEqual(['countries.json', 'geo.bin'])
  })

  it('every place has a country and a city that is its own city', async () => {
    useFileAssets()
    const geo = await listPlaceGeo()
    const names = await listPlaces('en')
    expect(geo.count).toBe(names.length - 1)
    for (let id = 1; id <= geo.count; id++) {
      expect(geo.countries).toContain(geo.countryOf(id))
      const city = geo.cityOf(id)
      expect(city).toBeGreaterThan(0)
      expect(geo.cityOf(city)).toBe(city)
      expect(geo.countryOf(city)).toBe(geo.countryOf(id))
    }
  })

  it('neighbourhoods go under their city', async () => {
    useFileAssets()
    const geo = await listPlaceGeo()
    const names = await listPlaces('en')
    const city = (name: string) => names[geo.cityOf(names.indexOf(name))]
    expect(city('Jerusalem')).toBe('Jerusalem')
    expect(city('Jaffa (Tel Aviv)')).toBe('Tel Aviv-Yafo')
    expect(city('Upper West Side (Manhattan)')).toBe('New York')
    expect(city('Thornhill (Toronto)')).toBe('Toronto, Canada')
    expect(geo.countryOf(1)).toBe('IL')
    expect(geo.countryOf(0)).toBe('')
  })

  it('geo.bin is one 3-byte record per id (plus unused record 0)', () => {
    expect(statSync(new URL('../assets/geo.bin', import.meta.url)).size).toBe(1882 * GEO_RECORD_SIZE)
  })
})
