// For each cited DOI: prints the abstract and every passage of the open full text that contains one of the terms
// in scripts/claims.json, so the attributed statements can be checked against the source. Run after verify-citations.
import { readFileSync, existsSync } from 'node:fs'
const claims = JSON.parse(readFileSync('scripts/claims.json', 'utf8'))
const recs = JSON.parse(readFileSync('citations/records.json', 'utf8'))
for (const r of recs) {
  console.log(`\n===== ${r.doi} | ${r.title} (${r.year}) ${r.venue} ${r.volume}:${r.pages}`)
  if (r.abstract) console.log(`ABSTRACT: ${r.abstract}`)
  let t = r.fulltext && existsSync(r.fulltext) ? readFileSync(r.fulltext, 'utf8') : ''
  if (r.fulltext?.endsWith('.html')) t = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
  t = t.replace(/\s+/g, ' ')
  console.log(`FULLTEXT: ${t.length} chars`)
  for (const term of claims[r.doi] ?? []) {
    const re = new RegExp(term, 'gi'); let m, n = 0
    while ((m = re.exec(t)) && n < 4) { n++; console.log(`[${term}] ...${t.slice(Math.max(0, m.index - 220), m.index + 220)}...`) }
    if (!n) console.log(`[${term}] NOT FOUND`)
  }
}
