// The day's zmanim, ported from an earlier zmanim library (LGPL-2.1),  commit 
// (AstronomicalCalendar.kt, ZmanimCalendar.kt, ComplexZmanimCalendar.kt), trimmed to the definitions below.
// Instants are BigInt epoch nanoseconds, as Kotlin's Instant keeps them: solar midnight halves a nanosecond
// distance before anything is cut to milliseconds, so the precision decides some printed minutes.
import { GEOMETRIC_ZENITH, julianDay, utcNoon, utcSunrise, utcSunset } from './noaa.js';
/** Every zman the library computes, in the order of the day. */
export const ZMAN_NAMES = [
    'chatzotNight', 'alot', 'misheyakir', 'sunrise',
    'sofShmaMga', 'sofShmaGra', 'sofTfillaMga', 'sofTfillaGra',
    'chatzot', 'minchaGedola', 'minchaKetana', 'plag', 'sunset', 'tzeit',
];
/**
 * How each printed minute is rounded, the stringent way: a zman that starts something rounds UP, a deadline
 * rounds DOWN, chatzot (end of morning and start of afternoon) to the nearest minute.
 */
export const ROUNDING = {
    chatzotNight: 'up', alot: 'up', misheyakir: 'up', sunrise: 'up',
    sofShmaGra: 'down', sofShmaMga: 'down', sofTfillaGra: 'down', sofTfillaMga: 'down',
    chatzot: 'nearest', minchaGedola: 'up', minchaKetana: 'up', plag: 'up', sunset: 'down', tzeit: 'up',
};
const ALOT = GEOMETRIC_ZENITH + 16.1;
const MISHEYAKIR = GEOMETRIC_ZENITH + 11.5;
const TZEIT = GEOMETRIC_ZENITH + 8.5;
const MS = 1000000n;
const MINUTE_MS = 60000;
const DAY_MS = 86400000;
const trunc = Math.trunc;
/** Kotlin Double.toInt() for the in-range values used here. */
const toInt = (v) => (Number.isNaN(v) ? 0 : trunc(v));
/** Kotlin Instant.toEpochMilliseconds(): floors. */
function toMs(ns) {
    const q = ns / MS;
    return Number(ns < 0n && q * MS !== ns ? q - 1n : q);
}
export function addDays(d, days) {
    const t = new Date(0);
    t.setUTCFullYear(d.year, d.month - 1, d.day + days);
    return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}
/** One civil date at one place; each value is computed on first use only. */
class Day {
    constructor(place, date) {
        this.place = place;
        this.cache = new Map();
        // Zones across the antimeridian (local mean time 20+ hours off the zone) roll the date, as an earlier zmanim library does.
        let d = date;
        if (place.rawOffsetMinutes !== undefined) {
            const hoursOff = trunc(place.lng * 4 * MINUTE_MS - place.rawOffsetMinutes * MINUTE_MS) / 3600000;
            if (hoursOff >= 20)
                d = addDays(date, 1);
            else if (hoursOff <= -20)
                d = addDays(date, -1);
        }
        this.jd = julianDay(d.year, d.month, d.day);
        this.midnightMs = new Date(0).setUTCFullYear(d.year, d.month - 1, d.day);
    }
    memo(key, compute) {
        let v = this.cache.get(key);
        if (v === undefined) {
            v = compute();
            this.cache.set(key, v);
        }
        return v;
    }
    /** AstronomicalCalendar.getDateFromTime: UTC hours of the date to an instant, rolled a day when needed. */
    fromUtcHours(time, isSunrise) {
        if (Number.isNaN(time))
            return null;
        let cal = this.midnightMs;
        let t = time;
        const hours = toInt(t);
        t -= hours;
        t *= 60;
        const minutes = toInt(t);
        t -= minutes;
        t *= 60;
        const seconds = toInt(t);
        t -= seconds;
        const localHours = toInt(this.place.lng / 15);
        if (isSunrise && localHours + hours > 18)
            cal -= DAY_MS;
        else if (!isSunrise && localHours + hours < 6)
            cal += DAY_MS;
        const nanos = Math.round(t * 1000 * 1000000);
        return BigInt(cal) * MS + BigInt(hours) * 3600000000000n + BigInt(minutes) * 60000000000n +
            BigInt(seconds) * 1000000000n + BigInt(nanos);
    }
    rise(zenith) {
        return this.memo(`r${zenith}`, () => this.fromUtcHours(utcSunrise(this.jd, this.place.lat, this.place.lng, zenith), true));
    }
    set(zenith) {
        return this.memo(`s${zenith}`, () => this.fromUtcHours(utcSunset(this.jd, this.place.lat, this.place.lng, zenith), false));
    }
    get chatzot() {
        return this.memo('n', () => this.fromUtcHours(utcNoon(this.jd, this.place.lng), false));
    }
    /** ZmanimCalendar.getShaahZmanisBasedZman: [hours] temporal hours of [start]..[end], counted from [start]. */
    static shaahBased(start, end, hours) {
        if (start === null || end === null)
            return null;
        const temporalHour = trunc((toMs(end) - toMs(start)) / 12);
        return start + BigInt(trunc(temporalHour * hours)) * MS;
    }
    /** Day from sea-level sunrise to sea-level sunset (GRA). */
    gra(hours) {
        return Day.shaahBased(this.rise(GEOMETRIC_ZENITH), this.set(GEOMETRIC_ZENITH), hours);
    }
    /** Day from 72 minutes before sunrise to 72 minutes after sunset (MGA). */
    mga(hours) {
        const sunrise = this.rise(GEOMETRIC_ZENITH);
        const sunset = this.set(GEOMETRIC_ZENITH);
        const offset = BigInt(72 * MINUTE_MS) * MS;
        return Day.shaahBased(sunrise === null ? null : sunrise - offset, sunset === null ? null : sunset + offset, hours);
    }
}
/** Solar midnight after [day]: halfway (whole nanoseconds, then whole milliseconds) to the next day's chatzot. */
function solarMidnightBetween(day, next) {
    const a = day.chatzot;
    const b = next.chatzot;
    if (a === null || b === null)
        return null;
    return a + ((b - a) / 2n / MS) * MS;
}
/** The instant (epoch nanoseconds) of each requested zman; null where the sun never gets there. */
export function zmanInstants(place, date, which = ZMAN_NAMES) {
    const today = new Day(place, date);
    const out = {};
    for (const name of which) {
        switch (name) {
            // The midnight that opens this day is yesterday's solar midnight.
            case 'chatzotNight':
                out[name] = solarMidnightBetween(new Day(place, addDays(date, -1)), today);
                break;
            case 'alot':
                out[name] = today.rise(ALOT);
                break;
            case 'misheyakir':
                out[name] = today.rise(MISHEYAKIR);
                break;
            case 'sunrise':
                out[name] = today.rise(GEOMETRIC_ZENITH);
                break;
            case 'sofShmaGra':
                out[name] = today.gra(3);
                break;
            case 'sofShmaMga':
                out[name] = today.mga(3);
                break;
            case 'sofTfillaGra':
                out[name] = today.gra(4);
                break;
            case 'sofTfillaMga':
                out[name] = today.mga(4);
                break;
            case 'chatzot':
                out[name] = today.chatzot;
                break;
            case 'minchaGedola':
                out[name] = today.gra(6.5);
                break;
            case 'minchaKetana':
                out[name] = today.gra(9.5);
                break;
            case 'plag':
                out[name] = today.gra(10.75);
                break;
            case 'sunset':
                out[name] = today.set(GEOMETRIC_ZENITH);
                break;
            case 'tzeit':
                out[name] = today.set(TZEIT);
                break;
            default: throw new Error(`Unknown zman '${String(name)}'`);
        }
    }
    return out;
}
const formatters = new Map();
/** HH:MM (hours 01-24) in [timeZone]. One formatter per zone, so bounded by the zone table. */
function clock(ms, timeZone) {
    let format = formatters.get(timeZone);
    if (!format) {
        format = new Intl.DateTimeFormat('he', { hour: '2-digit', minute: '2-digit', hourCycle: 'h24', timeZone });
        formatters.set(timeZone, format);
    }
    return format.formatToParts(ms).map((part) => (part.type === 'dayPeriod' ? '' : part.value.trim())).join('');
}
/** Epoch milliseconds printed as HH:MM in [timeZone], rounded to the minute as [rounding] says. */
export function formatTime(epochMs, rounding, timeZone) {
    const minutes = epochMs / MINUTE_MS;
    const rounded = rounding === 'up' ? Math.ceil(minutes) : rounding === 'down' ? Math.floor(minutes) : Math.round(minutes);
    return clock(rounded * MINUTE_MS, timeZone);
}
/** Epoch milliseconds of an instant, floored (as Kotlin reads it). */
export const epochMs = toMs;
/** Synchronous core: the requested zmanim printed HH:MM (null where the sun never gets there). */
export function computeZmanim(place, date, which = ZMAN_NAMES) {
    const instants = zmanInstants(place, date, which);
    const out = {};
    for (const name of which) {
        const ns = instants[name];
        out[name] = ns == null ? null : formatTime(toMs(ns), ROUNDING[name], place.tzid);
    }
    return out;
}
