// Turns what you said into field marks, then scores nearby birds against them.
import { SPECIES, BY_SCI, VOCAB, VERSUS } from './data.js';

const ALL_TAGS = [...new Set(SPECIES.flatMap(s => s.tags))].sort((a, b) => b.length - a.length);
const SIZE_ORDER = ['tiny', 'small', 'medium', 'large', 'huge'];

export function parseMarks(text) {
  let t = ' ' + text.toLowerCase().replace(/grey/g, 'gray').replace(/[^a-z\s-]/g, ' ') + ' ';
  const marks = new Set();
  let size = null;
  for (const [w, sz] of Object.entries(VOCAB.sizes)) {
    if (t.includes(' ' + w + ' ') || t.includes(' ' + w + '-')) { size = sz; break; }
  }
  // Longest phrases first so "black cap" wins over "black".
  for (const tag of ALL_TAGS) {
    if (t.includes(' ' + tag + ' ')) { marks.add(tag); t = t.replace(' ' + tag + ' ', ' ~ '); }
  }
  for (const c of VOCAB.colors) if (t.includes(' ' + c + ' ')) marks.add(c === 'grey' ? 'gray' : c);
  // A few everyday words birders use.
  const alias = { 'hanging upside': 'upside down', 'on the trunk': 'trunk', 'climbing the tree': 'climbing', 'in the water': 'water',
    'on the ground': 'ground', 'at the feeder': 'feeder', 'pecking': 'tapping', 'hopping': 'ground', 'streaky': 'streaks', 'spotted': 'spots' };
  for (const [a, tag] of Object.entries(alias)) if (text.toLowerCase().includes(a)) marks.add(tag);
  return { size, marks: [...marks] };
}

function sizeFit(a, b) {
  if (!a || !b) return 0;
  const d = Math.abs(SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
  return d === 0 ? 1 : d === 1 ? 0.4 : -0.6;
}

// pool: [{ sci, name, code, chance }]. Returns ranked candidates with a percent and reasons.
export function rank(parsed, pool) {
  const said = parsed.marks.length + (parsed.size ? 1 : 0);
  const out = pool.map(p => {
    const s = BY_SCI[p.sci];
    let fit = 0.12, why = [];
    if (s && said) {
      const hit = parsed.marks.filter(m => s.tags.includes(m) || s.tags.some(t => t.split(' ').includes(m)));
      const sf = sizeFit(parsed.size, s.size);
      fit = Math.max(0.02, (hit.length + Math.max(0, sf)) / said + Math.min(0, sf) * 0.5);
      why = hit.slice(0, 4).map(h => `${h} ✓`);
      if (sf === 1) why.unshift(`${s.size} ✓`);
    } else if (!said) fit = 0.3;
    const prior = p.chance ?? 0.03;
    const score = (0.72 * fit + 0.28 * prior) * (s ? 1 : 0.8);
    if (p.chance) why.push(`reported at ${Math.round(p.chance * 100)}% of spots near you`);
    return { ...p, score, why };
  }).sort((a, b) => b.score - a.score);
  const top = out.slice(0, 8), sum = top.reduce((a, c) => a + c.score ** 3, 0) || 1;
  top.forEach(c => c.pct = Math.max(1, Math.round(100 * c.score ** 3 / sum)));
  return top;
}

export function versusNote(a, b) {
  return VERSUS[`${a}|${b}`] || VERSUS[`${b}|${a}`] || null;
}
