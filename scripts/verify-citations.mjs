// Prints the public record (Crossref metadata + OpenAlex abstract) of every DOI cited in SOURCES.md, and saves the
// open-access full text when one exists, so each citation can be checked against its source. Run in CI.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const text = readFileSync('SOURCES.md', 'utf8')
const dois = [...new Set([...text.matchAll(/10\.\d{4,9}\/[^\s)|,;\]]+/g)].map((m) => m[0].replace(/[.]$/, '')))]
mkdirSync('citations', { recursive: true })
const UA = { 'User-Agent': 'kleikodesh-zmanim citation check (https://github.com/KleiKodesh/kleikodesh-zmanim.js)' }
const out = []
for (const doi of dois) {
  const rec = { doi }
  try {
    const c = (await (await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, { headers: UA })).json()).message
    rec.title = c.title?.[0]; rec.authors = (c.author ?? []).map((a) => `${a.family}, ${a.given ?? ''}`.trim())
    rec.year = c.issued?.['date-parts']?.[0]?.[0]; rec.venue = c['container-title']?.[0]; rec.volume = c.volume; rec.pages = c.page
  } catch (e) { rec.crossref = `failed: ${e.message}` }
  try {
    const o = await (await fetch(`https://api.openalex.org/works/doi:${doi}`, { headers: UA })).json()
    const inv = o.abstract_inverted_index
    if (inv) { const w = []; for (const [k, ps] of Object.entries(inv)) for (const p of ps) w[p] = k; rec.abstract = w.join(' ') }
    // Try every open-access location until one serves a real PDF; else keep the first HTML page.
    const urls = [...new Set([o.best_oa_location?.pdf_url, ...(o.locations ?? []).map((l) => l.pdf_url), o.open_access?.oa_url,
      ...(o.locations ?? []).map((l) => l.landing_page_url)].filter(Boolean))]
    const safe = doi.replace(/[^\w.-]/g, '_')
    for (const url of urls) {
      try {
        const buf = Buffer.from(await (await fetch(url, { headers: UA, redirect: 'follow' })).arrayBuffer())
        if (buf.subarray(0, 4).toString() === '%PDF') {
          writeFileSync(`citations/${safe}.pdf`, buf); rec.oa = url
          try { execFileSync('pdftotext', ['-layout', `citations/${safe}.pdf`, `citations/${safe}.txt`]); rec.fulltext = `citations/${safe}.txt` } catch {}
          break
        }
        if (!rec.fulltext) { writeFileSync(`citations/${safe}.html`, buf); rec.fulltext = `citations/${safe}.html`; rec.oa = url }
      } catch {}
    }
  } catch (e) { rec.openalex = `failed: ${e.message}` }
  console.log(JSON.stringify(rec, null, 1))
  out.push(rec)
}
writeFileSync('citations/records.json', JSON.stringify(out, null, 1))
