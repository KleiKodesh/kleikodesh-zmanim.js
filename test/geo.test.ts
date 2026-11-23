import { statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GEO_RECORD_SIZE, getPlace, listPlaceGeo, listPlaces, nearestPlaceId, placeTree } from '../src/index'
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

  it('placeTree groups and sorts lazily, loading geo and one names file', async () => {
    const reads = useFileAssets()
    const tree = await placeTree('en')
    expect(reads.sort()).toEqual(['countries.json', 'geo.bin', 'names-en.txt'])
    expect(await placeTree('en')).toBe(tree)
    const names = tree.countries.map((c) => c.name)
    expect(names).toEqual([...names].sort(new Intl.Collator('en').compare))
    const il = tree.citiesOf('IL')
    expect(il.map((c) => c.name)).toContain('Jerusalem')
    expect(tree.citiesOf('IL')).toBe(il)
    const cityNames = il.map((c) => c.name)
    expect(cityNames).toEqual([...cityNames].sort(new Intl.Collator('en').compare))
    const telAviv = il.find((c) => c.name === 'Tel Aviv-Yafo')!.key
    const places = tree.placesOf(telAviv)
    expect(places[0]).toEqual({ key: telAviv, name: 'Tel Aviv-Yafo' })
    expect(places.map((p) => p.name)).toContain('Jaffa')
    expect(tree.placesOf(1)[0]!.key).toBe(1)
    expect(tree.citiesOf('XX')).toEqual([])
  })

  it('nearestPlaceId finds the listed place nearest a point, reading places.bin only', async () => {
    const reads = useFileAssets()
    expect(await nearestPlaceId(31.76904, 35.21633)).toBe(1)
    expect(reads).toEqual(['places.bin'])
    const ny = await nearestPlaceId(40.7128, -74.006)
    const p = await getPlace(ny)
    expect(Math.abs(p.lat - 40.7128) + Math.abs(p.lng + 74.006)).toBeLessThan(0.5)
  })
})
