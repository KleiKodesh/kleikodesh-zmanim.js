import type { Lang } from './places.js'
import { assetGeneration, readAsset } from './places.js'
import type { ZmanName } from './zmanim.js'

/** What a zman is, the method of this line, and its sources, in one language. */
export interface Explanation { title: string, text: string, sources: readonly string[] }

let cached: { generation: number, files: Map<Lang, Promise<Readonly<Record<string, Explanation>>>> } | null = null

/** The explanation of [name] in [lang]; loads only that language's file, once. Undefined for an unknown name. */
export async function getExplanation(name: ZmanName, lang: Lang): Promise<Explanation | undefined> {
  if (cached?.generation !== assetGeneration) cached = { generation: assetGeneration, files: new Map() }
  let file = cached.files.get(lang)
  if (!file) {
    file = readAsset(`explanations-${lang}.json`).then((b) => JSON.parse(new TextDecoder().decode(b)))
    cached.files.set(lang, file)
  }
  return (await file)[name]
}
