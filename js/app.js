import { SPECIES, BY_SCI } from './data.js';
import { birdSvg, speciesLook, ballSvg } from './bird.js';
import { catches, photos, kv } from './store.js';
import * as api from './api.js';
import { parseMarks, rank, versusNote, marksFor } from './match.js';
import * as sound from './sound.js';
import * as forecast from './forecast.js';
import { SPRITES } from './sprites.js';
import { makeTracker } from './songid.js';
import { identifyPhoto } from './photo.js';
import { birdNames } from './lite.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad3 = n => String(n).padStart(3, '0');
const fmtDate = d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const today = () => new Date().toISOString().slice(0, 10);

const state = { tab: 'dex', catches: [], nearby: null, loc: null, nearbyErr: null, xp: 0, scroll: {} };

/* ---------- small helpers ---------- */
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, ms);
}
function overlay(html, cls = '') {
  const el = document.createElement('div');
  el.className = 'ov ' + cls; el.innerHTML = html;
  $('#layer').appendChild(el);
  return el;
}
const closeAll = () => { $('#layer').innerHTML = ''; };
// Game Boy Color style sprites (img/birds) where we have one; the drawn icon otherwise.
const slug = sci => sci.toLowerCase().replace(/ /g, '-');
const spriteSrc = sci => SPRITES[slug(sci)] ? `img/birds/${slug(sci)}.png` : null;
const icon = (sci, name, m) => {
  const src = spriteSrc(sci);
  if (!src) return birdSvg(speciesLook(sci, name), m);
  return m?.kind === 'sil' ? `<i class="px sil" style="-webkit-mask-image:url(${src});mask-image:url(${src});background:${m.sil}"></i>` : `<img class="px" src="${src}" alt="" loading="lazy" decoding="async">`;
};
const HAB_WORD = { water: 'water', woods: 'woods', field: 'fields', town: 'towns', edge: 'brush', sky: 'open sky' };
const habitatOf = (sci, name) => BY_SCI[sci]?.hab || ({ duck: 'water', heron: 'water', raptor: 'sky' }[speciesLook(sci, name).t]) || 'edge';
const level = xp => Math.floor(Math.sqrt(xp / 50)) + 1;

function tierOf(sci) {
  const n = state.nearby;
  if (!n) return { name: 'Unknown', xp: 30 };
  if (n.notable.some(x => x.sci === sci)) return { name: 'Rare', xp: 150, rare: true };
  const s = n.species.find(x => x.sci === sci);
  if (!s) return { name: 'Rare here', xp: 120, rare: true };
  if (s.chance >= 0.55) return { name: 'Common', xp: 20 };
  if (s.chance >= 0.25) return { name: 'Uncommon', xp: 40 };
  return { name: 'Scarce', xp: 80 };
}

// iPhone Home Screen apps forget the location permission every launch, so asking on open means a prompt every time.
// Instead reuse the last spot we saved, and only ask again when it's stale for what you're doing
// (Nearby: any saved spot is fine until you tap ↻; a catch: within the last 2 hours) or when you tap ↻.
async function ensureLoc({ fresh = false, maxAge = Infinity } = {}) {
  if (state.loc && !fresh && Date.now() - (state.loc.at || 0) < maxAge) return state.loc;
  const saved = await kv.get('lastLoc');
  let granted = false;
  try { granted = (await navigator.permissions?.query({ name: 'geolocation' }))?.state === 'granted'; } catch {}
  if (!fresh && saved?.manual) return (state.loc = saved);
  if (!fresh && !granted && saved && Date.now() - saved.at < maxAge) return (state.loc = saved);
  try {
    const p = await api.getLocation();
    state.loc = { ...p, at: Date.now() };
    kv.set('lastLoc', state.loc);
  } catch { state.loc = saved || null; }
  return state.loc;
}

async function loadNearby(force) {
  if (state.nearby && !force) return state.nearby;
  state.nearbyErr = null;
  document.body.classList.add('busy');
  try {
    const loc = await ensureLoc({ fresh: !!force });
    if (!loc) throw new Error('GEO_DENIED');
    state.nearby = await api.nearbyData(loc);
  } catch (e) { state.nearbyErr = e.message; }
  document.body.classList.remove('busy');
  return state.nearby;
}

// Candidate pool: birds reported near you, plus the curated set as low-odds backups.
function pool() {
  const out = new Map();
  for (const s of state.nearby?.species || []) out.set(s.sci, { sci: s.sci, name: s.name, code: s.code, chance: s.chance });
  for (const s of state.nearby?.notable || []) if (!out.has(s.sci)) out.set(s.sci, { sci: s.sci, name: s.name, code: s.code, chance: 0.05 });
  for (const s of SPECIES) if (!out.has(s.sci)) out.set(s.sci, { sci: s.sci, name: s.n, chance: state.nearby ? 0.01 : null });
  return [...out.values()];
}

/* ---------- DEX ---------- */
const BADGES = [
  ['MARSH', c => c.filter(x => x.hab === 'water').length, 5],
  ['FOREST', c => c.filter(x => x.hab === 'woods').length, 10],
  ['MEADOW', c => c.filter(x => x.hab === 'field').length, 5],
  ['CITY', c => c.filter(x => x.hab === 'town').length, 5],
  ['RAPTOR', c => c.filter(x => x.hab === 'sky' || speciesLook(x.sci, x.name).t === 'raptor').length, 3],
  ['NIGHT', c => c.filter(x => /owl/i.test(x.name)).length, 1],
  ['EAR', c => c.filter(x => x.sightings.some(s => s.method === 'sound')).length, 1],
  ['RARE', c => c.filter(x => x.rare).length, 1],
];

const earned = list => BADGES.filter(([, f, need]) => f(list) >= need).map(([n]) => n);

async function renderDex() {
  const list = [...state.catches].sort((a, b) => a.first.localeCompare(b.first));
  const v = $('#view');
  const region = state.region || {};
  v.innerHTML = `
    <div class="hdr"><div class="ttl">DEX</div><div class="ctr"><span>LV <b>${level(state.xp)}</b></span><span class="mini">${ballSvg()} <b>${list.length}</b></span></div></div>
    <div class="sub" id="regionLine">${region.line || ''}</div>
    <div class="tools"><button id="cardBtn">TRAINER CARD</button><button id="mapBtn">CATCH MAP</button></div>
    ${list.length ? `<input class="search" id="dexQ" type="search" placeholder="Search your dex" autocomplete="off" value="${esc(state.dexQ || '')}">` : ''}
    ${list.length ? `<div class="grid">${list.map((c, i) => [c, i]).reverse().map(([c, i]) => `
      <button class="t" data-sci="${esc(c.sci)}"><div class="fig">${c.rare ? '<span class="shiny">✦</span>' : ''}${icon(c.sci, c.name)}<i class="gs"></i></div>
      <div class="no">No.${pad3(i + 1)}</div><div class="nm">${esc(c.name)}</div></button>`).join('')}</div>`
    : `<div class="empty">${ballSvg()}<div class="ttl">No birds caught yet</div><div>Swipe the ball up to catch a bird by song, photo, description or from the list.</div></div>`}`;
  v.querySelectorAll('.t').forEach(b => b.onclick = () => openBird(b.dataset.sci));
  const q = v.querySelector('#dexQ');
  if (q) { q.oninput = () => filterRows(v, '.grid .t', state.dexQ = q.value); filterRows(v, '.grid .t', state.dexQ); }
  $('#cardBtn').onclick = openTrainerCard;
  $('#mapBtn').onclick = () => openCatchMap();
  updateRegionLine(list);
}

async function updateRegionLine(list) {
  const n = state.nearby;
  if (!n || (!n.county && !n.state)) return;
  try {
    const caughtSci = new Set(list.map(c => c.sci));
    const parts = [], plain = [];
    for (const code of [n.county, n.state].filter(Boolean)) {
      const [sp, name] = await Promise.all([api.regionSpecies(code), api.regionName(code)]);
      if (!sp.length) continue;
      const have = sp.filter(s => caughtSci.has(s.sci)).length;
      const label = name.split(',')[0] + (code.split('-').length === 3 ? ' Co.' : ' State');
      parts.push(`<span>${esc(label)} <b>${have}/${sp.length}</b> · ${Math.round(100 * have / sp.length)}%</span>`);
      plain.push(`${label} ${have}/${sp.length}`);
    }
    state.region = { line: parts.join(''), text: plain[0] };
    const el = $('#regionLine'); if (el && state.tab === 'dex') el.innerHTML = state.region.line;
  } catch { /* regional dex is a bonus */ }
}

// Hides rows whose name doesn't match; data-sci and the visible name are both searched.
function filterRows(root, sel, q) {
  q = (q || '').trim().toLowerCase();
  let n = 0;
  root.querySelectorAll(sel).forEach(r => { const hit = !q || r.textContent.toLowerCase().includes(q) || (r.dataset.sci || '').toLowerCase().includes(q); r.hidden = !hit; n += hit; });
  let none = root.querySelector('.nohit');
  if (!none) { none = document.createElement('p'); none.className = 'muted nohit'; root.querySelector(sel)?.parentElement?.after(none); }
  none.textContent = q && !n ? `No birds match “${q}”.` : '';
}

const locLabel = () => !state.loc ? 'No location yet' : state.loc.manual ? state.loc.name
  : Date.now() - (state.loc.at || 0) > 3600e3 ? `Where you were ${fmtDate(new Date(state.loc.at).toISOString())}` : 'Where you are now';

// Change the spot Nearby, catches and the forecast use: your phone's location, or any town you search for.
function openLocation() {
  const el = overlay(`<div class="topbar"><button class="close" data-x>◀︎ BACK</button><span class="muted">Location</span></div>
    <div class="card"><p class="muted">Now using: <b>${esc(locLabel())}</b></p><button class="btn full" id="gps">📍 USE WHERE I AM NOW</button></div>
    <div class="card"><h3>OR PICK A PLACE</h3><input id="placeQ" type="search" placeholder="Town, park or zip code" autocomplete="off"><div id="places" class="list" style="margin-top:8px"></div></div>`, 'solid');
  el.querySelector('[data-x]').onclick = () => el.remove();
  const use = async loc => {
    state.loc = loc; await kv.set('lastLoc', loc);
    state.nearby = null; el.remove();
    toast(loc.manual ? `Using ${loc.name}.` : 'Using where you are now.');
    await loadNearby(); render();
  };
  el.querySelector('#gps').onclick = async () => {
    try { const p = await api.getLocation(); use({ ...p, at: Date.now() }); }
    catch { toast('Location is off for this app. Turn it on in Settings → Privacy → Location Services → Safari Websites.'); }
  };
  let t;
  el.querySelector('#placeQ').oninput = e => {
    clearTimeout(t); const q = e.target.value.trim(), box = el.querySelector('#places');
    if (q.length < 2) { box.innerHTML = ''; return; }
    t = setTimeout(async () => {
      const res = await api.findPlace(q).catch(() => null);
      if (!res) { box.innerHTML = '<p class="muted">Couldn\'t search right now. Check your signal.</p>'; return; }
      box.innerHTML = res.length ? res.map((r, i) => `<button class="nr" data-i="${i}"><div class="mid"><b>${esc(r.name)}</b><small>${esc(r.area)}</small></div></button>`).join('') : '<p class="muted">No places found.</p>';
      box.querySelectorAll('.nr').forEach(b => b.onclick = () => { const r = res[+b.dataset.i]; use({ lat: r.lat, lng: r.lng, at: Date.now(), name: r.name, manual: true }); });
    }, 300);
  };
}

/* ---------- NEARBY ---------- */
function seeded(seed) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296); }

function dailyHunt(sp) {
  const caught = new Set(state.catches.map(c => c.sci));
  const todays = new Set(state.catches.filter(c => c.sightings.some(s => s.date.slice(0, 10) === today())).map(c => c.sci));
  const rnd = seeded(today());
  const pick = arr => arr.length ? arr[Math.floor(rnd() * arr.length)] : null;
  const pool = sp.filter(s => !caught.has(s.sci) || todays.has(s.sci));
  const easy = pick(pool.filter(s => s.chance >= 0.5)), med = pick(pool.filter(s => s.chance >= 0.2 && s.chance < 0.5)), hard = pick(pool.filter(s => s.chance < 0.2 && s.hits > 0));
  return [[easy, 'EASY', 60], [med, 'MEDIUM', 100], [hard, 'HARD', 160]].filter(x => x[0]).map(([s, lvl, xp]) => ({ ...s, lvl, xp, done: todays.has(s.sci) }));
}

function clue(s) {
  const o = s.best || s.last;
  const where = o ? `${esc(o.locName)}, ${(o.km ?? s.lastKm ?? 0).toFixed(1)} km away, ${fmtDate(o.obsDt)}` : '';
  const hab = { water: 'Scan still water and edges.', woods: 'Check tree trunks and canopy.', field: 'Look over open fields and wires.', town: 'Try yards, parks and feeders.', edge: 'Search brushy edges and thickets.', sky: 'Watch the sky and tall perches.' }[habitatOf(s.sci, s.name)];
  return `Last reported at ${where}. ${hab}`;
}

async function renderNearby() {
  const v = $('#view');
  const key = await api.ebirdKey();
  if (!key) { v.innerHTML = keyCard(); bindKeyCard(v, renderNearby); return; }
  if (!state.nearby) v.innerHTML = `<div class="hdr"><div class="ttl">NEARBY</div><div class="ctr">LOADING…</div></div>`;
  await loadNearby();
  if (state.tab !== 'nearby') return;
  if (!state.nearby) {
    const msg = state.nearbyErr === 'GEO_DENIED' ? 'Field Dex needs your location to know which birds are around. Turn on Location for Safari (or this app) in Settings, then try again.'
      : state.nearbyErr === 'BAD_KEY' ? 'eBird didn\'t accept your key. Check it in Settings (tap FIELD DEX at the top).'
      : 'Couldn\'t reach eBird right now. Check your signal and try again.';
    v.innerHTML = `<div class="hdr"><div class="ttl">NEARBY</div></div><div class="card"><p>${msg}</p><button class="btn" id="retry">TRY AGAIN</button></div>`;
    $('#retry').onclick = async () => { await loadNearby(true); renderNearby(); };
    return;
  }
  const caught = new Set(state.catches.map(c => c.sci));
  const sp = state.nearby.species.filter(s => s.hits > 0 || s.lastKm < 15).sort((a, b) => b.chance - a.chance);
  const toFind = sp.filter(s => !caught.has(s.sci));
  const hunt = dailyHunt(sp);
  const rares = state.nearby.notable.filter(s => !caught.has(s.sci)).slice(0, 5);
  const row = (s, extra = '') => `<button class="nr" data-sci="${esc(s.sci)}" data-name="${esc(s.name)}"><div class="ic">${icon(s.sci, s.name, { kind: 'sil', sil: '#45684f' })}</div>
    <div class="mid"><b>${esc(s.name)}${extra}</b><div class="bar"><i style="width:${Math.max(3, Math.round(s.chance * 100))}%"></i></div><small>${Math.round(s.chance * 100)}% chance · ${HAB_WORD[habitatOf(s.sci, s.name)]} · ${(s.nearKm ?? s.best?.km ?? s.lastKm).toFixed(1)} km</small></div>
    <span class="rw">+${tierOfChance(s.chance)}</span></button>`;
  v.innerHTML = `<div class="hdr"><div class="ttl">NEARBY</div><div class="ctr"><span><b>${toFind.length}</b> TO FIND</span></div></div>
    <div class="sub"><span>${state.nearby.spotCount} hotspots within 25 km · last 30 days</span><button id="refresh" class="close">↻</button></div>
    <div class="tools"><button id="hotBtn">HOTSPOT MAP · 7 DAYS</button></div>
    <button class="locline" id="locBtn">📍 ${esc(locLabel())} <b>CHANGE</b></button>
    <input class="search" id="nearQ" type="search" placeholder="Search birds near you" autocomplete="off" value="${esc(state.nearQ || '')}">
    <div id="nearHits"></div>
    <div id="fcast"></div>
    <div class="lab">TODAY'S HUNT · ${hunt.filter(h => h.done).length} OF ${hunt.length} FOUND</div>
    <div class="hunt">${hunt.map(h => `<button class="hrow nr ${h.done ? 'done' : ''}" data-sci="${esc(h.sci)}" data-name="${esc(h.name)}"><div class="ic">${icon(h.sci, h.name, h.done ? undefined : { kind: 'sil', sil: '#0c1610' })}</div>
      <div class="mid"><b>${esc(h.name)} <span class="tag">${h.lvl}</span></b><small>${h.done ? 'Found today!' : clue(h)}</small></div><span class="rw">+${h.xp}</span></button>`).join('') || '<p class="muted">Not enough reports nearby yet.</p>'}</div>
    <div id="moves"></div>
    ${rares.length ? `<div class="lab">RARE BIRDS NEARBY · THIS WEEK</div>${rares.map(r => `<button class="nr" data-sci="${esc(r.sci)}" data-name="${esc(r.name)}"><div class="ic">${icon(r.sci, r.name, { kind: 'sil', sil: '#45684f' })}</div><div class="mid"><b>${esc(r.name)}<span class="tag">RARE</span></b><small>${esc(r.obs.locName)}, ${r.km.toFixed(1)} km · ${fmtDate(r.obs.obsDt)}</small></div><span class="rw">+150</span></button>`).join('')}` : ''}
    <div class="lab">STILL TO FIND</div>${toFind.map(s => row(s)).join('')}`;
  $('#refresh').onclick = async () => { await loadNearby(state.loc?.manual ? false : true); renderNearby(); };
  $('#locBtn').onclick = openLocation;
  $('#hotBtn').onclick = openHotspots;
  // Searching shows matching birds near you (caught or not) in one list above everything else.
  const nq = v.querySelector('#nearQ'), hits = v.querySelector('#nearHits');
  const search = () => {
    const q = (state.nearQ = nq.value).trim().toLowerCase();
    v.querySelectorAll(':scope > :not(.hdr):not(.sub):not(#nearQ):not(#nearHits)').forEach(x => x.hidden = !!q);
    if (!q) { hits.innerHTML = ''; return; }
    const all = [...state.nearby.species, ...state.nearby.notable.filter(r => !state.nearby.species.some(s => s.sci === r.sci)).map(r => ({ ...r, chance: 0.05 }))];
    const f = all.filter(s => s.name.toLowerCase().includes(q) || s.sci.toLowerCase().includes(q));
    hits.innerHTML = f.length ? f.slice(0, 40).map(s => row(s, caught.has(s.sci) ? '<span class="tag">CAUGHT</span>' : '')).join('') : `<p class="muted">No birds matching “${esc(q)}” reported near you lately.</p>`;
    hits.querySelectorAll('[data-sci]').forEach(b => b.onclick = () => openBird(b.dataset.sci, b.dataset.name));
  };
  nq.oninput = search; if (state.nearQ) search();
  v.querySelectorAll('[data-sci]').forEach(b => b.onclick = () => openBird(b.dataset.sci, b.dataset.name));
  renderMoves(caught);
  renderForecast();
}

async function getForecast() {
  const loc = await ensureLoc(); if (!loc) return null;
  const wx = await forecast.weather(loc);
  const m = await api.migration(state.nearby?.county).catch(() => null);
  return forecast.score(wx, new Date(), m?.arriving.length || 0);
}

async function renderForecast() {
  const f = await getForecast().catch(() => null);
  const box = $('#fcast'); if (!box || !f) return;
  box.innerHTML = `<button class="fc" id="fcBtn"><div class="fcl"><small>BIRDING ${f.when}</small><b>${f.label}</b></div>
    <div class="stars">${'★'.repeat(f.stars)}<i>${'★'.repeat(5 - f.stars)}</i></div>
    <div class="fcw">${esc(f.why[0])}${f.best ? `<br><span>Best: ${f.best}</span>` : ''}</div>
    <ul hidden>${f.why.slice(1).map(w => `<li>${esc(w)}</li>`).join('')}</ul></button>`;
  $('#fcBtn').onclick = () => { const u = box.querySelector('ul'); u.hidden = !u.hidden; };
}

// Migration: birds arriving (or leaving) your county this week.
async function renderMoves(caught) {
  const m = await api.migration(state.nearby?.county).catch(() => null);
  const box = $('#moves');
  if (!box || !m || (!m.arriving.length && !m.leaving.length)) return;
  $('#tabNear').classList.remove('dot'); kv.set('movesSeen', today());
  const row = (s, arriving) => `<button class="nr" data-sci="${esc(s.sci)}" data-name="${esc(s.name)}"><div class="ic">${icon(s.sci, s.name, caught.has(s.sci) ? undefined : { kind: 'sil', sil: '#45684f' })}</div>
    <div class="mid"><b>${esc(s.name)}<span class="tag ${arriving ? 'up' : 'down'}">${arriving ? '▲ ARRIVING' : '▼ LEAVING'}</span></b><small>${arriving
      ? `Reported ${s.now} of the last 7 days${s.before ? `, only ${s.before} two weeks ago` : ', none two weeks ago'}`
      : `Reported ${s.before} days two weeks ago, ${s.now ? 'just once' : 'not at all'} this week`}</small></div>
    <span class="rw">${caught.has(s.sci) ? '✓' : arriving ? 'NEW' : 'LAST CALL'}</span></button>`;
  box.innerHTML = `<div class="lab">ON THE MOVE · THIS WEEK</div>${m.arriving.map(s => row(s, true)).join('')}${m.leaving.map(s => row(s, false)).join('')}`;
  box.querySelectorAll('[data-sci]').forEach(b => b.onclick = () => openBird(b.dataset.sci, b.dataset.name));
}

const plural = n => /goose$/i.test(n) ? n.replace(/oose$/i, 'eese') : /(s|ch|sh|x)$/i.test(n) ? n + 'es' : n + 's';
// Once a day, mention the birds arriving near you that you haven't caught yet.
async function migrationAlert() {
  try {
    const m = await api.migration(state.nearby?.county).catch(() => ({ arriving: [] }));
    const f = await getForecast().catch(() => null);
    const caught = new Set(state.catches.map(c => c.sci));
    const fresh = m.arriving.filter(s => !caught.has(s.sci));
    if (fresh.length && (await kv.get('movesSeen')) !== today()) $('#tabNear').classList.add('dot');
    if ((!fresh.length && !f) || (await kv.get('movesToast')) === today()) return;
    kv.set('movesToast', today());
    const names = fresh.slice(0, 2).map(s => plural(s.name));
    const parts = [];
    if (f) parts.push(`Birding ${f.when.toLowerCase()}: ${f.label.toLowerCase()} ${'★'.repeat(f.stars)}.`);
    if (fresh.length) parts.push(`Arriving this week: ${names.join(' and ')}${fresh.length > 2 ? ` and ${fresh.length - 2} more` : ''}.`);
    toast(parts.join(' ') + ' See Nearby.', 5600);
  } catch { /* alerts are a bonus */ }
}
const tierOfChance = c => c >= 0.55 ? 20 : c >= 0.25 ? 40 : 80;

function keyCard() {
  return `<div class="hdr"><div class="ttl">NEARBY</div></div><div class="card"><h3>CONNECT EBIRD</h3>
    <p>Nearby uses eBird to see which birds people have reported around you. It needs a free eBird key: sign in at <a href="https://ebird.org/api/keygen" target="_blank" rel="noopener">ebird.org/api/keygen</a>, copy the key, and paste it here. It stays on this phone.</p>
    <input id="keyIn" placeholder="Paste your eBird key" autocomplete="off" autocapitalize="off" spellcheck="false"><div style="height:8px"></div><button class="btn full" id="keySave">SAVE KEY</button></div>`;
}
function bindKeyCard(root, after) {
  root.querySelector('#keySave').onclick = async () => {
    const k = root.querySelector('#keyIn').value.trim();
    if (!k) return;
    await kv.set('ebirdKey', k); state.nearby = null; toast('Key saved'); after();
  };
}

/* ---------- BIRD PAGE ---------- */
async function openBird(sci, nameHint) {
  const c = state.catches.find(x => x.sci === sci);
  const cur = BY_SCI[sci];
  const name = c?.name || cur?.n || nameHint || sci;
  const idx = [...state.catches].sort((a, b) => a.first.localeCompare(b.first)).findIndex(x => x.sci === sci);
  const el = overlay(`<div class="topbar"><button class="close" data-x>◀︎ BACK</button><span class="muted">${c ? '' : 'Not caught yet'}</span></div>
    <div class="ptabs">${['INFO', 'PHOTOS', 'AREA', 'SONG'].map((t, i) => `<button data-tab="${t}" class="${i ? '' : 'on'}">${t}</button>`).join('')}</div>
    <div class="scroll" id="bp"></div>`, 'solid');
  el.querySelector('[data-x]').onclick = () => { hush(); el.remove(); };
  const body = el.querySelector('#bp');
  const tabs = {
    INFO: async () => {
      const tier = tierOf(sci), hab = habitatOf(sci, name);
      const habCls = { water: 'b', sky: 'b', woods: 'g', field: 'g', edge: 'g', town: 'br' }[hab];
      body.innerHTML = `<div class="info"><div class="spr">${icon(sci, name, c ? undefined : { kind: 'sil', sil: '#2c4a36' })}</div><div class="idc">
        <div class="idbox"><button class="spk" id="spk" aria-label="Read this entry aloud">${SPEAKER}</button><div class="t1">${c ? pad3(idx + 1) + ' ' : ''}${esc(name)}</div><div class="k">${esc(cur?.cat || 'Bird')} · <i>${esc(sci)}</i></div></div>
        <div class="types"><span class="ty ${habCls}">${HAB_WORD[hab]}</span><span class="ty ${tier.rare ? 'r' : 'br'}">${tier.name}</span></div>
        ${cur?.len ? `<div class="ms"><span>Length</span><b>${cur.len} in</b><span>Wing</span><b>${cur.wing} in</b><span>Weight</span><b>${cur.wt} oz</b></div>` : ''}</div></div>
        <div class="flav" id="flav">${cur?.fact ? esc(cur.fact) : 'Loading…'}</div>
        <div class="meta">${c ? `<span>Caught ${fmtDate(c.first)} · seen ${c.count}×</span>` : '<span>Not caught yet</span>'}<span>+${tier.xp} XP</span></div>
        <button class="btn full" id="quickCatch" style="margin-top:10px">${c ? 'SEEN IT AGAIN' : 'I SEE IT · CATCH'}</button>
        ${c?.sightings.some(x => x.lat != null) ? '<button class="btn alt full" id="onMap" style="margin-top:10px">SEE ON CATCH MAP</button>' : ''}
        ${c ? `<div class="lab">YOUR SIGHTINGS</div>${[...c.sightings].reverse().map(s => `<div class="sight"><span>${fmtDate(s.date)} · ${({ voice: 'described', sound: 'by song', photo: 'by photo', list: 'from list', import: 'imported' })[s.method] || s.method || ''}</span><button class="close" data-del="${esc(s.date)}">✕ REMOVE</button></div>`).join('')}` : ''}
        ${SPRITES[slug(sci)] ? `<div class="credit">Sprite traced from a photo: ${esc(SPRITES[slug(sci)])}</div>` : ''}`;
      body.querySelector('#onMap')?.addEventListener('click', () => openCatchMap(sci));
      body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        const last = c.sightings.length === 1;
        if (!confirm(last ? `Remove ${name} from your dex?` : 'Remove this sighting?')) return;
        await removeSighting(sci, b.dataset.del);
        hush(); el.remove();
        if (!last) openBird(sci, name);
        toast(last ? `${name} was taken out of your dex.` : 'Sighting removed.');
      });
      body.querySelector('#quickCatch').onclick = () => { hush(); el.remove(); loadNearby(); ensureLoc(); gotcha({ sci, name, code: c?.code || state.nearby?.species.find(s => s.sci === sci)?.code, pct: 90 }, { method: 'list' }); };
      body.querySelector('#spk').onclick = e => {
        const b = e.currentTarget;
        if (b.classList.contains('on')) { hush(); return; }
        const flav = body.querySelector('#flav')?.textContent || '';
        speak([name + '.', cur?.cat ? `The ${cur.cat}.` : '', flav === 'Loading…' ? '' : flav].join(' '), b);
      };
      if (!cur?.fact) {
        const t = await api.taxonInfo(sci).catch(() => null);
        const f = body.querySelector('#flav');
        if (f) f.textContent = t?.summary ? t.summary.split(/(?<=\.)\s/).slice(0, 2).join(' ') : 'No description available offline.';
      }
    },
    PHOTOS: async () => {
      body.innerHTML = '<p class="muted" style="margin-top:12px">Loading photos…</p>';
      const t = await api.taxonInfo(sci).catch(() => null);
      const mine = [];
      for (const s of c?.sightings || []) if (s.photo) { const p = await photos.get(s.photo); if (p) mine.push({ url: URL.createObjectURL(p.blob), date: s.date }); }
      body.innerHTML = `${t?.photos?.length ? `<div class="gal">${t.photos.map(p => `<figure><img loading="lazy" src="${esc(p.large || p.medium)}" alt="${esc(name)}" onerror="this.closest('figure').remove()"><figcaption>${esc(p.credit)} · iNaturalist</figcaption></figure>`).join('')}</div><p class="muted">Swipe for more · ${t.photos.length} photos</p>` : '<p class="muted" style="margin-top:12px">No photos available right now.</p>'}
        <div class="lab">YOUR CATCHES (${mine.length})</div>${mine.length ? `<div class="thumbs">${mine.map(m => `<img src="${m.url}" alt="Your photo from ${fmtDate(m.date)}">`).join('')}</div>` : '<p class="muted">Photos you take while catching this bird show up here.</p>'}`;
    },
    AREA: async () => {
      body.innerHTML = '<p class="muted" style="margin-top:12px">Checking recent reports…</p>';
      const loc = await ensureLoc();
      const code = c?.code || state.nearby?.species.find(s => s.sci === sci)?.code;
      if (!loc || !code || !(await api.ebirdKey())) { body.innerHTML = '<p class="muted" style="margin-top:12px">Add your eBird key and allow location to see where this bird has been reported.</p>'; return; }
      const obs = await api.speciesNear(code, loc).catch(() => []);
      body.innerHTML = `<div class="lab">REPORTED WITHIN 50 KM · LAST 30 DAYS</div>${obs.length ? obs.slice(0, 15).map(o => `<a class="nr" target="_blank" rel="noopener" href="https://maps.apple.com/?q=${encodeURIComponent(o.locName)}&ll=${o.lat},${o.lng}"><div class="mid"><b>${esc(o.locName)}</b><small>${fmtDate(o.obsDt)} · ${api.distKm(loc, o).toFixed(1)} km · ${o.howMany ? o.howMany + ' seen' : 'present'}</small></div><span class="rw">MAP ›</span></a>`).join('') : '<p class="muted">No reports nearby in the last 30 days.</p>'}`;
    },
    SONG: async () => {
      body.innerHTML = '<p class="muted" style="margin-top:12px">Finding recordings…</p>';
      const s = await api.sounds(sci).catch(() => []);
      const mine = (c?.sightings || []).filter(x => x.audio);
      let html = s.length ? s.map(r => `<div class="snd"><small>${esc(r.place || '')} ${r.date ? '· ' + esc(r.date) : ''}</small><audio controls preload="none" src="${esc(r.url)}"></audio><small>${esc(r.credit)} · iNaturalist</small></div>`).join('') : '<p class="muted" style="margin-top:12px">No recordings found.</p>';
      body.innerHTML = html;
      for (const m of mine) {
        const p = await photos.get(m.audio);
        if (p) body.insertAdjacentHTML('afterbegin', `<div class="snd"><small>Your recording · ${fmtDate(m.date)}</small><audio controls src="${URL.createObjectURL(p.blob)}"></audio></div>`);
      }
    },
  };
  // Start fetching the photos now so the PHOTOS tab is ready when you get there.
  api.taxonInfo(sci).then(t => t?.photos?.slice(0, 2).forEach(p => { new Image().src = p.large || p.medium; })).catch(() => {});
  const go = t => { hush(); el.querySelectorAll('.ptabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); tabs[t](); };
  el.querySelectorAll('.ptabs button').forEach(b => b.onclick = () => go(b.dataset.tab));
  go('INFO');
}

/* ---------- DEX VOICE ---------- */
const SPEAKER = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7h3l5-4v14l-5-4H3z" fill="currentColor"/><path d="M14 6.5a5 5 0 0 1 0 7M16.5 4a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
function dexVoice() {
  const vs = speechSynthesis.getVoices().filter(v => v.lang?.startsWith('en'));
  // A steady, even voice suits a Pokédex best. Prefer the ones that sound most like it.
  return ['Daniel', 'Fred', 'Alex', 'Aaron', 'Arthur', 'Google UK English Male'].map(n => vs.find(v => v.name.includes(n))).find(Boolean)
    || vs.find(v => v.lang === 'en-US') || vs[0] || null;
}
function speak(text, btn) {
  if (!('speechSynthesis' in window)) { toast('This phone can\'t read aloud here.'); return; }
  hush();
  const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, ' ').trim());
  const v = dexVoice(); if (v) { u.voice = v; u.lang = v.lang; }
  u.pitch = 0.7; u.rate = 1.04;
  btn?.classList.add('on');
  u.onend = u.onerror = () => btn?.classList.remove('on');
  speak.btn = btn;
  speechSynthesis.speak(u);
}
function hush() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  speak.btn?.classList.remove('on');
}

/* ---------- CATCH: talk ---------- */
function startTalk(extra = '') {
  const SRk = window.SpeechRecognition || window.webkitSpeechRecognition;
  loadNearby();
  ensureLoc();
  const el = overlay(`<div class="topbar"><button class="close" id="backBtn">✕ CANCEL</button><span class="muted">By description</span></div>
    <div class="tbox"><span class="listen-dot"></span>LISTENING…<small>Describe the bird out loud. Tap anywhere to finish.</small></div>
    <div class="tbox" style="margin-top:10px;font-family:var(--sans);font-size:15px" id="said">${extra ? esc(extra) : '<span class="muted">“Small, gray, black cap…”</span>'}</div>
    <div class="chips" id="marks"></div>
    <div id="typeBox" hidden style="margin-top:10px"><textarea id="typed" rows="3" placeholder="Type what you see: size, colors, marks, what it's doing"></textarea></div>
    <div class="capfoot"><div class="row"><button class="btn alt" id="photoBtn">PHOTO</button><button class="btn alt" id="listBtn">PICK FROM LIST</button></div></div>`);
  let text = extra, rec = null, finished = false;
  const said = el.querySelector('#said'), marks = el.querySelector('#marks');
  const show = t => {
    said.textContent = t || '…';
    const p = parseMarks(t);
    marks.innerHTML = [p.size, ...p.marks].filter(Boolean).map(m => `<span>${esc(m)}</span>`).join('');
  };
  const finish = () => {
    if (finished) return; finished = true;
    try { rec?.stop(); } catch {}
    const t = (el.querySelector('#typed')?.value || '') + ' ' + text;
    el.remove();
    if (!t.trim()) { toast('Didn\'t catch that. Try again or type it.'); return; }
    whoIsIt({ method: 'voice', said: t.trim() });
  };
  if (SRk) {
    rec = new SRk(); rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
    let base = extra;
    rec.onresult = e => {
      let fin = '', interim = '';
      for (let i = 0; i < e.results.length; i++) (e.results[i].isFinal ? (fin += e.results[i][0].transcript + ' ') : (interim += e.results[i][0].transcript));
      text = (base + ' ' + fin + interim).trim(); show(text);
    };
    rec.onerror = ev => { if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed' || ev.error === 'network') { el.querySelector('#typeBox').hidden = false; toast('Voice isn\'t available, so type it instead.'); } };
    rec.onend = () => { if (!finished && !el.querySelector('#typeBox').hidden) return; if (!finished) try { rec.start(); } catch {} };
    try { rec.start(); } catch { el.querySelector('#typeBox').hidden = false; }
  } else {
    el.querySelector('#typeBox').hidden = false;
    el.querySelector('.tbox small').textContent = 'Type what you see, then tap anywhere.';
  }
  el.addEventListener('click', e => {
    if (e.target.closest('#photoBtn')) { finished = true; try { rec?.stop(); } catch {} el.remove(); takePhoto(text); return; }
    if (e.target.closest('#listBtn')) { finished = true; try { rec?.stop(); } catch {} el.remove(); pickFromList({ method: 'list', said: text }); return; }
    if (e.target.closest('#backBtn')) { finished = true; try { rec?.stop(); } catch {} el.remove(); return; }
    if (e.target.closest('textarea')) return;
    finish();
  });
  el.querySelector('#typed').addEventListener('input', e => show(e.target.value + ' ' + text));
  new MutationObserver(() => { said.hidden = !el.querySelector('#typeBox').hidden && !text; }).observe(el.querySelector('#typeBox'), { attributes: true });
  if (!el.querySelector('#typeBox').hidden && !text) said.hidden = true;
}

/* ---------- CATCH MENU ---------- */
// Swiping the ball up offers every way to catch a bird.
function openCatchMenu() {
  loadNearby(); ensureLoc();
  const el = overlay(`<div class="topbar"><button class="close" data-x>✕ CANCEL</button><span class="muted">Catch a bird</span></div>
    <div class="cmenu">
      <button data-go="listen"><b>LISTEN</b><small>Hear what's singing</small></button>
      <button data-go="photo"><b>PHOTO</b><small>Take or pick a photo</small></button>
      <button data-go="describe"><b>DESCRIBE</b><small>Say or type what you see</small></button>
      <button data-go="list"><b>PICK FROM LIST</b><small>Search every bird</small></button>
    </div>`);
  el.querySelector('[data-x]').onclick = () => el.remove();
  el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    el.remove();
    ({ listen: startListen, photo: () => takePhoto(), describe: () => startTalk(), list: () => pickFromList({ method: 'list' }) })[b.dataset.go]();
  });
}

/* ---------- CATCH: photo ---------- */
function takePhoto(said = '') {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => {
    const f = inp.files?.[0]; if (!f) return;
    const blob = await shrink(f, 1600);
    photoGuess({ method: 'photo', said, photo: blob });
  };
  inp.click();
}

// Names the bird in a photo, then weighs each guess by whether it's been reported near you or in your county.
async function photoGuess(ctx) {
  const wait = overlay(`<div class="topbar"><button class="close" data-x>✕ CANCEL</button><span class="muted">By photo</span></div>
    <div class="tbox"><span class="listen-dot"></span>LOOKING AT YOUR PHOTO…<small>Checking it against 965 species and what's around you.</small></div>`);
  let gone = false;
  wait.querySelector('[data-x]').onclick = () => { gone = true; wait.remove(); };
  const [res] = await Promise.all([identifyPhoto(ctx.photo).catch(() => null), loadNearby().catch(() => null)]);
  const county = state.nearby?.county ? await api.regionSpecies(state.nearby.county).catch(() => null) : null;
  const names = await birdNames().catch(() => new Map());
  if (gone) return;
  wait.remove();
  const near = new Map((state.nearby?.species || []).map(s => [s.sci, s]));
  const inCounty = county ? new Map(county.map(s => [s.sci, s])) : null;
  const cands = (res || []).map(r => {
    const n = near.get(r.sci);
    const tier = n ? 'recent' : inCounty?.has(r.sci) ? 'county' : inCounty ? 'none' : 'unknown';
    const w = { recent: 0.85 + 0.15 * Math.min(1, (n?.chance || 0) * 2), county: 0.6, none: 0.25, unknown: 0.8 }[tier];
    const where = { recent: `reported at ${Math.round((n?.chance || 0) * 100)}% of spots near you`, county: 'recorded in your county, not lately', none: 'never recorded in your county', unknown: '' }[tier];
    return { sci: r.sci, name: n?.name || inCounty?.get(r.sci)?.name || names.get(r.sci) || r.sci, code: n?.code, chance: n?.chance, p: r.p, score: r.p * w, why: [`photo match ${Math.round(r.p * 100)}%`, where].filter(Boolean) };
  }).filter(c => c.score > 0.02).sort((a, b) => b.score - a.score);
  if (!cands.length || cands[0].p < 0.12) {
    toast(res ? 'Couldn\'t tell from this photo, so pick it from the list.' : 'Photo ID isn\'t available right now, so pick it from the list.');
    return ctx.said ? whoIsIt(ctx) : pickFromList(ctx);
  }
  const tot = cands.slice(0, 4).reduce((a, c) => a + c.score, 0);
  cands.forEach(c => c.pct = Math.max(1, Math.round(100 * c.score / tot)));
  showCandidates(cands, ctx);
}

async function shrink(file, max) {
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
  } catch { return file; }
}

/* ---------- CATCH: listen (sound ID) ---------- */
async function startListen() {
  loadNearby(); ensureLoc();
  const el = overlay(`<div class="topbar"><button class="close" id="backBtn">✕ CANCEL</button><span class="muted">By song</span></div>
    <div class="tbox"><span class="listen-dot"></span>LISTENING FOR BIRDS…<small>Point your phone toward the song. Tap a bird to check it, or tap anywhere else to stop.</small></div>
    <canvas class="spec" width="160" height="80" style="margin-top:10px"></canvas>
    <div id="load" class="muted" style="margin-top:8px"></div><div class="prog" id="prog" hidden><i></i></div>
    <div class="lab">HEARD SO FAR</div><div id="heard" class="muted">Nothing yet…</div>`);
  const cv = el.querySelector('canvas'), g = cv.getContext('2d');
  g.fillStyle = '#10201a'; g.fillRect(0, 0, cv.width, cv.height);
  let session = null, stopping = false, cancelled = false;
  // Cancel works even while the song model is still loading.
  el.querySelector('#backBtn').addEventListener('click', e => { e.stopPropagation(); cancelled = true; el.remove(); session?.stop().catch(() => {}); });
  // Location filter: birds reported near you lately, and everything ever recorded in your county (loaded in the background).
  const windows = [];
  let county = null, tracker = makeTracker(state.nearby?.species || [], null);
  const rebuild = () => { tracker = makeTracker(state.nearby?.species || [], county); for (const w of windows) tracker.add(w.t, w.res); };
  (async () => {
    await loadNearby().catch(() => {});
    county = state.nearby?.county ? await api.regionSpecies(state.nearby.county).catch(() => null) : null;
    rebuild(); draw();
  })();
  const draw = () => {
    const rows = tracker.list(), span = Math.max(15, tracker.latest + 3);
    shown = rows.slice(0, 8);
    el.querySelector('#heard').innerHTML = shown.length ? shown.map((b, i) => `<button class="nr heardrow${b.now ? ' now' : ''}" data-i="${i}"><div class="ic ph">${thumbs.get(b.sci) ? `<img src="${esc(thumbs.get(b.sci))}" alt="">` : icon(b.sci, b.name)}</div><div class="mid"><b>${esc(b.name)}</b>
      <div class="tl">${b.times.map(t => `<i style="left:${(t / span * 100).toFixed(1)}%;width:${(3 / span * 100).toFixed(1)}%"></i>`).join('')}</div></div><span class="rw">${b.now ? 'SINGING' : Math.round(b.p * 100) + '%'}</span></button>`).join('') : 'Nothing yet…';
    // Real photos for each bird heard, fetched once.
    for (const b of shown) if (!thumbs.has(b.sci)) { thumbs.set(b.sci, null); api.thumbFor(b.sci).then(u => { if (u) { thumbs.set(b.sci, u); if (el.isConnected) draw(); } }); }
  };
  let shown = [];
  const thumbs = new Map();
  const asCand = x => {
    const n = state.nearby?.species.find(s => s.sci === x.sci);
    const where = n ? `reported at ${Math.round(n.chance * 100)}% of spots near you` : x.tier === 'county' ? 'recorded in your county, not lately' : x.tier === 'none' ? 'never recorded in your county' : 'not reported nearby lately';
    return { sci: x.sci, name: n?.name || x.name, code: n?.code, chance: n?.chance, pct: Math.round(x.p * 100), why: [`song match ${Math.round(x.p * 100)}%${x.hits > 1 ? `, heard ${x.hits} times` : ''}`, where] };
  };
  // Tap a bird while it's still listening: check its photos, BACK keeps listening, THAT'S IT stops and catches it.
  el.querySelector('#heard').addEventListener('click', e => {
    const row = e.target.closest('.heardrow'); if (!row || stopping) return;
    e.stopPropagation();
    checkBird(shown.map(asCand), +row.dataset.i, { method: 'sound' }, {
      confirm: async c => {
        stopping = true;
        const res = await session.stop();
        el.remove();
        gotcha(c, { method: 'sound', audio: await photos.add(res.audio) }, true);
      },
    });
  });
  try {
    session = await sound.listen(u => {
      if (u.spectrum) {
        const img = g.getImageData(1, 0, cv.width - 1, cv.height); g.putImageData(img, 0, 0);
        const bins = u.spectrum.length;
        for (let y = 0; y < cv.height; y++) {
          const v = u.spectrum[Math.floor((1 - y / cv.height) * bins * 0.7)] / 255;
          g.fillStyle = `rgb(${20 + 211 * v},${32 + 162 * v},${26 + 100 * v})`; g.fillRect(cv.width - 1, y, 1, 1);
        }
      }
      if (u.loading != null && u.loading < 1) { el.querySelector('#prog').hidden = false; el.querySelector('#prog i').style.width = (u.loading * 100) + '%'; el.querySelector('#load').textContent = 'First time only: downloading the bird-song model (about 26 MB)…'; }
      if (u.loading === 1) { el.querySelector('#prog').hidden = true; el.querySelector('#load').textContent = ''; }
      if (u.error) el.querySelector('#load').textContent = 'Sound ID hit a problem: ' + u.error;
      if (u.window) { windows.push(u.window); tracker.add(u.window.t, u.window.res); draw(); }
    });
  } catch (e) {
    el.remove(); if (!cancelled) toast('Field Dex needs the microphone to hear birds. Allow it in Settings.'); return;
  }
  if (cancelled) { session.stop().catch(() => {}); return; }
  el.addEventListener('click', async () => {
    if (stopping) return; stopping = true;
    el.querySelector('.tbox').innerHTML = 'THINKING…<small>Checking the recording.</small>';
    const res = await session.stop();
    el.remove();
    if (res.tail) tracker.add(tracker.latest + 1.5, res.tail);
    const d = tracker.ranked();
    const audioId = await photos.add(res.audio);
    if (!d.length) { toast('No bird song recognized. Try closer, or swipe the ball up to describe it.'); return; }
    showCandidates(d.slice(0, 8).map(asCand), { method: 'sound', audio: audioId });
  });
}

/* ---------- WHO IS IT ---------- */
async function whoIsIt(ctx) {
  const wait = overlay(`<div class="tbox">CHECKING NEARBY BIRDS…<small>Matching your description with what eBird says is around.</small></div>`);
  await loadNearby();
  wait.remove();
  const parsed = parseMarks(ctx.said || '');
  showCandidates(rank(parsed, pool()), { ...ctx, parsed });
}

function cardPic(c) {
  const id = 'p' + Math.random().toString(36).slice(2);
  api.thumbFor(c.sci).then(u => { const el = document.getElementById(id); if (u && el) el.insertAdjacentHTML('beforeend', `<img src="${esc(u)}" alt="" onerror="this.remove()">`); });
  return `<div class="pic" id="${id}">${icon(c.sci, c.name)}</div>`;
}

function showCandidates(cands, ctx) {
  const top = cands.slice(0, 8);
  const mineUrl = ctx.photo ? URL.createObjectURL(ctx.photo) : null;
  const el = overlay(`<div class="topbar"><button class="close" data-x>✕ CANCEL</button><span class="muted">${ctx.method === 'sound' ? 'By song' : ctx.method === 'photo' ? 'By photo' : 'By description'}</span></div>
    <div class="scroll"><div class="tbox">WHO IS IT?<small>${ctx.parsed ? ([ctx.parsed.size, ...ctx.parsed.marks].filter(Boolean).join(' · ') || 'No field marks heard') + '<br>' : ''}Tap a bird to look through its photos before you catch it.</small></div>
    ${mineUrl ? `<div class="mine"><img src="${mineUrl}" alt="Your photo"></div>` : ''}
    <div class="pick">${top.map((c, i) => `<button class="pc ${i ? '' : 'top'}" data-i="${i}">${cardPic(c)}<b>${esc(c.name)}</b><span class="pct">${c.pct}%</span><small>${esc((c.why || []).slice(0, 3).join(' · '))}</small></button>`).join('')}</div>
    <div style="height:10px"></div><div class="row"><button class="btn alt" id="more">NONE OF THESE</button>${ctx.method !== 'photo' ? '<button class="btn alt" id="addPhoto">ADD PHOTO</button>' : ''}</div></div>`, 'solid');
  el.querySelector('[data-x]').onclick = () => el.remove();
  el.querySelector('#more').onclick = () => { el.remove(); pickFromList(ctx); };
  el.querySelector('#addPhoto')?.addEventListener('click', () => { el.remove(); takePhoto(ctx.said || ''); });
  const rejected = new Set();
  el.querySelectorAll('.pc').forEach(b => b.onclick = () => checkBird(top, +b.dataset.i, ctx, {
    done: () => el.remove(),
    reject: i => { rejected.add(i); el.querySelector(`.pc[data-i="${i}"]`)?.classList.add('nope'); },
    rejected,
  }));
}

// Look through one candidate's photos and marks, step to the next, and only catch when you say so.
function checkBird(list, i, ctx, from = {}) {
  const mineUrl = ctx.photo ? URL.createObjectURL(ctx.photo) : null;
  const said = new Set(ctx.parsed?.marks || []);
  const el = overlay(`<div class="topbar"><button class="close" data-x>◀︎ BACK</button><span class="muted" id="pos"></span></div>
    <div class="scroll" id="cb"></div>
    <div class="capfoot">${list.length > 1 ? '<div class="row"><button class="btn alt" id="prev">◀︎ PREV</button><button class="btn alt" id="next">NEXT ▶︎</button></div>' : ''}
      <div class="row"><button class="btn alt" id="nope">${list.length > 1 ? 'NOT IT' : 'BACK'}</button><button class="btn" id="yes">THAT'S IT!</button></div></div>`, 'solid');
  const body = el.querySelector('#cb');
  const show = () => {
    const c = list[i];
    el.querySelector('#pos').textContent = list.length > 1 ? `${i + 1} OF ${list.length}` : '';
    const look = marksFor(c.sci, c.name);
    const twin = list.find(x => x !== c && versusNote(c.sci, x.sci));
    body.innerHTML = `${mineUrl ? `<div class="mine cmp"><img src="${mineUrl}" alt="Your photo"><span>YOUR PHOTO</span></div>` : ''}
      <div class="chead"><div class="ic">${icon(c.sci, c.name)}</div><div><b>${esc(c.name)}</b>${c.pct != null ? ` <span class="pct">${c.pct}%</span>` : ''}<small>${esc((c.why || []).join(' · '))}</small></div></div>
      <div class="gal" id="gal"><figure><div class="ph"></div><figcaption>Loading photos…</figcaption></figure></div><div class="muted gcount" id="gcount"></div>
      ${twin ? `<div class="vsnote"><b>vs ${esc(twin.name)}:</b> ${esc(versusNote(c.sci, twin.sci))}</div>` : ''}
      ${look.length ? `<div class="lab">LOOK FOR</div><div class="chips look">${look.map(m => `<span class="${said.has(m) ? 'hit' : ''}">${esc(m)}</span>`).join('')}</div>` : ''}
      <div class="flav" id="cfact">${BY_SCI[c.sci]?.fact ? esc(BY_SCI[c.sci].fact) : ''}</div>`;
    body.scrollTop = 0;
    el.querySelector('#prev')?.toggleAttribute('disabled', i === 0);
    el.querySelector('#next')?.toggleAttribute('disabled', i === list.length - 1);
    const want = c.sci;
    api.taxonInfo(c.sci).catch(() => null).then(t => {
      if (list[i].sci !== want || !el.isConnected) return;
      const gal = body.querySelector('#gal'), cnt = body.querySelector('#gcount');
      if (!t?.photos?.length) { gal.innerHTML = `<figure><div class="ph">${icon(c.sci, c.name)}</div><figcaption>No photos available right now.</figcaption></figure>`; return; }
      gal.innerHTML = t.photos.map((p, k) => `<figure><img ${k > 1 ? 'loading="lazy"' : ''} src="${esc(p.large || p.medium)}" alt="${esc(c.name)}"><figcaption>${esc(p.credit)} · iNaturalist</figcaption></figure>`).join('');
      // Drop photos that fail to load; if none load, say so.
      gal.addEventListener('error', e => { e.target.closest('figure')?.remove(); if (gal.children.length) return upd(); gal.innerHTML = `<figure><div class="ph">${icon(c.sci, c.name)}</div><figcaption>Photos need a signal. Try again in a moment.</figcaption></figure>`; cnt.textContent = ''; }, true);
      const upd = () => { cnt.textContent = `Swipe for more · ${Math.round(gal.scrollLeft / gal.clientWidth) + 1} of ${gal.children.length}`; };
      gal.onscroll = upd; upd();
      const f = body.querySelector('#cfact');
      if (f && !f.textContent && t.summary) f.textContent = t.summary.split(/(?<=\.)\s/).slice(0, 2).join(' ');
      // Warm up the next bird's photos too.
      const nx = list[i + 1]; if (nx) api.taxonInfo(nx.sci).then(t2 => t2?.photos?.[0] && (new Image().src = t2.photos[0].large || t2.photos[0].medium)).catch(() => {});
    });
  };
  const step = d => { i = Math.max(0, Math.min(list.length - 1, i + d)); show(); };
  el.querySelector('[data-x]').onclick = () => el.remove();
  el.querySelector('#prev')?.addEventListener('click', () => step(-1));
  el.querySelector('#next')?.addEventListener('click', () => step(1));
  // You looked and said yes, so it's caught; the wobbles still show how sure the match was.
  el.querySelector('#yes').onclick = () => { el.remove(); if (from.confirm) return from.confirm(list[i]); from.done?.(); gotcha(list[i], ctx, true); };
  el.querySelector('#nope').onclick = () => {
    if (list.length < 2) { el.remove(); return; }
    from.reject?.(i);
    const nxt = list.findIndex((x, k) => k > i && !from.rejected?.has(k));
    const back = list.findIndex((x, k) => !from.rejected?.has(k));
    if (nxt >= 0) { i = nxt; show(); } else if (back >= 0 && back !== i) { i = back; show(); }
    else { el.remove(); toast('None of these? Tap NONE OF THESE to see every bird.'); }
  };
  show();
}

async function pickFromList(ctx) {
  await loadNearby();
  const all = pool().sort((x, y) => (y.chance ?? 0) - (x.chance ?? 0) || x.name.localeCompare(y.name));
  const region = state.nearby?.county ? await api.regionSpecies(state.nearby.county).catch(() => []) : [];
  const seen = new Set(all.map(x => x.sci));
  for (const r of region) if (!seen.has(r.sci)) { all.push({ sci: r.sci, name: r.name, code: r.code, chance: 0 }); seen.add(r.sci); }
  const mineUrl = ctx.photo ? URL.createObjectURL(ctx.photo) : null;
  const el = overlay(`<div class="topbar"><button class="close" data-x>✕ CANCEL</button><span class="muted">${all.length} birds</span></div>
    ${mineUrl ? `<div class="mine" style="height:120px;margin:0 0 10px"><img src="${mineUrl}" alt="Your photo"></div>` : ''}
    <input id="q" placeholder="Search by name" autocomplete="off"><div class="scroll list" id="lst" style="margin-top:8px"></div>`, 'solid');
  const lst = el.querySelector('#lst');
  const draw = q => {
    const f = q ? all.filter(x => x.name.toLowerCase().includes(q) || x.sci.toLowerCase().includes(q)) : all;
    lst.innerHTML = f.slice(0, 80).map(x => `<button class="nr" data-sci="${esc(x.sci)}"><div class="ic">${icon(x.sci, x.name)}</div><div class="mid"><b>${esc(x.name)}</b><small>${x.chance ? Math.round(x.chance * 100) + '% of spots near you' : 'not reported nearby lately'}</small></div></button>`).join('');
    lst.querySelectorAll('.nr').forEach(b => b.onclick = () => { const c = all.find(x => x.sci === b.dataset.sci); checkBird([{ ...c, pct: null, why: [c.chance ? Math.round(c.chance * 100) + '% of spots near you' : 'not reported nearby lately'] }], 0, ctx, { done: () => el.remove() }); });
  };
  draw('');
  el.querySelector('#q').oninput = e => draw(e.target.value.trim().toLowerCase());
  el.querySelector('[data-x]').onclick = () => el.remove();
}

/* ---------- GOTCHA ---------- */
function gotcha(c, ctx, forced = false) {
  const conf = forced ? 100 : (c.pct ?? 60);
  const wobbles = conf >= 55 ? 3 : conf >= 25 ? 2 : 1;
  const breaks = !forced && conf < 25;
  const el = overlay(`<div class="scene" id="sc"><i class="plat"></i><div class="wild show">${icon(c.sci, c.name)}</div><div class="cball" id="cb" hidden>${ballSvg()}</div>
    <span class="spark" style="left:28%;top:70px">✦</span><span class="spark" style="right:26%;top:90px">✦</span><span class="spark" style="left:56%;top:44px;font-size:15px">✦</span></div>
    <div class="tbox" id="msg" style="margin-top:10px">Go, Field Ball!</div><div id="after"></div>`, 'solid');
  const cb = el.querySelector('#cb'), wild = el.querySelector('.wild'), msg = el.querySelector('#msg');
  const throwBall = () => { wild.classList.remove('show'); cb.hidden = false; cb.style.setProperty('--n', wobbles); cb.classList.add('wob'); msg.textContent = '…'; };
  const t1 = setTimeout(throwBall, 600);
  let done = false;
  const settle = async () => {
    if (done) return; done = true; clearTimeout(t1); clearTimeout(t2);
    if (breaks) {
      cb.classList.remove('wob'); cb.classList.add('pop'); wild.classList.add('show');
      msg.innerHTML = `Oh no! It broke free!<small>The match was only ${conf}%. Give it one more clue.</small>`;
      el.querySelector('#after').innerHTML = `<div class="capfoot" style="margin-top:12px"><div class="row"><button class="btn alt" id="b1">ADD PHOTO</button><button class="btn alt" id="b2">DESCRIBE MORE</button></div><button class="btn full" id="b3">I'M SURE, CATCH IT</button><button class="btn alt full" id="b4">LET IT GO</button></div>`;
      el.querySelector('#b1').onclick = () => { el.remove(); takePhoto(ctx.said || c.name); };
      el.querySelector('#b2').onclick = () => { el.remove(); startTalk(ctx.said || ''); };
      el.querySelector('#b3').onclick = () => { el.remove(); gotcha(c, ctx, true); };
      el.querySelector('#b4').onclick = () => el.remove();
      return;
    }
    el.querySelector('#sc').classList.add('won');
    const res = await saveCatch(c, ctx);
    msg.innerHTML = `Gotcha! ${esc(c.name)} was caught!`;
    el.querySelector('#after').innerHTML = `<div class="reg">${icon(c.sci, c.name)}<div><b>${res.isNew ? `No.${pad3(res.no)} registered` : `Seen again · ${res.count}×`}</b><small>+${res.xp} XP · ${res.tier}${res.levelUp ? ` · LEVEL UP! LV ${res.level}` : ''}${res.badge ? `<br>${res.badge} BADGE EARNED! See it on your trainer card.` : ''}<br>${ctx.photo ? 'Your photo was saved to its Photos tab.' : ctx.audio ? 'Your recording was saved to its Song tab.' : ''}</small></div></div>
      <div class="capfoot" style="margin-top:12px"><div class="row"><button class="btn" id="viewEntry">VIEW ENTRY</button><button class="btn alt" id="ok">DONE</button></div><button class="btn alt full" id="undo">↶ UNDO, WRONG BIRD</button></div>`;
    el.querySelector('#undo').onclick = async () => { await removeSighting(c.sci, res.date); el.remove(); toast(`Undone. ${c.name} ${res.isNew ? 'was taken out of your dex' : 'sighting removed'}.`); };
    el.querySelector('#viewEntry').onclick = () => { el.remove(); openBird(c.sci, c.name); };
    el.querySelector('#ok').onclick = () => el.remove();
  };
  const t2 = setTimeout(settle, 600 + wobbles * 900 + 200);
  // Tap the scene to skip straight to the result.
  el.querySelector('#sc').onclick = () => { if (!done) { throwBall(); cb.classList.remove('wob'); settle(); } };
}

async function saveCatch(c, ctx) {
  // Tag the sighting with where you are; a saved spot from the last 2 hours is close enough without asking again.
  const loc = await ensureLoc({ maxAge: 2 * 3600e3 }).catch(() => state.loc);
  const tier = tierOf(c.sci);
  let photoId = null;
  if (ctx.photo) photoId = await photos.add(ctx.photo);
  const sighting = { date: new Date().toISOString(), lat: loc?.lat, lng: loc?.lng, method: ctx.method, said: ctx.said || null, photo: photoId, audio: ctx.audio || null };
  const existing = await catches.get(c.sci);
  let isNew = !existing, rec;
  if (existing) { rec = existing; rec.count++; rec.sightings.push(sighting); if (tier.rare) rec.rare = true; }
  else rec = { sci: c.sci, name: c.name, code: c.code || state.nearby?.species.find(s => s.sci === c.sci)?.code || null, first: sighting.date, count: 1, sightings: [sighting], hab: habitatOf(c.sci, c.name), rare: !!tier.rare };
  await catches.put(rec);
  const gain = isNew ? tier.xp : Math.round(tier.xp / 4);
  sighting.xp = gain; await catches.put(rec);
  const before = level(state.xp), had = earned(state.catches);
  state.xp += gain; await kv.set('xp', state.xp);
  state.catches = await catches.all();
  const no = [...state.catches].sort((a, b) => a.first.localeCompare(b.first)).findIndex(x => x.sci === c.sci) + 1;
  render();
  const badge = earned(state.catches).find(b => !had.includes(b));
  return { date: sighting.date, isNew, no, count: rec.count, xp: gain, tier: tier.name, level: level(state.xp), levelUp: level(state.xp) > before, badge };
}

// Takes back one sighting (and its XP); the bird leaves the dex when it was the only one.
async function removeSighting(sci, date) {
  const rec = await catches.get(sci); if (!rec) return;
  const s = rec.sightings.find(x => x.date === date);
  rec.sightings = rec.sightings.filter(x => x !== s);
  if (s?.xp) { state.xp = Math.max(0, state.xp - s.xp); await kv.set('xp', state.xp); }
  if (!rec.sightings.length) await catches.del(sci);
  else { rec.count = rec.sightings.length; rec.first = rec.sightings.map(x => x.date).sort()[0]; await catches.put(rec); }
  state.catches = await catches.all();
  render();
}

/* ---------- TRAINER CARD ---------- */
async function openTrainerCard() {
  const list = state.catches, lv = level(state.xp);
  const fav = [...list].sort((a, b) => b.count - a.count || a.first.localeCompare(b.first))[0];
  const recent = [...list].sort((a, b) => lastSeen(b).localeCompare(lastSeen(a))).slice(0, 6);
  const first = list.map(c => c.first).sort()[0];
  const data = () => ({
    trainer: trainer || 'Trainer', level: lv, xp: state.xp, xpThis: 50 * (lv - 1) ** 2, xpNext: 50 * lv ** 2,
    caught: list.length, rare: list.filter(c => c.rare).length, region: state.region?.text || '',
    since: first ? new Date(first).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '',
    badges: BADGES.map(([n, f, need]) => { const h = f(list); return { n, on: h >= need, prog: `${Math.min(h, need)}/${need}` }; }),
    fav: fav && { svg: icon(fav.sci, fav.name), name: fav.name, count: fav.count },
    recent: recent.map(c => icon(c.sci, c.name)),
  });
  let trainer = (await kv.get('trainer')) || '';
  const el = overlay(`<div class="topbar"><button class="close" data-x>◀︎ BACK</button><span class="ttl" style="font-size:16px">TRAINER CARD</span></div>
    <div class="scroll"><div class="tcard" id="tc"><span class="muted">Drawing…</span></div>
    <div class="lab">TRAINER NAME</div><input id="tn" value="${esc(trainer)}" placeholder="Your name" maxlength="16" autocomplete="off">
    <div style="height:10px"></div><button class="btn full" id="share">SHARE CARD</button></div>`, 'solid');
  el.querySelector('[data-x]').onclick = () => el.remove();
  let cv = null;
  const draw = async () => {
    cv = await (await import('./card.js')).drawCard(data());
    const box = el.querySelector('#tc'); box.innerHTML = ''; cv.setAttribute('aria-label', 'Your trainer card'); box.appendChild(cv);
  };
  await draw();
  let t;
  el.querySelector('#tn').oninput = e => { trainer = e.target.value.trim(); clearTimeout(t); t = setTimeout(() => { kv.set('trainer', trainer); draw(); }, 300); };
  el.querySelector('#share').onclick = async () => {
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const file = new File([blob], 'field-dex-trainer-card.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'My Field Dex' }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  };
}
const lastSeen = c => c.sightings.at(-1)?.date || c.first;

/* ---------- CATCH MAP ---------- */
async function openCatchMap(only) {
  const pts = state.catches.flatMap(c => c.sightings.filter(s => s.lat != null && s.lng != null)
    .map(s => ({ sci: c.sci, name: c.name, lat: s.lat, lng: s.lng, date: s.date, method: s.method, place: s.place, svg: icon(c.sci, c.name) })));
  const birds = [...new Map(pts.map(p => [p.sci, p.name])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const noLoc = state.catches.filter(c => !c.sightings.some(s => s.lat != null)).length;
  const el = overlay(`<div class="topbar"><button class="close" data-x>◀︎ BACK</button><span class="ttl" style="font-size:16px">CATCH MAP</span></div>
    <select id="mf"><option value="">All birds · ${pts.length} catches</option>${birds.map(([sci, n]) => `<option value="${esc(sci)}" ${sci === only ? 'selected' : ''}>${esc(n)} · ${pts.filter(p => p.sci === sci).length}</option>`).join('')}</select>
    <div class="mapbox" id="mp"></div>
    <small class="muted mapnote">${pts.length ? '' : 'Catches you make from now on are pinned where you caught them. '}${noLoc ? `${noLoc} bird${noLoc > 1 ? 's' : ''} without a location (imported or caught with location off).` : ''}</small>`, 'solid');
  el.querySelector('[data-x]').onclick = () => el.remove();
  const filt = sci => sci ? pts.filter(p => p.sci === sci) : pts;
  try {
    const m = await (await import('./map.js')).drawMap(el.querySelector('#mp'), filt(only), (sci, name) => openBird(sci, name));
    el.querySelector('#mf').onchange = e => { m.map.closePopup(); m.show(filt(e.target.value)); };
  } catch { el.querySelector('#mp').innerHTML = '<p class="muted" style="padding:12px">The map needs a connection the first time.</p>'; }
}

/* ---------- HOTSPOT MAP ---------- */
// Where the most species have been seen in the last 7 days, on a map and as a ranked list.
async function openHotspots() {
  const el = overlay(`<div class="topbar"><button class="close" data-x>◀︎ BACK</button><span class="ttl" style="font-size:16px">HOTSPOTS · 7 DAYS</span></div>
    <div class="mapbox hot" id="hm"><p class="muted" style="padding:12px">Checking the busiest hotspots near ${esc(locLabel())}…</p></div>
    <div class="scroll hotlist" id="hl"></div>`, 'solid');
  el.querySelector('[data-x]').onclick = () => el.remove();
  const loc = await ensureLoc();
  if (!loc) { el.querySelector('#hm').innerHTML = '<p class="muted" style="padding:12px">Pick a location first (📍 CHANGE on Nearby).</p>'; return; }
  let spots;
  try { spots = await api.hotspots7(loc); } catch { el.querySelector('#hm').innerHTML = '<p class="muted" style="padding:12px">Couldn\'t reach eBird right now. Check your signal.</p>'; return; }
  if (!el.isConnected) return;
  if (!spots.length) { el.querySelector('#hm').innerHTML = '<p class="muted" style="padding:12px">No hotspot reports within 30 km in the last 7 days.</p>'; return; }
  const caught = new Set(state.catches.map(c => c.sci));
  const needs = s => s.species.filter(b => !caught.has(b.sci)).length;
  const popupFor = s => {
    const d = document.createElement('div'); d.className = 'mpop';
    d.innerHTML = `<b></b><small></small><div class="row"><button class="btn" data-a="birds">SEE BIRDS</button><a class="btn alt" target="_blank" rel="noopener">DIRECTIONS</a></div>`;
    d.querySelector('b').textContent = s.name;
    d.querySelector('small').textContent = `${s.count} species · ${needs(s)} you haven't caught · ${s.km.toFixed(1)} km · last report ${fmtDate(s.latest)}`;
    d.querySelector('a').href = `https://maps.apple.com/?daddr=${s.lat},${s.lng}&q=${encodeURIComponent(s.name)}`;
    d.querySelector('[data-a]').onclick = () => hotspotBirds(s, caught);
    return d;
  };
  const hl = el.querySelector('#hl');
  hl.innerHTML = `<div class="legend"><span><i style="background:#d64533"></i>40+ species</span><span><i style="background:#e8c23a"></i>20–39</span><span><i style="background:#5fae5a"></i>under 20</span></div><div class="lab">MOST SPECIES · LAST 7 DAYS</div>${spots.map((s, i) => `<button class="nr" data-i="${i}"><span class="hsn">${s.count}</span><div class="mid"><b>${esc(s.name)}</b><small>${s.km.toFixed(1)} km · ${needs(s)} you haven't caught · ${fmtDate(s.latest)}</small></div><span class="rw">›</span></button>`).join('')}`;
  el.querySelector('#hm').innerHTML = '';
  try {
    const m = await (await import('./map.js')).drawHotspots(el.querySelector('#hm'), spots, loc, popupFor);
    hl.querySelectorAll('.nr').forEach(b => b.onclick = () => m.open(spots[+b.dataset.i].locId));
  } catch {
    el.querySelector('#hm').innerHTML = '<p class="muted" style="padding:12px">The map needs a connection the first time.</p>';
    hl.querySelectorAll('.nr').forEach(b => b.onclick = () => hotspotBirds(spots[+b.dataset.i], caught));
  }
}

function hotspotBirds(s, caught) {
  const birds = [...s.species].sort((a, b) => caught.has(a.sci) - caught.has(b.sci) || a.name.localeCompare(b.name));
  const el = overlay(`<div class="topbar"><button class="close" data-x>◀︎ BACK</button><span class="muted">${s.count} species · 7 days</span></div>
    <div class="tbox">${esc(s.name)}<small>${s.km.toFixed(1)} km away · birds not in your dex are listed first</small></div>
    <div class="scroll">${birds.map(b => `<button class="nr" data-sci="${esc(b.sci)}" data-name="${esc(b.name)}"><div class="ic">${icon(b.sci, b.name, caught.has(b.sci) ? undefined : { kind: 'sil', sil: '#45684f' })}</div><div class="mid"><b>${esc(b.name)}${caught.has(b.sci) ? '' : '<span class="tag">NEW</span>'}</b><small>${fmtDate(b.date)}${b.n ? ' · ' + b.n + ' seen' : ''}</small></div></button>`).join('')}
    <a class="btn alt full" style="margin-top:10px" target="_blank" rel="noopener" href="https://ebird.org/hotspot/${esc(s.locId)}">OPEN IN EBIRD</a></div>`, 'solid');
  el.querySelector('[data-x]').onclick = () => el.remove();
  el.querySelectorAll('[data-sci]').forEach(b => b.onclick = () => openBird(b.dataset.sci, b.dataset.name));
}

/* ---------- SETTINGS ---------- */
async function openSettings() {
  const key = await api.ebirdKey();
  const el = overlay(`<div class="topbar"><button class="close" data-x>◀︎ BACK</button><span class="ttl" style="font-size:16px">SETTINGS</span></div><div class="scroll">
    <div class="card"><h3>EBIRD KEY</h3><p class="muted">Free from <a href="https://ebird.org/api/keygen" target="_blank" rel="noopener">ebird.org/api/keygen</a>. Stays on this phone.</p>
      <input id="k" value="${esc(key)}" placeholder="Paste your eBird key" autocomplete="off" autocapitalize="off" spellcheck="false"><div style="height:8px"></div><button class="btn full" id="ks">SAVE</button></div>
    <div class="card"><h3>LOCATION</h3><p class="muted">${esc(locLabel())}</p><button class="btn alt full" id="locSet">CHANGE LOCATION</button></div>
    <div class="card"><h3>IMPORT A LIFE LIST</h3><p class="muted">On eBird, open My eBird → Life list → Download (CSV). Pick that file here and every species on it is added as caught.</p>
      <div class="row"><button class="btn" id="paste">PASTE LIST</button><button class="btn alt" id="imp">CHOOSE FILE</button></div>
      <div id="pasteBox" hidden style="margin-top:8px"><textarea id="pasteIn" rows="4" placeholder="Paste the list here"></textarea><div style="height:8px"></div><button class="btn full" id="pasteGo">IMPORT</button></div></div>
    <div class="card"><h3>BACKUP</h3><p class="muted">Your dex lives only on this phone. Save a backup now and then.</p>
      <div class="row"><button class="btn" id="exp">SAVE BACKUP</button><button class="btn alt" id="res">RESTORE</button></div></div>
    <div class="card"><h3>SOUND ID</h3><p class="muted">The bird-song model downloads the first time you use LISTEN (about 26 MB), then works offline.</p><button class="btn alt full" id="pre">DOWNLOAD IT NOW</button><div class="prog" id="pp" hidden><i></i></div></div>
    <div class="card"><h3>CREDITS</h3><p class="muted">Sightings: eBird, Cornell Lab of Ornithology. Photos, sounds and descriptions: iNaturalist contributors (credited on each photo) and Wikipedia. Sound ID: BirdNET by the K. Lisa Yang Center for Conservation Bioacoustics and TU Chemnitz (CC BY-NC-SA 4.0), run with LiteRT.js.</p>
      <p class="muted">LV ${level(state.xp)} · ${state.xp} XP · ${state.catches.length} caught</p></div></div>`, 'solid');
  el.querySelector('[data-x]').onclick = () => el.remove();
  el.querySelector('#ks').onclick = async () => { await kv.set('ebirdKey', el.querySelector('#k').value.trim()); state.nearby = null; toast('Key saved'); render(); };
  el.querySelector('#locSet').onclick = () => { el.remove(); openLocation(); };
  el.querySelector('#imp').onclick = () => pickFile('.csv,.txt,text/csv,text/plain', importCsv);
  el.querySelector('#paste').onclick = async () => {
    const box = el.querySelector('#pasteBox'), inp = el.querySelector('#pasteIn');
    box.hidden = false;
    try { const t = await navigator.clipboard.readText(); if (t) inp.value = t; } catch { inp.focus(); }
  };
  el.querySelector('#pasteGo').onclick = () => { const t = el.querySelector('#pasteIn').value.trim(); if (t) importCsv({ text: async () => t }); };
  el.querySelector('#exp').onclick = exportBackup;
  el.querySelector('#res').onclick = () => pickFile('application/json,.json', restoreBackup);
  el.querySelector('#pre').onclick = () => { const pp = el.querySelector('#pp'); pp.hidden = false; sound.loadModel(p => pp.firstChild.style.width = p * 100 + '%').then(() => toast('Sound ID ready, works offline now')).catch(e => toast('Download failed: ' + e.message)); };
}

function pickFile(accept, fn) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
  i.onchange = () => i.files?.[0] && fn(i.files[0]); i.click();
}

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(Boolean));
}

async function importCsv(file) {
  const rows = parseCsv(await file.text());
  const head = rows.shift().map(h => h.trim().toLowerCase());
  const iSci = head.findIndex(h => h.includes('scientific')), iCom = head.findIndex(h => h.includes('common')), iDate = head.findIndex(h => h === 'date' || h.includes('date'));
  const iLat = head.findIndex(h => h.startsWith('lat')), iLng = head.findIndex(h => h.startsWith('lon') || h === 'lng'), iLoc = head.findIndex(h => h === 'location' || h === 'place');
  if (iSci < 0 || iCom < 0) { toast('That file doesn\'t look like a life list.'); return; }
  let added = 0, fixed = 0;
  const sameDay = {};
  for (const r of rows) {
    const sci = r[iSci]?.trim(), name = r[iCom]?.trim();
    if (!sci || !name || sci.includes(' x ') || sci.includes('/') || sci.includes('sp.')) continue;
    const d = iDate >= 0 && r[iDate] ? new Date(r[iDate]) : new Date();
    // Birds listed on the same day keep the file's order (oldest first), a minute apart.
    if (!isNaN(d)) { const k = d.toISOString(); d.setMinutes(d.getMinutes() + (sameDay[k] = (sameDay[k] ?? -1) + 1)); }
    const date = isNaN(d) ? new Date().toISOString() : d.toISOString();
    const had = await catches.get(sci);
    if (had) {
      // Importing the list again re-dates birds that only came from an import, so the dex order can be corrected.
      if (had.sightings.every(x => x.method === 'import') && had.first !== date) { had.first = date; had.sightings[0].date = date; await catches.put(had); fixed++; }
      continue;
    }
    const lat = parseFloat(r[iLat]), lng = parseFloat(r[iLng]);
    const sighting = { date, method: 'import', place: iLoc >= 0 ? r[iLoc]?.trim() || null : null };
    if (isFinite(lat) && isFinite(lng)) Object.assign(sighting, { lat, lng });
    await catches.put({ sci, name, code: null, first: date, count: 1, sightings: [sighting], hab: habitatOf(sci, name), rare: false });
    added++;
  }
  state.catches = await catches.all(); render();
  toast(added || !fixed ? `Imported ${added} birds into your dex` : `Put ${fixed} birds in the order you found them`);
}

async function exportBackup() {
  const all = await catches.all(), ph = await photos.all();
  const enc = async b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
  const data = { v: 1, at: new Date().toISOString(), xp: state.xp, catches: all, photos: await Promise.all(ph.map(async p => ({ id: p.id, data: await enc(p.blob) }))) };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const file = new File([blob], `field-dex-backup-${today()}.json`, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Field Dex backup' }); return; } catch {} }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
}

async function restoreBackup(file) {
  try {
    const d = JSON.parse(await file.text());
    const map = {};
    for (const p of d.photos || []) { const b = await (await fetch(p.data)).blob(); map[p.id] = await photos.add(b); }
    for (const c of d.catches || []) { c.sightings.forEach(s => { if (s.photo) s.photo = map[s.photo]; if (s.audio) s.audio = map[s.audio]; }); await catches.put(c); }
    state.xp = Math.max(state.xp, d.xp || 0); await kv.set('xp', state.xp);
    state.catches = await catches.all(); render(); toast('Backup restored');
  } catch { toast('That backup file couldn\'t be read.'); }
}

/* ---------- shell ---------- */
function render() { return state.tab === 'dex' ? renderDex() : renderNearby(); }
// Each tab keeps its scroll spot; tapping the tab you're already on jumps to its top.
async function setTab(t) {
  const v = $('#view');
  if (t === state.tab) { v.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  state.scroll[state.tab] = v.scrollTop;
  state.tab = t;
  $('#tabDex').classList.toggle('on', t === 'dex'); $('#tabNear').classList.toggle('on', t === 'nearby');
  v.scrollTop = 0;
  await render();
  if (state.tab === t) v.scrollTop = state.scroll[t] || 0;
}

function bindBall() {
  const b = $('#ball'); b.innerHTML = ballSvg();
  let y0 = null, dy = 0, moved = false;
  b.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; moved = false; b.setPointerCapture(e.pointerId); b.classList.add('drag'); });
  b.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.min(0, e.clientY - y0); if (dy < -8 && !moved) { moved = true; sound.loadModel().catch(() => {}); } b.style.transform = `translate(-50%, ${Math.max(dy, -140)}px)`; });
  const end = () => {
    if (y0 == null) return;
    b.classList.remove('drag'); b.style.transform = '';
    const up = dy < -60; y0 = null;
    if (up) openCatchMenu(); else if (!moved) { toast('Swipe the ball up to catch a bird.', 1800); b.classList.add('nudge'); setTimeout(() => b.classList.remove('nudge'), 600); }
  };
  b.addEventListener('pointerup', end); b.addEventListener('pointercancel', () => { y0 = null; b.classList.remove('drag'); b.style.transform = ''; });
}

// Swipe right from the left edge to go back, like a native iPhone app.
function bindSwipeBack() {
  let el = null, x0 = 0, y0 = 0, dx = 0, locked = null;
  const layer = $('#layer');
  layer.addEventListener('touchstart', e => {
    const top = layer.lastElementChild, t = e.touches[0];
    if (!top || !top.querySelector('[data-x]') || t.clientX > 36) return;
    el = top; x0 = t.clientX; y0 = t.clientY; dx = 0; locked = null;
  }, { passive: true });
  layer.addEventListener('touchmove', e => {
    if (!el) return;
    const t = e.touches[0], mx = t.clientX - x0, my = t.clientY - y0;
    if (locked == null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) locked = Math.abs(mx) > Math.abs(my);
    if (!locked) return;
    e.preventDefault();
    dx = Math.max(0, mx);
    el.classList.add('swiping'); el.style.transform = `translateX(${dx}px)`;
  }, { passive: false });
  layer.addEventListener('touchend', () => {
    if (!el) return;
    const target = el; el = null;
    target.classList.remove('swiping'); target.classList.add('snap');
    if (locked && dx > Math.min(110, innerWidth * 0.28)) {
      target.style.transform = `translateX(${innerWidth}px)`;
      setTimeout(() => target.querySelector('[data-x]')?.click(), 200);
    } else {
      target.style.transform = '';
      setTimeout(() => target.classList.remove('snap'), 230);
    }
  });
}

function fitScreen() {
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  document.documentElement.classList.toggle('standalone', !!standalone);
  if (standalone) document.documentElement.style.setProperty('--full', Math.max(screen.height, innerHeight, document.documentElement.clientHeight) + 'px');
}
addEventListener('resize', fitScreen); addEventListener('pageshow', fitScreen);

async function init() {
  fitScreen();
  bindSwipeBack();
  bindBall();
  $('#tabDex').onclick = () => setTab('dex');
  $('#tabNear').onclick = () => setTab('nearby');
  $('#settingsBtn').onclick = openSettings;
  document.querySelector('.lens').onclick = openTrainerCard;
  state.catches = await catches.all();
  state.xp = (await kv.get('xp')) || 0;
  render();
  // Warm up location + nearby in the background so catching is fast.
  if (await api.ebirdKey()) loadNearby().then(() => { if (state.tab === 'dex') updateRegionLine(state.catches); migrationAlert(); });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      // A Home Screen app often resumes instead of reopening, so check for a new version whenever it comes back.
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    }).catch(() => {});
    // The app opens from its saved copy; when a new version has downloaded, switch to it at a calm moment.
    let had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!had) { had = true; return; }
      const reload = () => { if (!$('#layer').children.length) location.reload(); };
      reload();
      document.addEventListener('visibilitychange', () => { if (document.hidden) location.reload(); });
      $('#layer').addEventListener('click', () => setTimeout(reload, 400));
    });
  }
}

// Nearby showed a saved copy; when the fresh one lands, redraw it in place.
addEventListener('cache-refreshed', async e => {
  if (!e.detail.startsWith('nearby2:') || !state.loc) return;
  state.nearby = await api.nearbyData(state.loc);
  if (state.tab === 'nearby' && !$('#layer').children.length) { const v = $('#view'), y = v.scrollTop; await renderNearby(); v.scrollTop = y; }
});
init();

// Tapping the top edge of the screen scrolls the current page back to the top, like iOS apps do.
document.getElementById('toTop').onclick = () => {
  const ov = [...document.querySelectorAll('#layer .ov')].pop();
  const box = ov ? ov.querySelector('.scroll') || ov : document.getElementById('view');
  box.scrollTo({ top: 0, behavior: 'smooth' });
};
