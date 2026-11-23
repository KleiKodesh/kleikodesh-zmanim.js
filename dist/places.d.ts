import type { CivilDate, ZmanName } from './zmanim.js';
export type Lang = 'he' | 'en';
/** Reads one asset file (e.g. 'places.bin') and returns its bytes. */
export type AssetLoader = (file: string) => Promise<ArrayBuffer>;
export interface Place {
    id: number;
    lat: number;
    lng: number;
    /** Meters. Sets the air pressure for refraction and the horizon dip of sunriseElevated/sunsetElevated. */
    elevation: number;
    tzid: string;
    rawOffsetMinutes: number;
}
/** Bytes per record in places.bin: lat int32, lng int32 (degrees x 1e5), elevation int16, tz index uint8. */
export declare const RECORD_SIZE = 11;
/** Where the asset files are: a base URL for the default fetch loader, or a loader of your own. */
export declare function configure(options: {
    baseUrl?: string | URL;
    loader?: AssetLoader;
}): void;
/** Bytes per record in climate.bin: 12 monthly mean temperatures, int8 C; -128 = unknown. */
export declare const CLIMATE_RECORD_SIZE = 12;
/** A place's 12 monthly mean temperatures (C; NaN where unknown). Loads climate.bin once. */
export declare function getMonthlyTemperatures(id: number): Promise<number[]>;
/** Every place name in [lang]; the index is the place id (index 0 is empty). Loads only that names file. */
export declare function listPlaces(lang: Lang): Promise<readonly string[]>;
/** Places whose [lang] name contains [query] (case, accents and Hebrew points ignored); prefix matches first. */
export declare function searchPlaces(query: string, lang: Lang, limit?: number): Promise<Array<{
    id: number;
    name: string;
}>>;
/** Number of places (ids are 1..count). Loads places.bin. */
export declare function placeCount(): Promise<number>;
/** One place's coordinates and zone. Record 0 is unused, so the record offset is id x RECORD_SIZE. */
export declare function getPlace(id: number): Promise<Place>;
/** A JS Date (its local calendar date is used) or a civil date. */
export type DateInput = Date | CivilDate;
export declare function toCivilDate(date: DateInput): CivilDate;
/** Only the requested zmanim, printed HH:MM in the place's zone with the library's rounding. */
export declare function zmanim(place: number | Place, date: DateInput, which?: readonly ZmanName[]): Promise<Partial<Record<ZmanName, string | null>>>;
