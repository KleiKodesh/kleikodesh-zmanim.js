// data/explanations.json -> assets/explanations-he.json, assets/explanations-en.json ({ name: { title, text, sources } }, minified).
import { readFileSync, writeFileSync } from 'node:fs'

const all = JSON.parse(readFileSync('data/explanations.json', 'utf8'))
for (const lang of ['he', 'en']) {
  const out = {}
  for (const [name, entry] of Object.entries(all)) {
    const e = entry[lang]
    if (!e?.title || !e.text || !Array.isArray(e.sources) || e.sources.length === 0) throw new Error(`${name}: missing ${lang}`)
    out[name] = { title: e.title, text: e.text, sources: e.sources }
  }
  writeFileSync(`assets/explanations-${lang}.json`, JSON.stringify(out))
}
