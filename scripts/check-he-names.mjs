// Compares the Hebrew name of every place (data/places.tsv, column he) with the Wikidata
// Hebrew label and the Hebrew Wikipedia title of the matching Wikidata item.
// The item is found by searching the English name and taking the candidate with
// coordinates nearest to ours (within 30 km). Runs in CI (see check-he-names.yml).
// Env: SHARD, SHARDS (split rows by id % SHARDS), OUT (default data/he-name-report.tsv).
import fs from 'node:fs';

const UA = 'kleikodesh-zmanim.js build script (https://github.com/KleiKodesh/kleikodesh-zmanim.js)';
const SHARD = +(process.env.SHARD ?? 0), SHARDS = +(process.env.SHARDS ?? 1);
const OUT = process.env.OUT ?? 'data/he-name-report.tsv';
const API = 'https://www.wikidata.org/w/api.php';

const rows = fs.readFileSync('data/places.tsv', 'utf8').trim().split('\n').slice(1)
  .map(l => l.split('\t')).filter(c => +c[0] % SHARDS === SHARD);

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(params) {
  const url = API + '?' + new URLSearchParams({ format: 'json', ...params });
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.ok) return await r.json();
      if (r.status !== 429 && r.status < 500) throw new Error('HTTP ' + r.status);
    } catch (e) { if (i === 5) throw e; }
    await sleep(2000 * (i + 1));
  }
}
function km(a, b, c, d) {
  const R = 6371, t = Math.PI / 180;
  const x = Math.sin((c - a) * t / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin((d - b) * t / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const clean = s => (s ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim();

const out = ['id\tkey\tours\twikidata_he\thewiki_title\tverdict\tqid\tkm'];
let n = 0;
for (const [id, key, he, en, lat, lng] of rows) {
  const names = [...new Set([clean(en), en.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim(), clean(en).split(',')[0]])];
  let best = null;
  for (const q of names) {
    for (const lang of ['en', 'he']) {
      const s = await api({ action: 'wbsearchentities', search: lang === 'he' ? he : q, language: lang, limit: '10', type: 'item' });
      const ids = (s?.search ?? []).map(x => x.id);
      if (!ids.length) continue;
      const e = await api({ action: 'wbgetentities', ids: ids.join('|'), props: 'labels|claims|sitelinks', languages: 'he' });
      for (const ent of ids.map(i => e?.entities?.[i]).filter(Boolean)) {
        const c = ent.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
        if (!c) continue;
        const d = km(+lat, +lng, c.latitude, c.longitude);
        if (d <= 30) { best = { d, ent }; break; }
      }
      if (best) break;
    }
    if (best) break;
  }
  const wd = best?.ent.labels?.he?.value ?? '';
  const wt = clean(best?.ent.sitelinks?.hewiki?.title ?? '');
  const verdict = !wd && !wt ? 'none' : (wd === he || wt === he ? 'same' : 'differs');
  out.push([id, key, he, wd, wt, verdict, best?.ent.id ?? '', best ? best.d.toFixed(1) : ''].join('\t'));
  if (++n % 25 === 0) console.log(`${n}/${rows.length}`);
}
fs.writeFileSync(OUT, out.join('\n') + '\n');
console.log('done', n);
