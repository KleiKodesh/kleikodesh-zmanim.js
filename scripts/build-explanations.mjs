// data/explanations.json -> docs/zmanim.md (English) and docs/zmanim.he.md (Hebrew). Documentation only, not shipped.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const all = JSON.parse(readFileSync('data/explanations.json', 'utf8'))
const intro = {
  en: '# Zmanim explanations\n\nGenerated from `data/explanations.json` by `scripts/build-explanations.mjs`. Do not edit by hand.\n',
  he: '<div dir="rtl">\n\n# הסברי הזמנים\n\n<!-- Generated from data/explanations.json by scripts/build-explanations.mjs. Do not edit by hand. -->\n',
}
const sourcesLabel = { en: 'Sources', he: 'מקורות' }
mkdirSync('docs', { recursive: true })
for (const lang of ['en', 'he']) {
  let md = intro[lang]
  for (const [name, entry] of Object.entries(all)) {
    const e = entry[lang]
    if (!e?.title || !e.text || !Array.isArray(e.sources) || e.sources.length === 0) throw new Error(`${name}: missing ${lang}`)
    md += `\n<a id="${name}"></a>\n\n## ${e.title}\n\n${e.text}\n\n**${sourcesLabel[lang]}:**\n\n${e.sources.map(s => `- ${s}`).join('\n')}\n`
  }
  if (lang === 'he') md += '\n</div>\n'
  writeFileSync(lang === 'en' ? 'docs/zmanim.md' : 'docs/zmanim.he.md', md)
}
