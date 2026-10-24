// Catch map: every place you caught a bird, on OpenStreetMap (Leaflet, loaded on first use).
let ready = null;
function loadLeaflet() {
  return ready ??= new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'vendor/leaflet/leaflet.css';
    document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'vendor/leaflet/leaflet.js';
    s.onload = () => res(window.L); s.onerror = () => { ready = null; rej(new Error('map failed to load')); };
    document.head.appendChild(s);
  });
}

// points: [{ sci, name, lat, lng, date, method, svg }]; onOpen(sci) opens the bird's entry.
export async function drawMap(el, points, onOpen) {
  const L = await loadLeaflet();
  const map = L.map(el, { zoomControl: false, attributionControl: true, tap: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  const show = list => {
    layer.clearLayers();
    // Repeat catches at the same spot stack slightly so each one stays tappable.
    const seen = {};
    for (const p of list) {
      const k = p.lat.toFixed(4) + ',' + p.lng.toFixed(4), n = seen[k] = (seen[k] || 0) + 1;
      const m = L.marker([p.lat + (n - 1) * 0.00012, p.lng + (n - 1) * 0.00012], {
        icon: L.divIcon({ className: 'pin', html: p.svg, iconSize: [40, 40], iconAnchor: [20, 34] }),
      }).addTo(layer);
      const when = new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const how = { voice: 'by description', sound: 'by song', photo: 'by photo', list: 'from the list' }[p.method] || '';
      const pop = document.createElement('div'); pop.className = 'mpop';
      pop.innerHTML = `<b></b><small></small><button class="btn">VIEW ENTRY</button>`;
      pop.querySelector('b').textContent = p.name;
      pop.querySelector('small').textContent = [p.place, `${when} ${how}`.trim()].filter(Boolean).join(' · ');
      pop.querySelector('button').onclick = () => onOpen(p.sci, p.name);
      m.bindPopup(pop, { closeButton: false });
    }
    if (list.length === 1) map.setView([list[0].lat, list[0].lng], 14);
    else if (list.length) map.fitBounds(L.latLngBounds(list.map(p => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 });
    else map.setView([39.5, -98.35], 3);
  };
  show(points);
  setTimeout(() => map.invalidateSize(), 50);
  return { show, map };
}

// Hotspot map: a dot per hotspot, bigger and brighter the more species were seen there in the last 7 days.
// spots: [{ locId, name, lat, lng, count, latest, km }]; popupFor(spot) returns the popup element.
export async function drawHotspots(el, spots, me, popupFor) {
  const L = await loadLeaflet();
  const map = L.map(el, { zoomControl: false, attributionControl: true, tap: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  const max = Math.max(1, ...spots.map(s => s.count));
  const marks = {};
  // Low counts fade into the map; the best spots glow gold.
  const color = f => f > 0.66 ? '#e7c27e' : f > 0.33 ? '#c98b4a' : '#7a9a6a';
  for (const s of [...spots].reverse()) {
    const f = s.count / max, size = Math.round(26 + 22 * f);
    const m = L.marker([s.lat, s.lng], { icon: L.divIcon({ className: 'hs', html: `<span style="width:${size}px;height:${size}px;background:${color(f)}">${s.count}</span>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }) }).addTo(map);
    m.bindPopup(() => popupFor(s), { closeButton: false });
    marks[s.locId] = m;
  }
  if (me) L.marker([me.lat, me.lng], { icon: L.divIcon({ className: 'me', html: '<i></i>', iconSize: [16, 16], iconAnchor: [8, 8] }), interactive: false }).addTo(map);
  const pts = spots.map(s => [s.lat, s.lng]).concat(me ? [[me.lat, me.lng]] : []);
  if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 13 });
  else if (pts.length) map.setView(pts[0], 12);
  setTimeout(() => map.invalidateSize(), 50);
  return { map, open: locId => { const m = marks[locId]; if (m) { map.setView(m.getLatLng(), Math.max(map.getZoom(), 12)); m.openPopup(); } } };
}
