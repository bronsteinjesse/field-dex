// Turns what you said into field marks, then scores nearby birds against them.
import { SPECIES, BY_SCI, VOCAB, VERSUS } from './data.js';
import { COLORS } from './marks.js';

// Body parts people mention ("red head", "black cap") and the words bird names use for them ("Red-headed").
const PARTS = { head: 'head', headed: 'head', cap: 'cap', capped: 'cap', crown: 'crown', crowned: 'crown', throat: 'throat', throated: 'throat',
  breast: 'breast', breasted: 'breast', chest: 'breast', belly: 'belly', bellied: 'belly', back: 'back', backed: 'back', wing: 'wing', wings: 'wing',
  winged: 'wing', tail: 'tail', tailed: 'tail', rump: 'rump', rumped: 'rump', eye: 'eye', eyed: 'eye', bill: 'bill', billed: 'bill', beak: 'bill',
  neck: 'neck', necked: 'neck', nape: 'nape', naped: 'nape', side: 'side', sided: 'side', sides: 'side', face: 'face', faced: 'face', legs: 'legs', legged: 'legs', crest: 'crest', crested: 'crest', collar: 'collar', collared: 'collar', shoulder: 'shoulder', shouldered: 'shoulder' };
// Kinds of bird people name outright ("some kind of woodpecker").
const GROUPS = ['woodpecker', 'sparrow', 'warbler', 'duck', 'goose', 'swan', 'hawk', 'eagle', 'falcon', 'owl', 'heron', 'egret', 'gull', 'tern', 'dove', 'pigeon', 'finch', 'thrush',
  'wren', 'jay', 'crow', 'raven', 'blackbird', 'grackle', 'oriole', 'tanager', 'vireo', 'flycatcher', 'swallow', 'hummingbird', 'kingfisher', 'sandpiper', 'plover',
  'nuthatch', 'chickadee', 'titmouse', 'cardinal', 'grosbeak', 'bunting', 'towhee', 'junco', 'kinglet', 'thrasher', 'mockingbird', 'starling', 'waxwing', 'cormorant',
  'pelican', 'ibis', 'vulture', 'kite', 'parrot', 'parakeet', 'quail', 'grouse', 'turkey', 'loon', 'grebe', 'coot', 'rail', 'phoebe', 'kingbird', 'magpie', 'tit', 'robin', 'lark', 'pipit', 'shrike', 'swift', 'cuckoo'];
const COLOR_WORDS = new Set(VOCAB.colors.map(c => c === 'grey' ? 'gray' : c));
const slugOf = sci => sci.toLowerCase().replace(/ /g, '-');

// Field marks for any bird: its sprite's colors, plus what its name says ("Red-bellied Woodpecker" -> red belly, woodpecker).
function autoTags(name, sci) {
  const tags = new Set((COLORS[slugOf(sci)] || '').split(' ').filter(Boolean));
  const words = name.toLowerCase().replace(/grey/g, 'gray').split(/[\s-]+/);
  words.forEach((w, i) => {
    if (COLOR_WORDS.has(w)) { tags.add(w); const part = PARTS[words[i + 1]]; if (part) tags.add(`${w} ${part}`); }
    if (PARTS[w]) tags.add(PARTS[w]);
    const g = GROUPS.find(g => w === g || w === g + 's'); if (g) tags.add(g);
  });
  return [...tags];
}

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
  // "red on its head", "a black cap", "yellow belly": a color within a couple of words of a body part.
  const words = text.toLowerCase().replace(/grey/g, 'gray').replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);
  words.forEach((w, i) => {
    const part = PARTS[w]; if (!part) return;
    for (let j = Math.max(0, i - 3); j < i; j++) if (COLOR_WORDS.has(words[j])) marks.add(`${words[j]} ${part}`);
  });
  for (const w of words) { const g = GROUPS.find(g => w === g || w === g + 's'); if (g) marks.add(g); }
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
    const tags = s ? [...new Set([...s.tags, ...autoTags(p.name || s.n, p.sci)])] : autoTags(p.name || '', p.sci);
    const known = s || COLORS[slugOf(p.sci)];
    if (known && said) {
      // A "red head" mark also half-counts for a bird that is simply red.
      const hits = parsed.marks.map(m => tags.includes(m) ? 1 : tags.some(t => t.split(' ').includes(m)) ? 0.8 : m.includes(' ') && tags.includes(m.split(' ')[0]) ? 0.5 : 0);
      const misses = parsed.marks.filter((m, i) => !hits[i] && (COLOR_WORDS.has(m) || GROUPS.includes(m))).length;
      const sf = s ? sizeFit(parsed.size, s.size) : 0;
      fit = Math.max(0.02, (hits.reduce((a, b) => a + b, 0) + Math.max(0, sf)) / said + Math.min(0, sf) * 0.5 - misses * 0.08);
      why = parsed.marks.filter((m, i) => hits[i] >= 0.8).slice(0, 4).map(h => `${h} ✓`);
      if (sf === 1) why.unshift(`${s.size} ✓`);
      if (!s) fit *= 0.9; // auto marks are rougher than the hand-written ones
    } else if (!said) fit = 0.3;
    const prior = p.chance ?? 0.03;
    const score = (0.72 * fit + 0.28 * prior) * (known ? 1 : 0.8);
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
