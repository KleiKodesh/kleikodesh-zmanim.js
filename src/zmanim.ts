// The day's zmanim. Sun positions come from src/spa.ts (NREL SPA, Reda & Andreas 2008, appendix A.2 rise/
// transit/set); sunrise/sunset refraction from src/refraction.ts. The zman definitions are the standard
// halachic ones (temporal hours of a GRA or MGA day, degree depressions); see README.
import { horizonRefractionArcmin, standardPressure, standardTemperature, temperatureOn } from './refraction.js'
import { spaDay, spaEvent, zenithToH0, type SpaDay } from './spa.js'

/** Every zman the library computes, in the order of the day. Each is computed only when requested. */
export const ZMAN_NAMES = [
  'chatzotNight', 'alot90', 'alot', 'misheyakir', 'sunriseElevated', 'sunrise',
  'sofShmaMga', 'sofShmaGra', 'sofTfillaMga', 'sofTfillaGra',
  'chatzot', 'minchaGedola', 'minchaKetana', 'plag', 'plagMga', 'sunset', 'sunsetElevated', 'tzeitGeonim', 'tzeit',
] as const

export type ZmanName = typeof ZMAN_NAMES[number]
export type Rounding = 'up' | 'down' | 'nearest'

/**
 * How each printed minute is rounded, the stringent way: a zman that starts something rounds UP, a deadline
 * rounds DOWN, chatzot (end of morning and start of afternoon) to the nearest minute.
 */
export const ROUNDING: Readonly<Record<ZmanName, Rounding>> = {
  chatzotNight: 'up', alot90: 'up', alot: 'up', misheyakir: 'up', sunriseElevated: 'up', sunrise: 'up',
  sofShmaGra: 'down', sofShmaMga: 'down', sofTfillaGra: 'down', sofTfillaMga: 'down',
  chatzot: 'nearest', minchaGedola: 'up', minchaKetana: 'up', plag: 'up', plagMga: 'up',
  sunset: 'down', sunsetElevated: 'down', tzeitGeonim: 'up', tzeit: 'up',
}

/** Zmanim that depend on the sunrise/sunset horizon (and so on refraction / climate data). */
export const HORIZON_ZMANIM: ReadonlySet<ZmanName> = new Set<ZmanName>(['sunrise', 'sunset', 'sunriseElevated', 'sunsetElevated',
  'sofShmaMga', 'sofShmaGra', 'sofTfillaMga', 'sofTfillaGra', 'minchaGedola', 'minchaKetana', 'plag', 'plagMga'])

/** A civil date; month 1-12. */
export interface CivilDate { year: number, month: number, day: number }

/** What the calculation needs of a place. */
export interface Coordinates {
  lat: number
  lng: number
  tzid: string
  /** Standard (raw) UTC offset of the zone in minutes; only used for zones across the antimeridian. */
  rawOffsetMinutes?: number
  /** Meters; sets the air pressure for refraction and the horizon dip of sunriseElevated/sunsetElevated. Default 0. */
  elevation?: number
  /** 12 monthly mean air temperatures in C (NaN = unknown); default: standard atmosphere at [elevation]. */
  monthlyTemperatureC?: readonly number[]
}

/** The geometric horizon. */
export const GEOMETRIC_ZENITH = 90
/** Solar semidiameter used for sunrise/sunset, degrees (16'). */
const SOLAR_RADIUS = 16 / 60
/** Mean Earth radius, meters. */
const EARTH_RADIUS = 6_371_000

function temperatureAt(place: Coordinates, date: CivilDate): number {
  const t = place.monthlyTemperatureC ? temperatureOn(place.monthlyTemperatureC, date.month, date.day) : NaN
  return Number.isNaN(t) ? standardTemperature(place.elevation ?? 0) : t
}

/** Geometric dip of the sea horizon seen from [elevation] meters, degrees: arccos(R / (R + h)). None below sea level. */
export function horizonDip(elevation: number): number {
  return elevation > 0 ? Math.acos(EARTH_RADIUS / (EARTH_RADIUS + elevation)) * 180 / Math.PI : 0
}

/**
 * Zenith of the sun's centre at sunrise/sunset for [place] on [date]: 90 + radius + dip + refraction at the
 * apparent horizon, with pressure from the elevation and temperature from the monthly means (refraction.ts).
 * [fromHeight] false: the sea-level horizon (no dip); true: the horizon seen from the place's own elevation.
 */
export function horizonZenith(place: Coordinates, date: CivilDate, fromHeight = false): number {
  const elevation = place.elevation ?? 0
  const dip = fromHeight ? horizonDip(elevation) : 0
  const r = horizonRefractionArcmin(standardPressure(elevation), temperatureAt(place, date), -dip)
  return GEOMETRIC_ZENITH + SOLAR_RADIUS + dip + r / 60
}

const ALOT = GEOMETRIC_ZENITH + 16.1
const ALOT_90 = GEOMETRIC_ZENITH + 19.8
const MISHEYAKIR = GEOMETRIC_ZENITH + 11.5
const TZEIT = GEOMETRIC_ZENITH + 8.5
const TZEIT_GEONIM = GEOMETRIC_ZENITH + 3.7
const MINUTE_MS = 60_000
const DAY_MS = 86_400_000
/** SPA A.2 correction step repeats (the paper does 1; 3 converges well under a second). */
const ITERATIONS = 3

export function addDays(d: CivilDate, days: number): CivilDate {
  const t = new Date(0)
  t.setUTCFullYear(d.year, d.month - 1, d.day + days)
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() }
}

const utcMidnight = (d: CivilDate): number => new Date(0).setUTCFullYear(d.year, d.month - 1, d.day)

// Per-UT-date SPA values (independent of place); a few recent dates are kept.
const spaDays = new Map<number, SpaDay>()
function spaDayAt(midnightMs: number): SpaDay {
  let d = spaDays.get(midnightMs)
  if (!d) {
    const t = new Date(midnightMs)
    d = spaDay(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
    if (spaDays.size >= 16) spaDays.delete(spaDays.keys().next().value!)
    spaDays.set(midnightMs, d)
  }
  return d
}

/**
 * Epoch ms of a sun event (kind -1 rise, 0 transit, +1 set, the sun's centre at [zenith]) on the local mean solar
 * day that starts at [lmtMidnight] (UTC ms of that date) at [lat]/[lng]; NaN where the sun never reaches [zenith].
 * SPA gives the event of a UT date; the UT date is moved until the event falls in the local mean day.
 */
export function sunEventMs(lat: number, lng: number, lmtMidnight: number, zenith: number, kind: -1 | 0 | 1): number {
  const offset = lng * 240_000 // local mean time - UT
  let ut = lmtMidnight
  for (let tries = 0; tries < 3; tries++) {
    const m = spaEvent(spaDayAt(ut), lat, lng, kind === 0 ? 0 : zenithToH0(zenith), kind, { iterations: ITERATIONS })
    if (Number.isNaN(m)) return NaN
    const ms = ut + m * DAY_MS
    const local = ms + offset
    if (local < lmtMidnight) ut += DAY_MS
    else if (local >= lmtMidnight + DAY_MS) ut -= DAY_MS
    else return ms
  }
  return NaN
}

/** One civil date at one place; each value is computed on first use only. */
class Day {
  private readonly lmtMidnight: number
  private readonly cache = new Map<string, number>()

  constructor(private readonly place: Coordinates, private readonly date: CivilDate) {
    // Zones across the antimeridian (local mean time 20+ hours off the zone) roll the date.
    let d = date
    if (place.rawOffsetMinutes !== undefined) {
      const hoursOff = (place.lng * 4 - place.rawOffsetMinutes) / 60
      if (hoursOff >= 20) d = addDays(date, 1)
      else if (hoursOff <= -20) d = addDays(date, -1)
    }
    this.lmtMidnight = utcMidnight(d)
  }

  private memo(key: string, compute: () => number): number {
    let v = this.cache.get(key)
    if (v === undefined) {
      v = compute()
      this.cache.set(key, v)
    }
    return v
  }

  private event(zenith: number, kind: -1 | 0 | 1): number {
    return this.memo(`${kind}:${zenith}`, () => sunEventMs(this.place.lat, this.place.lng, this.lmtMidnight, zenith, kind))
  }

  private horizon(fromHeight: boolean): number {
    return this.memo(fromHeight ? 'hh' : 'h', () => horizonZenith(this.place, this.date, fromHeight))
  }

  rise(zenith: number): number { return this.event(zenith, -1) }
  set(zenith: number): number { return this.event(zenith, 1) }
  sunrise(fromHeight = false): number { return this.rise(this.horizon(fromHeight)) }
  sunset(fromHeight = false): number { return this.set(this.horizon(fromHeight)) }
  get chatzot(): number { return this.event(0, 0) }

  /** [hours] temporal hours (a twelfth of [start]..[end]) counted from [start]. */
  static shaahBased(start: number, end: number, hours: number): number {
    return start + (end - start) / 12 * hours
  }

  /** Day from sea-level sunrise to sea-level sunset (GRA). */
  gra(hours: number): number {
    return Day.shaahBased(this.sunrise(), this.sunset(), hours)
  }

  /** Day from 72 minutes before sea-level sunrise to 72 minutes after sea-level sunset (MGA). */
  mga(hours: number): number {
    return Day.shaahBased(this.sunrise() - 72 * MINUTE_MS, this.sunset() + 72 * MINUTE_MS, hours)
  }
}

const toNs = (ms: number): bigint | null => (Number.isNaN(ms) ? null : BigInt(Math.floor(ms)) * 1_000_000n)

/** The instant (epoch nanoseconds, millisecond precision) of each requested zman; null where the sun never gets there. */
export function zmanInstants(place: Coordinates, date: CivilDate, which: readonly ZmanName[] = ZMAN_NAMES): Partial<Record<ZmanName, bigint | null>> {
  const today = new Day(place, date)
  const out: Partial<Record<ZmanName, bigint | null>> = {}
  for (const name of which) {
    let ms: number
    switch (name) {
      // The midnight that opens this day: halfway between yesterday's and today's chatzot.
      case 'chatzotNight': ms = (new Day(place, addDays(date, -1)).chatzot + today.chatzot) / 2; break
      case 'alot90': ms = today.rise(ALOT_90); break
      case 'alot': ms = today.rise(ALOT); break
      case 'misheyakir': ms = today.rise(MISHEYAKIR); break
      case 'sunriseElevated': ms = today.sunrise(true); break
      case 'sunrise': ms = today.sunrise(); break
      case 'sofShmaGra': ms = today.gra(3); break
      case 'sofShmaMga': ms = today.mga(3); break
      case 'sofTfillaGra': ms = today.gra(4); break
      case 'sofTfillaMga': ms = today.mga(4); break
      case 'chatzot': ms = today.chatzot; break
      case 'minchaGedola': ms = today.gra(6.5); break
      case 'minchaKetana': ms = today.gra(9.5); break
      case 'plag': ms = today.gra(10.75); break
      case 'plagMga': ms = today.mga(10.75); break
      case 'sunset': ms = today.sunset(); break
      case 'sunsetElevated': ms = today.sunset(true); break
      case 'tzeitGeonim': ms = today.set(TZEIT_GEONIM); break
      case 'tzeit': ms = today.set(TZEIT); break
      default: throw new Error(`Unknown zman '${String(name)}'`)
    }
    out[name] = toNs(ms)
  }
  return out
}

const formatters = new Map<string, Intl.DateTimeFormat>()

/** HH:MM (hours 01-24) in [timeZone]. One formatter per zone, so bounded by the zone table. */
function clock(ms: number, timeZone: string): string {
  let format = formatters.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat('he', { hour: '2-digit', minute: '2-digit', hourCycle: 'h24', timeZone })
    formatters.set(timeZone, format)
  }
  return format.formatToParts(ms).map((part) => (part.type === 'dayPeriod' ? '' : part.value.trim())).join('')
}

/** Epoch milliseconds printed as HH:MM in [timeZone], rounded to the minute as [rounding] says. */
export function formatTime(epochMs: number, rounding: Rounding, timeZone: string): string {
  const minutes = epochMs / MINUTE_MS
  const rounded = rounding === 'up' ? Math.ceil(minutes) : rounding === 'down' ? Math.floor(minutes) : Math.round(minutes)
  return clock(rounded * MINUTE_MS, timeZone)
}

/** Epoch milliseconds of an instant (floored). */
export function epochMs(ns: bigint): number {
  const q = ns / 1_000_000n
  return Number(ns < 0n && q * 1_000_000n !== ns ? q - 1n : q)
}

/** Synchronous core: the requested zmanim printed HH:MM (null where the sun never gets there). */
export function computeZmanim(place: Coordinates, date: CivilDate, which: readonly ZmanName[] = ZMAN_NAMES): Partial<Record<ZmanName, string | null>> {
  const instants = zmanInstants(place, date, which)
  const out: Partial<Record<ZmanName, string | null>> = {}
  for (const name of which) {
    const ns = instants[name]
    out[name] = ns == null ? null : formatTime(epochMs(ns), ROUNDING[name], place.tzid)
  }
  return out
}
