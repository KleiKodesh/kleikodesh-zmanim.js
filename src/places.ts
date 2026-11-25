// The place list: loaded lazily from the compact asset files, each at most once.
import type { CivilDate, Coordinates, ZmanName } from './zmanim.js'
import { computeZmanim, HORIZON_ZMANIM, NO_TERRAIN, TERRAIN_BINS, TERRAIN_ZMANIM, ZMAN_NAMES } from './zmanim.js'
import { parseAtmospheres, type AtmosphereTable } from './horizon.js'

export type Lang = 'he' | 'en'

/** Reads one asset file (e.g. 'places.bin') and returns its bytes. */
export type AssetLoader = (file: string) => Promise<ArrayBuffer>

export interface Place {
  id: number
  lat: number
  lng: number
  /** Meters. Sets the air pressure for refraction and the horizon dip of sunriseElevated/sunsetElevated. */
  elevation: number
  tzid: string
  rawOffsetMinutes: number
  /** 12 monthly mean temperatures in C (NaN = unknown), for refraction; attached by getPlace(). */
  monthlyTemperatureC: readonly number[]
  /** 12 monthly mean temperatures AT sunrise in C (NaN = unknown), for sunrise refraction; attached by getPlace(). */
  monthlySunriseTemperatureC: readonly number[]
  /** 12 monthly mean temperatures AT sunset in C (NaN = unknown), for sunset refraction; attached by getPlace(). */
  monthlySunsetTemperatureC: readonly number[]
  /**
   * 12 monthly means of the daily minimum temperature in C, the sunrise fallback; attached by getPlace() only where a
   * sunrise/sunset month is unknown (only then is climate-minmax.bin loaded).
   */
  monthlyMinTemperatureC?: readonly number[]
  /** As monthlyMinTemperatureC, the daily maximum: the sunset fallback. */
  monthlyMaxTemperatureC?: readonly number[]
  /** Terrain horizon for sunriseTerrain/sunsetTerrain; not set by getPlace() (see getTerrainHorizon). */
  terrainHorizon?: ArrayLike<number> | null
}

/** Bytes per record in places.bin: lat int32, lng int32 (degrees x 1e5), elevation int16, tz index uint8. */
export const RECORD_SIZE = 11
const SCALE = 1e5

let baseUrl: string | URL = new URL('../assets/', import.meta.url)
let loader: AssetLoader = async (file) => {
  const response = await fetch(new URL(file, baseUrl))
  if (!response.ok) throw new Error(`kleikodesh-zmanim: cannot load ${file} (${response.status})`)
  return response.arrayBuffer()
}

/** Bumped by configure(): other modules' asset caches (geo.ts) reload after it. */
export let assetGeneration = 0

/** Reads one asset file through the configured loader. */
export const readAsset = (file: string): Promise<ArrayBuffer> => loader(file)

/** Where the asset files are: a base URL for the default fetch loader, or a loader of your own. */
export function configure(options: { baseUrl?: string | URL, loader?: AssetLoader }): void {
  if (options.baseUrl !== undefined) baseUrl = options.baseUrl
  if (options.loader !== undefined) loader = options.loader
  assetGeneration++
  names.clear()
  folded.clear()
  bin = null
  tz = null
  climate = null
  climateMinMax = null
  climateSunEvent = null
  horizon.clear()
  atmospheres = null
  placeCache.clear()
}

// Caches: two name lists, one binary table, one zone table, and a few recent places.
const names = new Map<Lang, Promise<readonly string[]>>()
let bin: Promise<DataView> | null = null
let tz: Promise<{ ids: string[], rawOffsetMinutes: number[] }> | null = null
let climate: Promise<Int8Array> | null = null
let climateMinMax: Promise<Int8Array | null> | null = null
let climateSunEvent: Promise<Int8Array | null> | null = null
const horizon = new Map<number, Promise<Int16Array | null>>()
let atmospheres: Promise<AtmosphereTable> | null = null
const placeCache = new Map<number, Place>()

/** Bytes per record in climate.bin: 12 monthly mean temperatures, int8 C; -128 = unknown. */
export const CLIMATE_RECORD_SIZE = 12
const NO_TEMPERATURE = -128

function climateTable(): Promise<Int8Array> {
  if (!climate) {
    climate = loader('climate.bin').then((buffer) => new Int8Array(buffer))
    climate.catch(() => { climate = null })
  }
  return climate
}

/** Bytes per record in climate-minmax.bin: 12 monthly mean daily minima then 12 maxima, int8 C; -128 = unknown. */
export const CLIMATE_MINMAX_RECORD_SIZE = 24

function climateMinMaxTable(): Promise<Int8Array | null> {
  if (!climateMinMax) {
    // Optional asset: without it the horizon lines fall back to the monthly mean.
    climateMinMax = loader('climate-minmax.bin').then((buffer) => new Int8Array(buffer), () => null)
  }
  return climateMinMax
}

/**
 * Bytes per record in climate-sunevent.bin: 12 monthly mean temperatures at sunrise then 12 at sunset, int8 in
 * half degrees C (value / 2); -128 = unknown.
 */
export const CLIMATE_SUNEVENT_RECORD_SIZE = 24

function climateSunEventTable(): Promise<Int8Array | null> {
  if (!climateSunEvent) {
    // Optional asset: without it the horizon lines fall back to the daily minimum/maximum, then the mean.
    climateSunEvent = loader('climate-sunevent.bin').then((buffer) => new Int8Array(buffer), () => null)
  }
  return climateSunEvent
}

/** Places per horizon chunk file (assets/horizon-NN.bin, NN = id / HORIZON_CHUNK). */
export const HORIZON_CHUNK = 64

/**
 * A place's terrain horizon (TERRAIN_BINS int16 values, hundredths of a degree; see Coordinates.terrainHorizon), or null
 * for a place without one (e.g. added after the horizon data was built). Loads only that place's chunk (about 31 KB).
 */
export async function getTerrainHorizon(id: number): Promise<Int16Array | null> {
  if (!Number.isInteger(id) || id < 1) return null
  const c = Math.floor(id / HORIZON_CHUNK)
  let chunk = horizon.get(c)
  if (!chunk) {
    const file = `horizon-${String(c).padStart(2, '0')}.bin`
    const p = loader(file).then((buffer) => new Int16Array(buffer), () => null)
    horizon.set(c, p)
    chunk = p
  }
  const t = await chunk
  const o = (id % HORIZON_CHUNK) * TERRAIN_BINS
  if (!t || o + TERRAIN_BINS > t.length) return null
  const row = t.subarray(o, o + TERRAIN_BINS)
  return row.every((v) => v === NO_TERRAIN) ? null : row
}

/** A place's 12 monthly mean temperatures (C; NaN where unknown). Loads climate.bin once. */
export async function getMonthlyTemperatures(id: number): Promise<number[]> {
  const t = await climateTable()
  const o = id * CLIMATE_RECORD_SIZE
  if (o + CLIMATE_RECORD_SIZE > t.length) return new Array<number>(12).fill(NaN)
  return Array.from(t.subarray(o, o + CLIMATE_RECORD_SIZE), (v) => (v === NO_TEMPERATURE ? NaN : v))
}

/**
 * A place's 12 monthly means of the daily minimum and of the daily maximum temperature (C; NaN where unknown).
 * Loads climate-minmax.bin once; all NaN when it is missing.
 */
export async function getMonthlyMinMaxTemperatures(id: number): Promise<{ min: number[], max: number[] }> {
  const t = await climateMinMaxTable()
  const o = id * CLIMATE_MINMAX_RECORD_SIZE
  if (!t || o + CLIMATE_MINMAX_RECORD_SIZE > t.length) return { min: new Array<number>(12).fill(NaN), max: new Array<number>(12).fill(NaN) }
  const v = Array.from(t.subarray(o, o + CLIMATE_MINMAX_RECORD_SIZE), (x) => (x === NO_TEMPERATURE ? NaN : x))
  return { min: v.slice(0, 12), max: v.slice(12) }
}

/**
 * A place's 12 monthly mean temperatures at sunrise and at sunset (C, half-degree steps; NaN where unknown).
 * Loads climate-sunevent.bin once; all NaN when it is missing.
 */
export async function getMonthlySunEventTemperatures(id: number): Promise<{ sunrise: number[], sunset: number[] }> {
  const t = await climateSunEventTable()
  const o = id * CLIMATE_SUNEVENT_RECORD_SIZE
  if (!t || o + CLIMATE_SUNEVENT_RECORD_SIZE > t.length) return { sunrise: new Array<number>(12).fill(NaN), sunset: new Array<number>(12).fill(NaN) }
  const v = Array.from(t.subarray(o, o + CLIMATE_SUNEVENT_RECORD_SIZE), (x) => (x === NO_TEMPERATURE ? NaN : x / 2))
  return { sunrise: v.slice(0, 12), sunset: v.slice(12) }
}

/** The model atmospheres for ray-traced horizon refraction (atmosphere.bin, 25 KB), loaded once on first need. */
export function getAtmospheres(): Promise<AtmosphereTable> {
  if (!atmospheres) {
    atmospheres = loader('atmosphere.bin').then(parseAtmospheres)
    atmospheres.catch(() => { atmospheres = null })
  }
  return atmospheres
}

const PLACE_CACHE_SIZE = 16

const text = async (file: string): Promise<string> => new TextDecoder().decode(await loader(file))

/** Every place name in [lang]; the index is the place id (index 0 is empty). Loads only that names file. */
export function listPlaces(lang: Lang): Promise<readonly string[]> {
  let list = names.get(lang)
  if (!list) {
    list = text(`names-${lang}.txt`).then((t) => Object.freeze(t.replace(/\r?\n$/, '').split(/\r?\n/)))
    list.catch(() => names.delete(lang))
    names.set(lang, list)
  }
  return list
}

const fold = (s: string): string => s.normalize('NFD').replace(/[̀-֑ͯ-ׇ]/g, '').toLowerCase()

// Each language's names folded for search, built on the first search in that language only.
const folded = new Map<Lang, Promise<readonly string[]>>()
function foldedNames(lang: Lang): Promise<readonly string[]> {
  let list = folded.get(lang)
  if (!list) {
    list = listPlaces(lang).then((l) => l.map(fold))
    list.catch(() => folded.delete(lang))
    folded.set(lang, list)
  }
  return list
}

/** Places whose [lang] name contains [query] (case, accents and Hebrew points ignored); prefix matches first. */
export async function searchPlaces(query: string, lang: Lang, limit = 50): Promise<Array<{ id: number, name: string }>> {
  const q = fold(query.trim())
  const [list, keys] = await Promise.all([listPlaces(lang), foldedNames(lang)])
  const starts: Array<{ id: number, name: string }> = []
  const contains: Array<{ id: number, name: string }> = []
  for (let id = 1; id < list.length; id++) {
    const at = keys[id]!.indexOf(q)
    if (at === 0) starts.push({ id, name: list[id]! })
    else if (at > 0) contains.push({ id, name: list[id]! })
  }
  return starts.concat(contains).slice(0, limit)
}

/** Number of places (ids are 1..count). Loads places.bin. */
export async function placeCount(): Promise<number> {
  return (await table()).byteLength / RECORD_SIZE - 1
}

function table(): Promise<DataView> {
  if (!bin) {
    bin = loader('places.bin').then((buffer) => new DataView(buffer))
    bin.catch(() => { bin = null })
  }
  return bin
}

function zones(): Promise<{ ids: string[], rawOffsetMinutes: number[] }> {
  if (!tz) {
    tz = text('tz.json').then((t) => JSON.parse(t) as { ids: string[], rawOffsetMinutes: number[] })
    tz.catch(() => { tz = null })
  }
  return tz
}

/** The listed place nearest to a point (squared-degree distance). Reads places.bin only, builds no place objects. */
export async function nearestPlaceId(lat: number, lng: number): Promise<number> {
  const view = await table()
  const count = view.byteLength / RECORD_SIZE - 1
  let best = 1
  let bestDistance = Infinity
  for (let id = 1; id <= count; id++) {
    const o = id * RECORD_SIZE
    const distance = (view.getInt32(o, true) / SCALE - lat) ** 2 + (view.getInt32(o + 4, true) / SCALE - lng) ** 2
    if (distance < bestDistance) { bestDistance = distance; best = id }
  }
  return best
}

/** One place's coordinates and zone. Record 0 is unused, so the record offset is id x RECORD_SIZE. */
export async function getPlace(id: number): Promise<Place> {
  const cached = placeCache.get(id)
  if (cached) return cached
  const [view, zoneTable, temps, sun] = await Promise.all([table(), zones(), getMonthlyTemperatures(id), getMonthlySunEventTemperatures(id)])
  // Fallback chain: temperature at sunrise/sunset -> daily minimum/maximum -> mean; min/max loaded only when needed.
  const minMax = [...sun.sunrise, ...sun.sunset].some(Number.isNaN) ? await getMonthlyMinMaxTemperatures(id) : null
  const offset = id * RECORD_SIZE
  if (!Number.isInteger(id) || id < 1 || offset + RECORD_SIZE > view.byteLength) throw new RangeError(`No place with id ${id}`)
  const zone = view.getUint8(offset + 10)
  const place: Place = Object.freeze({
    id,
    lat: view.getInt32(offset, true) / SCALE,
    lng: view.getInt32(offset + 4, true) / SCALE,
    elevation: view.getInt16(offset + 8, true),
    tzid: zoneTable.ids[zone]!,
    rawOffsetMinutes: zoneTable.rawOffsetMinutes[zone]!,
    monthlyTemperatureC: Object.freeze(temps),
    monthlySunriseTemperatureC: Object.freeze(sun.sunrise),
    monthlySunsetTemperatureC: Object.freeze(sun.sunset),
    ...(minMax ? { monthlyMinTemperatureC: Object.freeze(minMax.min), monthlyMaxTemperatureC: Object.freeze(minMax.max) } : {}),
  })
  if (placeCache.size >= PLACE_CACHE_SIZE) placeCache.delete(placeCache.keys().next().value!)
  placeCache.set(id, place)
  return place
}

/** A JS Date (its local calendar date is used) or a civil date. */
export type DateInput = Date | CivilDate

export function toCivilDate(date: DateInput): CivilDate {
  return date instanceof Date ? { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() } : date
}

/** Only the requested zmanim, printed HH:MM in the place's zone with the library's rounding. */
export async function zmanim(
  place: number | Place,
  date: DateInput,
  which: readonly ZmanName[] = ZMAN_NAMES,
): Promise<Partial<Record<ZmanName, string | null>>> {
  let p: Coordinates = typeof place === 'number' ? await getPlace(place) : place
  // the place's horizon chunk is loaded only when a terrain line is asked for.
  if (p.terrainHorizon === undefined && typeof (p as Place).id === 'number' && which.some((n) => TERRAIN_ZMANIM.has(n))) {
    p = { ...p, terrainHorizon: await getTerrainHorizon((p as Place).id) }
  }
  // the model atmospheres are loaded only when a horizon line is asked for.
  if (p.atmospheres === undefined && which.some((n) => HORIZON_ZMANIM.has(n))) p = { ...p, atmospheres: await getAtmospheres() }
  return computeZmanim(p, toCivilDate(date), which)
}
