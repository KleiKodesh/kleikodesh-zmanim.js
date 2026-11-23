// Community customs (assets/communities.json, from data/communities.json): which opinion line is primary per zman
// group, and candle lighting by city and country. Loaded on first need, once; configure() makes it load again.
import { listPlaceGeo } from './geo.js';
import { assetGeneration, readAsset } from './places.js';
/** The zman groups a community can choose a primary line for. */
export const ZMAN_GROUPS = ['alot', 'misheyakir', 'sofShma', 'sofTfilla', 'minchaGedola', 'plag', 'sunrise', 'sunset',
    'candles', 'tzeit', 'tzeitShabbat'];
let cached = null;
function load() {
    if (cached?.generation === assetGeneration)
        return cached.data;
    const data = readAsset('communities.json').then((b) => JSON.parse(new TextDecoder().decode(b)));
    const entry = { generation: assetGeneration, data };
    data.catch(() => { if (cached === entry)
        cached = null; });
    cached = entry;
    return data;
}
/** Every community: id and its name in `lang`. */
export async function listCommunities(lang) {
    return (await load()).communities.map((c) => ({ id: c.id, name: c[lang] }));
}
/** One community, or undefined for an unknown id. */
export async function getCommunity(id) {
    return (await load()).communities.find((c) => c.id === id);
}
async function cityCustom(placeId) {
    const [data, geo] = await Promise.all([load(), listPlaceGeo()]);
    const city = data.cities[String(geo.cityOf(placeId))] ?? data.cities[String(placeId)];
    return { data, city, country: geo.countryOf(placeId) };
}
/** The community a place's city follows by public custom (e.g. Jerusalem), or null. */
export async function defaultCommunityFor(placeId) {
    return (await cityCustom(placeId)).city?.community ?? null;
}
/** The candle-lighting line customary in the place's city, else its country, else 18 minutes. */
export async function defaultCandlesFor(placeId) {
    const { data, city, country } = await cityCustom(placeId);
    return city?.candles ?? data.countries[country] ?? data.countries['*'] ?? 'candles18';
}
/**
 * The primary line per group for a community (null = none chosen). With a place, candles falls back to the
 * place's custom when the community has none.
 */
export async function primaryZmanim(communityId, placeId) {
    const groups = { ...(communityId ? (await getCommunity(communityId))?.groups : undefined) };
    if (!groups.candles && placeId !== undefined)
        groups.candles = await defaultCandlesFor(placeId);
    return groups;
}
