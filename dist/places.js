import { computeZmanim, ZMAN_NAMES } from './zmanim.js';
/** Bytes per record in places.bin: lat int32, lng int32 (degrees x 1e5), elevation int16, tz index uint8. */
export const RECORD_SIZE = 11;
const SCALE = 1e5;
let baseUrl = new URL('../assets/', import.meta.url);
let loader = async (file) => {
    const response = await fetch(new URL(file, baseUrl));
    if (!response.ok)
        throw new Error(`kleikodesh-zmanim: cannot load ${file} (${response.status})`);
    return response.arrayBuffer();
};
/** Where the asset files are: a base URL for the default fetch loader, or a loader of your own. */
export function configure(options) {
    if (options.baseUrl !== undefined)
        baseUrl = options.baseUrl;
    if (options.loader !== undefined)
        loader = options.loader;
    names.clear();
    bin = null;
    tz = null;
    climate = null;
    placeCache.clear();
}
// Caches: two name lists, one binary table, one zone table, and a few recent places.
const names = new Map();
let bin = null;
let tz = null;
let climate = null;
const placeCache = new Map();
/** Bytes per record in climate.bin: 12 monthly mean temperatures, int8 C; -128 = unknown. */
export const CLIMATE_RECORD_SIZE = 12;
const NO_TEMPERATURE = -128;
/** Zmanim that depend on sunrise/sunset (and so on refraction); only these load climate.bin. */
const HORIZON_ZMANIM = new Set(['sunrise', 'sunset', 'sofShmaMga', 'sofShmaGra',
    'sofTfillaMga', 'sofTfillaGra', 'minchaGedola', 'minchaKetana', 'plag']);
function climateTable() {
    if (!climate) {
        climate = loader('climate.bin').then((buffer) => new Int8Array(buffer));
        climate.catch(() => { climate = null; });
    }
    return climate;
}
/** A place's 12 monthly mean temperatures (C; NaN where unknown). Loads climate.bin once. */
export async function getMonthlyTemperatures(id) {
    const t = await climateTable();
    const o = id * CLIMATE_RECORD_SIZE;
    if (o + CLIMATE_RECORD_SIZE > t.length)
        return new Array(12).fill(NaN);
    return Array.from(t.subarray(o, o + CLIMATE_RECORD_SIZE), (v) => (v === NO_TEMPERATURE ? NaN : v));
}
const PLACE_CACHE_SIZE = 16;
const text = async (file) => new TextDecoder().decode(await loader(file));
/** Every place name in [lang]; the index is the place id (index 0 is empty). Loads only that names file. */
export function listPlaces(lang) {
    let list = names.get(lang);
    if (!list) {
        list = text(`names-${lang}.txt`).then((t) => Object.freeze(t.replace(/\r?\n$/, '').split(/\r?\n/)));
        list.catch(() => names.delete(lang));
        names.set(lang, list);
    }
    return list;
}
const fold = (s) => s.normalize('NFD').replace(/[̀-֑ͯ-ׇ]/g, '').toLowerCase();
/** Places whose [lang] name contains [query] (case, accents and Hebrew points ignored); prefix matches first. */
export async function searchPlaces(query, lang, limit = 50) {
    const q = fold(query.trim());
    const list = await listPlaces(lang);
    const starts = [];
    const contains = [];
    for (let id = 1; id < list.length; id++) {
        const at = fold(list[id]).indexOf(q);
        if (at === 0)
            starts.push({ id, name: list[id] });
        else if (at > 0)
            contains.push({ id, name: list[id] });
    }
    return starts.concat(contains).slice(0, limit);
}
/** Number of places (ids are 1..count). Loads places.bin. */
export async function placeCount() {
    return (await table()).byteLength / RECORD_SIZE - 1;
}
function table() {
    if (!bin) {
        bin = loader('places.bin').then((buffer) => new DataView(buffer));
        bin.catch(() => { bin = null; });
    }
    return bin;
}
function zones() {
    if (!tz) {
        tz = text('tz.json').then((t) => JSON.parse(t));
        tz.catch(() => { tz = null; });
    }
    return tz;
}
/** One place's coordinates and zone. Record 0 is unused, so the record offset is id x RECORD_SIZE. */
export async function getPlace(id) {
    const cached = placeCache.get(id);
    if (cached)
        return cached;
    const [view, zoneTable] = await Promise.all([table(), zones()]);
    const offset = id * RECORD_SIZE;
    if (!Number.isInteger(id) || id < 1 || offset + RECORD_SIZE > view.byteLength)
        throw new RangeError(`No place with id ${id}`);
    const zone = view.getUint8(offset + 10);
    const place = Object.freeze({
        id,
        lat: view.getInt32(offset, true) / SCALE,
        lng: view.getInt32(offset + 4, true) / SCALE,
        elevation: view.getInt16(offset + 8, true),
        tzid: zoneTable.ids[zone],
        rawOffsetMinutes: zoneTable.rawOffsetMinutes[zone],
    });
    if (placeCache.size >= PLACE_CACHE_SIZE)
        placeCache.delete(placeCache.keys().next().value);
    placeCache.set(id, place);
    return place;
}
export function toCivilDate(date) {
    return date instanceof Date ? { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() } : date;
}
/** Only the requested zmanim, printed HH:MM in the place's zone with the library's rounding. */
export async function zmanim(place, date, which = ZMAN_NAMES) {
    const p = typeof place === 'number' ? await getPlace(place) : place;
    if (!which.some((n) => HORIZON_ZMANIM.has(n)))
        return computeZmanim(p, toCivilDate(date), which);
    return computeZmanim({ ...p, monthlyTemperatureC: await getMonthlyTemperatures(p.id) }, toCivilDate(date), which);
}
