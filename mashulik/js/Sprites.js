'use strict';

/**
 * Процедурные спрайты персонажей и предметов с кэшированием в offscreen-буферах.
 */
const Sprites = (() => {
  const cache = new Map();

  const OUTLINE = '#2e2228';

  // ---------- Маша ----------
  const M = {
    skin: '#f6d0b4', skinSh: '#e3a98e', blush: '#f19a9e',
    h1: '#3a2117', h2: '#5a3322', h3: '#7c4a2f', h4: '#a3683f',
    eyeW: '#ffffff', iris: '#45a861', irisD: '#22663c', pupil: '#173323', lash: '#2a1712',
    shirt: '#ee97a8', shirtSh: '#cf7489',
    apron: '#5f8f5c', apronSh: '#46703f', apronL: '#7aa874',
    legs: '#3d3546', shoe: '#2a2024', mouth: '#b44c5c',
  };

  /** кудри: набор кластеров разных оттенков */
  function curls(b, list, sway) {
    for (const [x, y, r, tone, swing] of list) {
      const sx = swing ? sway : 0;
      const c = tone === 1 ? M.h1 : tone === 2 ? M.h2 : tone === 3 ? M.h3 : M.h4;
      b.disc(x + sx, y, r, c);
    }
  }

  function curlHighlights(b, pts, sway) {
    for (const [x, y, swing] of pts) b.px(x + (swing ? sway : 0), y, M.h4);
  }

  /**
   * Маша 26x38, ноги в (13, 36).
   * dir: down|up|right|left; frame 0..3; opts: blink, sway(-1..1), mood, action
   */
  function drawMasha(dir, frame, opts) {
    const b = new PixelBuffer(26, 38);
    const sway = opts.sway || 0;
    const bob = frame === 1 || frame === 3 ? -1 : 0;
    const legA = frame === 1 ? -1 : 0;
    const legB = frame === 3 ? -1 : 0;
    const armSw = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    const side = dir === 'left' || dir === 'right';
    const oy = bob;

    // --- ноги и обувь ---
    if (!side) {
      b.rect(10, 31 + legA, 2, 4, M.legs);
      b.rect(14, 31 + legB, 2, 4, M.legs);
      b.rect(9, 35 + legA, 3, 2, M.shoe);
      b.rect(14, 35 + legB, 3, 2, M.shoe);
    } else {
      const f1 = frame === 1 ? 2 : frame === 3 ? -2 : 0;
      b.rect(11 + f1, 31, 2, 4, M.legs);
      b.rect(13 - f1, 31, 2, 4, Utils.shade(M.legs, 0.8));
      b.rect(11 + f1, 35, 4, 2, M.shoe);
      b.rect(13 - f1, 35, 3, 2, M.shoe);
    }

    if (dir === 'down') {
      // волосы сзади (объём до пояса)
      curls(b, [
        [13, 12 + oy, 10, 1], [4, 19 + oy, 3, 1, 1], [22, 19 + oy, 3, 1, 1],
        [4, 24 + oy, 3, 2, 1], [22, 24 + oy, 3, 2, 1], [5, 28 + oy, 2, 1, 1], [21, 28 + oy, 2, 1, 1],
        [3, 14 + oy, 3, 2], [23, 14 + oy, 3, 2],
      ], sway);
      curls(b, [[4, 19 + oy, 2, 3, 1], [22, 21 + oy, 2, 3, 1], [5, 25 + oy, 1.5, 3, 1], [21, 26 + oy, 1.5, 2, 1]], sway);
      // тело
      b.rect(8, 19 + oy, 10, 8, M.shirt);
      b.rect(8, 25 + oy, 10, 1, M.shirtSh);
      // рукава и руки
      b.rect(6, 20 + oy, 2, 3, M.shirt);
      b.rect(18, 20 + oy, 2, 3, M.shirt);
      b.rect(6, 23 + oy + armSw, 2, 4, M.skin);
      b.rect(18, 23 + oy - armSw, 2, 4, M.skin);
      // фартук
      b.rect(10, 19 + oy, 1, 3, M.apron);
      b.rect(15, 19 + oy, 1, 3, M.apron);
      b.rect(10, 21 + oy, 6, 5, M.apron);
      b.rect(8, 26 + oy, 10, 5, M.apron);
      b.rect(8, 30 + oy, 10, 1, M.apronSh);
      b.rect(11, 27 + oy, 4, 2, M.apronL);
      b.px(12, 27 + oy, '#d9efc8');
      b.px(13, 28 + oy, '#d9efc8');
      // шея и лицо
      b.rect(12, 18 + oy, 2, 1, M.skinSh);
      b.rect(7, 8 + oy, 12, 10, M.skin);
      b.rect(8, 18 + oy, 10, 1, M.skin);
      b.px(7, 17 + oy, null);
      b.rect(7, 17 + oy, 1, 1, M.skinSh);
      b.rect(18, 17 + oy, 1, 1, M.skinSh);
      // чёлка-кудряшки
      curls(b, [
        [13, 6 + oy, 8, 1], [8, 8 + oy, 2.5, 2], [12, 7 + oy, 2.5, 3], [16, 7 + oy, 2.5, 2],
        [19, 9 + oy, 2, 2], [6, 10 + oy, 2, 2], [10, 5 + oy, 2, 3], [15, 4 + oy, 2, 2],
        [6, 13 + oy, 1.5, 1], [20, 13 + oy, 1.5, 1],
      ], 0);
      curlHighlights(b, [[11, 6 + oy], [15, 6 + oy], [8, 7 + oy], [18, 8 + oy], [13, 3 + oy], [4, 18 + oy, 1], [22, 23 + oy, 1], [5, 27 + oy, 1]], sway);
      drawFace(b, oy, opts, 'front');
    } else if (dir === 'up') {
      // спина: футболка, руки, бантик фартука; кудри до лопаток
      b.rect(8, 19 + oy, 10, 9, M.shirt);
      b.rect(8, 26 + oy, 10, 1, M.shirtSh);
      b.rect(6, 20 + oy, 2, 3, M.shirt);
      b.rect(18, 20 + oy, 2, 3, M.shirt);
      b.rect(6, 23 + oy - armSw, 2, 4, M.skin);
      b.rect(18, 23 + oy + armSw, 2, 4, M.skin);
      b.rect(8, 27 + oy, 10, 4, M.apronSh);
      b.rect(9, 27 + oy, 8, 4, '#4a4258');
      b.rect(8, 27 + oy, 1, 4, M.apron);
      b.rect(17, 27 + oy, 1, 4, M.apron);
      // бантик фартука
      b.rect(11, 26 + oy, 4, 2, M.apron);
      b.px(10, 27 + oy, M.apronL); b.px(15, 27 + oy, M.apronL);
      b.px(12, 28 + oy, M.apronSh); b.px(13, 28 + oy, M.apronSh);
      curls(b, [
        [13, 11 + oy, 9.5, 1],
        [9, 19 + oy, 3, 1, 1], [17, 19 + oy, 3, 1, 1], [13, 20 + oy, 3, 2, 1],
        [10, 23 + oy, 2.5, 2, 1], [16, 23 + oy, 2.5, 1, 1], [13, 24 + oy, 2, 1, 1],
        [6, 14 + oy, 2.5, 2], [20, 14 + oy, 2.5, 2],
      ], sway);
      curls(b, [
        [9, 7 + oy, 3, 2], [17, 7 + oy, 3, 3], [13, 4 + oy, 3, 2], [11, 12 + oy, 3, 3], [16, 13 + oy, 3, 2],
        [7, 11 + oy, 2.5, 3], [19, 11 + oy, 2.5, 2], [13, 16 + oy, 2.5, 3], [9, 16 + oy, 2, 2], [18, 17 + oy, 2, 3],
        [11, 21 + oy, 1.5, 3, 1], [15, 22 + oy, 1.5, 3, 1],
      ], sway);
      curlHighlights(b, [[12, 3 + oy], [9, 6 + oy], [17, 6 + oy], [14, 11 + oy], [10, 15 + oy], [18, 12 + oy], [9, 20 + oy, 1], [16, 22 + oy, 1], [13, 23 + oy, 1]], sway);
    } else {
      // вид справа (лево — зеркально)
      // волосы сзади
      curls(b, [
        [10, 12 + oy, 9, 1], [6, 20 + oy, 4, 1, 1], [7, 25 + oy, 3, 2, 1], [8, 28 + oy, 2, 1, 1],
        [4, 15 + oy, 3, 2, 1], [9, 22 + oy, 2.5, 3, 1],
      ], sway);
      // тело
      b.rect(10, 19 + oy, 7, 8, M.shirt);
      b.rect(10, 25 + oy, 7, 1, M.shirtSh);
      b.rect(15, 21 + oy, 3, 5, M.apron);
      b.rect(10, 26 + oy, 8, 5, M.apron);
      b.rect(16, 26 + oy, 2, 5, M.apronSh);
      b.rect(10, 30 + oy, 8, 1, M.apronSh);
      // рука
      b.rect(12 + armSw, 20 + oy, 3, 3, M.shirt);
      b.rect(12 + armSw, 23 + oy, 3, 4, M.skin);
      // голова
      b.rect(9, 8 + oy, 11, 10, M.skin);
      b.rect(10, 18 + oy, 8, 1, M.skin);
      b.px(20, 13 + oy, M.skin);
      b.px(19, 17 + oy, M.skinSh);
      curls(b, [
        [11, 6 + oy, 7, 1], [9, 9 + oy, 3, 2], [13, 6 + oy, 3, 3], [17, 7 + oy, 2.5, 2], [19, 9 + oy, 1.5, 2],
        [8, 13 + oy, 3, 1], [9, 16 + oy, 2.5, 2], [7, 10 + oy, 2, 3],
      ], 0);
      curlHighlights(b, [[12, 5 + oy], [16, 6 + oy], [8, 12 + oy], [5, 18 + oy, 1], [7, 24 + oy, 1], [9, 21 + oy, 1]], sway);
      drawFace(b, oy, opts, 'side');
    }

    // предметы в руках
    if (opts.action === 'inspect' && dir !== 'up') {
      const hx = side ? 17 : 19;
      b.disc(hx + 2, 22 + oy, 2, '#cfe7f0');
      b.px(hx + 2, 22 + oy, '#ffffff');
      b.rect(hx, 25 + oy, 1, 2, '#8a5a3a');
    }

    b.outline(OUTLINE);
    return b;
  }

  function drawFace(b, oy, opts, view) {
    const mood = opts.mood || 'idle';
    if (view === 'front') {
      const eyes = [[8, 11 + oy], [15, 11 + oy]];
      for (const [ex, ey] of eyes) {
        if (opts.blink) {
          b.rect(ex, ey + 2, 3, 1, M.lash);
        } else {
          b.rect(ex, ey, 3, 1, M.lash);
          b.rect(ex, ey + 1, 3, 3, M.iris);
          b.rect(ex, ey + 3, 3, 1, M.irisD);
          b.px(ex + 1, ey + 2, M.pupil);
          b.px(ex + 1, ey + 3, M.pupil);
          b.px(ex, ey + 1, M.eyeW);
          b.px(ex + 2, ey + 2, '#bff0cc');
        }
      }
      b.px(7, 10 + oy, M.lash);
      b.px(18, 10 + oy, M.lash);
      // брови
      if (mood === 'worried') {
        b.px(9, 9 + oy, M.h2); b.px(10, 8 + oy, M.h2);
        b.px(16, 8 + oy, M.h2); b.px(17, 9 + oy, M.h2);
      }
      // румянец
      b.px(8, 15 + oy, M.blush); b.px(9, 15 + oy, M.blush);
      b.px(16, 15 + oy, M.blush); b.px(17, 15 + oy, M.blush);
      // рот
      if (mood === 'happy') {
        b.px(11, 15 + oy, M.mouth); b.px(14, 15 + oy, M.mouth);
        b.rect(12, 16 + oy, 2, 1, M.mouth);
      } else if (mood === 'worried') {
        b.px(11, 16 + oy, M.mouth); b.px(12, 15 + oy, M.mouth); b.px(13, 16 + oy, M.mouth); b.px(14, 15 + oy, M.mouth);
        b.rect(20, 9 + oy, 1, 2, '#9fd6f0');
        b.px(20, 11 + oy, '#d8f2ff');
      } else {
        b.rect(12, 16 + oy, 2, 1, M.mouth);
      }
    } else {
      const ex = 15, ey = 11 + oy;
      if (opts.blink) {
        b.rect(ex, ey + 2, 3, 1, M.lash);
      } else {
        b.rect(ex, ey, 3, 1, M.lash);
        b.rect(ex, ey + 1, 3, 3, M.iris);
        b.rect(ex, ey + 3, 3, 1, M.irisD);
        b.px(ex + 2, ey + 2, M.pupil);
        b.px(ex + 2, ey + 3, M.pupil);
        b.px(ex + 1, ey + 1, M.eyeW);
      }
      b.px(18, 10 + oy, M.lash);
      b.px(17, 15 + oy, M.blush); b.px(16, 15 + oy, M.blush);
      if (mood === 'happy') { b.px(18, 16 + oy, M.mouth); b.px(19, 15 + oy, M.mouth); }
      else b.px(18, 16 + oy, M.mouth);
      if (mood === 'worried') { b.rect(21, 8 + oy, 1, 2, '#9fd6f0'); }
    }
  }

  function masha(dir, frame, opts = {}) {
    const flip = dir === 'left';
    const d = flip ? 'right' : dir;
    const key = `m|${d}|${frame}|${opts.blink ? 1 : 0}|${opts.sway || 0}|${opts.mood || ''}|${opts.action || ''}|${flip}`;
    let s = cache.get(key);
    if (!s) {
      const b = drawMasha(d, frame, opts);
      s = flip ? b.flipped().canvas : b.canvas;
      cache.set(key, s);
    }
    return s;
  }

  // ---------- Покупатели ----------
  /**
   * look: {skin, hair, top, bottom, style, acc}
   * Простая «кубическая» модель 18x30, ноги в (9, 29).
   */
  function drawCustomer(look, dir, frame, blink) {
    const b = new PixelBuffer(20, 31);
    const bob = frame === 1 || frame === 3 ? -1 : 0;
    const la = frame === 1 ? -1 : 0, lb = frame === 3 ? -1 : 0;
    const oy = bob;
    const side = dir === 'right';
    const skinSh = Utils.shade(look.skin, 0.86);
    const hairD = Utils.shade(look.hair, 0.78);
    const topSh = Utils.shade(look.top, 0.82);
    const shoe = '#2b2626';

    // ноги
    if (!side) {
      b.rect(7, 24 + la, 2, 4, look.bottom);
      b.rect(11, 24 + lb, 2, 4, look.bottom);
      b.rect(7, 28 + la, 2, 2, shoe);
      b.rect(11, 28 + lb, 2, 2, shoe);
    } else {
      const f = frame === 1 ? 2 : frame === 3 ? -2 : 0;
      b.rect(8 + f, 24, 3, 4, look.bottom);
      b.rect(9 - f, 24, 3, 4, Utils.shade(look.bottom, 0.8));
      b.rect(8 + f, 28, 4, 2, shoe);
      b.rect(9 - f, 28, 3, 2, shoe);
    }
    // торс
    if (!side) {
      b.rect(6, 15 + oy, 8, 9, look.top);
      b.rect(6, 22 + oy, 8, 2, topSh);
      b.rect(4, 15 + oy, 2, 6, look.top);
      b.rect(14, 15 + oy, 2, 6, look.top);
      b.rect(4, 21 + oy + (frame === 1 ? 1 : 0), 2, 2, look.skin);
      b.rect(14, 21 + oy + (frame === 3 ? 1 : 0), 2, 2, look.skin);
    } else {
      b.rect(7, 15 + oy, 6, 9, look.top);
      b.rect(7, 22 + oy, 6, 2, topSh);
      const sw = frame === 1 ? 1 : frame === 3 ? -1 : 0;
      b.rect(9 + sw, 16 + oy, 2, 5, topSh);
      b.rect(9 + sw, 21 + oy, 2, 2, look.skin);
    }
    // голова 8x8
    const hx = side ? 6 : 5;
    b.rect(hx, 6 + oy, 9, 9, look.skin);
    b.rect(hx, 14 + oy, 9, 1, skinSh);

    const st = look.style;
    if (dir === 'up') {
      if (st !== 'bald') b.rect(hx, 5 + oy, 9, 9, look.hair);
      if (st === 'long' || st === 'pony') b.rect(hx + 1, 14 + oy, 7, st === 'long' ? 6 : 4, look.hair);
      if (st === 'bun') b.disc(hx + 4, 4 + oy, 2, hairD);
      if (st === 'bald') b.rect(hx, 5 + oy, 9, 2, look.hair);
    } else {
      // волосы
      if (st === 'bald') {
        b.rect(hx, 8 + oy, 1, 3, look.hair); b.rect(hx + 8, 8 + oy, 1, 3, look.hair);
      } else {
        b.rect(hx, 5 + oy, 9, 3, look.hair);
        b.rect(hx, 8 + oy, 1, 2, look.hair);
        b.rect(hx + 8, 8 + oy, 1, 2, look.hair);
        b.px(hx + 2, 7 + oy, hairD);
        if (st === 'long') { b.rect(hx - 1, 7 + oy, 2, 10, look.hair); b.rect(hx + 8, 7 + oy, 2, 10, look.hair); }
        if (st === 'bob') { b.rect(hx - 1, 7 + oy, 2, 6, look.hair); b.rect(hx + 8, 7 + oy, 2, 6, look.hair); }
        if (st === 'pony') { b.rect(side ? hx - 2 : hx + 8, 6 + oy, 2, 7, look.hair); }
        if (st === 'bun') { b.disc(hx + 4, 4 + oy, 2, look.hair); b.px(hx + 4, 3 + oy, hairD); }
        if (st === 'side') { b.rect(hx, 8 + oy, 4, 1, look.hair); }
        if (st === 'messy') { b.px(hx + 1, 4 + oy, look.hair); b.px(hx + 5, 4 + oy, look.hair); b.px(hx + 7, 4 + oy, look.hair); }
      }
      // лицо
      const eY = 10 + oy;
      if (side) {
        if (!blink) { b.rect(hx + 6, eY, 1, 2, '#2a2020'); } else b.rect(hx + 6, eY + 1, 2, 1, '#2a2020');
        b.px(hx + 9, eY + 1, look.skin);
        b.px(hx + 7, eY + 3, '#b06060');
      } else {
        if (!blink) {
          b.rect(hx + 2, eY, 1, 2, '#2a2020'); b.rect(hx + 6, eY, 1, 2, '#2a2020');
        } else {
          b.rect(hx + 2, eY + 1, 2, 1, '#2a2020'); b.rect(hx + 5, eY + 1, 2, 1, '#2a2020');
        }
        b.rect(hx + 4, eY + 3, 1, 1, '#b06060');
        b.px(hx + 1, eY + 2, Utils.mix(look.skin, '#f08080', 0.35));
        b.px(hx + 7, eY + 2, Utils.mix(look.skin, '#f08080', 0.35));
      }
    }

    // аксессуары
    const a = look.acc;
    if (dir !== 'up') {
      if (a === 'glasses') {
        if (side) { b.rect(hx + 5, 10 + oy, 3, 2, null); b.rect(hx + 5, 9 + oy, 4, 1, '#3a3030'); b.px(hx + 5, 10 + oy, '#3a3030'); b.px(hx + 7, 10 + oy, '#3a3030'); }
        else { b.rect(hx + 1, 9 + oy, 7, 1, '#3a3030'); b.px(hx + 1, 10 + oy, '#3a3030'); b.px(hx + 3, 10 + oy, '#3a3030'); b.px(hx + 5, 10 + oy, '#3a3030'); b.px(hx + 7, 10 + oy, '#3a3030'); }
      }
      if (a === 'sunglasses') b.rect(side ? hx + 5 : hx + 1, 10 + oy, side ? 4 : 7, 2, '#151515');
      if (a === 'beard') b.rect(side ? hx + 4 : hx + 1, 12 + oy, side ? 5 : 7, 3, Utils.shade(look.hair, 0.9));
      if (a === 'earrings' && !side) { b.px(hx - 1, 12 + oy, '#e8c050'); b.px(hx + 9, 12 + oy, '#e8c050'); }
      if (a === 'scarf') b.rect(side ? 7 : 6, 15 + oy, side ? 6 : 8, 2, '#c8566a');
      if (a === 'phone') b.rect(side ? 12 : 14, 19 + oy, 2, 3, '#303040');
    }
    if (a === 'headphones') { b.rect(hx, 4 + oy, 9, 1, '#e8e0d8'); b.rect(hx - 1, 8 + oy, 2, 3, '#e86a8a'); b.rect(hx + 8, 8 + oy, 2, 3, '#e86a8a'); }
    if (a === 'cap') { b.rect(hx, 4 + oy, 9, 3, '#4a6a5a'); if (dir !== 'up') b.rect(side ? hx + 6 : hx + 1, 7 + oy, side ? 4 : 7, 1, '#3a5a4a'); }
    if (a === 'backpack' && dir === 'up') b.rect(6, 16 + oy, 8, 7, '#c86a4a');
    if (a === 'backpack' && dir !== 'up') { b.rect(side ? 6 : 5, 15 + oy, 1, 6, '#c86a4a'); if (!side) b.rect(14, 15 + oy, 1, 6, '#c86a4a'); }
    if (a === 'bag' && dir !== 'up') { b.rect(side ? 7 : 15, 19 + oy, 3, 4, '#a8724a'); b.px(side ? 8 : 16, 18 + oy, '#a8724a'); }

    b.outline(OUTLINE);
    return b;
  }

  function customer(look, dir, frame, blink, key) {
    const flip = dir === 'left';
    const d = flip ? 'right' : dir;
    const k = `c|${key}|${d}|${frame}|${blink ? 1 : 0}|${flip}`;
    let s = cache.get(k);
    if (!s) {
      const b = drawCustomer(look, d, frame, blink);
      s = flip ? b.flipped().canvas : b.canvas;
      cache.set(k, s);
    }
    return s;
  }

  // ---------- Предметы ----------
  function wateringCan(tilt) {
    const k = 'can' + tilt;
    let s = cache.get(k);
    if (s) return s;
    const b = new PixelBuffer(14, 10);
    b.rect(3, 3, 7, 6, '#7fb3b0');
    b.rect(3, 3, 7, 1, '#a8d4cf');
    b.rect(4, 1, 5, 1, '#5f8f8c');
    b.px(3, 2, '#5f8f8c'); b.px(9, 2, '#5f8f8c');
    if (tilt) { b.line(10, 5, 13, 7, '#5f8f8c'); b.px(13, 8, '#9fd6f0'); }
    else b.line(10, 5, 13, 3, '#5f8f8c');
    b.rect(5, 5, 3, 2, '#e8a5ae');
    b.outline('#2e3a3a');
    cache.set(k, b.canvas);
    return b.canvas;
  }

  /** коробка поставки */
  function box(variant) {
    const k = 'box' + variant;
    let s = cache.get(k);
    if (s) return s;
    const b = new PixelBuffer(20, 18);
    const c = variant % 2 ? '#c99a62' : '#b98a55';
    b.rect(1, 5, 18, 12, c);
    b.rect(1, 2, 18, 4, Utils.shade(c, 1.12));
    b.rect(9, 2, 3, 15, '#e8d4a0');
    b.rect(1, 16, 18, 1, Utils.shade(c, 0.75));
    // маркировка: листик и стрелки
    b.px(4, 9, '#5f8f5c'); b.px(5, 8, '#5f8f5c'); b.px(5, 9, '#7aa874'); b.px(4, 10, '#46703f');
    b.px(15, 8, '#6a4a2a'); b.px(14, 9, '#6a4a2a'); b.px(16, 9, '#6a4a2a'); b.px(15, 9, '#6a4a2a'); b.px(15, 10, '#6a4a2a');
    b.outline('#4a3020');
    cache.set(k, b.canvas);
    return b.canvas;
  }

  /** пиксельный кот для главного меню */
  function cat(frame) {
    const k = 'cat' + frame;
    let s = cache.get(k);
    if (s) return s;
    const b = new PixelBuffer(18, 12);
    const c = '#3a3036', l = '#5a4a52';
    b.rect(4, 4, 10, 5, c);
    b.rect(12, 1, 5, 5, c);
    b.px(12, 0, c); b.px(16, 0, c);
    b.px(14, 3, '#d8e070'); b.px(16, 3, '#d8e070');
    b.rect(5, 4, 6, 1, l);
    // хвост
    b.line(4, 5, 1, frame % 2 ? 1 : 2, c);
    // лапы
    const f = frame % 4;
    b.rect(5 + (f === 1 ? 1 : 0), 9, 1, 2, c);
    b.rect(8 - (f === 1 ? 1 : 0), 9, 1, 2, c);
    b.rect(11 + (f === 3 ? 1 : 0), 9, 1, 2, c);
    b.rect(13 - (f === 3 ? 1 : 0), 9, 1, 2, c);
    cache.set(k, b.canvas);
    return b.canvas;
  }

  /** иконка терпения: пиксельное лицо */
  function moodFace(level) {
    const k = 'mood' + level;
    let s = cache.get(k);
    if (s) return s;
    const b = new PixelBuffer(9, 9);
    const col = level >= 3 ? '#f2d36b' : level === 2 ? '#f2c66b' : level === 1 ? '#efb070' : '#e8826a';
    b.disc(4, 4, 3.6, col);
    b.px(3, 3, '#3a2a20'); b.px(5, 3, '#3a2a20');
    if (level >= 3) { b.px(2, 5, '#3a2a20'); b.px(3, 6, '#3a2a20'); b.px(4, 6, '#3a2a20'); b.px(5, 6, '#3a2a20'); b.px(6, 5, '#3a2a20'); }
    else if (level === 2) { b.px(3, 6, '#3a2a20'); b.px(4, 6, '#3a2a20'); b.px(5, 6, '#3a2a20'); b.px(6, 5, '#3a2a20'); }
    else if (level === 1) { b.rect(3, 6, 3, 1, '#3a2a20'); }
    else { b.px(2, 2, '#3a2a20'); b.px(6, 2, '#3a2a20'); b.px(3, 6, '#3a2a20'); b.px(4, 5, '#3a2a20'); b.px(5, 6, '#3a2a20'); }
    b.outline('#5a3a2a');
    cache.set(k, b.canvas);
    return b.canvas;
  }

  /** облачко над покупателем: '!' / '?' / '₽' / '...' */
  function bubble(kind) {
    const k = 'bub' + kind;
    let s = cache.get(k);
    if (s) return s;
    const b = new PixelBuffer(13, 13);
    b.rect(1, 1, 11, 8, '#fffaf0');
    b.rect(0, 2, 13, 6, '#fffaf0');
    b.rect(5, 9, 3, 1, '#fffaf0');
    b.px(6, 10, '#fffaf0');
    const ink = kind === '!' ? '#d0506a' : kind === '₽' ? '#3f7a3c' : '#6a5a6a';
    if (kind === '!') { b.rect(6, 2, 1, 4, ink); b.px(6, 7, ink); }
    else if (kind === '?') { b.rect(5, 2, 3, 1, ink); b.px(8, 3, ink); b.px(7, 4, ink); b.px(6, 5, ink); b.px(6, 7, ink); }
    else if (kind === '₽') { b.rect(5, 2, 1, 6, ink); b.rect(5, 2, 3, 1, ink); b.px(8, 3, ink); b.rect(5, 4, 3, 1, ink); b.rect(4, 6, 4, 1, ink); }
    else if (kind === 'heart') { b.px(4, 3, '#e86a8a'); b.px(5, 3, '#e86a8a'); b.px(7, 3, '#e86a8a'); b.px(8, 3, '#e86a8a'); b.rect(3, 4, 7, 2, '#e86a8a'); b.rect(4, 6, 5, 1, '#e86a8a'); b.px(6, 7, '#e86a8a'); }
    else { b.px(3, 5, ink); b.px(6, 5, ink); b.px(9, 5, ink); }
    b.outline('#6a4a4a');
    cache.set(k, b.canvas);
    return b.canvas;
  }

  /** портрет Маши крупно (для профиля и диалогов) */
  function portrait(mood = 'happy') {
    const k = 'portrait' + mood;
    let s = cache.get(k);
    if (s) return s;
    s = masha('down', 0, { mood });
    cache.set(k, s);
    return s;
  }

  return { masha, customer, wateringCan, box, cat, moodFace, bubble, portrait, cache };
})();
