// Each place's country and city (assets/geo.bin + countries.json, scripts/build-geo.mjs),
// for pickers that filter by country, then city, then neighbourhood. Loaded on first need,
// once; configure() makes it load again. Country names are not stored: use
// Intl.DisplayNames with the ISO code, in the UI language.
import { assetGeneration, listPlaces, readAsset, type Lang } from './places.js'

/** Bytes per place id in geo.bin: uint16 city place id, uint8 country index. */
export const GEO_RECORD_SIZE = 3

export interface PlaceGeo {
  /** ISO 3166 codes, sorted. */
  countries: readonly string[]
  /** Number of places (ids are 1..count). */
  count: number
  /** The place's country (ISO code). */
  countryOf: (id: number) => string
  /** The place id of the city the place belongs to; the place itself when it is a city. */
  cityOf: (id: number) => number
}

let cached: { generation: number, geo: Promise<PlaceGeo> } | null = null

/** Every place's country and city. Loads geo.bin and countries.json (about 6 KB) once. */
export function listPlaceGeo(): Promise<PlaceGeo> {
  if (cached?.generation === assetGeneration) return cached.geo
  const geo = Promise.all([readAsset('geo.bin'), readAsset('countries.json')]).then(([bin, json]): PlaceGeo => {
    const view = new DataView(bin)
    const countries = Object.freeze(JSON.parse(new TextDecoder().decode(json)) as string[])
    const count = view.byteLength / GEO_RECORD_SIZE - 1
    const valid = (id: number) => Number.isInteger(id) && id >= 1 && id <= count
    return Object.freeze({
      countries,
      count,
      countryOf: (id: number) => (valid(id) ? countries[view.getUint8(id * GEO_RECORD_SIZE + 2)] ?? '' : ''),
      cityOf: (id: number) => (valid(id) ? view.getUint16(id * GEO_RECORD_SIZE, true) : 0),
    })
  })
  const entry = { generation: assetGeneration, geo }
  geo.catch(() => { if (cached === entry) cached = null })
  cached = entry
  return geo
}

/** A name with what it stands for: a country (ISO code) or a place (id). */
export interface PlaceOption<K> { key: K, name: string }

/** Every place grouped country > city > neighbourhood, names in one language, each list sorted by name. */
export interface PlaceTree {
  /** Countries that have places, named in [lang] (Intl.DisplayNames), sorted. */
  countries: readonly PlaceOption<string>[]
  /** A country's cities, sorted; sorted on first ask only. */
  citiesOf: (country: string) => readonly PlaceOption<number>[]
  /** The city first, then its neighbourhoods sorted; just the city when it has none. */
  placesOf: (city: number) => readonly PlaceOption<number>[]
  countryOf: (id: number) => string
  cityOf: (id: number) => number
}

const trees = new Map<Lang, { generation: number, tree: Promise<PlaceTree> }>()

/** "Jaffa (Tel Aviv)" lists as "Jaffa" under Tel Aviv. */
const withoutParent = (name: string): string => name.replace(/\s*\([^()]*\)\s*$/, '')

/**
 * The three-step place picker's data in [lang]. Loads geo.bin, countries.json and that names file once.
 * Only the country list is sorted up front; each country's cities and each city's neighbourhoods are
 * grouped by id in one pass and sorted the first time they are asked for.
 */
export function placeTree(lang: Lang): Promise<PlaceTree> {
  const hit = trees.get(lang)
  if (hit?.generation === assetGeneration) return hit.tree
  const tree = Promise.all([listPlaceGeo(), listPlaces(lang)]).then(([geo, names]): PlaceTree => {
    const collator = new Intl.Collator(lang)
    const byName = <K>(a: PlaceOption<K>, b: PlaceOption<K>): number => collator.compare(a.name, b.name)
    const cityIds = new Map<string, number[]>()
    const memberIds = new Map<number, number[]>()
    for (let id = 1; id <= geo.count; id++) {
      const city = geo.cityOf(id)
      if (city === id) {
        const country = geo.countryOf(id)
        const list = cityIds.get(country)
        if (list) list.push(id)
        else cityIds.set(country, [id])
      } else {
        const list = memberIds.get(city)
        if (list) list.push(id)
        else memberIds.set(city, [id])
      }
    }
    const countryName = new Intl.DisplayNames([lang], { type: 'region' })
    const countries = Object.freeze([...cityIds.keys()].map((code) => ({ key: code, name: countryName.of(code) ?? code })).sort(byName))
    const sortedCities = new Map<string, readonly PlaceOption<number>[]>()
    const sortedPlaces = new Map<number, readonly PlaceOption<number>[]>()
    const none: readonly PlaceOption<number>[] = Object.freeze([])
    return Object.freeze({
      countries,
      citiesOf: (country: string) => {
        let list = sortedCities.get(country)
        if (!list) {
          const ids = cityIds.get(country)
          if (!ids) return none
          list = Object.freeze(ids.map((id) => ({ key: id, name: names[id] ?? '' })).sort(byName))
          sortedCities.set(country, list)
        }
        return list
      },
      placesOf: (city: number) => {
        let list = sortedPlaces.get(city)
        if (!list) {
          const members = (memberIds.get(city) ?? []).map((id) => ({ key: id, name: withoutParent(names[id] ?? '') })).sort(byName)
          list = Object.freeze([{ key: city, name: names[city] ?? '' }, ...members])
          sortedPlaces.set(city, list)
        }
        return list
      },
      countryOf: geo.countryOf,
      cityOf: geo.cityOf,
    })
  })
  const entry = { generation: assetGeneration, tree }
  tree.catch(() => { if (trees.get(lang) === entry) trees.delete(lang) })
  trees.set(lang, entry)
  return tree
}
