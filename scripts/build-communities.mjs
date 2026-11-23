// data/communities.json -> assets/communities.json (minified, sources dropped: they live in data/ and the README).
import { readFileSync, writeFileSync } from 'node:fs'

const data = JSON.parse(readFileSync('data/communities.json', 'utf8'))
for (const c of data.communities) if (!c.id || !c.he || !c.en || !c.sources?.length) throw new Error(`community ${c.id}: missing field or source`)
const out = {
  communities: data.communities.map(({ id, he, en, groups }) => ({ id, he, en, groups })),
  cities: data.cities,
  countries: data.countries,
}
writeFileSync('assets/communities.json', JSON.stringify(out))
