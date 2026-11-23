// Looks up a few neighbourhood points in OpenStreetMap (Nominatim) for review.
// Insubstantial extract (< 100 features), (c) OpenStreetMap contributors, ODbL 1.0.
import { writeFileSync } from 'node:fs';

const UA = 'kleikodesh-zmanim.js build script (https://github.com/KleiKodesh/kleikodesh-zmanim.js)';
const BS = { s: 31.68, n: 31.78, w: 34.95, e: 35.03 };
const MI = { s: 31.90, n: 31.96, w: 35.01, e: 35.08 };
const PLACES = [
  { key: 'ramatBeitShemeshAleph', box: BS, q: ['Ramat Beit Shemesh Aleph', 'רמת בית שמש א', "רמת בית שמש א'"] },
  { key: 'ramatBeitShemeshBet', box: BS, q: ['Ramat Beit Shemesh Bet', 'רמת בית שמש ב', "רמת בית שמש ב'"] },
  { key: 'ramatBeitShemeshGimel', box: BS, q: ['Ramat Beit Shemesh Gimel', 'רמת בית שמש ג', "רמת בית שמש ג'"] },
  { key: 'nofeiAviv', box: BS, q: ['Nofei Aviv', 'נופי אביב'] },
  { key: 'kiryatSefer', box: MI, q: ['Kiryat Sefer, Modi\'in Illit', 'קריית ספר', 'קרית ספר'] },
  { key: 'brachfeld', box: MI, q: ['Brachfeld', 'ברכפלד'] },
  { key: 'greenPark', box: MI, q: ['Green Park, Modi\'in Illit', 'גרין פארק', 'גן הפארק'] },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const inBox = (b, lat, lng) => lat >= b.s && lat <= b.n && lng >= b.w && lng <= b.e;
const rows = ['key\the\ten\tlat\tlng\televation\ttzid\tsource'];
for (const p of PLACES) {
  let best = null;
  for (const q of p.q) {
    const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&namedetails=1&countrycodes=il&limit=10&q=${encodeURIComponent(q)}`;
    const res = await (await fetch(u, { headers: { 'User-Agent': UA } })).json();
    await sleep(1100);
    for (const r of res) {
      const lat = +r.lat, lng = +r.lon, nd = r.namedetails || {};
      const ok = inBox(p.box, lat, lng);
      console.log(`${p.key} q=${JSON.stringify(q)} -> ${r.osm_type}/${r.osm_id} ${r.category}=${r.type} ${lat.toFixed(5)},${lng.toFixed(5)} he=${nd['name:he'] ?? nd.name} en=${nd['name:en'] ?? ''} ${ok ? 'IN' : 'out'}`);
      if (!best && ok && ['place', 'boundary', 'landuse'].includes(r.category)) best = { r, lat, lng, nd };
    }
  }
  if (!best) { console.log(`${p.key}: NOT FOUND`); continue; }
  const { r, lat, lng, nd } = best;
  const el = await (await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`)).json();
  const elev = Math.round(el.elevation[0]);
  console.log(`${p.key}: PICK ${r.osm_type}/${r.osm_id} ${lat.toFixed(5)},${lng.toFixed(5)} elev ${elev}`);
  rows.push([p.key, nd['name:he'] ?? nd.name ?? '', nd['name:en'] ?? '', lat.toFixed(5), lng.toFixed(5), elev, 'Asia/Jerusalem', `OSM:${r.osm_type}/${r.osm_id}`].join('\t'));
}
writeFileSync('data/osm-points.tsv', rows.join('\n') + '\n');
