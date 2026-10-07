'use strict';

/**
 * Главный класс игры: машина состояний, игровой цикл (requestAnimationFrame + deltaTime),
 * игровой день, покупатели, консультации, продажи, прогрессия и сохранение.
 *
 * Состояния: MAIN_MENU, INTRO, SHOP_MORNING, SHOP_OPEN, CUSTOMER_DIALOG, PLANT_INTERACTION,
 * SUPPLIER, CHECKOUT, DAY_REPORT, PROFILE, ACHIEVEMENTS, SETTINGS, PAUSED, LEVEL_UP, FINAL_AWARD
 */
class Game {
  static MIN_PER_SEC = 2.8;     // игровых минут в реальную секунду (~3,5 мин на день без пауз)
  static OPEN = 9 * 60;
  static CLOSE = 19 * 60;
  /** ускорение для отладки: index.html?speed=4 */
  static DEBUG_SPEED = Utils.clamp(Number(new URLSearchParams(location.search).get('speed')) || 1, 0.25, 20);

  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new Renderer(this.canvas);
    this.shop = new Shop();
    this.collision = new CollisionSystem(this.shop.bounds);
    this.particles = new ParticleSystem();
    this.settings = SaveManager.loadSettings();
    this.audio = new AudioManager(this.settings);
    this.ui = new UI(this);
    this.menu = new MenuScene(this.canvas);
    this.input = new InputHandler(this.canvas, this);

    this.state = 'MAIN_MENU';
    this.elapsed = 0;
    this.timeScale = 1;
    this.slowmoT = 0;
    this.lastTs = 0;
    this.pendingLevelUps = [];
    this.uid = 1;

    this.resetWorld();
    this.ui.showMenu();
    requestAnimationFrame((ts) => this.loop(ts));
  }

  // ===================================================================
  // ИНИЦИАЛИЗАЦИЯ
  // ===================================================================

  resetWorld() {
    this.day = 1;
    this.clock = Game.OPEN;
    this.phase = 'morning'; // morning | open | closing
    this.level = 1;
    this.xp = 0;
    this.rating = 4.0;
    this.ratingWeight = 3;
    this.plants = {};
    for (const d of PLANT_DATA) this.plants[d.id] = new Plant(d);
    this.economy = new Economy();
    this.supplier = new Supplier();
    this.pendingOrder = null;   // заказ сегодня → приедет завтра
    this.delivery = null;       // коробки у склада
    this.customersHistory = {};
    this.achievements = {};
    this.stats = { careTotal: 0, alocasiasSold: 0, monsterasSold: 0, rareSold: 0, pestsTreated: 0, daysPlayed: 0, regularsMet: 0 };
    this.quests = [];
    this.tutorial = { step: 0, done: false };
    this.finalShown = false;
    this.customers = [];
    this.spawnTimes = [];
    this.doorOpen = 0;
    this.doorT = 0;
    this.highlight = null;
    this.moveMarker = null;
    this.tutorialArrow = null;
    this.forceEvening = false;
    this.dustT = 0;
    this.player = new Player(...this.shop.points.start);
    this.applyLevel(false);
  }

  newGame() {
    this.resetWorld();
    for (const [id, n] of Object.entries(START_STOCK)) this.plants[id].stock = n;
    for (const p of Object.values(this.plants)) {
      p.hydration = Utils.rand(45, 72);
      p.nutrition = Utils.rand(50, 80);
      p.health = Utils.rand(82, 96);
    }
    // монстера пересохла — для обучения
    const m = this.plants.monstera_deliciosa;
    m.hydration = 14;
    m.health = 74;
    this.quests = this.generateQuests();
    this.state = 'INTRO';
    this.ui.hideMenu();
    this.ui.intro(() => this.ui.dayCard(this.day, () => this.startMorning()));
  }

  continueGame() {
    const data = SaveManager.load();
    if (!data) return;
    this.resetWorld();
    this.fromJSON(data);
    this.ui.hideMenu();
    this.ui.toast('С возвращением, Маша!', 'leaf');
    if (this.phase === 'open' || this.phase === 'closing') {
      this.phase = 'open';
      this.state = 'SHOP_OPEN';
      this.scheduleCustomers(true);
    } else {
      this.state = 'SHOP_MORNING';
    }
    this.ui.showHUD(true);
    this.ui.updateHUD();
    this.updateTutorialUI();
  }

  /** применить уровень: открыть растения, перестроить магазин, коллизии */
  applyLevel(giftNew, lvl = this.level) {
    const newly = [];
    for (const p of Object.values(this.plants)) {
      if (!p.unlocked && p.unlockLevel <= lvl) {
        p.unlocked = true;
        newly.push(p);
        if (giftNew) {
          p.stock += 1;
          p.health = 96; p.hydration = 60; p.nutrition = 70;
        }
      }
    }
    this.shop.build(lvl);
    this.shop.assign(Object.values(this.plants));
    this.collision.setObstacles(this.shop.obstacles);
    if (this.player && !this.collision.isFree(this.player.x, this.player.y)) {
      const c = this.collision.nearestFree(this.player.x, this.player.y);
      if (c) [this.player.x, this.player.y] = this.collision.cellCenter(c[0], c[1]);
    }
    return newly;
  }

  startMorning() {
    this.state = 'SHOP_MORNING';
    this.phase = 'morning';
    this.clock = Game.OPEN;
    this.ui.showHUD(true);
    this.ui.updateHUD();
    if (this.delivery && this.delivery.arrived) {
      this.ui.toast('Поставка приехала! Коробки ждут у склада.', 'box');
      this.audio.play('delivery');
    }
    this.updateTutorialUI();
    this.save();
    this.afterModal();
  }

  // ===================================================================
  // ИГРОВОЙ ЦИКЛ
  // ===================================================================

  loop(ts) {
    const dtRaw = this.lastTs ? Math.min(0.05, (ts - this.lastTs) / 1000) : 0;
    this.lastTs = ts;
    this.update(dtRaw);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  get inShop() {
    return this.state !== 'MAIN_MENU' && this.state !== 'INTRO';
  }

  /** мир «живёт» только когда не открыто модальное окно */
  get worldRunning() {
    return this.state === 'SHOP_MORNING' || this.state === 'SHOP_OPEN' || this.state === 'CHECKOUT';
  }

  get patienceFactor() {
    return 1;
  }

  update(dtRaw) {
    dtRaw *= Game.DEBUG_SPEED;
    if (this.state === 'MAIN_MENU' || this.state === 'INTRO') {
      this.menu.update(dtRaw);
      return;
    }
    // замедление на миг при новом уровне
    if (this.slowmoT > 0) {
      this.slowmoT -= dtRaw;
      this.timeScale = 0.25;
      if (this.slowmoT <= 0) {
        this.timeScale = 1;
        this.showNextLevelUp();
      }
    }
    const dt = dtRaw * this.timeScale;
    this.elapsed += dt;
    this.particles.update(dt);
    this.ambient(dt);
    if (this.moveMarker) this.moveMarker.t -= dt * 2;

    if (this.state === 'PLANT_INTERACTION' || this.state === 'LEVEL_UP' || this.state === 'FINAL_AWARD') {
      this.player.keyVec = { x: 0, y: 0 };
      this.player.update(dt, this);
    }
    if (!this.worldRunning) return;

    // клавиатура
    const v = this.input.vector;
    this.player.keyVec = v;
    if ((v.x || v.y) && this.pendingInteraction) {
      this.pendingInteraction = null;
      this.highlight = null;
    }
    this.player.update(dt, this);

    // дверь
    this.doorT -= dt;
    this.doorOpen = Utils.clamp(this.doorOpen + (this.doorT > 0 ? dt * 5 : -dt * 3), 0, 1);

    if (this.phase !== 'morning') {
      const prev = this.clock;
      if (this.state !== 'CHECKOUT') this.clock = Math.min(Game.CLOSE + 45, this.clock + dt * Game.MIN_PER_SEC);
      const dh = (this.clock - prev) / 60;
      if (dh > 0) for (const p of Object.values(this.plants)) p.tick(dh, this.level);
      this.updateSpawning();
      if (this.phase === 'open' && this.clock >= Game.CLOSE) this.closeShop();
      if (this.phase === 'closing' && this.customers.length === 0 && this.state === 'SHOP_OPEN') this.endDay();
    }

    for (const c of this.customers) c.update(dt, this);
    this.customers = this.customers.filter((c) => c.active);
    this.ui.updateHUD();
  }

  ambient(dt) {
    // пылинки в солнечном свете
    this.dustT -= dt;
    if (this.dustT <= 0 && this.particles.count < 200) {
      this.dustT = 0.35;
      const ev = Renderer.eveningK(this.clock);
      if (ev < 0.7) this.particles.emit('dust', Utils.rand(90, 210), Utils.rand(70, 190), 1);
    }
  }

  render() {
    if (this.state === 'MAIN_MENU' || this.state === 'INTRO') {
      this.menu.render(this.elapsed);
      return;
    }
    this.renderer.render(this);
  }

  // ===================================================================
  // ВВОД
  // ===================================================================

  isClickable(x, y) {
    if (!this.worldRunning) return false;
    if (this.customers.some((c) => c.hit(x, y))) return true;
    const z = this.shop.zones;
    if (Shop.inRect(x, y, z.counter) || Shop.inRect(x, y, z.computer) || Shop.inRect(x, y, z.storage)) return true;
    if (this.delivery && this.delivery.arrived && Shop.inRect(x, y, z.boxes)) return true;
    return !!this.shop.slotAt(x, y);
  }

  onEscape() {
    if (this.state === 'SHOP_MORNING' || this.state === 'SHOP_OPEN') this.openPause();
    else this.ui.escape();
  }

  onPointerDown(x, y) {
    if (!(this.state === 'SHOP_MORNING' || this.state === 'SHOP_OPEN')) return;
    if (this.player.busy) return;
    this.pendingInteraction = null;

    // 1. покупатели
    const hitC = this.customers.filter((c) => c.hit(x, y) && !c.fading).sort((a, b) => b.y - a.y)[0];
    if (hitC) {
      if (hitC.state === 'waitHelp') return this.goServe(hitC);
      if (hitC.state === 'waitCheckout' || hitC.state === 'toCheckout') return this.goCheckout();
      this.ui.speech(hitC, Utils.pick(['Я пока просто смотрю!', 'Ой, тут столько всего…', 'Секундочку, осматриваюсь.']));
      return;
    }
    const z = this.shop.zones;
    // 2. коробки поставки
    if (this.delivery && this.delivery.arrived && Shop.inRect(x, y, z.boxes)) {
      this.setHighlight(52, 112, 26, 8);
      return this.walkAndDo(...this.shop.points.boxes, 'left', () => this.openDelivery());
    }
    // 3. касса
    if (Shop.inRect(x, y, z.counter)) return this.goCheckout();
    // 4. компьютер
    if (Shop.inRect(x, y, z.computer)) {
      this.setHighlight(50, 228, 30, 7);
      return this.walkAndDo(...this.shop.points.computer, 'up', () => this.openSupplier());
    }
    // 5. склад
    if (Shop.inRect(x, y, z.storage)) {
      this.setHighlight(40, 82, 18, 5);
      return this.walkAndDo(...this.shop.points.storage, 'up', () => this.openStorage());
    }
    // 6. растение
    const slot = this.shop.slotAt(x, y);
    if (slot) {
      this.setHighlight(slot.x, slot.baseY, 11, 4);
      this.audio.play('pop');
      if (this.tutorial.step === 0 && slot.plantId === 'monstera_deliciosa') this.setTutorial(1);
      return this.walkAndDo(slot.ix, slot.iy, 'up', () => this.openPlant(slot));
    }
    // 7. пол — просто идём
    this.highlight = null;
    if (this.player.moveTo(this.collision, x, y)) {
      this.moveMarker = { x: Math.round(x), y: Math.round(y), t: 1 };
    }
  }

  setHighlight(x, y, rx, ry) {
    this.highlight = { x, y, rx, ry };
  }

  /** подойти к точке, повернуться и выполнить действие — без телепортации */
  walkAndDo(x, y, dir, action) {
    const near = Utils.dist(this.player.x, this.player.y, x, y) < 3;
    const done = () => {
      this.player.face(dir);
      this.highlight = null;
      action();
    };
    if (near) return done();
    const token = {};
    this.pendingInteraction = token;
    const ok = this.player.moveTo(this.collision, x, y, () => {
      if (this.pendingInteraction !== token) return;
      this.pendingInteraction = null;
      done();
    });
    if (!ok) {
      this.highlight = null;
      this.ui.toast('Туда не пройти.', 'warn');
    }
  }

  // ===================================================================
  // МОДАЛЬНЫЕ ОКНА
  // ===================================================================

  enterModal(state) {
    if (this.state === 'SHOP_MORNING' || this.state === 'SHOP_OPEN') this.returnState = this.state;
    this.state = state;
    this.player.keyVec = { x: 0, y: 0 };
  }

  exitModal() {
    this.state = this.returnState || (this.phase === 'morning' ? 'SHOP_MORNING' : 'SHOP_OPEN');
    this.ui.closePanel();
    this.afterModal();
  }

  afterModal() {
    if (this.pendingLevelUps.length && this.slowmoT <= 0) this.beginLevelUp();
  }

  openPause() {
    this.enterModal('PAUSED');
    this.ui.pause();
  }

  openPlant(slot) {
    const plant = this.plants[slot.plantId];
    if (!plant) return;
    this.enterModal('PLANT_INTERACTION');
    this.ui.plantPanel(plant, slot);
    if (this.tutorial.step <= 1 && !this.tutorial.done && plant.id === 'monstera_deliciosa') this.setTutorial(plant.state === 'DRY' ? 2 : 3);
  }

  openSupplier() {
    this.enterModal('SUPPLIER');
    this.ui.supplierPanel();
    if (this.tutorial.step === 6) this.setTutorial(99);
  }

  openStorage() {
    this.enterModal('PLANT_INTERACTION');
    this.ui.storagePanel();
  }

  openDelivery() {
    if (!this.delivery) return;
    this.enterModal('PLANT_INTERACTION');
    this.audio.play('delivery');
    this.ui.deliveryPanel(this.delivery);
  }

  // ===================================================================
  // УХОД ЗА РАСТЕНИЯМИ
  // ===================================================================

  slotPos(plant) {
    const s = this.shop.slotOf(plant.id);
    return s ? [s.x, s.baseY] : [this.player.x, this.player.y - 20];
  }

  waterPlant(plant) {
    const wasDry = plant.state === 'DRY' || plant.hydration < 45;
    const res = plant.water();
    const [sx, sy] = this.slotPos(plant);
    this.player.doAction('WATERING', 0.9, () => {
      if (res === 'over') {
        this.player.setMood('worried', 1.4);
        this.ui.toast('Ой! Земля и так была влажной — это перелив.', 'warn');
      } else {
        this.player.setMood('happy', 1.0);
        this.particles.emit('sparkle', sx, sy - 14, 6, { spread: 8 });
      }
    });
    this.audio.play('water');
    for (let i = 0; i < 4; i++) setTimeout(() => this.particles.emit('drop', sx + Utils.rand(-6, 6), sy - 22, 3), 120 + i * 130);
    this.registerCare(wasDry && res !== 'over' ? 4 : 0);
    if (this.tutorial.step === 2 && plant.id === 'monstera_deliciosa') this.setTutorial(3);
    return res;
  }

  fertilizePlant(plant) {
    const needed = plant.nutrition < 50;
    const res = plant.fertilize();
    const [sx, sy] = this.slotPos(plant);
    this.player.doAction('INSPECTING', 0.7, () => {
      if (res === 'over') {
        this.player.setMood('worried', 1.4);
        this.ui.toast('Слишком много удобрений — корням это не нравится.', 'warn');
      } else {
        this.particles.emit('sparkle', sx, sy - 12, 8, { spread: 9 });
      }
    });
    this.audio.play('pop');
    this.registerCare(needed && res !== 'over' ? 4 : 0);
    return res;
  }

  inspectPlant(plant) {
    const r = plant.inspect(this.day);
    this.player.doAction('INSPECTING', 0.8, () => {
      if (r.found) this.player.setMood('worried', 1.2);
    });
    if (r.first && !r.found) this.addXP(2);
    return r;
  }

  treatPlant(plant) {
    plant.treat();
    this.stats.pestsTreated++;
    this.addXP(10);
    const [sx, sy] = this.slotPos(plant);
    this.particles.emit('sparkle', sx, sy - 14, 10, { spread: 10 });
    this.audio.play('correct');
    this.unlockAchievement('sharp_eye');
  }

  registerCare(xp) {
    this.stats.careTotal++;
    this.economy.day.careActions++;
    if (xp) this.addXP(xp);
    if (this.stats.careTotal >= 25) this.unlockAchievement('green_hands');
    this.checkQuests();
  }

  setPrice(plant, price) {
    plant.playerPrice = Math.max(50, Math.round(price / 10) * 10);
  }

  acceptDelivery() {
    const d = this.delivery;
    if (!d) return;
    for (const [id, q] of Object.entries(d.items)) this.plants[id].addStock(q);
    this.delivery = null;
    this.particles.emit('star', 52, 100, 12, { spread: 16 });
    this.audio.play('coins');
    this.ui.toast('Растения расставлены по местам!', 'leaf');
    this.checkCollector();
    this.save();
  }

  placeOrder() {
    const r = this.supplier.place(this.plants, this.economy, this.pendingOrder);
    if (r.error) {
      this.ui.toast(r.error, 'warn');
      this.audio.play('wrong');
      return false;
    }
    this.pendingOrder = r.order;
    this.audio.play('coins');
    this.ui.toast(`Заказ оформлен: ${Utils.money(r.sum)}. Приедет завтра утром!`, 'box');
    this.save();
    return true;
  }

  // ===================================================================
  // ДЕНЬ
  // ===================================================================

  openShop() {
    if (this.phase !== 'morning' || this.state !== 'SHOP_MORNING') return;
    this.phase = 'open';
    this.state = 'SHOP_OPEN';
    this.audio.play('bell');
    this.ui.toast('Магазин открыт! Ждём покупателей.', 'leaf');
    this.scheduleCustomers(false);
    if (!this.tutorial.done && this.tutorial.step < 4) this.setTutorial(4);
    this.ui.updateHUD();
  }

  scheduleCustomers(resume) {
    let n = 5 + (Math.random() < 0.5 ? 1 : 0) + (this.level >= 3 ? 1 : 0) + (this.level >= 9 ? 1 : 0) + (this.level >= 12 ? 1 : 0);
    n = Math.min(n, 8);
    const start = Math.max(this.clock + 8, Game.OPEN + 6);
    const end = 17 * 60 + 40;
    const times = [];
    if (end > start) {
      const span = end - start;
      for (let i = 0; i < n; i++) times.push(start + (span * (i + Utils.rand(0.05, 0.85))) / n);
    }
    if (!resume && this.day === 1) times[0] = Game.OPEN + 5;
    this.spawnTimes = times.sort((a, b) => a - b);
  }

  get maxCustomers() {
    return this.level >= 3 ? 3 : 2;
  }

  updateSpawning() {
    if (this.phase !== 'open') return;
    if (!this.spawnTimes.length || this.clock < this.spawnTimes[0]) return;
    if (this.customers.length >= this.maxCustomers) {
      this.spawnTimes[0] = this.clock + 8;
      return;
    }
    this.spawnTimes.shift();
    this.spawnCustomer();
  }

  closeShop() {
    this.phase = 'closing';
    this.spawnTimes = [];
    this.ui.toast('19:00 — магазин закрывается. Обслужи последних покупателей.', 'moon');
    // те, кто ещё не дождался консультации, уходят без обид
    for (const c of this.customers) {
      if (['enter', 'browse', 'look', 'approach'].includes(c.state)) this.customerLeave(c, false);
    }
  }

  endDay() {
    if (this.state === 'DAY_REPORT') return;
    this.enterModal('DAY_REPORT');
    this.stats.daysPlayed++;
    const d = this.economy.day;
    // задание «не потерять покупателей» засчитывается в конце дня
    this.checkQuests(true);
    if (d.customers >= 4 && d.unhappy === 0 && d.lost === 0) this.unlockAchievement('all_happy');
    const dayRating = d.stars.length ? d.stars.reduce((a, b) => a + b, 0) / d.stars.length : null;
    const reviews = Utils.shuffle(d.reviews).sort((a, b) => b.stars - a.stars);
    const picked = [];
    // 2–4 отзыва: разные по тону
    for (const r of reviews) {
      if (picked.length >= 4) break;
      if (picked.length < 2 || !picked.some((p) => p.stars === r.stars) || Math.random() < 0.4) picked.push(r);
    }
    const report = {
      day: this.day, sales: d.sales, revenue: d.revenue, cost: d.cost, profit: d.revenue - d.cost,
      avg: d.sales ? Math.round(d.revenue / d.sales) : 0, happy: d.happy, neutral: d.neutral, unhappy: d.unhappy,
      lost: d.lost, dayRating, rating: this.rating, reviews: picked, purchase: d.purchase, upsells: d.upsells,
      quests: this.quests,
    };
    this.save();
    this.ui.dayReport(report);
  }

  nextDay() {
    this.ui.closePanel();
    this.day++;
    this.clock = Game.OPEN;
    this.phase = 'morning';
    this.customers = [];
    // ночь: растения немного сохнут; погибшие — списываются
    let discarded = 0;
    for (const p of Object.values(this.plants)) discarded += p.overnight();
    this.economy.discardedPlants += discarded;
    this.economy.day = Economy.freshDay();
    this.economy.day.discarded = discarded;
    if (this.pendingOrder) {
      this.delivery = Object.assign({}, this.pendingOrder, { arrived: true });
      this.pendingOrder = null;
    }
    this.quests = this.generateQuests();
    this.player.x = this.shop.points.start[0];
    this.player.y = this.shop.points.start[1];
    this.player.stopMoving();
    this.player.face('down');
    this.state = 'INTRO_DAY';
    this.ui.dayCard(this.day, () => {
      this.startMorning();
      if (discarded) this.ui.toast(`За ночь погибло растений: ${discarded}. Пришлось списать…`, 'warn');
    });
  }

  // ===================================================================
  // ПОКУПАТЕЛИ
  // ===================================================================

  spawnCustomer() {
    const eligible = ARCHETYPES.filter((a) => a.minLevel <= this.level);
    // постоянный клиент?
    let regular = null, returning = null;
    const regs = REGULARS.filter((r) => {
      const h = this.customersHistory[r.name];
      if (this.customers.some((c) => c.name === r.name)) return false;
      if (!h || !h.length) return true;
      return h[h.length - 1].day <= this.day - 2;
    });
    if (regs.length && Math.random() < (this.day === 1 ? 0.5 : 0.38)) {
      regular = Utils.pick(regs);
      const h = this.customersHistory[regular.name];
      if (h && h.length && h[h.length - 1].quality !== 'none') returning = h[h.length - 1];
    }
    let arch, gender, name, look, lookKey;
    if (regular) {
      arch = ARCHETYPES.find((a) => a.id === 'office');
      gender = regular.gender;
      name = regular.name;
      look = regular.look;
      lookKey = 'reg_' + regular.name;
    } else {
      const weighted = [];
      for (const a of eligible) {
        const w = ['hard', 'collector', 'vip'].includes(a.id) ? 2 : 3;
        for (let i = 0; i < w; i++) weighted.push(a);
      }
      arch = Utils.pick(weighted);
      gender = Utils.pick(arch.genders);
      if (arch.id === 'granny') name = Utils.pick(NAMES.granny);
      else if (arch.id === 'retiree') name = Utils.pick(NAMES.retiree);
      else name = Utils.pick(NAMES[gender]);
      const L = arch.looks;
      look = {
        skin: Utils.pick(L.skin), hair: Utils.pick(L.hair), top: Utils.pick(L.top),
        bottom: Utils.pick(L.bottom), style: Utils.pick(L.style), acc: Utils.pick(L.acc),
      };
      if (gender === 'm' && (look.style === 'long' || look.style === 'pony' || look.style === 'bun')) look.style = 'short';
      if (gender === 'f' && look.acc === 'beard') look.acc = 'none';
      lookKey = Object.values(look).join('');
    }
    const [dx, dy] = this.shop.points.doorOutside;
    const c = new Customer({ uid: this.uid++, x: dx, y: dy, name, gender, look, lookKey, archetype: arch, regular, returning });
    this.customers.push(c);
    this.economy.day.customers++;
    this.doorT = 1.2;
    this.audio.play('bell');
    c.moveTo(this.collision, ...this.shop.points.doorInside, () => this.customerBrowse(c));
    if (!this.tutorial.done && this.tutorial.step === 4) this.setTutorial(5);
  }

  customerBrowse(c) {
    if (this.phase === 'closing') return this.customerLeave(c, false);
    const slots = this.shop.slots.filter((s) => s.plantId);
    if (!slots.length) return this.customerApproach(c);
    const s = Utils.pick(slots);
    c.state = 'browse';
    c.lastLooked = s.plantId;
    const ok = c.moveTo(this.collision, s.ix + Utils.rand(-3, 3), s.iy + Utils.rand(0, 4), () => {
      c.state = 'look';
      c.dir = 'up';
      c.lookT = Utils.rand(1.6, 2.8);
      c.lookAroundT = Utils.rand(0.8, 1.6);
      if (Math.random() < 0.4) c.heartT = 1.2;
    });
    if (!ok) this.customerApproach(c);
  }

  customerApproach(c) {
    if (this.phase === 'closing') return this.customerLeave(c, false);
    c.state = 'approach';
    const p = this.player;
    const behindCounter = p.y < 128 && p.x > 308 && p.x < 400;
    const cands = behindCounter ? [[300, 150], [290, 160], [310, 166]] : [[p.x + 18, p.y + 4], [p.x - 18, p.y + 4], [p.x, p.y + 16], [p.x + 14, p.y + 16], [p.x - 14, p.y + 16]];
    const others = this.customers.filter((o) => o !== c);
    let target = cands.find(([x, y]) => this.collision.isFree(x, y) && !others.some((o) => Utils.dist(o.x, o.y, x, y) < 10));
    if (!target) target = [260, 160];
    const ok = c.moveTo(this.collision, target[0], target[1], () => {
      c.state = 'waitHelp';
      c.faceTo(this.player.x, this.player.y);
    });
    if (!ok) {
      c.state = 'waitHelp';
    }
  }

  customerGivesUp(c) {
    if (c.fading || c.state === 'leave') return;
    const d = this.economy.day;
    d.lost++;
    d.unhappy++;
    if (c.chosen) c.chosen.stock++; // вернуть зарезервированное растение
    this.ui.speech(c, LINES.leaveAngry, 3.5);
    this.player.setMood('worried', 2);
    this.addReview(c, Utils.pick([1, 2]), 'lost');
    this.recordHistory(c, 'none');
    this.customerLeave(c, false);
    this.checkQuests();
  }

  customerLeave(c, happy) {
    c.state = 'leave';
    c.queueIndex = -1;
    const [ix, iy] = this.shop.points.doorInside;
    const exit = () => {
      this.doorT = 0.8;
      c.moveTo(this.collision, ...this.shop.points.doorOutside, () => { c.fading = true; });
    };
    if (!c.moveTo(this.collision, ix, iy, exit)) c.fading = true;
    if (happy) this.particles.emit('heart', c.x, c.y - 32, 1);
    this.reflowQueue();
  }

  goServe(c) {
    this.setHighlight(c.x, c.y, 9, 3);
    const p = this.player;
    const side = p.x < c.x ? -1 : 1;
    const cands = [[c.x + side * 16, c.y], [c.x - side * 16, c.y], [c.x, c.y + 12], [c.x, c.y - 10]];
    const target = cands.find(([x, y]) => this.collision.isFree(x, y)) || [c.x, c.y + 12];
    this.walkAndDo(target[0], target[1], 'down', () => {
      if (c.state !== 'waitHelp') return;
      this.player.faceTo(c.x, c.y);
      c.faceTo(this.player.x, this.player.y);
      this.startConsultation(c);
    });
  }

  // ===================================================================
  // КОНСУЛЬТАЦИЯ
  // ===================================================================

  /** доля выполненных критериев (0..1) */
  matchScore(plant, crit) {
    let total = 0, ok = 0;
    for (const [k, v] of Object.entries(crit)) {
      total++;
      let r = false;
      switch (k) {
        case 'maxLight': r = plant.lightNeed <= v; break;
        case 'minLight': r = plant.lightNeed >= v; break;
        case 'petSafe': r = plant.petSafe === v; break;
        case 'maxDifficulty': r = plant.difficulty <= v; break;
        case 'maxWater': r = plant.waterNeed <= v; break;
        case 'minWater': r = plant.waterNeed >= v; break;
        case 'minHumidity': r = plant.humidityNeed >= v; break;
        case 'maxHumidity': r = plant.humidityNeed <= v; break;
        case 'size': r = plant.size === v; break;
        case 'flowering': r = plant.flowering === v; break;
        case 'trailing': r = plant.trailing === v; break;
        case 'patterned': r = plant.patterned === v; break;
        case 'minRarity': r = plant.rarity >= v; break;
        case 'family': r = plant.family === v; break;
        case 'families': r = v.includes(plant.family); break;
        case 'maxPrice': r = plant.playerPrice <= v; break;
        default: r = true;
      }
      if (r) ok++;
    }
    return total ? ok / total : 1;
  }

  get inStock() {
    return Object.values(this.plants).filter((p) => p.unlocked && p.stock > 0);
  }

  pickRequest(c) {
    const a = c.archetype.id;
    let pool = REQUESTS.filter((r) => (!r.minLevel || r.minLevel <= this.level) && (!r.only || r.only.includes(a)));
    const special = pool.filter((r) => r.only && r.only.includes(a));
    if (special.length && Math.random() < 0.75) pool = special;
    else pool = pool.filter((r) => !r.only);
    if (a === 'student' && Math.random() < 0.4) {
      const st = pool.find((r) => r.id === 'student');
      if (st) return st;
    }
    // стараемся выбрать запрос, на который есть хороший ответ в наличии
    const stock = this.inStock;
    const sh = Utils.shuffle(pool);
    for (const r of sh) if (stock.some((p) => this.matchScore(p, r.crit) === 1)) return r;
    return sh[0];
  }

  startConsultation(c) {
    this.enterModal('CUSTOMER_DIALOG');
    c.state = 'dialog';
    this.economy.customersServed++;
    if (this.tutorial.step === 5) this.ui.tip(null);
    let intro = '';
    if (c.returning) {
      const prev = this.plants[c.returning.plantId];
      const lines = c.returning.quality === 'bad' ? LINES.returnBad : LINES.returnGood;
      let l = Utils.pick(lines).replace('{short}', prev ? prev.short : 'растение').replace('{acc}', prev ? prev.acc : 'растение');
      l = Utils.pg(l, prev ? prev.g : 'n');
      intro = l + ' ';
      this.stats.regularsMet++;
      this.unlockAchievement('regular');
      if (c.returning.quality !== 'bad') c.satisfaction += 6;
    } else {
      intro = Utils.pick(LINES.greet) + ' ';
    }
    intro = Utils.g(intro, c.gender);

    const stock = this.inStock;
    if (!stock.length) {
      this.ui.dialog(c, { text: intro + 'Ой… а у вас совсем пусто? Ладно, зайду, когда будет поставка.', options: [{ label: 'Извините! Приходите завтра', onClick: () => this.endConsultationNoSale(c, 3, 'empty') }] });
      return;
    }

    // иногда покупатель сам выбрал растение
    const looked = c.lastLooked && this.plants[c.lastLooked];
    if (Math.random() < 0.3 && looked && looked.stock > 0) {
      const ctx = Utils.pick(SELF_CHOICE);
      c.selfChoice = { plant: looked, ctx };
      const t1 = Utils.pg(LINES.selfPick.replace('{name}', looked.short), looked.g);
      const t2 = Utils.g(Utils.pg(ctx.q, looked.g), c.gender);
      this.ui.dialog(c, {
        text: intro + Utils.capitalize(t1) + ' ' + t2,
        showPlant: looked,
        options: [
          { label: 'ПОДОЙДЁТ', cls: 'good', onClick: () => this.selfChoiceAnswer(c, true) },
          { label: 'ЛУЧШЕ ВЫБРАТЬ ДРУГОЕ', onClick: () => this.selfChoiceAnswer(c, false) },
        ],
      });
      return;
    }

    c.request = this.pickRequest(c);
    this.ui.dialog(c, {
      text: intro + Utils.g(c.request.text, c.gender),
      options: [{ label: 'Давай подберём!', cls: 'good', onClick: () => this.showPlantChoice(c, c.request.crit) }],
      hint: 'Запрос: ' + c.request.ctx,
    });
  }

  selfChoiceAnswer(c, yes) {
    const { plant, ctx } = c.selfChoice;
    const fits = this.matchScore(plant, ctx.crit) === 1;
    c.request = { crit: ctx.crit, ctx: 'вопрос о выбранном растении' };
    if (yes) {
      this.applyChoice(c, plant, fits ? 'perfect' : 'bad');
    } else if (fits) {
      c.satisfaction -= 6;
      this.ui.dialog(c, {
        text: Utils.g(Utils.pg('Правда? Мне казалось, [она|он|оно] как раз подходит… Ну ладно, что посоветуешь?', plant.g), c.gender),
        options: [{ label: 'Выбрать растение', onClick: () => this.showPlantChoice(c, ctx.crit) }],
      });
    } else {
      c.satisfaction += 12;
      this.addXP(6);
      this.audio.play('correct');
      this.ui.dialog(c, {
        text: Utils.g('Ох, хорошо, что спросил{а|}! Спасибо за честность. Тогда что посоветуешь?', c.gender),
        options: [{ label: 'Выбрать растение', cls: 'good', onClick: () => this.showPlantChoice(c, ctx.crit) }],
      });
    }
  }

  showPlantChoice(c, crit) {
    this.ui.plantChoice(c, this.inStock, (plant) => {
      const s = this.matchScore(plant, crit);
      const best = Math.max(...this.inStock.map((p) => this.matchScore(p, crit)));
      let q = 'bad';
      if (s === 1) q = 'perfect';
      else if (s >= 0.5 && s >= best) q = 'good';
      else if (s >= 0.66) q = 'good';
      this.applyChoice(c, plant, q);
    }, () => this.endConsultationNoSale(c, 3, 'nothing'));
  }

  applyChoice(c, plant, quality) {
    c.chosen = plant;
    c.consult = quality;
    const d = this.economy.day;
    if (quality === 'perfect') {
      c.satisfaction += 25;
      this.addXP(30);
      d.goodConsults++;
      this.audio.play('correct');
      this.player.setMood('happy', 1.4);
      this.particles.emit('sparkle', c.x, c.y - 26, 10, { spread: 10 });
    } else if (quality === 'good') {
      c.satisfaction += 8;
      this.addXP(15);
      d.goodConsults++;
      this.audio.play('correct');
      this.particles.emit('sparkle', c.x, c.y - 26, 5, { spread: 8 });
    } else {
      c.satisfaction -= 25;
      this.addXP(3);
      this.audio.play('wrong');
    }
    const line = Utils.g(Utils.pg(Utils.pick(LINES[quality]), plant.g), c.gender);
    const next = () => (Math.random() < 0.55 ? this.askQuestion(c) : this.priceStage(c));
    this.ui.dialog(c, { text: line, showPlant: plant, options: [{ label: 'Дальше', onClick: next }] });
    this.checkQuests();
  }

  askQuestion(c) {
    const plant = c.chosen;
    const type = Utils.pick(['water', 'light', 'humidity', 'pet', 'fert']);
    const Q = QUESTIONS[type];
    let correct, wrong = [];
    if (type === 'pet') {
      correct = Q.answers[String(plant.petSafe)];
      wrong = [Q.answers[String(!plant.petSafe)]];
    } else if (type === 'fert') {
      correct = Q.answers.yes;
      wrong = Q.wrong.slice();
    } else {
      const v = plant[Q.key];
      correct = Q.answers[v];
      wrong = Object.entries(Q.answers).filter(([k]) => Number(k) !== v).map(([, t]) => t).concat(Q.wrong);
      wrong = Utils.shuffle(wrong).slice(0, 2);
    }
    const opts = Utils.shuffle([{ t: correct, ok: true }, ...wrong.map((t) => ({ t, ok: false }))]);
    this.ui.dialog(c, {
      text: Utils.pg(Q.q, plant.g),
      showPlant: plant,
      options: opts.map((o) => ({
        label: Utils.pg(o.t, plant.g),
        onClick: () => {
          if (o.ok) {
            c.satisfaction += 12;
            this.addXP(10);
            this.audio.play('correct');
            this.particles.emit('sparkle', c.x, c.y - 26, 6, { spread: 8 });
          } else {
            c.satisfaction -= 12;
            this.audio.play('wrong');
          }
          const line = Utils.g(Utils.pick(o.ok ? LINES.answerRight : LINES.answerWrong), c.gender);
          this.ui.dialog(c, { text: line, options: [{ label: 'Дальше', onClick: () => this.priceStage(c) }] });
        },
      })),
    });
  }

  priceStage(c) {
    const plant = c.chosen;
    if (plant.stock <= 0) {
      return this.ui.dialog(c, { text: Utils.pg('Ой, а [она|он|оно] уже закончил[ась|ся|ось]? Жаль…', plant.g), options: [{ label: 'Простите!', onClick: () => this.endConsultationNoSale(c, 2, 'nothing') }] });
    }
    const ratio = plant.priceRatio / plant.valueFactor;
    const eff = 1 + (ratio - 1) * c.archetype.priceSens;
    const priceTxt = Utils.money(plant.playerPrice);
    let buys = true, line, tag = 'fair';
    if (eff < 0.9) {
      c.satisfaction += 6;
      line = Utils.pick(LINES.cheap);
      tag = 'cheap';
    } else if (eff <= 1.1) {
      line = Utils.pick(LINES.fair);
    } else if (eff <= 1.3) {
      tag = 'pricey';
      const refuse = ((eff - 1.1) / 0.2) * 0.5 - (c.satisfaction - 60) / 120;
      buys = Math.random() > refuse;
      if (buys) { c.satisfaction -= 6; line = Utils.pick(LINES.pricey); } else line = Utils.pick(LINES.priceyRefuse);
    } else {
      tag = 'expensive';
      const refuse = 0.6 + (eff - 1.3) - (c.satisfaction - 70) / 150;
      buys = Math.random() > refuse;
      if (buys) { c.satisfaction -= 18; line = Utils.pick(LINES.expensiveBuy); } else line = Utils.pick(LINES.expensiveRefuse);
    }
    c.priceReaction = tag;
    line = Utils.g(Utils.pg(line.replace('{price}', priceTxt).replace('{short}', plant.short), plant.g), c.gender);
    line = Utils.capitalize(line);
    if (!buys) {
      this.audio.play('wrong');
      this.ui.dialog(c, {
        text: line,
        showPlant: plant,
        options: [{ label: 'Понимаю, приходите ещё', onClick: () => this.endConsultationNoSale(c, tag === 'expensive' ? 2 : 3, 'price') }],
      });
      return;
    }
    plant.stock--; // растение отложено для покупателя
    this.ui.dialog(c, {
      text: line + ' Пойду на кассу!',
      showPlant: plant,
      options: [{ label: 'Жду на кассе!', cls: 'good', onClick: () => this.toCheckout(c) }],
    });
  }

  endConsultationNoSale(c, stars, tag) {
    this.ui.closeDialog();
    this.state = this.phase === 'morning' ? 'SHOP_MORNING' : 'SHOP_OPEN';
    const d = this.economy.day;
    if (stars >= 3) d.neutral++; else d.unhappy++;
    this.addReview(c, stars, tag);
    this.recordHistory(c, 'none');
    this.ui.speech(c, Utils.pick(LINES.refuseLeave));
    this.customerLeave(c, false);
    this.afterModal();
  }

  toCheckout(c) {
    this.ui.closeDialog();
    this.state = 'SHOP_OPEN';
    c.state = 'toCheckout';
    c.queueOrder = this.uid++;
    this.reflowQueue();
    if (!this.tutorial.done && this.tutorial.step <= 5) this.setTutorial(6.5);
    this.afterModal();
  }

  /** выстроить очередь у кассы */
  reflowQueue() {
    const q = this.customers.filter((c) => ['toCheckout', 'waitCheckout', 'paying'].includes(c.state)).sort((a, b) => a.queueOrder - b.queueOrder);
    q.forEach((c, i) => {
      if (c.queueIndex === i || c.state === 'paying') return;
      c.queueIndex = i;
      const spots = this.shop.points.checkoutQueue;
      const [x, y] = spots[Math.min(i, spots.length - 1)];
      c.state = 'toCheckout';
      const ok = c.moveTo(this.collision, x, y, () => {
        c.state = 'waitCheckout';
        c.dir = i === 0 ? 'up' : 'up';
      });
      if (!ok) c.state = 'waitCheckout';
    });
  }

  goCheckout() {
    this.setHighlight(354, 136, 34, 6);
    this.walkAndDo(...this.shop.points.mashaCheckout, 'down', () => this.tryCheckout());
  }

  tryCheckout() {
    const c = this.customers.find((x) => x.state === 'waitCheckout' && x.queueIndex === 0);
    if (!c) {
      const coming = this.customers.find((x) => x.state === 'toCheckout');
      this.ui.toast(coming ? 'Покупатель уже идёт к кассе — подожди секунду.' : 'У кассы пока никого нет.', 'info');
      return;
    }
    // допродажа
    const plant = c.chosen;
    const ups = UPSELLS.filter((u) => u.minLevel <= this.level && (!u.minRarity || plant.rarity >= u.minRarity) && (!u.families || u.families.includes(plant.family)));
    const fit = ups.filter((u) => u.families);
    const offer = fit.length && Math.random() < 0.7 ? Utils.pick(fit) : Utils.pick(ups);
    this.enterModal('CHECKOUT_UPSELL');
    c.state = 'paying';
    this.ui.upsell(c, plant, offer, (offered) => {
      this.ui.closeDialog();
      this.state = 'CHECKOUT';
      let upsellOk = false;
      if (offered) {
        const pAccept = Utils.clamp(0.3 + (c.satisfaction - 50) / 110 + (offer.families ? 0.2 : 0), 0.08, 0.9);
        upsellOk = Math.random() < pAccept;
        if (!upsellOk) c.satisfaction -= 3;
        this.ui.speech(c, Utils.pick(upsellOk ? LINES.upsellYes : LINES.upsellNo));
      }
      c.upsell = upsellOk ? offer : null;
      this.player.doAction('CHECKOUT', 1.1, () => this.finalizeSale(c));
      this.audio.play('checkout');
    });
  }

  finalizeSale(c) {
    const plant = c.chosen;
    const price = plant.playerPrice;
    const eco = this.economy;
    eco.recordSale(price, plant.purchasePrice);
    let total = price, profit = price - plant.purchasePrice;
    if (c.upsell) {
      eco.recordUpsell(c.upsell.price, c.upsell.cost);
      total += c.upsell.price;
      profit += c.upsell.price - c.upsell.cost;
      this.addXP(8);
    }
    plant.sold++;
    const d = eco.day;
    if (plant.family === 'alocasia') { d.alocasias++; this.stats.alocasiasSold++; }
    if (plant.family === 'monstera') { d.monsteras++; this.stats.monsterasSold++; }
    if (plant.rarity >= 3) { this.stats.rareSold++; this.unlockAchievement('rare_find'); }
    if (c.waitedLong) c.satisfaction -= 10;
    const sat = c.satisfaction;
    const stars = sat >= 78 ? 5 : sat >= 62 ? 4 : sat >= 45 ? 3 : sat >= 30 ? 2 : 1;
    if (stars >= 4) { d.happy++; eco.happyCustomers++; } else if (stars === 3) d.neutral++; else d.unhappy++;
    this.addReview(c, stars, c.consult === 'bad' ? 'badConsult' : c.priceReaction);
    this.recordHistory(c, c.consult === 'bad' ? 'bad' : 'good');
    this.addXP(20 + plant.rarity * 10 + (stars === 5 ? 15 : 0));

    // эффекты у кассы
    const [mx, my] = this.shop.points.mashaCheckout;
    this.ui.floater(mx, my - 44, '+' + Utils.money(total), 'money');
    setTimeout(() => this.ui.floater(mx, my - 34, 'Прибыль ' + (profit >= 0 ? '+' : '') + Utils.money(profit), 'profit'), 350);
    this.particles.emit('coin', mx, my - 18, 10);
    this.particles.emit('sparkle', mx, my - 24, 6, { spread: 10 });
    this.audio.play('coins');
    this.player.setMood('happy', 1.6);
    this.ui.speech(c, Utils.pick(LINES.thanks));

    this.state = 'SHOP_OPEN';
    this.customerLeave(c, stars >= 4);
    this.unlockAchievement('first_sale');
    if (this.stats.alocasiasSold >= 8) this.unlockAchievement('alocasia_queen');
    if (this.stats.monsterasSold >= 8) this.unlockAchievement('monstera_lover');
    if (eco.balance >= 50000) this.unlockAchievement('business_lady');
    this.checkQuests();
    if (!this.tutorial.done && this.tutorial.step < 7) this.setTutorial(7);
    this.save();
    this.afterModal();
  }

  addReview(c, stars, tag) {
    const d = this.economy.day;
    d.stars.push(stars);
    if (stars === 5) {
      d.fiveStars++;
      this.unlockAchievement('five_stars');
    }
    this.rating = (this.rating * this.ratingWeight + stars) / (this.ratingWeight + 1);
    this.ratingWeight = Math.min(30, this.ratingWeight + 1);
    let text;
    const plant = c.chosen;
    if (tag === 'lost') text = Utils.pick(['Долго ждал{а|}, так ничего и не купил{а|}.', 'Ушёл{а|} без покупки. Слишком долго ждать.']);
    else if (tag === 'price' || (tag === 'expensive' && stars <= 3)) text = Utils.pick(['Хорошие растения, но цены кусаются.', 'Цены как в ювелирном. Не моё.']);
    else if (tag === 'badConsult') text = Utils.pick(['Мне посоветовали что-то не то… Посмотрим, выживет ли.', 'Неплохо, но совет был не совсем про меня.']);
    else if (tag === 'empty' || tag === 'nothing') text = 'Хотел{а|} купить растение, но подходящего не нашлось.';
    else if (c.waitedLong && stars >= 4) text = 'Очень красивый магазин. Немного пришлось подождать.';
    else text = Utils.pick(REVIEWS[stars] || REVIEWS[3]);
    text = text.replace('{acc}', plant ? plant.acc : 'растение').replace('{short}', plant ? Utils.capitalize(plant.short) : 'Растение');
    d.reviews.push({ name: c.name, stars, text: Utils.g(text, c.gender) });
  }

  recordHistory(c, quality) {
    if (!c.regular) return;
    const h = this.customersHistory[c.name] || (this.customersHistory[c.name] = []);
    // если растение не куплено — следующий визит без воспоминаний о нём
    const bought = quality !== 'none' && c.chosen;
    h.push({ day: this.day, plantId: bought ? c.chosen.id : null, quality: bought ? quality : 'none' });
    if (h.length > 6) h.shift();
  }

  // ===================================================================
  // ПРОГРЕССИЯ
  // ===================================================================

  get xpToNext() {
    return XP_TO_NEXT(this.level);
  }

  addXP(n) {
    if (!n) return;
    this.xp += n;
    while (this.level < 15 && this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.pendingLevelUps.push(this.level);
    }
    if (this.pendingLevelUps.length && this.worldRunning && this.slowmoT <= 0 && this.state !== 'CHECKOUT') this.beginLevelUp();
  }

  beginLevelUp() {
    if (!this.pendingLevelUps.length || this.slowmoT > 0) return;
    if (!(this.state === 'SHOP_MORNING' || this.state === 'SHOP_OPEN')) return;
    this.slowmoT = 0.9;
    this.audio.play('levelup');
    this.particles.emit('leaf', this.player.x, this.player.y - 30, 26, { spread: 30 });
    this.particles.emit('sparkle', this.player.x, this.player.y - 20, 10, { spread: 16 });
  }

  showNextLevelUp() {
    const lvl = this.pendingLevelUps.shift();
    if (!lvl) return;
    if (!(this.state === 'SHOP_MORNING' || this.state === 'SHOP_OPEN')) {
      this.pendingLevelUps.unshift(lvl);
      return;
    }
    const newly = this.applyLevel(true, lvl);
    this.enterModal('LEVEL_UP');
    this.save();
    this.ui.levelUp(lvl, LEVELS[lvl - 1], newly, () => {
      this.exitModal();
      if (lvl === 15 && !this.finalShown) this.showFinal();
      else if (this.pendingLevelUps.length) this.beginLevelUp();
    });
  }

  showFinal() {
    this.finalShown = true;
    this.forceEvening = true;
    this.player.moveTo(this.collision, ...this.shop.points.mashaCheckout, () => this.player.face('down'));
    this.unlockAchievement('dream_owner');
    setTimeout(() => {
      this.enterModal('FINAL_AWARD');
      this.audio.play('achievement');
      this.particles.emit('star', 354, 90, 30, { spread: 40 });
      this.ui.finalAward(() => {
        this.forceEvening = false;
        this.exitModal();
        this.save();
      });
    }, 1600);
  }

  unlockAchievement(id) {
    if (this.achievements[id]) return;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return;
    this.achievements[id] = { day: this.day };
    this.audio.play('achievement');
    this.particles.emit('star', this.player.x, this.player.y - 36, 10, { spread: 12 });
    this.ui.achievementToast(a);
  }

  checkCollector() {
    const n = Object.values(this.plants).filter((p) => p.stock > 0).length;
    if (n >= 12) this.unlockAchievement('collector');
  }

  generateQuests() {
    const pool = Utils.shuffle(QUESTS.filter((q) => !q.minLevel || q.minLevel <= this.level));
    const hasAloc = Object.values(this.plants).some((p) => p.unlocked && p.family === 'alocasia');
    return pool.filter((q) => q.id !== 'aloc' || hasAloc).slice(0, 3).map((q) => {
      const n = Utils.pick(q.n);
      return { id: q.id, text: q.text.replace('{n}', n.toLocaleString('ru-RU')), stat: q.stat, n, inverse: !!q.inverse, xp: q.xp + this.level * 4, money: q.money, done: false };
    });
  }

  questProgress(q) {
    const d = this.economy.day;
    const map = { sales: d.sales, fiveStars: d.fiveStars, alocasias: d.alocasias, lost: d.lost, revenue: d.revenue, goodConsults: d.goodConsults, careActions: d.careActions, upsells: d.upsells };
    return map[q.stat] || 0;
  }

  checkQuests(endOfDay = false) {
    for (const q of this.quests) {
      if (q.done) continue;
      const v = this.questProgress(q);
      const ok = q.inverse ? endOfDay && v <= q.n && this.economy.day.customers > 0 : v >= q.n;
      if (ok) {
        q.done = true;
        this.economy.reward(q.money);
        this.ui.toast(`Задание выполнено: ${q.text}! +${q.xp} XP, +${Utils.money(q.money)}`, 'star');
        this.audio.play('achievement');
        this.addXP(q.xp);
      }
    }
  }

  // ===================================================================
  // ОБУЧЕНИЕ
  // ===================================================================

  setTutorial(step) {
    if (this.tutorial.done) return;
    this.tutorial.step = step;
    if (step >= 99) this.tutorial.done = true;
    this.updateTutorialUI();
  }

  updateTutorialUI() {
    this.tutorialArrow = null;
    if (this.tutorial.done || this.day > 1) {
      if (this.day > 1) this.tutorial.done = true;
      this.ui.tip(null);
      this.ui.pulseOpen(false);
      return;
    }
    const s = this.tutorial.step;
    const T = TUTORIAL_TEXT;
    const mslot = this.shop.slotOf('monstera_deliciosa');
    if (s === 0) {
      this.ui.tip(T.hello);
      if (mslot) this.tutorialArrow = [mslot.x, mslot.baseY - 34];
    } else if (s === 1) {
      this.ui.tip(T.walking);
      if (mslot) this.tutorialArrow = [mslot.x, mslot.baseY - 34];
    } else if (s === 2) {
      this.ui.tip(T.dry);
    } else if (s === 3) {
      this.ui.tip(T.watered);
      this.ui.pulseOpen(true);
    } else if (s === 4) {
      this.ui.pulseOpen(false);
      this.ui.tip('Магазин открыт! Скоро зайдёт первый покупатель…');
    } else if (s === 5) {
      this.ui.tip(T.firstCustomer);
    } else if (s === 6.5) {
      this.ui.tip(T.toCheckout);
      this.tutorialArrow = [354, 100];
    } else if (s === 7) {
      this.tutorial.step = 6;
      this.ui.tip(T.afterSale);
      this.tutorialArrow = [50, 186];
    } else if (s === 6) {
      this.ui.tip(T.afterSale);
      this.tutorialArrow = [50, 186];
    } else {
      this.ui.tip(null);
    }
  }

  skipTutorial() {
    this.tutorial.done = true;
    this.tutorial.step = 99;
    this.updateTutorialUI();
  }

  // ===================================================================
  // СОХРАНЕНИЕ
  // ===================================================================

  toJSON() {
    const plants = {};
    for (const [id, p] of Object.entries(this.plants)) plants[id] = p.toJSON();
    return {
      version: 1,
      savedAt: Date.now(),
      day: this.day,
      time: Math.round(this.clock),
      phase: this.phase,
      level: this.level,
      xp: this.xp,
      rating: this.rating,
      ratingWeight: this.ratingWeight,
      plants,
      economy: this.economy.toJSON(),
      orders: { pending: this.pendingOrder, delivery: this.delivery },
      customersHistory: this.customersHistory,
      achievements: this.achievements,
      statistics: this.stats,
      quests: this.quests,
      tutorialProgress: this.tutorial,
      finalShown: this.finalShown,
    };
  }

  fromJSON(d) {
    this.day = d.day || 1;
    this.clock = d.time || Game.OPEN;
    this.phase = d.phase || 'morning';
    this.level = Utils.clamp(d.level || 1, 1, 15);
    this.xp = d.xp || 0;
    this.rating = d.rating || 4;
    this.ratingWeight = d.ratingWeight || 3;
    for (const [id, s] of Object.entries(d.plants || {})) {
      if (this.plants[id]) Object.assign(this.plants[id], s);
    }
    this.economy = new Economy(d.economy);
    this.pendingOrder = d.orders ? d.orders.pending : null;
    this.delivery = d.orders ? d.orders.delivery : null;
    this.customersHistory = d.customersHistory || {};
    this.achievements = d.achievements || {};
    Object.assign(this.stats, d.statistics || {});
    this.quests = d.quests && d.quests.length ? d.quests : this.generateQuests();
    this.tutorial = d.tutorialProgress || { step: 99, done: true };
    this.finalShown = !!d.finalShown;
    this.applyLevel(false);
  }

  save() {
    if (this.state === 'MAIN_MENU') return false;
    return SaveManager.save(this.toJSON());
  }

  saveSettings() {
    SaveManager.saveSettings(this.settings);
    this.audio.applySettings();
  }

  backToMenu() {
    this.save();
    this.state = 'MAIN_MENU';
    this.ui.closePanel();
    this.ui.closeDialog();
    this.ui.showHUD(false);
    this.ui.tip(null);
    this.ui.showMenu();
  }
}
