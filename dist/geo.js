// Each place's country and city (assets/geo.bin + countries.json, scripts/build-geo.mjs),
// for pickers that filter by country, then city, then neighbourhood. Loaded on first need,
// once; configure() makes it load again. Country names are not stored: use
// Intl.DisplayNames with the ISO code, in the UI language.
import { assetGeneration, readAsset } from './places.js';
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
