// How each bird is drawn: body shape (t) and its colors and marks. Keyed by scientific name.
// Shapes: perch (songbirds and most others), duck, raptor, heron, woodpecker, hummer, gull, soar, cormorant, pelican, shore, rail.
const W = '#f2efe6', K = '#1b1a18', G = '#8c9196';

export const LOOKS = {
  // Backyard and park birds
  'Turdus migratorius': { t: 'perch', ring: true, c: { head: '#2b2826', body: '#5f5852', wing: '#544c45', breast: '#c85a24', belly: '#efe7da', beak: '#e0b223', tail: '#3a3430', throat: '#e9e2d4', legs: '#5a4a3a' } },
  'Cardinalis cardinalis': { t: 'perch', crest: true, bill: 7, billShape: 'thick', c: { head: '#c8261f', body: '#b02a22', wing: '#952219', breast: '#d23a2c', beak: '#f08a2a', mask: '#151212', tail: '#8f1f19' }, maskH: 6 },
  'Cyanocitta cristata': { t: 'perch', crest: true, c: { head: '#4f86c9', body: '#5d86b8', wing: '#2f6bc0', breast: '#eceae4', beak: K, collar: K, bars: W, tail: '#2f6bc0', tailTip: W, cheek: W } },
  'Poecile atricapillus': { t: 'perch', small: true, bill: 4, tl: 'long', c: { head: W, cap: K, throat: K, body: '#8c9196', wing: '#7b8186', edge: '#e9e6df', breast: '#efece4', flank: '#d7b98f', beak: K, tail: '#7b8186' }, capH: .9 },
  'Spinus tristis': { t: 'perch', small: true, billShape: 'thick', bill: 5, c: { head: '#f5d10f', cap: K, body: '#f3cd12', wing: K, bars: W, breast: '#f6d520', belly: '#f3efe0', beak: '#f2a35a', tail: K }, capH: .5 },
  'Melanerpes carolinus': { t: 'woodpecker', c: { head: '#ece6da', cap: '#d8322a', nape: '#d8322a', body: K, wing: K, bars: W, breast: '#eee6d6', belly: '#e9b7a6', beak: K, tail: K } },
  'Dryobates pubescens': { t: 'woodpecker', bill: 6, c: { head: W, cap: K, nape: '#d8322a', mask: K, cheek: W, body: K, back: W, wing: K, spots: W, breast: W, beak: K, tail: K } },
  'Dryobates villosus': { t: 'woodpecker', bill: 10, c: { head: W, cap: K, nape: '#d8322a', mask: K, body: K, back: W, wing: K, spots: W, breast: W, beak: K, tail: K } },
  'Colaptes auratus': { t: 'woodpecker', c: { head: '#b9a58e', cap: '#8f8a86', nape: '#d8322a', malar: K, body: '#9a7a5a', wing: '#8a6a4a', bars: K, breast: '#efe2cc', band: K, streaks: K, beak: K, tail: K } },
  'Sphyrapicus varius': { t: 'woodpecker', c: { head: W, cap: '#d8322a', mask: K, cheek: W, throat: '#d8322a', body: '#2a2724', wing: K, bars: W, spots: '#e9e2c8', breast: '#efe8c8', band: K, beak: K, tail: K } },
  'Melanerpes rubricapillus': { t: 'woodpecker', c: { head: '#d9cdb6', cap: '#d8322a', nape: '#d8322a', body: K, wing: K, bars: W, breast: '#d8ccb4', belly: '#e9a7a0', beak: K, tail: K } },
  'Dryocopus pileatus': { t: 'woodpecker', crest: true, bill: 10, c: { head: K, cap: '#d8322a', crestC: '#d8322a', mask: K, cheek: W, malar: '#d8322a', throat: W, body: K, wing: K, breast: '#1f1e1c', beak: '#3a3a3a', tail: K } },
  'Archilochus colubris': { t: 'hummer', c: { head: '#3f7d4a', body: '#4a8a52', wing: '#6c7a72', breast: '#e8e6dc', throat: '#d42a3a', tail: '#3a4a3e', beak: K, dot: W } },
  'Colibri coruscans': { t: 'hummer', c: { head: '#2fa35a', body: '#2b9a52', wing: '#5a6a60', breast: '#36a25e', throat: '#2fb36a', ear: '#5a4fc2', tail: '#2b7a5a', tailBand: '#2a3a5a', beak: K } },
  'Colibri cyanotus': { t: 'hummer', c: { head: '#3ea35a', body: '#3a9a55', wing: '#5a6a60', breast: '#4aa865', throat: '#4aa865', ear: '#6a5ad2', tail: '#3a8a5a', tailBand: '#2a3a5a', beak: K } },
  'Megaceryle alcyon': { t: 'perch', big: true, crest: 'shaggy', bill: 13, billShape: 'dagger', tl: 'short', c: { head: '#4f739a', body: '#4f739a', wing: '#45698f', spots: W, breast: W, band: '#4f739a', belly: '#b9562e', collar: W, beak: K, lore: W, tail: '#45698f' } },
  'Megaceryle torquata': { t: 'perch', big: true, crest: 'shaggy', bill: 14, billShape: 'dagger', tl: 'short', c: { head: '#58788f', body: '#58788f', wing: '#4e6d84', breast: '#b0482a', collar: W, beak: '#3a3a3a', lore: W, tail: '#4e6d84' } },
  'Chloroceryle americana': { t: 'perch', bill: 11, billShape: 'dagger', tl: 'short', c: { head: '#2f5a3c', body: '#2f5a3c', wing: '#2a5236', spots: W, breast: W, band: '#b75a2c', collar: W, beak: K, tail: '#2a5236' } },
  'Troglodytes aedon': { t: 'perch', small: true, bill: 6, billShape: 'curve', tl: 'up', c: { head: '#7a6450', brow: '#b9ab98', body: '#7a6048', wing: '#6e563e', zebra: '#4a3626', breast: '#c9b8a2', beak: '#3a3a3a', tail: '#6e563e' } },
  'Sturnus vulgaris': { t: 'perch', bill: 8, billShape: 'dagger', tl: 'short', c: { head: '#2a2a33', body: '#2c2d3a', wing: '#33322f', edge: '#a88a5a', breast: '#30323f', spotsB: '#e8dcc0', beak: '#e6c422', tail: '#2a2a30' } },
  'Passer domesticus': { t: 'perch', billShape: 'thick', c: { head: '#8d8a84', cap: '#8a8580', nape: '#8a5a32', cheek: '#e3ded2', throat: K, body: '#8c6440', wing: '#7a5232', bars: W, streaks: '#4a3020', breast: '#b9b3a6', beak: '#2b2b2b', tail: '#6a4a32' } },
  'Zenaida macroura': { t: 'perch', dove: true, tl: 'long', c: { head: '#b8a693', body: '#a99683', wing: '#988574', spots: K, breast: '#d4baa0', beak: K, earDot: K, tail: '#988574', tailTip: W, legs: '#d98a7a' } },
  'Zenaida auriculata': { t: 'perch', dove: true, c: { head: '#a99a8c', cap: '#8f8f96', body: '#9f8a74', wing: '#93806b', spots: K, breast: '#c3a48c', beak: K, earDot: K, legs: '#d98a7a' } },
  'Columba livia': { t: 'perch', dove: true, c: { head: '#5a6070', body: '#99a0aa', wing: '#a8aeb6', bars: K, breast: '#6a7a7a', collar: '#7aa07a', beak: K, eye: '#e0802a', tail: '#5a6070', legs: '#d9605a' } },
  'Columba palumbus': { t: 'perch', dove: true, c: { head: '#8a8f9e', body: '#8f94a2', wing: '#7f8494', patch: W, breast: '#b59aa0', collar: W, beak: '#e3a83a', eye: '#e8d23a', tail: '#4a4e58', legs: '#d9605a' } },
  'Columbina passerina': { t: 'perch', dove: true, small: true, c: { head: '#a39488', body: '#9a8676', wing: '#8f7c6c', spots: '#5a3a3a', breast: '#c4a49c', streaks: '#7a6a6a', beak: '#d0704a', legs: '#d98a7a' } },
  'Patagioenas leucocephala': { t: 'perch', dove: true, c: { head: '#3a3a40', cap: W, body: '#3a3a42', wing: '#34343a', breast: '#3e3e45', beak: '#c94a3a', eye: '#f2efe6', tail: '#2e2e34', legs: '#c84a4a' } },
  'Dumetella carolinensis': { t: 'perch', tl: 'long', c: { head: '#6a6e74', cap: K, body: '#6c7076', wing: '#62666c', breast: '#71757b', vent: '#9a4a2a', beak: K, tail: K } },
  'Quiscalus quiscula': { t: 'perch', bill: 9, billShape: 'dagger', tl: 'long', c: { head: '#2a3a8a', body: '#3a2f2a', wing: '#2f2a3a', breast: '#33302c', beak: K, eye: '#f2e27a', tail: '#1e1e22' } },
  'Quiscalus mexicanus': { t: 'perch', bill: 10, billShape: 'dagger', tl: 'long', c: { head: '#222a55', body: '#20243e', wing: '#1e2238', breast: '#22264a', beak: K, eye: '#f2e27a', tail: '#16182a' } },
  'Quiscalus major': { t: 'perch', bill: 10, billShape: 'dagger', tl: 'long', c: { head: '#1f2a4a', body: '#1e2238', wing: '#1c2034', breast: '#20264a', beak: K, eye: '#8a6a3a', tail: '#16182a' } },
  'Quiscalus lugubris': { t: 'perch', bill: 8, billShape: 'dagger', tl: 'long', c: { head: '#262a46', body: '#22263c', wing: '#20233a', breast: '#24283e', beak: K, eye: '#f2e27a', tail: '#16182a' } },
  'Corvus ossifragus': { t: 'perch', bill: 9, billShape: 'thick', c: { head: '#1c1c22', body: '#1e1f26', wing: '#1a1b22', breast: '#202128', beak: K, tail: '#16171c', legs: K } },
  'Corvus cornix': { t: 'perch', bill: 10, billShape: 'thick', c: { head: K, body: '#9a9a96', wing: K, breast: '#a4a39e', throat: K, beak: K, tail: K, legs: K } },
  'Pica pica': { t: 'perch', bill: 8, billShape: 'thick', tl: 'long', c: { head: K, body: K, wing: '#1e2a4a', patch: W, breast: K, belly: W, beak: K, tail: '#1e3a3a', legs: K } },
  'Spizella passerina': { t: 'perch', small: true, billShape: 'thick', bill: 4, tl: 'long', c: { head: '#a7aaa6', cap: '#b0532a', brow: W, mask: '#2a2a2a', body: '#8a6a4a', wing: '#7a5a3a', streaks: '#3a2a1a', bars: W, breast: '#b8bbb5', beak: '#3a3a3a', tail: '#6a5a4a' }, capH: .55, maskH: 1.2 },
  'Melospiza melodia': { t: 'perch', billShape: 'thick', tl: 'long', c: { head: '#8a6a50', cap: '#8a5a3a', brow: '#b9b1a4', malar: '#5a3a2a', body: '#7e6048', wing: '#7a5a3e', breast: '#ece4d6', streaks: '#6a3e26', spotsB: '#6a3e26', beak: '#8a7a6a', tail: '#7a5a3e' } },
  'Zonotrichia albicollis': { t: 'perch', billShape: 'thick', c: { head: '#9aa0a2', cap: K, crownStripe: W, brow: W, lore: '#f2cc2a', throat: W, body: '#8a6440', wing: '#7e5a36', bars: W, breast: '#a7acae', beak: '#5a5a5a', tail: '#7a5a3e' }, capH: .7 },
  'Zonotrichia capensis': { t: 'perch', crest: true, billShape: 'thick', c: { head: '#a6a8a8', cap: '#8a8c8c', crownStripe: K, brow: '#c4c4c0', collar: '#b5612a', throat: W, band: K, body: '#8a6a4a', wing: '#7a5a3a', bars: W, breast: '#e8e4dc', beak: '#3a3a3a', tail: '#6a5a4a' } },
  'Geothlypis trichas': { t: 'perch', small: true, bill: 5, billShape: 'needle', c: { head: '#7a7a42', mask: K, brow: '#d9d9cc', body: '#6c6e3c', wing: '#62652f', breast: '#f2d21a', throat: '#f2d21a', belly: '#e7e1c3', beak: K, tail: '#62652f' }, maskH: 6 },
  'Setophaga magnolia': { t: 'perch', small: true, bill: 4, billShape: 'needle', c: { head: '#7a8a96', cap: '#7a8a96', mask: K, brow: W, throat: '#f4d01e', body: '#3a3e44', wing: '#2e3238', patch: W, breast: '#f4d01e', streaks: K, beak: K, tail: K } },
  'Setophaga caerulescens': { t: 'perch', small: true, bill: 4, billShape: 'needle', c: { head: '#2d4a7a', throat: K, cheek: K, body: '#2d4a7a', wing: '#2a4170', patch: W, breast: K, belly: W, beak: K, tail: '#2a4170' } },
  'Mniotilta varia': { t: 'perch', small: true, bill: 5, billShape: 'needle', c: { head: W, cap: K, crownStripe: W, mask: K, cheek: K, body: K, wing: K, bars: W, breast: W, streaks: K, beak: K, tail: K }, capH: .6, maskH: 1.5 },
  'Leiothlypis peregrina': { t: 'perch', small: true, bill: 4, billShape: 'needle', c: { head: '#9aa2a6', brow: W, mask: '#5a5a5a', body: '#9aa83a', wing: '#8a9a3a', breast: '#f0eee4', beak: K, tail: '#8a9a3a' }, maskH: 1.2 },
  'Parkesia noveboracensis': { t: 'perch', small: true, bill: 5, billShape: 'needle', c: { head: '#5a5242', brow: '#efe2b8', body: '#5a5242', wing: '#534c3e', breast: '#efe5c4', streaks: '#3a3228', beak: '#3a3a3a', tail: '#534c3e', legs: '#d9a59a' } },
  'Catharus fuscescens': { t: 'perch', bill: 5, c: { head: '#a9714a', body: '#a8704a', wing: '#9f6a44', breast: '#f0e7dc', throat: '#ecd2b0', spotsB: '#c08a5a', beak: '#5a4a3a', tail: '#a06a44', legs: '#d9a59a' } },
  'Catharus guttatus': { t: 'perch', bill: 5, ring: true, c: { head: '#7e6a54', body: '#7e6a54', wing: '#7a6450', breast: '#efe9df', spotsB: '#3a2a20', beak: '#5a4a3a', tail: '#a8543a', legs: '#d9a59a' } },
  'Turdus fuscater': { t: 'perch', ring: '#f2b21a', bill: 7, c: { head: '#3a3530', body: '#3e3933', wing: '#37322c', breast: '#433d36', beak: '#f29a1a', tail: '#2e2a25', legs: '#f2a21a' } },
  'Sayornis nigricans': { t: 'perch', crest: true, bill: 6, tl: 'long', c: { head: '#1e1e1e', body: '#232323', wing: '#262626', edge: '#7a7a7a', breast: '#1f1f1f', belly: W, beak: K, tail: '#1e1e1e' } },
  'Tyrannus melancholicus': { t: 'perch', bill: 8, billShape: 'dagger', tl: 'fork', c: { head: '#8f9396', mask: '#5a5e62', body: '#8a9a5a', wing: '#5a5246', throat: '#d9d9d2', breast: '#f2d930', beak: K, tail: '#5a5246' }, maskH: 3 },
  'Pitangus sulphuratus': { t: 'perch', big: true, bill: 10, billShape: 'dagger', c: { head: W, cap: K, crownStripe: '#f2c41a', mask: K, body: '#8a6a3a', wing: '#a8642e', breast: '#f2d21a', throat: W, beak: K, tail: '#a8642e' }, capH: .6, maskH: 3 },
  'Elaenia flavogaster': { t: 'perch', crest: true, bill: 5, c: { head: '#7a7a62', crestC: '#6a6a54', body: '#7a7a5a', wing: '#5a5a42', bars: W, breast: '#e9e2a0', throat: '#d8d8cf', beak: K, tail: '#5a5a42' } },
  'Thraupis episcopus': { t: 'perch', billShape: 'thick', c: { head: '#9fb2c6', body: '#8aa2bc', wing: '#5f8ec6', epaulet: '#7aa8d8', breast: '#a6b8ca', beak: '#3a3a3a', tail: '#5f8ec6' } },
  'Coereba flaveola': { t: 'perch', small: true, bill: 6, billShape: 'curve', c: { head: '#2a2a2a', brow: W, throat: '#9a9a9a', body: '#3a3a3a', wing: '#2e2e2e', patch: W, breast: '#f2d21a', belly: '#f1ead0', beak: K, tail: '#2a2a2a', skin: '#e8607a' } },
  'Sicalis flaveola': { t: 'perch', billShape: 'thick', bill: 5, c: { head: '#f6c80a', cap: '#f29a12', body: '#e4c12a', wing: '#b8a03a', breast: '#f6d21a', beak: '#9a9a90', tail: '#a8963a' }, capH: .45 },
  'Icterus nigrogularis': { t: 'perch', bill: 7, billShape: 'dagger', tl: 'long', c: { head: '#f4cc12', throat: K, body: '#f2c812', wing: K, bars: W, breast: '#f6d21a', beak: K, tail: K }, maskH: 0 },
  'Saltator olivascens': { t: 'perch', billShape: 'thick', bill: 6, tl: 'long', c: { head: '#7d868c', brow: W, throat: W, malar: K, body: '#7e888e', wing: '#78828a', breast: '#a3aaab', vent: '#d9a46a', beak: K, tail: '#6e787e' } },
  'Motacilla alba': { t: 'perch', bill: 5, tl: 'long', c: { head: W, cap: K, bib: K, throat: K, body: '#8a8f94', wing: '#2a2a2a', bars: W, breast: W, beak: K, tail: K }, capH: .55 },
  'Curruca melanocephala': { t: 'perch', small: true, bill: 5, tl: 'long', ring: '#d8322a', c: { head: K, cap: K, throat: W, body: '#6a6e74', wing: '#5a5e64', breast: '#d9d9d4', beak: '#3a3a3a', eye: '#b0302a', tail: K }, capH: 1.3 },
  'Upupa epops': { t: 'perch', crest: 'fan', bill: 11, billShape: 'curve', c: { head: '#e0a06a', crestC: '#e3a26c', crestTip: K, body: '#d39a68', wing: K, zebra: W, breast: '#e3a874', beak: K, tail: K } },
  'Eupsittula pertinax': { t: 'perch', billShape: 'hook', bill: 5, tl: 'long', ring: true, c: { head: '#b9a46a', cheek: '#e0a03a', body: '#4f9a4a', wing: '#3d8a3a', edge: '#2f6aa8', breast: '#a8b45a', beak: '#3a3a3a', tail: '#3f8a3e' } },
  'Brotogeris jugularis': { t: 'perch', billShape: 'hook', bill: 5, tl: 'long', ring: true, c: { head: '#5ab04a', throat: '#e07a2a', body: '#5aa84a', wing: '#4a9a3e', epaulet: '#8a7a3a', breast: '#7ac25a', beak: '#d9cfa8', tail: '#4a9a3e' } },

  // Raptors and vultures
  'Pandion haliaetus': { t: 'raptor', c: { head: W, mask: '#3a2e26', body: '#3e2e24', wing: '#3a2b22', breast: '#f2efe6', streaks: '#8a6a4a', tail: '#4a3a2e', beak: K, legs: '#c9c4b8', eye: '#f2d23a' } },
  'Falco sparverius': { t: 'raptor', c: { head: W, cap: '#6a86b8', malar: K, body: '#c46a3a', wing: '#7f95b8', spots: K, breast: '#efdcc0', streaks: '#3a2a1a', tail: '#c4602e', tailBand: K, beak: '#4a5a6a', cere: '#f2c23a' } },
  'Astur cooperii': { t: 'raptor', c: { head: '#6a7482', cap: '#2e3440', cheek: '#c87a5a', body: '#5e6878', wing: '#5a6474', breast: '#f2ece0', barring: '#c8704a', tail: '#5a6474', tailBand: K, beak: K, cere: '#e8c23a', eye: '#d8402a', legs: '#f2c23a' } },
  'Rupornis magnirostris': { t: 'raptor', c: { head: '#8a8c90', body: '#7a7c80', wing: '#7a756c', breast: '#8a8c90', barring: '#b9845a', tail: '#5a5a5a', tailBand: '#c8c0b0', beak: K, cere: '#f2c23a', eye: '#f2d23a', legs: '#f2c23a' } },
  'Daptrius chimachima': { t: 'raptor', c: { head: '#ecd8b0', mask: '#5a4a3a', body: '#4a3a2e', wing: '#3e3026', breast: '#ecd8b0', tail: '#a89070', tailBand: '#4a3a2e', beak: '#c8c0b0', cere: '#f2b23a', legs: '#c8c0a0' }, maskH: 1 },
  'Cathartes aura': { t: 'soar', c: { head: '#c8443a', body: '#2a2422', wing: '#2a2422', flight: '#9a9590', tail: '#2a2422', beak: W } },
  'Coragyps atratus': { t: 'soar', c: { head: '#4a4a4a', body: K, wing: K, flight: '#e8e4dc', tail: K, beak: '#c8c0b0' } },
  'Fregata magnificens': { t: 'soar', angular: true, fork: true, hook: true, c: { head: K, body: K, wing: K, tail: K, pouch: '#d8322a', beak: '#8a8a8a' } },

  // Herons, ibises and friends
  'Ardea herodias': { t: 'heron', c: { head: W, cap: K, neck: '#9a8f8a', neckStripe: '#3a3a3a', body: '#7a8a9a', wing: '#6e7f92', belly: '#5a5a62', plume: '#c8ccd2', beak: '#e0b23a', legs: '#5a4a3a', tail: '#6e7f92' } },
  'Ardea alba': { t: 'heron', c: { head: W, neck: W, body: W, wing: '#ece9e0', beak: '#f2c21a', legs: K, tail: '#ece9e0' } },
  'Egretta thula': { t: 'heron', c: { head: W, neck: W, body: W, wing: '#ece9e0', plume: '#e0ddd4', beak: K, face: '#f2d21a', legs: K, tail: '#ece9e0' } },
  'Egretta caerulea': { t: 'heron', c: { head: '#6a4a6a', neck: '#6a4a6a', body: '#3e4e78', wing: '#3a4a72', beak: '#8a9ab8', legs: '#4a6a5a', tail: '#3a4a72' } },
  'Egretta tricolor': { t: 'heron', c: { head: '#4a5a80', neck: '#4a5a80', neckStripe: W, body: '#4a5a80', wing: '#46557a', belly: W, plume: '#b8a8c8', beak: '#e0c23a', legs: '#e0c23a', tail: '#46557a' } },
  'Butorides virescens': { t: 'heron', stout: true, c: { head: '#7a3e2e', cap: '#24382a', body: '#3e5a48', wing: '#38543e', breast: '#7a3e2e', beak: K, legs: '#e8a23a', eye: '#f2c21a', tail: '#38543e' } },
  'Nycticorax nycticorax': { t: 'heron', stout: true, c: { head: '#e8e8e4', cap: '#1e2a34', plume: W, body: '#24343e', wing: '#9aa0a6', breast: '#eceae4', beak: K, legs: '#e0c23a', eye: '#d8322a', tail: '#9aa0a6' } },
  'Tigrisoma mexicanum': { t: 'heron', c: { head: '#7a7a76', cap: K, face: '#f2d21a', neck: '#6e6a5e', neckStripe: '#e8e0c8', body: '#5a5a4a', wing: '#4e4e40', patch: '#a89a6a', belly: '#9a6a3a', beak: K, legs: '#4a4a3a', tail: '#4e4e40' } },
  'Eudocimus albus': { t: 'heron', bill: 'curve', c: { head: W, face: '#e8503a', neck: W, body: W, wing: '#ece9e0', beak: '#e8503a', legs: '#e8503a', tail: K } },
  'Plegadis falcinellus': { t: 'heron', bill: 'curve', c: { head: '#6a3a32', neck: '#7a3e30', body: '#7a3e30', wing: '#3e5a4a', patch: '#6a4a6a', beak: '#7a6a5a', legs: '#5a4a3a', tail: '#3e5a4a' } },
  'Platalea ajaja': { t: 'heron', bill: 'spoon', c: { head: '#d9e2ce', face: '#9ab88a', neck: W, body: '#efa8b8', wing: '#e8869e', patch: '#d8323e', beak: '#b9b39a', legs: '#c8506a', tail: '#e8a23a' } },
  'Phalacrocorax carbo': { t: 'cormorant', c: { head: K, throat: W, neck: '#1e1e1e', body: '#22221f', wing: '#3a3a30', bars: '#1a1a18', breast: '#1e1e1e', beak: '#6a6a5a', eye: '#3aa86a', tail: K } },
  'Nannopterum auritum': { t: 'cormorant', c: { head: K, throat: '#f2902a', neck: '#1e1e1e', body: '#22221f', wing: '#3e3a2e', bars: '#1a1a18', breast: '#1e1e1e', beak: '#6a6a5a', eye: '#3aa86a', tail: K } },
  'Microcarbo pygmaeus': { t: 'cormorant', c: { head: '#5a3a2a', neck: '#2a2420', body: '#22221f', wing: '#2e2e2a', bars: '#6a6a6a', breast: '#24221f', beak: '#3a3a3a', tail: K } },
  'Anhinga anhinga': { t: 'cormorant', snake: true, c: { head: K, neck: '#1e1e1e', body: '#1e1e1e', wing: '#1a1a1a', bars: W, breast: '#1e1e1e', beak: '#d8a23a', eye: '#d8322a', tail: K } },
  'Pelecanus occidentalis': { t: 'pelican', c: { head: '#f2e6b8', cap: '#f2d880', neck: '#5a3a2a', body: '#7a7e84', wing: '#6a6e74', streaks: '#c8c4bc', beak: '#c8a07a', pouch: '#3a3a3a', tail: '#5a5e64' } },

  // Water birds
  'Anas platyrhynchos': { t: 'duck', c: { head: '#1f6b3e', collar: W, body: '#9a9590', breast: '#7a4a3a', wing: '#8a8580', speculum: '#3a4ab8', tail: K, beak: '#f2d21a', vent: K } },
  'Anas rubripes': { t: 'duck', c: { head: '#9a8a74', cap: '#3a3026', mask: '#3a3026', neck: '#9a8a74', body: '#3a2e24', breast: '#4a3a2e', wing: '#342a20', speculum: '#5a3ab8', tail: '#2e241c', beak: '#c8b83a' } },
  'Anas fulvigula': { t: 'duck', c: { head: '#b89a74', cap: '#5a4630', body: '#6a5038', breast: '#7a5e42', wing: '#5e4632', speculum: '#3a7ab8', tail: '#4a3a2a', beak: '#e0c23a' } },
  'Branta canadensis': { t: 'duck', neck: 'long', c: { head: K, neck: K, cheek: W, body: '#7a6a5a', breast: '#d9cfbe', wing: '#6a5a4a', tail: K, vent: W, beak: K } },
  'Alopochen aegyptiaca': { t: 'duck', neck: 'long', legs: true, c: { head: '#d9cfbc', mask: '#8a4a2a', neck: '#d4c8b2', collar: '#8a4a2a', body: '#b49a7a', breast: '#c8b496', wing: '#f2efe6', speculum: '#2a7a5a', tail: K, beak: '#e88aa0', legs: '#e88aa0' } },
  'Dendrocygna autumnalis': { t: 'duck', neck: 'long', legs: true, c: { head: '#a8a8a2', cap: '#8a4a2a', neck: '#9a5a3a', body: '#8a4a2e', breast: '#9a5a3a', flank: K, wing: '#9a8070', patch: W, tail: K, beak: '#f0603a', legs: '#f0905a' } },
  'Podilymbus podiceps': { t: 'duck', grebe: true, c: { head: '#8a6e52', throat: K, body: '#6a5a48', breast: '#a08868', wing: '#5e4e3e', beak: '#d9d4c4', billRing: K } },
  'Gallinula galeata': { t: 'rail', c: { head: '#2e2e33', body: '#4a4a3a', wing: '#4e4a38', breast: '#3a3a42', flankLine: W, vent: W, beak: '#e8d23a', shield: '#d8322a', billBase: '#d8322a', legs: '#c8c23a', tail: '#2e2e33' } },
  'Porphyrio martinica': { t: 'rail', c: { head: '#4a3a9a', body: '#3a8a6a', wing: '#3a9a6a', breast: '#4a3aa8', vent: W, beak: '#f2d21a', shield: '#9ac8e8', billBase: '#d8322a', legs: '#f2d21a', tail: '#3a6a5a' } },
  'Calidris minutilla': { t: 'shore', bill: 6, c: { head: '#9a7a5a', body: '#8a6a4a', wing: '#7a5a3e', spots: '#3a2a1a', breast: W, band: '#a8907a', streaks: '#6a4a3a', beak: K, legs: '#a8b43a', brow: '#d9cfb8', tail: '#6a5040' } },
  'Vanellus chilensis': { t: 'shore', crest: true, bill: 5, c: { head: '#b8b4ac', cap: K, throat: K, body: '#8a8a7a', wing: '#7a8a6a', patch: '#8a5a7a', breast: W, band: K, beak: '#d8604a', legs: '#d8606a', eye: '#d8322a', tail: K } },
  'Larus argentatus': { t: 'gull', c: { head: W, breast: W, wing: '#a6adb4', tip: K, mirror: W, beak: '#efc62a', billTip: '#d8322a', legs: '#e3a59a', eye: '#f2d23a' } },
  'Larus smithsonianus': { t: 'gull', c: { head: W, streaks: '#b9a894', breast: W, wing: '#a3aab2', tip: K, mirror: W, beak: '#efc62a', billTip: '#d8322a', legs: '#e3a59a', eye: '#f2d23a' } },
  'Leucophaeus atricilla': { t: 'gull', c: { head: W, hood: '#232326', breast: W, wing: '#5e646c', tip: K, beak: '#b0302a', legs: '#5a3a3a' } },
  'Thalasseus sandvicensis': { t: 'gull', tern: true, c: { head: W, cap: K, breast: W, wing: '#d0d6da', tip: '#6a7076', beak: K, billTip: '#f2d21a', legs: K } },
};

// eBird and older guides sometimes use other scientific names for the same bird.
LOOKS['Accipiter cooperii'] = LOOKS['Astur cooperii'];
LOOKS['Phalacrocorax auritus'] = LOOKS['Nannopterum auritum'];
LOOKS['Milvago chimachima'] = LOOKS['Daptrius chimachima'];
LOOKS['Sylvia melanocephala'] = LOOKS['Curruca melanocephala'];
LOOKS['Aratinga pertinax'] = LOOKS['Eupsittula pertinax'];
LOOKS['Picoides pubescens'] = LOOKS['Dryobates pubescens'];
LOOKS['Picoides villosus'] = LOOKS['Dryobates villosus'];
LOOKS['Larus argentatus smithsonianus'] = LOOKS['Larus smithsonianus'];
LOOKS['Gallinula chloropus'] = LOOKS['Gallinula galeata'];
LOOKS['Buteo magnirostris'] = LOOKS['Rupornis magnirostris'];
