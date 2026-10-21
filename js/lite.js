// Shared on-device model runtime (LiteRT.js) and the English names for scientific names.
let rtP = null, namesP = null;

export function runtime() {
  return rtP ??= (async () => {
    const rt = await import('../vendor/litert/index.js');
    await rt.loadLiteRt(new URL('../vendor/litert/', import.meta.url).href);
    return rt;
  })().catch(e => { rtP = null; throw e; });
}

// sci -> English name, from BirdNET's label list (about 6,500 species worldwide).
export function birdNames() {
  return namesP ??= fetch(new URL('../models/birdnet_labels.txt', import.meta.url)).then(r => r.text()).then(t => {
    const m = new Map();
    for (const l of t.trim().split('\n')) { const [sci, name] = l.split('_'); m.set(sci, name); }
    return m;
  }).catch(e => { namesP = null; throw e; });
}
