'use strict';

/** Экономика магазина: баланс, выручка, себестоимость, статистика дня. */
class Economy {
  constructor(saved = null) {
    this.balance = 15000;
    this.revenue = 0;
    this.cost = 0;
    this.sales = 0;
    this.purchaseExpenses = 0;
    this.discardedPlants = 0;
    this.customersServed = 0;
    this.happyCustomers = 0;
    this.day = Economy.freshDay();
    if (saved) Object.assign(this, saved);
  }

  static freshDay() {
    return {
      sales: 0, revenue: 0, cost: 0, upsells: 0, customers: 0,
      happy: 0, neutral: 0, unhappy: 0, lost: 0, stars: [], fiveStars: 0,
      alocasias: 0, monsteras: 0, goodConsults: 0, careActions: 0,
      purchase: 0, discarded: 0, reviews: [],
    };
  }

  get profit() {
    return this.revenue - this.cost;
  }

  get averageCheck() {
    return this.sales ? Math.round(this.revenue / this.sales) : 0;
  }

  canAfford(n) {
    return this.balance >= n;
  }

  spendOnPurchase(n) {
    this.balance -= n;
    this.purchaseExpenses += n;
    this.day.purchase += n;
  }

  /** продажа растения: цена, себестоимость */
  recordSale(price, cost) {
    this.balance += price;
    this.revenue += price;
    this.cost += cost;
    this.sales++;
    this.day.sales++;
    this.day.revenue += price;
    this.day.cost += cost;
  }

  recordUpsell(price, cost) {
    this.balance += price;
    this.revenue += price;
    this.cost += cost;
    this.day.revenue += price;
    this.day.cost += cost;
    this.day.upsells++;
  }

  reward(money) {
    this.balance += money;
  }

  toJSON() {
    return {
      balance: this.balance, revenue: this.revenue, cost: this.cost, sales: this.sales,
      purchaseExpenses: this.purchaseExpenses, discardedPlants: this.discardedPlants,
      customersServed: this.customersServed, happyCustomers: this.happyCustomers, day: this.day,
    };
  }
}
