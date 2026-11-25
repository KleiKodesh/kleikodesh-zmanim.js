import { computeZmanim, HORIZON_ZMANIM, NO_TERRAIN, TERRAIN_BINS, TERRAIN_ZMANIM, ZMAN_NAMES } from './zmanim.js';
import { parseAtmospheres } from './horizon.js';
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
/** Bumped by configure(): other modules' asset caches (geo.ts) reload after it. */
export let assetGeneration = 0;
/** Reads one asset file through the configured loader. */
export const readAsset = (file) => loader(file);
/** Where the asset files are: a base URL for the default fetch loader, or a loader of your own. */
export function configure(options) {
    if (options.baseUrl !== undefined)
        baseUrl = options.baseUrl;
    if (options.loader !== undefined)
        loader = options.loader;
    assetGeneration++;
    names.clear();
    folded.clear();
    bin = null;
    tz = null;
    climate = null;
    horizon.clear();
    atmospheres = null;
    placeCache.clear();
}
// Caches: two name lists, one binary table, one zone table, and a few recent places.
const names = new Map();
let bin = null;
let tz = null;
let climate = null;
const horizon = new Map();
let atmospheres = null;
const placeCache = new Map();
/** Bytes per record in climate.bin: 12 monthly mean temperatures, int8 C; -128 = unknown. */
export const CLIMATE_RECORD_SIZE = 12;
const NO_TEMPERATURE = -128;
function climateTable() {
    if (!climate) {
        climate = loader('climate.bin').then((buffer) => new Int8Array(buffer));
        climate.catch(() => { climate = null; });
    }
    return climate;
}
/** Places per horizon chunk file (assets/horizon-NN.bin, NN = id / HORIZON_CHUNK). */
export const HORIZON_CHUNK = 64;
/**
 * A place's terrain horizon (TERRAIN_BINS int16 values, hundredths of a degree; see Coordinates.terrainHorizon), or null
 * for a place without one (e.g. added after the horizon data was built). Loads only that place's chunk (about 31 KB).
 */
export async function getTerrainHorizon(id) {
    if (!Number.isInteger(id) || id < 1)
        return null;
    const c = Math.floor(id / HORIZON_CHUNK);
    let chunk = horizon.get(c);
    if (!chunk) {
        const file = `horizon-${String(c).padStart(2, '0')}.bin`;
        const p = loader(file).then((buffer) => new Int16Array(buffer), () => null);
        horizon.set(c, p);
        chunk = p;
    }
    const t = await chunk;
    const o = (id % HORIZON_CHUNK) * TERRAIN_BINS;
    if (!t || o + TERRAIN_BINS > t.length)
        return null;
    const row = t.subarray(o, o + TERRAIN_BINS);
    return row.every((v) => v === NO_TERRAIN) ? null : row;
}
/** A place's 12 monthly mean temperatures (C; NaN where unknown). Loads climate.bin once. */
export async function getMonthlyTemperatures(id) {
    const t = await climateTable();
    const o = id * CLIMATE_RECORD_SIZE;
    if (o + CLIMATE_RECORD_SIZE > t.length)
        return new Array(12).fill(NaN);
    return Array.from(t.subarray(o, o + CLIMATE_RECORD_SIZE), (v) => (v === NO_TEMPERATURE ? NaN : v));
}
/** The model atmospheres for ray-traced horizon refraction (atmosphere.bin, 25 KB), loaded once on first need. */
export function getAtmospheres() {
    if (!atmospheres) {
        atmospheres = loader('atmosphere.bin').then(parseAtmospheres);
        atmospheres.catch(() => { atmospheres = null; });
    }
    return atmospheres;
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
// Each language's names folded for search, built on the first search in that language only.
const folded = new Map();
function foldedNames(lang) {
    let list = folded.get(lang);
    if (!list) {
        list = listPlaces(lang).then((l) => l.map(fold));
        list.catch(() => folded.delete(lang));
        folded.set(lang, list);
    }
    return list;
}
/** Places whose [lang] name contains [query] (case, accents and Hebrew points ignored); prefix matches first. */
export async function searchPlaces(query, lang, limit = 50) {
    const q = fold(query.trim());
    const [list, keys] = await Promise.all([listPlaces(lang), foldedNames(lang)]);
    const starts = [];
    const contains = [];
    for (let id = 1; id < list.length; id++) {
        const at = keys[id].indexOf(q);
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
/** The listed place nearest to a point (squared-degree distance). Reads places.bin only, builds no place objects. */
export async function nearestPlaceId(lat, lng) {
    const view = await table();
    const count = view.byteLength / RECORD_SIZE - 1;
    let best = 1;
    let bestDistance = Infinity;
    for (let id = 1; id <= count; id++) {
        const o = id * RECORD_SIZE;
        const distance = (view.getInt32(o, true) / SCALE - lat) ** 2 + (view.getInt32(o + 4, true) / SCALE - lng) ** 2;
        if (distance < bestDistance) {
            bestDistance = distance;
            best = id;
        }
    }
    return best;
}
/** One place's coordinates and zone. Record 0 is unused, so the record offset is id x RECORD_SIZE. */
export async function getPlace(id) {
    const cached = placeCache.get(id);
    if (cached)
        return cached;
    const [view, zoneTable, temps] = await Promise.all([table(), zones(), getMonthlyTemperatures(id)]);
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
        monthlyTemperatureC: Object.freeze(temps),
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
    let p = typeof place === 'number' ? await getPlace(place) : place;
    // the place's horizon chunk is loaded only when a terrain line is asked for.
    if (p.terrainHorizon === undefined && typeof p.id === 'number' && which.some((n) => TERRAIN_ZMANIM.has(n))) {
        p = { ...p, terrainHorizon: await getTerrainHorizon(p.id) };
    }
    // the model atmospheres are loaded only when a horizon line is asked for.
    if (p.atmospheres === undefined && which.some((n) => HORIZON_ZMANIM.has(n)))
        p = { ...p, atmospheres: await getAtmospheres() };
    return computeZmanim(p, toCivilDate(date), which);
}
