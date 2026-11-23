// The day's zmanim. Sun positions come from src/spa.ts (NREL SPA, Reda & Andreas 2008, appendix A.2 rise/
// transit/set); sunrise/sunset refraction from src/refraction.ts. The zman definitions are the standard
// halachic ones (temporal hours of a GRA or MGA day, degree depressions); see README.
import { horizonRefractionArcmin, inversionFactor, standardPressure, standardTemperature, temperatureOn } from './refraction.js';
import { julianDayFromUtcMs, spa, spaDay, spaEvent, zenithToH0 } from './spa.js';
/** Every zman the library computes, in the order of the day. Each is computed only when requested. */
export const ZMAN_NAMES = [
    'chatzotNight', 'alot90Visible', 'alot90', 'alot90Chatzot', 'alotVisible', 'alot', 'alotChatzot', 'misheyakirVisible',
    'misheyakir', 'misheyakirChatzot', 'misheyakir11', 'misheyakir10p2', 'sunriseElevated', 'sunrise', 'sunriseTerrain',
    'sofShmaMga', 'sofShmaMga16', 'sofShmaGra', 'sofTfillaMga', 'sofTfillaMga16', 'sofTfillaGra',
    'chatzot', 'minchaGedola', 'minchaGedola30', 'minchaKetana', 'plag', 'plagMga',
    'candles40', 'candles30', 'candles22', 'candles20', 'candles18', 'sunsetTerrain', 'sunset', 'sunsetElevated',
    'tzeitGeonim', 'tzeitGeonimVisible', 'tzeit7083', 'tzeit', 'tzeitVisible',
    'tzeitRt72', 'tzeitRt72Zmanis', 'tzeitRt16',
];
/**
 * How each printed minute is rounded, the stringent way: a zman that starts something rounds UP, a deadline
 * rounds DOWN, chatzot (end of morning and start of afternoon) to the nearest minute.
 */
export const ROUNDING = {
    alot90Chatzot: 'up', alotChatzot: 'up', misheyakirChatzot: 'up',
    chatzotNight: 'up', alot90Visible: 'up', alot90: 'up', alotVisible: 'up', alot: 'up', misheyakirVisible: 'up',
    misheyakir: 'up', misheyakir11: 'up', misheyakir10p2: 'up', sunriseElevated: 'up', sunrise: 'up', sunriseTerrain: 'up',
    sofShmaGra: 'down', sofShmaMga: 'down', sofShmaMga16: 'down', sofTfillaGra: 'down', sofTfillaMga: 'down', sofTfillaMga16: 'down',
    chatzot: 'nearest', minchaGedola: 'up', minchaGedola30: 'up', minchaKetana: 'up', plag: 'up', plagMga: 'up',
    sunset: 'down', sunsetElevated: 'down', sunsetTerrain: 'down', tzeitGeonim: 'up', tzeitGeonimVisible: 'up', tzeit7083: 'up', tzeit: 'up', tzeitVisible: 'up',
    candles40: 'down', candles30: 'down', candles22: 'down', candles20: 'down', candles18: 'down',
    tzeitRt72: 'up', tzeitRt72Zmanis: 'up', tzeitRt16: 'up',
};
/**
 * Zmanim that depend on refraction at the horizon, and so on the place's monthly temperatures: sunrise/sunset,
 * everything built from them, and the Visible degree lines. A place without `monthlyTemperatureC` throws for these.
 */
export const HORIZON_ZMANIM = new Set(['sunrise', 'sunset', 'sunriseElevated', 'sunsetElevated',
    'sofShmaMga', 'sofShmaGra', 'sofTfillaMga', 'sofTfillaGra', 'minchaGedola', 'minchaGedola30', 'minchaKetana', 'plag', 'plagMga',
    'alot90Visible', 'alotVisible', 'misheyakirVisible', 'tzeitGeonimVisible', 'tzeitVisible',
    'candles40', 'candles30', 'candles22', 'candles20', 'candles18', 'tzeitRt72', 'tzeitRt72Zmanis', 'sunriseTerrain', 'sunsetTerrain']);
/** Zmanim that need the place's terrain horizon (Coordinates.terrainHorizon); null without it. */
export const TERRAIN_ZMANIM = new Set(['sunriseTerrain', 'sunsetTerrain']);
/** Azimuth bins of a terrain horizon: one per degree, 30..150 (east) then 210..330 (west). */
export const TERRAIN_BINS = 242;
/** Terrain horizon altitude (degrees, apparent) toward [azimuth] (from north, eastward); NaN outside the bins or without data. */
export function terrainAltitude(profile, azimuth) {
    let base;
    let a;
    if (azimuth >= 30 && azimuth <= 150) {
        base = 0;
        a = azimuth - 30;
    }
    else if (azimuth >= 210 && azimuth <= 330) {
        base = 121;
        a = azimuth - 210;
    }
    else
        return NaN;
    const i = Math.min(Math.floor(a), 119);
    const f = a - i;
    const v0 = profile[base + i];
    const v1 = profile[base + i + 1];
    if (v0 === NO_TERRAIN || v1 === NO_TERRAIN)
        return NaN;
    return (v0 + (v1 - v0) * f) / 100;
}
/** Missing value in a terrain horizon (int16: hundredths of a degree). */
export const NO_TERRAIN = -32768;
/** The geometric horizon. */
export const GEOMETRIC_ZENITH = 90;
/** Solar semidiameter used for sunrise/sunset, degrees (16'). */
const SOLAR_RADIUS = 16 / 60;
/** Mean Earth radius, meters. */
const EARTH_RADIUS = 6371000;
function temperatureAt(place, date) {
    const m = place.monthlyTemperatureC;
    const t = Array.isArray(m) ? temperatureOn(m, date.month, date.day) : NaN;
    return Number.isNaN(t) ? standardTemperature(place.elevation ?? 0) : t;
}
/** Horizon refraction (arcmin) at [apparent] degrees for [place] on [date]: pressure, temperature and inversion term. */
function horizonRefraction(place, date, apparent = 0) {
    const l = place.monthlyLapseKPerKm;
    const factor = l ? inversionFactor(temperatureOn(l, date.month, date.day)) : 1;
    return horizonRefractionArcmin(standardPressure(place.elevation ?? 0), temperatureAt(place, date), apparent) * factor;
}
/** Geometric dip of the sea horizon seen from [elevation] meters, degrees: arccos(R / (R + h)). None below sea level. */
export function horizonDip(elevation) {
    return elevation > 0 ? Math.acos(EARTH_RADIUS / (EARTH_RADIUS + elevation)) * 180 / Math.PI : 0;
}
/**
 * Zenith of the sun's centre at sunrise/sunset for [place] on [date]: 90 + radius + dip + refraction at the
 * apparent horizon, with pressure from the elevation and temperature from the monthly means (refraction.ts).
 * [fromHeight] false: the sea-level horizon (no dip); true: the horizon seen from the place's own elevation.
 */
export function horizonZenith(place, date, fromHeight = false) {
    const elevation = place.elevation ?? 0;
    const dip = fromHeight ? horizonDip(elevation) : 0;
    const r = horizonRefraction(place, date, -dip);
    return GEOMETRIC_ZENITH + SOLAR_RADIUS + dip + r / 60;
}
// Depressions of the sun's centre below the geometric horizon, degrees.
const ALOT = 16.1;
const ALOT_90 = 19.8;
const MISHEYAKIR = 11.5;
const MISHEYAKIR_11 = 11;
const MISHEYAKIR_10_2 = 10.2;
const TZEIT = 8.5;
/** Three medium stars (an observational estimate), 7.083 deg. */
const TZEIT_7083 = 7.083;
const TZEIT_GEONIM = 3.7;
const MINUTE_MS = 60000;
const DAY_MS = 86400000;
/** SPA A.2 correction step repeats (the paper does 1; 3 converges well under a second). */
const ITERATIONS = 3;
export function addDays(d, days) {
    const t = new Date(0);
    t.setUTCFullYear(d.year, d.month - 1, d.day + days);
    return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}
const utcMidnight = (d) => new Date(0).setUTCFullYear(d.year, d.month - 1, d.day);
// Per-UT-date SPA values (independent of place); a few recent dates are kept.
const spaDays = new Map();
function spaDayAt(midnightMs) {
    let d = spaDays.get(midnightMs);
    if (!d) {
        const t = new Date(midnightMs);
        d = spaDay(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
        if (spaDays.size >= 16)
            spaDays.delete(spaDays.keys().next().value);
        spaDays.set(midnightMs, d);
    }
    return d;
}
/**
 * Epoch ms of a sun event (kind -1 rise, 0 transit, +1 set, the sun's centre at [zenith]) on the local mean solar
 * day that starts at [lmtMidnight] (UTC ms of that date) at [lat]/[lng]; NaN where the sun never reaches [zenith].
 * SPA gives the event of a UT date; the UT date is moved until the event falls in the local mean day.
 */
export function sunEventMs(lat, lng, lmtMidnight, zenith, kind) {
    const offset = lng * 240000; // local mean time - UT
    let ut = lmtMidnight;
    for (let tries = 0; tries < 3; tries++) {
        const m = spaEvent(spaDayAt(ut), lat, lng, kind === 0 ? 0 : zenithToH0(zenith), kind, { iterations: ITERATIONS });
        if (Number.isNaN(m))
            return NaN;
        const ms = ut + m * DAY_MS;
        const local = ms + offset;
        if (local < lmtMidnight)
            ut += DAY_MS;
        else if (local >= lmtMidnight + DAY_MS)
            ut -= DAY_MS;
        else
            return ms;
    }
    return NaN;
}
/** One civil date at one place; each value is computed on first use only. */
class Day {
    constructor(place, date) {
        this.place = place;
        this.date = date;
        this.cache = new Map();
        // Zones across the antimeridian (local mean time 20+ hours off the zone) roll the date.
        let d = date;
        if (place.rawOffsetMinutes !== undefined) {
            const hoursOff = (place.lng * 4 - place.rawOffsetMinutes) / 60;
            if (hoursOff >= 20)
                d = addDays(date, 1);
            else if (hoursOff <= -20)
                d = addDays(date, -1);
        }
        this.lmtMidnight = utcMidnight(d);
    }
    memo(key, compute) {
        let v = this.cache.get(key);
        if (v === undefined) {
            v = compute();
            this.cache.set(key, v);
        }
        return v;
    }
    event(zenith, kind) {
        return this.memo(`${kind}:${zenith}`, () => sunEventMs(this.place.lat, this.place.lng, this.lmtMidnight, zenith, kind));
    }
    horizon(fromHeight) {
        return this.memo(fromHeight ? 'hh' : 'h', () => horizonZenith(this.place, this.date, fromHeight));
    }
    /**
     * Zenith of a sun [depression] degrees below the apparent (refracted) sea-level horizon rather than the geometric
     * one: the visible horizon lies R0 (horizon refraction at this place's pressure/temperature) below the geometric
     * horizon, so zenith = 90 + R0 + depression. No solar radius: degree lines refer to the sun's centre.
     */
    visible(depression) {
        return this.memo(`v${depression}`, () => {
            return GEOMETRIC_ZENITH + depression + horizonRefraction(this.place, this.date) / 60;
        });
    }
    rise(zenith) { return this.event(zenith, -1); }
    set(zenith) { return this.event(zenith, 1); }
    sunrise(fromHeight = false) { return this.rise(this.horizon(fromHeight)); }
    sunset(fromHeight = false) { return this.set(this.horizon(fromHeight)); }
    get chatzot() { return this.event(0, 0); }
    /**
     * The sun's upper limb at the terrain horizon toward its own azimuth (kind -1 rise, +1 set): the horizon altitude
     * A at the sun's azimuth, refraction at apparent altitude A, so the centre's zenith is 90 - A + R(A) + radius.
     * The azimuth comes from SPA at the previous estimate, starting from sea-level sunrise/sunset; a few steps converge.
     */
    terrain(kind) {
        const profile = this.place.terrainHorizon;
        if (!profile)
            return NaN;
        return this.memo(`t${kind}`, () => {
            let t = kind < 0 ? this.sunrise() : this.sunset();
            for (let i = 0; i < 6 && !Number.isNaN(t); i++) {
                const azimuth = spa({ jd: julianDayFromUtcMs(t), latitude: this.place.lat, longitude: this.place.lng }).azimuth;
                const a = terrainAltitude(profile, azimuth);
                if (Number.isNaN(a))
                    return NaN;
                const zenith = GEOMETRIC_ZENITH - a + horizonRefraction(this.place, this.date, a) / 60 + SOLAR_RADIUS;
                const next = this.event(zenith, kind);
                const done = Math.abs(next - t) < 1000;
                t = next;
                if (done)
                    break;
            }
            return t;
        });
    }
    /** [hours] temporal hours (a twelfth of [start]..[end]) counted from [start]. */
    static shaahBased(start, end, hours) {
        return start + (end - start) / 12 * hours;
    }
    /** Day from sea-level sunrise to sea-level sunset (GRA). */
    gra(hours) {
        return Day.shaahBased(this.sunrise(), this.sunset(), hours);
    }
    /** Day from 72 minutes before sea-level sunrise to 72 minutes after sea-level sunset (MGA). */
    mga(hours) {
        return Day.shaahBased(this.sunrise() - 72 * MINUTE_MS, this.sunset() + 72 * MINUTE_MS, hours);
    }
    /** MGA day by degrees: from alot (16.1 deg) to tzeit at 16.1 deg in the evening. */
    mga16(hours) {
        return Day.shaahBased(this.rise(GEOMETRIC_ZENITH + ALOT), this.set(GEOMETRIC_ZENITH + ALOT), hours);
    }
}
const toNs = (ms) => (Number.isNaN(ms) ? null : BigInt(Math.floor(ms)) * 1000000n);
/** The instant (epoch nanoseconds, millisecond precision) of each requested zman; null where the sun never gets there. */
export function zmanInstants(place, date, which = ZMAN_NAMES) {
    if (place.monthlyTemperatureC === undefined) {
        const needs = which.find((n) => HORIZON_ZMANIM.has(n));
        if (needs) {
            throw new Error(`kleikodesh-zmanim: '${needs}' depends on the place's temperatures; pass a getPlace() result, `
                + `or monthlyTemperatureC: [12 values] or 'standard' explicitly`);
        }
    }
    const G = GEOMETRIC_ZENITH;
    const today = new Day(place, date);
    // The midnight that opens this day: halfway between yesterday's and today's chatzot.
    const night = () => (new Day(place, addDays(date, -1)).chatzot + today.chatzot) / 2;
    // A morning degree line, or chatzot halaila (the lowest sun) on nights it is never reached.
    const orNight = (v) => (Number.isNaN(v) ? night() : v);
    const out = {};
    for (const name of which) {
        let ms;
        switch (name) {
            case 'chatzotNight':
                ms = night();
                break;
            case 'alot90Chatzot':
                ms = orNight(today.rise(G + ALOT_90));
                break;
            case 'alotChatzot':
                ms = orNight(today.rise(G + ALOT));
                break;
            case 'misheyakirChatzot':
                ms = orNight(today.rise(G + MISHEYAKIR));
                break;
            case 'alot90Visible':
                ms = today.rise(today.visible(ALOT_90));
                break;
            case 'alot90':
                ms = today.rise(G + ALOT_90);
                break;
            case 'alotVisible':
                ms = today.rise(today.visible(ALOT));
                break;
            case 'alot':
                ms = today.rise(G + ALOT);
                break;
            case 'misheyakirVisible':
                ms = today.rise(today.visible(MISHEYAKIR));
                break;
            case 'misheyakir':
                ms = today.rise(G + MISHEYAKIR);
                break;
            case 'misheyakir11':
                ms = today.rise(G + MISHEYAKIR_11);
                break;
            case 'misheyakir10p2':
                ms = today.rise(G + MISHEYAKIR_10_2);
                break;
            case 'sunriseElevated':
                ms = today.sunrise(true);
                break;
            case 'sunrise':
                ms = today.sunrise();
                break;
            case 'sunriseTerrain':
                ms = today.terrain(-1);
                break;
            case 'sofShmaGra':
                ms = today.gra(3);
                break;
            case 'sofShmaMga':
                ms = today.mga(3);
                break;
            case 'sofShmaMga16':
                ms = today.mga16(3);
                break;
            case 'sofTfillaMga16':
                ms = today.mga16(4);
                break;
            case 'sofTfillaGra':
                ms = today.gra(4);
                break;
            case 'sofTfillaMga':
                ms = today.mga(4);
                break;
            case 'chatzot':
                ms = today.chatzot;
                break;
            case 'minchaGedola':
                ms = today.gra(6.5);
                break;
            // The later of 30 minutes after chatzot and half a temporal hour (GRA) after chatzot.
            case 'minchaGedola30':
                ms = Math.max(today.chatzot + 30 * MINUTE_MS, today.gra(6.5));
                break;
            case 'minchaKetana':
                ms = today.gra(9.5);
                break;
            case 'plag':
                ms = today.gra(10.75);
                break;
            case 'plagMga':
                ms = today.mga(10.75);
                break;
            case 'sunset':
                ms = today.sunset();
                break;
            case 'sunsetTerrain':
                ms = today.terrain(1);
                break;
            case 'sunsetElevated':
                ms = today.sunset(true);
                break;
            case 'tzeitGeonim':
                ms = today.set(G + TZEIT_GEONIM);
                break;
            case 'tzeitGeonimVisible':
                ms = today.set(today.visible(TZEIT_GEONIM));
                break;
            case 'tzeit7083':
                ms = today.set(G + TZEIT_7083);
                break;
            case 'tzeit':
                ms = today.set(G + TZEIT);
                break;
            case 'tzeitVisible':
                ms = today.set(today.visible(TZEIT));
                break;
            // Candle lighting: a fixed number of minutes before sunset, by community custom (SA OC 261:2, 263).
            case 'candles40':
                ms = today.sunset() - 40 * MINUTE_MS;
                break;
            case 'candles30':
                ms = today.sunset() - 30 * MINUTE_MS;
                break;
            case 'candles22':
                ms = today.sunset() - 22 * MINUTE_MS;
                break;
            case 'candles20':
                ms = today.sunset() - 20 * MINUTE_MS;
                break;
            case 'candles18':
                ms = today.sunset() - 18 * MINUTE_MS;
                break;
            // Rabbeinu Tam: four mil after sunset (Tosafot Shabbat 35a, from Pesachim 94a), 72 min at 18 min a mil; SA OC 261:2.
            case 'tzeitRt72':
                ms = today.sunset() + 72 * MINUTE_MS;
                break;
            // The same 72 as seasonal minutes: a tenth of the sunrise..sunset day (12 + 1.2 temporal hours).
            case 'tzeitRt72Zmanis':
                ms = today.gra(13.2);
                break;
            // The same by degrees: the sun 16.1 deg below, its depth 72 minutes after sunset at the Jerusalem equinox.
            case 'tzeitRt16':
                ms = today.set(G + ALOT);
                break;
            default: throw new Error(`Unknown zman '${String(name)}'`);
        }
        out[name] = toNs(ms);
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
/** Epoch milliseconds of an instant (floored). */
export function epochMs(ns) {
    const q = ns / 1000000n;
    return Number(ns < 0n && q * 1000000n !== ns ? q - 1n : q);
}
/** Synchronous core: the requested zmanim printed HH:MM (null where the sun never gets there). */
export function computeZmanim(place, date, which = ZMAN_NAMES) {
    const instants = zmanInstants(place, date, which);
    const out = {};
    for (const name of which) {
        const ns = instants[name];
        out[name] = ns == null ? null : formatTime(epochMs(ns), ROUNDING[name], place.tzid);
    }
    return out;
}
