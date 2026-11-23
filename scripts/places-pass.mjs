// Finds places listed in data/places-todo.txt on Wikidata (CC0) and fills missing
// elevations from Open-Meteo (CC BY 4.0). Appends to data/places-new.tsv; uncertain
// items go to data/places-flagged.txt. Resumable via data/places-pass-state.json.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const UA = 'kleikodesh-zmanim.js build script (https://github.com/KleiKodesh/kleikodesh-zmanim.js)';
const NEW = 'data/places-new.tsv', TODO = 'data/places-todo.txt', FLAG = 'data/places-flagged.txt', STATE = 'data/places-pass-state.json';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHECKPOINT = process.env.CHECKPOINT === '1';

async function getJson(url, tries = 6) {
  for (let i = 0; i < tries; i++) {
    try {
      const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 30000);
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ac.signal });
      clearTimeout(t);
      if (r.ok) return await r.json();
      console.log(`  http ${r.status} (try ${i + 1})`);
    } catch (e) { console.log(`  error ${e.message} (try ${i + 1})`); }
    await sleep(2000 * 2 ** i);
  }
  throw new Error('giving up: ' + url);
}

const COUNTRY = { // context word -> [Wikidata country QID, default tz]
  Israel: ['Q801', 'Asia/Jerusalem'], 'United States': ['Q30', 'America/New_York'], Canada: ['Q16', 'America/Toronto'],
  France: ['Q142', 'Europe/Paris'], Germany: ['Q183', 'Europe/Berlin'], Switzerland: ['Q39', 'Europe/Zurich'],
  Italy: ['Q38', 'Europe/Rome'], Spain: ['Q29', 'Europe/Madrid'], Ukraine: ['Q212', 'Europe/Kyiv'],
  Lithuania: ['Q37', 'Europe/Vilnius'], Latvia: ['Q211', 'Europe/Riga'], Estonia: ['Q191', 'Europe/Tallinn'],
  Poland: ['Q36', 'Europe/Warsaw'], Slovakia: ['Q214', 'Europe/Bratislava'], Finland: ['Q33', 'Europe/Helsinki'],
  Ireland: ['Q27', 'Europe/Dublin'], Bulgaria: ['Q219', 'Europe/Sofia'], Serbia: ['Q403', 'Europe/Belgrade'],
  'United Kingdom': ['Q145', 'Europe/London'], Tunisia: ['Q948', 'Africa/Tunis'], Bolivia: ['Q750', 'America/La_Paz'],
  Morocco: ['Q1028', 'Africa/Casablanca'], Azerbaijan: ['Q227', 'Asia/Baku'], Uzbekistan: ['Q265', 'Asia/Tashkent'],
  Australia: ['Q408', 'Australia/Brisbane'], 'United Arab Emirates': ['Q878', 'Asia/Dubai'], Brazil: ['Q155', 'America/Sao_Paulo'],
};
const REGION_TZ = { Illinois: 'America/Chicago', Alberta: 'America/Edmonton', Quebec: 'America/Toronto', Recife: 'America/Recife', Ceuta: 'Africa/Ceuta' };
const BAD_DESC = /arab|palestin|refugee camp|disambiguation|family name|surname|given name|film|album|song|band|ship|street|station|airport|heliport|county\b|river|lake|mountain|school|church|synagogue|company|library|mall|reservoir|cemetery|bridge|college|university|building|chamber|plantation|arena|country in|gmina|stadium|hospital|park\b|house|museum/i;

const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[Łł]/g, 'l').replace(/['’-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const camel = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^./, c => c.toLowerCase());

function readTsv(f) {
  const [h, ...rows] = fs.readFileSync(f, 'utf8').replace(/\r/g, '').split('\n').filter(Boolean);
  const cols = h.split('\t');
  return { cols, rows: rows.map(r => Object.fromEntries(r.split('\t').map((v, i) => [cols[i], v]))) };
}
function writeTsv(f, t) { fs.writeFileSync(f, [t.cols.join('\t'), ...t.rows.map(r => t.cols.map(c => r[c] ?? '').join('\t'))].join('\n') + '\n'); }

function checkpoint(msg) {
  if (!CHECKPOINT) return;
  try {
    execSync(`git add data && (git diff --cached --quiet || git commit -q -m "${msg}" -m "User-facing: none") && git push -q origin HEAD:places`, { stdio: 'inherit', shell: '/bin/bash' });
    console.log('  checkpoint pushed');
  } catch (e) { console.log('  checkpoint failed: ' + e.message); }
}

const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : { done: {} };
const saveState = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n');
const flags = fs.existsSync(FLAG) ? fs.readFileSync(FLAG, 'utf8').split('\n').filter(Boolean) : [];
const flag = s => { flags.push(s); fs.writeFileSync(FLAG, flags.join('\n') + '\n'); console.log('  FLAG ' + s); };

const existing = readTsv('data/places.tsv').rows;
const neu = readTsv(NEW);
const usedKeys = new Set([...existing, ...neu.rows].map(r => r.key));
const todo = fs.readFileSync(TODO, 'utf8').replace(/\r/g, '').split('\n').filter(Boolean).map(l => l.split('|').map(s => s.trim()));

async function findOne([name, ctx, kind]) {
  const country = Object.keys(COUNTRY).find(c => ctx.includes(c));
  const [cq, ctz] = COUNTRY[country];
  const ctxWords = ctx.split(',').map(s => s.trim()).filter(w => w && w !== country);
  // Two searches: plain name, and name + nearest context (wbsearchentities ranks
  // libraries/malls of the same name above small US villages).
  const ids = new Set();
  for (const q of [name, ctxWords[0] ? `${name} ${ctxWords[0]}` : null].filter(Boolean)) {
    for (const lang of ['en', 'he']) {
      const s = await getJson(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=${lang}&uselang=en&type=item&limit=30&search=${encodeURIComponent(q)}`);
      await sleep(1000);
      s.search.forEach(x => ids.add(x.id));
      if (lang === 'en') break; // he search only useful for Hebrew input
    }
  }
  if (!ids.size) return null;
  const all = [...ids], ents = {};
  for (let i = 0; i < all.length; i += 50) {
    const g = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|aliases|descriptions|claims|sitelinks&languages=en|he&ids=${all.slice(i, i + 50).join('|')}`);
    Object.assign(ents, g.entities);
    await sleep(1000);
  }
  const want = fold(name);
  const cands = [];
  for (const id of all) {
    const e = ents[id]; if (!e?.claims?.P625) continue;
    const countries = (e.claims.P17 || []).map(c => c.mainsnak.datavalue?.value?.id);
    if (!countries.includes(cq)) continue;
    const desc = e.descriptions?.en?.value || '';
    if (BAD_DESC.test(desc)) continue;
    const names = [e.labels?.en?.value, ...(e.aliases?.en || []).map(a => a.value)].filter(Boolean).map(fold);
    if (!names.some(x => x === want || x.startsWith(want + ',') || x.startsWith(want + ' ('))) continue;
    let score = 0;
    for (const w of ctxWords) if (fold(desc).includes(fold(w))) score += 4;
    if (fold(desc).includes(fold(kind.split(' ')[0]))) score += 2;
    if (/\b(city|town|village|hamlet|commune|municipality|capital|neighbou?rhood|census-designated|township|settlement)\b/i.test(desc)) score += 3;
    score += Math.min(3, Object.keys(e.sitelinks || {}).length / 20);
    cands.push({ e, desc, score });
  }
  cands.sort((a, b) => b.score - a.score);
  if (!cands.length) return null;
  const c = cands[0];
  // Sub-national context given (state, city) but description does not mention it.
  const ctxHit = !ctxWords.length || ctxWords.some(w => fold(c.desc).includes(fold(w)));
  return { ...c, ctz, ctxWords, uncertain: !ctxHit };
}

let n = 0, found = 0, notFound = 0;
for (const t of todo) {
  const [name, ctx] = t; n++;
  if (state.done[name]) continue;
  console.log(`[${n}/${todo.length}] ${name} | ${ctx}`);
  let r;
  try { r = await findOne(t); } catch (e) { console.log('  ' + e.message); continue; }
  if (!r) { notFound++; flag(`NOT FOUND: ${t.join(' | ')}`); state.done[name] = 'notfound'; saveState(); continue; }
  const e = r.e, v = e.claims.P625[0].mainsnak.datavalue.value;
  const en0 = e.labels?.en?.value || name;
  const en = /neighbourhood/.test(t[2]) ? `${en0} (${r.ctxWords[0]})` : en0;
  const he = e.labels?.he?.value || e.sitelinks?.hewiki?.title?.replace(/ \(.*\)$/, '') || '';
  if (!he) flag(`NO HEBREW: ${name} ${e.id}`);
  if (r.uncertain) flag(`CHECK MATCH: ${name} -> ${e.id} "${r.desc}"`);
  const tz = Object.entries(REGION_TZ).find(([k]) => ctx.includes(k) || name.includes(k))?.[1] || r.ctz;
  let key = camel(name); while (usedKeys.has(key)) key += 'X';
  usedKeys.add(key);
  neu.rows.push({ key, he, en, lat: v.latitude.toFixed(5), lng: v.longitude.toFixed(5), elevation: '', tzid: tz, source: `Wikidata ${e.id} (coords, names); Open-Meteo (elevation)` });
  writeTsv(NEW, neu); found++;
  console.log(`  -> ${e.id} ${en} / ${he} ${v.latitude.toFixed(5)},${v.longitude.toFixed(5)} ${tz} "${r.desc}"`);
  state.done[name] = e.id; saveState();
  if (found % 50 === 0) checkpoint(`places pass: checkpoint ${n}`);
}

// Elevation from Open-Meteo, batches of 100.
const missing = neu.rows.filter(r => r.elevation === '' && r.lat && r.lng);
console.log(`elevation: ${missing.length} rows missing`);
for (let i = 0; i < missing.length; i += 100) {
  const b = missing.slice(i, i + 100);
  try {
    const j = await getJson(`https://api.open-meteo.com/v1/elevation?latitude=${b.map(r => r.lat).join(',')}&longitude=${b.map(r => r.lng).join(',')}`);
    j.elevation.forEach((el, k) => { if (el != null && !Number.isNaN(el)) b[k].elevation = String(Math.round(el)); });
    writeTsv(NEW, neu);
    console.log(`  elevation batch ${i / 100 + 1}: ${b.length} rows`);
  } catch (e) { console.log('  elevation batch failed: ' + e.message); }
  await sleep(3000);
}
for (const r of neu.rows) if (!r.he) console.log('  still no he: ' + r.key);
const leftElev = neu.rows.filter(r => r.elevation === '').length;
console.log(`SUMMARY: todo ${todo.length}, found this run ${found}, not found ${notFound}, rows ${neu.rows.length}, empty elevation ${leftElev}, empty he ${neu.rows.filter(r => !r.he).length}, flags ${flags.length}`);
checkpoint('places pass: final');
