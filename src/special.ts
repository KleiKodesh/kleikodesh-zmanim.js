// Zmanim of special days, computed only when the caller says which kind of day it is (the library has no Hebrew
// calendar of its own: the app knows erev Pesach and fast days; kiddush levana needs only the molad, below).
import { epochMs, formatTime, zmanInstants, type CivilDate, type Coordinates, type Rounding, type ZmanName } from './zmanim.js'

/** The kinds of special day, and the zmanim each one adds. */
export const SPECIAL_KINDS = {
  erevPesach: ['sofAchilatChametzMga', 'sofAchilatChametzMga16', 'sofAchilatChametzGra',
    'sofBiurChametzMga', 'sofBiurChametzMga16', 'sofBiurChametzGra'],
  fastDay: ['fastStart90', 'fastStart72', 'fastStart16'],
  kiddushLevana: ['kiddushLevanaStart3', 'kiddushLevanaStart7', 'kiddushLevanaEndHalf', 'kiddushLevanaEnd15'],
} as const

export type SpecialKind = keyof typeof SPECIAL_KINDS
export type SpecialZmanName = typeof SPECIAL_KINDS[SpecialKind][number]
export const SPECIAL_ZMAN_NAMES: readonly SpecialZmanName[] = Object.values(SPECIAL_KINDS).flat()

/**
 * Stringent rounding: the chametz deadlines and the start of a fast (the end of eating) round DOWN; the earliest
 * kiddush levana rounds UP and its latest rounds DOWN. The end of a fast is a tzeit line (ZMAN_NAMES), rounded up.
 */
export const SPECIAL_ROUNDING: Readonly<Record<SpecialZmanName, Rounding>> = {
  sofAchilatChametzMga: 'down', sofAchilatChametzMga16: 'down', sofAchilatChametzGra: 'down',
  sofBiurChametzMga: 'down', sofBiurChametzMga16: 'down', sofBiurChametzGra: 'down',
  fastStart90: 'down', fastStart72: 'down', fastStart16: 'down',
  kiddushLevanaStart3: 'up', kiddushLevanaStart7: 'up', kiddushLevanaEndHalf: 'down', kiddushLevanaEnd15: 'down',
}

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000
/** One chelek: 1/1080 of an hour (Rambam, Kiddush HaChodesh 6:2). */
const CHELEK_MS = 3_600_000 / 1080
/** Mean lunar month 29 d 12 h 793 chalakim (Rambam, Kiddush HaChodesh 6:3). */
export const MOLAD_INTERVAL_MS = 29 * DAY_MS + 12 * 3_600_000 + 793 * CHELEK_MS
/**
 * Molad of Tishrei of year 1 (BaHaRaD, Rambam 6:8): Sunday night 5 h 204 chalakim after 18:00, i.e. 876 chalakim
 * before the midnight that opens Monday 7 Oct 3761 BCE (Julian) = R.D. -1373427 (Reingold and Dershowitz,
 * Calendrical Calculations). R.D. 719163 is 1970-01-01. The molad is reckoned in Jerusalem mean local time.
 */
const MOLAD_EPOCH_LOCAL_MS = (-1373427 - 719163) * DAY_MS - 876 * CHELEK_MS
/** Jerusalem mean local time is UT + 35.2354 deg x 4 min. */
const JERUSALEM_MEAN_OFFSET_MS = 35.2354 * 4 * MINUTE_MS

/** Epoch ms (UTC) of the [n]th molad since BaHaRaD (n = months elapsed since Tishrei of year 1). */
export function moladMs(n: number): number {
  return MOLAD_EPOCH_LOCAL_MS + n * MOLAD_INTERVAL_MS - JERUSALEM_MEAN_OFFSET_MS
}

/** Index of the last molad at or before [ms] (epoch ms, UTC). */
export function moladIndexAtOrBefore(ms: number): number {
  let n = Math.floor((ms - moladMs(0)) / MOLAD_INTERVAL_MS)
  while (moladMs(n + 1) <= ms) n++
  while (moladMs(n) > ms) n--
  return n
}

const toNs = (ms: number): bigint | null => (Number.isNaN(ms) ? null : BigInt(Math.floor(ms)) * 1_000_000n)
const ms = (v: bigint | null | undefined): number => (v == null ? NaN : epochMs(v))

/**
 * Instants (epoch ns) of the [kind]'s zmanim on [date]. Kiddush levana: the molad is the last one before the end of
 * [date] (UTC), and its four instants may fall on other days; the caller prints their dates.
 */
export function specialZmanInstants(place: Coordinates, date: CivilDate, kind: SpecialKind): Partial<Record<SpecialZmanName, bigint | null>> {
  const out: Partial<Record<SpecialZmanName, bigint | null>> = {}
  if (kind === 'kiddushLevana') {
    const m = moladMs(moladIndexAtOrBefore(Date.UTC(date.year, date.month - 1, date.day) + DAY_MS))
    out.kiddushLevanaStart3 = toNs(m + 3 * DAY_MS)
    out.kiddushLevanaStart7 = toNs(m + 7 * DAY_MS)
    out.kiddushLevanaEndHalf = toNs(m + MOLAD_INTERVAL_MS / 2)
    out.kiddushLevanaEnd15 = toNs(m + 15 * DAY_MS)
    return out
  }
  const need: ZmanName[] = kind === 'erevPesach' ? ['sunrise', 'sunset', 'alot', 'tzeitRt16'] : ['sunrise', 'alot']
  const z = zmanInstants(place, date, need)
  const rise = ms(z.sunrise), set = ms(z.sunset), alot = ms(z.alot), tzeit16 = ms(z.tzeitRt16)
  const hour = (start: number, end: number, h: number): number => start + (end - start) / 12 * h
  if (kind === 'erevPesach') {
    out.sofAchilatChametzMga = toNs(hour(rise - 72 * MINUTE_MS, set + 72 * MINUTE_MS, 4))
    out.sofAchilatChametzMga16 = toNs(hour(alot, tzeit16, 4))
    out.sofAchilatChametzGra = toNs(hour(rise, set, 4))
    out.sofBiurChametzMga = toNs(hour(rise - 72 * MINUTE_MS, set + 72 * MINUTE_MS, 5))
    out.sofBiurChametzMga16 = toNs(hour(alot, tzeit16, 5))
    out.sofBiurChametzGra = toNs(hour(rise, set, 5))
  } else {
    out.fastStart90 = toNs(rise - 90 * MINUTE_MS)
    out.fastStart72 = toNs(rise - 72 * MINUTE_MS)
    out.fastStart16 = toNs(alot)
  }
  return out
}

/** The [kind]'s zmanim printed HH:MM in the place's zone, rounded by SPECIAL_ROUNDING (null where none). */
export function specialZmanim(place: Coordinates, date: CivilDate, kind: SpecialKind): Partial<Record<SpecialZmanName, string | null>> {
  const instants = specialZmanInstants(place, date, kind)
  const out: Partial<Record<SpecialZmanName, string | null>> = {}
  for (const [name, ns] of Object.entries(instants) as [SpecialZmanName, bigint | null][]) {
    out[name] = ns == null ? null : formatTime(epochMs(ns), SPECIAL_ROUNDING[name], place.tzid)
  }
  return out
}
