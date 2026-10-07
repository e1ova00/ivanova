'use strict';

/**
 * Каталог поставщика. Деньги списываются сразу, товар приезжает
 * утром следующего дня коробками у склада.
 */
class Supplier {
  constructor() {
    this.cart = {};
  }

  catalog(plants) {
    return Object.values(plants).filter((p) => p.unlocked).sort((a, b) => a.unlockLevel - b.unlockLevel || a.purchasePrice - b.purchasePrice);
  }

  qty(id) {
    return this.cart[id] || 0;
  }

  change(id, delta) {
    this.cart[id] = Utils.clamp(this.qty(id) + delta, 0, 9);
    if (!this.cart[id]) delete this.cart[id];
  }

  total(plants) {
    let sum = 0;
    for (const [id, q] of Object.entries(this.cart)) sum += plants[id].purchasePrice * q;
    return sum;
  }

  get count() {
    return Object.values(this.cart).reduce((a, b) => a + b, 0);
  }

  /** оформить заказ: возвращает объект заказа или причину отказа */
  place(plants, economy, existing) {
    const sum = this.total(plants);
    if (!sum) return { error: 'Корзина пуста — добавь растения.' };
    if (!economy.canAfford(sum)) return { error: 'Не хватает денег на балансе.' };
    economy.spendOnPurchase(sum);
    const order = existing || { items: {}, total: 0 };
    for (const [id, q] of Object.entries(this.cart)) order.items[id] = (order.items[id] || 0) + q;
    order.total += sum;
    this.cart = {};
    return { order, sum };
  }
}
