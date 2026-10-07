'use strict';

/**
 * Pixel-art интерьера: стены, пол, окна, мебель. Статичные части
 * пререндерятся в offscreen-холсты и пересобираются только при смене уровня.
 */
const ShopArt = (() => {
  const C = {
    wall: '#f1e5d0', wallDot1: '#c9d8bf', wallDot2: '#ead0cc', wallLine: '#e6d8bf',
    crown: '#d9c6a8', crownSh: '#c2ab88',
    wains: '#a9bfa0', wainsL: '#b9cdb0', wainsD: '#93aa8a', rail: '#f4ebd9', base: '#8a6a4c',
    cap: '#5c4033', capL: '#7a5844',
    floor: ['#cfa67c', '#c79e74', '#d4ad84'], seam: '#a8805a', plankEnd: '#b48c64', knot: '#a07a52',
    wood: '#b9875a', woodL: '#d4a679', woodD: '#8f6440', woodDD: '#6e4a30',
    cream: '#f6efe2', creamD: '#dccfb8',
    pink: '#e7a8b2', pinkD: '#c9808e', pinkL: '#f4c7cd',
    gold: '#d8b25a', goldL: '#f0d68a', goldD: '#a8843a',
    sage: '#9fb79a', sageD: '#7f9a7a',
  };

  // ---------- фон ----------
  function background(level) {
    const b = new PixelBuffer(480, 270);

    // обои
    b.rect(0, 0, 480, 52, C.wall);
    for (let y = 8; y < 48; y += 10) {
      for (let x = (y / 10) % 2 ? 4 : 10; x < 480; x += 12) {
        b.px(x, y, C.wallDot1);
        b.px(x, y - 1, Utils.shade(C.wallDot1, 0.92));
        b.px(x + 6, y + 5, C.wallDot2);
      }
    }
    // карниз
    b.rect(0, 0, 480, 3, C.crown);
    b.rect(0, 3, 480, 1, C.crownSh);
    // панели
    b.rect(0, 50, 480, 30, C.wains);
    for (let x = 4; x < 480; x += 10) {
      b.rect(x, 54, 1, 22, C.wainsD);
      b.rect(x + 1, 54, 1, 22, C.wainsL);
    }
    b.rect(0, 48, 480, 3, C.rail);
    b.rect(0, 51, 480, 1, '#d6cbb4');
    b.rect(0, 76, 480, 4, C.base);
    b.rect(0, 76, 480, 1, Utils.shade(C.base, 1.15));

    // пол — доски
    const rnd = Utils.seeded(7);
    for (let r = 0; r * 7 + 80 < 262; r++) {
      const y0 = 80 + r * 7;
      let x = -Math.floor(rnd() * 40);
      while (x < 480) {
        const len = 38 + Math.floor(rnd() * 34);
        const tone = C.floor[Math.floor(rnd() * 3)];
        b.rect(x, y0, len, 6, tone);
        b.rect(x, y0, len, 1, Utils.shade(tone, 1.05));
        b.rect(x + len - 1, y0, 1, 6, C.plankEnd);
        if (rnd() < 0.18) {
          const kx = x + 6 + Math.floor(rnd() * (len - 12));
          b.px(kx, y0 + 3, C.knot);
          b.px(kx + 1, y0 + 3, Utils.shade(C.knot, 1.1));
        }
        if (rnd() < 0.4) b.rect(x + 4, y0 + 2 + Math.floor(rnd() * 3), Math.floor(len / 3), 1, Utils.shade(tone, 0.95));
        x += len;
      }
      b.rect(0, y0 + 6, 480, 1, C.seam);
    }
    // мягкая тень у стены
    b.ctx.fillStyle = 'rgba(90,60,40,0.18)';
    b.ctx.fillRect(0, 80, 480, 3);
    b.ctx.fillStyle = 'rgba(90,60,40,0.08)';
    b.ctx.fillRect(0, 83, 480, 4);

    // ковёр
    drawRug(b, level);
    // коврик у входа
    b.rect(404, 82, 36, 9, '#b07a5a');
    b.rect(406, 83, 32, 7, '#c99470');
    for (let x = 408; x < 436; x += 4) b.rect(x, 85, 2, 3, '#e0b088');

    // окно
    drawWindow(b);
    // склад
    drawStorageDoor(b);
    // входная дверь — рама (проём рисуется динамически)
    b.rect(398, 16, 48, 64, C.woodD);
    b.rect(400, 18, 44, 62, C.wood);
    b.rect(400, 18, 44, 2, C.woodL);
    b.clear(404, 22, 36, 58);
    // колокольчик над дверью
    b.rect(421, 10, 2, 6, C.goldD);
    b.disc(422, 15, 2, C.gold);
    b.px(421, 14, C.goldL);
    // табличка «Машулик» над дверью — маленький листик
    b.rect(406, 4, 32, 9, C.cream);
    b.rect(406, 12, 32, 1, C.creamD);
    for (let i = 0; i < 6; i++) b.rect(410 + i * 4, 7, 2, 3, i % 2 ? C.pinkD : '#5f8f5c');

    // постер с листом монстеры
    drawPoster(b, 176, 16, 22, 30, 'monstera');
    // доска-меню
    b.rect(300, 16, 36, 30, C.woodD);
    b.rect(302, 18, 32, 26, '#3f5a48');
    const chalk = '#e8efe4';
    b.rect(305, 21, 14, 1, chalk); b.rect(305, 25, 20, 1, '#cfdccb'); b.rect(305, 29, 11, 1, '#cfdccb'); b.rect(305, 33, 18, 1, '#cfdccb');
    b.rect(323, 29, 6, 1, '#f2c2c8'); b.rect(323, 33, 6, 1, '#f2c2c8');
    b.px(328, 21, '#9fd09a'); b.px(329, 20, '#9fd09a'); b.px(330, 21, '#9fd09a'); b.px(329, 22, '#9fd09a');
    b.rect(305, 38, 26, 1, '#cfdccb');
    // настенная полка с мелочами
    b.rect(230, 40, 62, 3, C.woodL);
    b.rect(230, 43, 62, 1, C.woodD);
    b.rect(234, 44, 2, 3, C.woodD); b.rect(286, 44, 2, 3, C.woodD);
    // книги
    [['#c8707a', 6], ['#7f9a7a', 7], ['#e8d4a0', 5], ['#8a7ab0', 6]].forEach(([c, h], i) => {
      b.rect(236 + i * 3, 40 - h, 3, h, c);
      b.px(236 + i * 3, 40 - h, Utils.shade(c, 1.2));
    });
    // мини-горшочки
    miniPot(b, 256, 40, C.pink, '#5f8f5c');
    miniPot(b, 266, 40, C.cream, '#7aa874');
    miniPot(b, 277, 40, '#c26a4a', '#4f8a44');
    // часы — циферблат (стрелки динамические)
    b.disc(214, 24, 8, C.woodD);
    b.disc(214, 24, 7, C.cream);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b.px(214 + Math.round(Math.cos(a) * 5.5), 24 + Math.round(Math.sin(a) * 5.5), i % 3 === 0 ? '#6a4a3a' : '#c8b8a0');
    }

    hangingPlanter(b, 62, 34);
    // уровень 6: новые постеры, подвесные кашпо
    if (level >= 6) {
      drawPoster(b, 348, 18, 22, 28, 'alocasia');
      b.rect(374, 22, 16, 14, C.woodD);
      b.rect(375, 23, 14, 12, '#f4e8e0');
      b.rect(377, 27, 10, 6, '#c8dcc0');
      b.disc(382, 27, 2, '#f0c0c8');
      hangingPlanter(b, 456, 30);
    } else {
      b.rect(352, 24, 14, 16, C.woodD);
      b.rect(353, 25, 12, 14, '#efe6dc');
      b.rect(355, 30, 8, 7, '#bcd3b4');
    }
    // уровень 10: бра
    if (level >= 10) {
      [226, 296].forEach((x) => {
        b.rect(x - 1, 22, 3, 6, C.goldD);
        b.rect(x - 4, 16, 9, 6, '#f6e2b0');
        b.rect(x - 4, 16, 9, 1, C.gold);
        b.rect(x - 3, 21, 7, 1, C.goldD);
      });
    }
    // уровень 15: золотая табличка
    if (level >= 15) {
      b.rect(348, 54, 46, 16, C.goldD);
      b.rect(349, 55, 44, 14, C.gold);
      b.rect(350, 56, 42, 1, C.goldL);
      b.rect(352, 59, 12, 1, C.goldD); b.rect(352, 62, 22, 1, C.goldD); b.rect(352, 65, 16, 1, C.goldD);
      b.disc(384, 62, 3, C.goldL);
      b.px(384, 62, '#fff6d0');
    }

    // боковые «срезы» стен и нижняя кромка — эффект диорамы
    b.rect(0, 0, 10, 270, C.cap);
    b.rect(10, 0, 2, 270, C.capL);
    b.rect(470, 0, 10, 270, C.cap);
    b.rect(468, 0, 2, 270, C.capL);
    b.rect(0, 262, 480, 8, C.cap);
    b.rect(0, 261, 480, 1, C.capL);
    return b.canvas;
  }

  function miniPot(b, x, y, pot, leaf) {
    b.rect(x - 3, y - 4, 6, 4, pot);
    b.rect(x - 3, y - 4, 6, 1, Utils.shade(pot, 1.1));
    b.px(x - 1, y - 6, leaf); b.px(x, y - 7, leaf); b.px(x + 1, y - 6, leaf); b.px(x, y - 5, leaf);
    b.px(x - 2, y - 5, Utils.shade(leaf, 0.8)); b.px(x + 2, y - 5, Utils.shade(leaf, 0.8));
  }

  function hangingPlanter(b, x, y) {
    b.line(x, 4, x - 4, y - 6, '#e8dcc0');
    b.line(x, 4, x + 4, y - 6, '#e8dcc0');
    b.rect(x - 5, y - 6, 10, 6, '#efe2cc');
    b.rect(x - 5, y - 6, 10, 1, '#fbf4e6');
    for (let i = -6; i <= 6; i += 3) {
      const len = 5 + ((i + 9) % 4) * 2;
      for (let k = 0; k < len; k++) b.px(x + i + (k % 3 === 0 ? 1 : 0), y - 4 + k, k % 2 ? '#5f8f5c' : '#79a874');
    }
  }

  function drawPoster(b, x, y, w, h, kind) {
    b.rect(x, y, w, h, C.woodD);
    b.rect(x + 1, y + 1, w - 2, h - 2, '#f8f1e4');
    const cx = x + w / 2, cy = y + h / 2 + 1;
    if (kind === 'monstera') {
      b.leaf(cx - 1, cy + 9, -95, 15, 14, (u) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.12))), 0.55),
        (u, vn) => {
          const e = Math.abs(vn);
          if (u > 0.14 && e > 0.5 && ((u * 6 + (vn > 0 ? 0.5 : 0)) % 1) < 0.2) return null;
          return e < 0.1 ? '#8fbf78' : vn > 0.3 ? '#3f7a3c' : '#5d9c4f';
        });
      b.rect(cx - 1, cy + 9, 1, 3, '#5d7a4a');
    } else {
      b.leaf(cx, cy + 8, -90, 15, 11, (u) => (u >= 0 ? Math.pow(1 - u, 0.8) : 0.95 * (1 + u / 0.3)),
        (u, vn, px, py, vr) => {
          if (u < 0 && Math.abs(vr) < (-u / 0.3) * 0.95) return null;
          const e = Math.abs(vn);
          const lat = ((u * 5 - e * 0.9) % 1 + 1) % 1;
          return e < 0.1 || (lat < 0.12 && e < 0.85) ? '#e3ecd8' : '#2f5638';
        }, -0.3);
    }
    b.rect(x + 3, y + h - 4, w - 6, 1, '#c8b8a0');
  }

  function drawRug(b, level) {
    const cx = 222, cy = 232;
    const rx = level >= 6 ? 66 : 54, ry = level >= 6 ? 20 : 16;
    const c1 = level >= 6 ? '#d99aa4' : '#d8a5a0';
    b.ellipse(cx, cy, rx, ry, Utils.shade(c1, 0.85));
    b.ellipse(cx, cy, rx - 2, ry - 2, c1);
    b.ellipse(cx, cy, rx - 7, ry - 5, '#f3e4d4');
    b.ellipse(cx, cy, rx - 10, ry - 7, level >= 6 ? '#e8b8be' : '#e9c6bc');
    b.ellipse(cx, cy, rx - 20, ry - 10, '#f3e4d4');
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      b.px(cx + Math.cos(a) * (rx - 5), cy + Math.sin(a) * (ry - 3.5), level >= 6 ? '#7f9a7a' : C.pinkD);
    }
    if (level >= 6) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const x = cx + Math.cos(a) * (rx - 28), y = cy + Math.sin(a) * (ry - 12);
        b.px(x, y, '#7f9a7a'); b.px(x + 1, y, '#9fb79a');
      }
    }
  }

  function drawWindow(b) {
    // шторы
    b.rect(66, 8, 106, 2, C.woodD);
    b.disc(66, 9, 2, C.gold);
    b.disc(172, 9, 2, C.gold);
    // рама
    b.rect(72, 12, 92, 52, C.cream);
    b.rect(72, 12, 92, 1, '#ffffff');
    b.rect(72, 63, 92, 1, C.creamD);
    b.clear(76, 16, 84, 46);
    b.rect(117, 16, 2, 46, C.cream);
    b.rect(76, 38, 84, 2, C.cream);
    // подоконник
    b.rect(68, 62, 100, 5, '#fbf6ec');
    b.rect(68, 62, 100, 1, '#ffffff');
    b.rect(68, 67, 100, 2, C.creamD);
    b.ctx.fillStyle = 'rgba(90,60,40,0.18)';
    b.ctx.fillRect(70, 69, 96, 2);
    // шторы с подхватами
    for (const [x, dir] of [[64, 1], [164, -1]]) {
      for (let y = 10; y < 60; y++) {
        const t = (y - 10) / 50;
        const w = y < 36 ? 8 - Math.floor(t * 6) : 3 + Math.floor((y - 36) / 6);
        const x0 = dir > 0 ? x : x + 8 - w;
        b.rect(x0, y, w, 1, C.pink);
        b.px(dir > 0 ? x0 : x0 + w - 1, y, C.pinkD);
        if (y % 5 === 0) b.px(x0 + Math.floor(w / 2), y, C.pinkL);
      }
      b.rect(dir > 0 ? x : x + 4, 35, 4, 2, C.gold);
    }
  }

  function drawStorageDoor(b) {
    b.rect(22, 24, 36, 56, C.woodDD);
    b.rect(24, 26, 32, 54, '#9a6e4a');
    b.rect(24, 26, 32, 1, '#b8885e');
    b.rect(27, 30, 26, 18, '#8a6040');
    b.rect(28, 31, 24, 16, '#a27652');
    b.rect(27, 52, 26, 24, '#8a6040');
    b.rect(28, 53, 24, 22, '#a27652');
    b.disc(51, 56, 1.5, C.gold);
    // табличка «склад» — коробочка
    b.rect(32, 35, 16, 9, C.cream);
    b.rect(36, 37, 8, 5, '#c99a62');
    b.rect(39, 37, 2, 5, '#e8d4a0');
  }

  // ---------- вид за окном ----------
  function outside(ctx, x, y, w, h, tod) {
    // tod: 0 утро, 1 день, 2 вечер, 3 ночь/главное меню
    const skies = [
      ['#cfe6ef', '#f6e6cf'], ['#a9d4ea', '#dcefe8'], ['#f0a878', '#7a6aa0'], ['#2c2a4a', '#5a4a6a'],
    ];
    const [top, bot] = skies[tod] || skies[1];
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, tod === 2 ? bot : top);
    g.addColorStop(1, tod === 2 ? top : bot);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // дома напротив
    const bc = tod >= 2 ? '#5a4a5a' : '#c8b8b0';
    const bc2 = tod >= 2 ? '#4a3c4c' : '#b8a8a0';
    ctx.fillStyle = bc2;
    ctx.fillRect(x, y + h - 22, w, 22);
    ctx.fillStyle = bc;
    for (let i = 0; i < w; i += 22) {
      const hh = 16 + ((i * 7) % 11);
      ctx.fillRect(x + i, y + h - hh, 18, hh);
      ctx.fillStyle = tod >= 2 ? '#f2c46a' : '#e6eef0';
      for (let k = 0; k < 2; k++) ctx.fillRect(x + i + 4 + k * 7, y + h - hh + 4, 3, 3);
      ctx.fillStyle = bc;
    }
    // дерево
    ctx.fillStyle = tod >= 2 ? '#3a4a3a' : '#7fa86a';
    ctx.fillRect(x + w - 26, y + h - 30, 18, 14);
    ctx.fillRect(x + w - 30, y + h - 24, 26, 8);
    ctx.fillStyle = tod >= 2 ? '#2e3a2e' : '#6a9258';
    ctx.fillRect(x + w - 22, y + h - 26, 8, 6);
    ctx.fillStyle = '#6a4a3a';
    ctx.fillRect(x + w - 18, y + h - 16, 3, 16);
  }

  // ---------- мебель ----------
  function shelf(w, tier) {
    const key = `shelf|${w}|${tier}`;
    if (spriteCache.has(key)) return spriteCache.get(key);
    const H = 28;
    const b = new PixelBuffer(w, H);
    const pal = tier >= 3
      ? { top: '#8a5a3c', topL: '#a8734e', face: '#6e4630', leg: '#583826', trim: C.gold, back: '#4a3022' }
      : tier === 2
        ? { top: '#e8dcc6', topL: '#f6efe2', face: '#a9bfa0', leg: '#8aa282', trim: '#f6efe2', back: '#7f9a7a' }
        : { top: C.woodL, topL: '#e2b88c', face: C.wood, leg: C.woodD, trim: C.woodD, back: '#7a5238' };
    // верхняя поверхность
    b.rect(0, 0, w, 10, pal.top);
    b.rect(0, 0, w, 1, pal.topL);
    for (let x = 12; x < w; x += 18) b.rect(x, 1, 1, 9, Utils.shade(pal.top, 0.93));
    b.rect(0, 10, w, 2, pal.trim);
    // ножки и задник
    b.rect(2, 12, w - 4, 12, pal.back);
    b.rect(0, 12, 3, 14, pal.leg);
    b.rect(w - 3, 12, 3, 14, pal.leg);
    b.rect(Math.floor(w / 2) - 1, 12, 2, 12, pal.leg);
    // нижняя полка с мелочами
    b.rect(2, 20, w - 4, 2, pal.top);
    b.rect(2, 22, w - 4, 1, Utils.shade(pal.top, 0.8));
    const rnd = Utils.seeded(w * 13 + tier);
    for (let x = 6; x < w - 8; x += 7 + Math.floor(rnd() * 5)) {
      const kind = Math.floor(rnd() * 4);
      if (kind === 0) { b.rect(x, 16, 5, 4, '#c26a4a'); b.rect(x, 16, 5, 1, '#dc8a66'); }
      else if (kind === 1) { b.rect(x, 15, 4, 5, '#8a6a4a'); b.rect(x, 15, 4, 1, '#a8885a'); b.px(x + 1, 17, '#e8d4a0'); }
      else if (kind === 2) { b.rect(x, 17, 6, 3, '#efe2cc'); b.rect(x + 1, 16, 4, 1, '#efe2cc'); }
      else { b.rect(x, 14, 2, 6, '#7fb3b0'); b.rect(x + 2, 16, 2, 4, '#e8a5ae'); }
    }
    b.rect(0, 24, w, 2, pal.leg);
    b.ctx.fillStyle = 'rgba(70,40,30,0.25)';
    b.ctx.fillRect(1, 26, w - 2, 2);
    spriteCache.set(key, b.canvas);
    return b.canvas;
  }

  function counter(tier) {
    const key = 'counter|' + tier;
    if (spriteCache.has(key)) return spriteCache.get(key);
    const w = 72, H = 50;
    const b = new PixelBuffer(w, H);
    const topY = 16;
    const top = tier >= 3 ? '#f2ede6' : tier === 2 ? '#e8dcc6' : C.woodL;
    const face = tier >= 3 ? '#3f6a52' : tier === 2 ? '#a9bfa0' : C.wood;
    const frame = tier >= 3 ? C.gold : tier === 2 ? '#f6efe2' : C.woodD;
    // столешница
    b.rect(0, topY, w, 10, top);
    b.rect(0, topY, w, 1, '#ffffff');
    if (tier >= 3) { b.px(10, topY + 4, '#d8d0c4'); b.px(11, topY + 5, '#d8d0c4'); b.px(40, topY + 3, '#d8d0c4'); }
    b.rect(0, topY + 10, w, 2, frame);
    // фасад с филёнками
    b.rect(0, topY + 12, w, 20, face);
    for (let x = 4; x < w - 4; x += 17) {
      b.rect(x, topY + 15, 13, 14, Utils.shade(face, 0.9));
      b.rect(x, topY + 15, 13, 1, Utils.shade(face, 0.75));
      b.rect(x, topY + 28, 13, 1, Utils.shade(face, 1.12));
    }
    b.rect(0, topY + 32, w, 2, Utils.shade(face, 0.7));
    b.ctx.fillStyle = 'rgba(70,40,30,0.25)';
    b.ctx.fillRect(1, topY + 34, w - 2, 2);
    // касса (ретро)
    b.rect(44, 6, 18, 12, '#efe6d6');
    b.rect(44, 6, 18, 1, '#ffffff');
    b.rect(46, 8, 10, 4, '#6a9a7a');
    b.rect(47, 9, 6, 1, '#c8f0c8');
    b.rect(57, 8, 3, 3, C.pink);
    for (let i = 0; i < 4; i++) b.rect(46 + i * 4, 13, 3, 2, '#c8b8a0');
    b.rect(43, 17, 20, 2, '#d8ccb8');
    // терминал
    b.rect(34, 11, 6, 7, '#3a3a44');
    b.rect(35, 12, 4, 2, '#8ac8e0');
    // бумажные пакеты и суккулент
    b.rect(4, 6, 10, 11, '#d8b88a');
    b.rect(4, 6, 10, 2, '#c8a87a');
    b.rect(8, 9, 2, 2, '#5f8f5c');
    b.rect(18, 12, 6, 5, C.pink);
    b.rect(18, 12, 6, 1, C.pinkL);
    b.px(19, 10, '#79a874'); b.px(21, 9, '#5f8f5c'); b.px(22, 10, '#79a874'); b.px(20, 11, '#5f8f5c'); b.px(21, 11, '#79a874');
    if (tier >= 2) {
      // маленькая вывеска «касса» — сердечко
      b.rect(26, 2, 6, 14, '#f6efe2');
      b.px(28, 7, '#e86a8a'); b.px(29, 7, '#e86a8a'); b.rect(27, 8, 4, 1, '#e86a8a'); b.rect(28, 9, 2, 1, '#e86a8a');
    }
    b.outline('#4a3020');
    spriteCache.set(key, b.canvas);
    return b.canvas;
  }

  function desk() {
    const key = 'desk';
    if (spriteCache.has(key)) return spriteCache.get(key);
    const w = 58, H = 42;
    const b = new PixelBuffer(w, H);
    const topY = 18;
    b.rect(0, topY, w, 8, C.woodL);
    b.rect(0, topY, w, 1, '#e8c49a');
    b.rect(0, topY + 8, w, 2, C.woodD);
    b.rect(1, topY + 10, 4, 12, C.woodD);
    b.rect(w - 5, topY + 10, 4, 12, C.woodD);
    b.rect(5, topY + 10, w - 10, 6, C.wood);
    b.rect(20, topY + 12, 18, 2, C.woodD);
    // монитор (кремовый ретро)
    b.rect(14, 0, 26, 18, '#efe6d6');
    b.rect(14, 0, 26, 1, '#ffffff');
    b.rect(16, 2, 22, 13, '#3a5a4a');
    b.rect(25, 18, 4, 2, '#d8ccb8');
    // клавиатура и кружка
    b.rect(16, topY + 3, 20, 3, '#f6efe2');
    b.rect(17, topY + 4, 18, 1, '#d8ccb8');
    b.rect(42, topY - 1, 5, 5, C.pink);
    b.rect(47, topY, 1, 2, C.pink);
    b.rect(43, topY - 1, 3, 1, '#7a4a2a');
    // блокнот
    b.rect(4, topY + 2, 8, 5, '#f8f1e4');
    b.rect(4, topY + 2, 8, 1, '#9fb79a');
    b.ctx.fillStyle = 'rgba(70,40,30,0.25)';
    b.ctx.fillRect(1, topY + 22, w - 2, 2);
    b.outline('#4a3020');
    spriteCache.set(key, b.canvas);
    return b.canvas;
  }

  function pottingTable() {
    const key = 'potting';
    if (spriteCache.has(key)) return spriteCache.get(key);
    const w = 46, H = 34;
    const b = new PixelBuffer(w, H);
    const topY = 12;
    b.rect(0, topY, w, 7, '#a88a6a');
    b.rect(0, topY, w, 1, '#c4a684');
    b.rect(0, topY + 7, w, 2, C.woodD);
    b.rect(1, topY + 9, 3, 11, C.woodD);
    b.rect(w - 4, topY + 9, 3, 11, C.woodD);
    // мешки с грунтом под столом
    b.rect(6, topY + 11, 12, 9, '#8a6a4a');
    b.rect(6, topY + 11, 12, 2, '#a8885a');
    b.rect(9, topY + 14, 6, 3, '#e8d4a0');
    b.rect(20, topY + 13, 10, 7, '#6a7a4a');
    b.rect(20, topY + 13, 10, 1, '#8a9a6a');
    // стопка горшков, бутылочки удобрений, совок
    for (let i = 0; i < 3; i++) { b.rect(4, topY - 4 - i * 2, 9, 3, '#c26a4a'); b.rect(4, topY - 4 - i * 2, 9, 1, '#dc8a66'); }
    b.rect(18, topY - 7, 4, 8, '#7fb36a'); b.rect(19, topY - 9, 2, 2, '#f6efe2');
    b.rect(24, topY - 6, 4, 7, C.pink); b.rect(25, topY - 8, 2, 2, '#f6efe2');
    b.rect(31, topY - 2, 10, 3, '#5a3f2c');
    b.rect(33, topY - 3, 6, 1, '#6a4a34');
    b.rect(38, topY + 2, 6, 1, '#9aa8b0');
    b.rect(36, topY + 2, 2, 1, '#8a5a3a');
    b.ctx.fillStyle = 'rgba(70,40,30,0.25)';
    b.ctx.fillRect(1, topY + 20, w - 2, 2);
    b.outline('#4a3020');
    spriteCache.set(key, b.canvas);
    return b.canvas;
  }

  function stand(kind) {
    const key = 'stand|' + kind;
    if (spriteCache.has(key)) return spriteCache.get(key);
    const b = new PixelBuffer(18, 12);
    if (kind === 'marble') {
      b.rect(2, 0, 14, 3, '#f4f0ea');
      b.rect(2, 2, 14, 1, C.gold);
      b.rect(4, 3, 10, 7, '#e8e2d8');
      b.px(6, 5, '#c8c0b4'); b.px(7, 6, '#c8c0b4'); b.px(11, 4, '#c8c0b4');
      b.rect(3, 10, 12, 2, C.gold);
    } else if (kind === 'gold') {
      b.rect(3, 2, 12, 2, C.gold);
      b.rect(3, 2, 12, 1, C.goldL);
      b.rect(4, 4, 1, 7, C.goldD); b.rect(13, 4, 1, 7, C.goldD);
      b.rect(5, 8, 8, 1, C.goldD);
    } else {
      b.rect(3, 4, 12, 2, C.woodL);
      b.rect(3, 6, 12, 1, C.woodD);
      b.rect(4, 7, 2, 4, C.woodD); b.rect(12, 7, 2, 4, C.woodD);
    }
    b.outline('#4a3020');
    spriteCache.set(key, b.canvas);
    return b.canvas;
  }

  function rareCabinet() {
    const key = 'rare';
    if (spriteCache.has(key)) return spriteCache.get(key);
    const w = 74, H = 28;
    const b = new PixelBuffer(w, H);
    b.rect(0, 0, w, 10, '#f2ede6');
    b.rect(0, 0, w, 1, '#ffffff');
    for (let x = 6; x < w; x += 14) { b.px(x, 4, '#d8d0c4'); b.px(x + 1, 5, '#d8d0c4'); }
    b.rect(0, 10, w, 2, C.gold);
    b.rect(0, 12, w, 12, '#2f5a46');
    for (let x = 4; x < w - 4; x += 18) {
      b.rect(x, 14, 14, 8, '#3f6a52');
      b.rect(x, 14, 14, 1, C.goldD);
      b.disc(x + 7, 18, 1.5, C.gold);
    }
    b.rect(0, 24, w, 2, C.goldD);
    b.ctx.fillStyle = 'rgba(70,40,30,0.25)';
    b.ctx.fillRect(1, 26, w - 2, 2);
    b.outline('#2a2a20');
    spriteCache.set(key, b.canvas);
    return b.canvas;
  }

  /** скамейка с подушкой — уголок для покупателей */
  function bench(tier) {
    const key = 'bench|' + tier;
    if (spriteCache.has(key)) return spriteCache.get(key);
    const w = 42, H = 24;
    const b = new PixelBuffer(w, H);
    const wood = tier >= 2 ? '#e8dcc6' : C.wood;
    const woodD = tier >= 2 ? '#bfae90' : C.woodD;
    b.rect(1, 2, w - 2, 7, woodD);
    b.rect(2, 3, w - 4, 5, wood);
    b.rect(1, 9, w - 2, 5, wood);
    b.rect(1, 9, w - 2, 1, Utils.shade(wood, 1.12));
    b.rect(1, 14, w - 2, 1, woodD);
    b.rect(3, 15, 3, 7, woodD);
    b.rect(w - 6, 15, 3, 7, woodD);
    // подушки
    b.rect(5, 6, 14, 5, C.pink);
    b.rect(5, 6, 14, 1, C.pinkL);
    b.px(12, 8, C.pinkD);
    b.rect(22, 6, 12, 5, tier >= 2 ? '#c8dcc0' : '#efe2cc');
    b.rect(22, 6, 12, 1, '#ffffff');
    // книжка и мини-горшок
    b.rect(35, 7, 5, 3, '#c26a4a');
    b.px(36, 5, '#7aa874'); b.px(37, 4, '#5f8f5c'); b.px(38, 5, '#7aa874'); b.px(37, 6, '#5f8f5c');
    b.ctx.fillStyle = 'rgba(70,40,30,0.22)';
    b.ctx.fillRect(2, 22, w - 4, 2);
    b.outline('#4a3020');
    spriteCache.set(key, b.canvas);
    return b.canvas;
  }

  function floorLamp() {
    const key = 'lamp';
    if (spriteCache.has(key)) return spriteCache.get(key);
    const b = new PixelBuffer(14, 46);
    b.rect(2, 0, 10, 2, '#f6e6c0');
    b.rect(1, 2, 12, 8, '#f3dcae');
    b.rect(1, 2, 12, 1, '#fff2d0');
    b.rect(1, 9, 12, 1, '#d8b88a');
    b.rect(3, 10, 8, 1, C.pinkD);
    b.rect(6, 11, 2, 31, C.goldD);
    b.rect(6, 11, 1, 31, C.gold);
    b.rect(3, 42, 8, 2, C.goldD);
    b.rect(4, 41, 6, 1, C.gold);
    b.outline('#4a3020');
    spriteCache.set(key, b.canvas);
    return b.canvas;
  }

  function crate() {
    const key = 'crate';
    if (spriteCache.has(key)) return spriteCache.get(key);
    const b = new PixelBuffer(24, 26);
    b.rect(1, 10, 22, 14, '#b98a55');
    b.rect(1, 10, 22, 2, '#d4a679');
    b.rect(1, 16, 22, 1, '#8f6440');
    b.rect(1, 21, 22, 1, '#8f6440');
    b.rect(1, 10, 2, 14, '#8f6440'); b.rect(21, 10, 2, 14, '#8f6440');
    // горшочки
    const pots = [[6, '#c26a4a', '#5f8f5c'], [12, '#efe2cc', '#7aa874'], [18, '#e6a3ad', '#4f8a44']];
    for (const [x, pot, leaf] of pots) {
      b.rect(x - 2, 7, 5, 4, pot);
      b.rect(x - 2, 7, 5, 1, Utils.shade(pot, 1.1));
      b.px(x, 3, leaf); b.px(x - 1, 4, leaf); b.px(x + 1, 4, leaf); b.px(x, 5, Utils.shade(leaf, 0.8));
      b.px(x - 2, 5, leaf); b.px(x + 2, 5, Utils.shade(leaf, 1.15)); b.px(x, 6, leaf);
    }
    b.ctx.fillStyle = 'rgba(70,40,30,0.22)';
    b.ctx.fillRect(1, 24, 22, 2);
    b.outline('#4a3020');
    spriteCache.set(key, b.canvas);
    return b.canvas;
  }

  const spriteCache = new Map();

  return { background, outside, shelf, counter, desk, pottingTable, stand, rareCabinet, bench, floorLamp, crate, C, spriteCache };
})();
