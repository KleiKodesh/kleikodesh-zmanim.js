// Each place's country and city (assets/geo.bin + countries.json, scripts/build-geo.mjs),
// for pickers that filter by country, then city, then neighbourhood. Loaded on first need,
// once; configure() makes it load again. Country names are not stored: use
// Intl.DisplayNames with the ISO code, in the UI language.
import { assetGeneration, readAsset } from './places.js'

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
