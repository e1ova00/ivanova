'use strict';

/**
 * Главное меню: вечерний фасад «Машулика» — светящаяся вывеска, тёплые окна,
 * Маша за стеклом, гирлянда, фонарь, светлячки и иногда — пиксельный кот.
 */
class MenuScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.t = 0;
    this.facade = null;
    this.sign = null;
    this.stars = Array.from({ length: 40 }, (_, i) => [Utils.hash(i, 1) * 480, Utils.hash(i, 2) * 70, Utils.hash(i, 3) * 6]);
    this.flies = Array.from({ length: 14 }, (_, i) => ({ x: Utils.hash(i, 9) * 480, y: 150 + Utils.hash(i, 8) * 90, p: Utils.hash(i, 7) * 6 }));
    this.cat = { x: -30, active: false, wait: 3 };
    this.mashaT = 0;
  }

  static GLYPHS = {
    'М': ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    'А': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    'Ш': ['10101', '10101', '10101', '10101', '10101', '10101', '11111'],
    'У': ['10001', '10001', '10001', '01111', '00001', '00001', '01110'],
    'Л': ['00111', '01001', '01001', '01001', '01001', '01001', '11001'],
    'И': ['10001', '10011', '10101', '11001', '10001', '10001', '10001'],
    'К': ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  };

  buildSign() {
    const text = 'МАШУЛИК';
    const sc = 3, gap = 3;
    const w = text.length * (5 * sc + gap) - gap + 8, h = 7 * sc + 8;
    const b = new PixelBuffer(w, h);
    [...text].forEach((ch, i) => {
      const g = MenuScene.GLYPHS[ch];
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 5; x++) {
          if (g[y][x] === '1') {
            b.rect(4 + i * (5 * sc + gap) + x * sc, 4 + y * sc, sc, sc, '#fff1cf');
            b.px(4 + i * (5 * sc + gap) + x * sc, 4 + y * sc, '#ffffff');
          }
        }
      }
    });
    b.outline('#e88aa0');
    b.outline('#a0485e');
    this.sign = b.canvas;
  }

  buildFacade() {
    const b = new PixelBuffer(480, 270);
    const C = ShopArt.C;
    // соседние дома
    b.rect(0, 60, 86, 175, '#6a5a6e');
    b.rect(394, 50, 86, 185, '#5e5268');
    for (let y = 72; y < 220; y += 30) {
      for (const x of [14, 50]) { b.rect(x, y, 18, 20, '#43394c'); b.rect(x + 1, y + 1, 16, 18, (x + y) % 3 ? '#2e2a3e' : '#f2c46a'); }
      for (const x of [408, 446]) { b.rect(x, y - 6, 18, 20, '#3e3448'); b.rect(x + 1, y - 5, 16, 18, (x * y) % 4 ? '#2e2a3e' : '#e8b85a'); }
    }
    // фасад
    b.rect(86, 34, 308, 200, '#e9dcc4');
    for (let y = 36; y < 110; y += 6) for (let x = 88 + ((y / 6) % 2) * 6; x < 392; x += 12) b.rect(x, y, 10, 1, '#ddcdb0');
    b.rect(82, 30, 316, 6, '#8a6a5a');
    b.rect(82, 30, 316, 1, '#a88a78');
    // окна второго этажа
    [116, 214, 312].forEach((x, i) => {
      b.rect(x, 44, 52, 30, '#f6efe2');
      const lit = i !== 0;
      b.rect(x + 3, 47, 46, 24, lit ? (i === 1 ? '#f6cf8a' : '#e8b07a') : '#2e2a40');
      if (lit) {
        b.rect(x + 3, 62, 46, 9, i === 1 ? '#eebc78' : '#d89c6a');
        // шторы
        b.rect(x + 3, 47, 7, 24, '#e7a8b2'); b.rect(x + 42, 47, 7, 24, '#e7a8b2');
        b.rect(x + 9, 47, 1, 24, '#c9808e'); b.rect(x + 42, 47, 1, 24, '#c9808e');
      }
      b.rect(x + 25, 47, 2, 24, '#f6efe2');
      b.rect(x - 2, 74, 56, 3, '#f6efe2');
      // цветок на подоконнике
      b.rect(x + 14, 69, 6, 5, '#c26a4a');
      b.px(x + 16, 66, '#5f8f5c'); b.px(x + 17, 65, '#7aa874'); b.px(x + 15, 67, '#7aa874'); b.px(x + 18, 67, '#5f8f5c'); b.px(x + 17, 68, '#5f8f5c');
    });
    // нижняя витрина — зелёное дерево
    b.rect(86, 104, 308, 130, '#466a52');
    b.rect(86, 104, 308, 2, '#5f8a6a');
    b.rect(86, 226, 308, 8, '#35503e');
    // вывеска
    b.rect(150, 82, 180, 30, '#3a5a46');
    b.rect(152, 84, 176, 26, '#2f4a3a');
    b.rect(150, 82, 180, 2, '#d8b25a');
    b.rect(150, 110, 180, 2, '#a8843a');
    // маркиза
    for (let x = 92; x < 388; x += 12) {
      b.rect(x, 114, 12, 12, (x / 12) % 2 < 1 ? '#e7a8b2' : '#f6efe2');
    }
    for (let x = 92; x < 388; x += 12) {
      b.rect(x, 126, 12, 2, (x / 12) % 2 < 1 ? '#c9808e' : '#ddd0bc');
      b.disc(x + 6, 128, 3, (x / 12) % 2 < 1 ? '#e7a8b2' : '#f6efe2');
    }
    // витрины (стекло — динамическое)
    b.clear(104, 140, 108, 76);
    b.clear(268, 140, 108, 76);
    for (const x of [100, 264]) {
      b.rect(x, 136, 116, 4, '#d8b25a');
      b.rect(x, 216, 116, 6, '#d8b25a');
      b.rect(x, 136, 4, 86, '#d8b25a');
      b.rect(x + 112, 136, 4, 86, '#d8b25a');
    }
    // дверь
    b.rect(222, 134, 36, 92, '#2f4a3a');
    b.clear(226, 138, 28, 88);
    // тротуар
    b.rect(0, 234, 480, 36, '#8a7a7a');
    for (let y = 236; y < 270; y += 8) for (let x = ((y - 236) / 8) % 2 ? 0 : 10; x < 480; x += 20) b.rect(x, y, 19, 7, '#9a8a88');
    b.rect(0, 234, 480, 2, '#6a5a5a');
    return b.canvas;
  }

  update(dt) {
    this.t += dt;
    const c = this.cat;
    if (!c.active) {
      c.wait -= dt;
      if (c.wait <= 0) { c.active = true; c.x = -24; }
    } else {
      c.x += dt * 22;
      if (c.x > 500) { c.active = false; c.wait = Utils.rand(8, 16); }
    }
  }

  render() {
    if (!this.facade) {
      this.facade = this.buildFacade();
      this.buildSign();
    }
    const ctx = this.ctx;
    const t = this.t;
    // небо
    const g = ctx.createLinearGradient(0, 0, 0, 240);
    g.addColorStop(0, '#2a2648');
    g.addColorStop(0.45, '#6a4f7a');
    g.addColorStop(0.8, '#e09a7a');
    g.addColorStop(1, '#f2c08a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 480, 270);
    for (const [x, y, p] of this.stars) {
      const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + p));
      ctx.fillStyle = `rgba(255, 246, 220, ${a})`;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    // луна
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath();
    ctx.arc(440, 22, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2648';
    ctx.beginPath();
    ctx.arc(445, 19, 8, 0, Math.PI * 2);
    ctx.fill();

    // интерьер за витринами
    this.drawInterior(ctx, 104, 140, 108, 76, 0);
    this.drawInterior(ctx, 268, 140, 108, 76, 1);
    // дверь со светом
    ctx.fillStyle = '#f6d8a0';
    ctx.fillRect(226, 138, 28, 88);
    ctx.fillStyle = '#e8b880';
    ctx.fillRect(226, 196, 28, 30);
    ctx.fillStyle = '#c8986a';
    ctx.fillRect(250, 178, 2, 6);

    ctx.drawImage(this.facade, 0, 0);

    // табличка «открыто»
    ctx.fillStyle = '#f6efe2';
    ctx.fillRect(231, 150, 18, 8);
    ctx.fillStyle = '#5f8f5c';
    ctx.fillRect(233, 153, 14, 2);

    // вывеска со свечением
    const flick = 0.85 + 0.15 * Math.sin(t * 2.1) * Math.sin(t * 5.3 + 1);
    const sx = 240 - Math.floor(this.sign.width / 2), sy = 85;
    ctx.save();
    ctx.shadowColor = `rgba(255, 190, 200, ${0.9 * flick})`;
    ctx.shadowBlur = 14;
    ctx.globalAlpha = 0.9 + 0.1 * flick;
    ctx.drawImage(this.sign, sx, sy);
    ctx.restore();
    // листики по краям вывески
    this.leafSprig(ctx, 160, 96, 1, t);
    this.leafSprig(ctx, 320, 96, -1, t);

    // гирлянда под карнизом
    for (let x = 90; x < 392; x += 3) {
      const u = ((x - 90) % 76) / 76;
      ctx.fillStyle = '#4a3a3a';
      ctx.fillRect(x, 37 + Math.round(Math.sin(u * Math.PI) * 5), 2, 1);
    }
    let n = 0;
    for (let x = 96; x < 390; x += 13) {
      const u = ((x - 90) % 76) / 76;
      const y = 38 + Math.round(Math.sin(u * Math.PI) * 5);
      const tw = 0.55 + 0.45 * Math.sin(t * 2.4 + n * 1.3);
      ctx.fillStyle = ['#f6d36b', '#f4a8b8', '#bfe3b0'][n % 3];
      ctx.fillRect(x, y, 2, 2);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 * tw;
      ctx.fillRect(x - 2, y - 2, 6, 6);
      ctx.restore();
      n++;
    }

    // горшки у входа
    const sway = Math.sin(t * 1.1) > 0.5 ? 1 : 0;
    ctx.drawImage(PlantArt.get('zamioculcas', 'm', { pot: 'terracotta', sway }), 208 - 22, 236 - 56);
    ctx.drawImage(PlantArt.get('alocasia_polly', 'm', { pot: 'cream', sway: -sway }), 272 - 22, 236 - 56);
    ctx.drawImage(PlantArt.get('sansevieria', 'm', { pot: 'pink' }), 94 - 22, 236 - 56);
    ctx.drawImage(PlantArt.get('alocasia_frydek', 'm', { pot: 'sage', sway }), 384 - 22, 236 - 56);

    // фонарь
    ctx.fillStyle = '#2a2430';
    ctx.fillRect(452, 120, 3, 114);
    ctx.fillRect(446, 112, 15, 3);
    ctx.fillStyle = '#ffe2a0';
    ctx.fillRect(447, 115, 13, 9);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(453, 120, 2, 453, 120, 70);
    lg.addColorStop(0, `rgba(255, 210, 140, ${0.35 * flick})`);
    lg.addColorStop(1, 'rgba(255, 210, 140, 0)');
    ctx.fillStyle = lg;
    ctx.fillRect(383, 50, 140, 140);
    // тёплый свет из витрин на тротуар
    ctx.fillStyle = 'rgba(255, 200, 120, 0.12)';
    ctx.beginPath();
    ctx.moveTo(100, 234); ctx.lineTo(380, 234); ctx.lineTo(420, 270); ctx.lineTo(60, 270); ctx.closePath();
    ctx.fill();
    ctx.restore();

    // кот
    if (this.cat.active) {
      const f = Math.floor(t * 8) % 4;
      ctx.drawImage(Sprites.cat(f), Math.round(this.cat.x), 244);
    }
    // светлячки
    for (const fl of this.flies) {
      const x = fl.x + Math.sin(t * 0.5 + fl.p) * 14;
      const y = fl.y + Math.sin(t * 0.8 + fl.p * 2) * 8;
      const a = 0.3 + 0.7 * Math.max(0, Math.sin(t * 1.5 + fl.p * 3));
      ctx.fillStyle = `rgba(250, 240, 160, ${a})`;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      if (a > 0.8) {
        ctx.fillStyle = `rgba(250, 240, 160, ${(a - 0.8) * 1.2})`;
        ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1);
        ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
      }
    }
    // виньетка
    const v = ctx.createRadialGradient(240, 150, 140, 240, 150, 300);
    v.addColorStop(0, 'rgba(20,10,30,0)');
    v.addColorStop(1, 'rgba(20,10,30,0.45)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 480, 270);
  }

  leafSprig(ctx, x, y, dir, t) {
    const s = Math.sin(t * 1.3 + x) > 0.4 ? 1 : 0;
    ctx.fillStyle = '#7aa874';
    ctx.fillRect(x, y, 3 * dir, 2);
    ctx.fillRect(x + 2 * dir, y - 2 - s, 3 * dir, 2);
    ctx.fillStyle = '#5f8f5c';
    ctx.fillRect(x + 1 * dir, y + 3, 3 * dir, 2);
    ctx.fillRect(x + 4 * dir, y + 1 + s, 2 * dir, 2);
  }

  drawInterior(ctx, x, y, w, h, side) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#f7dca8');
    g.addColorStop(1, '#e8b47c');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // полки
    ctx.fillStyle = '#b9875a';
    ctx.fillRect(x, y + 24, w, 3);
    ctx.fillRect(x, y + 50, w, 3);
    const ids = side
      ? ['alocasia_polly', 'calathea', 'phalaenopsis', 'hoya', 'anthurium', 'epipremnum']
      : ['cactus', 'zamioculcas', 'spathiphyllum', 'alocasia_black_velvet', 'sansevieria', 'monstera_adansonii'];
    ids.forEach((id, i) => {
      if (side === 0 && i === 4) return; // здесь стоит Маша
      const p = PLANT_DATA.find((d) => d.id === id);
      const px = x + 16 + (i % 3) * 38;
      const py = i < 3 ? y + 24 : y + 50;
      ctx.drawImage(PlantArt.get(id, p.size === 'l' ? 'm' : p.size, { pot: ['terracotta', 'cream', 'pink'][i % 3] }), px - 22, py - 56 + 2);
    });
    // Маша за стеклом
    if (side === 0) {
      this.mashaT += 0.016;
      const blink = Math.sin(this.t * 1.7) > 0.97;
      const dir = Math.sin(this.t * 0.25) > 0.6 ? 'right' : 'down';
      ctx.drawImage(Sprites.masha(dir, 0, { blink, sway: Math.sin(this.t * 1.6) > 0.3 ? 1 : 0, mood: 'happy' }), x + 41, y + h - 37);
    }
    // тёплый блик стекла
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(x + 8, y); ctx.lineTo(x + 22, y); ctx.lineTo(x + 2, y + 30); ctx.lineTo(x - 12, y + 30); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
