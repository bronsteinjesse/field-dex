// Birding forecast: how good the morning should be, from overnight wind, rain and temperature (Open-Meteo, free, no key).
// Migrating songbirds fly at night and ride tailwinds: north winds in fall, south winds in spring.
// Rain that ends before dawn after a good flight night can drop many birds at once (a "fallout").
import { cached } from './store.js';

const H = 3600e3;
const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
const compass = deg => COMPASS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
const LABELS = ['', 'SLOW', 'FAIR', 'GOOD', 'GREAT', 'BIG FLIGHT'];

export async function weather(loc) {
  const k = `${loc.lat.toFixed(1)},${loc.lng.toFixed(1)}`;
  return cached('wx:' + k, H, async () => {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}` +
      '&hourly=temperature_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m' +
      '&daily=sunrise&timezone=auto&past_days=1&forecast_days=2&wind_speed_unit=mph&temperature_unit=fahrenheit');
    if (!r.ok) throw new Error('weather ' + r.status);
    return r.json();
  });
}

// Average wind as a vector so 350° and 10° average to north, not south.
function meanWind(rows) {
  let x = 0, y = 0, s = 0;
  for (const r of rows) { const a = r.dir * Math.PI / 180; x += Math.sin(a) * r.wind; y += Math.cos(a) * r.wind; s += r.wind; }
  return { dir: (Math.atan2(x, y) * 180 / Math.PI + 360) % 360, speed: rows.length ? s / rows.length : 0 };
}

// wx: Open-Meteo response. now: Date. Returns the forecast for this morning, or tomorrow morning after 2 pm.
export function score(wx, now = new Date(), arriving = 0) {
  const h = wx.hourly, rows = h.time.map((t, i) => ({ t, temp: h.temperature_2m[i], rain: h.precipitation[i], cloud: h.cloud_cover[i], wind: h.wind_speed_10m[i], dir: h.wind_direction_10m[i] }));
  // Times are local to the place ("2026-10-20T06:00"), so compare as local strings.
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const localNow = new Date(now.getTime() + (wx.utc_offset_seconds || 0) * 1000 + now.getTimezoneOffset() * 60e3);
  const tomorrow = localNow.getHours() >= 14;
  const day = new Date(localNow); if (tomorrow) day.setDate(day.getDate() + 1);
  const prev = new Date(day); prev.setDate(prev.getDate() - 1);
  const D = ymd(day), P = ymd(prev);
  const at = (date, a, b) => rows.filter(r => { const d = r.t.slice(0, 10), hr = +r.t.slice(11, 13); return d === date && hr >= a && hr < b; });
  const night = [...at(P, 20, 24), ...at(D, 0, 6)], dawn = at(D, 6, 11), dayBefore = at(P, 6, 11);
  if (night.length < 6 || dawn.length < 3) return null;

  const m = day.getMonth() + 1;
  const season = m >= 3 && m <= 5 ? 'spring' : m >= 8 && m <= 11 ? 'fall' : m <= 2 || m === 12 ? 'winter' : 'summer';
  const w = meanWind(night), from = compass(w.dir);
  const nightRain = night.reduce((a, r) => a + r.rain, 0), lateRain = at(D, 3, 6).reduce((a, r) => a + r.rain, 0);
  const dawnRain = dawn.reduce((a, r) => a + r.rain, 0), dawnWind = dawn.reduce((a, r) => a + r.wind, 0) / dawn.length;
  const tempDrop = dayBefore.length ? Math.max(...dayBefore.map(r => r.temp)) - Math.max(...dawn.map(r => r.temp)) : 0;
  const why = [];
  let pts = 2;

  if (season === 'fall' || season === 'spring') {
    const good = season === 'fall' ? ['north', 'northwest', 'northeast'] : ['south', 'southwest', 'southeast'];
    const bad = season === 'fall' ? ['south', 'southwest', 'southeast'] : ['north', 'northwest', 'northeast'];
    if (good.includes(from) && w.speed >= 4) { pts += w.speed >= 8 ? 1.5 : 1; why.push(`${cap(from)} winds overnight (${Math.round(w.speed)} mph) pushed ${season} migrants along`); }
    else if (bad.includes(from) && w.speed >= 8) { pts -= 1; why.push(`${cap(from)} winds overnight held most migrants back`); }
    else why.push(`Light or crosswinds overnight, an average night for migration`);
    if (season === 'fall' && tempDrop >= 8) { pts += 0.5; why.push(`A cold front: ${Math.round(tempDrop)}°F cooler than yesterday`); }
    if (nightRain > 2 && lateRain < 0.3 && good.includes(from)) { pts += 1; why.push('Rain ended before dawn, so birds may have dropped in all at once'); }
    else if (nightRain > 4) { pts -= 0.5; why.push('Steady rain overnight kept many birds grounded where they were'); }
  } else {
    why.push(season === 'winter' ? 'Winter: few birds are migrating, but feeders and open water stay busy' : 'Summer: birds are nesting, so early mornings are best for song');
  }
  if (dawnRain > 2) { pts -= 1; why.push('Rain this morning will keep birds quiet and hidden'); }
  if (dawnWind > 18) { pts -= 1; why.push(`Windy this morning (${Math.round(dawnWind)} mph), so small birds will stay low`); }
  else if (dawnWind < 8 && dawnRain < 0.5) { pts += 0.5; why.push('Calm morning, good for hearing songs and calls'); }
  if (arriving >= 3) { pts += 0.5; why.push(`${arriving} species have been arriving in your county this week`); }

  const stars = Math.max(1, Math.min(5, Math.round(pts)));
  const sun = (wx.daily?.sunrise || []).find(s => s.startsWith(D));
  const sunrise = sun ? fmtTime(sun) : null;
  const end = sun ? fmtTime(sun, 3) : null;
  return { when: tomorrow ? 'TOMORROW' : 'TODAY', stars, label: LABELS[stars], season, wind: { from, speed: Math.round(w.speed) }, why, best: sunrise ? `${sunrise} to ${end}` : null };
}

const cap = s => s[0].toUpperCase() + s.slice(1);
function fmtTime(local, plusH = 0) {
  let h = +local.slice(11, 13) + plusH; const mm = local.slice(14, 16);
  const ap = h >= 12 && h < 24 ? 'pm' : 'am'; h = h % 12 || 12;
  return `${h}:${mm} ${ap}`;
}
