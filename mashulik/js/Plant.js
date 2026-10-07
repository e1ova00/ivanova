'use strict';

/**
 * Растение (партия одного вида в магазине): справочные данные + живое состояние.
 * Состояния: HEALTHY, DRY, OVERWATERED, PESTS.
 */
class Plant {
  constructor(data, saved = null) {
    Object.assign(this, data);
    this.playerPrice = data.recommendedPrice;
    this.stock = 0;
    this.health = 90;
    this.hydration = 60;   // 0..130, выше 100 — перелив
    this.nutrition = 65;   // 0..130, выше 100 — перекорм
    this.pestRisk = 0.04 * data.difficulty;
    this.pests = false;
    this.unlocked = false;
    this.inspectedDay = 0;
    this.sold = 0;
    if (saved) Object.assign(this, saved);
  }

  /** только изменяемые поля — для сохранения */
  toJSON() {
    return {
      playerPrice: this.playerPrice, stock: this.stock, health: this.health,
      hydration: this.hydration, nutrition: this.nutrition, pestRisk: this.pestRisk,
      pests: this.pests, unlocked: this.unlocked, inspectedDay: this.inspectedDay, sold: this.sold,
    };
  }

  get state() {
    if (this.pests) return 'PESTS';
    if (this.hydration > 100) return 'OVERWATERED';
    if (this.hydration < 25) return 'DRY';
    return 'HEALTHY';
  }

  /** спрайтовое состояние (вредители рисуются отдельно поверх) */
  get artState() {
    if (this.health < 18) return 'DEAD';
    const s = this.state;
    if (s === 'PESTS') return this.hydration < 25 ? 'DRY' : this.hydration > 100 ? 'OVERWATERED' : 'HEALTHY';
    return s;
  }

  get stateLabel() {
    return { HEALTHY: 'Здорово', DRY: 'Пересохло', OVERWATERED: 'Перелито', PESTS: 'Вредители!' }[this.state];
  }

  /** «свет» для карточки: насколько место подходит растению */
  lightScore(slotLight) {
    return Utils.clamp(100 - Math.abs(slotLight - this.lightNeed) * 35 + 5, 20, 100);
  }

  /** насколько плохое состояние снижает привлекательность (0.5..1) */
  get valueFactor() {
    return Utils.clamp(0.45 + this.health / 180, 0.5, 1);
  }

  /** течение времени: hours — игровые часы */
  tick(hours, level) {
    if (this.stock <= 0) return;
    const waterRate = [0, 1.2, 2.2, 3.4][this.waterNeed];
    this.hydration = Math.max(0, this.hydration - waterRate * hours);
    this.nutrition = Math.max(0, this.nutrition - 1.6 * hours);
    let dh = 0;
    if (this.hydration < 25) dh -= (25 - this.hydration) * 0.12;
    if (this.hydration > 100) dh -= 2.2;
    if (this.nutrition < 20) dh -= 0.8;
    if (this.nutrition > 100) dh -= 1.5;
    if (this.pests) dh -= 2.5;
    if (dh === 0) dh = 1.6;
    this.health = Utils.clamp(this.health + dh * hours, 0, 100);
    if (level >= 7 && !this.pests && Math.random() < this.pestRisk * hours * 0.05 * (this.health < 60 ? 2 : 1)) {
      this.pests = true;
    }
  }

  water() {
    const before = this.hydration;
    this.hydration = Math.min(130, this.hydration + 38);
    if (before > 70) {
      // полив по мокрой земле — перелив
      this.health = Math.max(0, this.health - 8);
      return 'over';
    }
    return before < 25 ? 'saved' : 'ok';
  }

  fertilize() {
    const before = this.nutrition;
    this.nutrition = Math.min(130, this.nutrition + 40);
    if (before > 75) {
      this.health = Math.max(0, this.health - 6);
      return 'over';
    }
    return 'ok';
  }

  /** осмотр: находит вредителей, иначе даёт совет по уходу */
  inspect(day) {
    const first = this.inspectedDay !== day;
    this.inspectedDay = day;
    if (this.pests) return { found: true, first };
    return { found: false, first };
  }

  treat() {
    this.pests = false;
    this.health = Math.min(100, this.health + 5);
  }

  /** добавить партию с поставки: усредняем состояние */
  addStock(n) {
    const total = this.stock + n;
    if (total <= 0) return;
    const w = this.stock / total;
    this.health = this.health * w + 95 * (1 - w);
    this.hydration = this.hydration * w + 55 * (1 - w);
    this.nutrition = this.nutrition * w + 70 * (1 - w);
    this.stock = total;
  }

  /** ночь: растения немного сохнут, совсем погибшие списываются */
  overnight() {
    if (this.stock <= 0) return 0;
    this.tick(2, 0);
    if (this.health < 12) {
      this.stock -= 1;
      this.health = 45;
      this.hydration = 50;
      return 1;
    }
    return 0;
  }

  /** насколько цена отличается от рекомендованной */
  get priceRatio() {
    return this.playerPrice / this.recommendedPrice;
  }

  get priceLabel() {
    const r = this.priceRatio;
    if (r < 0.9) return { text: 'Очень выгодно', cls: 'cheap' };
    if (r <= 1.1) return { text: 'Справедливая цена', cls: 'fair' };
    if (r <= 1.3) return { text: 'Дороговато', cls: 'pricey' };
    return { text: 'Очень дорого', cls: 'expensive' };
  }
}
