// Saves into references/ every cited source whose licence allows redistribution (Creative Commons or public
// domain), with references/README.md listing each file, its licence and where it came from. Run in CI.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
const recs = JSON.parse(readFileSync('citations/records.json', 'utf8'))
const extra = JSON.parse(readFileSync('scripts/references-extra.json', 'utf8'))
const UA = { 'User-Agent': 'kleikodesh-zmanim reference collector (https://github.com/KleiKodesh/kleikodesh-zmanim.js)' }
mkdirSync('references', { recursive: true })
const rows = []
for (const doi of [...recs.map((r) => r.doi), ...extra.dois]) {
  let o; try { o = await (await fetch(`https://api.openalex.org/works/doi:${doi}`, { headers: UA })).json() } catch { continue }
  const loc = [o.best_oa_location, ...(o.locations ?? [])].find((l) => l?.pdf_url && /^(cc|public-domain)/.test(l.license ?? ''))
  const lic = loc?.license ?? o.best_oa_location?.license ?? 'none'
  const name = doi.replace(/[^\w.-]/g, '_') + '.pdf'
  let saved = false
  if (loc) {
    try {
      const b = Buffer.from(await (await fetch(loc.pdf_url, { headers: UA, redirect: 'follow' })).arrayBuffer())
      if (b.subarray(0, 4).toString() === '%PDF') { writeFileSync(`references/${name}`, b); saved = true }
    } catch {}
  }
  rows.push({ doi, title: o.title, year: o.publication_year, license: lic, file: saved ? name : null, url: loc?.pdf_url ?? null })
  console.log(`${saved ? 'SAVED' : 'skip '} ${lic.padEnd(16)} ${doi} ${o.title ?? ''}`)
}
for (const f of extra.files) {
  try {
    const b = Buffer.from(await (await fetch(f.url, { headers: UA, redirect: 'follow' })).arrayBuffer())
    writeFileSync(`references/${f.name}`, b); rows.push({ title: f.title, license: f.license, file: f.name, url: f.url })
    console.log(`SAVED ${f.license} ${f.name}`)
  } catch (e) { console.log(`FAIL ${f.name} ${e.message}`) }
}
const md = ['# References', '', 'Copies of cited sources whose licence allows redistribution (Creative Commons or public domain).',
  'Sources under other licences are cited in SOURCES.md only.', '', '| file | title | year | licence | DOI / source |', '| --- | --- | --- | --- | --- |',
  ...rows.filter((r) => r.file).map((r) => `| ${r.file} | ${r.title ?? ''} | ${r.year ?? ''} | ${r.license} | ${r.doi ? 'https://doi.org/' + r.doi : r.url} |`), '']
writeFileSync('references/README.md', md.join('\n'))
