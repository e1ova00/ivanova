'use strict';

/**
 * Планировка магазина: мебель, коллизии, места для растений, точки взаимодействия.
 * Магазин перестраивается при повышении уровня — появляются новые стеллажи и зоны.
 */
class Shop {
  constructor() {
    this.level = 1;
    this.furniture = [];
    this.slots = [];
    this.decor = [];
    this.bounds = { x: 14, y: 86, w: 452, h: 172 };
    // ключевые точки
    this.points = {
      doorOutside: [422, 90],
      doorInside: [422, 104],
      mashaCheckout: [354, 122],
      checkoutQueue: [[354, 156], [354, 176], [380, 174], [328, 176]],
      computer: [50, 240],
      storage: [40, 94],
      boxes: [84, 110],
      start: [240, 150],
    };
    this.zones = {
      counter: { x: 318, y: 96, w: 72, h: 44 },
      computer: { x: 22, y: 188, w: 58, h: 40 },
      storage: { x: 22, y: 24, w: 36, h: 56 },
      boxes: { x: 26, y: 88, w: 52, h: 26 },
    };
  }

  /** собрать магазин под уровень */
  build(level) {
    this.level = level;
    const tier = level >= 10 ? 3 : level >= 6 ? 2 : 1;
    const F = [];
    const S = [];
    const add = (o) => F.push(o);

    add({ id: 'shelfA', kind: 'shelf', x: 96, y: 112, w: 76, h: 12, tier });
    add({ id: 'shelfB', kind: 'shelf', x: 96, y: 178, w: 76, h: 12, tier });
    if (level >= 4) add({ id: 'shelfC', kind: 'shelf', x: 192, y: 178, w: 76, h: 12, tier });
    add({ id: 'counter', kind: 'counter', x: 318, y: 126, w: 72, h: 14, tier });
    add({ id: 'desk', kind: 'desk', x: 22, y: 216, w: 58, h: 12 });
    add({ id: 'potting', kind: 'potting', x: 22, y: 146, w: 46, h: 12 });
    if (level >= 10) add({ id: 'rare', kind: 'rare', x: 384, y: 200, w: 74, h: 14 });
    add({ id: 'bench', kind: 'bench', x: 110, y: 240, w: 40, h: 8, tier });
    add({ id: 'lamp', kind: 'lamp', x: 348, y: 238, w: 10, h: 4 });
    add({ id: 'crate', kind: 'crate', x: 442, y: 154, w: 22, h: 8 });

    const shelfSlots = (shelfId, xs, y, light) => {
      const sh = F.find((f) => f.id === shelfId);
      if (!sh) return;
      xs.forEach((x, i) => S.push({
        id: `${shelfId}_${i}`, kind: 'shelf', x, baseY: sh.y - 6, sortY: sh.y + sh.h + 0.5,
        ix: x, iy: sh.y + sh.h + 10, light,
      }));
    };
    shelfSlots('shelfA', [106, 125, 144, 163], 0, 2);
    shelfSlots('shelfB', [106, 125, 144, 163], 0, 1);
    shelfSlots('shelfC', [202, 221, 240, 259], 0, 1);

    // подоконник
    [[98, 0], [140, 1]].forEach(([x, i]) => S.push({
      id: 'sill_' + i, kind: 'sill', x, baseY: 66, sortY: 81, ix: x, iy: 95, light: 3,
    }));
    // напольные места
    const floorStand = (id, x, y, standKind, light) => {
      F.push({ id: 'stand_' + id, kind: 'stand', standKind, x: x - 7, y: y - 5, w: 14, h: 6, cx: x, by: y });
      const lift = standKind === 'marble' ? 10 : standKind === 'gold' ? 4 : 5;
      S.push({ id, kind: standKind === 'marble' ? 'pedestal' : 'floor', x, baseY: y - lift, sortY: y + 0.5, ix: x, iy: y + 12, light });
    };
    floorStand('floor_0', 208, 130, 'wood', 2);
    floorStand('floor_1', 236, 130, 'wood', 2);
    if (level >= 8) {
      floorStand('prem_0', 292, 206, 'gold', 1);
      floorStand('prem_1', 314, 206, 'gold', 1);
    }
    if (level >= 13) {
      floorStand('ped_0', 268, 130, 'marble', 2);
      floorStand('ped_1', 294, 130, 'marble', 2);
    }
    if (level >= 10) {
      const r = F.find((f) => f.id === 'rare');
      [393, 411, 429, 447].forEach((x, i) => S.push({
        id: 'rare_' + i, kind: 'rare', x, baseY: r.y - 6, sortY: r.y + r.h + 0.5, ix: x, iy: r.y + r.h + 10, light: 2,
      }));
    }

    // декоративные растения (не продаются)
    const D = [];
    D.push({ plant: 'monstera_deliciosa', x: 452, y: 252, pot: 'sage', size: 'l' });
    if (level >= 3) D.push({ plant: 'ficus_lyrata', x: 26, y: 254, pot: 'cream', size: 'l' });
    if (level >= 6) D.push({ plant: 'sansevieria', x: 458, y: 112, pot: 'pink', size: 'm' });
    if (level >= 10) D.push({ plant: 'ficus_elastica', x: 98, y: 254, pot: 'premium', size: 'l' });
    if (level >= 13) D.push({ plant: 'monstera_thai', x: 370, y: 254, pot: 'marble', size: 'l' });
    if (level >= 15) D.push({ plant: 'alocasia_frydek', x: 182, y: 120, pot: 'premium', size: 'm' });
    for (const d of D) F.push({ id: 'decor_' + d.x, kind: 'decor', x: d.x - 6, y: d.y - 4, w: 12, h: 5, decor: d });

    this.furniture = F;
    this.slots = S;
    this.decor = D;
  }

  /** прямоугольники для коллизий */
  get obstacles() {
    return this.furniture.map((f) => ({ x: f.x, y: f.y, w: f.w, h: f.h }));
  }

  /** стиль горшка в зависимости от места и уровня */
  potFor(slot, plant) {
    const L = this.level;
    if (slot.kind === 'rare' || slot.kind === 'pedestal') return L >= 13 ? 'marble' : 'premium';
    if (L >= 8 && plant && plant.rarity >= 3) return 'premium';
    if (L >= 2) {
      const h = (slot.x * 7 + slot.baseY) % 4;
      return ['terracotta', 'cream', 'pink', L >= 6 ? 'sage' : 'cream'][h];
    }
    return 'terracotta';
  }

  /**
   * Распределение видов по местам: редкие — в витрину и на постаменты,
   * крупные — на пол, светолюбивые — к окну.
   */
  assign(plants) {
    const list = plants.filter((p) => p.unlocked)
      .sort((a, b) => b.rarity - a.rarity || (b.size === 'l') - (a.size === 'l') || a.unlockLevel - b.unlockLevel);
    const free = new Set(this.slots.map((s) => s.id));
    const bySlot = {};
    for (const p of list) {
      let best = null, bestScore = -Infinity;
      for (const s of this.slots) {
        if (!free.has(s.id)) continue;
        let sc = 3 - Math.abs(s.light - p.lightNeed);
        const floorish = s.kind === 'floor' || s.kind === 'pedestal';
        if ((s.kind === 'rare' || s.kind === 'pedestal') && p.rarity >= 3) sc += 10;
        if ((s.kind === 'rare' || s.kind === 'pedestal') && p.rarity < 3) sc -= 8;
        if (floorish && p.size === 'l') sc += 6;
        if (floorish && p.size !== 'l') sc -= 3;
        if (s.kind === 'shelf' && p.size !== 'l') sc += 2;
        if (s.kind === 'sill' && p.size === 's') sc += 2;
        if (sc > bestScore) { bestScore = sc; best = s; }
      }
      if (!best) break;
      free.delete(best.id);
      bySlot[best.id] = p.id;
    }
    for (const s of this.slots) s.plantId = bySlot[s.id] || null;
  }

  slotOf(plantId) {
    return this.slots.find((s) => s.plantId === plantId) || null;
  }

  /** попадание по растению (по силуэту спрайта примерно) */
  slotAt(px, py) {
    let best = null;
    for (const s of this.slots) {
      if (!s.plantId) continue;
      const big = s.kind === 'floor' || s.kind === 'pedestal' || s.kind === 'rare';
      const h = big ? 40 : 30;
      if (px >= s.x - 10 && px <= s.x + 10 && py >= s.baseY - h && py <= s.baseY + 3) {
        if (!best || s.sortY > best.sortY) best = s;
      }
    }
    return best;
  }

  static inRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }
}
