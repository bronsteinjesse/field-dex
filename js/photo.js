// Photo ID: Google's AIY bird classifier (965 species, mostly North and Central America), run on the phone.
// It looks at three framings of the photo and averages them, so a bird off-center or small in the frame still counts.
import { runtime } from './lite.js';

const MODEL_URL = new URL('../models/aiy_birds.tflite', import.meta.url).href;
const LABELS_URL = new URL('../models/aiy_birds_labels.csv', import.meta.url).href;
let modelP = null, labels = null;

export function loadPhotoModel() {
  return modelP ??= (async () => {
    const { loadAndCompile } = await runtime();
    const csv = await (await fetch(LABELS_URL)).text();
    labels = {};
    // Subspecies ("Ardea alba modesta") count toward their species.
    for (const l of csv.trim().split('\n').slice(1)) { const i = l.indexOf(','); labels[l.slice(0, i)] = l.slice(i + 1).split(' ').slice(0, 2).join(' '); }
    return loadAndCompile(MODEL_URL, { accelerator: 'wasm' });
  })().catch(e => { modelP = null; throw e; });
}

// blob: a photo. Returns [{ sci, p }] best first, p from 0 to 1.
export async function identifyPhoto(blob) {
  const [model, { Tensor }] = await Promise.all([loadPhotoModel(), runtime()]);
  const bmp = await createImageBitmap(blob);
  const W = bmp.width, H = bmp.height, s = Math.min(W, H);
  const crops = [
    [(W - s) / 2, (H - s) / 2, s, s],                 // center square
    [(W - s * 0.7) / 2, (H - s * 0.7) / 2, s * 0.7, s * 0.7], // closer in, for a small bird
    null,                                               // whole photo, letterboxed
  ];
  const sum = {};
  const c = document.createElement('canvas'); c.width = c.height = 224;
  const g = c.getContext('2d', { willReadFrequently: true });
  for (const cr of crops) {
    g.fillStyle = '#808080'; g.fillRect(0, 0, 224, 224);
    if (cr) g.drawImage(bmp, cr[0], cr[1], cr[2], cr[3], 0, 0, 224, 224);
    else { const k = 224 / Math.max(W, H); g.drawImage(bmp, (224 - W * k) / 2, (224 - H * k) / 2, W * k, H * k); }
    const d = g.getImageData(0, 0, 224, 224).data, u = new Uint8Array(224 * 224 * 3);
    for (let i = 0, j = 0; i < d.length; i += 4) { u[j++] = d[i]; u[j++] = d[i + 1]; u[j++] = d[i + 2]; }
    const t = new Tensor(u, [1, 224, 224, 3]);
    const out = await model.run([t]);
    const p = await out[0].data();
    t.delete?.(); out[0].delete?.();
    for (let i = 0; i < p.length; i++) if (p[i] > 2) { const sci = labels[i]; if (sci && sci !== 'background') sum[sci] = (sum[sci] || 0) + p[i] / 255 / crops.length; }
  }
  bmp.close?.();
  return Object.entries(sum).map(([sci, p]) => ({ sci, p: Math.min(1, p) })).sort((a, b) => b.p - a.p).slice(0, 10);
}
