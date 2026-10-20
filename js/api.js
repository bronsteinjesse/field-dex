// eBird (sightings, hotspots, regional lists) and iNaturalist (photos, sounds, facts).
import { cached, kv } from './store.js';

const EBIRD = 'https://api.ebird.org/v2';
const INAT = 'https://api.inaturalist.org/v1';
const H = 3600e3, DAY = 24 * H;

export async function ebirdKey() { return (await kv.get('ebirdKey')) || ''; }

async function eb(path) {
  const key = await ebirdKey();
  if (!key) throw new Error('NO_KEY');
  const r = await fetch(EBIRD + path, { headers: { 'X-eBirdApiToken': key } });
  if (r.status === 401 || r.status === 403) throw new Error('BAD_KEY');
  if (!r.ok) throw new Error('eBird ' + r.status);
  return r.json();
}

const round = (x, p = 2) => Math.round(x * 10 ** p) / 10 ** p;

export function distKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function getLocation() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('NO_GEO'));
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      e => rej(new Error('GEO_DENIED')),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60e3 });
  });
}

// Everything the Nearby page and the matcher need, for one spot.
// "chance" = share of nearby active hotspots that reported the species in the last 30 days.
export async function nearbyData(loc) {
  const k = `${round(loc.lat)},${round(loc.lng)}`;
  return cached('nearby2:' + k, 3 * H, async () => {
    const [recent, hotspots, notable] = await Promise.all([
      eb(`/data/obs/geo/recent?lat=${loc.lat}&lng=${loc.lng}&dist=25&back=30`),
      eb(`/ref/hotspot/geo?lat=${loc.lat}&lng=${loc.lng}&dist=15&back=30&fmt=json`),
      eb(`/data/obs/geo/recent/notable?lat=${loc.lat}&lng=${loc.lng}&dist=25&back=7`).catch(() => []),
    ]);
    const spots = hotspots
      .map(h => ({ ...h, km: distKm(loc, h) }))
      .sort((a, b) => (b.numSpeciesAllTime || 0) / (1 + b.km) - (a.numSpeciesAllTime || 0) / (1 + a.km))
      .slice(0, 8);
    const lists = await Promise.all(spots.map(s => eb(`/data/obs/${s.locId}/recent?back=30`).catch(() => [])));
    const species = {};
    for (const o of recent) {
      species[o.sciName] = { code: o.speciesCode, name: o.comName, sci: o.sciName, hits: 0, last: o, lastKm: distKm(loc, o) };
    }
    lists.forEach((list, i) => {
      for (const o of list) {
        const s = species[o.sciName] ??= { code: o.speciesCode, name: o.comName, sci: o.sciName, hits: 0, last: o, lastKm: distKm(loc, o) };
        s.hits++;
        if (!s.best || new Date(o.obsDt) > new Date(s.best.obsDt)) s.best = { ...o, km: spots[i].km };
      }
    });
    const n = Math.max(1, lists.filter(l => l.length).length);
    for (const s of Object.values(species)) s.chance = Math.min(0.97, (s.hits + 0.3) / (n + 0.6));
    // Closest place each bird was reported.
    for (const o of [...recent, ...lists.flat()]) {
      const s = species[o.sciName]; if (!s) continue;
      const km = distKm(loc, o); if (s.nearKm == null || km < s.nearKm) s.nearKm = km;
    }
    const county = spots[0]?.subnational2Code || hotspots[0]?.subnational2Code || null;
    // Better odds: the share of recent nearby checklists that include each bird (eBird's own "frequency").
    const freq = await checklistFrequency(county, loc).catch(() => null);
    if (freq && freq.n >= 8) {
      for (const s of Object.values(species)) {
        const f = (freq.counts[s.code] || 0) / freq.n;
        s.chance = Math.max(0.01, Math.min(0.97, f > 0 ? f : s.chance * 0.15));
      }
    }
    const state = spots[0]?.subnational1Code || hotspots[0]?.subnational1Code || null;
    return {
      at: Date.now(), loc, county, state, spotCount: n,
      species: Object.values(species),
      notable: [...new Map(notable.map(o => [o.sciName, { code: o.speciesCode, name: o.comName, sci: o.sciName, obs: o, km: distKm(loc, o) }])).values()],
    };
  });
}

async function checklistFrequency(county, loc) {
  if (!county) return null;
  const lists = await eb(`/product/lists/${county}?maxResults=200`);
  const near = lists.map(l => {
    const la = l.loc?.latitude ?? l.loc?.lat, ln = l.loc?.longitude ?? l.loc?.lng;
    return { id: l.subId || l.subID, km: la != null ? distKm(loc, { lat: la, lng: ln }) : 99 };
  }).filter(l => l.id && l.km < 30).slice(0, 40);
  const counts = {}; let n = 0;
  for (let i = 0; i < near.length; i += 8) {
    const views = await Promise.all(near.slice(i, i + 8).map(l => eb(`/product/checklist/view/${l.id}`).catch(() => null)));
    for (const v of views) {
      if (!v?.obs?.length) continue;
      n++;
      for (const code of new Set(v.obs.map(o => o.speciesCode))) counts[code] = (counts[code] || 0) + 1;
    }
  }
  return { n, counts };
}

// All-time species list for a region, with names, for the regional dex.
export async function regionSpecies(region) {
  if (!region) return [];
  return cached('region:' + region, 14 * DAY, async () => {
    const codes = await eb(`/product/spplist/${region}`);
    const out = [];
    for (let i = 0; i < codes.length; i += 200) {
      const tax = await eb(`/ref/taxonomy/ebird?fmt=json&species=${codes.slice(i, i + 200).join(',')}`);
      for (const t of tax) if (t.category === 'species') out.push({ code: t.speciesCode, name: t.comName, sci: t.sciName });
    }
    return out;
  });
}

export async function regionName(region) {
  if (!region) return '';
  return cached('rname:' + region, 60 * DAY, async () => (await eb(`/ref/region/info/${region}`)).result || region);
}

export async function speciesNear(code, loc) {
  return cached(`near:${code}:${round(loc.lat)},${round(loc.lng)}`, 6 * H,
    () => eb(`/data/obs/geo/recent/${code}?lat=${loc.lat}&lng=${loc.lng}&dist=50&back=30`));
}

async function inat(path) {
  const r = await fetch(INAT + path);
  if (!r.ok) throw new Error('iNat ' + r.status);
  return r.json();
}

// Photos (curated taxon photos), a short summary, and the taxon id.
export async function taxonInfo(sci) {
  return cached('taxon:' + sci, 30 * DAY, async () => {
    const q = await inat(`/taxa?q=${encodeURIComponent(sci)}&rank=species&per_page=5`);
    const hit = q.results.find(t => t.name === sci) || q.results[0];
    if (!hit) return null;
    const full = (await inat(`/taxa/${hit.id}`)).results[0];
    const photosList = (full.taxon_photos || []).slice(0, 12).map(tp => ({
      thumb: tp.photo.square_url || tp.photo.url,
      medium: tp.photo.medium_url,
      large: tp.photo.large_url || (tp.photo.medium_url || '').replace('medium', 'large'),
      credit: tp.photo.attribution,
    }));
    const summary = (full.wikipedia_summary || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return { id: hit.id, photos: photosList, thumb: hit.default_photo?.medium_url || photosList[0]?.medium, summary, wiki: full.wikipedia_url };
  });
}

export async function thumbFor(sci) {
  try { return (await taxonInfo(sci))?.thumb || null; } catch { return null; }
}

export async function sounds(sci) {
  return cached('sounds:' + sci, 30 * DAY, async () => {
    const t = await taxonInfo(sci);
    if (!t) return [];
    const o = await inat(`/observations?taxon_id=${t.id}&sounds=true&quality_grade=research&per_page=8&order_by=votes`);
    return o.results.flatMap(r => (r.sounds || []).map(s => ({
      url: s.file_url, credit: s.attribution, place: r.place_guess, date: r.observed_on,
    }))).filter(s => s.url).slice(0, 6);
  });
}

// Migration: birds reported on many more days this week than two weeks ago (arriving), or the reverse (leaving).
// Uses eBird's day-by-day sightings for your county: the last 7 days vs days 15-21 ago.
export async function migration(region) {
  if (!region) return { arriving: [], leaving: [] };
  const day = n => { const d = new Date(Date.now() - n * DAY); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };
  return cached(`move:${region}:${day(0)}`, 12 * H, async () => {
    const tally = {};
    const week = async (from, key) => {
      const days = await Promise.all([0, 1, 2, 3, 4, 5, 6].map(i =>
        eb(`/data/obs/${region}/historic/${day(from + i)}?rank=mrec&detail=simple&cat=species`).catch(() => [])));
      for (const list of days) for (const o of list) {
        const s = tally[o.sciName] ??= { code: o.speciesCode, name: o.comName, sci: o.sciName, now: 0, before: 0, nowBirds: 0, beforeBirds: 0 };
        s[key]++; s[key + 'Birds'] += o.howMany || 1;
      }
      return days.filter(d => d.length).length;
    };
    const [a, b] = await Promise.all([week(1, 'now'), week(15, 'before')]);
    if (a < 4 || b < 4) return { arriving: [], leaving: [] };
    const all = Object.values(tally);
    const arriving = all.filter(s => s.now >= 3 && (s.before === 0 || (s.now - s.before >= 3 && s.nowBirds >= 3 * s.beforeBirds)))
      .sort((x, y) => (y.now - y.before) - (x.now - x.before) || y.nowBirds - x.nowBirds).slice(0, 8);
    const leaving = all.filter(s => s.before >= 4 && s.now <= 1)
      .sort((x, y) => (y.before - y.now) - (x.before - x.now)).slice(0, 5);
    return { arriving, leaving };
  });
}
