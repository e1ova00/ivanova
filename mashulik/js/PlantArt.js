'use strict';

/**
 * Процедурный pixel-art двадцати растений. Каждое растение узнаваемо:
 * рассечённые листья монстер, стрелы алоказий, мечи сансевиерии, цветоносы орхидеи…
 * Спрайты кэшируются по ключу «вид|состояние|горшок|кадр покачивания».
 */
const PlantArt = (() => {
  const W = 44, H = 58, CX = 22, BASE = 56;
  const cache = new Map();

  // ---------- формы листьев ----------
  const SH = {
    oval: (u) => Math.pow(Math.sin(Math.PI * u), 0.75),
    heart: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.12))), 0.55),
    arrow: (u) => (u >= 0 ? Math.pow(1 - u, 0.8) : 0.95 * (1 + u / 0.3)),
    lance: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, 0.8))), 0.9),
    sword: (u) => (u < 0.78 ? 0.85 + 0.15 * Math.min(1, u * 5) : (1 - u) / 0.22),
    round: (u) => Math.pow(Math.sin(Math.PI * u), 0.5),
    violin: (u) => Math.min(1, Math.pow(u, 0.45) * Math.pow(1 - u, 0.3) * 1.75 * (1 - 0.16 * Math.exp(-((u - 0.42) ** 2) / 0.012))),
    spathe: (u) => Math.pow(Math.sin(Math.PI * u), 0.6),
  };

  // ---------- горшки ----------
  const POTS = {
    terracotta: { body: '#c26a4a', light: '#dc8a66', dark: '#984a34', rim: '#d47c5a' },
    cream: { body: '#efe2cc', light: '#fbf4e6', dark: '#cdb999', rim: '#f6ecd9' },
    pink: { body: '#e6a3ad', light: '#f3c3c9', dark: '#c27a87', rim: '#efb5bd' },
    sage: { body: '#a9c0a0', light: '#c6d8bd', dark: '#839b7c', rim: '#b8ceae' },
    premium: { body: '#2f5a46', light: '#467a60', dark: '#1f4032', rim: '#d8b25a' },
    marble: { body: '#ece8e2', light: '#ffffff', dark: '#c9c2b8', rim: '#d8b25a' },
  };

  function drawPot(b, size, style) {
    const p = POTS[style] || POTS.terracotta;
    const w = size === 'l' ? 16 : size === 'm' ? 13 : 10;
    const h = size === 'l' ? 11 : size === 'm' ? 9 : 7;
    const x0 = CX - Math.floor(w / 2);
    const top = BASE - h;
    for (let y = 0; y < h; y++) {
      const inset = Math.floor((y / h) * 2);
      const yy = top + y;
      b.rect(x0 + inset, yy, w - inset * 2, 1, p.body);
      b.px(x0 + inset, yy, p.dark);
      b.px(x0 + w - inset - 1, yy, p.dark);
      b.px(x0 + inset + 1, yy, p.light);
    }
    b.rect(x0 - 1, top, w + 2, 2, p.rim);
    b.rect(x0 - 1, top + 1, w + 2, 1, Utils.shade(p.rim, 0.85));
    b.rect(x0 + 1, top, w - 2, 1, '#4a3426');
    if (style === 'premium' || style === 'marble') {
      b.rect(x0 + 2, top + Math.floor(h * 0.55), w - 4, 1, '#d8b25a');
    }
    if (style === 'pink') {
      b.px(x0 + 3, top + 4, '#fbeef0'); b.px(x0 + w - 4, top + 5, '#fbeef0');
    }
    if (style === 'cream') {
      for (let i = 2; i < w - 2; i += 3) b.px(x0 + i, top + h - 3, '#9fb79a');
    }
    if (style === 'marble') {
      b.px(x0 + 3, top + 3, '#bdb5aa'); b.px(x0 + 4, top + 4, '#bdb5aa'); b.px(x0 + w - 4, top + 6, '#bdb5aa');
    }
    return { soilY: top + 1, w, h, x0 };
  }

  // ---------- общие помощники ----------
  function makeTint(state) {
    return (c) => {
      if (state === 'OVERWATERED') return Utils.mix(c, '#c9b65a', 0.42);
      if (state === 'DRY') return Utils.mix(c, '#a59c62', 0.3);
      if (state === 'DEAD') return Utils.mix(c, '#8a7a5a', 0.7);
      return c;
    };
  }

  function droopAngle(a, droop) {
    if (!droop) return a;
    if (a < -95) return a - 16 * droop;
    if (a > -85) return a + 16 * droop;
    return a + 10 * droop;
  }

  function stemTo(b, x, y, a, len, color) {
    const r = (a * Math.PI) / 180;
    const ex = x + Math.cos(r) * len;
    const ey = y + Math.sin(r) * len;
    b.curve(x, y, x + Math.cos(r) * len * 0.3, y + Math.sin(r) * len * 0.9 - 2, ex, ey, color);
    return [ex, ey];
  }

  // ---------- виды ----------
  function monsteraFill(pal, variant, idx) {
    return (u, vn, x, y) => {
      const e = Math.abs(vn);
      // рассечения от края и отверстия
      if (u > 0.14 && e > 0.5 && ((u * 6 + (vn > 0 ? 0.5 : 0)) % 1) < 0.2) return null;
      if (variant !== 'adansonii' && u > 0.25 && u < 0.8 && e > 0.26 && e < 0.4 && ((u * 5 + 0.3) % 1) < 0.16) return null;
      if (e < 0.09) return pal.vein;
      if (variant === 'thai') {
        const h = Utils.hash(x >> 1, y >> 1, idx);
        if (h > 0.72) return '#efe6c6';
        if (h > 0.66) return '#d9dcb0';
      }
      if (variant === 'albo') {
        if ((idx % 2 === 0 && vn > 0.15) || Utils.hash(x >> 1, y, idx + 9) > 0.8) return '#f4f1e6';
        if (idx % 2 === 1 && vn < -0.55) return '#f4f1e6';
      }
      if (vn > 0.35) return pal.dark;
      if (vn < -0.4 && u < 0.55) return pal.light;
      return pal.base;
    };
  }

  function drawMonstera(b, s, t, variant) {
    const pal = {
      base: t(variant === 'albo' ? '#4a8a48' : '#3f7a3c'), light: t('#5d9c4f'),
      dark: t('#2c5a2c'), vein: t('#76ad5c'),
    };
    const stem = t('#4f7a3a');
    const leaves = [
      [-150, 11, 13], [-120, 15, 15], [-60, 15, 15], [-30, 11, 13],
      [-100, 17, 16], [-80, 13, 15],
    ];
    leaves.forEach(([a0, sl, ll], i) => {
      const a = droopAngle(a0 + s.sway * (i % 2 ? 2 : -2), s.droop);
      const [ex, ey] = stemTo(b, CX, s.soilY, a, sl, stem);
      b.leaf(ex, ey, a + (a < -90 ? -10 : 10), ll, ll * 0.9, SH.heart, monsteraFill(pal, variant, i));
    });
  }

  function drawAdansonii(b, s, t) {
    const pal = { base: t('#4c8a44'), light: t('#6aa65a'), dark: t('#356a34'), vein: t('#7db466') };
    const stem = t('#4f7a3a');
    const leaves = [[-160, 8, 9], [-135, 11, 9], [-110, 13, 9], [-85, 14, 9], [-60, 12, 9], [-35, 10, 9], [-15, 7, 9], [168, 5, 8], [12, 5, 8]];
    leaves.forEach(([a0, sl, ll], i) => {
      const a = droopAngle(a0 + s.sway * (i % 2 ? 2 : -2), s.droop);
      const [ex, ey] = stemTo(b, CX, s.soilY, a, sl, stem);
      b.leaf(ex, ey, a, ll, 6.5, SH.oval, (u, vn) => {
        const e = Math.abs(vn);
        if (e > 0.18 && e < 0.68 && u > 0.18 && u < 0.85 && ((u * 3.2) % 1) < 0.42) return null;
        if (e < 0.12) return pal.vein;
        return vn > 0.3 ? pal.dark : vn < -0.5 ? pal.light : pal.base;
      });
    });
    // плети свисают с края горшка
    b.curve(CX - 6, s.soilY + 1, CX - 10, s.soilY + 6, CX - 9, s.soilY + 12, stem);
    b.leaf(CX - 9, s.soilY + 11, 100, 6, 5, SH.oval, () => pal.base);
  }

  function alocasiaFill(pal, kind, idx) {
    return (u, vn, x, y, vraw) => {
      if (u < 0 && Math.abs(vraw) < (-u / 0.3) * 0.95) return null; // выемка у основания
      const e = Math.abs(vn);
      // зазубренный край у Полли
      if (kind === 'polly' && e > 0.82 && ((u * 9) % 1) < 0.3) return null;
      if (e < 0.1 && u > -0.05) return pal.vein;
      const lat = ((u * 5 - e * 0.9) % 1 + 1) % 1;
      if ((kind === 'polly' || kind === 'frydek') && e > 0.12 && e < 0.85 && lat < (kind === 'frydek' ? 0.14 : 0.12)) return pal.vein;
      if (kind === 'velvet' && e > 0.15 && e < 0.8 && lat < 0.1) return pal.vein;
      if (kind === 'dragon' || kind === 'silver') {
        if (lat < 0.2 && e > 0.1) return pal.dark;
        if (lat > 0.55 && lat < 0.7) return pal.light;
        return pal.base;
      }
      if (vn < -0.45) return pal.light;
      if (vn > 0.5) return pal.dark;
      return pal.base;
    };
  }

  function drawAlocasia(b, s, t, kind) {
    const P = {
      polly: { base: '#22402b', light: '#2f5638', dark: '#18301f', vein: '#e3ecd8', stem: '#5a7a4a' },
      frydek: { base: '#2a4a32', light: '#36603f', dark: '#1d3524', vein: '#c4e2b8', stem: '#4a6a3e' },
      velvet: { base: '#25292a', light: '#33393a', dark: '#1a1d1e', vein: '#a6b2ad', stem: '#3a3a36' },
      dragon: { base: '#86a493', light: '#b2cabb', dark: '#46655a', vein: '#cfe0d4', stem: '#6a7a5a' },
      silver: { base: '#bccdc2', light: '#e0ebe3', dark: '#7f998c', vein: '#eef5f0', stem: '#8a9a7a' },
    }[kind];
    const pal = { base: t(P.base), light: t(P.light), dark: t(P.dark), vein: t(P.vein) };
    const compact = kind === 'velvet' || kind === 'silver';
    const leaves = compact
      ? [[-140, 5, 9, 9], [-90, 7, 10, 10], [-40, 5, 9, 9]]
      : [[-135, 12, 11, 9], [-108, 16, 12, 9], [-75, 15, 12, 9], [-48, 11, 11, 9], [-92, 9, 9, 7]];
    leaves.forEach(([a0, sl, ll, lw], i) => {
      const a = droopAngle(a0 + s.sway * (i % 2 ? 2 : -2), s.droop);
      const [ex, ey] = stemTo(b, CX, s.soilY, a, sl, t(P.stem));
      const tip = compact ? a + (a < -90 ? -60 : a > -90 ? 60 : 80) : a + (a < -90 ? -35 : 35);
      b.leaf(ex, ey, tip, ll, lw * (compact ? 1.25 : 1.15), compact ? SH.heart : SH.arrow,
        compact ? (u, vn) => {
          const e = Math.abs(vn);
          if (e < 0.1) return pal.vein;
          const lat = ((u * 4 - e * 0.8) % 1 + 1) % 1;
          if (e > 0.15 && e < 0.8 && lat < 0.12) return kind === 'silver' ? pal.dark : pal.vein;
          return vn < -0.4 ? pal.light : vn > 0.45 ? pal.dark : pal.base;
        } : alocasiaFill(pal, kind, i), compact ? 0 : -0.3);
    });
  }

  function drawFicusElastica(b, s, t) {
    const trunk = t('#6a5a3a');
    const top = s.soilY - 30 + s.droop * 2;
    b.line(CX, s.soilY, CX + s.sway, top, trunk, 2);
    const pal = { base: t('#25432e'), light: t('#4f7a57'), dark: t('#18301f') };
    for (let i = 0; i < 6; i++) {
      const y = s.soilY - 6 - i * 4.4;
      const left = i % 2 === 0;
      const a = droopAngle((left ? -150 : -30) + (left ? -i * 3 : i * 3) + s.sway * 2, s.droop);
      b.leaf(CX + (left ? -1 : 1), y, a, 10 - i * 0.4, 7, SH.oval, (u, vn) => {
        if (Math.abs(vn) < 0.1) return pal.light;
        if (vn < -0.4 && u > 0.2 && u < 0.6) return t('#6e9877');
        return vn > 0.35 ? pal.dark : pal.base;
      });
    }
    // молодой лист в бордовом чехле
    b.rect(CX - 1 + s.sway, top - 4, 2, 5, t('#9a3a4a'));
    b.px(CX + s.sway, top - 5, t('#c2566a'));
  }

  function drawFicusLyrata(b, s, t) {
    const trunk = t('#7a5a3a');
    const top = s.soilY - 22;
    b.line(CX, s.soilY, CX + s.sway, top, trunk, 2);
    const pal = { base: t('#4b7d3b'), light: t('#6c9d4f'), dark: t('#355d2b'), vein: t('#9cc078') };
    const L = [[-160, 0, 12], [-125, -3, 13], [-95, -6, 14], [-60, -3, 13], [-20, 0, 12], [-110, 6, 11], [-70, 6, 11]];
    L.forEach(([a0, dy, len], i) => {
      const a = droopAngle(a0 + s.sway * 2, s.droop);
      b.leaf(CX + s.sway, top + dy + 4, a, len, len * 0.85, SH.violin, (u, vn) => {
        const e = Math.abs(vn);
        if (e < 0.08) return pal.vein;
        const lat = ((u * 4 - e * 0.6) % 1 + 1) % 1;
        if (lat < 0.08 && e > 0.1) return pal.vein;
        return vn > 0.4 ? pal.dark : vn < -0.4 ? pal.light : pal.base;
      });
    });
  }

  function drawZZ(b, s, t) {
    const stem = t('#3a6030');
    const pal = { base: t('#2f6b2c'), light: t('#78a85a'), dark: t('#1f4a20') };
    const stems = [[-125, 20], [-105, 24], [-88, 26], [-70, 23], [-52, 19]];
    stems.forEach(([a0, len], k) => {
      const a = droopAngle(a0 + s.sway * 2, s.droop);
      const r = (a * Math.PI) / 180;
      b.line(CX, s.soilY, CX + Math.cos(r) * len, s.soilY + Math.sin(r) * len, stem, 1);
      for (let i = 3; i < len; i += 3.2) {
        const px = CX + Math.cos(r) * i, py = s.soilY + Math.sin(r) * i;
        for (const side of [-1, 1]) {
          b.leaf(px, py, a + side * 50, 4.2, 3.2, SH.oval, (u, vn) => (vn < -0.3 ? pal.light : vn > 0.4 ? pal.dark : pal.base));
        }
      }
      b.leaf(CX + Math.cos(r) * len, s.soilY + Math.sin(r) * len, a, 4, 3, SH.oval, () => pal.base);
      void k;
    });
  }

  function drawSansevieria(b, s, t) {
    const pal = { base: t('#3c6b3e'), band: t('#9cbc84'), edge: t('#d8c45a'), dark: t('#2c4f2e') };
    const L = [[-6, 23, -94], [-3, 28, -91], [1, 30, -89], [4, 26, -86], [7, 21, -83], [-1, 18, -98]];
    L.forEach(([dx, h, a0], i) => {
      const a = droopAngle(a0 + s.sway * (i % 2 ? 1 : -1), s.droop * 0.6);
      b.leaf(CX + dx, s.soilY + 1, a, h, 5, SH.sword, (u, vn) => {
        if (Math.abs(vn) > 0.7) return pal.edge;
        if (((u * 7 + i * 0.3) % 1) < 0.16) return pal.band;
        return vn > 0.2 ? pal.dark : pal.base;
      });
    });
  }

  function drawSpathiphyllum(b, s, t) {
    const pal = { base: t('#3f7a3c'), light: t('#5d9c4f'), dark: t('#2c5a2c') };
    const L = [-160, -140, -120, -100, -80, -60, -40, -20];
    L.forEach((a0, i) => {
      const a = droopAngle(a0 + s.sway * 2, s.droop);
      const [ex, ey] = stemTo(b, CX, s.soilY, a, 6 + (i % 3), t('#4f7a3a'));
      b.leaf(ex, ey, a, 11, 5, SH.lance, (u, vn) => (Math.abs(vn) < 0.12 ? pal.light : vn > 0.3 ? pal.dark : pal.base));
    });
    if (s.state !== 'DEAD') {
      [[-100, 22], [-78, 20], [-120, 17]].forEach(([a0, len]) => {
        const a = droopAngle(a0 + s.sway * 2, s.droop * 1.5);
        const r = (a * Math.PI) / 180;
        const ex = CX + Math.cos(r) * len, ey = s.soilY + Math.sin(r) * len;
        b.line(CX, s.soilY, ex, ey, t('#5a8a48'));
        b.leaf(ex, ey + 2, a, 7, 5, SH.spathe, (u, vn) => (vn > 0.3 ? '#e2ddd0' : '#f8f5ec'));
        b.rect(ex, ey - 1, 1, 3, '#efe0a0');
      });
    }
  }

  function drawCalathea(b, s, t) {
    const pal = { base: t('#4a7346'), dark: t('#2b452c'), pink: t('#eab0c2'), light: t('#7ea06e') };
    const L = [[-150, 7, 11], [-125, 10, 12], [-100, 12, 12], [-78, 12, 12], [-55, 10, 12], [-30, 7, 11]];
    L.forEach(([a0, sl, ll], i) => {
      const a = droopAngle(a0 + s.sway * 2, s.droop);
      const [ex, ey] = stemTo(b, CX, s.soilY, a, sl, t('#6a5a4a'));
      b.leaf(ex, ey, a, ll, 8, SH.oval, (u, vn) => {
        const e = Math.abs(vn);
        if (e < 0.08) return pal.light;
        const lat = ((u * 6 + e * 0.5) % 1 + 1) % 1;
        if (e > 0.25 && e < 0.75 && lat < 0.13) return pal.pink;
        return e > 0.8 ? pal.dark : vn > 0.3 ? pal.dark : pal.base;
      });
      void i;
    });
  }

  function drawPhalaenopsis(b, s, t) {
    const pal = { base: t('#3f6b3a'), light: t('#5d8a52'), dark: t('#2a4d28') };
    [[-170, 9], [-10, 9], [-150, 8], [-30, 8]].forEach(([a0, len]) => {
      const a = droopAngle(a0, s.droop);
      b.leaf(CX, s.soilY, a, len, 5, SH.oval, (u, vn) => (vn < -0.3 ? pal.light : vn > 0.3 ? pal.dark : pal.base));
    });
    // корни-серебрянки
    b.px(CX - 4, s.soilY - 1, '#b8c4b0'); b.px(CX + 3, s.soilY - 1, '#b8c4b0');
    // подпорка и цветонос
    b.line(CX - 1, s.soilY, CX - 1, s.soilY - 26, '#a8865a');
    const sw = s.sway;
    b.curve(CX, s.soilY, CX - 1, s.soilY - 30, CX + 9 + sw, s.soilY - 26 + s.droop * 4, t('#5a7a3a'));
    if (s.state === 'DEAD') return;
    const flowers = [[CX - 1, s.soilY - 26], [CX + 3 + sw, s.soilY - 28], [CX + 7 + sw, s.soilY - 27], [CX + 10 + sw, s.soilY - 24 + s.droop * 3]];
    flowers.forEach(([fx, fy], i) => {
      const petal = i % 2 ? '#fbeef3' : '#f4c2d2';
      b.disc(fx, fy, 2.2, petal);
      b.px(fx - 2, fy - 1, petal); b.px(fx + 2, fy - 1, petal);
      b.px(fx, fy, '#c2477a'); b.px(fx, fy + 1, '#e88aa8');
    });
  }

  function drawAnthurium(b, s, t) {
    const pal = { base: t('#2f6a3a'), light: t('#4f8f55'), dark: t('#1f4a28') };
    [[-145, 9, 10], [-115, 13, 11], [-70, 12, 11], [-35, 9, 10]].forEach(([a0, sl, ll]) => {
      const a = droopAngle(a0 + s.sway * 2, s.droop);
      const [ex, ey] = stemTo(b, CX, s.soilY, a, sl, t('#4a6a3a'));
      b.leaf(ex, ey, a + (a < -90 ? -20 : 20), ll, 9, SH.heart, (u, vn) => (Math.abs(vn) < 0.08 ? pal.light : vn < -0.4 ? pal.light : vn > 0.35 ? pal.dark : pal.base));
    });
    if (s.state === 'DEAD') return;
    [[-95, 17], [-55, 14], [-128, 13]].forEach(([a0, len]) => {
      const a = droopAngle(a0 + s.sway * 2, s.droop * 1.5);
      const r = (a * Math.PI) / 180;
      const ex = CX + Math.cos(r) * len, ey = s.soilY + Math.sin(r) * len;
      b.line(CX, s.soilY, ex, ey, t('#5a7a3a'));
      b.leaf(ex, ey + 1, a - 30, 6, 6, SH.heart, (u, vn) => (vn < -0.3 ? '#f28a98' : vn > 0.4 ? '#b8384c' : '#e0566a'));
      b.line(ex, ey, ex + 2, ey - 3, '#f2d06b');
    });
  }

  function drawEpipremnum(b, s, t) {
    const pal = { base: t('#4f8f3f'), light: t('#7ab25a'), yellow: t('#ddd56c'), dark: t('#376d2d') };
    const fill = (seed) => (u, vn, x, y) => {
      if (Utils.hash(x, y >> 1, seed) > 0.74) return pal.yellow;
      if (Math.abs(vn) < 0.1) return pal.light;
      return vn > 0.35 ? pal.dark : pal.base;
    };
    [[-150, 6], [-115, 9], [-85, 10], [-55, 9], [-25, 6], [-100, 4], [-70, 5]].forEach(([a0, sl], i) => {
      const a = droopAngle(a0 + s.sway * 2, s.droop);
      const [ex, ey] = stemTo(b, CX, s.soilY, a, sl, t('#5a8a40'));
      b.leaf(ex, ey, a, 7, 6.5, SH.heart, fill(i));
    });
    // свисающие плети
    const vine = t('#5a8a40');
    const dl = s.sway;
    [[-1, 18], [1, 14]].forEach(([side, len], k) => {
      const x0 = CX + side * 6;
      b.curve(x0, s.soilY, x0 + side * 5, s.soilY + 4, x0 + side * 4 + dl, s.soilY + len, vine);
      for (let i = 4; i <= len; i += 5) {
        b.leaf(x0 + side * 4 + dl * (i / len), s.soilY + i, side > 0 ? 40 : 140, 5, 4.5, SH.heart, fill(10 + i + k));
      }
    });
  }

  function drawHoya(b, s, t) {
    const pal = { base: t('#4c7a49'), light: t('#79a26c'), dark: t('#355a34'), speck: t('#c8d8c0') };
    const fill = (u, vn, x, y) => (Utils.hash(x, y, 3) > 0.86 ? pal.speck : vn < -0.3 ? pal.light : vn > 0.4 ? pal.dark : pal.base);
    [[-150, 5], [-120, 7], [-90, 8], [-60, 7], [-30, 5]].forEach(([a0, sl]) => {
      const a = droopAngle(a0 + s.sway * 2, s.droop);
      const [ex, ey] = stemTo(b, CX, s.soilY, a, sl, t('#7a6a4a'));
      b.leaf(ex, ey, a, 6, 4.5, SH.oval, fill);
    });
    const vine = t('#7a6a4a');
    [[-1, 20], [1, 16]].forEach(([side, len]) => {
      const x0 = CX + side * 5;
      b.curve(x0, s.soilY, x0 + side * 6, s.soilY + 3, x0 + side * 5 + s.sway, s.soilY + len, vine);
      for (let i = 4; i <= len; i += 4) b.leaf(x0 + side * 5 + s.sway * (i / len), s.soilY + i, side > 0 ? 20 : 160, 4.5, 3.6, SH.oval, fill);
    });
    if (s.state === 'DEAD') return;
    // зонтик цветков-звёздочек
    const fx = CX + 4 + s.sway, fy = s.soilY - 12;
    for (const [dx, dy] of [[0, 0], [-2, 1], [2, 1], [-1, -2], [1, -2], [0, 2], [-3, -1], [3, -1]]) {
      b.px(fx + dx, fy + dy, '#f6d2da');
    }
    b.px(fx, fy, '#b8384c'); b.px(fx - 2, fy + 1, '#b8384c'); b.px(fx + 2, fy + 1, '#b8384c'); b.px(fx, fy - 2, '#b8384c');
  }

  function drawCactus(b, s, t) {
    const body = t('#5f8f4f'), dark = t('#43703a'), light = t('#82b06a');
    const top = s.soilY - 20 + s.droop * 2;
    const sw = s.sway > 0 ? 0 : 0;
    b.rect(CX - 3 + sw, top, 7, s.soilY - top + 1, body);
    b.rect(CX - 2 + sw, top - 1, 5, 1, body);
    b.rect(CX - 1, top, 1, s.soilY - top, dark);
    b.rect(CX + 2, top, 1, s.soilY - top, dark);
    b.rect(CX - 3, top + 1, 1, s.soilY - top - 1, light);
    // рука
    b.rect(CX + 4, top + 9, 3, 3, body);
    b.rect(CX + 6, top + 4, 3, 7, body);
    b.rect(CX + 7, top + 4, 1, 6, dark);
    b.rect(CX - 7, top + 12, 4, 2, body);
    b.rect(CX - 7, top + 8, 2, 5, body);
    b.rect(CX - 7, top + 8, 1, 4, light);
    // колючки
    for (let y = top + 1; y < s.soilY - 1; y += 3) { b.px(CX - 4, y, '#f4eccc'); b.px(CX + 4, y + 1, '#f4eccc'); b.px(CX, y + 2, '#e8dcb0'); }
    b.px(CX + 9, top + 6, '#f4eccc'); b.px(CX - 8, top + 10, '#f4eccc');
    if (s.state !== 'DEAD') {
      b.disc(CX, top - 2, 1.6, '#ef8fa8');
      b.px(CX, top - 2, '#f8e070');
    }
  }

  const DRAW = {
    monstera_deliciosa: (b, s, t) => drawMonstera(b, s, t, 'deliciosa'),
    monstera_adansonii: drawAdansonii,
    monstera_thai: (b, s, t) => drawMonstera(b, s, t, 'thai'),
    monstera_albo: (b, s, t) => drawMonstera(b, s, t, 'albo'),
    alocasia_polly: (b, s, t) => drawAlocasia(b, s, t, 'polly'),
    alocasia_frydek: (b, s, t) => drawAlocasia(b, s, t, 'frydek'),
    alocasia_black_velvet: (b, s, t) => drawAlocasia(b, s, t, 'velvet'),
    alocasia_dragon_scale: (b, s, t) => drawAlocasia(b, s, t, 'dragon'),
    alocasia_silver_dragon: (b, s, t) => drawAlocasia(b, s, t, 'silver'),
    ficus_elastica: drawFicusElastica,
    ficus_lyrata: drawFicusLyrata,
    zamioculcas: drawZZ,
    sansevieria: drawSansevieria,
    spathiphyllum: drawSpathiphyllum,
    calathea: drawCalathea,
    phalaenopsis: drawPhalaenopsis,
    anthurium: drawAnthurium,
    epipremnum: drawEpipremnum,
    hoya: drawHoya,
    cactus: drawCactus,
  };

  /**
   * Возвращает canvas 44x58; точка опоры — низ горшка в (22, 56).
   * opts: { state, pot, sway (-1|0|1), size }
   */
  function get(id, size, opts = {}) {
    const state = opts.state || 'HEALTHY';
    const pot = opts.pot || 'terracotta';
    const sway = opts.sway || 0;
    const key = `${id}|${state}|${pot}|${sway}|${size}`;
    let c = cache.get(key);
    if (c) return c;
    const b = new PixelBuffer(W, H);
    const potInfo = drawPot(b, size, pot);
    const leafBuf = new PixelBuffer(W, H);
    const s = {
      soilY: potInfo.soilY, sway, state,
      droop: state === 'DRY' ? 1 : state === 'DEAD' ? 1.6 : 0,
    };
    DRAW[id](leafBuf, s, makeTint(state));
    leafBuf.outline(null, 0.5);
    // растение рисуется поверх горшка, но горшок перекрывает основание стеблей
    const back = new PixelBuffer(W, H);
    back.ctx.drawImage(b.canvas, 0, 0);
    back.ctx.drawImage(leafBuf.canvas, 0, 0);
    cache.set(key, back.canvas);
    return back.canvas;
  }

  /** пустой горшок с землёй (товар закончился) */
  function empty(size, pot) {
    const key = `empty|${size}|${pot}`;
    let c = cache.get(key);
    if (c) return c;
    const b = new PixelBuffer(W, H);
    const p = drawPot(b, size, pot);
    b.rect(p.x0 + 1, p.soilY - 1, p.w - 2, 2, '#5a3f2c');
    b.px(CX, p.soilY - 2, '#6a8a4a');
    b.px(CX + 1, p.soilY - 3, '#7aa85a');
    cache.set(key, b.canvas);
    return b.canvas;
  }

  /** превью для интерфейса: плотно обрезанный спрайт */
  function preview(id, size) {
    return get(id, size, { pot: 'terracotta' });
  }

  return { get, empty, preview, W, H, CX, BASE, POTS };
})();
