import { SPECIES, BY_SCI } from './data.js';
import { birdSvg, speciesLook, ballSvg } from './bird.js';
import { catches, photos, kv } from './store.js';
import * as api from './api.js';
import { parseMarks, rank, versusNote } from './match.js';
import * as sound from './sound.js';
import { drawCard } from './card.js';
import { drawMap } from './map.js';
import * as forecast from './forecast.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad3 = n => String(n).padStart(3, '0');
const fmtDate = d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const today = () => new Date().toISOString().slice(0, 10);

const state = { tab: 'dex', catches: [], nearby: null, loc: null, nearbyErr: null, xp: 0 };

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
const icon = (sci, name, m) => birdSvg(speciesLook(sci, name), m);
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

async function ensureLoc() {
  if (state.loc) return state.loc;
  try { state.loc = await api.getLocation(); } catch { state.loc = null; }
  return state.loc;
}

async function loadNearby(force) {
  if (state.nearby && !force) return state.nearby;
  state.nearbyErr = null;
  document.body.classList.add('busy');
  try {
    const loc = await ensureLoc();
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
    ${list.length ? `<div class="grid">${list.map((c, i) => [c, i]).reverse().map(([c, i]) => `
      <button class="t" data-sci="${esc(c.sci)}"><div class="fig">${c.rare ? '<span class="shiny">✦</span>' : ''}${icon(c.sci, c.name)}<i class="gs"></i></div>
      <div class="no">No.${pad3(i + 1)}</div><div class="nm">${esc(c.name)}</div></button>`).join('')}</div>`
    : `<div class="empty">${ballSvg()}<div class="ttl">No birds caught yet</div><div>Tap the ball to describe a bird you're looking at, or swipe it up to record a bird singing.</div></div>`}`;
  v.querySelectorAll('.t').forEach(b => b.onclick = () => openBird(b.dataset.sci));
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
  v.innerHTML = `<div class="hdr"><div class="ttl">NEARBY</div><div class="ctr">LOADING…</div></div>`;
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
    <div class="sub"><span>Within 25 km · last 30 days · ${state.nearby.spotCount} hotspots checked</span><button id="refresh" class="close">↻</button></div>
    <div id="fcast"></div>
    <div class="lab">TODAY'S HUNT · ${hunt.filter(h => h.done).length} OF ${hunt.length} FOUND</div>
    <div class="hunt">${hunt.map(h => `<button class="hrow nr ${h.done ? 'done' : ''}" data-sci="${esc(h.sci)}" data-name="${esc(h.name)}"><div class="ic">${icon(h.sci, h.name, h.done ? undefined : { kind: 'sil', sil: '#0c1610' })}</div>
      <div class="mid"><b>${esc(h.name)} <span class="tag">${h.lvl}</span></b><small>${h.done ? 'Found today!' : clue(h)}</small></div><span class="rw">+${h.xp}</span></button>`).join('') || '<p class="muted">Not enough reports nearby yet.</p>'}</div>
    <div id="moves"></div>
    ${rares.length ? `<div class="lab">RARE BIRDS NEARBY · THIS WEEK</div>${rares.map(r => `<button class="nr" data-sci="${esc(r.sci)}" data-name="${esc(r.name)}"><div class="ic">${icon(r.sci, r.name, { kind: 'sil', sil: '#45684f' })}</div><div class="mid"><b>${esc(r.name)}<span class="tag">RARE</span></b><small>${esc(r.obs.locName)}, ${r.km.toFixed(1)} km · ${fmtDate(r.obs.obsDt)}</small></div><span class="rw">+150</span></button>`).join('')}` : ''}
    <div class="lab">STILL TO FIND</div>${toFind.map(s => row(s)).join('')}`;
  $('#refresh').onclick = async () => { await loadNearby(true); renderNearby(); };
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
        ${c?.sightings.some(x => x.lat != null) ? '<button class="btn alt full" id="onMap" style="margin-top:10px">SEE ON CATCH MAP</button>' : ''}`;
      body.querySelector('#onMap')?.addEventListener('click', () => openCatchMap(sci));
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
  const el = overlay(`<div class="tbox"><span class="listen-dot"></span>LISTENING…<small>Describe the bird out loud. Tap anywhere to finish.</small></div>
    <div class="tbox" style="margin-top:10px;font-family:var(--sans);font-size:15px" id="said">${extra ? esc(extra) : '<span class="muted">“Small, gray, black cap…”</span>'}</div>
    <div class="chips" id="marks"></div>
    <div id="typeBox" hidden style="margin-top:10px"><textarea id="typed" rows="3" placeholder="Type what you see: size, colors, marks, what it's doing"></textarea></div>
    <div class="capfoot"><div class="row"><button class="btn alt" id="photoBtn">PHOTO</button><button class="btn alt" id="listBtn">PICK FROM LIST</button><button class="btn alt" id="cancelBtn">CANCEL</button></div></div>`);
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
    if (e.target.closest('#cancelBtn')) { finished = true; try { rec?.stop(); } catch {} el.remove(); return; }
    if (e.target.closest('textarea')) return;
    finish();
  });
  el.querySelector('#typed').addEventListener('input', e => show(e.target.value + ' ' + text));
  new MutationObserver(() => { said.hidden = !el.querySelector('#typeBox').hidden && !text; }).observe(el.querySelector('#typeBox'), { attributes: true });
  if (!el.querySelector('#typeBox').hidden && !text) said.hidden = true;
}

/* ---------- CATCH: photo ---------- */
function takePhoto(said = '') {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => {
    const f = inp.files?.[0]; if (!f) return;
    const blob = await shrink(f, 1600);
    loadNearby();
    if (said) whoIsIt({ method: 'photo', said, photo: blob });
    else pickFromList({ method: 'photo', photo: blob });
  };
  inp.click();
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
  const el = overlay(`<div class="tbox"><span class="listen-dot"></span>LISTENING FOR BIRDS…<small>Stay quiet and point your phone toward the song. Tap anywhere to stop.</small></div>
    <canvas class="spec" width="160" height="80" style="margin-top:10px"></canvas>
    <div id="load" class="muted" style="margin-top:8px"></div><div class="prog" id="prog" hidden><i></i></div>
    <div class="lab">HEARD SO FAR</div><div id="heard" class="muted">Nothing yet…</div>`);
  const cv = el.querySelector('canvas'), g = cv.getContext('2d');
  g.fillStyle = '#10201a'; g.fillRect(0, 0, cv.width, cv.height);
  let session = null, stopping = false, last = [];
  const nearSci = () => new Set((state.nearby?.species || []).map(s => s.sci));
  const filtered = d => { const ns = nearSci(); return d.filter(x => !ns.size || ns.has(x.sci) || x.p > 0.7); };
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
      if (u.loading != null && u.loading < 1) { el.querySelector('#prog').hidden = false; el.querySelector('#prog i').style.width = (u.loading * 100) + '%'; el.querySelector('#load').textContent = 'First time only: downloading the bird-song model (about 50 MB)…'; }
      if (u.loading === 1) { el.querySelector('#prog').hidden = true; el.querySelector('#load').textContent = ''; }
      if (u.error) el.querySelector('#load').textContent = 'Sound ID hit a problem: ' + u.error;
      if (u.detections) {
        last = filtered(u.detections);
        el.querySelector('#heard').innerHTML = last.length ? last.slice(0, 5).map(d => `<div class="nr"><div class="ic">${icon(d.sci, d.name)}</div><div class="mid"><b>${esc(d.name)}</b><div class="bar"><i style="width:${Math.round(d.p * 100)}%"></i></div></div><span class="rw">${Math.round(d.p * 100)}%</span></div>`).join('') : 'Nothing yet…';
      }
    });
  } catch (e) {
    el.remove(); toast('Field Dex needs the microphone to hear birds. Allow it in Settings.'); return;
  }
  el.addEventListener('click', async () => {
    if (stopping) return; stopping = true;
    el.querySelector('.tbox').innerHTML = 'THINKING…<small>Checking the recording.</small>';
    const res = await session.stop();
    el.remove();
    const d = filtered(res.detections);
    const audioId = await photos.add(res.audio);
    if (!d.length) { toast('No bird song recognized. Try closer, or tap the ball to describe it.'); return; }
    const cands = d.slice(0, 4).map(x => {
      const n = state.nearby?.species.find(s => s.sci === x.sci);
      return { sci: x.sci, name: n?.name || x.name, code: n?.code, chance: n?.chance, pct: Math.round(x.p * 100), why: [`song match ${Math.round(x.p * 100)}%`, n ? `reported at ${Math.round(n.chance * 100)}% of spots near you` : 'not reported nearby lately'] };
    });
    showCandidates(cands, { method: 'sound', audio: audioId });
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
  const top = cands.slice(0, 4);
  const mineUrl = ctx.photo ? URL.createObjectURL(ctx.photo) : null;
  const el = overlay(`<div class="topbar"><button class="close" data-x>✕ CANCEL</button><span class="muted">${ctx.method === 'sound' ? 'By song' : ctx.method === 'photo' ? 'By photo' : 'By description'}</span></div>
    <div class="scroll"><div class="tbox">WHO IS IT?<small>${ctx.parsed ? [ctx.parsed.size, ...ctx.parsed.marks].filter(Boolean).join(' · ') || 'Pick the one you saw' : 'Pick the one you saw'}</small></div>
    ${mineUrl ? `<div class="mine"><img src="${mineUrl}" alt="Your photo"></div>` : ''}
    <div class="pick">${top.map((c, i) => `<button class="pc ${i ? '' : 'top'}" data-i="${i}">${cardPic(c)}<b>${esc(c.name)}</b><span class="pct">${c.pct}%</span><small>${esc((c.why || []).slice(0, 3).join(' · '))}</small></button>`).join('')}</div>
    <div style="height:10px"></div><div class="row"><button class="btn alt" id="more">NONE OF THESE</button>${ctx.method !== 'photo' ? '<button class="btn alt" id="addPhoto">ADD PHOTO</button>' : ''}</div></div>`, 'solid');
  el.querySelector('[data-x]').onclick = () => el.remove();
  el.querySelector('#more').onclick = () => { el.remove(); pickFromList(ctx); };
  el.querySelector('#addPhoto')?.addEventListener('click', () => { el.remove(); takePhoto(ctx.said || ''); });
  el.querySelectorAll('.pc').forEach(b => b.onclick = () => {
    const c = top[+b.dataset.i];
    const other = top.find(x => x !== c && Math.abs(x.pct - c.pct) <= 15);
    const note = other && versusNote(c.sci, other.sci);
    el.remove();
    if (note) showdown(c, other, note, ctx); else gotcha(c, ctx);
  });
}

function showdown(a, b, note, ctx) {
  const el = overlay(`<div class="tbox">LOOK-ALIKE SHOWDOWN<small>${esc(note)}</small></div>
    <div class="vs">${[a, b].map((c, i) => `<button class="pc" data-i="${i}">${cardPic(c)}<b>${esc(c.name)}</b><span class="pct">${c.pct}%</span></button>`).join('')}</div>
    <div class="capfoot"><button class="btn alt full" data-x>BACK</button></div>`, 'solid');
  el.querySelectorAll('.pc').forEach(btn => btn.onclick = () => { el.remove(); gotcha([a, b][+btn.dataset.i], ctx); });
  el.querySelector('[data-x]').onclick = () => { el.remove(); showCandidates([a, b], ctx); };
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
    lst.querySelectorAll('.nr').forEach(b => b.onclick = () => { const c = all.find(x => x.sci === b.dataset.sci); el.remove(); gotcha({ ...c, pct: 90 }, ctx); });
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
  setTimeout(() => { wild.classList.remove('show'); cb.hidden = false; cb.style.setProperty('--n', wobbles); cb.classList.add('wob'); msg.textContent = '…'; }, 600);
  setTimeout(async () => {
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
      <div class="capfoot" style="margin-top:12px"><div class="row"><button class="btn" id="viewEntry">VIEW ENTRY</button><button class="btn alt" id="ok">DONE</button></div></div>`;
    el.querySelector('#viewEntry').onclick = () => { el.remove(); openBird(c.sci, c.name); };
    el.querySelector('#ok').onclick = () => el.remove();
  }, 600 + wobbles * 900 + 200);
}

async function saveCatch(c, ctx) {
  const loc = state.loc;
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
  const before = level(state.xp), had = earned(state.catches);
  state.xp += gain; await kv.set('xp', state.xp);
  state.catches = await catches.all();
  const no = [...state.catches].sort((a, b) => a.first.localeCompare(b.first)).findIndex(x => x.sci === c.sci) + 1;
  render();
  const badge = earned(state.catches).find(b => !had.includes(b));
  return { isNew, no, count: rec.count, xp: gain, tier: tier.name, level: level(state.xp), levelUp: level(state.xp) > before, badge };
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
    cv = await drawCard(data());
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
    const m = await drawMap(el.querySelector('#mp'), filt(only), (sci, name) => openBird(sci, name));
    el.querySelector('#mf').onchange = e => { m.map.closePopup(); m.show(filt(e.target.value)); };
  } catch { el.querySelector('#mp').innerHTML = '<p class="muted" style="padding:12px">The map needs a connection the first time.</p>'; }
}

/* ---------- SETTINGS ---------- */
async function openSettings() {
  const key = await api.ebirdKey();
  const el = overlay(`<div class="topbar"><button class="close" data-x>◀︎ BACK</button><span class="ttl" style="font-size:16px">SETTINGS</span></div><div class="scroll">
    <div class="card"><h3>EBIRD KEY</h3><p class="muted">Free from <a href="https://ebird.org/api/keygen" target="_blank" rel="noopener">ebird.org/api/keygen</a>. Stays on this phone.</p>
      <input id="k" value="${esc(key)}" placeholder="Paste your eBird key" autocomplete="off" autocapitalize="off" spellcheck="false"><div style="height:8px"></div><button class="btn full" id="ks">SAVE</button></div>
    <div class="card"><h3>IMPORT A LIFE LIST</h3><p class="muted">On eBird, open My eBird → Life list → Download (CSV). Pick that file here and every species on it is added as caught.</p>
      <div class="row"><button class="btn" id="paste">PASTE LIST</button><button class="btn alt" id="imp">CHOOSE FILE</button></div>
      <div id="pasteBox" hidden style="margin-top:8px"><textarea id="pasteIn" rows="4" placeholder="Paste the list here"></textarea><div style="height:8px"></div><button class="btn full" id="pasteGo">IMPORT</button></div></div>
    <div class="card"><h3>BACKUP</h3><p class="muted">Your dex lives only on this phone. Save a backup now and then.</p>
      <div class="row"><button class="btn" id="exp">SAVE BACKUP</button><button class="btn alt" id="res">RESTORE</button></div></div>
    <div class="card"><h3>SOUND ID</h3><p class="muted">The bird-song model downloads the first time you swipe up (about 50 MB), then works offline.</p><button class="btn alt full" id="pre">DOWNLOAD IT NOW</button><div class="prog" id="pp" hidden><i></i></div></div>
    <div class="card"><h3>CREDITS</h3><p class="muted">Sightings: eBird, Cornell Lab of Ornithology. Photos, sounds and descriptions: iNaturalist contributors (credited on each photo) and Wikipedia. Sound ID: BirdNET by the K. Lisa Yang Center for Conservation Bioacoustics and TU Chemnitz (CC BY-NC-SA 4.0), run with LiteRT.js.</p>
      <p class="muted">LV ${level(state.xp)} · ${state.xp} XP · ${state.catches.length} caught</p></div></div>`, 'solid');
  el.querySelector('[data-x]').onclick = () => el.remove();
  el.querySelector('#ks').onclick = async () => { await kv.set('ebirdKey', el.querySelector('#k').value.trim()); state.nearby = null; toast('Key saved'); render(); };
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
function render() { state.tab === 'dex' ? renderDex() : renderNearby(); }
function setTab(t) {
  state.tab = t;
  $('#tabDex').classList.toggle('on', t === 'dex'); $('#tabNear').classList.toggle('on', t === 'nearby');
  $('#view').scrollTop = 0; render();
}

function bindBall() {
  const b = $('#ball'); b.innerHTML = ballSvg();
  let y0 = null, dy = 0, moved = false;
  b.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; moved = false; b.setPointerCapture(e.pointerId); b.classList.add('drag'); });
  b.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.min(0, e.clientY - y0); if (dy < -8) moved = true; b.style.transform = `translate(-50%, ${Math.max(dy, -140)}px)`; });
  const end = () => {
    if (y0 == null) return;
    b.classList.remove('drag'); b.style.transform = '';
    const up = dy < -60; y0 = null;
    if (up) startListen(); else if (!moved) startTalk();
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
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}
init();

// Tapping the top edge of the screen scrolls the current page back to the top, like iOS apps do.
document.getElementById('toTop').onclick = () => {
  const ov = [...document.querySelectorAll('#layer .ov')].pop();
  const box = ov ? ov.querySelector('.scroll') || ov : document.getElementById('view');
  box.scrollTo({ top: 0, behavior: 'smooth' });
};
