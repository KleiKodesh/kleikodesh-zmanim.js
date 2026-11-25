// The day's zmanim. Sun positions come from src/spa.ts (NREL SPA, Reda & Andreas 2008, appendix A.2 rise/
// transit/set); sunrise/sunset refraction from src/refraction.ts. The zman definitions are the standard
// halachic ones (temporal hours of a GRA or MGA day, degree depressions); see README.
import { horizonRefractionArcmin, inversionFactor, standardPressure, standardTemperature, temperatureOn } from './refraction.js';
import { julianDayFromUtcMs, spa, spaDay, spaEvent, zenithToH0 } from './spa.js';
/** Every zman the library computes, in the order of the day. Each is computed only when requested. */
export const ZMAN_NAMES = [
    'chatzotNight', 'alot90Visible', 'alot90', 'alot90Chatzot', 'alot90z', 'alotVisible', 'alot', 'alotChatzot', 'alot72z', 'alot96', 'alot120', 'alot12', 'misheyakir66', 'misheyakir60', 'misheyakirVisible',
    'misheyakir', 'misheyakirChatzot', 'misheyakir11', 'misheyakirLechumra', 'misheyakir10p2', 'misheyakir7p65', 'misheyakir12p85', 'misheyakir40', 'alotBaalHatanya', 'sunriseBaalHatanya', 'sunriseElevated', 'sunrise', 'sunriseTerrain',
    'sofShmaMga120', 'sofShmaMga90', 'sofShmaMga19', 'sofShmaMga90z', 'sofShmaMga', 'sofShmaMga16', 'sofShmaMga72z', 'sofShmaMga72Fixed', 'sofShmaMga16Fixed', 'sofShmaHarari40', 'sofShmaHarari25', 'sofShmaAsym', 'sofShmaBaalHatanya', 'sofShmaBenIshChai', 'sofShmaGra', 'sofShmaGraFixed',
    'sofTfillaMga120', 'sofTfillaMga90', 'sofTfillaMga19', 'sofTfillaMga90z', 'sofTfillaMga', 'sofTfillaMga16', 'sofTfillaMga72z', 'sofTfillaHarari40', 'sofTfillaHarari25', 'sofTfillaAsym', 'sofTfillaBaalHatanya', 'sofTfillaBenIshChai', 'sofTfillaGra', 'sofTfillaGraFixed',
    'chatzot', 'chatzotFixedLocal', 'minchaGedola', 'minchaGedola30', 'minchaGedolaFixed', 'minchaGedolaHillel', 'minchaGedolaBaalHatanya',
    'minchaGedolaHarari40', 'minchaGedolaHarari25', 'minchaKetana', 'minchaKetanaFixed', 'minchaKetanaHillel', 'minchaKetanaBaalHatanya',
    'minchaKetanaHarari40', 'minchaKetanaHarari25', 'plag', 'plagFixed', 'plagHillel', 'plagAlotTzeitGeonim', 'plagBaalHatanya', 'plagHarari40', 'plagHarari25', 'plagAsym', 'plagBenIshChai', 'plagMga', 'plagMga72z', 'plagMga19', 'plagMga90z', 'plagMga90', 'plagMga120', 'plagAlot90Tzeit645', 'plagAlot72Tzeit645', 'plagAlot12Tzeit7083',
    'candles40', 'candles30', 'candles22', 'candles20', 'candles18', 'sunsetTerrain', 'sunset', 'sunsetElevated', 'sunsetBaalHatanya',
    'tzeitGeonim', 'tzeitGeonimVisible', 'tzeitBaalHatanya', 'tzeit13p5', 'tzeit18', 'tzeit18Sun', 'tzeit20', 'tzeit645', 'tzeit7083', 'tzeit', 'tzeitVisible', 'tzeit24', 'tzeit30',
    'tzeit40', 'tzeit45', 'tzeit50', 'tzeit13p5z', 'beinHashmashotYereim', 'beinHashmashotRt', 'tzeitRt72', 'tzeitRt72Zmanis', 'tzeitRt16', 'tzeitRt90', 'tzeitRt96', 'tzeit90z',
];
/**
 * How each printed minute is rounded, the stringent way: a zman that starts something rounds UP, a deadline
 * rounds DOWN, chatzot (end of morning and start of afternoon) to the nearest minute.
 */
export const ROUNDING = {
    alot90Chatzot: 'up', alotChatzot: 'up', misheyakirChatzot: 'up',
    chatzotNight: 'up', alot90Visible: 'up', alot90: 'up', alotVisible: 'up', alot: 'up', misheyakirVisible: 'up',
    misheyakir: 'up', misheyakir11: 'up', misheyakir10p2: 'up', misheyakirLechumra: 'up', sunriseElevated: 'up', sunrise: 'up', sunriseTerrain: 'up',
    sofShmaGra: 'down', sofShmaMga: 'down', sofShmaMga16: 'down', sofTfillaGra: 'down', sofTfillaMga: 'down', sofTfillaMga16: 'down',
    chatzot: 'nearest', minchaGedola: 'up', minchaGedola30: 'up', minchaKetana: 'up', plag: 'up', plagMga: 'up',
    sunset: 'down', sunsetElevated: 'down', sunsetTerrain: 'down', tzeitGeonim: 'up', tzeitGeonimVisible: 'up', tzeit7083: 'up', tzeit18Sun: 'up', tzeit: 'up', tzeitVisible: 'up',
    candles40: 'down', candles30: 'down', candles22: 'down', candles20: 'down', candles18: 'down',
    tzeitRt72: 'up', tzeitRt72Zmanis: 'up', tzeitRt16: 'up', tzeitRt90: 'up', tzeitRt96: 'up', tzeit13p5z: 'up',
    alot90z: 'up', alot72z: 'up', alot96: 'up', alot120: 'up', tzeit90z: 'up',
    sofShmaMga120: 'down', sofShmaMga90: 'down', sofShmaMga19: 'down', sofShmaMga90z: 'down', sofShmaMga72z: 'down',
    sofTfillaMga120: 'down', sofTfillaMga90: 'down', sofTfillaMga19: 'down', sofTfillaMga90z: 'down', sofTfillaMga72z: 'down',
    plagMga120: 'up', plagAlot90Tzeit645: 'up', plagAlot72Tzeit645: 'up', alot12: 'up', plagAlot12Tzeit7083: 'up', tzeit645: 'up', plagMga90: 'up', plagMga19: 'up', plagMga90z: 'up', plagMga72z: 'up',
    tzeit13p5: 'up', tzeit18: 'up', tzeit20: 'up', tzeit24: 'up', tzeit30: 'up', tzeit40: 'up', tzeit45: 'up', tzeit50: 'up',
    misheyakir66: 'up', misheyakir60: 'up', misheyakir40: 'up',
    // The start of Rabbeinu Tam's twilight ends the time that is surely day (work before Shabbat): a deadline.
    beinHashmashotYereim: 'down', beinHashmashotRt: 'down',
    misheyakir7p65: 'up', misheyakir12p85: 'up', chatzotFixedLocal: 'nearest',
    alotBaalHatanya: 'up', sunriseBaalHatanya: 'up', sofShmaBaalHatanya: 'down', sofTfillaBaalHatanya: 'down',
    minchaGedolaBaalHatanya: 'up', minchaKetanaBaalHatanya: 'up', plagBaalHatanya: 'up', sunsetBaalHatanya: 'down', tzeitBaalHatanya: 'up',
    sofShmaHarari40: 'down', sofShmaHarari25: 'down', sofTfillaHarari40: 'down', sofTfillaHarari25: 'down',
    minchaGedolaHarari40: 'up', minchaGedolaHarari25: 'up', minchaKetanaHarari40: 'up', minchaKetanaHarari25: 'up', plagHarari40: 'up', plagHarari25: 'up',
    minchaGedolaHillel: 'up', minchaKetanaHillel: 'up', plagHillel: 'up', plagAlotTzeitGeonim: 'up',
    sofShmaGraFixed: 'down', sofTfillaGraFixed: 'down', sofShmaMga72Fixed: 'down', sofShmaMga16Fixed: 'down',
    minchaGedolaFixed: 'up', minchaKetanaFixed: 'up', plagFixed: 'up',
    sofShmaAsym: 'down', sofTfillaAsym: 'down', plagAsym: 'up', plagBenIshChai: 'up', sofShmaBenIshChai: 'down', sofTfillaBenIshChai: 'down',
};
/**
 * Zmanim that depend on refraction at the horizon, and so on the place's monthly temperatures: sunrise/sunset,
 * everything built from them, and the Visible degree lines. A place without `monthlyTemperatureC` throws for these.
 */
export const HORIZON_ZMANIM = new Set(['sunrise', 'sunset', 'sunriseElevated', 'sunsetElevated',
    'sofShmaMga', 'sofShmaGra', 'sofTfillaMga', 'sofTfillaGra', 'minchaGedola', 'minchaGedola30', 'minchaKetana', 'plag', 'plagMga',
    'alot90Visible', 'alotVisible', 'misheyakirVisible', 'tzeitGeonimVisible', 'tzeitVisible',
    'candles40', 'candles30', 'candles22', 'candles20', 'candles18', 'tzeitRt72', 'tzeitRt72Zmanis', 'tzeitRt90', 'tzeitRt96', 'tzeit13p5z', 'sunriseTerrain', 'sunsetTerrain',
    'alot90z', 'alot72z', 'alot96', 'alot120', 'tzeit90z', 'sofShmaMga120', 'sofShmaMga90', 'sofShmaMga90z', 'sofShmaMga72z', 'sofTfillaMga120', 'sofTfillaMga90',
    'sofTfillaMga90z', 'sofTfillaMga72z', 'plagMga120', 'plagMga90', 'plagMga90z', 'plagMga72z',
    'tzeit13p5', 'tzeit18', 'tzeit20', 'tzeit24', 'tzeit30', 'tzeit40', 'tzeit45', 'tzeit50', 'beinHashmashotRt', 'misheyakir66', 'misheyakir60', 'misheyakir40',
    'sofShmaHarari40', 'sofShmaHarari25', 'sofTfillaHarari40', 'sofTfillaHarari25', 'minchaGedolaHarari40', 'minchaGedolaHarari25',
    'minchaKetanaHarari40', 'minchaKetanaHarari25', 'plagHarari40', 'plagHarari25',
    'sofShmaBenIshChai', 'sofTfillaBenIshChai', 'plagBenIshChai', 'sofShmaGraFixed', 'sofTfillaGraFixed', 'sofShmaMga72Fixed', 'minchaKetanaFixed', 'plagFixed']);
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
/** Dip of the horizon with standard terrestrial refraction, arcminutes per sqrt(meter) (Nautical Almanac / Bowditch). */
const DIP_ARCMIN_PER_SQRT_M = 1.76;
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
/**
 * Dip of the visible sea/plain horizon seen from [elevation] meters, degrees: D = 1.76' * sqrt(h m), the standard
 * dip with terrestrial refraction (the line of sight to the horizon bends down with the Earth, so the horizon looks
 * higher than the purely geometric arccos(R / (R + h)) = 1.93' * sqrt(h)). Sources: Nautical Almanac, "Dip" table
 * and its explanation; N. Bowditch, The American Practical Navigator (Pub. 9), chapter "Sight reduction", dip
 * correction D = 1.76' sqrt(h); A. T. Young, "Dip of the horizon" (aty.sdsu.edu). None below sea level.
 */
export function horizonDip(elevation) {
    return elevation > 0 ? DIP_ARCMIN_PER_SQRT_M * Math.sqrt(elevation) / 60 : 0;
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
/**
 * Dawn 72 minutes (4 mil of 18 min) before sunrise, as the sun's depth at that time in Jerusalem at the equinox.
 * Pesachim 94a (4 mil, R. Yehuda); Biur Halacha OC 89:1 ("sha'a vechomesh sha'a" before netz, per the Rambam) - checked in the text.
 * Birur Zmanim vol 1 p.66: 72 min in Eretz Yisrael at the equinox is about 16 deg (see SOURCES.md).
 */
const ALOT = 16.1;
/** Dawn 90 minutes (5 mil of 18 min). Pesachim 93b; SA OC 459:2 and Mishna Berura 459:15 (mil = 18 min).
 * Birur Zmanim vol 1 p.66: 90 min is about 19.75 deg; Bein Hashmashot (Tukachinsky) p.105: dawn 1.5 hours before sunrise;
 * Birur Zmanim vol 2 pp.209-239: calendars rightly use 90, MGA hours run dawn to nightfall. */
const ALOT_90 = 19.8;
/** Misheyakir (earliest tallit and tefillin): Berachot 9b; SA OC 18:3. The angles are accepted estimates (about 50 / 48 / 44 min). */
const MISHEYAKIR = 11.5;
const MISHEYAKIR_11 = 11;
const MISHEYAKIR_10_2 = 10.2;
/**
 * Stringent (later) misheyakir, 10.5 deg: when one recognises an acquaintance at 4 amot / tells tchelet from lavan
 * (SA OC 18:3, 30:1, 58:1). Published angles span about 10.2-11.5 deg (en.wikipedia.org/wiki/Zmanim); 10.5 waits until
 * it is clearly light enough.
 */
const MISHEYAKIR_LECHUMRA = 10.5;
/** Three small stars (about 36 min): Biur Halacha OC 293:2 ("three small stars") - checked in the text; the angle is an estimate. */
const TZEIT = 8.5;
/**
 * Three medium stars (an observational estimate), 7.083 deg (7 deg 5 min). Dr. Baruch (Berthold) Cohn's letter in Shu"t
 * Melamed LeHo'il (R. D. Z. Hoffmann) part 1, siman 30: he set the sun 7 deg 5 min below the horizon for three medium
 * stars - checked in the text. Hebcal uses the same angle (end of Tisha B'Av; hebcal.com/home/4463).
 */
const TZEIT_7083 = 7.083;
/**
 * Dawn when the light spreads over the whole face of the east, the sun 12 deg below the horizon: Dr. Baruch (Berthold)
 * Cohn's letters in Shu"t Melamed LeHo'il part 1, siman 30 (he says his tables should also give this time, which in his
 * view is dawn) - checked in the text. With TZEIT_7083 it bounds the plagAlot12Tzeit7083 day.
 */
const ALOT_12 = 12;
/**
 * The Geonim: 3/4 mil (13.5 min) after sunset. Shabbat 34b; SA OC 261:2. Rav Ovadia Yosef rules 13.5 seasonal minutes after
 * the visible sunset (Kitzur Yalkut Yosef OC, Hilchot Shabbat) - checked in the text; that is the tzeit13p5z line.
 */
const TZEIT_GEONIM = 3.7;
/** Rav Yaakov Moshe Hillel's nightfall for the afternoon zmanim, 3.8 deg. */
const TZEIT_HILLEL = 3.8;
/**
 * Misheyakir 7.65 deg (about 36 min): Igrot Moshe OC 4:6 ("about 35, perhaps 40 minutes before netz") - checked in the text;
 * 12.85 deg (about 57 min): Rav Binyamin Zilber, Birur Halacha OC 18, for a time of need (cited at shulchanaruchharav.com/?p=13111).
 */
const MISHEYAKIR_7_65 = 7.65;
const MISHEYAKIR_12_85 = 12.85;
/**
 * Baal HaTanya (Chabad): netz / shkia amiti at the sun's centre 1.583 deg below the true horizon; dawn 16.9 deg; nightfall 6 deg
 * (chabad.org, "About Our Zmanim Calculations", aid 3209349: netz/shkia amiti at the sun's centre 1.583 deg below the
 * horizon, dawn 16.9 deg, nightfall 6 deg). Note: Shulchan Aruch HaRav OC 261:5 rules like Rabbeinu Tam for the end of Shabbat (4 mil; a mil of 24 min is the
 * main view, 18 min to be strict - OC 459:10) and OC 89:1 puts dawn 4 mil before netz - checked in the text; see tzeitRt96.
 */
const BAAL_HATANYA_HORIZON = 1.583;
const ALOT_BAAL_HATANYA = 16.9;
const TZEIT_BAAL_HATANYA = 6;
/** Rav Y. M. Tucazinsky's tzeit (Birur Halacha, Yoreh De'ah 262): the sun 6.45 deg below the true horizon.
 * Bein Hashmashot (Tukachinsky) pp.50, 67, 72: three medium stars in Jerusalem 22-28 min after sunset, average 25. */
const TZEIT_645 = 6.45;
/**
 * The Yereim's bein hashmashot: 3/4 mil (24 minutes a mil = 18 minutes) before sunset, by the sun's position: its
 * height above the true horizon 18 minutes before sea-level sunset in Jerusalem at the equinox, computed with this
 * library's own SPA (2.990 deg in March, 2.995 deg in September 2026). Sefer Yereim: bein hashmashot is 3/4 mil, beginning
 * before Ulla's sunset - checked in the text. Bein Hashmashot (Tukachinsky) p.33; Birur Zmanim vol 2 pp.228-231.
 */
const BH_YEREIM = 2.99;
/**
 * 18 minutes (3/4 mil at 24 minutes a mil) expressed by the sun's position: how far the sun is below
 * the true horizon 18 minutes after sea-level sunset in Jerusalem at the equinox, computed with this
 * library's own SPA (4.655 deg in March, 4.661 deg in September 2026). Jerusalem maariv 17-18 min after sunset per
 * R. Shmuel Salant: Bein Hashmashot (Tukachinsky) pp.71-72.
 */
const TZEIT_18_SUN = 4.66;
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
        // The requested day is the one whose local solar noon falls on [date] on the place's own clock. Solar noon is
        // about 12:00 local mean time (UTC minus 4 minutes per degree of east longitude); if, read on the zone's clock,
        // it lands on another date (only in zones far from their longitude, near the date line), shift by the difference.
        let d = date;
        if (place.rawOffsetMinutes !== undefined) {
            const noonUtc = utcMidnight(date) + 12 * 3600000 - place.lng * 240000;
            const onZoneClock = new Date(noonUtc + place.rawOffsetMinutes * MINUTE_MS);
            const shownDay = Date.UTC(onZoneClock.getUTCFullYear(), onZoneClock.getUTCMonth(), onZoneClock.getUTCDate());
            const dayDiff = Math.round((utcMidnight(date) - shownDay) / DAY_MS);
            if (dayDiff !== 0)
                d = addDays(date, dayDiff);
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
    /** 12:00 local mean time (longitude / 15 hours from UTC) of this day. */
    get chatzotFixed() { return this.lmtMidnight + DAY_MS / 2 - this.place.lng * 240000; }
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
    /** MGA day of [before] fixed minutes before sea-level sunrise to as many after sea-level sunset. */
    mgaFixed(before, hours) {
        return Day.shaahBased(this.sunrise() - before * MINUTE_MS, this.sunset() + before * MINUTE_MS, hours);
    }
    /** MGA day in seasonal minutes: [part] of the sunrise..sunset day before sunrise and after sunset (1/10 = 72z, 1/8 = 90z). */
    mgaSeasonal(part, hours) {
        const p = 12 * part;
        return Day.shaahBased(this.gra(-p), this.gra(12 + p), hours);
    }
    /** MGA day by 19.8 deg: from alot90 to the sun 19.8 deg below in the evening. */
    /** Magen Avraham's day from alot (degrees below the horizon) to Rav Tucazinsky's tzeit (6.45 deg). */
    alotToTzeit645(alotDeg, hours) {
        return Day.shaahBased(this.rise(GEOMETRIC_ZENITH + alotDeg), this.set(GEOMETRIC_ZENITH + TZEIT_645), hours);
    }
    mga19(hours) {
        return Day.shaahBased(this.rise(GEOMETRIC_ZENITH + ALOT_90), this.set(GEOMETRIC_ZENITH + ALOT_90), hours);
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
    const baalHatanya = (h) => Day.shaahBased(today.rise(G + BAAL_HATANYA_HORIZON), today.set(G + BAAL_HATANYA_HORIZON), h);
    const harari = (after, h) => Day.shaahBased(today.gra(-1.2), today.sunset() + after * MINUTE_MS, h);
    const hillelEnd = () => today.set(G + TZEIT_HILLEL);
    const hillelHour = () => (hillelEnd() - today.rise(G + ALOT)) / 12;
    const geonimEnd = () => today.set(G + TZEIT_GEONIM);
    const geonimHour = () => (geonimEnd() - today.rise(G + ALOT)) / 12;
    // [part] of the way from [start] to fixed local chatzot.
    const halfTo = (start, part) => start + (today.chatzotFixed - start) * part;
    const asym = (h) => Day.shaahBased(today.rise(G + ALOT), today.set(G + TZEIT_7083), h);
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
            case 'misheyakirLechumra':
                ms = today.rise(G + MISHEYAKIR_LECHUMRA);
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
            // Plag 1.25 hours before the end of the day: Birur Zmanim vol 1 pp.320-321; vol 2 pp.257-268.
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
            // Height: on Mount Carmel sunrise under 3 min earlier, sunset 2-3 min later - Bein Hashmashot (Tukachinsky) p.105.
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
            // Mil of 18 / 22.5 / 24 min and who holds each: Bein Hashmashot (Tukachinsky) pp.18-19; Birur Zmanim vol 2 pp.33-35.
            case 'tzeitRt72':
                ms = today.sunset() + 72 * MINUTE_MS;
                break;
            // Rabbeinu Tam 4 mil of 22.5 / 24 min: Igrot Moshe OC 4:62 (72, strictest 96); Shulchan Aruch HaRav OC 261:5 with
            // OC 459:10 (mil of 24 min the main view) - checked in the text.
            case 'tzeitRt90':
                ms = today.sunset() + 90 * MINUTE_MS;
                break;
            case 'tzeitRt96':
                ms = today.sunset() + 96 * MINUTE_MS;
                break;
            // The same 72 as seasonal minutes: a tenth of the sunrise..sunset day (12 + 1.2 temporal hours).
            case 'tzeitRt72Zmanis':
                ms = today.gra(13.2);
                break;
            // The same by degrees: the sun 16.1 deg below, its depth 72 minutes after sunset at the Jerusalem equinox.
            case 'tzeitRt16':
                ms = today.set(G + ALOT);
                break;
            // Other measures of the Magen Avraham's dawn-to-nightfall day: 90 / 120 fixed minutes (5 mil of 18 min; 5 mil of
            // 24 min, Pesachim 93b, Rambam on Mishna Pesachim 3:2), 19.8 deg, and 72 / 90 seasonal minutes (1/10, 1/8 of the GRA day).
            case 'sofShmaMga120':
                ms = today.mgaFixed(120, 3);
                break;
            case 'sofTfillaMga120':
                ms = today.mgaFixed(120, 4);
                break;
            case 'plagMga120':
                ms = today.mgaFixed(120, 10.75);
                break;
            case 'sofShmaMga90':
                ms = today.mgaFixed(90, 3);
                break;
            case 'sofTfillaMga90':
                ms = today.mgaFixed(90, 4);
                break;
            case 'plagMga90':
                ms = today.mgaFixed(90, 10.75);
                break;
            case 'sofShmaMga19':
                ms = today.mga19(3);
                break;
            case 'sofTfillaMga19':
                ms = today.mga19(4);
                break;
            case 'plagMga19':
                ms = today.mga19(10.75);
                break;
            case 'plagAlot90Tzeit645':
                ms = today.alotToTzeit645(ALOT_90, 10.75);
                break;
            case 'plagAlot72Tzeit645':
                ms = today.alotToTzeit645(ALOT, 10.75);
                break;
            // Dr. Baruch Cohn (Melamed LeHo'il 1:30): dawn at 12 deg, nightfall at 7 deg 5 min.
            case 'alot12':
                ms = today.rise(G + ALOT_12);
                break;
            case 'plagAlot12Tzeit7083':
                ms = Day.shaahBased(today.rise(G + ALOT_12), today.set(G + TZEIT_7083), 10.75);
                break;
            case 'beinHashmashotYereim':
                ms = today.set(G - BH_YEREIM);
                break;
            case 'tzeit645':
                ms = today.set(G + TZEIT_645);
                break;
            case 'sofShmaMga90z':
                ms = today.mgaSeasonal(1 / 8, 3);
                break;
            case 'sofTfillaMga90z':
                ms = today.mgaSeasonal(1 / 8, 4);
                break;
            case 'plagMga90z':
                ms = today.mgaSeasonal(1 / 8, 10.75);
                break;
            case 'sofShmaMga72z':
                ms = today.mgaSeasonal(1 / 10, 3);
                break;
            case 'sofTfillaMga72z':
                ms = today.mgaSeasonal(1 / 10, 4);
                break;
            case 'plagMga72z':
                ms = today.mgaSeasonal(1 / 10, 10.75);
                break;
            // Seasonal-minute dawn and nightfall: a tenth (72) or an eighth (90) of the sunrise..sunset day.
            case 'alot72z':
                ms = today.gra(-1.2);
                break;
            // Shulchan Aruch HaRav OC 89:1 (dawn 4 mil before netz) with OC 459:10 (a mil of 24 min is the main view):
            // 96 minutes - checked in the text. Some read the Shulchan Aruch HaRav as 5 mil = 120 minutes (HaMichlol,
            // "Alot HaShachar" note 3, citing R. A. L. Kaplan and R. Elashvili for the 96-minute reading).
            case 'alot96':
                ms = today.sunrise() - 96 * MINUTE_MS;
                break;
            case 'alot120':
                ms = today.sunrise() - 120 * MINUTE_MS;
                break;
            case 'alot90z':
                ms = today.gra(-1.5);
                break;
            case 'tzeit90z':
                ms = today.gra(13.5);
                break;
            // Nightfall in fixed minutes after sunset (13.5 = 3/4 mil of 18; 18 = 3/4 mil of 24; the rest community customs).
            case 'tzeit13p5':
                ms = today.sunset() + 13.5 * MINUTE_MS;
                break;
            case 'tzeit18':
                ms = today.sunset() + 18 * MINUTE_MS;
                break;
            case 'tzeit18Sun':
                ms = today.set(G + TZEIT_18_SUN);
                break;
            // Baghdad custom: a third of an hour after sunset - Ben Ish Chai, Shana Rishona, Vayakhel 4, checked in the text.
            case 'tzeit20':
                ms = today.sunset() + 20 * MINUTE_MS;
                break;
            case 'tzeit24':
                ms = today.sunset() + 24 * MINUTE_MS;
                break;
            case 'tzeit30':
                ms = today.sunset() + 30 * MINUTE_MS;
                break;
            // Chazon Ish: Yom Kippur ends 40 min after sunset, Shabbat 45, a brit 35 - Birur Zmanim vol 2 p.18.
            case 'tzeit40':
                ms = today.sunset() + 40 * MINUTE_MS;
                break;
            case 'tzeit45':
                ms = today.sunset() + 45 * MINUTE_MS;
                break;
            // New York: "not less than 50 minutes" for the end of Shabbat - Igrot Moshe OC 4:62, checked in the text.
            case 'tzeit50':
                ms = today.sunset() + 50 * MINUTE_MS;
                break;
            // Rav Ovadia Yosef: 13.5 seasonal minutes (3/4 mil) after sunset - Kitzur Yalkut Yosef OC, checked in the text.
            case 'tzeit13p5z':
                ms = today.gra(12 + 13.5 / 60);
                break;
            // Rabbeinu Tam: twilight starts 3.25 mil after sunset (4 mil less its last 3/4 mil; SA OC 261:2), 58.5 min.
            // The Minchat Kohen's reading of Rabbeinu Tam (nightfall when three stars are seen): Birur Zmanim vol 2 pp.11-14.
            case 'beinHashmashotRt':
                ms = today.sunset() + 58.5 * MINUTE_MS;
                break;
            case 'misheyakir7p65':
                ms = today.rise(G + MISHEYAKIR_7_65);
                break;
            case 'misheyakir12p85':
                ms = today.rise(G + MISHEYAKIR_12_85);
                break;
            case 'misheyakir66':
                ms = today.sunrise() - 66 * MINUTE_MS;
                break;
            case 'misheyakir60':
                ms = today.sunrise() - 60 * MINUTE_MS;
                break;
            case 'misheyakir40':
                ms = today.sunrise() - 40 * MINUTE_MS;
                break;
            // Baal HaTanya: a day from netz amiti to shkia amiti, the sun's centre 1.583 deg below the true horizon.
            case 'alotBaalHatanya':
                ms = today.rise(G + ALOT_BAAL_HATANYA);
                break;
            case 'sunriseBaalHatanya':
                ms = today.rise(G + BAAL_HATANYA_HORIZON);
                break;
            case 'sunsetBaalHatanya':
                ms = today.set(G + BAAL_HATANYA_HORIZON);
                break;
            case 'tzeitBaalHatanya':
                ms = today.set(G + TZEIT_BAAL_HATANYA);
                break;
            case 'sofShmaBaalHatanya':
                ms = baalHatanya(3);
                break;
            case 'sofTfillaBaalHatanya':
                ms = baalHatanya(4);
                break;
            case 'minchaGedolaBaalHatanya':
                ms = baalHatanya(6.5);
                break;
            case 'minchaKetanaBaalHatanya':
                ms = baalHatanya(9.5);
                break;
            case 'plagBaalHatanya':
                ms = baalHatanya(10.75);
                break;
            // Chacham Yosef Harari-Raful's method: a day from seasonal-72 dawn to sunset + 40 (outside Israel) / + 25 (Israel).
            case 'sofShmaHarari40':
                ms = harari(40, 3);
                break;
            case 'sofShmaHarari25':
                ms = harari(25, 3);
                break;
            case 'sofTfillaHarari40':
                ms = harari(40, 4);
                break;
            case 'sofTfillaHarari25':
                ms = harari(25, 4);
                break;
            case 'minchaGedolaHarari40':
                ms = harari(40, 6.5);
                break;
            case 'minchaGedolaHarari25':
                ms = harari(25, 6.5);
                break;
            case 'minchaKetanaHarari40':
                ms = harari(40, 9.5);
                break;
            case 'minchaKetanaHarari25':
                ms = harari(25, 9.5);
                break;
            case 'plagHarari40':
                ms = harari(40, 10.75);
                break;
            case 'plagHarari25':
                ms = harari(25, 10.75);
                break;
            // Rav Yaakov Moshe Hillel's method: hours of a day from dawn 16.1 deg to nightfall 3.7 / 3.8 deg.
            case 'minchaGedolaHillel':
                ms = Math.max(today.chatzot + 30 * MINUTE_MS, today.chatzot + (today.set(G + TZEIT_GEONIM) - today.rise(G + ALOT)) / 24);
                break;
            case 'minchaKetanaHillel':
                ms = hillelEnd() - hillelHour() * 2.5;
                break;
            case 'plagHillel':
                ms = hillelEnd() - hillelHour() * 1.25;
                break;
            // Hours from dawn 16.1 deg, the day ending at the Geonim's nightfall 3.7 deg (secondary source, not checked in the text).
            case 'plagAlotTzeitGeonim':
                ms = geonimEnd() - geonimHour() * 1.25;
                break;
            // Fixed local chatzot (12:00 local mean time; Aruch HaShulchan OC 233:14, Igrot Moshe OC 1:24, 2:20).
            case 'chatzotFixedLocal':
                ms = today.chatzotFixed;
                break;
            case 'sofShmaGraFixed':
                ms = halfTo(today.sunrise(), 1 / 2);
                break;
            case 'sofTfillaGraFixed':
                ms = halfTo(today.sunrise(), 2 / 3);
                break;
            case 'sofShmaMga72Fixed':
                ms = halfTo(today.sunrise() - 72 * MINUTE_MS, 1 / 2);
                break;
            case 'sofShmaMga16Fixed':
                ms = halfTo(today.rise(G + ALOT), 1 / 2);
                break;
            case 'minchaGedolaFixed':
                ms = today.chatzotFixed + 30 * MINUTE_MS;
                break;
            case 'minchaKetanaFixed':
                ms = today.chatzotFixed + (today.sunset() - today.chatzotFixed) / 6 * 3.5;
                break;
            case 'plagFixed':
                ms = today.chatzotFixed + (today.sunset() - today.chatzotFixed) / 6 * 4.75;
                break;
            // An asymmetric day: dawn 16.1 deg to nightfall 7.083 deg (Ben Ish Chai and others).
            case 'sofShmaAsym':
                ms = asym(3);
                break;
            case 'sofTfillaAsym':
                ms = asym(4);
                break;
            // Ben Ish Chai (Shana Rishona, Vayakhel): hours counted from dawn to nightfall, nightfall being a third of an
            // hour after sunset (the Baghdad custom he received) - checked in the text. Dawn: 72 minutes (Pesachim 94a).
            case 'sofShmaBenIshChai':
                ms = Day.shaahBased(today.rise(G + ALOT), today.sunset() + 20 * MINUTE_MS, 3);
                break;
            case 'sofTfillaBenIshChai':
                ms = Day.shaahBased(today.rise(G + ALOT), today.sunset() + 20 * MINUTE_MS, 4);
                break;
            case 'plagBenIshChai':
                ms = Day.shaahBased(today.rise(G + ALOT), today.sunset() + 20 * MINUTE_MS, 10.75);
                break;
            case 'plagAsym':
                ms = asym(10.75);
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
