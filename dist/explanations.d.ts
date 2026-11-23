import type { Lang } from './places.js';
import type { ZmanName } from './zmanim.js';
/** What a zman is, the method of this line, and its sources, in one language. */
export interface Explanation {
    title: string;
    text: string;
    sources: readonly string[];
}
/** The explanation of [name] in [lang]; loads only that language's file, once. Undefined for an unknown name. */
export declare function getExplanation(name: ZmanName, lang: Lang): Promise<Explanation | undefined>;
