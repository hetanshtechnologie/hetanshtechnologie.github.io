import { CARD, DEFAULT_DETAILS, DEFAULT_DESIGN } from './config.js';
import { loadImage, formatDate } from './utils.js';

const W = CARD.width;
const H = CARD.height;

const TEXT = {
  gu: {
    salutation: 'પ્રિય',
    and: 'અને',
    invite: 'સ્નેહપૂર્વક નિમંત્રણ',
    family: 'તથા પરિવારજનો',
    date: 'તારીખ',
    time: 'સમય',
    venue: 'સ્થળ',
    scan: 'સ્થળ માટે સ્કેન કરો',
    blessing: 'તમારી ઉપસ્થિતિ જ અમારો આશીર્વાદ છે',
    shubh: '॥ શુભ લગ્ન ॥',
    ganesh: '॥ શ્રી ગણેશાય નમઃ ॥',
    watermark: 'Kankotri દ્વારા બનાવેલું',
    rsvp: 'આપનું સ્વાગત છે'
  },
  en: {
    salutation: 'Dear',
    and: 'and',
    invite: 'With love, we invite you',
    family: '& family',
    date: 'Date',
    time: 'Time',
    venue: 'Venue',
    scan: 'Scan for venue',
    blessing: 'Your presence is our blessing',
    shubh: '|| Shubh Lagna ||',
    ganesh: '|| Shree Ganeshay Namah ||',
    watermark: 'Made with Kankotri',
    rsvp: 'We look forward to celebrating with you'
  }
};

const hasGujarati = (value) => /[\u0A80-\u0AFF]/.test(String(value || ''));

function hexA(hex, alpha) {
  const value = String(hex || '#000').replace('#', '');
  const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function font(weight, size, family) {
  return `${weight} ${size}px "${family}"`;
}

const LATIN_ONLY_FONTS = ['Cormorant Garamond', 'Playfair Display', 'Great Vibes', 'Inter'];

function guFont(details) {
  const family = details?.font_family;
  if (family && !LATIN_ONLY_FONTS.includes(family)) return family;
  return 'Noto Sans Gujarati';
}

function latinFont(design, details) {
  return details?.font_family || design?.font || 'Cormorant Garamond';
}

function scriptOrSerif(text, design, details) {
  if (hasGujarati(text)) return guFont(details);
  return design?.layout === 'modern' ? latinFont(design, details) : 'Great Vibes';
}

export async function ensureFonts() {
  if (!document.fonts) return;
  try {
    await document.fonts.ready;
    const families = ['Cormorant Garamond', 'Playfair Display', 'Great Vibes', 'Noto Sans Gujarati', 'Noto Serif Gujarati', 'Inter'];
    await Promise.all(families.map(name => document.fonts.load(`600 48px "${name}"`).catch(() => null)));
  } catch {
    /* fonts are best effort */
  }
}

export function makeQrDataUrl(text, size = 8) {
  try {
    if (typeof window.qrcode !== 'function' || !text) return null;
    const qr = window.qrcode(0, 'M');
    qr.addData(String(text));
    qr.make();
    return qr.createDataURL(size, 0);
  } catch {
    return null;
  }
}

export async function prepareAssets({ details = {}, template = {}, qrText } = {}) {
  const assets = { logo: null, background: null, qr: null, customFont: null };
  const tasks = [];
  if (details.logo_url) {
    tasks.push(loadImage(details.logo_url).then(img => { assets.logo = img; }).catch(() => null));
  }
  if (template?.template_image_url) {
    tasks.push(loadImage(template.template_image_url).then(img => { assets.background = img; }).catch(() => null));
  }
  if (qrText) {
    const dataUrl = makeQrDataUrl(qrText);
    if (dataUrl) {
      tasks.push(loadImage(dataUrl).then(img => { assets.qr = img; }).catch(() => null));
    }
  }
  await Promise.all(tasks);
  return assets;
}

function fitSize(ctx, text, maxWidth, start, min, weight, family) {
  let size = start;
  while (size > min) {
    ctx.font = font(weight, size, family);
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function wrapLines(ctx, text, maxWidth) {
  const paragraphs = String(text || '').split(/\n/);
  const lines = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawTracked(ctx, text, x, y, spacing, size, weight, family) {
  ctx.font = font(weight, size, family);
  const chars = Array.from(String(text));
  const widths = chars.map(c => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  let cursor = x - total / 2;
  ctx.textAlign = 'left';
  chars.forEach((char, i) => {
    ctx.fillText(char, cursor, y);
    cursor += widths[i] + spacing;
  });
  ctx.textAlign = 'center';
  return total;
}

function drawMandala(ctx, cx, cy, r, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, r - i * (r / 4), 0, Math.PI * 2);
    ctx.stroke();
  }
  const petals = 16;
  for (let i = 0; i < petals; i += 1) {
    const angle = (Math.PI * 2 * i) / petals;
    const px = cx + Math.cos(angle) * (r * 0.55);
    const py = cy + Math.sin(angle) * (r * 0.55);
    ctx.beginPath();
    ctx.ellipse(px, py, r * 0.14, r * 0.05, angle, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = hexA(color, 0.18);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCornerFloral(ctx, x, y, scale, rotation, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.fillStyle = hexA(color, 0.18);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(40, 8, 74, 34, 92, 78);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(20, 38, 42, 58, 84, 70);
  ctx.stroke();
  const leaves = [[26, 16, -0.5], [46, 32, -0.2], [62, 50, 0.2], [34, 52, 0.9], [56, 20, -1]];
  leaves.forEach(([lx, ly, rot]) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, -9, 6, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  ctx.beginPath();
  ctx.arc(88, 76, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPaisley(ctx, x, y, size, flip, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(size * 0.9, -size * 0.1, size * 0.8, size * 0.9, size * 0.05, size);
  ctx.bezierCurveTo(-size * 0.4, size * 0.75, -size * 0.25, size * 0.25, 0, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size * 0.34, size * 0.4, size * 0.12, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(size * 0.32, size * 0.4, size * (0.2 + i * 0.1), 0.5, 2.2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLotus(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = hexA(color, 0.14);
  ctx.lineWidth = 1.6;
  for (let i = -3; i <= 3; i += 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i * Math.PI) / 11);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.55, size * 0.13, size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawRings(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx - size * 0.3, cy, size * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + size * 0.3, cy, size * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.92);
  ctx.lineTo(cx - size * 0.13, cy - size * 0.7);
  ctx.lineTo(cx + size * 0.13, cy - size * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawKalash(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = hexA(color, 0.12);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.4, cy - size * 0.1);
  ctx.bezierCurveTo(cx - size * 0.6, cy + size * 0.5, cx - size * 0.3, cy + size * 0.8, cx, cy + size * 0.8);
  ctx.bezierCurveTo(cx + size * 0.3, cy + size * 0.8, cx + size * 0.6, cy + size * 0.5, cx + size * 0.4, cy - size * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy - size * 0.22, size * 0.48, size * 0.14, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.16, cy - size * 0.36);
  ctx.lineTo(cx + size * 0.16, cy - size * 0.36);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.5, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSparkles(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const star = (x, y, r) => {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.stroke();
  };
  star(cx, cy, size * 0.5);
  star(cx - size * 0.9, cy + size * 0.35, size * 0.26);
  star(cx + size * 0.95, cy + size * 0.25, size * 0.2);
  ctx.restore();
}

function drawOrnament(ctx, x, y, design, lang, size = 54) {
  const color = design.gold;
  const kind = design.ornament || 'mandala';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (kind === 'ganesh') {
    ctx.fillStyle = color;
    ctx.font = font(600, size * 0.42, 'Noto Sans Gujarati');
    ctx.fillText(lang === 'gu' ? TEXT.gu.ganesh : TEXT.en.ganesh, x, y - size * 0.9);
    drawMandala(ctx, x, y, size * 0.68, color, 0.9);
    ctx.fillStyle = color;
    ctx.font = font(600, size * 0.6, 'Noto Sans Gujarati');
    ctx.fillText('ૐ', x, y + size * 0.04);
  } else if (kind === 'om') {
    ctx.fillStyle = color;
    ctx.font = font(600, size * 1.15, 'Noto Sans Gujarati');
    ctx.fillText('ૐ', x, y);
    ctx.strokeStyle = hexA(color, 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - size * 1.6, y);
    ctx.lineTo(x - size * 0.85, y);
    ctx.moveTo(x + size * 0.85, y);
    ctx.lineTo(x + size * 1.6, y);
    ctx.stroke();
  } else if (kind === 'rings') {
    drawRings(ctx, x, y, size * 0.9, color);
  } else if (kind === 'kalash') {
    drawKalash(ctx, x, y, size * 0.85, color);
  } else if (kind === 'sparkle') {
    drawSparkles(ctx, x, y, size, color);
  } else if (kind === 'floral') {
    drawLotus(ctx, x, y + size * 0.25, size * 0.95, color);
    drawCornerFloral(ctx, x - size * 1.45, y - size * 0.7, size / 95, 0.35, hexA(color, 0.8));
    drawCornerFloral(ctx, x + size * 1.45, y - size * 0.7, size / 95, Math.PI - 0.35, hexA(color, 0.8));
  } else {
    drawMandala(ctx, x, y, size * 0.75, color, 0.92);
  }
  ctx.restore();
}

function drawBackground(ctx, design, background) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, design.bg?.[0] || DEFAULT_DESIGN.bg[0]);
  g.addColorStop(1, design.bg?.[1] || DEFAULT_DESIGN.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  if (background) {
    const scale = Math.max(W / background.width, H / background.height);
    const w = background.width * scale;
    const h = background.height * scale;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(background, (W - w) / 2, (H - h) / 2, w, h);
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = design.bg?.[0] || '#FFF8E7';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  ctx.save();
  const isDark = isDarkColor(design.bg?.[0] || '#FFF8E7');
  ctx.fillStyle = isDark ? 'rgba(255,248,231,.055)' : hexA(design.accent, 0.055);
  for (let y = 70; y < H; y += 110) {
    for (let x = 70; x < W; x += 110) {
      const offset = (Math.floor(y / 110) % 2) * 55;
      ctx.beginPath();
      ctx.arc(x + offset, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function isDarkColor(hex) {
  const value = String(hex || '').replace('#', '');
  if (value.length !== 6) return false;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

function drawFrame(ctx, design) {
  const accent = design.accent;
  const gold = design.gold;
  ctx.save();
  ctx.strokeStyle = hexA(accent, 0.55);
  ctx.lineWidth = 1.4;
  ctx.strokeRect(38, 38, W - 76, H - 76);
  ctx.strokeStyle = hexA(gold, 0.85);
  ctx.lineWidth = 2.6;
  ctx.strokeRect(54, 54, W - 108, H - 108);
  ctx.strokeStyle = hexA(accent, 0.22);
  ctx.lineWidth = 1;
  ctx.strokeRect(66, 66, W - 132, H - 132);

  const border = design.border || 'mandala';
  if (border === 'floral') {
    drawCornerFloral(ctx, 58, 58, 1.05, 0, hexA(accent, 0.85));
    drawCornerFloral(ctx, W - 58, 58, 1.05, Math.PI / 2, hexA(accent, 0.85));
    drawCornerFloral(ctx, W - 58, H - 58, 1.05, Math.PI, hexA(accent, 0.85));
    drawCornerFloral(ctx, 58, H - 58, 1.05, -Math.PI / 2, hexA(accent, 0.85));
  } else if (border === 'paisley') {
    for (let i = 0; i < 5; i += 1) {
      const x = 120 + i * 210;
      drawPaisley(ctx, x, 72, 26, false, hexA(gold, 0.65));
      drawPaisley(ctx, x, H - 74, 26, false, hexA(gold, 0.65));
    }
    drawCornerFloral(ctx, 58, 58, 0.9, 0, hexA(accent, 0.7));
    drawCornerFloral(ctx, W - 58, H - 58, 0.9, Math.PI, hexA(accent, 0.7));
  } else if (border === 'mandala') {
    drawMandala(ctx, 92, 92, 48, hexA(gold, 0.5), 0.9);
    drawMandala(ctx, W - 92, 92, 48, hexA(gold, 0.5), 0.9);
    drawMandala(ctx, 92, H - 92, 48, hexA(gold, 0.5), 0.9);
    drawMandala(ctx, W - 92, H - 92, 48, hexA(gold, 0.5), 0.9);
  } else if (border === 'double') {
    ctx.strokeStyle = hexA(gold, 0.5);
    ctx.lineWidth = 6;
    [[78, 78, W - 156, H - 156], [96, 96, W - 192, H - 192]].forEach(([x, y, w, h]) => {
      ctx.strokeRect(x, y, w, h);
    });
    ctx.fillStyle = hexA(gold, 0.85);
    [[80, 80], [W - 80, 80], [80, H - 80], [W - 80, H - 80]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    ctx.strokeStyle = hexA(gold, 0.9);
    ctx.lineWidth = 3;
    const len = 68;
    [[70, 70, 1, 1], [W - 70, 70, -1, 1], [70, H - 70, 1, -1], [W - 70, H - 70, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(x + sx * len, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + sy * len);
      ctx.stroke();
    });
  }
  ctx.restore();
}

function drawDivider(ctx, cx, y, width, color) {
  ctx.save();
  ctx.strokeStyle = hexA(color, 0.6);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, y);
  ctx.lineTo(cx - 18, y);
  ctx.moveTo(cx + 18, y);
  ctx.lineTo(cx + width / 2, y);
  ctx.stroke();
  ctx.fillStyle = hexA(color, 0.9);
  ctx.beginPath();
  ctx.arc(cx, y, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - 12, y, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 12, y, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const lines = wrapLines(ctx, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
  return lines.length * lineHeight;
}

function drawDetailsIcon(ctx, type, x, y, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  if (type === 'date') {
    ctx.strokeRect(x - 8, y - 8, 16, 16);
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 3);
    ctx.lineTo(x + 8, y - 3);
    ctx.moveTo(x - 4, y - 12);
    ctx.lineTo(x - 4, y - 7);
    ctx.moveTo(x + 4, y - 12);
    ctx.lineTo(x + 4, y - 7);
    ctx.stroke();
  } else if (type === 'time') {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 5);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4, y + 2);
    ctx.stroke();
  } else if (type === 'venue') {
    ctx.beginPath();
    ctx.arc(x, y - 2, 6, Math.PI, 0);
    ctx.lineTo(x, y + 9);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - 2, 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawQr(ctx, qrImage, x, y, size, design, lang, label) {
  if (!qrImage) return;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,.12)';
  ctx.shadowBlur = 12;
  ctx.fillRect(x, y, size, size);
  ctx.shadowBlur = 0;
  ctx.drawImage(qrImage, x + 6, y + 6, size - 12, size - 12);
  ctx.strokeStyle = hexA(design.gold, 0.7);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, size, size);
  ctx.fillStyle = design.accent;
  ctx.font = font(600, 10.5, lang === 'gu' ? 'Noto Sans Gujarati' : 'Inter');
  ctx.textAlign = 'center';
  ctx.fillText(label, x + size / 2, y + size + 16);
  ctx.restore();
}

function layoutPositions(layout) {
  if (layout === 'modern') {
    return { cx: 540, guestY: 288, eventY: 390, brideY: 520, ampY: 610, groomY: 690, msgY: 795, detailsY: 980, align: 'center' };
  }
  if (layout === 'royal') {
    return { cx: 540, guestY: 300, eventY: 400, brideY: 545, ampY: 635, groomY: 720, msgY: 825, detailsY: 1010, align: 'center' };
  }
  return { cx: 540, guestY: 300, eventY: 398, brideY: 540, ampY: 630, groomY: 715, msgY: 815, detailsY: 1000, align: 'center' };
}

export function drawCard(ctx, options = {}, assets = {}) {
  const details = { ...DEFAULT_DETAILS, ...(options.details || {}) };
  const design = { ...DEFAULT_DESIGN, ...(options.design || {}) };
  const guest = options.guest || {};
  const lang = details.language === 'en' ? 'en' : 'gu';
  const L = TEXT[lang];
  const watermark = !!options.watermark;

  drawBackground(ctx, design, assets.background);
  drawFrame(ctx, design);

  const pos = layoutPositions(design.layout);
  const accent = design.accent;
  const gold = design.gold;
  const ink = design.text;
  ctx.textBaseline = 'alphabetic';

  // Royal arch behind names
  if (design.layout === 'royal') {
    ctx.save();
    ctx.strokeStyle = hexA(gold, 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(150, 700);
    ctx.lineTo(150, 470);
    ctx.bezierCurveTo(150, 330, 340, 330, 540, 330);
    ctx.bezierCurveTo(740, 330, 930, 330, 930, 470);
    ctx.lineTo(930, 700);
    ctx.stroke();
    ctx.strokeStyle = hexA(accent, 0.18);
    ctx.lineWidth = 1;
    ctx.strokeRect(108, 88, W - 216, H - 220);
    ctx.restore();
  }

  // Ornament
  drawOrnament(ctx, pos.cx, 210, design, lang, 58);

  // Guest salutation
  ctx.textAlign = 'center';
  ctx.fillStyle = ink;
  const guestName = guest.guest_name || guest.name || 'Guest';
  const familyName = guest.family_name || '';
  const guestLabel = `${L.salutation} ${guestName}`;
  const salutationFamily = hasGujarati(guestName) ? guFont(details) : latinFont(design, details);
  const guestSize = fitSize(ctx, guestLabel, 760, 34, 20, 600, salutationFamily);
  ctx.font = font(600, guestSize, salutationFamily);
  ctx.fillStyle = ink;
  ctx.fillText(guestLabel, pos.cx, pos.guestY);
  if (familyName) {
    ctx.font = font(500, 21, latinFont(design, details));
    ctx.fillStyle = hexA(ink, 0.72);
    ctx.fillText(familyName, pos.cx, pos.guestY + 33);
  } else {
    ctx.font = font(400, 19, lang === 'gu' ? 'Noto Sans Gujarati' : latinFont(design, details));
    ctx.fillStyle = hexA(ink, 0.6);
    ctx.fillText(lang === 'gu' ? L.family : L.family, pos.cx, pos.guestY + 31);
  }

  // Event name ribbon
  const eventName = (details.event_name || (lang === 'gu' ? 'લગ્નોત્સવ' : 'Wedding Celebration')).toUpperCase();
  ctx.font = font(600, 15, lang === 'gu' ? 'Noto Sans Gujarati' : 'Inter');
  ctx.fillStyle = gold;
  drawTracked(ctx, eventName, pos.cx, pos.eventY, 4.2, 15, 600, lang === 'gu' ? 'Noto Sans Gujarati' : 'Inter');

  // Names
  const bride = details.bride_name || (lang === 'gu' ? 'કન્યા' : 'Bride');
  const groom = details.groom_name || (lang === 'gu' ? 'વરરાજા' : 'Groom');
  const brideFont = scriptOrSerif(bride, design, details);
  const groomFont = scriptOrSerif(groom, design, details);
  const nameMax = 760;

  ctx.fillStyle = ink;
  const brideSize = fitSize(ctx, bride, nameMax, design.layout === 'modern' ? 82 : 90, 44, 500, brideFont);
  ctx.font = font(500, brideSize, brideFont);
  ctx.fillText(bride, pos.cx, pos.brideY);

  ctx.save();
  ctx.fillStyle = gold;
  ctx.font = font(500, 42, 'Cormorant Garamond');
  ctx.fillText(lang === 'gu' ? L.and : '&', pos.cx, pos.ampY);
  ctx.restore();

  ctx.fillStyle = ink;
  const groomSize = fitSize(ctx, groom, nameMax, design.layout === 'modern' ? 82 : 90, 44, 500, groomFont);
  ctx.font = font(500, groomSize, groomFont);
  ctx.fillText(groom, pos.cx, pos.groomY);

  drawDivider(ctx, pos.cx, pos.groomY + 62, 280, gold);

  // Message
  const messageFont = lang === 'gu' ? guFont(details) : 'Cormorant Garamond';
  ctx.fillStyle = hexA(ink, 0.86);
  ctx.font = font(400, 24, messageFont);
  const msg = details.message || DEFAULT_DETAILS.message;
  const msgY = pos.groomY + 110;
  const msgLines = drawWrappedText(ctx, msg, pos.cx, msgY, 720, 34, 3);

  // Details
  let detailsY = Math.max(pos.detailsY, msgY + msgLines + 22);
  const dateText = details.wedding_date ? formatDate(details.wedding_date, lang === 'gu' ? 'gu' : 'en') : (lang === 'gu' ? 'તારીખ જાહેર થશે' : 'Date to be announced');
  const timeText = details.time || '';
  const venueText = details.venue || '';
  const detailsFont = lang === 'gu' ? 'Noto Sans Gujarati' : 'Cormorant Garamond';

  ctx.fillStyle = ink;
  if (dateText) {
    drawDetailsIcon(ctx, 'date', pos.cx - 120, detailsY - 6, gold);
    ctx.font = font(600, 21, detailsFont);
    ctx.textAlign = 'left';
    ctx.fillText(dateText, pos.cx - 92, detailsY);
    ctx.textAlign = 'center';
    detailsY += 34;
  }
  if (timeText) {
    drawDetailsIcon(ctx, 'time', pos.cx - 120, detailsY - 6, gold);
    ctx.font = font(500, 20, detailsFont);
    ctx.textAlign = 'left';
    ctx.fillText(timeText, pos.cx - 92, detailsY);
    ctx.textAlign = 'center';
    detailsY += 34;
  }
  if (venueText) {
    drawDetailsIcon(ctx, 'venue', pos.cx - 120, detailsY - 6, gold);
    ctx.font = font(500, 20, detailsFont);
    ctx.textAlign = 'left';
    const venueLines = wrapLines(ctx, venueText, 650).slice(0, 2);
    venueLines.forEach((line, i) => ctx.fillText(line, pos.cx - 92, detailsY + i * 26));
    ctx.textAlign = 'center';
    detailsY += 34 + Math.max(0, venueLines.length - 1) * 26;
  }

  // Family details
  if (details.family_details) {
    ctx.fillStyle = hexA(ink, 0.68);
    ctx.font = font(400, 19, lang === 'gu' ? guFont(details) : latinFont(design, details));
    drawWrappedText(ctx, details.family_details, pos.cx, detailsY + 10, 700, 24, 1);
  }

  // Footer / blessing
  const footerY = H - 170;
  drawDivider(ctx, pos.cx, footerY - 24, 240, hexA(gold, 0.55));
  ctx.fillStyle = hexA(ink, 0.62);
  ctx.font = font(400, 18, lang === 'gu' ? 'Noto Sans Gujarati' : 'Cormorant Garamond');
  ctx.fillText(L.blessing, pos.cx, footerY + 12);

  // QR
  if (assets.qr && details.show_qr !== false) {
    drawQr(ctx, assets.qr, 96, H - 284, 128, design, lang, L.scan);
  }

  // Logo
  if (assets.logo) {
    const size = 84;
    const ratio = assets.logo.width / assets.logo.height;
    const w = ratio >= 1 ? size : size * ratio;
    const h = ratio >= 1 ? size / ratio : size;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(assets.logo, W - 96 - w, H - 270, w, h);
    ctx.restore();
  }

  // Small monogram at bottom centre
  ctx.fillStyle = hexA(gold, 0.7);
  ctx.font = font(600, 13, 'Inter');
  drawTracked(ctx, 'K A N K O T R I', pos.cx, H - 94, 5, 11, 600, 'Inter');

  if (watermark) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = ink;
    ctx.font = font(500, 13, 'Inter');
    ctx.textAlign = 'right';
    ctx.fillText(L.watermark, W - 92, H - 70);
    ctx.restore();
  }
}

export async function renderPreview(canvas, opts = {}) {
  if (!canvas) return null;
  await ensureFonts();
  const assets = opts.assets || await prepareAssets({
    details: opts.details,
    template: opts.template,
    qrText: opts.qrText
  });
  const scale = CARD.previewWidth / W;
  canvas.width = Math.round(W * scale * 2);
  canvas.height = Math.round(H * scale * 2);
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.scale(scale * 2, scale * 2);
  drawCard(ctx, opts, assets);
  ctx.restore();
  return canvas;
}

export async function renderThumbnail(canvas, template, details = {}, lang = 'gu') {
  const opts = {
    details: { ...DEFAULT_DETAILS, ...details, language: lang, show_qr: false },
    design: template.design,
    guest: { guest_name: lang === 'gu' ? 'મહેમાન' : 'Guest', family_name: '' },
    watermark: false
  };
  const assets = { logo: null, background: null, qr: null };
  if (template.template_image_url) {
    try { assets.background = await loadImage(template.template_image_url); } catch { /* ignore */ }
  }
  const scale = 340 / W;
  canvas.width = 340;
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.scale(scale, scale);
  drawCard(ctx, opts, assets);
  ctx.restore();
  return canvas;
}

export async function renderExportCanvas(canvas, opts = {}, scale = 3) {
  await ensureFonts();
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.save();
  ctx.scale(scale, scale);
  drawCard(ctx, opts, opts.assets || {});
  ctx.restore();
  return canvas;
}

export function cardShareText(details, guest, lang = 'gu') {
  const d = { ...DEFAULT_DETAILS, ...details };
  if (lang === 'gu') {
    return [
      `પ્રિય ${guest?.guest_name || 'મહેમાન'},`,
      '',
      `અમે આપને અને આપના પરિવારને ${d.bride_name} અને ${d.groom_name} ના લગ્નોત્સવમાં આમંત્રિત કરીએ છીએ.`,
      `તારીખ: ${formatDate(d.wedding_date, 'gu')}`,
      d.time ? `સમય: ${d.time}` : '',
      d.venue ? `સ્થળ: ${d.venue}` : '',
      '',
      d.message || '',
      '',
      'તમારી ઉપસ્થિતિ જ અમારો આશીર્વાદ છે.'
    ].filter(Boolean).join('\n');
  }
  return [
    `Dear ${guest?.guest_name || 'Guest'},`,
    '',
    `We cordially invite you and your family to the wedding of ${d.bride_name} & ${d.groom_name}.`,
    `Date: ${formatDate(d.wedding_date, 'en')}`,
    d.time ? `Time: ${d.time}` : '',
    d.venue ? `Venue: ${d.venue}` : '',
    '',
    d.message || '',
    '',
    'Your presence is our blessing.'
  ].filter(Boolean).join('\n');
}
