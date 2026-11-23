// One-off lookup for a few hand-picked places: Wikidata (CC0) search candidates with coordinates,
// Hebrew/English labels, elevation (P2044) and type, plus Open-Meteo elevation (CC BY 4.0) at the
// coordinates. Writes data/places-lookup.tsv for a human to pick from; never edits places.tsv.
// Usage: node scripts/places-lookup.mjs "Name|search words" ...  (or the QUERIES list below)
import fs from 'node:fs';

const UA = 'kleikodesh-zmanim.js build script (https://github.com/KleiKodesh/kleikodesh-zmanim.js)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJson(url) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } }).catch(e => ({ ok: false, status: e.message }));
    if (r.ok) return r.json();
    console.log(`  http ${r.status} (try ${i + 1})`);
    await sleep(3000 * 2 ** i);
  }
  throw new Error('giving up: ' + url);
}

const QUERIES = process.argv.slice(2).length ? process.argv.slice(2) : [
  'Ramat Beit Shemesh Aleph', 'Ramat Beit Shemesh Bet', 'Ramat Beit Shemesh Gimel', 'Ramat Beit Shemesh',
  'Nofei Aviv', 'Kiryat Sefer', 'Brachfeld', 'Green Park Modiin Illit', 'Green Park', 'Modiin Illit', 'Beit Shemesh', 'Lucerne',
];

const rows = [['query', 'qid', 'en', 'he', 'lat', 'lng', 'wikidataElevation', 'openMeteoElevation', 'types', 'description']];
for (const q of QUERIES) {
  const ids = new Set();
  for (const lang of ['en', 'he']) {
    const s = await getJson(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&limit=10&uselang=en&language=${lang}&search=${encodeURIComponent(q)}`);
    for (const x of s.search ?? []) ids.add(x.id);
    await sleep(1500);
  }
  if (!ids.size) { console.log(`${q}: no candidates`); continue }
  const e = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|claims|descriptions&languages=en|he&ids=${[...ids].join('|')}`);
  await sleep(1500);
  for (const [qid, ent] of Object.entries(e.entities ?? {})) {
    const co = ent.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
    if (!co) continue;
    const elev = ent.claims?.P2044?.[0]?.mainsnak?.datavalue?.value?.amount ?? '';
    const types = (ent.claims?.P31 ?? []).map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean).join(',');
    let om = '';
    try {
      const m = await getJson(`https://api.open-meteo.com/v1/elevation?latitude=${co.latitude}&longitude=${co.longitude}`);
      om = m.elevation?.[0] ?? '';
    } catch { /* leave empty */ }
    const row = [q, qid, ent.labels?.en?.value ?? '', ent.labels?.he?.value ?? '', co.latitude, co.longitude, elev, om, types, ent.descriptions?.en?.value ?? ''];
    rows.push(row);
    console.log([q, qid, row[2], row[3] ? 'he:yes' : 'he:no', co.latitude, co.longitude, elev, om, types, row[9]].join(' | '));
  }
}
fs.writeFileSync('data/places-lookup.tsv', rows.map(r => r.map(v => String(v).replace(/[\t\r\n]/g, ' ')).join('\t')).join('\n') + '\n');
