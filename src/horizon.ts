// Which model atmosphere a place gets, and its ray-traced horizon refraction (src/atmosphere.ts).
//
// - Israel and its neighbourhood: the monthly mean radiosonde profiles of Bet Dagan (NOAA IGRA v2, station
//   ISM00040179, 1995-2024; scripts/build-atmosphere.mjs): the 00 UTC (night) profile for sunrise, the 12 UTC
//   (afternoon) profile for sunset, blended between neighbouring months by the day of the month.
// - Elsewhere: the AFGL standard profiles (Anderson et al. 1986, AFGL-TR-86-0110): tropical within 23.5 deg of the
//   equator, midlatitude summer/winter to 52 deg, subarctic summer/winter beyond, blended over the year by season.
// - Without the profile table (bare coordinates): the U.S. Standard Atmosphere 1976.
// The profile is moved to the place's own climate: the anomaly T_place - T_profile at the observer's height is
// applied at the observer and tapered off over the boundary layer above (atmosphere.ts); below the observer, Bet Dagan
// (a coastal-plain profile) keeps its own air under a 200 m surface layer over the observer's terrain, so the distant
// low horizon and the grazing ray's tangent point see the plain's air; the generic profiles take the anomaly in full.
// T_place is the monthly mean 2 m temperature AT sunrise for sunrise and AT sunset for sunset (else the mean daily minimum / maximum), measured against
// the profile actually traced (Bet Dagan 00 / 12 UTC, or the daily-mean AFGL profile) at the observer's height, so the
// surface air is that of the event's hour while the air aloft (where the diurnal cycle is small) stays the profile's.
// Bet Dagan 00 UTC (02-03 local) is 2.5-4.8 h before sunrise, 12 UTC (14-15 local) 2.5-5 h before sunset. The record
// also has 06/18 UTC launches, but few complete ones (about 100 a month at 06 UTC, 0-100 at 18 UTC, 1995-2010), too
// uneven for event-hour profiles. Where unknown, the monthly mean against the profile's daily mean. Deep-angle lines
// do not use any of this (they are geometric).
// Terrain lines (sunrise/sunset over the real horizon) in the Bet Dagan region trace the U.S. Standard Atmosphere 1976
// moved to the place's temperature at the event's hour instead (HorizonAir.standardColumn). C. Keller & J. K. Hall,
// Computers & Geosciences 161 (2022) 105044 (https://doi.org/10.1016/j.cageo.2022.105044), compared years of observed
// sunrises over the terrain in Jerusalem (Armon Hanatziv, Neve Yaakov) and Bnei Brak with such a column at the place's
// minimum temperature: about 15 s all year, the only lean an earlier winter sunrise (see zmanim.ts). The Bet Dagan
// coastal soundings used unchanged at the Jerusalem site did worst in their test (32 s mean absolute difference in
// winter, against 12 s for the same soundings made to follow the terrain): near the ground the air follows the terrain.
import { Atmosphere, levelAt, SURFACE_LAYER, usStandard1976, type Level } from './atmosphere.js'

/** Parsed assets/atmosphere.bin: AFGL t, ms, mw, ss, sw, then Bet Dagan month 1..12 x {00, 12 UTC}. */
export type AtmosphereTable = readonly (readonly Level[])[]

export function parseAtmospheres(buffer: ArrayBuffer): AtmosphereTable {
  const v = new DataView(buffer)
  const count = v.getUint16(0, true)
  const out: Level[][] = []
  let o = 2
  for (let i = 0; i < count; i++) {
    const n = v.getUint16(o, true); o += 2
    const levels: Level[] = []
    for (let k = 0; k < n; k++, o += 16) levels.push({ z: v.getFloat32(o, true), t: v.getFloat32(o + 4, true), p: v.getFloat32(o + 8, true), e: v.getFloat32(o + 12, true) })
    out.push(levels)
  }
  return out
}

const AFGL_T = 0, AFGL_MS = 1, AFGL_MW = 2, AFGL_SS = 3, AFGL_SW = 4, BET_DAGAN = 5
const US1976 = usStandard1976()

/**
 * Inside the region the Bet Dagan soundings represent (Israel and its immediate neighbourhood).
 * Modelling choice, no single published value: the box 29-33.6 N, 34-36.2 E is drawn around Israel; no published
 * representativeness radius for this station was found.
 */
export const inBetDaganRegion = (lat: number, lng: number): boolean => lat >= 29 && lat <= 33.6 && lng >= 34 && lng <= 36.2

/** Weighted profiles for [lat, lng] on month/day; [hour] 0 sunrise, 12 sunset, -1 both (mean). */
function profiles(table: AtmosphereTable | null | undefined, lat: number, lng: number, month: number, day: number, hour: 0 | 12 | -1, standardColumn = false): Array<[number, number]> {
  if (!table) return [[-1, 1]]
  if (inBetDaganRegion(lat, lng)) {
    if (standardColumn) return [[-1, 1]]
    const m = month - 1
    const other = day >= 15.5 ? (m + 1) % 12 : (m + 11) % 12
    const f = Math.min(0.5, Math.abs(day - 15.5) / 30.44)
    const hours = hour < 0 ? [0, 1] : [hour ? 1 : 0]
    const out: Array<[number, number]> = []
    for (const h of hours) {
      out.push([BET_DAGAN + m * 2 + h, (1 - f) / hours.length], [BET_DAGAN + other * 2 + h, f / hours.length])
    }
    return out
  }
  // AFGL profiles are defined for 15 N (tropical), 45 N (midlatitude) and 60 N (subarctic) (Anderson et al. 1986).
  // Modelling choice, no single published value: the band edges 23.5 deg (the tropic) and 52 deg (about midway
  // between 45 and 60), and the cosine season weight below.
  const a = Math.abs(lat)
  if (a < 23.5) return [[AFGL_T, 1]]
  // Day of the year from month/day (non-leap is enough here); summer weight 0 mid-January, 1 mid-July (north).
  const doy = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][month - 1]! + day
  let w = (1 - Math.cos(2 * Math.PI * (doy - 15) / 365.25)) / 2
  if (lat < 0) w = 1 - w
  return a < 52 ? [[AFGL_MS, w], [AFGL_MW, 1 - w]] : [[AFGL_SS, w], [AFGL_SW, 1 - w]]
}

const levelsOf = (table: AtmosphereTable | null | undefined, i: number): readonly Level[] => (i < 0 || !table ? US1976 : table[i]!)

/**
 * Temperature (K) the anomaly is measured from: the profile's daily mean at [z] (Bet Dagan: mean of 00 and 12 UTC);
 * [diurnal] (a daily minimum/maximum is applied): the traced profile's own temperature there.
 */
function referenceT(table: AtmosphereTable | null | undefined, i: number, z: number, diurnal = false): number {
  if (i >= BET_DAGAN && table && !diurnal) {
    const base = BET_DAGAN + Math.floor((i - BET_DAGAN) / 2) * 2
    return (levelAt(table[base]!, z).t + levelAt(table[base + 1]!, z).t) / 2
  }
  return levelAt(levelsOf(table, i), z).t
}

/** Anomaly grid step, K: refraction is traced at grid anomalies and interpolated linearly between them. Numerical choice, not a published value. */
const ANOMALY_STEP = 0.5
const cache = new Map<string, Atmosphere>()
const CACHE_SIZE = 96

function atmosphere(table: AtmosphereTable | null | undefined, i: number, height: number, anomaly: number): Atmosphere {
  const key = `${table ? 't' : 'u'}${i}|${height}|${anomaly}`
  let a = cache.get(key)
  if (!a) {
    // Bet Dagan is measured over the coastal plain: below the observer the air is its own (surface layer only).
    a = new Atmosphere(levelsOf(table, i), height, anomaly, table && i >= BET_DAGAN ? SURFACE_LAYER : Infinity)
    if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!)
    cache.set(key, a)
  }
  return a
}

export interface HorizonAir {
  table?: AtmosphereTable | null
  lat: number
  lng: number
  /** Observer height above sea level, m. */
  height: number
  month: number
  day: number
  /** The place's air temperature (C) for the day; NaN = use the profile as it is. */
  temperatureC: number
  /**
   * true: temperatureC belongs to the event's hour (the mean at sunrise/sunset, or the day's minimum/maximum), so the
   * anomaly is measured from the traced profile's own temperature; false/missing: it is the daily mean, measured from
   * the profile's daily mean.
   */
  diurnal?: boolean
  /**
   * true (terrain lines): in the Bet Dagan region, the U.S. Standard Atmosphere 1976 moved to the place's temperature
   * instead of the coastal soundings (see the head of this file). Elsewhere no change.
   */
  standardColumn?: boolean
}

/** Sum over the place's profiles of weight x f(atmosphere), the anomaly interpolated on its grid. */
function traced(air: HorizonAir, hour: 0 | 12 | -1, f: (a: Atmosphere) => number): number {
  let total = 0
  for (const [i, w] of profiles(air.table, air.lat, air.lng, air.month, air.day, hour, air.standardColumn)) {
    if (w === 0) continue
    const anomaly = Number.isNaN(air.temperatureC) ? 0 : air.temperatureC + 273.15 - referenceT(air.table, i, air.height, air.diurnal)
    const g = anomaly / ANOMALY_STEP, lo = Math.floor(g), frac = g - lo
    const a = f(atmosphere(air.table, i, air.height, lo * ANOMALY_STEP))
    const b = frac > 1e-9 ? f(atmosphere(air.table, i, air.height, (lo + 1) * ANOMALY_STEP)) : a
    total += w * (a + (b - a) * frac)
  }
  return total
}

/** Ray-traced refraction (arcmin) at apparent altitude [apparent] deg; [hour] 0 sunrise, 12 sunset, -1 both. */
export function tracedRefraction(air: HorizonAir, apparent: number, hour: 0 | 12 | -1): number {
  return traced(air, hour, (a) => a.refraction(apparent))
}

/**
 * Sunrise/sunset from height over the sea-level horizon: dip (deg, with terrestrial refraction) and the refraction
 * (arcmin) of the ray grazing the sea surface, both from the same traced atmosphere. Dip 0 at or below sea level.
 */
export function tracedDipAndRefraction(air: HorizonAir, hour: 0 | 12 | -1): { dip: number, refraction: number } {
  const dip = traced(air, hour, (a) => a.dip())
  const refraction = traced(air, hour, (a) => a.refraction(-a.dip()))
  return { dip, refraction }
}
