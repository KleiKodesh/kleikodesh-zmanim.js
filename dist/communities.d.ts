import type { Lang } from './places.js';
import type { ZmanName } from './zmanim.js';
/** The zman groups a community can choose a primary line for. */
export declare const ZMAN_GROUPS: readonly ["alot", "misheyakir", "sofShma", "sofTfilla", "minchaGedola", "plag", "sunrise", "sunset", "candles", "tzeit", "tzeitShabbat"];
export type ZmanGroup = typeof ZMAN_GROUPS[number];
export interface Community {
    id: string;
    he: string;
    en: string;
    /** Only the groups with a documented custom; the others keep the app's default line. */
    groups: Readonly<Partial<Record<ZmanGroup, ZmanName>>>;
}
/** Every community: id and its name in `lang`. */
export declare function listCommunities(lang: Lang): Promise<Array<{
    id: string;
    name: string;
}>>;
/** One community, or undefined for an unknown id. */
export declare function getCommunity(id: string): Promise<Community | undefined>;
/** The community a place's city follows by public custom (e.g. Jerusalem), or null. */
export declare function defaultCommunityFor(placeId: number): Promise<string | null>;
/** The candle-lighting line customary in the place's city, else its country, else 18 minutes. */
export declare function defaultCandlesFor(placeId: number): Promise<ZmanName>;
/**
 * The primary line per group for a community (null = none chosen). With a place, candles falls back to the
 * place's custom when the community has none.
 */
export declare function primaryZmanim(communityId: string | null, placeId?: number): Promise<Partial<Record<ZmanGroup, ZmanName>>>;
