// Writes references/README.md: for every cited source, a link to a free full-text copy (open access) when one
// exists, with its licence. Links only - no copies are stored. Run in CI.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const recs = JSON.parse(readFileSync('citations/records.json', 'utf8'))
const extra = JSON.parse(readFileSync('scripts/references-extra.json', 'utf8'))
const UA = { 'User-Agent': 'kleikodesh-zmanim reference collector (https://github.com/KleiKodesh/kleikodesh-zmanim.js)' }
mkdirSync('references', { recursive: true })
const rows = []
for (const doi of [...recs.map((r) => r.doi), ...extra.dois]) {
  let o; try { o = await (await fetch(`https://api.openalex.org/works/doi:${doi}`, { headers: UA })).json() } catch { continue }
  const loc = [o.best_oa_location, ...(o.locations ?? [])].find((l) => l?.pdf_url || l?.landing_page_url && o.open_access?.is_oa)
  const lic = loc?.license ?? o.best_oa_location?.license ?? 'none'
  rows.push({ doi, title: o.title, year: o.publication_year, license: lic, url: loc?.pdf_url ?? loc?.landing_page_url ?? null })
  console.log(`${loc ? 'FREE ' : 'paid '} ${lic.padEnd(16)} ${doi} ${o.title ?? ''}`)
}
const md = ['# References', '', 'Free full-text links for the sources cited in SOURCES.md (links only; no copies are stored here).', '',
  '| title | year | DOI | free full text | licence |', '| --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.title ?? ''} | ${r.year ?? ''} | https://doi.org/${r.doi} | ${r.url ?? 'none found'} | ${r.license} |`), '']
writeFileSync('references/README.md', md.join('\n'))
