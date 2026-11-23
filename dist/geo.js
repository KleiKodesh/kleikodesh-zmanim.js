// Each place's country and city (assets/geo.bin + countries.json, scripts/build-geo.mjs),
// for pickers that filter by country, then city, then neighbourhood. Loaded on first need,
// once; configure() makes it load again. Country names are not stored: use
// Intl.DisplayNames with the ISO code, in the UI language.
import { assetGeneration, listPlaces, readAsset } from './places.js';
/** Bytes per place id in geo.bin: uint16 city place id, uint8 country index. */
export const GEO_RECORD_SIZE = 3;
let cached = null;
/** Every place's country and city. Loads geo.bin and countries.json (about 6 KB) once. */
export function listPlaceGeo() {
    if (cached?.generation === assetGeneration)
        return cached.geo;
    const geo = Promise.all([readAsset('geo.bin'), readAsset('countries.json')]).then(([bin, json]) => {
        const view = new DataView(bin);
        const countries = Object.freeze(JSON.parse(new TextDecoder().decode(json)));
        const count = view.byteLength / GEO_RECORD_SIZE - 1;
        const valid = (id) => Number.isInteger(id) && id >= 1 && id <= count;
        return Object.freeze({
            countries,
            count,
            countryOf: (id) => (valid(id) ? countries[view.getUint8(id * GEO_RECORD_SIZE + 2)] ?? '' : ''),
            cityOf: (id) => (valid(id) ? view.getUint16(id * GEO_RECORD_SIZE, true) : 0),
        });
    });
    const entry = { generation: assetGeneration, geo };
    geo.catch(() => { if (cached === entry)
        cached = null; });
    cached = entry;
    return geo;
}
const trees = new Map();
/** "Jaffa (Tel Aviv)" lists as "Jaffa" under Tel Aviv. */
const withoutParent = (name) => name.replace(/\s*\([^()]*\)\s*$/, '');
/**
 * The three-step place picker's data in [lang]. Loads geo.bin, countries.json and that names file once.
 * Only the country list is sorted up front; each country's cities and each city's neighbourhoods are
 * grouped by id in one pass and sorted the first time they are asked for.
 */
export function placeTree(lang) {
    const hit = trees.get(lang);
    if (hit?.generation === assetGeneration)
        return hit.tree;
    const tree = Promise.all([listPlaceGeo(), listPlaces(lang)]).then(([geo, names]) => {
        const collator = new Intl.Collator(lang);
        const byName = (a, b) => collator.compare(a.name, b.name);
        const cityIds = new Map();
        const memberIds = new Map();
        for (let id = 1; id <= geo.count; id++) {
            const city = geo.cityOf(id);
            if (city === id) {
                const country = geo.countryOf(id);
                const list = cityIds.get(country);
                if (list)
                    list.push(id);
                else
                    cityIds.set(country, [id]);
            }
            else {
                const list = memberIds.get(city);
                if (list)
                    list.push(id);
                else
                    memberIds.set(city, [id]);
            }
        }
        const countryName = new Intl.DisplayNames([lang], { type: 'region' });
        const countries = Object.freeze([...cityIds.keys()].map((code) => ({ key: code, name: countryName.of(code) ?? code })).sort(byName));
        const sortedCities = new Map();
        const sortedPlaces = new Map();
        const none = Object.freeze([]);
        return Object.freeze({
            countries,
            citiesOf: (country) => {
                let list = sortedCities.get(country);
                if (!list) {
                    const ids = cityIds.get(country);
                    if (!ids)
                        return none;
                    list = Object.freeze(ids.map((id) => ({ key: id, name: names[id] ?? '' })).sort(byName));
                    sortedCities.set(country, list);
                }
                return list;
            },
            placesOf: (city) => {
                let list = sortedPlaces.get(city);
                if (!list) {
                    const members = (memberIds.get(city) ?? []).map((id) => ({ key: id, name: withoutParent(names[id] ?? '') })).sort(byName);
                    list = Object.freeze([{ key: city, name: names[city] ?? '' }, ...members]);
                    sortedPlaces.set(city, list);
                }
                return list;
            },
            countryOf: geo.countryOf,
            cityOf: geo.cityOf,
        });
    });
    const entry = { generation: assetGeneration, tree };
    tree.catch(() => { if (trees.get(lang) === entry)
        trees.delete(lang); });
    trees.set(lang, entry);
    return tree;
}
