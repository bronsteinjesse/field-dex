// Sound ID: records the mic, resamples to 48 kHz, and runs BirdNET on 3-second windows.
// BirdNET (Cornell Lab / TU Chemnitz) is CC BY-NC-SA 4.0, used here for personal, non-commercial birding.
const MODEL_URL = './models/birdnet.tflite';
const LABELS_URL = './models/birdnet_labels.txt';
const SR = 48000, WIN = SR * 3;

let modelP = null, labels = null;

export function loadModel(onProgress) {
  return modelP ??= (async () => {
    const { loadLiteRt, loadAndCompile } = await import('../vendor/litert/index.js');
    await loadLiteRt(new URL('../vendor/litert/', import.meta.url).href);
    const txt = await (await fetch(LABELS_URL)).text();
    labels = txt.trim().split('\n').map(l => { const [sci, name] = l.split('_'); return { sci, name }; });
    // Download with progress so the first time isn't a mystery wait.
    const r = await fetch(MODEL_URL);
    const total = +r.headers.get('content-length') || 51726412;
    const reader = r.body.getReader(), chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      onProgress?.(Math.min(1, got / total));
    }
    const buf = new Uint8Array(got); let o = 0;
    for (const c of chunks) { buf.set(c, o); o += c.length; }
    const blobUrl = URL.createObjectURL(new Blob([buf]));
    const model = await loadAndCompile(blobUrl, { accelerator: 'wasm' });
    URL.revokeObjectURL(blobUrl);
    return model;
  })().catch(e => { modelP = null; throw e; });
}

const sigmoid = x => 1 / (1 + Math.exp(-x));

async function classify(model, samples) {
  const { Tensor } = await import('../vendor/litert/index.js');
  const t = new Tensor(samples, [1, WIN]);
  const out = await model.run([t]);
  const logits = await out[0].data();
  t.delete?.(); out[0].delete?.();
  const res = [];
  for (let i = 0; i < logits.length; i++) {
    const p = sigmoid(logits[i]);
    if (p > 0.1) res.push({ ...labels[i], p });
  }
  return res;
}

// Live listening session. onUpdate gets { level, spectrum, detections } as it runs.
export async function listen(onUpdate) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser(); analyser.fftSize = 512;
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  src.connect(analyser); src.connect(proc); proc.connect(ctx.destination);
  const rate = ctx.sampleRate;
  let pending = [], pendingLen = 0, stopped = false, busy = false;
  const recorded = [];
  const best = new Map();
  const spec = new Uint8Array(analyser.frequencyBinCount);
  let model = null;
  loadModel(p => onUpdate({ loading: p })).then(m => { model = m; onUpdate({ loading: 1 }); }).catch(e => onUpdate({ error: e.message }));

  proc.onaudioprocess = e => {
    if (stopped) return;
    const d = new Float32Array(e.inputBuffer.getChannelData(0));
    pending.push(d); pendingLen += d.length; recorded.push(d);
    analyser.getByteFrequencyData(spec);
    onUpdate({ spectrum: spec });
    if (pendingLen >= rate * 3 && model && !busy) {
      const chunk = concat(pending, pendingLen);
      // keep 1.5 s overlap
      const keep = Math.floor(rate * 1.5);
      pending = [chunk.slice(chunk.length - keep)]; pendingLen = keep;
      busy = true;
      resample(chunk, rate).then(s => classify(model, s.subarray(0, WIN))).then(res => {
        for (const r of res) if (!best.has(r.sci) || best.get(r.sci).p < r.p) best.set(r.sci, r);
        onUpdate({ detections: [...best.values()].sort((a, b) => b.p - a.p) });
      }).catch(e => onUpdate({ error: e.message })).finally(() => busy = false);
    }
  };

  return {
    async stop() {
      stopped = true;
      proc.disconnect(); src.disconnect();
      stream.getTracks().forEach(t => t.stop());
      // One last pass over the tail if nothing ran yet.
      if (model && best.size === 0 && recorded.length) {
        const all = concat(recorded, recorded.reduce((a, c) => a + c.length, 0));
        const s = await resample(all.slice(-Math.floor(rate * 3)), rate);
        for (const r of await classify(model, padTo(s, WIN))) best.set(r.sci, r);
      }
      const audio = encodeWav(concat(recorded, recorded.reduce((a, c) => a + c.length, 0)), rate);
      ctx.close();
      return { detections: [...best.values()].sort((a, b) => b.p - a.p), audio };
    },
  };
}

function concat(arr, len) { const o = new Float32Array(len); let i = 0; for (const a of arr) { o.set(a, i); i += a.length; } return o; }
function padTo(a, n) { if (a.length >= n) return a.subarray(0, n); const o = new Float32Array(n); o.set(a); return o; }

async function resample(data, rate) {
  if (rate === SR) return padTo(data, WIN);
  const len = Math.ceil(data.length * SR / rate);
  const off = new OfflineAudioContext(1, len, SR);
  const b = off.createBuffer(1, data.length, rate); b.copyToChannel(data, 0);
  const s = off.createBufferSource(); s.buffer = b; s.connect(off.destination); s.start();
  const r = await off.startRendering();
  return padTo(r.getChannelData(0), WIN);
}

function encodeWav(samples, rate) {
  const max = Math.min(samples.length, rate * 30);
  const buf = new ArrayBuffer(44 + max * 2), v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + max * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, max * 2, true);
  for (let i = 0; i < max; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return new Blob([buf], { type: 'audio/wav' });
}
