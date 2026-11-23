import { assetGeneration, readAsset } from './places.js';
let cached = null;
/** The explanation of [name] in [lang]; loads only that language's file, once. Undefined for an unknown name. */
export async function getExplanation(name, lang) {
    if (cached?.generation !== assetGeneration)
        cached = { generation: assetGeneration, files: new Map() };
    let file = cached.files.get(lang);
    if (!file) {
        file = readAsset(`explanations-${lang}.json`).then((b) => JSON.parse(new TextDecoder().decode(b)));
        cached.files.set(lang, file);
    }
    return (await file)[name];
}
