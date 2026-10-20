// Trainer card: drawn on a canvas so it can be shared as a picture.
const W = 1200, H = 760;
const C = { bark: '#2b1d13', bg: '#1a3023', panel: '#24402e', panel2: '#2c4b37', fg: '#e6eadb', mut: '#93a892', gold: '#e7c27e', acc: '#d39b4a', cream: '#e9e4d2', ink: '#22201a' };
const PX = '"Pixelify Sans", ui-monospace, monospace', SANS = 'Figtree, system-ui, sans-serif';

function svgImage(svg) {
  return new Promise(res => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); };
    img.src = url;
  });
}

function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

function fit(g, text, max, size, font = PX, weight = 700) {
  let s = size;
  do { g.font = `${weight} ${s}px ${font}`; s -= 2; } while (g.measureText(text).width > max && s > 14);
}

// d: { trainer, level, xp, xpThis, xpNext, caught, rare, region, since, badges:[{n,on}], fav:{svg,name,count}, recent:[svg] }
export async function drawCard(d) {
  await Promise.all([document.fonts?.load(`700 40px ${PX}`), document.fonts?.load(`600 20px ${SANS}`)].map(p => p?.catch(() => {})));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.textBaseline = 'alphabetic';

  // Device frame and grid screen.
  g.fillStyle = C.bark; rr(g, 0, 0, W, H, 36); g.fill();
  g.fillStyle = C.bg; rr(g, 22, 22, W - 44, H - 44, 22); g.fill();
  g.save(); rr(g, 22, 22, W - 44, H - 44, 22); g.clip();
  g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 2;
  for (let x = 22; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 22; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.restore();

  // Header: lens, lights, title.
  const lens = g.createRadialGradient(80, 70, 4, 88, 78, 34);
  lens.addColorStop(0, '#e3f6f2'); lens.addColorStop(0.35, '#5aa9b6'); lens.addColorStop(1, '#1d5666');
  g.fillStyle = '#0c0c0a'; g.beginPath(); g.arc(88, 80, 38, 0, 7); g.fill();
  g.fillStyle = C.cream; g.beginPath(); g.arc(88, 80, 34, 0, 7); g.fill();
  g.fillStyle = lens; g.beginPath(); g.arc(88, 80, 30, 0, 7); g.fill();
  ['#c4513a', '#d9a441', '#6fae5a'].forEach((c, i) => { g.fillStyle = '#0c0c0a'; g.beginPath(); g.arc(152 + i * 30, 64, 10, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(152 + i * 30, 64, 8, 0, 7); g.fill(); });
  g.fillStyle = C.gold; g.font = `700 40px ${PX}`; g.textAlign = 'right'; g.fillText('TRAINER CARD', W - 60, 94);
  g.fillStyle = C.mut; g.font = `500 20px ${PX}`; g.fillText('FIELD DEX', W - 60, 58);
  g.textAlign = 'left';

  // Favorite bird on a platform.
  g.fillStyle = C.panel; rr(g, 52, 134, 400, 400, 14); g.fill();
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(252, 440, 150, 30, 0, 0, 7); g.fill();
  g.fillStyle = C.panel2; g.beginPath(); g.ellipse(252, 432, 150, 30, 0, 0, 7); g.fill();
  if (d.fav) {
    const img = await svgImage(d.fav.svg);
    if (img) g.drawImage(img, 92, 150, 320, 320);
    g.fillStyle = C.gold; g.font = `500 18px ${PX}`; g.fillText('FAVORITE', 76, 172);
    g.fillStyle = C.fg; fit(g, d.fav.name, 352, 28); g.fillText(d.fav.name, 76, 500);
    g.fillStyle = C.mut; g.font = `600 18px ${SANS}`; g.fillText(`caught ${d.fav.count}×`, 76, 524);
  } else {
    g.fillStyle = C.mut; g.font = `500 24px ${PX}`; g.textAlign = 'center'; g.fillText('No birds yet', 252, 340); g.textAlign = 'left';
  }

  // Name plate and stats.
  const X = 486, R = W - 60;
  g.fillStyle = C.bark; rr(g, X, 134, R - X, 80, 8); g.fill();
  g.fillStyle = C.cream; rr(g, X + 4, 138, R - X - 8, 72, 6); g.fill();
  g.fillStyle = C.ink; fit(g, d.trainer.toUpperCase(), R - X - 160, 40); g.fillText(d.trainer.toUpperCase(), X + 22, 188);
  g.font = `700 30px ${PX}`; g.textAlign = 'right'; g.fillText(`LV ${d.level}`, R - 22, 186); g.textAlign = 'left';

  // XP bar.
  g.fillStyle = C.mut; g.font = `500 18px ${PX}`; g.fillText('XP', X, 252);
  g.fillStyle = C.bark; rr(g, X + 40, 236, R - X - 40, 20, 4); g.fill();
  const pct = Math.max(0.02, Math.min(1, (d.xp - d.xpThis) / Math.max(1, d.xpNext - d.xpThis)));
  g.fillStyle = C.acc; rr(g, X + 43, 239, (R - X - 46) * pct, 14, 3); g.fill();
  g.fillStyle = C.mut; g.font = `600 16px ${SANS}`; g.textAlign = 'right'; g.fillText(`${d.xp} / ${d.xpNext} XP`, R, 280); g.textAlign = 'left';

  const stat = (y, k, v) => {
    g.fillStyle = C.mut; g.font = `500 22px ${PX}`; g.fillText(k, X, y);
    g.fillStyle = C.fg; g.textAlign = 'right'; fit(g, v, 360, 26); g.fillText(v, R, y); g.textAlign = 'left';
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X, y + 14); g.lineTo(R, y + 14); g.stroke();
  };
  stat(328, 'BIRDS CAUGHT', String(d.caught));
  stat(376, 'RARE FINDS', String(d.rare));
  stat(424, 'REGION', d.region || '—');
  stat(472, 'BIRDING SINCE', d.since || '—');

  // Recent catches.
  g.fillStyle = C.gold; g.font = `500 18px ${PX}`; g.fillText('RECENT CATCHES', X, 518);
  const imgs = await Promise.all(d.recent.slice(0, 6).map(svgImage));
  imgs.forEach((img, i) => img && g.drawImage(img, X - 6 + i * 104, 520, 92, 92));

  // Badges.
  g.fillStyle = C.gold; g.font = `500 18px ${PX}`; g.fillText('BADGES', 52, 590);
  g.fillStyle = C.mut; g.textAlign = 'right'; g.fillText(`${d.badges.filter(b => b.on).length} / ${d.badges.length}`, 452, 590); g.textAlign = 'left';
  const bw = (W - 104 - 7 * 12) / 8;
  d.badges.forEach((b, i) => {
    const x = 52 + i * (bw + 12), y = 632;
    g.fillStyle = b.on ? '#9c6f33' : '#182b20'; rr(g, x, y + 6, bw, 66, 8); g.fill();
    g.fillStyle = b.on ? C.acc : C.panel; rr(g, x, y, bw, 64, 8); g.fill();
    g.fillStyle = b.on ? C.ink : C.mut; g.textAlign = 'center';
    fit(g, b.n, bw - 16, 20, PX, 700); g.fillText(b.n, x + bw / 2, y + 30);
    g.font = `600 14px ${SANS}`; g.fillText(b.on ? 'EARNED' : b.prog, x + bw / 2, y + 52);
    g.textAlign = 'left';
  });
  return cv;
}
