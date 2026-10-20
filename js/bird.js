// Parametric bird icons: a body shape for the kind of bird, painted with the species' own colors and marks.
import { BY_SCI } from './data.js';
import { LOOKS } from './looks.js';

let uid = 0;

// Species we have no drawing for get a shape from their name and plain earthy colors.
export function speciesLook(sci, name = '') {
  if (LOOKS[sci]) return LOOKS[sci];
  if (BY_SCI[sci]) return BY_SCI[sci];
  const n = name.toLowerCase();
  const base = { head: '#7d7466', body: '#8a7f70', wing: '#6e6558', breast: '#cfc5b2', beak: '#3a3a3a' };
  if (/goose|swan|whistling/.test(n)) return { t: 'duck', neck: 'long', c: base };
  if (/grebe|loon/.test(n)) return { t: 'duck', grebe: true, c: base };
  if (/duck|teal|merganser|scaup|wigeon|gadwall|scoter|eider|pintail|shoveler|canvasback|redhead|goldeneye|bufflehead/.test(n)) return { t: 'duck', c: base };
  if (/cormorant|shag|anhinga|darter/.test(n)) return { t: 'cormorant', c: { ...base, head: '#2a2a2a', body: '#2a2a2a', wing: '#3a3a35', beak: '#8a7a5a' } };
  if (/gallinule|moorhen|coot|rail|crake/.test(n)) return { t: 'rail', c: { ...base, head: '#2e2e33', body: '#3a3a3f', wing: '#4a4a3a', breast: '#3a3a3f', beak: '#d8c23a', shield: '#c8382a', legs: '#c8c23a' } };
  if (/pelican/.test(n)) return { t: 'pelican', c: base };
  if (/gull|kittiwake/.test(n)) return { t: 'gull', c: { head: '#f2f0ea', breast: '#f2f0ea', wing: '#9aa1a6', tip: '#1e1e1e', beak: '#e0c23a', legs: '#d9a59a' } };
  if (/tern|skimmer/.test(n)) return { t: 'gull', tern: true, c: { head: '#f2f0ea', cap: '#1e1e1e', breast: '#f2f0ea', wing: '#c3c8cc', tip: '#5a5f63', beak: '#d4542a', legs: '#1e1e1e' } };
  if (/vulture|frigatebird|condor/.test(n)) return { t: 'soar', c: { ...base, head: '#2a2a2a', body: '#2a2a2a', wing: '#2a2a2a', flight: '#6a6a6a' } };
  if (/hawk|eagle|falcon|kestrel|merlin|osprey|owl|harrier|kite|caracara/.test(n))
    return { t: 'raptor', c: { ...base, breast: '#e6dccb', streaks: '#6e5a44', tail: '#6e6558' } };
  if (/ibis|curlew|whimbrel/.test(n)) return { t: 'heron', bill: 'curve', c: { ...base, head: '#6a5a50', neck: '#6a5a50' } };
  if (/spoonbill/.test(n)) return { t: 'heron', bill: 'spoon', c: base };
  if (/night.heron/.test(n)) return { t: 'heron', stout: true, c: base };
  if (/heron|egret|crane|bittern|stork/.test(n)) return { t: 'heron', c: { ...base, head: '#d8d2c4', cap: '#3a3a3a', beak: '#c9a13a' } };
  if (/sandpiper|plover|lapwing|killdeer|yellowlegs|dowitcher|turnstone|sanderling|dunlin|stilt|avocet|willet|snipe|godwit/.test(n)) return { t: 'shore', c: { ...base, legs: '#4a4a3a' } };
  if (/kingfisher/.test(n)) return { t: 'perch', big: true, crest: 'shaggy', bill: 13, billShape: 'dagger', tl: 'short', c: { ...base, head: '#4a6a8a', body: '#4a6a8a', wing: '#3e5d7d' } };
  if (/parrot|parakeet|macaw|conure|lovebird/.test(n)) return { t: 'perch', billShape: 'hook', bill: 5, tl: 'long', c: { ...base, head: '#4f9a4a', body: '#4f9a4a', wing: '#3f8a3e', breast: '#8fc06a', beak: '#d9d0b0' } };
  if (/dove|pigeon/.test(n)) return { t: 'perch', dove: true, c: base };
  if (/swallow|martin|swift/.test(n)) return { t: 'perch', dove: true, bill: 3, tl: 'fork', c: { ...base, head: '#35506e', body: '#35506e', wing: '#2e4662' } };
  if (/hummingbird|violetear|emerald|sapphire|hermit|sunangel|woodstar/.test(n)) return { t: 'hummer', c: { ...base, head: '#4a7a52', body: '#4a7a52', wing: '#8a9a8a', breast: '#c9cfc0', throat: '#4a7a52' } };
  if (/woodpecker|sapsucker|flicker/.test(n)) return { t: 'woodpecker', c: { ...base, head: '#efe9dc', cap: '#1e1e1e', body: '#2a2a2a', wing: '#2a2a2a', bars: '#efe9dc', breast: '#e6dfcf' } };
  if (/blackbird|grackle|crow|raven|cowbird|jackdaw|rook/.test(n)) return { t: 'perch', bill: 8, c: { head: '#1c1c1c', body: '#1e1e1e', wing: '#1a1a1a', breast: '#1e1e1e', beak: '#1c1c1c' } };
  if (/warbler|kinglet|gnatcatcher|vireo|yellowthroat|waterthrush/.test(n)) return { t: 'perch', small: true, bill: 4, c: { ...base, head: '#9a9a5a', body: '#8f9058', breast: '#e6d98a' } };
  if (/sparrow|towhee|junco|bunting|longspur/.test(n)) return { t: 'perch', billShape: 'thick', c: { ...base, head: '#8a6448', body: '#866650', breast: '#e6dccb', streaks: '#6a4a32' } };
  return { t: 'perch', c: base };
}

const TREE = '#4b3b2c', INK = '#16110d';

// m: { kind: 'full' | 'sil', sil: '#color' }
export function birdSvg(look, m = { kind: 'full' }) {
  const s = look, col = s.c || {};
  const id = 'b' + (uid++), S = m.kind === 'sil';
  const f = k => S ? m.sil : (col[k] ?? (k === 'tail' ? col.wing : k === 'neck' ? col.breast : col.body) ?? '#8a7f70');
  const has = k => !S && col[k];
  const legC = S ? m.sil : (col.legs || '#5a4a3a'), eyeC = col.eye || '#121212';
  const eye = (x, y, r = 1.5) => S ? '' :  (s.ring ? `<circle class="e" cx="${x}" cy="${y}" r="${r + 1}" fill="${typeof s.ring === 'string' ? s.ring : '#f4efe4'}"/>` : '') + `<circle class="e" cx="${x}" cy="${y}" r="${r}" fill="${eyeC}"/>` + (col.eye ? `<circle class="e" cx="${x}" cy="${y}" r="${r * .45}" fill="#121212"/>` : '') + `<circle class="e" cx="${x + r * .35}" cy="${y - r * .38}" r="${r * .38}" fill="#fff"/>`;
  const clip = (name, shape) => { d += `<clipPath id="${id}${name}">${shape}/></clipPath>`; return `url(#${id}${name})`; };
  let d = '', g = '';

  if (s.t === 'duck') {
    const long = s.neck === 'long', hx = 48, hy = long ? 13 : 24;
    const body = '<ellipse cx="30" cy="42" rx="21" ry="10"';
    const bc = clip('b', body);
    g += `<path d="M4 56 Q18 52 32 56 T62 56" stroke="${S ? m.sil : '#7d9a98'}" stroke-width="1.4" fill="none"/>`;
    if (s.legs && !S) g += `<path d="M28 50 L27 57 M34 50 L35 57" stroke="${legC}" stroke-width="1.8" stroke-linecap="round"/>`;
    if (!s.grebe) g += `<path d="M12 39 L3 34 L11 45Z" fill="${f('tail')}"/>`;
    g += `<rect x="${hx - 6}" y="${hy + 2}" width="${long ? 8 : 9}" height="${42 - hy - 2}" rx="4" fill="${f(long ? 'neck' : 'head')}"/>`;
    g += `${body} fill="${f('body')}"/>`;
    if (!S) g += `<g clip-path="${bc}"><ellipse cx="47" cy="40" rx="8" ry="10" fill="${f('breast')}"/>${has('flank') ? `<ellipse cx="30" cy="48" rx="14" ry="4" fill="${f('flank')}"/>` : ''}${has('vent') ? `<ellipse cx="11" cy="44" rx="5" ry="4" fill="${f('vent')}"/>` : ''}</g>`;
    g += `<ellipse cx="26" cy="39" rx="13" ry="5" fill="${f('wing')}"/>`;
    if (has('speculum')) g += `<rect x="18" y="38" width="10" height="2.4" fill="${f('speculum')}"/>`;
    if (has('patch')) g += `<ellipse cx="30" cy="37" rx="6" ry="2.6" fill="${f('patch')}"/>`;
    const hr = s.grebe ? 6.5 : 7.5;
    const hc = clip('h', `<circle cx="${hx}" cy="${hy}" r="${hr}"`);
    g += `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${f('head')}"/>`;
    if (!S) {
      let p = '';
      if (col.cap) p += `<rect x="${hx - hr}" y="${hy - hr}" width="${2 * hr}" height="${hr * .9}" fill="${f('cap')}"/>`;
      if (col.cheek) p += `<ellipse cx="${hx + .5}" cy="${hy + 4.5}" rx="4.2" ry="2.6" fill="${f('cheek')}"/>`;
      if (col.mask) p += `<ellipse cx="${hx + 2}" cy="${hy - 1}" rx="4" ry="3" fill="${f('mask')}"/>`;
      if (p) g += `<g clip-path="${hc}">${p}</g>`;
      if (col.collar) g += `<rect x="${hx - 6}" y="${hy + 8}" width="9" height="2" fill="${f('collar')}"/>`;
    }
    const bl = s.grebe ? 6 : 9;
    g += `<path d="M${hx + hr - 1.5} ${hy - 1.5} Q${hx + hr + bl} ${hy - 1} ${hx + hr + bl - .5} ${hy + 3.5} L${hx + hr - 1.5} ${hy + 3.5}Z" fill="${f('beak')}"/>`;
    if (has('billRing')) g += `<rect x="${hx + hr + 1}" y="${hy - 1.5}" width="1.4" height="5" fill="${f('billRing')}"/>`;
    g += eye(hx + 2.5, hy - 1.5, 1.4);
  } else if (s.t === 'raptor') {
    const body = '<ellipse cx="32" cy="36" rx="12" ry="15"';
    const bc = clip('b', body);
    g += `<path d="M27 46 L37 46 L38 60 L26 60Z" fill="${f('tail')}"/>`;
    if (has('tailBand')) g += `<rect x="26" y="55" width="12" height="2.5" fill="${f('tailBand')}"/>`;
    g += `<path d="M30 50 L29 54 M35 50 L36 54" stroke="${S ? m.sil : (col.legs || '#d8b632')}" stroke-width="2" stroke-linecap="round"/>`;
    g += `${body} fill="${f('body')}"/>`;
    if (!S) {
      g += `<g clip-path="${bc}"><ellipse cx="36" cy="37" rx="8" ry="12" fill="${f('breast')}"/>`;
      if (col.streaks) g += [[35, 41], [39, 42], [33, 44], [37, 45], [41, 45]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.3" ry="1.8" fill="${f('streaks')}"/>`).join('');
      if (col.barring) g += [32, 35.5, 39, 42.5, 46].map(y => `<path d="M30 ${y} L44 ${y}" stroke="${f('barring')}" stroke-width="1.6"/>`).join('');
      g += '</g>';
    }
    g += `<ellipse cx="27" cy="37" rx="8" ry="14" transform="rotate(8 27 37)" fill="${f('wing')}"/>`;
    if (has('spots')) g += `<circle cx="26" cy="33" r="1.2" fill="${f('spots')}"/><circle cx="29" cy="38" r="1.2" fill="${f('spots')}"/><circle cx="25" cy="42" r="1.2" fill="${f('spots')}"/>`;
    if (s.crest) g += `<path d="M31 12 L30 3 L36 9 Z M41 10 L44 2 L45 11Z" fill="${f('head')}"/>`;
    const hc = clip('h', '<circle cx="37" cy="17" r="8.5"');
    g += `<circle cx="37" cy="17" r="8.5" fill="${f('head')}"/>`;
    if (!S) {
      let p = '';
      if (col.cap) p += `<rect x="28" y="8" width="18" height="7" fill="${f('cap')}"/>`;
      if (col.mask) p += `<rect x="33" y="14" width="13" height="3" fill="${f('mask')}"/>`;
      if (col.malar) p += `<rect x="38.5" y="17" width="2.2" height="7" fill="${f('malar')}"/><rect x="33" y="16" width="2" height="6" fill="${f('malar')}"/>`;
      p += `<rect x="36" y="18" width="9" height="7" rx="3" fill="${f(col.throat ? 'throat' : 'breast')}"/>`;
      if (col.face) p += `<ellipse cx="44" cy="17" rx="3.5" ry="3" fill="${f('face')}"/>`;
      g += `<g clip-path="${hc}">${p}</g>`;
    }
    g += `<path d="M44.5 13.5 L50 16 Q49.5 21 46 19.5Z" fill="${f('beak')}"/>`;
    if (has('cere')) g += `<path d="M44.2 13.4 L46.5 14.4 L46 16.6 L44.2 16Z" fill="${f('cere')}"/>`;
    g += eye(41, 15, 1.5);
  } else if (s.t === 'heron') {
    const curve = s.bill === 'curve', spoon = s.bill === 'spoon';
    if (s.stout) {
      g += `<path d="M28 42 L27 60 M33 42 L34 60" stroke="${legC === '#5a4a3a' ? '#c9b23a' : legC}" stroke-width="1.8" stroke-linecap="round"/>`;
      g += `<path d="M16 36 L8 42 L18 40Z" fill="${f('tail')}"/>`;
      g += `<ellipse cx="30" cy="35" rx="15" ry="10" transform="rotate(-8 30 35)" fill="${f('body')}"/>`;
      g += `<ellipse cx="34" cy="39" rx="10" ry="6" fill="${f('breast')}"/>`;
      g += `<ellipse cx="26" cy="35" rx="12" ry="6.5" transform="rotate(-8 26 35)" fill="${f('wing')}"/>`;
      const hc = clip('h', '<circle cx="44" cy="25" r="7.5"');
      g += `<circle cx="44" cy="25" r="7.5" fill="${f('head')}"/>`;
      if (has('cap')) g += `<g clip-path="${hc}"><rect x="36" y="17" width="16" height="6.5" fill="${f('cap')}"/></g>`;
      if (has('plume')) g += `<path d="M38 22 Q28 24 22 30" stroke="${f('plume')}" stroke-width="1" fill="none"/>`;
      g += `<path d="M50.5 22.5 L61 24.5 L50.5 27Z" fill="${f('beak')}"/>`;
      g += eye(47, 24, 1.5);
    } else {
      g += `<path d="M27 38 L25 61 M32 38 L34 61" stroke="${S ? m.sil : (col.legs || '#4e4a40')}" stroke-width="1.6" stroke-linecap="round"/>`;
      g += `<path d="M14 34 L4 40 L16 38Z" fill="${f('tail')}"/>`;
      g += `<ellipse cx="27" cy="32" rx="14" ry="8" transform="rotate(-10 27 32)" fill="${f('body')}"/>`;
      if (has('belly')) g += `<ellipse cx="31" cy="36" rx="9" ry="4" fill="${f('belly')}"/>`;
      g += `<path d="M37 28 Q47 22 40 15 Q35 9 43 7" stroke="${f('neck')}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      if (has('neckStripe')) g += `<path d="M38.5 27 Q46 22 40.5 16" stroke="${f('neckStripe')}" stroke-width="1.6" fill="none"/>`;
      g += `<ellipse cx="24" cy="31" rx="11" ry="5.5" transform="rotate(-10 24 31)" fill="${f('wing')}"/>`;
      if (has('patch')) g += `<ellipse cx="29" cy="29" rx="5" ry="2.6" transform="rotate(-10 29 29)" fill="${f('patch')}"/>`;
      if (has('plume')) g += `<path d="M18 30 Q8 30 3 36 M20 32 Q10 33 5 39" stroke="${f('plume')}" stroke-width="1" fill="none"/>`;
      g += `<circle cx="45" cy="8" r="4.5" fill="${f('head')}"/>`;
      if (has('cap')) g += `<path d="M41 6 L32 4 L41 8Z" fill="${f('cap')}"/><path d="M41 5.5 L49 5.5" stroke="${f('cap')}" stroke-width="1.6"/>`;
      if (has('face')) g += `<ellipse cx="48" cy="8.5" rx="2.6" ry="2" fill="${f('face')}"/>`;
      if (curve) g += `<path d="M48.5 7 Q58 7 61 18 Q57 10 48.5 10Z" fill="${f('beak')}"/>`;
      else if (spoon) g += `<path d="M48.5 7.2 L57 8.4 L57 9.8 L48.5 10.2Z" fill="${f('beak')}"/><ellipse cx="59.5" cy="9.2" rx="3.4" ry="2.3" fill="${f('beak')}"/>`;
      else g += `<path d="M48.5 7 L62 9.5 L48.5 10.5Z" fill="${f('beak')}"/>`;
      g += eye(46.5, 7.6, 1.1);
    }
  } else if (s.t === 'woodpecker') {
    g += `<rect x="9" y="0" width="9" height="64" fill="${S ? m.sil : TREE}" opacity="${S ? .35 : 1}"/>`;
    g += `<path d="M21 44 L16 61 L22 60 L27 47Z" fill="${f('tail')}"/>`;
    const body = '<ellipse cx="27" cy="34" rx="9" ry="15" transform="rotate(14 27 34)"';
    const bc = clip('b', body);
    g += `${body} fill="${f('body')}"/>`;
    if (!S) {
      g += `<g clip-path="${bc}"><ellipse cx="33" cy="36" rx="6" ry="14" transform="rotate(14 33 36)" fill="${f('breast')}"/>`;
      if (col.belly) g += `<ellipse cx="31" cy="44" rx="4" ry="4" fill="${f('belly')}"/>`;
      if (col.streaks) g += [[33, 34], [31, 39], [34, 41], [30, 44]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1" ry="1.6" fill="${f('streaks')}"/>`).join('');
      if (col.band) g += `<ellipse cx="35" cy="26" rx="4" ry="2.5" fill="${f('band')}"/>`;
      g += '</g>';
    }
    g += `<ellipse cx="24" cy="34" rx="6" ry="13" transform="rotate(14 24 34)" fill="${f('wing')}"/>`;
    if (has('back')) g += `<ellipse cx="26" cy="31" rx="2.3" ry="9" transform="rotate(14 26 31)" fill="${f('back')}"/>`;
    if (has('bars')) g += [26, 30, 34, 38, 42].map(y => `<path d="M${19 + (y - 26) * -.25} ${y} L${27 + (y - 26) * -.25} ${y + 1}" stroke="${f('bars')}" stroke-width="1.3"/>`).join('');
    if (has('spots')) g += [[21, 30], [24, 35], [20, 39], [23, 43]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="${f('spots')}"/>`).join('');
    g += `<path d="M24 46 L20 47 M26 47 L21 49" stroke="${legC}" stroke-width="1.4" stroke-linecap="round"/>`;
    const hx = 33, hy = 16, hr = 7.5;
    const hc = clip('h', `<circle cx="${hx}" cy="${hy}" r="${hr}"`);
    g += `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${f('head')}"/>`;
    if (!S) {
      let p = '';
      if (col.cap) p += `<rect x="${hx - hr}" y="${hy - hr}" width="${2 * hr}" height="${hr * .85}" fill="${f('cap')}"/>`;
      if (col.nape) p += `<rect x="${hx - hr}" y="${hy - hr}" width="${hr * .9}" height="${hr * 1.3}" fill="${f('nape')}"/>`;
      if (col.mask) p += `<rect x="${hx - hr}" y="${hy - .5}" width="${2 * hr}" height="2.2" fill="${f('mask')}"/>`;
      if (col.cheek) p += `<rect x="${hx - hr}" y="${hy + 2.2}" width="${2 * hr}" height="2" fill="${f('cheek')}"/>`;
      if (col.throat) p += `<rect x="${hx}" y="${hy + 3.5}" width="${hr}" height="${hr}" fill="${f('throat')}"/>`;
      if (col.malar) p += `<rect x="${hx + 1}" y="${hy + 2}" width="5" height="2" fill="${f('malar')}"/>`;
      if (p) g += `<g clip-path="${hc}">${p}</g>`;
    }
    if (s.crest) g += `<path d="M${hx - 5} ${hy - 5} L${hx - 10} ${hy - 12} L${hx + 1} ${hy - 7.5}Z" fill="${f(col.crestC ? 'crestC' : col.cap ? 'cap' : 'head')}"/>`;
    g += `<path d="M${hx + hr - 1} ${hy - 1.5} L${hx + hr + (s.bill || 9)} ${hy + .3} L${hx + hr - 1} ${hy + 1.8}Z" fill="${f('beak')}"/>`;
    g += eye(hx + 2.5, hy - 1.5, 1.3);
  } else if (s.t === 'hummer') {
    g += `<path d="M21 44 L9 53 L13 57 L25 47Z" fill="${f('tail')}"/>`;
    if (has('tailBand')) g += `<path d="M10.5 54 L13 57 L15 55.6 L12.4 52.6Z" fill="${f('tailBand')}"/>`;
    g += `<path d="M33 44 L32 48" stroke="${legC}" stroke-width="1.2" stroke-linecap="round"/>`;
    const body = '<ellipse cx="30" cy="38" rx="12" ry="7.5" transform="rotate(-30 30 38)"';
    const bc = clip('b', body);
    g += `${body} fill="${f('body')}"/>`;
    if (!S) g += `<g clip-path="${bc}"><ellipse cx="35" cy="43" rx="9" ry="6" fill="${f('breast')}"/></g>`;
    g += `<ellipse cx="24" cy="24" rx="4.2" ry="14" transform="rotate(-38 24 24)" fill="${f('wing')}" opacity="${S ? 1 : .8}"/>`;
    const hc = clip('h', '<circle cx="40" cy="28" r="6.5"');
    g += `<circle cx="40" cy="28" r="6.5" fill="${f('head')}"/>`;
    if (!S) {
      let p = '';
      if (col.throat) p += `<rect x="36" y="30" width="12" height="6" fill="${f('throat')}"/>`;
      if (col.ear) p += `<ellipse cx="40" cy="28.5" rx="4" ry="2.4" fill="${f('ear')}"/>`;
      if (p) g += `<g clip-path="${hc}">${p}</g>`;
      if (col.throat) g += `<ellipse cx="41" cy="34.5" rx="4.5" ry="2.6" fill="${f('throat')}"/>`;
    }
    g += `<path d="M45.5 27 L63 25.6 L45.5 29Z" fill="${f('beak')}"/>`;
    g += eye(42.5, 26.5, 1.3);
    if (!S && col.dot) g += `<circle cx="39.5" cy="27" r=".9" fill="${f('dot')}"/>`;
  } else if (s.t === 'gull') {
    g += `<path d="M28 44 L27 56 M34 44 L35 56" stroke="${legC}" stroke-width="1.8" stroke-linecap="round"/>`;
    if (s.tern) g += `<path d="M14 34 L2 30 L8 35 L1 38 L15 37Z" fill="${f('wing')}"/>`;
    const body = `<ellipse cx="30" cy="36" rx="${s.tern ? 16 : 18}" ry="${s.tern ? 7.5 : 9}" transform="rotate(-6 30 36)"`;
    g += `${body} fill="${f('breast')}"/>`;
    g += `<ellipse cx="25" cy="32.5" rx="${s.tern ? 15 : 17}" ry="5.5" transform="rotate(-8 25 32.5)" fill="${f('wing')}"/>`;
    g += `<path d="M12 31 L0 ${s.tern ? 35 : 38} L14 35.5Z" fill="${f('tip')}"/>`;
    if (has('mirror')) g += `<circle cx="5" cy="35.5" r="1" fill="${f('mirror')}"/>`;
    const hx = 46, hy = s.tern ? 26 : 25, hr = s.tern ? 6 : 7;
    const hc = clip('h', `<circle cx="${hx}" cy="${hy}" r="${hr}"`);
    g += `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${f('head')}"/>`;
    if (!S) {
      let p = '';
      if (col.cap) p += `<rect x="${hx - hr}" y="${hy - hr}" width="${2 * hr}" height="${hr * (s.tern ? .95 : 1.1)}" fill="${f('cap')}"/>`;
      if (col.hood) p += `<rect x="${hx - hr}" y="${hy - hr}" width="${2 * hr}" height="${hr * 1.7}" fill="${f('hood')}"/>`;
      if (col.streaks) p += `<path d="M${hx - 5} ${hy - 1} L${hx - 1} ${hy - 2} M${hx - 6} ${hy + 2} L${hx - 2} ${hy + 1}" stroke="${f('streaks')}" stroke-width="1"/>`;
      if (p) g += `<g clip-path="${hc}">${p}</g>`;
    }
    if (s.tern && col.cap && !S) g += `<path d="M${hx - 5} ${hy - 3} L${hx - 11} ${hy - 1} L${hx - 5} ${hy}Z" fill="${f('cap')}"/>`;
    const bl = s.tern ? 11 : 10;
    g += s.tern ? `<path d="M${hx + hr - 1} ${hy - 1} L${hx + hr + bl} ${hy + 1} L${hx + hr - 1} ${hy + 2.2}Z" fill="${f('beak')}"/>`
      : `<path d="M${hx + hr - 1} ${hy - 1.6} L${hx + hr + bl} ${hy - .5} Q${hx + hr + bl + .5} ${hy + 1.6} ${hx + hr + bl - 2} ${hy + 1.8} L${hx + hr - 1} ${hy + 2.2}Z" fill="${f('beak')}"/>`;
    if (has('billTip')) g += `<circle cx="${hx + hr + bl - 2}" cy="${hy + 1.1}" r="1" fill="${f('billTip')}"/>`;
    g += eye(hx + 2.5, hy - 1.5, 1.3);
  } else if (s.t === 'soar') {
    const ang = s.angular;
    const w = ang ? 'M32 27 L21 21 L3 27 L19 27 L29 33Z' : 'M32 26 Q20 17 3 21 L5 26 Q18 27 28 33Z';
    const wr = ang ? 'M32 27 L43 21 L61 27 L45 27 L35 33Z' : 'M32 26 Q44 17 61 21 L59 26 Q46 27 36 33Z';
    g += `<path d="${w}" fill="${f('wing')}"/><path d="${wr}" fill="${f('wing')}"/>`;
    if (has('flight')) g += `<path d="${ang ? 'M21 24 L4 27 L19 27Z' : 'M18 24 Q10 22 4 23.5 L5 26 Q12 26.5 20 28Z'}" fill="${f('flight')}"/><path d="${ang ? 'M43 24 L60 27 L45 27Z' : 'M46 24 Q54 22 60 23.5 L59 26 Q52 26.5 44 28Z'}" fill="${f('flight')}"/>`;
    g += s.fork ? `<path d="M30 36 L25 52 L32 42 L39 52 L34 36Z" fill="${f('tail')}"/>` : `<path d="M29 35 L27 44 L37 44 L35 35Z" fill="${f('tail')}"/>`;
    g += `<ellipse cx="32" cy="29" rx="5" ry="8" fill="${f('body')}"/>`;
    if (has('breast')) g += `<ellipse cx="32" cy="27" rx="3.6" ry="4.5" fill="${f('breast')}"/>`;
    g += `<circle cx="32" cy="19" r="4" fill="${f('head')}"/>`;
    if (has('pouch')) g += `<ellipse cx="32" cy="24" rx="3" ry="2.6" fill="${f('pouch')}"/>`;
    g += s.hook ? `<path d="M30.8 15.8 L31.2 7 Q32.5 5.5 33.4 7.5 L33.2 15.8Z" fill="${f('beak')}"/>` : `<path d="M30.8 15.5 L32 10.5 L33.2 15.5Z" fill="${f('beak')}"/>`;
  } else if (s.t === 'cormorant') {
    g += `<rect x="24" y="53" width="14" height="11" fill="${S ? m.sil : TREE}" opacity="${S ? .35 : 1}"/>`;
    g += `<path d="M25 46 L19 57 L26 56 L30 48Z" fill="${f('tail')}"/>`;
    const body = '<ellipse cx="31" cy="39" rx="8.5" ry="14" transform="rotate(14 31 39)"';
    const bc = clip('b', body);
    g += `${body} fill="${f('body')}"/>`;
    if (!S) g += `<g clip-path="${bc}"><ellipse cx="36" cy="38" rx="5" ry="12" transform="rotate(14 36 38)" fill="${f('breast')}"/></g>`;
    g += `<ellipse cx="28" cy="38" rx="6.5" ry="12" transform="rotate(14 28 38)" fill="${f('wing')}"/>`;
    if (has('bars')) g += [31, 35, 39, 43].map(y => `<path d="M${25} ${y} L${31} ${y - 2}" stroke="${f('bars')}" stroke-width="1.1"/>`).join('');
    g += `<path d="M34 28 Q${s.snake ? '42 20 37 12' : '41 20 37 13'}" stroke="${f('neck')}" stroke-width="${s.snake ? 3.6 : 5}" fill="none" stroke-linecap="round"/>`;
    const hx = 39, hy = s.snake ? 10 : 11, hr = s.snake ? 3.8 : 5;
    g += `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${f('head')}"/>`;
    if (has('throat')) g += `<ellipse cx="${hx + 2.5}" cy="${hy + 3}" rx="2.6" ry="2" fill="${f('throat')}"/>`;
    g += s.snake ? `<path d="M${hx + hr - 1} ${hy - 1} L${hx + hr + 13} ${hy + .6} L${hx + hr - 1} ${hy + 1.8}Z" fill="${f('beak')}"/>`
      : `<path d="M${hx + hr - 1} ${hy - 1.2} L${hx + hr + 10} ${hy - .4} Q${hx + hr + 11.5} ${hy + .4} ${hx + hr + 10} ${hy + 1.8} L${hx + hr - 1} ${hy + 2}Z" fill="${f('beak')}"/>`;
    g += eye(hx + 1.5, hy - 1, 1.2);
  } else if (s.t === 'pelican') {
    g += `<rect x="20" y="52" width="16" height="12" fill="${S ? m.sil : TREE}" opacity="${S ? .35 : 1}"/>`;
    g += `<path d="M12 40 L3 46 L14 44Z" fill="${f('tail')}"/>`;
    g += `<ellipse cx="26" cy="40" rx="16" ry="11" transform="rotate(-10 26 40)" fill="${f('body')}"/>`;
    g += `<ellipse cx="23" cy="38" rx="13" ry="7" transform="rotate(-10 23 38)" fill="${f('wing')}"/>`;
    if (has('streaks')) g += [[17, 36], [22, 35], [27, 37], [20, 40]].map(([x, y]) => `<path d="M${x} ${y} l3 1.4" stroke="${f('streaks')}" stroke-width="1"/>`).join('');
    g += `<path d="M36 34 Q44 26 40 18" stroke="${f('neck')}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    g += `<circle cx="41" cy="15" r="5.5" fill="${f('head')}"/>`;
    if (has('cap')) g += `<path d="M36 13 Q41 8 46 13Z" fill="${f('cap')}"/>`;
    g += `<path d="M45 13.5 L63 22 L61 24 Q52 25 45 18Z" fill="${f('beak')}"/>`;
    if (has('pouch')) g += `<path d="M46 18 Q52 27 61 24 Q52 23 46 17Z" fill="${f('pouch')}"/>`;
    g += eye(43, 14, 1.2);
  } else if (s.t === 'shore' || s.t === 'rail') {
    const rail = s.t === 'rail';
    const lx = rail ? 30 : 31;
    g += `<path d="M${lx} 43 L${lx - 2} 59 M${lx + 6} 43 L${lx + 7} 59" stroke="${legC}" stroke-width="${rail ? 2 : 1.4}" stroke-linecap="round"/>`;
    if (rail) g += `<path d="M${lx - 6} 59.5 L${lx + 2} 59.5 M${lx + 3} 59.5 L${lx + 12} 59.5" stroke="${legC}" stroke-width="1.4" stroke-linecap="round"/>`;
    g += rail ? `<path d="M19 33 L11 25 L17 38Z" fill="${f('tail')}"/>` : `<path d="M20 36 L10 40 L20 40Z" fill="${f('tail')}"/>`;
    if (rail && has('vent')) g += `<path d="M16 31 L11 26 L14 33Z" fill="${f('vent')}"/>`;
    const body = rail ? '<ellipse cx="31" cy="36" rx="14" ry="10.5" transform="rotate(-10 31 36)"' : '<ellipse cx="32" cy="36" rx="13" ry="8" transform="rotate(-10 32 36)"';
    const bc = clip('b', body);
    g += `${body} fill="${f('body')}"/>`;
    if (!S) {
      g += `<g clip-path="${bc}"><ellipse cx="40" cy="41" rx="10" ry="7" fill="${f('breast')}"/>`;
      if (col.band) g += `<ellipse cx="42" cy="34" rx="5" ry="3.5" fill="${f('band')}"/>`;
      if (col.streaks) g += [[40, 35], [43, 37], [38, 38]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx=".9" ry="1.4" fill="${f('streaks')}"/>`).join('');
      g += '</g>';
    }
    g += `<ellipse cx="28" cy="34" rx="11" ry="5.5" transform="rotate(-10 28 34)" fill="${f('wing')}"/>`;
    if (has('patch')) g += `<ellipse cx="31" cy="32" rx="4" ry="2.4" transform="rotate(-10 31 32)" fill="${f('patch')}"/>`;
    if (has('flankLine')) g += `<path d="M20 39 L36 37" stroke="${f('flankLine')}" stroke-width="1.6" stroke-linecap="round"/>`;
    if (has('spots')) g += [[23, 33], [27, 31], [31, 34], [25, 36]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="${f('spots')}"/>`).join('');
    const hx = rail ? 44 : 44, hy = rail ? 24 : 27, hr = rail ? 6.5 : 5.8;
    if (s.crest && !rail) g += `<path d="M${hx - 3} ${hy - 4} Q${hx - 9} ${hy - 10} ${hx - 13} ${hy - 7}" stroke="${f('cap')}" stroke-width="1.2" fill="none"/>`;
    const hc = clip('h', `<circle cx="${hx}" cy="${hy}" r="${hr}"`);
    g += `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${f('head')}"/>`;
    if (!S) {
      let p = '';
      if (col.cap) p += `<rect x="${hx - hr}" y="${hy - hr}" width="${2 * hr}" height="${hr * .8}" fill="${f('cap')}"/>`;
      if (col.throat) p += `<rect x="${hx - 1}" y="${hy + 2}" width="${hr + 2}" height="${hr}" fill="${f('throat')}"/>`;
      if (col.brow) p += `<path d="M${hx - 4} ${hy - 3} L${hx + hr} ${hy - 3}" stroke="${f('brow')}" stroke-width="1.4"/>`;
      if (p) g += `<g clip-path="${hc}">${p}</g>`;
    }
    const b = s.bill || (rail ? 5 : 8);
    if (rail && has('shield')) g += `<path d="M${hx + hr - 2} ${hy - 4.5} Q${hx + hr + 1} ${hy - 3} ${hx + hr} ${hy}" stroke="${f('shield')}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    g += rail ? `<path d="M${hx + hr - 1} ${hy - 2} L${hx + hr + b} ${hy + .8} L${hx + hr - 1} ${hy + 3}Z" fill="${f('beak')}"/>`
      : `<path d="M${hx + hr - 1} ${hy - .8} L${hx + hr + b} ${hy + .8} L${hx + hr - 1} ${hy + 1.6}Z" fill="${f('beak')}"/>`;
    if (rail && has('billBase')) g += `<path d="M${hx + hr - 1} ${hy - 2} L${hx + hr + 2} ${hy - .7} L${hx + hr + 2} ${hy + 2} L${hx + hr - 1} ${hy + 3}Z" fill="${f('billBase')}"/>`;
    g += eye(hx + 2, hy - 1.3, 1.3);
  } else {
    const hr = s.dove ? 6.5 : s.big ? 10 : s.small ? 9 : 8.5, hx = s.big ? 45 : 46, hy = s.dove ? 27 : s.big ? 23 : 24, b = s.bill || 6;
    const body = '<ellipse cx="34" cy="38" rx="16" ry="11" transform="rotate(-18 34 38)"';
    const bc = clip('b', body);
    const hc = clip('h', `<circle cx="${hx}" cy="${hy}" r="${hr}"`);
    g += `<path d="M33 48 L31 57 M39 47 L39 57" stroke="${legC}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    const tails = { long: 'M22 40 L0 57 L4 61 L26 45Z', short: 'M22 40 L13 46 L15 50 L26 45Z', fork: 'M22 40 L3 48 L9 50 L4 55 L26 45Z', up: 'M22 41 L10 30 L7 34 L24 45Z' };
    g += `<path d="${tails[s.tl] || (s.dove ? 'M22 40 L1 53 L5 57 L26 45Z' : 'M22 40 L6 50 L9 55 L26 45Z')}" fill="${f('tail')}"/>`;
    if (has('tailTip')) g += `<path d="${s.tl === 'long' ? 'M2 56 L5 59.5 L8 57 L5 54Z' : 'M7 51 L9 55 L12 53 L10 49Z'}" fill="${f('tailTip')}"/>`;
    g += `${body} fill="${f('body')}"/>`;
    if (!S) {
      g += `<g clip-path="${bc}"><ellipse cx="42" cy="43" rx="11" ry="9" fill="${f('breast')}"/>`;
      if (col.belly) g += `<ellipse cx="38" cy="49" rx="11" ry="5" fill="${f('belly')}"/>`;
      if (col.flank) g += `<ellipse cx="36" cy="47" rx="7" ry="3" fill="${f('flank')}"/>`;
      if (col.band) g += `<ellipse cx="45" cy="35" rx="7" ry="3" fill="${f('band')}"/>`;
      if (col.bib) g += `<ellipse cx="46" cy="34" rx="5" ry="4.5" fill="${f('bib')}"/>`;
      if (col.streaks) g += [[40, 40], [44, 43], [38, 45], [42, 47], [46, 39]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.1" ry="1.9" fill="${f('streaks')}"/>`).join('');
      if (col.spotsB) g += [[41, 38], [45, 41], [39, 43], [43, 45], [47, 37], [37, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="${f('spotsB')}"/>`).join('');
      if (col.vent) g += `<ellipse cx="26" cy="46" rx="4" ry="3" fill="${f('vent')}"/>`;
      g += '</g>';
    }
    g += `<ellipse cx="29" cy="36" rx="12" ry="6.5" transform="rotate(-22 29 36)" fill="${f('wing')}"/>`;
    if (has('zebra')) g += [20, 24, 28, 32].map(x => `<path d="M${x} ${42 - (x - 20) * .45} L${x + 2.2} ${36 - (x - 20) * .45}" stroke="${f('zebra')}" stroke-width="1.5"/>`).join('');
    if (has('edge')) g += `<path d="M19 40 L36 31.5" stroke="${f('edge')}" stroke-width="1.4" stroke-linecap="round"/>`;
    if (has('bars')) g += `<path d="M23 38 L32 33.5 M25.5 41 L34.5 36.5" stroke="${f('bars')}" stroke-width="1.3" stroke-linecap="round"/>`;
    if (has('spots')) g += `<circle cx="27" cy="36" r="1.2" fill="${f('spots')}"/><circle cx="31" cy="34" r="1.2" fill="${f('spots')}"/><circle cx="24" cy="39" r="1.1" fill="${f('spots')}"/>`;
    if (has('epaulet')) g += `<ellipse cx="34" cy="31.5" rx="5" ry="2.8" fill="${f('epaulet')}"/>`;
    if (has('epauletEdge')) g += `<path d="M30 34.5 L38 30.5" stroke="${f('epauletEdge')}" stroke-width="1.1"/>`;
    if (has('patch')) g += `<ellipse cx="26" cy="38.5" rx="3.6" ry="2" transform="rotate(-22 26 38.5)" fill="${f('patch')}"/>`;
    if (s.crest === 'fan') g += `<path d="M${hx - 7} ${hy - 3} L${hx - 14} ${hy - 12} L${hx - 6} ${hy - 11} L${hx - 3} ${hy - 17} L${hx + 1} ${hy - 10} L${hx + 5} ${hy - 13} L${hx + 4} ${hy - 6}Z" fill="${f(col.crestC ? 'crestC' : 'head')}"/>` + (has('crestTip') ? `<path d="M${hx - 14} ${hy - 12} L${hx - 12} ${hy - 10} M${hx - 3} ${hy - 17} L${hx - 2.5} ${hy - 14} M${hx + 5} ${hy - 13} L${hx + 4} ${hy - 10.5}" stroke="${f('crestTip')}" stroke-width="2"/>` : '');
    else if (s.crest === 'shaggy') g += `<path d="M${hx - 9} ${hy - 2} L${hx - 12} ${hy - 9} L${hx - 7} ${hy - 7} L${hx - 7} ${hy - 13} L${hx - 2} ${hy - 9} L${hx} ${hy - 13} L${hx + 3} ${hy - 7}Z" fill="${f(col.cap ? 'cap' : 'head')}"/>`;
    else if (s.crest) g += `<path d="M${hx - 6} ${hy - 4} L${hx - 9} ${hy - 15} L${hx + 2} ${hy - 7}Z" fill="${f(col.crestC ? 'crestC' : col.cap ? 'cap' : 'head')}"/>`;
    g += `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${f('head')}"/>`;
    if (!S) {
      let p = '';
      if (col.cap) p += `<rect x="${hx - hr}" y="${hy - hr}" width="${2 * hr}" height="${hr * (s.capH || .85)}" fill="${f('cap')}"/>`;
      if (col.crown) p += `<rect x="${hx - hr}" y="${hy - hr - 1}" width="${2 * hr}" height="${hr * .55}" fill="${f('crown')}"/>`;
      if (col.crownStripe) p += `<rect x="${hx - hr}" y="${hy - hr * .82}" width="${2 * hr}" height="1.5" fill="${f('crownStripe')}"/>`;
      if (col.cheek) p += `<ellipse cx="${hx + 1}" cy="${hy + 3.2}" rx="${hr * .62}" ry="${hr * .38}" fill="${f('cheek')}"/>`;
      if (col.brow) p += `<path d="M${hx - hr} ${hy - 4.4} L${hx + hr - 1} ${hy - 4.4}" stroke="${f('brow')}" stroke-width="1.7"/>`;
      if (col.mask) p += `<rect x="${hx - hr}" y="${hy - 2.5}" width="${2 * hr}" height="${s.maskH || 4}" fill="${f('mask')}"/>`;
      if (col.nape) p += `<rect x="${hx - hr}" y="${hy - hr * .4}" width="${hr * .55}" height="${hr * .55}" fill="${f('nape')}"/>`;
      if (col.throat) p += `<rect x="${hx - 1}" y="${hy + 2.5}" width="${hr + 2}" height="${hr}" fill="${f('throat')}"/>`;
      if (col.malar) p += `<path d="M${hx} ${hy + 3} L${hx + 5} ${hy + 4.5}" stroke="${f('malar')}" stroke-width="1.4"/>`;
      if (col.lore) p += `<circle cx="${hx + hr - 2.5}" cy="${hy - 2.5}" r="1.5" fill="${f('lore')}"/>`;
      if (col.earDot) p += `<circle cx="${hx}" cy="${hy + .5}" r="1.6" fill="${f('earDot')}"/>`;
      if (p) g += `<g clip-path="${hc}">${p}</g>`;
      if (col.collar) g += `<path d="M${hx - 7} ${hy + 5} Q${hx + 1} ${hy + 11} ${hx + 7} ${hy + 5}" stroke="${f('collar')}" stroke-width="2" fill="none"/>`;
    }
    const bx = hx + hr - 1.5, sh = s.billShape;
    const bills = {
      thick: `M${bx} ${hy - 3} L${bx + b} ${hy + .3} L${bx} ${hy + 3.2}Z`,
      hook: `M${bx} ${hy - 3} Q${bx + b + 1} ${hy - 3} ${bx + b} ${hy + 2.6} L${bx + b - 1.6} ${hy + 1.2} L${bx} ${hy + 2.8}Z`,
      curve: `M${bx} ${hy - 1.4} Q${bx + b * .75} ${hy - 1} ${bx + b} ${hy + 4.5} Q${bx + b * .55} ${hy + 1.6} ${bx} ${hy + 1.8}Z`,
      dagger: `M${bx} ${hy - 2.4} L${bx + b} ${hy + .5} L${bx} ${hy + 2.8}Z`,
      needle: `M${bx} ${hy - .8} L${bx + b} ${hy + .4} L${bx} ${hy + 1.4}Z`,
    };
    g += `<path d="${bills[sh] || `M${bx} ${hy - 1.8} L${bx + b} ${hy + .6} L${bx} ${hy + 2.6}Z`}" fill="${f('beak')}"/>`;
    if (has('billTip')) g += `<path d="M${bx + b * .6} ${hy - .5} L${bx + b} ${hy + .5} L${bx + b * .6} ${hy + 1.5}Z" fill="${f('billTip')}"/>`;
    if (!S && col.skin) g += `<circle cx="${hx + 3}" cy="${hy - 1.5}" r="3" fill="${f('skin')}"/>`;
    g += eye(hx + 3, hy - 1.5, 1.5);
  }
  if (S) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><defs>${d}</defs>${g}</svg>`;
  // Sprite style: a bold dark outline around the whole bird, ink lines between parts, and a glint in the eye.
  d += `<filter id="${id}o" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="1.3" result="o"/><feFlood flood-color="${INK}"/><feComposite in2="o" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  const css = `.${id} path[fill]:not([fill="none"]),.${id} ellipse,.${id} circle:not(.e),.${id} rect{stroke:${INK};stroke-width:.7;stroke-linejoin:round;paint-order:stroke}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><defs><style>${css}</style>${d}</defs><g class="${id}" filter="url(#${id}o)">${g}</g></svg>`;
}

export const ballSvg = (c = '#8a5a32') => `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.6" fill="#efe7d2" stroke="#0c0c0a" stroke-width="1.6"/><path d="M1.4 10a8.6 8.6 0 0 1 17.2 0Z" fill="${c}" stroke="#0c0c0a" stroke-width="1.6"/><circle cx="10" cy="10" r="2.8" fill="#efe7d2" stroke="#0c0c0a" stroke-width="1.6"/></svg>`;
