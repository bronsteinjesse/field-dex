// Parametric bird icons: one of a few body shapes, painted with the species' own colors.
import { BY_SCI } from './data.js';

let uid = 0;

// Species we have no curated colors for get a shape from their name and plain earthy colors.
export function speciesLook(sci, name = '') {
  if (BY_SCI[sci]) return BY_SCI[sci];
  const n = name.toLowerCase();
  const base = { head: '#7d7466', body: '#8a7f70', wing: '#6e6558', breast: '#cfc5b2', beak: '#3a3a3a' };
  if (/duck|teal|goose|swan|merganser|scaup|wigeon|gadwall|scoter|eider|pintail|shoveler|canvasback|redhead|goldeneye|grebe|loon|coot|gallinule|cormorant/.test(n))
    return { t: 'duck', c: base };
  if (/hawk|eagle|falcon|kestrel|merlin|osprey|owl|vulture|harrier|kite|caracara|condor/.test(n))
    return { t: 'raptor', c: { ...base, breast: '#e6dccb', streaks: '#6e5a44', tail: '#6e6558' } };
  if (/heron|egret|crane|ibis|bittern|stork|spoonbill/.test(n))
    return { t: 'heron', c: { ...base, head: '#d8d2c4', cap: '#3a3a3a', beak: '#c9a13a' } };
  if (/dove|pigeon/.test(n)) return { t: 'perch', dove: true, c: base };
  if (/swallow|martin|swift/.test(n)) return { t: 'perch', dove: true, bill: 3, c: { ...base, head: '#35506e', body: '#35506e', wing: '#2e4662' } };
  if (/hummingbird/.test(n)) return { t: 'perch', small: true, bill: 12, c: { ...base, head: '#4a7a52', body: '#4a7a52' } };
  if (/warbler|kinglet|gnatcatcher|vireo/.test(n)) return { t: 'perch', small: true, bill: 4, c: { ...base, head: '#9a9a5a', body: '#8f9058', breast: '#e6d98a' } };
  if (/woodpecker|sapsucker|flicker/.test(n)) return { t: 'perch', bill: 8, c: { ...base, head: '#efe9dc', cap: '#1e1e1e', body: '#2a2a2a', wing: '#2a2a2a', bars: '#efe9dc' } };
  if (/blackbird|grackle|crow|raven|cowbird/.test(n)) return { t: 'perch', bill: 8, c: { head: '#1c1c1c', body: '#1e1e1e', wing: '#1a1a1a', breast: '#1e1e1e', beak: '#1c1c1c' } };
  if (/sparrow|towhee|junco|bunting|longspur/.test(n)) return { t: 'perch', c: { ...base, head: '#8a6448', body: '#866650', breast: '#e6dccb', streaks: '#6a4a32' } };
  return { t: 'perch', c: base };
}

// m: { kind: 'full' | 'sil', sil: '#color' }
export function birdSvg(look, m = { kind: 'full' }) {
  const s = look, col = s.c || {};
  const id = 'b' + (uid++), S = m.kind === 'sil';
  const f = k => S ? m.sil : (col[k] ?? (k === 'tail' ? col.wing : col.body) ?? '#8a7f70');
  const legC = S ? m.sil : '#5a4a3a', eyeC = '#121212';
  let d = '', g = '';
  if (s.t === 'duck') {
    const body = '<ellipse cx="30" cy="42" rx="21" ry="10"';
    d += `<clipPath id="${id}b">${body}/></clipPath>`;
    g += `<path d="M4 56 Q18 52 32 56 T62 56" stroke="${S ? m.sil : '#7d9a98'}" stroke-width="1.4" fill="none"/>`;
    g += `<path d="M12 39 L3 34 L11 45Z" fill="${f('tail')}"/>`;
    g += `<rect x="42" y="26" width="9" height="16" rx="4" fill="${f('head')}"/>`;
    g += `${body} fill="${f('body')}"/>`;
    if (!S) g += `<g clip-path="url(#${id}b)"><ellipse cx="47" cy="40" rx="8" ry="10" fill="${f('breast')}"/></g>`;
    g += `<ellipse cx="26" cy="39" rx="13" ry="5" fill="${f('wing')}"/>`;
    g += `<circle cx="48" cy="24" r="8" fill="${f('head')}"/>`;
    if (!S && col.collar) g += `<rect x="42" y="31.5" width="9" height="2" fill="${f('collar')}"/>`;
    g += `<path d="M54 22.5 Q63 23 62.5 27.5 L54 27.5Z" fill="${f('beak')}"/>`;
    if (!S) g += `<circle cx="50.5" cy="22" r="1.4" fill="${eyeC}"/>`;
  } else if (s.t === 'raptor') {
    const body = '<ellipse cx="32" cy="36" rx="12" ry="15"';
    d += `<clipPath id="${id}b">${body}/></clipPath>`;
    g += `<path d="M27 46 L37 46 L38 60 L26 60Z" fill="${f('tail')}"/>`;
    g += `<path d="M30 50 L29 54 M35 50 L36 54" stroke="${S ? m.sil : '#d8b632'}" stroke-width="2" stroke-linecap="round"/>`;
    g += `${body} fill="${f('body')}"/>`;
    if (!S) {
      g += `<g clip-path="url(#${id}b)"><ellipse cx="36" cy="37" rx="8" ry="12" fill="${f('breast')}"/>`;
      if (col.streaks) g += [[35, 41], [39, 42], [33, 44], [37, 45], [41, 45]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.3" ry="1.8" fill="${f('streaks')}"/>`).join('');
      g += '</g>';
    }
    g += `<ellipse cx="27" cy="37" rx="8" ry="14" transform="rotate(8 27 37)" fill="${f('wing')}"/>`;
    if (s.crest) g += `<path d="M31 12 L30 3 L36 9 Z M41 10 L44 2 L45 11Z" fill="${f('head')}"/>`;
    g += `<circle cx="37" cy="17" r="8.5" fill="${f('head')}"/>`;
    if (!S && col.mask) g += `<rect x="33" y="14" width="13" height="3" fill="${f('mask')}"/>`;
    if (!S) g += `<rect x="36" y="18" width="9" height="7" rx="3" fill="${f('breast')}"/>`;
    g += `<path d="M44.5 13.5 L50 16 Q49.5 21 46 19.5Z" fill="${f('beak')}"/>`;
    if (!S) g += `<circle cx="41" cy="15" r="1.5" fill="${eyeC}"/>`;
  } else if (s.t === 'heron') {
    g += `<path d="M27 38 L25 61 M32 38 L34 61" stroke="${S ? m.sil : '#4e4a40'}" stroke-width="1.6" stroke-linecap="round"/>`;
    g += `<path d="M14 34 L4 40 L16 38Z" fill="${f('wing')}"/>`;
    g += `<ellipse cx="27" cy="32" rx="14" ry="8" transform="rotate(-10 27 32)" fill="${f('body')}"/>`;
    g += `<path d="M37 28 Q47 22 40 15 Q35 9 43 7" stroke="${f('breast')}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    g += `<ellipse cx="24" cy="31" rx="11" ry="5.5" transform="rotate(-10 24 31)" fill="${f('wing')}"/>`;
    g += `<circle cx="45" cy="8" r="4.5" fill="${f('head')}"/>`;
    if (!S && col.cap) g += `<path d="M41 6 L32 4 L41 8Z" fill="${f('cap')}"/><path d="M41 5.5 L49 5.5" stroke="${f('cap')}" stroke-width="1.6"/>`;
    g += `<path d="M48.5 7 L62 9.5 L48.5 10.5Z" fill="${f('beak')}"/>`;
    if (!S) g += `<circle cx="46.5" cy="7.6" r="1.1" fill="${eyeC}"/>`;
  } else {
    const hr = s.dove ? 6.5 : s.small ? 9 : 8.5, hx = 46, hy = s.dove ? 27 : 24, b = s.bill || 6;
    const body = '<ellipse cx="34" cy="38" rx="16" ry="11" transform="rotate(-18 34 38)"';
    d += `<clipPath id="${id}b">${body}/></clipPath><clipPath id="${id}h"><circle cx="${hx}" cy="${hy}" r="${hr}"/></clipPath>`;
    g += `<path d="M33 48 L31 57 M39 47 L39 57" stroke="${legC}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    g += `<path d="${s.dove ? 'M22 40 L1 53 L5 57 L26 45Z' : 'M22 40 L6 50 L9 55 L26 45Z'}" fill="${f('tail')}"/>`;
    g += `${body} fill="${f('body')}"/>`;
    if (!S) {
      g += `<g clip-path="url(#${id}b)"><ellipse cx="42" cy="43" rx="11" ry="9" fill="${f('breast')}"/>`;
      if (col.flank) g += `<ellipse cx="36" cy="47" rx="7" ry="3" fill="${f('flank')}"/>`;
      if (col.streaks) g += [[40, 40], [44, 43], [38, 45], [42, 47], [46, 39]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.1" ry="1.9" fill="${f('streaks')}"/>`).join('');
      g += '</g>';
    }
    g += `<ellipse cx="29" cy="36" rx="12" ry="6.5" transform="rotate(-22 29 36)" fill="${f('wing')}"/>`;
    if (!S && col.bars) g += `<path d="M23 38 L32 33.5 M25.5 41 L34.5 36.5" stroke="${f('bars')}" stroke-width="1.3" stroke-linecap="round"/>`;
    if (!S && col.spots) g += `<circle cx="27" cy="36" r="1.2" fill="${f('spots')}"/><circle cx="31" cy="34" r="1.2" fill="${f('spots')}"/><circle cx="24" cy="39" r="1.1" fill="${f('spots')}"/>`;
    if (!S && col.epaulet) g += `<ellipse cx="34" cy="31.5" rx="5" ry="2.8" fill="${f('epaulet')}"/>`;
    if (s.crest) g += `<path d="M${hx - 6} ${hy - 4} L${hx - 9} ${hy - 15} L${hx + 2} ${hy - 7}Z" fill="${f(col.cap ? 'cap' : 'head')}"/>`;
    g += `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${f('head')}"/>`;
    if (!S) {
      let p = '';
      if (col.cap) p += `<rect x="${hx - hr}" y="${hy - hr}" width="${2 * hr}" height="${hr * .85}" fill="${f('cap')}"/>`;
      if (col.mask) p += `<rect x="${hx - hr}" y="${hy - 2.5}" width="${2 * hr}" height="4" fill="${f('mask')}"/>`;
      if (col.nape) p += `<rect x="${hx - hr}" y="${hy - hr * .4}" width="${hr * .55}" height="${hr * .55}" fill="${f('nape')}"/>`;
      if (col.throat) p += `<rect x="${hx - 1}" y="${hy + 2.5}" width="${hr + 2}" height="${hr}" fill="${f('throat')}"/>`;
      if (p) g += `<g clip-path="url(#${id}h)">${p}</g>`;
      if (col.collar) g += `<path d="M${hx - 7} ${hy + 5} Q${hx + 1} ${hy + 11} ${hx + 7} ${hy + 5}" stroke="${f('collar')}" stroke-width="2" fill="none"/>`;
    }
    const bx = hx + hr - 1.5;
    g += `<path d="M${bx} ${hy - 1.8} L${bx + b} ${hy + .6} L${bx} ${hy + 2.6}Z" fill="${f('beak')}"/>`;
    if (!S) {
      if (s.ring) g += `<circle cx="${hx + 3}" cy="${hy - 1.5}" r="2.4" fill="#f4efe4"/>`;
      g += `<circle cx="${hx + 3}" cy="${hy - 1.5}" r="1.5" fill="${eyeC}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><defs>${d}</defs>${g}</svg>`;
}

export const ballSvg = (c = '#8a5a32') => `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.6" fill="#efe7d2" stroke="#0c0c0a" stroke-width="1.6"/><path d="M1.4 10a8.6 8.6 0 0 1 17.2 0Z" fill="${c}" stroke="#0c0c0a" stroke-width="1.6"/><circle cx="10" cy="10" r="2.8" fill="#efe7d2" stroke="#0c0c0a" stroke-width="1.6"/></svg>`;
