'use strict';

/**
 * Отрисовка магазина: фон из кэша → динамические детали стен →
 * объекты с сортировкой по Y → частицы → освещение → интерфейс над головами.
 */
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.bg = null;
    this.bgLevel = -1;
    this.drawables = [];
  }

  ensureBackground(level) {
    if (this.bgLevel !== level) {
      this.bg = ShopArt.background(level);
      this.bgLevel = level;
    }
  }

  /** доля суток: 0 утро, 1 день, 2 вечер */
  static timeOfDay(min) {
    if (min < 12 * 60) return 0;
    if (min < 17 * 60) return 1;
    return 2;
  }

  /** насколько «вечерний» свет (0..1), плавно */
  static eveningK(min) {
    return Utils.clamp((min - 16.5 * 60) / 120, 0, 1);
  }

  static morningK(min) {
    return Utils.clamp((11 * 60 - min) / 120, 0, 1);
  }

  render(game) {
    const ctx = this.ctx;
    const shop = game.shop;
    const t = game.elapsed;
    const min = game.clock;
    this.ensureBackground(shop.level);

    ctx.fillStyle = '#3a2a24';
    ctx.fillRect(0, 0, 480, 270);

    // вид за окном и в дверном проёме
    const tod = game.forceEvening ? 2 : Renderer.timeOfDay(min);
    ShopArt.outside(ctx, 76, 16, 84, 46, tod);
    this.drawDoor(ctx, game, tod);
    ctx.drawImage(this.bg, 0, 0);
    this.drawClock(ctx, min);

    // солнечные пятна из окна
    this.drawWindowLight(ctx, min, game.forceEvening);

    // гирлянда (уровень 5+)
    if (shop.level >= 5) this.drawGarland(ctx, t, min, game.forceEvening);

    // объекты с сортировкой по глубине
    const D = this.drawables;
    D.length = 0;
    for (const f of shop.furniture) D.push({ y: f.y + f.h, f });
    for (const s of shop.slots) D.push({ y: s.sortY, s });
    if (game.delivery && game.delivery.arrived) D.push({ y: 114, boxes: true });
    D.push({ y: game.player.y, e: game.player });
    for (const c of game.customers) D.push({ y: c.y, e: c });
    D.sort((a, b) => a.y - b.y);

    for (const d of D) {
      if (d.f) this.drawFurniture(ctx, d.f, t);
      else if (d.s) this.drawSlot(ctx, game, d.s, t);
      else if (d.boxes) this.drawBoxes(ctx, t);
      else d.e.render(ctx, game);
    }

    // подсветка цели
    if (game.highlight) this.drawHighlight(ctx, game.highlight, t);
    // маркер точки назначения
    if (game.moveMarker && game.moveMarker.t > 0) {
      const m = game.moveMarker;
      const r = Math.round(3 + (1 - m.t) * 3);
      ctx.fillStyle = `rgba(255,250,235,${m.t})`;
      ctx.fillRect(m.x - r, m.y, r * 2, 1);
      ctx.fillRect(m.x, m.y - Math.round(r / 2), 1, r);
    }

    game.particles.render(ctx);
    this.drawLighting(ctx, game, min, t);

    for (const c of game.customers) c.renderOverlay(ctx, t);
    if (game.tutorialArrow) this.drawArrow(ctx, game.tutorialArrow[0], game.tutorialArrow[1], t);
  }

  drawDoor(ctx, game, tod) {
    const open = game.doorOpen;
    // проём: улица
    ShopArt.outside(ctx, 404, 22, 36, 58, tod);
    ctx.fillStyle = tod >= 2 ? '#4a4048' : '#b8aca0';
    ctx.fillRect(404, 70, 36, 10);
    if (open < 0.98) {
      const w = Math.round(36 * (1 - open * 0.8));
      // полотно двери
      ctx.fillStyle = '#6a8a6a';
      ctx.fillRect(404, 22, w, 58);
      ctx.fillStyle = '#5a785a';
      ctx.fillRect(404, 22, w, 1);
      ctx.fillRect(404 + w - 1, 22, 1, 58);
      if (w > 12) {
        // стекло
        ctx.fillStyle = 'rgba(200,230,235,0.55)';
        ctx.fillRect(408, 26, w - 8, 26);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(410, 28, 2, 8);
        // табличка «открыто/закрыто»
        const isOpen = game.phase === 'open';
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(404 + Math.round(w / 2) - 7, 30, 1, 3);
        ctx.fillRect(404 + Math.round(w / 2) + 6, 30, 1, 3);
        ctx.fillStyle = isOpen ? '#f6efe2' : '#e8b8b8';
        ctx.fillRect(404 + Math.round(w / 2) - 8, 33, 16, 7);
        ctx.fillStyle = isOpen ? '#5f8f5c' : '#b04a5a';
        ctx.fillRect(404 + Math.round(w / 2) - 6, 35, 12, 1);
        ctx.fillRect(404 + Math.round(w / 2) - 5, 37, 10, 1);
        // ручка
        ctx.fillStyle = '#d8b25a';
        ctx.fillRect(404 + w - 6, 54, 2, 4);
      }
    }
  }

  drawClock(ctx, min) {
    const h = (min / 60) % 12, m = min % 60;
    const cx = 214, cy = 24;
    const ha = (h / 12) * Math.PI * 2 - Math.PI / 2;
    const ma = (m / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.fillStyle = '#4a3a30';
    for (let i = 0; i <= 3; i++) ctx.fillRect(Math.round(cx + Math.cos(ha) * i), Math.round(cy + Math.sin(ha) * i), 1, 1);
    ctx.fillStyle = '#b04a5a';
    for (let i = 0; i <= 5; i++) ctx.fillRect(Math.round(cx + Math.cos(ma) * i), Math.round(cy + Math.sin(ma) * i), 1, 1);
    ctx.fillStyle = '#4a3a30';
    ctx.fillRect(cx, cy, 1, 1);
  }

  drawWindowLight(ctx, min, forceEvening) {
    const ev = forceEvening ? 1 : Renderer.eveningK(min);
    const alpha = 0.16 * (1 - ev);
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255, 228, 170, ${alpha})`;
    const sx = Renderer.morningK(min) * -20;
    ctx.beginPath();
    ctx.moveTo(78, 80);
    ctx.lineTo(158, 80);
    ctx.lineTo(238 + sx, 196);
    ctx.lineTo(130 + sx, 196);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(255, 238, 200, ${alpha * 0.6})`;
    ctx.fillRect(76, 16, 84, 46);
    ctx.restore();
  }

  drawGarland(ctx, t, min, forceEvening) {
    const ev = forceEvening ? 1 : Renderer.eveningK(min);
    const hooks = [14, 90, 166, 242, 318, 394, 466];
    const colors = ['#f6d36b', '#f4a8b8', '#bfe3b0', '#f6e6c0'];
    let n = 0;
    for (let i = 0; i < hooks.length - 1; i++) {
      const x0 = hooks[i], x1 = hooks[i + 1];
      for (let x = x0; x <= x1; x += 2) {
        const u = (x - x0) / (x1 - x0);
        const y = 4 + Math.round(Math.sin(u * Math.PI) * 7);
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(x, y, 2, 1);
      }
      for (let k = 1; k < 6; k++) {
        const u = k / 6;
        const x = Math.round(x0 + (x1 - x0) * u);
        const y = 5 + Math.round(Math.sin(u * Math.PI) * 7);
        const tw = 0.6 + 0.4 * Math.sin(t * 2.2 + n * 1.7);
        const c = colors[n % colors.length];
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 2, 2);
        if (ev > 0.05 || tw > 0.9) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.18 * tw * (0.4 + ev);
          ctx.fillRect(x - 2, y - 2, 6, 6);
          ctx.restore();
        }
        n++;
      }
    }
  }

  drawFurniture(ctx, f, t) {
    switch (f.kind) {
      case 'shelf': {
        const s = ShopArt.shelf(f.w, f.tier);
        ctx.drawImage(s, f.x, f.y + f.h - s.height + 2);
        break;
      }
      case 'counter': {
        const s = ShopArt.counter(f.tier);
        ctx.drawImage(s, f.x, f.y + f.h - s.height + 2);
        break;
      }
      case 'desk': {
        const s = ShopArt.desk();
        const x = f.x, y = f.y + f.h - s.height + 2;
        ctx.drawImage(s, x, y);
        // экран монитора: мерцающий курсор и строки
        ctx.fillStyle = '#9fd6a8';
        ctx.fillRect(x + 18, y + 4, 10, 1);
        ctx.fillRect(x + 18, y + 7, 14, 1);
        ctx.fillRect(x + 18, y + 10, 8, 1);
        if (Math.floor(t * 2) % 2) ctx.fillRect(x + 27, y + 10, 2, 1);
        ctx.fillStyle = '#f2b8c8';
        ctx.fillRect(x + 32, y + 4, 3, 3);
        break;
      }
      case 'potting': {
        const s = ShopArt.pottingTable();
        ctx.drawImage(s, f.x, f.y + f.h - s.height + 2);
        break;
      }
      case 'bench': {
        const s = ShopArt.bench(f.tier);
        ctx.drawImage(s, f.x - 1, f.y + f.h - s.height + 2);
        break;
      }
      case 'lamp': {
        const s = ShopArt.floorLamp();
        ctx.drawImage(s, f.x - 2, f.y + f.h - s.height + 1);
        break;
      }
      case 'crate': {
        const s = ShopArt.crate();
        ctx.drawImage(s, f.x - 1, f.y + f.h - s.height + 2);
        break;
      }
      case 'rare': {
        const s = ShopArt.rareCabinet();
        ctx.drawImage(s, f.x, f.y + f.h - s.height + 2);
        break;
      }
      case 'stand': {
        const s = ShopArt.stand(f.standKind);
        ctx.drawImage(s, f.cx - 9, f.by - 11);
        break;
      }
      case 'decor': {
        const d = f.decor;
        const sway = Math.sin(t * 0.9 + d.x) > 0.6 ? 1 : 0;
        const spr = PlantArt.get(d.plant, d.size, { pot: d.pot, sway });
        ctx.drawImage(spr, d.x - PlantArt.CX, d.y - PlantArt.BASE);
        break;
      }
      default:
        break;
    }
  }

  drawSlot(ctx, game, s, t) {
    const plant = s.plantId ? game.plants[s.plantId] : null;
    const pot = game.shop.potFor(s, plant);
    const x = s.x - PlantArt.CX, y = s.baseY - PlantArt.BASE;
    if (!plant) return;
    if (plant.stock <= 0) {
      ctx.drawImage(PlantArt.empty(plant.size, pot), x, y);
      // ярлычок «нет в наличии»
      ctx.fillStyle = '#f6efe2';
      ctx.fillRect(s.x - 4, s.baseY - 4, 8, 4);
      ctx.fillStyle = '#c8566a';
      ctx.fillRect(s.x - 2, s.baseY - 3, 4, 1);
      ctx.fillRect(s.x - 2, s.baseY - 2, 1, 1);
      return;
    }
    // листья слегка покачиваются
    const phase = t * 0.8 + s.x * 0.37;
    const sway = Math.sin(phase) > 0.7 ? 1 : Math.sin(phase) < -0.8 ? -1 : 0;
    const spr = PlantArt.get(plant.id, plant.size, { state: plant.artState, pot, sway });
    ctx.drawImage(spr, x, y);
    // ярлычок с количеством
    if (plant.stock > 1) {
      ctx.fillStyle = '#f6efe2';
      ctx.fillRect(s.x + 5, s.baseY - 5, 5, 5);
      ctx.fillStyle = '#5f8f5c';
      const n = Math.min(plant.stock, 5);
      for (let i = 0; i < n; i++) ctx.fillRect(s.x + 6 + (i % 3), s.baseY - 4 + Math.floor(i / 3) * 2, 1, 1);
    }
    // вредители — шевелящиеся точки
    if (plant.pests) {
      for (let i = 0; i < 6; i++) {
        const px = s.x - 7 + ((i * 5 + Math.floor(t * 3 + i)) % 15);
        const py = s.baseY - 12 - ((i * 7 + Math.floor(t * 2)) % 14);
        ctx.fillStyle = i % 2 ? '#3a3a2a' : '#f4f4e0';
        ctx.fillRect(px, py, 1, 1);
      }
    }
    // редкое растение — лёгкое золотое мерцание
    if (plant.rarity >= 3 && Math.sin(t * 1.3 + s.x) > 0.96) {
      game.particles.emit('gold', s.x + Utils.rand(-8, 8), s.baseY - Utils.rand(10, 26), 1);
    }
  }

  drawBoxes(ctx, t) {
    const pos = [[30, 112, 0], [50, 114, 1], [38, 101, 1]];
    for (const [x, y, v] of pos) {
      ctx.fillStyle = 'rgba(70,40,30,0.22)';
      ctx.fillRect(x + 1, y - 1, 19, 2);
      ctx.drawImage(Sprites.box(v), x, y - 18);
    }
    // мигающая звёздочка «новое»
    if (Math.floor(t * 2) % 2) {
      ctx.fillStyle = '#fff6c0';
      ctx.fillRect(62, 92, 1, 3);
      ctx.fillRect(61, 93, 3, 1);
    }
  }

  drawHighlight(ctx, h, t) {
    const a = 0.45 + 0.35 * Math.sin(t * 6);
    ctx.save();
    ctx.strokeStyle = `rgba(255, 250, 220, ${a})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(h.x + 0.5, h.y + 0.5, h.rx, h.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawArrow(ctx, x, y, t) {
    const by = Math.round(y - 6 + Math.sin(t * 5) * 2);
    ctx.fillStyle = '#4a2a30';
    ctx.fillRect(x - 4, by - 7, 9, 3);
    ctx.fillRect(x - 3, by - 4, 7, 2);
    ctx.fillRect(x - 2, by - 2, 5, 2);
    ctx.fillRect(x - 1, by, 3, 1);
    ctx.fillStyle = '#f6a8b8';
    ctx.fillRect(x - 3, by - 6, 7, 1);
    ctx.fillRect(x - 2, by - 5, 5, 2);
    ctx.fillRect(x - 1, by - 3, 3, 2);
    ctx.fillRect(x, by - 1, 1, 1);
  }

  /** тёплое освещение: утро светлее, вечер — лампы и гирлянды */
  drawLighting(ctx, game, min, t) {
    const ev = game.forceEvening ? 1 : Renderer.eveningK(min);
    const mo = Renderer.morningK(min);
    ctx.save();
    if (mo > 0) {
      ctx.fillStyle = `rgba(255, 246, 225, ${0.07 * mo})`;
      ctx.fillRect(0, 0, 480, 270);
    }
    if (ev > 0) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(${Math.round(255 - 70 * ev)}, ${Math.round(255 - 95 * ev)}, ${Math.round(255 - 60 * ev)}, 1)`;
      ctx.fillRect(0, 0, 480, 270);
      ctx.globalCompositeOperation = 'lighter';
      const flick = 0.92 + 0.08 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
      const lamps = [[240, 70, 150], [354, 110, 90], [50, 200, 70], [120, 140, 90], [355, 198, 80]];
      if (game.shop.level >= 10) lamps.push([226, 24, 60], [296, 24, 60], [420, 200, 80]);
      for (const [x, y, r] of lamps) {
        const g = ctx.createRadialGradient(x, y, 2, x, y, r);
        g.addColorStop(0, `rgba(255, 200, 120, ${0.22 * ev * flick})`);
        g.addColorStop(1, 'rgba(255, 200, 120, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    ctx.restore();
    // мягкая виньетка
    ctx.save();
    const v = ctx.createRadialGradient(240, 150, 160, 240, 150, 300);
    v.addColorStop(0, 'rgba(40,20,20,0)');
    v.addColorStop(1, `rgba(40,20,20,${0.22 + ev * 0.15})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 480, 270);
    ctx.restore();
  }
}
