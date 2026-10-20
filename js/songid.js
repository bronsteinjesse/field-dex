// Turns BirdNET's window-by-window guesses into a Merlin-style list: who has been heard, when, and who is singing now.
// Location does the heavy lifting against false matches: a bird reported near you lately needs only a modest match,
// one recorded in your county but not lately needs a strong, repeated match, and one never recorded there needs a near-certain one.

const norm = s => (s || '').toLowerCase().replace(/[^a-z]/g, '');

// recent: [{ sci, name, chance }] reported near you in the last 30 days. county: [{ sci, name }] ever recorded in your county (or null if unknown).
export function makeTracker(recent = [], county = null) {
  const bySci = new Map(), byName = new Map();
  for (const s of recent) { bySci.set(s.sci, { tier: 'recent', chance: s.chance ?? 0.3, sci: s.sci, name: s.name }); byName.set(norm(s.name), bySci.get(s.sci)); }
  for (const s of county || []) if (!bySci.has(s.sci)) { bySci.set(s.sci, { tier: 'county', chance: 0, sci: s.sci, name: s.name }); byName.set(norm(s.name), bySci.get(s.sci)); }
  // BirdNET's names are a few years older than eBird's, so fall back to matching the English name.
  const prior = d => bySci.get(d.sci) || byName.get(norm(d.name)) || { tier: county || recent.length ? 'none' : 'unknown', chance: 0 };

  const birds = new Map();
  let latest = 0;
  const add = (t, res) => {
    latest = Math.max(latest, t);
    for (const d of res) {
      const pr = prior(d);
      const key = pr.sci || d.sci;
      const b = birds.get(key) ?? { sci: key, name: pr.name || d.name, tier: pr.tier, chance: pr.chance, p: 0, hits: 0, first: t, last: t, times: [] };
      if (d.p >= 0.15) { b.hits++; b.times.push(t); b.last = t; }
      b.p = Math.max(b.p, d.p);
      birds.set(key, b);
    }
  };
  const shown = b => {
    if (b.tier === 'recent') return b.p >= 0.25 || (b.p >= 0.15 && b.hits >= 2);
    if (b.tier === 'county') return (b.p >= 0.5 && b.hits >= 2) || b.p >= 0.8;
    if (b.tier === 'none') return b.p >= 0.9 && b.hits >= 2;
    return b.p >= 0.3; // no location yet: plain BirdNET
  };
  const score = b => (b.p * 0.7 + Math.min(b.hits, 4) / 4 * 0.3) * (b.tier === 'recent' ? 0.8 + 0.2 * Math.min(1, b.chance * 2) : b.tier === 'county' ? 0.75 : 0.6);
  // Newest bird first, like Merlin; "now" means it was heard in the latest window.
  const list = () => [...birds.values()].filter(shown).map(b => ({ ...b, score: score(b), now: b.hits > 0 && b.last === latest }))
    .sort((a, b) => b.first - a.first || b.score - a.score);
  const ranked = () => list().sort((a, b) => b.score - a.score);
  return { add, list, ranked, get latest() { return latest; } };
}
