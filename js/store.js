// Tiny IndexedDB wrapper. Everything you catch lives on your phone.
const DB = 'field-dex', VER = 1;
let dbp;

function db() {
  return dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('catches', { keyPath: 'sci' });
      d.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
      d.createObjectStore('kv');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode), s = t.objectStore(store);
    const out = fn(s);
    t.oncomplete = () => res(out && 'result' in out ? out.result : out);
    t.onerror = () => rej(t.error);
  });
}

export const catches = {
  all: () => tx('catches', 'readonly', s => s.getAll()),
  get: sci => tx('catches', 'readonly', s => s.get(sci)),
  put: c => tx('catches', 'readwrite', s => s.put(c)),
  clear: () => tx('catches', 'readwrite', s => s.clear()),
};

export const photos = {
  add: blob => tx('photos', 'readwrite', s => s.add({ blob, at: Date.now() })),
  get: id => tx('photos', 'readonly', s => s.get(id)),
  all: () => tx('photos', 'readonly', s => s.getAll()),
};

export const kv = {
  get: k => tx('kv', 'readonly', s => s.get(k)),
  set: (k, v) => tx('kv', 'readwrite', s => s.put(v, k)),
};

// Cached fetch results with an age limit, kept in IndexedDB.
// staleMs: an older copy (up to that age) is returned at once and refreshed in the background.
const refreshing = new Set();
export async function cached(key, maxAgeMs, load, staleMs = 0) {
  const hit = await kv.get('cache:' + key);
  const age = hit ? Date.now() - hit.at : Infinity;
  if (age < maxAgeMs) return hit.v;
  const fresh = async () => { const v = await load(); await kv.set('cache:' + key, { at: Date.now(), v }); return v; };
  if (age < staleMs) {
    if (!refreshing.has(key)) { refreshing.add(key); fresh().catch(() => {}).finally(() => refreshing.delete(key)); }
    return hit.v;
  }
  try {
    return await fresh();
  } catch (e) {
    if (hit) return hit.v;
    throw e;
  }
}
