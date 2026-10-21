// Turns what you said into field marks, then scores nearby birds against them.
import { SPECIES, BY_SCI, VOCAB, VERSUS } from './data.js';
import { COLORS } from './marks.js';

// Body parts people mention ("red head", "black cap") and the words bird names use for them ("Red-headed").
const PARTS = { head: 'head', headed: 'head', cap: 'cap', capped: 'cap', crown: 'crown', crowned: 'crown', throat: 'throat', throated: 'throat',
  breast: 'breast', breasted: 'breast', chest: 'breast', belly: 'belly', bellied: 'belly', back: 'back', backed: 'back', wing: 'wing', wings: 'wing',
  winged: 'wing', tail: 'tail', tailed: 'tail', rump: 'rump', rumped: 'rump', eye: 'eye', eyed: 'eye', bill: 'bill', billed: 'bill', beak: 'bill',
  neck: 'neck', necked: 'neck', nape: 'nape', naped: 'nape', side: 'side', sided: 'side', sides: 'side', face: 'face', faced: 'face', legs: 'legs', legged: 'legs', crest: 'crest', crested: 'crest', collar: 'collar', collared: 'collar', shoulder: 'shoulder', shouldered: 'shoulder',
  eyes: 'eye', cheek: 'cheek', cheeks: 'cheek', cheeked: 'cheek', chin: 'throat', bib: 'bib', forehead: 'forehead', eyebrow: 'eyebrow', eyebrows: 'eyebrow', flank: 'flanks', flanks: 'flanks', mask: 'mask', masked: 'mask', patch: 'patch', patches: 'patch', undertail: 'undertail', underside: 'belly', underparts: 'belly', stomach: 'belly', tummy: 'belly', feet: 'legs', leg: 'legs', mohawk: 'crest', tuft: 'crest' };
// Parts close enough that "red cap" should partly match a bird listed as "red head".
const NEAR_PART = { cap: ['head', 'crown', 'forehead'], crown: ['head', 'cap', 'forehead'], head: ['cap', 'crown', 'face'], forehead: ['cap', 'crown', 'head'],
  breast: ['belly', 'throat'], belly: ['breast', 'flanks', 'side'], throat: ['bib', 'breast', 'face'], bib: ['throat', 'breast'], face: ['cheek', 'head', 'mask'], cheek: ['face'],
  side: ['flanks', 'belly'], flanks: ['side', 'belly'], back: ['wing', 'nape'], wing: ['back', 'shoulder', 'patch'], shoulder: ['wing'], rump: ['tail', 'back'], tail: ['rump', 'undertail'], eyebrow: ['eye', 'face'], eye: ['eyebrow'] };
// Everyday words for the same thing, swapped in before matching. Phrases first, then single words.
const PHRASES = [[/\b(eye[\s-]?ring|ring around (the |its |his |her )?eyes?)\b/g, 'eye_ring'], [/\bwing[\s-]?bars?\b/g, 'wing_bars'], [/\b(eye[\s-]?line|line through (the |its )?eyes?|eye[\s-]?stripe)\b/g, 'eye_stripe'],
  [/\b(power|phone|telephone|electric) (line|wire)s?\b/g, 'wire'], [/\b(tree trunk|side of (a|the) tree|up the tree)\b/g, 'trunk'], [/\bupside[\s-]down\b/g, 'upside_down'],
  [/\b(catching|chasing) (bugs|insects|flies)\b/g, 'flycatching'], [/\b(bobbing|bobs|pumping|pumps) (its |the )?tail\b|\btail (bobbing|pumping)\b/g, 'tail_bobbing'], [/\b(wagging|wags|flicking|flicks) (its |the )?tail\b|\btail (wagging|flicking)\b/g, 'tail_wagging'],
  [/\bear tufts?\b|\bhorns\b/g, 'ear_tufts'], [/\breddish[\s-]brown\b/g, 'rusty'], [/\bblack and white\b/g, 'black_and_white']];
const SYN = { crimson: 'red', scarlet: 'red', reddish: 'red', ruby: 'red', maroon: 'red', orangish: 'orange', orangey: 'orange', golden: 'yellow', gold: 'yellow', lemon: 'yellow', yellowish: 'yellow',
  greenish: 'green', bluish: 'blue', blueish: 'blue', teal: 'blue', turquoise: 'blue', navy: 'blue', grayish: 'gray', silver: 'gray', silvery: 'gray', ashy: 'gray', brownish: 'brown', chocolate: 'brown',
  rufous: 'rusty', rust: 'rusty', cinnamon: 'rusty', copper: 'rusty', ginger: 'rusty', whitish: 'white', pale: 'white', cream: 'buff', creamy: 'buff', beige: 'buff', blackish: 'black', jet: 'black', pinkish: 'pink', violet: 'purple', shiny: 'iridescent', glossy: 'iridescent',
  striped: 'streaks', stripes: 'streaks', stripy: 'streaks', streaky: 'streaks', streaked: 'streaks', barring: 'barred', bars: 'barred', banded: 'barred', spotted: 'spots', spotty: 'spots', dots: 'spots', dotted: 'spots', speckles: 'speckled', flecked: 'speckled',
  crested: 'crest', tufted: 'crest', beak: 'bill', beaked: 'bill', conical: 'thick', stubby: 'short', chunky: 'thick', fat: 'thick', curved: 'hooked', hooks: 'hooked',
  hopping: 'ground', walking: 'ground', pond: 'water', lake: 'water', river: 'water', creek: 'water', stream: 'water', ocean: 'water', beach: 'water', swamp: 'marsh', reeds: 'marsh',
  yard: 'lawn', forest: 'woods', trees: 'woods', meadow: 'field', bush: 'brush', bushes: 'brush', shrub: 'brush', shrubs: 'brush', hedge: 'brush', group: 'flock', bunch: 'flock', flocks: 'flock',
  swam: 'swimming', swims: 'swimming', dove: 'diving', dives: 'diving', flew: 'flying', flies: 'flying', soars: 'soaring', hovered: 'hovering', hovers: 'hovering', climbed: 'climbing', climbs: 'climbing', wades: 'wading', scratched: 'scratching', sang: 'singing', sings: 'singing' };
// Shape words that pair with a part ("long tail", "thick bill").
const SHAPES = new Set(['long', 'short', 'thick', 'big', 'hooked', 'pointed', 'forked', 'needle', 'round', 'small', 'cocked']);
export function normalize(text) {
  let t = text.toLowerCase().replace(/grey/g, 'gray');
  for (const [re, to] of PHRASES) t = t.replace(re, to);
  return t.replace(/[^a-z_\s-]/g, ' ').split(/[\s-]+/).filter(Boolean).map(w => SYN[w] || w).join(' ').replace(/_/g, ' ');
}
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
  text = normalize(text);
  let t = ' ' + text + ' ';
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
    const part = PARTS[w]; if (!part || ['ring', 'stripe', 'bars', 'tufts'].includes(words[i + 1]) && part !== 'crest') return;
    // Look back up to three words, stopping at another body part ("black cap, white cheeks").
    for (let j = i - 1; j >= Math.max(0, i - 3) && !PARTS[words[j]]; j--) {
      if (COLOR_WORDS.has(words[j])) marks.add(`${words[j]} ${part}`);
      if (SHAPES.has(words[j]) && ALL_TAGS.includes(`${words[j]} ${part}`)) marks.add(`${words[j]} ${part}`);
    }
    // "tail is long", "bill was thick"
    for (let j = i + 1; j <= Math.min(words.length - 1, i + 3); j++) if (SHAPES.has(words[j]) && ALL_TAGS.includes(`${words[j]} ${part}`)) marks.add(`${words[j]} ${part}`);
    if (['crest', 'mask', 'eyebrow'].includes(part)) marks.add(part);
  });
  // Single words that are field marks on their own (patterns, habits, places).
  for (const w of words) if (ALL_TAGS.includes(w) && !COLOR_WORDS.has(w) && !PARTS[w] && !VOCAB.sizes[w]) marks.add(w);
  for (const w of words) { const g = GROUPS.find(g => w === g || w === g + 's'); if (g) marks.add(g); }
  for (const sz of SIZE_ORDER) marks.delete(sz);
  // "white cheek" is already covered by "white cheeks".
  for (const m of [...marks]) if ([...marks].some(o => o !== m && o.startsWith(m) && o.length - m.length <= 1)) marks.delete(m);
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
      const near = m => { const [c, p] = m.split(' '); return (NEAR_PART[p] || []).some(q => tags.includes(`${c} ${q}`)); };
      const hits = parsed.marks.map(m => tags.includes(m) ? 1 : tags.some(t => t.split(' ').includes(m)) ? 0.8 : m.includes(' ') && near(m) ? 0.7 : m.includes(' ') && tags.includes(m.split(' ')[0]) ? 0.5 : 0);
      // A plain color or bird group the bird doesn't have, or a specific mark like "black bib" it lacks, counts against it.
      const misses = parsed.marks.filter((m, i) => !hits[i] && (COLOR_WORDS.has(m) || GROUPS.includes(m) || m.includes(' '))).length;
      const sf = s ? sizeFit(parsed.size, s.size) : 0;
      // Size is a rough guess in the field, so it weighs a bit less than a field mark.
      fit = Math.max(0.02, (hits.reduce((a, b) => a + b, 0) + 0.6 * Math.max(0, sf)) / (said - (parsed.size ? 0.4 : 0)) + Math.min(0, sf) * 0.4 - misses * 0.08);
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

// What to look for on a bird: its hand-written marks if it has them, otherwise its colors and what its name says.
export function marksFor(sci, name) {
  const s = BY_SCI[sci];
  const tags = s ? s.tags : autoTags(name || '', sci);
  return tags.filter(t => !SIZE_ORDER.includes(t)).slice(0, 10);
}
