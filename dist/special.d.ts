import { type CivilDate, type Coordinates, type Rounding } from './zmanim.js';
/** The kinds of special day, and the zmanim each one adds. */
export declare const SPECIAL_KINDS: {
    readonly erevPesach: readonly ["sofAchilatChametzMga", "sofAchilatChametzMga16", "sofAchilatChametzGra", "sofBiurChametzMga", "sofBiurChametzMga16", "sofBiurChametzGra"];
    readonly fastDay: readonly ["fastStart90", "fastStart72", "fastStart16"];
    readonly kiddushLevana: readonly ["kiddushLevanaStart3", "kiddushLevanaStart7", "kiddushLevanaEndHalf", "kiddushLevanaEnd15"];
};
export type SpecialKind = keyof typeof SPECIAL_KINDS;
export type SpecialZmanName = typeof SPECIAL_KINDS[SpecialKind][number];
export declare const SPECIAL_ZMAN_NAMES: readonly SpecialZmanName[];
/**
 * Stringent rounding: the chametz deadlines and the start of a fast (the end of eating) round DOWN; the earliest
 * kiddush levana rounds UP and its latest rounds DOWN. The end of a fast is a tzeit line (ZMAN_NAMES), rounded up.
 */
export declare const SPECIAL_ROUNDING: Readonly<Record<SpecialZmanName, Rounding>>;
/** Mean lunar month 29 d 12 h 793 chalakim (Rambam, Kiddush HaChodesh 6:3). */
export declare const MOLAD_INTERVAL_MS: number;
/** Epoch ms (UTC) of the [n]th molad since BaHaRaD (n = months elapsed since Tishrei of year 1). */
export declare function moladMs(n: number): number;
/** Index of the last molad at or before [ms] (epoch ms, UTC). */
export declare function moladIndexAtOrBefore(ms: number): number;
/**
 * Instants (epoch ns) of the [kind]'s zmanim on [date]. Kiddush levana: the molad is the last one before the end of
 * [date] (UTC), and its four instants may fall on other days; the caller prints their dates.
 */
export declare function specialZmanInstants(place: Coordinates, date: CivilDate, kind: SpecialKind): Partial<Record<SpecialZmanName, bigint | null>>;
/** The [kind]'s zmanim printed HH:MM in the place's zone, rounded by SPECIAL_ROUNDING (null where none). */
export declare function specialZmanim(place: Coordinates, date: CivilDate, kind: SpecialKind): Partial<Record<SpecialZmanName, string | null>>;
