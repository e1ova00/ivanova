'use strict';

/**
 * DOM-интерфейс поверх canvas: HUD, игровые окна, диалоги, всплывающие подсказки.
 * Стиль — кремовые панели с пиксельными рамками, зелёные и розовые акценты.
 */
class UI {
  constructor(game) {
    this.game = game;
    this.$ = (id) => document.getElementById(id);
    this.stage = this.$('stage');
    this.hud = this.$('hud');
    this.panelLayer = this.$('panel-layer');
    this.panel = this.$('panel');
    this.dialogEl = this.$('dialog');
    this.toasts = this.$('toasts');
    this.floaters = this.$('floaters');
    this.speechLayer = this.$('speech-layer');
    this.tipEl = this.$('tip');
    this.menuEl = this.$('menu');
    this.introEl = this.$('intro');
    this.speeches = [];
    this.panelClose = null;
    this.hudCache = {};
    this.buildHUD();
    this.buildMenu();
    this.fit();
    window.addEventListener('resize', () => this.fit());
    // любой клик по интерфейсу — разблокировать звук
    document.addEventListener('pointerdown', () => this.game.audio.unlock(), { capture: true });
  }

  /** масштабирование сцены под экран с сохранением пропорций 16:9 */
  fit() {
    const W = window.innerWidth, H = window.innerHeight;
    let s = Math.min(W / 480, H / 270);
    if (s >= 2) s = Math.floor(s * 2) / 2;
    this.stage.style.width = Math.floor(480 * s) + 'px';
    this.stage.style.height = Math.floor(270 * s) + 'px';
    this.stage.style.setProperty('--fs', Math.max(11, Math.min(19, s * 5.4)) + 'px');
    this.scale = s;
  }

  // ---------- helpers ----------
  el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  btn(label, cls, onClick, disabled = false) {
    const b = this.el('button', 'btn ' + (cls || ''), label);
    b.disabled = disabled;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (b.disabled) return;
      this.game.audio.play('click');
      onClick();
    });
    return b;
  }

  canvasOf(src, scale, cls = 'pix') {
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(src, 0, 0);
    c.className = cls;
    c.style.width = src.width * scale + 'px';
    c.style.height = src.height * scale + 'px';
    return c;
  }

  /** превью растения, обрезанное по содержимому */
  plantPreview(plant, scale = 1.6, pot) {
    const spr = PlantArt.get(plant.id, plant.size, { pot: pot || 'terracotta' });
    const c = this.canvasOf(spr, scale, 'pix plant-prev');
    return c;
  }

  customerPortrait(c, scale = 3) {
    const spr = Sprites.customer(c.look, 'down', 0, false, c.lookKey);
    return this.canvasOf(spr, scale, 'pix portrait');
  }

  bar(label, value, cls = '', warnText = '') {
    const v = Utils.clamp(value, 0, 100);
    return `<div class="stat"><span class="stat-l">${label}</span><span class="pbar ${cls}"><i style="width:${v}%"></i></span><span class="stat-v">${Math.round(value)}%${warnText}</span></div>`;
  }

  needDots(n, sym) {
    return `<span class="need">${sym.repeat(n)}<b>${sym.repeat(3 - n)}</b></span>`;
  }

  plantTags(p) {
    const tags = [];
    tags.push(`<span title="Свет">☀${this.needDots(p.lightNeed, '•')}</span>`);
    tags.push(`<span title="Полив">💧${this.needDots(p.waterNeed, '•')}</span>`);
    tags.push(`<span title="Влажность">☁${this.needDots(p.humidityNeed, '•')}</span>`);
    tags.push(`<span class="tg">${p.difficulty <= 1 ? 'легко' : p.difficulty <= 2 ? 'просто' : p.difficulty <= 3 ? 'средне' : 'сложно'}</span>`);
    if (p.petSafe) tags.push('<span class="tg pet">🐾 безопасно</span>');
    tags.push(`<span class="tg">${p.size === 'l' ? 'крупное' : p.size === 'm' ? 'среднее' : 'маленькое'}</span>`);
    if (p.flowering) tags.push('<span class="tg pink">цветёт</span>');
    if (p.trailing) tags.push('<span class="tg">ампельное</span>');
    if (p.patterned) tags.push('<span class="tg">узоры</span>');
    return tags.join(' ');
  }

  rarityBadge(p) {
    return `<span class="rar r${p.rarity}">${RARITY_NAMES[p.rarity]}</span>`;
  }

  // ---------- главное меню ----------
  buildMenu() {
    const m = this.menuEl;
    m.innerHTML = '';
    const box = this.el('div', 'menu-buttons');
    this.menuButtons = {
      newGame: this.btn('НОВАЯ ИГРА', 'big primary', () => this.confirmNewGame()),
      cont: this.btn('ПРОДОЛЖИТЬ', 'big', () => { this.game.audio.unlock(); this.game.continueGame(); }),
      profile: this.btn('ПРОФИЛЬ', 'big', () => this.profile()),
      ach: this.btn('ДОСТИЖЕНИЯ', 'big', () => this.achievements()),
      settings: this.btn('НАСТРОЙКИ', 'big', () => this.settings()),
    };
    Object.values(this.menuButtons).forEach((b) => box.appendChild(b));
    m.appendChild(box);
    m.appendChild(this.el('div', 'menu-foot', 'уютный магазин растений · pixel-art симулятор'));
  }

  showMenu() {
    this.game.state = 'MAIN_MENU';
    // подгружаем сохранение, чтобы профиль и достижения были актуальны
    const save = SaveManager.load();
    this.game.resetWorld();
    if (save) this.game.fromJSON(save);
    this.menuButtons.cont.disabled = !save;
    this.menuEl.classList.remove('hidden');
    this.showHUD(false);
  }

  hideMenu() {
    this.menuEl.classList.add('hidden');
  }

  confirmNewGame() {
    this.game.audio.unlock();
    if (!SaveManager.hasSave()) return this.game.newGame();
    this.confirm('Начать новую игру?', 'Текущее сохранение будет перезаписано. Маша начнёт всё с самого начала.', 'НАЧАТЬ ЗАНОВО', () => {
      this.closePanel();
      SaveManager.reset();
      this.game.newGame();
    });
  }

  confirm(title, text, okLabel, onOk) {
    const p = this.openPanel(title, 'small');
    p.body.appendChild(this.el('p', 'center', text));
    const row = this.el('div', 'row center');
    row.appendChild(this.btn(okLabel, 'primary', onOk));
    row.appendChild(this.btn('ОТМЕНА', '', () => this.closePanel()));
    p.body.appendChild(row);
  }

  // ---------- вступление ----------
  intro(onDone) {
    const el = this.introEl;
    el.innerHTML = '';
    el.classList.remove('hidden');
    const lines = [
      'Маша всегда мечтала открыть собственный магазин растений.',
      'Маленький, тёплый, с монстерами у окна и алоказиями на полках.',
      'И вот наконец этот день настал.',
      'Добро пожаловать в «Машулик».',
    ];
    const wrap = this.el('div', 'intro-text');
    el.appendChild(wrap);
    lines.forEach((t, i) => {
      const p = this.el('p', 'intro-line', t);
      p.style.animationDelay = i * 1.3 + 's';
      wrap.appendChild(p);
    });
    const go = this.btn('ОТКРЫТЬ ДВЕРЬ', 'primary intro-btn', () => {
      el.classList.add('hidden');
      onDone();
    });
    go.style.animationDelay = lines.length * 1.3 + 's';
    el.appendChild(go);
  }

  dayCard(day, onDone) {
    const el = this.introEl;
    el.innerHTML = '';
    el.classList.remove('hidden');
    el.classList.add('daycard');
    el.appendChild(this.el('div', 'day-card', `<div class="dc-day">ДЕНЬ ${day}</div><div class="dc-time">09:00</div><div class="dc-part">УТРО</div>`));
    this.game.audio.play('page');
    const finish = () => {
      if (el.classList.contains('hidden')) return;
      el.classList.add('hidden');
      el.classList.remove('daycard');
      onDone();
    };
    el.onclick = finish;
    setTimeout(finish, 2200);
  }

  // ---------- HUD ----------
  buildHUD() {
    const h = this.hud;
    h.innerHTML = `
      <div class="hud-left">
        <div class="pill day"><span id="h-day">ДЕНЬ 1</span></div>
        <div class="pill time"><span id="h-time">09:00</span><small id="h-part">УТРО</small></div>
        <div class="pill money"><span id="h-money">15 000 ₽</span></div>
        <div class="pill rating"><span class="star">★</span><span id="h-rating">4,0</span></div>
        <div class="pill level"><span id="h-level">УР. 1</span><span class="xpbar"><i id="h-xp"></i></span></div>
      </div>
      <div class="hud-right"></div>`;
    const right = h.querySelector('.hud-right');
    this.openBtn = this.btn('ОТКРЫТЬ МАГАЗИН', 'primary small open-btn', () => this.game.openShop());
    right.appendChild(this.openBtn);
    right.appendChild(this.btn('Задания', 'small', () => this.questsPanel()));
    right.appendChild(this.btn('Склад', 'small', () => { if (this.game.worldRunning) this.game.openStorage(); }));
    right.appendChild(this.btn('❚❚', 'small icon', () => { if (this.game.worldRunning) this.game.openPause(); }));
  }

  showHUD(v) {
    this.hud.classList.toggle('hidden', !v);
  }

  set(id, text) {
    if (this.hudCache[id] === text) return;
    this.hudCache[id] = text;
    this.$(id).textContent = text;
  }

  updateHUD() {
    const g = this.game;
    this.set('h-day', 'ДЕНЬ ' + g.day);
    this.set('h-time', Utils.time(g.clock));
    const part = g.phase === 'morning' ? 'УТРО · ЗАКРЫТО' : g.clock >= Game.CLOSE ? 'ЗАКРЫВАЕМСЯ' : g.clock < 12 * 60 ? 'УТРО' : g.clock < 17 * 60 ? 'ДЕНЬ' : 'ВЕЧЕР';
    this.set('h-part', part);
    this.set('h-money', Utils.money(g.economy.balance));
    this.set('h-rating', Utils.rating(g.rating));
    this.set('h-level', 'УР. ' + g.level);
    const xpw = g.level >= 15 ? 100 : Math.round((g.xp / g.xpToNext) * 100);
    if (this.hudCache.xp !== xpw) {
      this.hudCache.xp = xpw;
      this.$('h-xp').style.width = xpw + '%';
    }
    const showOpen = g.phase === 'morning';
    if (this.hudCache.open !== showOpen) {
      this.hudCache.open = showOpen;
      this.openBtn.classList.toggle('hidden', !showOpen);
    }
    this.updateSpeeches();
  }

  pulseOpen(on) {
    this.openBtn.classList.toggle('pulse', on);
  }

  // ---------- тосты, всплывающие числа, реплики ----------
  toast(text, kind = 'info') {
    const icons = { info: '🌿', leaf: '🌿', warn: '💧', box: '📦', star: '⭐', moon: '🌙' };
    const t = this.el('div', 'toast ' + kind, `<span class="ti">${icons[kind] || '🌿'}</span>${text}`);
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 3300);
    setTimeout(() => t.remove(), 3800);
  }

  achievementToast(a) {
    const t = this.el('div', 'toast ach', `<span class="ti">🏆</span><div><small>ДОСТИЖЕНИЕ</small><b>${a.name}</b></div>`);
    this.toasts.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3800);
    setTimeout(() => t.remove(), 4300);
  }

  floater(x, y, text, cls) {
    const f = this.el('div', 'floater ' + (cls || ''), text);
    f.style.left = (x / 480) * 100 + '%';
    f.style.top = (y / 270) * 100 + '%';
    this.floaters.appendChild(f);
    setTimeout(() => f.remove(), 1800);
  }

  speech(entity, text, dur = 2.6) {
    this.speeches = this.speeches.filter((s) => {
      if (s.entity === entity) { s.el.remove(); return false; }
      return true;
    });
    const el = this.el('div', 'speech', text);
    this.speechLayer.appendChild(el);
    const s = { entity, el, until: performance.now() + dur * 1000 };
    this.speeches.push(s);
    this.positionSpeech(s);
  }

  positionSpeech(s) {
    s.el.style.left = Utils.clamp((s.entity.x / 480) * 100, 12, 88) + '%';
    s.el.style.top = ((s.entity.y - 34) / 270) * 100 + '%';
  }

  updateSpeeches() {
    const now = performance.now();
    this.speeches = this.speeches.filter((s) => {
      if (now > s.until || s.entity.active === false) { s.el.remove(); return false; }
      this.positionSpeech(s);
      return true;
    });
  }

  tip(text) {
    if (!text) {
      this.tipEl.classList.add('hidden');
      return;
    }
    this.tipEl.classList.remove('hidden');
    this.tipEl.innerHTML = '';
    this.tipEl.appendChild(this.canvasOf(Sprites.portrait('happy'), 1.5, 'pix tip-face'));
    this.tipEl.appendChild(this.el('div', 'tip-text', text));
    const x = this.el('button', 'tip-x', '✕');
    x.title = 'Пропустить обучение';
    x.addEventListener('click', () => this.game.skipTutorial());
    this.tipEl.appendChild(x);
  }

  // ---------- панели ----------
  openPanel(title, cls = '', closable = true, onClose = null) {
    this.panelLayer.className = cls.includes('plant-card') ? 'side' : '';
    this.panel.className = 'panel ' + cls;
    this.panel.innerHTML = '';
    const head = this.el('div', 'panel-head', `<span class="leaf">❦</span><h2>${title}</h2><span class="leaf r">❦</span>`);
    this.panel.appendChild(head);
    if (closable) {
      const x = this.el('button', 'panel-x', '✕');
      x.addEventListener('click', () => { this.game.audio.play('click'); this.requestClose(); });
      head.appendChild(x);
    }
    const body = this.el('div', 'panel-body');
    this.panel.appendChild(body);
    this.panelClose = closable ? (onClose || (() => this.defaultClose())) : null;
    return { head, body };
  }

  defaultClose() {
    const g = this.game;
    if (g.state === 'MAIN_MENU') return this.closePanel();
    if (['PLANT_INTERACTION', 'SUPPLIER', 'PROFILE', 'ACHIEVEMENTS', 'SETTINGS', 'PAUSED', 'QUESTS'].includes(g.state)) g.exitModal();
    else this.closePanel();
  }

  requestClose() {
    if (this.panelClose) this.panelClose();
  }

  escape() {
    if (!this.panelLayer.classList.contains('hidden')) this.requestClose();
  }

  closePanel() {
    this.panelLayer.classList.add('hidden');
    this.panel.innerHTML = '';
    this.panelClose = null;
    this.plantPanelState = null;
  }

  // ---------- карточка растения ----------
  plantPanel(plant, slot) {
    const side = slot && slot.x > 240 ? 'left' : 'right';
    const { body } = this.openPanel(plant.name.toUpperCase(), 'plant-card side-' + side);
    this.plantPanelState = { plant, slot, mode: 'main', msg: '' };
    this.renderPlantPanel(body);
  }

  refreshPlantPanel() {
    if (!this.plantPanelState) return;
    const body = this.panel.querySelector('.panel-body');
    if (body) this.renderPlantPanel(body);
  }

  renderPlantPanel(body) {
    const g = this.game;
    const st = this.plantPanelState;
    const p = st.plant;
    body.innerHTML = '';
    const top = this.el('div', 'pc-top');
    const prev = this.el('div', 'pc-prev');
    prev.appendChild(this.plantPreview(p, 2, g.shop.potFor(st.slot || { kind: 'shelf', x: 0, baseY: 0 }, p)));
    top.appendChild(prev);
    const info = this.el('div', 'pc-info');
    const stCls = p.state === 'HEALTHY' ? 'ok' : 'bad';
    info.innerHTML = `<div class="latin">${p.latinName}</div>
      <div>${this.rarityBadge(p)} <span class="state ${stCls}">${p.stateLabel}</span></div>
      ${this.bar('Здоровье', p.health, p.health < 40 ? 'red' : 'green')}
      ${this.bar('Влажность', Math.min(100, p.hydration), p.hydration > 100 ? 'yellow' : p.hydration < 25 ? 'red' : 'blue', p.hydration > 100 ? ' ⚠' : '')}
      ${this.bar('Свет', p.lightScore(st.slot ? st.slot.light : 2), 'gold')}
      ${this.bar('Питание', Math.min(100, p.nutrition), p.nutrition < 20 ? 'red' : 'pink')}`;
    top.appendChild(info);
    body.appendChild(top);

    const prices = this.el('div', 'pc-prices');
    prices.innerHTML = `
      <div><span>На складе</span><b>${p.stock} шт.</b></div>
      <div><span>Закупка</span><b>${Utils.money(p.purchasePrice)}</b></div>
      <div><span>Рекомендованная</span><b>${Utils.money(p.recommendedPrice)}</b></div>
      <div class="mine"><span>Цена «Машулика»</span><b>${Utils.money(p.playerPrice)}</b><em class="pl ${p.priceLabel.cls}">${p.priceLabel.text}</em></div>`;
    body.appendChild(prices);

    if (st.msg) body.appendChild(this.el('div', 'pc-msg', st.msg));

    if (st.mode === 'price') {
      const pe = this.el('div', 'price-edit');
      const steps = [['−10%', -0.1, 'pct'], ['−50', -50], ['+50', 50], ['+10%', 0.1, 'pct']];
      for (const [label, v, kind] of steps) {
        pe.appendChild(this.btn(label, 'small', () => {
          const np = kind ? p.playerPrice * (1 + v) : p.playerPrice + v;
          g.setPrice(p, np);
          st.msg = '';
          this.refreshPlantPanel();
        }));
      }
      pe.appendChild(this.btn('Как рекомендовано', 'small', () => { g.setPrice(p, p.recommendedPrice); this.refreshPlantPanel(); }));
      body.appendChild(pe);
      const row = this.el('div', 'row');
      row.appendChild(this.btn('ГОТОВО', 'primary', () => { st.mode = 'main'; g.save(); this.refreshPlantPanel(); }));
      body.appendChild(row);
      return;
    }

    const acts = this.el('div', 'pc-actions');
    const busy = () => g.player.busy;
    const disabled = p.stock <= 0;
    acts.appendChild(this.btn('ПОЛИТЬ', 'water', () => {
      if (busy()) return;
      const r = g.waterPlant(p);
      st.msg = r === 'over' ? 'Земля уже была влажной — перелив вредит корням!' : r === 'saved' ? 'Ух, как вовремя! Листья скоро расправятся.' : 'Полито! Земля приятно влажная.';
      setTimeout(() => this.refreshPlantPanel(), 950);
      this.refreshPlantPanel();
    }, disabled));
    acts.appendChild(this.btn('УДОБРИТЬ', 'fert', () => {
      if (busy()) return;
      const r = g.fertilizePlant(p);
      st.msg = r === 'over' ? 'Удобрений было достаточно — перекорм вредит.' : 'Подкормка внесена. Растение скажет спасибо!';
      setTimeout(() => this.refreshPlantPanel(), 800);
      this.refreshPlantPanel();
    }, disabled));
    acts.appendChild(this.btn('ОСМОТРЕТЬ', 'inspect', () => {
      if (busy()) return;
      const r = g.inspectPlant(p);
      if (r.found) {
        st.msg = 'Ой! На листьях вредители. Нужно обработать!';
        st.pests = true;
      } else {
        st.msg = `Всё в порядке. Совет: ${p.careTip}`;
      }
      this.refreshPlantPanel();
    }, disabled));
    if (p.pests && st.pests) {
      acts.appendChild(this.btn('ОБРАБОТАТЬ', 'primary', () => {
        g.treatPlant(p);
        st.pests = false;
        st.msg = 'Вредители побеждены! Растение спасено.';
        this.refreshPlantPanel();
      }));
    }
    acts.appendChild(this.btn('ИЗМЕНИТЬ ЦЕНУ', 'price', () => { st.mode = 'price'; st.msg = ''; this.refreshPlantPanel(); }));
    body.appendChild(acts);

    const desc = this.el('div', 'pc-desc', `${p.description}<div class="tags">${this.plantTags(p)}</div>`);
    body.appendChild(desc);
  }

  // ---------- склад ----------
  storagePanel() {
    const g = this.game;
    const { body } = this.openPanel('СКЛАД', 'wide');
    const list = this.el('div', 'storage-list');
    const plants = Object.values(g.plants).filter((p) => p.unlocked).sort((a, b) => b.stock - a.stock);
    for (const p of plants) {
      const row = this.el('div', 'st-row' + (p.stock ? '' : ' empty'));
      row.appendChild(this.plantPreview(p, 0.9));
      row.appendChild(this.el('div', 'st-name', `<b>${p.name}</b><small>${p.latinName}</small>`));
      row.appendChild(this.el('div', 'st-count', `×${p.stock}`));
      row.appendChild(this.el('div', 'st-state ' + (p.state === 'HEALTHY' ? 'ok' : 'bad'), p.stock ? p.stateLabel : '—'));
      row.appendChild(this.el('div', 'st-health', p.stock ? `<span class="pbar green"><i style="width:${p.health}%"></i></span>` : ''));
      row.appendChild(this.el('div', 'st-price', Utils.money(p.playerPrice)));
      list.appendChild(row);
    }
    body.appendChild(list);
    const locked = Object.values(g.plants).filter((p) => !p.unlocked).length;
    const eco = g.economy;
    body.appendChild(this.el('div', 'note', `Открыто видов: ${20 - locked}/20 · Списано растений: ${eco.discardedPlants}${g.pendingOrder ? ' · 📦 заказ приедет завтра' : ''}`));
  }

  // ---------- поставщик ----------
  supplierPanel() {
    const g = this.game;
    const { body } = this.openPanel('КАТАЛОГ ПОСТАВЩИКА', 'wide supplier');
    const render = () => {
      body.innerHTML = '';
      const grid = this.el('div', 'cat-grid');
      const all = Object.values(g.plants).sort((a, b) => a.unlockLevel - b.unlockLevel || a.purchasePrice - b.purchasePrice);
      for (const p of all) {
        const card = this.el('div', 'cat-card' + (p.unlocked ? '' : ' locked') + (p.rarity >= 3 ? ' rare' : ''));
        card.appendChild(this.plantPreview(p, 1.2));
        const info = this.el('div', 'cat-info');
        if (!p.unlocked) {
          info.innerHTML = `<b>${p.name}</b><small>${this.rarityBadge(p)}</small><div class="lock">🔒 откроется на уровне ${p.unlockLevel}</div>`;
          card.appendChild(info);
          grid.appendChild(card);
          continue;
        }
        info.innerHTML = `<b>${p.name}</b><small>${this.rarityBadge(p)} · на складе ${p.stock}</small><div class="cat-price">${Utils.money(p.purchasePrice)} <em>→ ${Utils.money(p.recommendedPrice)}</em></div>`;
        card.appendChild(info);
        const q = this.el('div', 'qty');
        q.appendChild(this.btn('−', 'small icon', () => { g.supplier.change(p.id, -1); render(); }, !g.supplier.qty(p.id)));
        q.appendChild(this.el('span', 'q', String(g.supplier.qty(p.id))));
        q.appendChild(this.btn('+', 'small icon', () => { g.supplier.change(p.id, 1); render(); }));
        card.appendChild(q);
        grid.appendChild(card);
      }
      body.appendChild(grid);
      const total = g.supplier.total(g.plants);
      const foot = this.el('div', 'cat-foot');
      const enough = g.economy.balance >= total;
      foot.innerHTML = `<div>Стоимость заказа: <b class="${enough ? '' : 'neg'}">${Utils.money(total)}</b></div><div>Баланс: <b>${Utils.money(g.economy.balance)}</b></div>`;
      if (g.pendingOrder) {
        const items = Object.entries(g.pendingOrder.items).map(([id, n]) => `${g.plants[id].name} ×${n}`).join(', ');
        foot.appendChild(this.el('div', 'note', `Уже заказано на завтра: ${items}`));
      }
      foot.appendChild(this.btn('ОФОРМИТЬ ПОСТАВКУ', 'primary', () => { if (g.placeOrder()) render(); }, !total || !enough));
      body.appendChild(foot);
    };
    render();
  }

  deliveryPanel(d) {
    const g = this.game;
    const { body } = this.openPanel('ПОСТАВКА ПРИЕХАЛА!', 'small');
    body.appendChild(this.el('p', 'center', 'Коробки аккуратно подписаны, внутри пахнет землёй и свежими листьями.'));
    const list = this.el('div', 'deliv-list');
    for (const [id, n] of Object.entries(d.items)) {
      const p = g.plants[id];
      const row = this.el('div', 'deliv-row');
      row.appendChild(this.plantPreview(p, 0.9));
      row.appendChild(this.el('span', '', `${p.name} <b>×${n}</b>`));
      list.appendChild(row);
    }
    body.appendChild(list);
    const row = this.el('div', 'row center');
    row.appendChild(this.btn('РАЗОБРАТЬ КОРОБКИ', 'primary', () => { g.acceptDelivery(); g.exitModal(); }));
    body.appendChild(row);
  }

  // ---------- диалог с покупателем ----------
  dialog(c, { text, options = [], showPlant = null, hint = '' }) {
    const d = this.dialogEl;
    d.classList.remove('hidden');
    d.innerHTML = '';
    const left = this.el('div', 'dlg-who');
    left.appendChild(this.customerPortrait(c, 3));
    left.appendChild(this.el('div', 'dlg-name', `${c.name}${c.regular ? ' <span class="reg">постоянный клиент</span>' : `<small>${c.archetype.title}</small>`}`));
    const mood = c.satisfaction >= 75 ? '😊' : c.satisfaction >= 55 ? '🙂' : c.satisfaction >= 40 ? '😐' : '😠';
    left.appendChild(this.el('div', 'dlg-mood', mood));
    d.appendChild(left);
    const main = this.el('div', 'dlg-main');
    const say = this.el('div', 'dlg-text', '');
    main.appendChild(say);
    this.typewrite(say, text);
    if (hint) main.appendChild(this.el('div', 'dlg-hint', hint));
    if (showPlant) {
      const sp = this.el('div', 'dlg-plant');
      sp.appendChild(this.plantPreview(showPlant, 1));
      sp.appendChild(this.el('span', '', `${showPlant.name}<br><b>${Utils.money(showPlant.playerPrice)}</b>`));
      main.appendChild(sp);
    }
    const opts = this.el('div', 'dlg-opts');
    for (const o of options) opts.appendChild(this.btn(o.label, (o.cls || '') + ' opt', o.onClick, o.disabled));
    main.appendChild(opts);
    d.appendChild(main);
  }

  typewrite(el, text) {
    el.textContent = '';
    let i = 0;
    clearInterval(this.twTimer);
    const step = () => {
      i += 2;
      el.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(this.twTimer);
    };
    this.twTimer = setInterval(step, 16);
    el.onclick = () => { clearInterval(this.twTimer); el.textContent = text; };
  }

  plantChoice(c, stock, onPick, onNone) {
    const g = this.game;
    const d = this.dialogEl;
    d.classList.remove('hidden');
    d.innerHTML = '';
    const left = this.el('div', 'dlg-who');
    left.appendChild(this.customerPortrait(c, 3));
    left.appendChild(this.el('div', 'dlg-name', c.name));
    d.appendChild(left);
    const main = this.el('div', 'dlg-main');
    main.appendChild(this.el('div', 'dlg-text small', `<b>Что посоветовать?</b> ${c.request ? '<span class="dlg-hint">Запрос: ' + c.request.ctx + '</span>' : ''}`));
    const grid = this.el('div', 'choice-grid');
    const all = Object.values(g.plants).filter((p) => p.unlocked).sort((a, b) => (b.stock > 0) - (a.stock > 0) || a.unlockLevel - b.unlockLevel);
    for (const p of all) {
      const card = this.el('button', 'choice' + (p.stock > 0 ? '' : ' out'));
      card.disabled = p.stock <= 0;
      card.appendChild(this.plantPreview(p, 0.9));
      card.appendChild(this.el('div', 'ch-info', `<b>${p.name}</b><span class="ch-price">${Utils.money(p.playerPrice)} · ${p.stock > 0 ? '×' + p.stock : 'нет в наличии'}</span><span class="tags">${this.plantTags(p)}</span>`));
      card.addEventListener('click', () => {
        if (card.disabled) return;
        this.game.audio.play('click');
        onPick(p);
      });
      grid.appendChild(card);
    }
    main.appendChild(grid);
    const opts = this.el('div', 'dlg-opts');
    opts.appendChild(this.btn('Извини, ничего подходящего нет', 'small', onNone));
    main.appendChild(opts);
    d.appendChild(main);
    void stock;
  }

  upsell(c, plant, offer, onDone) {
    const dat = this.dative(plant);
    const target = dat ? `${Utils.pg('[этой|этому|этому]', plant.g)} ${dat}` : 'этому растению';
    this.dialog(c, {
      text: `Маша: «К ${target} отлично подойдёт ${offer.name} за ${Utils.money(offer.price)}.»`,
      showPlant: plant,
      options: [
        { label: 'ПРЕДЛОЖИТЬ', cls: 'good', onClick: () => onDone(true) },
        { label: 'НЕ НУЖНО', onClick: () => onDone(false) },
      ],
      hint: 'Допродажа увеличивает средний чек',
    });
  }

  /** дательный падеж короткого названия: «к этой монстере», «к этому фикусу» */
  dative(p) {
    const s = p.short;
    if (/^[A-Z]/.test(s)) return null;
    const [w, ...rest] = s.split(' ');
    let d;
    if (p.g === 'f') {
      if (w.endsWith('ия')) d = w.slice(0, -1) + 'и';
      else if (w.endsWith('я') || w.endsWith('а')) d = w.slice(0, -1) + 'е';
      else d = w;
    } else {
      if (rest.length) return null;
      d = w + 'у';
    }
    return [d, ...rest].join(' ');
  }

  closeDialog() {
    this.dialogEl.classList.add('hidden');
    this.dialogEl.innerHTML = '';
    clearInterval(this.twTimer);
  }

  // ---------- задания ----------
  questsPanel() {
    const g = this.game;
    if (!g.worldRunning) return;
    g.enterModal('QUESTS');
    const { body } = this.openPanel('ЗАДАНИЯ ДНЯ', 'small');
    for (const q of g.quests) {
      const v = g.questProgress(q);
      const prog = q.inverse ? (q.done ? 'выполнено' : `потеряно: ${v}`) : `${Math.min(v, q.n).toLocaleString('ru-RU')} / ${q.n.toLocaleString('ru-RU')}`;
      const pct = q.inverse ? (q.done ? 100 : v ? 0 : 50) : Math.min(100, (v / q.n) * 100);
      body.appendChild(this.el('div', 'quest' + (q.done ? ' done' : ''), `<div class="q-t">${q.done ? '✔' : '○'} ${q.text}</div><div class="q-r">+${q.xp} XP · +${Utils.money(q.money)}</div><span class="pbar green"><i style="width:${pct}%"></i></span><small>${prog}</small>`));
    }
  }

  // ---------- отчёт дня ----------
  dayReport(r) {
    const { body } = this.openPanel(`ДЕНЬ ${r.day} ЗАВЕРШЁН`, 'report', false);
    const stats = this.el('div', 'rep-grid');
    stats.innerHTML = `
      <div class="rep-col">
        <div><span>Продано растений</span><b>${r.sales}</b></div>
        <div><span>Выручка</span><b>${Utils.money(r.revenue)}</b></div>
        <div><span>Себестоимость</span><b>${Utils.money(r.cost)}</b></div>
        <div class="big"><span>Прибыль</span><b class="${r.profit >= 0 ? 'pos' : 'neg'}">${r.profit >= 0 ? '+' : ''}${Utils.money(r.profit)}</b></div>
        <div><span>Средний чек</span><b>${Utils.money(r.avg)}</b></div>
        <div><span>Закупки у поставщика</span><b>${Utils.money(r.purchase)}</b></div>
      </div>
      <div class="rep-col">
        <div><span>Довольны</span><b class="pos">${r.happy}</b></div>
        <div><span>Нейтральны</span><b>${r.neutral}</b></div>
        <div><span>Недовольны</span><b class="neg">${r.unhappy}</b></div>
        <div><span>Рейтинг дня</span><b>${r.dayRating ? '★ ' + Utils.rating(r.dayRating) : '—'}</b></div>
        <div class="big"><span>Общий рейтинг</span><b>★ ${Utils.rating(r.rating)}</b></div>
        <div><span>Допродажи</span><b>${r.upsells}</b></div>
      </div>`;
    body.appendChild(stats);
    if (r.reviews.length) {
      body.appendChild(this.el('h3', '', 'Отзывы'));
      const rv = this.el('div', 'reviews');
      for (const x of r.reviews) rv.appendChild(this.el('div', 'review', `<div class="stars">${Utils.stars(x.stars)}</div><b>${x.name}:</b> «${x.text}»`));
      body.appendChild(rv);
    }
    const qd = r.quests.filter((q) => q.done).length;
    body.appendChild(this.el('div', 'note center', `Заданий выполнено: ${qd} из ${r.quests.length}`));
    const row = this.el('div', 'row center');
    row.appendChild(this.btn('СЛЕДУЮЩИЙ ДЕНЬ', 'primary big', () => this.game.nextDay()));
    body.appendChild(row);
  }

  // ---------- новый уровень, финал ----------
  levelUp(lvl, info, newly, onClose) {
    const { body } = this.openPanel('НОВЫЙ УРОВЕНЬ!', 'small levelup', true, onClose);
    body.appendChild(this.el('div', 'lv-num', `УРОВЕНЬ ${lvl}`));
    body.appendChild(this.el('div', 'lv-title', info.title));
    body.appendChild(this.el('div', 'lv-open', `<small>ОТКРЫТО:</small><b>${info.unlock}</b>`));
    if (newly.length) {
      const row = this.el('div', 'lv-plants');
      for (const p of newly) {
        const c = this.el('div', 'lv-plant');
        c.appendChild(this.plantPreview(p, 1.3));
        c.appendChild(this.el('span', '', p.name));
        row.appendChild(c);
      }
      body.appendChild(row);
      body.appendChild(this.el('div', 'note center', 'Поставщик прислал по одному растению в подарок!'));
    }
    const r = this.el('div', 'row center');
    r.appendChild(this.btn('УРА!', 'primary', onClose));
    body.appendChild(r);
  }

  finalAward(onClose) {
    const { body } = this.openPanel('🏆', 'award', true, onClose);
    const tc = document.createElement('canvas');
    tc.width = 40; tc.height = 44;
    tc.className = 'pix trophy';
    this.drawTrophy(tc.getContext('2d'));
    body.appendChild(tc);
    body.appendChild(this.el('div', 'aw-title', 'МАШУЛИК'));
    body.appendChild(this.el('div', 'aw-sub', 'ЛУЧШИЙ МАГАЗИН<br>РАСТЕНИЙ ГОДА'));
    body.appendChild(this.el('p', 'center aw-text', '«Маша превратила маленький магазин в одно из самых любимых зелёных мест города.»'));
    body.appendChild(this.el('div', 'note center', 'Достижение «Хозяйка мечты» получено. Игру можно продолжать!'));
    const r = this.el('div', 'row center');
    r.appendChild(this.btn('ПРОДОЛЖИТЬ ИГРУ', 'primary', onClose));
    body.appendChild(r);
  }

  drawTrophy(x) {
    const b = new PixelBuffer(40, 44);
    const G = '#d8b25a', L = '#f6e08a', D = '#a8843a';
    b.rect(10, 2, 20, 16, G);
    b.rect(12, 18, 16, 4, G);
    b.rect(16, 22, 8, 6, D);
    b.rect(12, 28, 16, 3, G);
    b.rect(9, 31, 22, 8, '#5a3a2a');
    b.rect(11, 33, 18, 4, '#d8b25a');
    b.rect(4, 4, 6, 3, G); b.rect(3, 6, 3, 7, G); b.rect(5, 12, 6, 3, G);
    b.rect(30, 4, 6, 3, G); b.rect(34, 6, 3, 7, G); b.rect(29, 12, 6, 3, G);
    b.rect(12, 3, 3, 12, L);
    b.rect(26, 3, 2, 14, D);
    // листик-эмблема
    b.leaf(20, 15, -90, 9, 7, (u) => Math.pow(Math.sin(Math.PI * u), 0.75), (u, vn) => (Math.abs(vn) < 0.15 ? '#9fd09a' : '#5f8f5c'));
    b.outline('#5a3a20');
    x.imageSmoothingEnabled = false;
    x.drawImage(b.canvas, 0, 0);
  }

  // ---------- профиль, достижения, настройки, пауза ----------
  profile() {
    const g = this.game;
    const inGame = g.state !== 'MAIN_MENU';
    if (inGame) g.enterModal('PROFILE');
    const { body } = this.openPanel('ПРОФИЛЬ', 'profile');
    const wrap = this.el('div', 'prof');
    const left = this.el('div', 'prof-portrait');
    left.appendChild(this.canvasOf(Sprites.portrait('happy'), 4, 'pix'));
    wrap.appendChild(left);
    const unlocked = Object.values(g.plants).filter((p) => p.unlocked).length;
    const xpw = g.level >= 15 ? 100 : Math.round((g.xp / g.xpToNext) * 100);
    const right = this.el('div', 'prof-info', `
      <h3>МАША <small>21 год · хозяйка «Машулика»</small></h3>
      <div class="lv">УРОВЕНЬ ${g.level} · ${LEVELS[g.level - 1].title}</div>
      <div class="xp"><span class="pbar gold"><i style="width:${xpw}%"></i></span><small>${g.level >= 15 ? 'максимальный уровень' : `${g.xp} / ${g.xpToNext} XP`}</small></div>
      <div class="kv"><span>Баланс</span><b>${Utils.money(g.economy.balance)}</b></div>
      <div class="kv"><span>Рейтинг</span><b>★ ${Utils.rating(g.rating)}</b></div>
      <div class="kv"><span>Открыто растений</span><b>${unlocked}/20</b></div>
      <div class="kv"><span>Обслужено покупателей</span><b>${g.economy.customersServed}</b></div>
      <div class="kv"><span>Продаж</span><b>${g.economy.sales}</b></div>
      <div class="kv"><span>Довольных покупателей</span><b>${g.economy.happyCustomers}</b></div>
      <div class="kv"><span>Выручка за всё время</span><b>${Utils.money(g.economy.revenue)}</b></div>
      <div class="kv"><span>Средний чек</span><b>${Utils.money(g.economy.averageCheck)}</b></div>
      <div class="kv"><span>Дней в магазине</span><b>${g.day}</b></div>`);
    wrap.appendChild(right);
    body.appendChild(wrap);
  }

  achievements() {
    const g = this.game;
    if (g.state !== 'MAIN_MENU') g.enterModal('ACHIEVEMENTS');
    const { body } = this.openPanel('ДОСТИЖЕНИЯ', 'wide');
    const icons = { coin: '🪙', can: '💧', star: '⭐', pots: '🪴', alocasia: '🌿', gem: '💎', bag: '👜', heart: '💗', monstera: '🍃', door: '🔔', glass: '🔍', trophy: '🏆' };
    const n = Object.keys(g.achievements).length;
    body.appendChild(this.el('div', 'note center', `Получено: ${n} из ${ACHIEVEMENTS.length}`));
    const grid = this.el('div', 'ach-grid');
    for (const a of ACHIEVEMENTS) {
      const got = g.achievements[a.id];
      grid.appendChild(this.el('div', 'ach' + (got ? ' got' : ''), `<div class="ai">${got ? icons[a.icon] : '🔒'}</div><div><b>${a.name}</b><small>${a.desc}</small>${got ? `<em>День ${got.day}</em>` : ''}</div>`));
    }
    body.appendChild(grid);
  }

  settings() {
    const g = this.game;
    const inGame = g.state !== 'MAIN_MENU';
    if (inGame) g.enterModal('SETTINGS');
    const { body } = this.openPanel('НАСТРОЙКИ', 'small');
    const s = g.settings;
    const mk = (label, key, volKey) => {
      const row = this.el('div', 'set-row');
      row.appendChild(this.el('span', '', label));
      const t = this.btn(s[key] ? 'ВКЛ' : 'ВЫКЛ', 'small toggle' + (s[key] ? ' on' : ''), () => {
        s[key] = !s[key];
        t.textContent = s[key] ? 'ВКЛ' : 'ВЫКЛ';
        t.classList.toggle('on', s[key]);
        g.saveSettings();
      });
      row.appendChild(t);
      body.appendChild(row);
      const vr = this.el('div', 'set-row');
      vr.appendChild(this.el('span', 'sub', 'Громкость'));
      const r = document.createElement('input');
      r.type = 'range'; r.min = 0; r.max = 100; r.value = Math.round(s[volKey] * 100);
      r.addEventListener('input', () => { s[volKey] = r.value / 100; g.saveSettings(); });
      vr.appendChild(r);
      body.appendChild(vr);
    };
    mk('МУЗЫКА', 'music', 'musicVolume');
    mk('ЗВУКИ', 'sound', 'soundVolume');
    const row = this.el('div', 'row center wrap');
    row.appendChild(this.btn('СОХРАНИТЬ', '', () => {
      if (!inGame) return this.toast('Сначала начни игру.', 'warn');
      const ok = g.save();
      this.toast(ok ? 'Игра сохранена!' : 'Не удалось сохранить.', ok ? 'leaf' : 'warn');
    }));
    row.appendChild(this.btn('ЗАГРУЗИТЬ', '', () => {
      if (!SaveManager.hasSave()) return this.toast('Сохранений пока нет.', 'warn');
      this.closePanel();
      this.closeDialog();
      g.continueGame();
    }));
    row.appendChild(this.btn('СБРОСИТЬ ПРОГРЕСС', 'danger', () => {
      this.confirm('Сбросить прогресс?', 'Все растения, деньги, уровни и достижения будут удалены. Это нельзя отменить.', 'СБРОСИТЬ', () => {
        SaveManager.reset();
        this.closePanel();
        this.closeDialog();
        this.toast('Прогресс сброшен.', 'info');
        g.backToMenu();
        SaveManager.reset();
        this.showMenu();
      });
    }));
    body.appendChild(row);
  }

  pause() {
    const g = this.game;
    const { body } = this.openPanel('ПАУЗА', 'small');
    const col = this.el('div', 'col');
    col.appendChild(this.btn('ПРОДОЛЖИТЬ', 'primary', () => g.exitModal()));
    col.appendChild(this.btn('ПРОФИЛЬ', '', () => { this.closePanel(); g.state = g.returnState; this.profile(); }));
    col.appendChild(this.btn('ДОСТИЖЕНИЯ', '', () => { this.closePanel(); g.state = g.returnState; this.achievements(); }));
    col.appendChild(this.btn('НАСТРОЙКИ', '', () => { this.closePanel(); g.state = g.returnState; this.settings(); }));
    col.appendChild(this.btn('СОХРАНИТЬ', '', () => this.toast(g.save() ? 'Игра сохранена!' : 'Не удалось сохранить.', 'leaf')));
    col.appendChild(this.btn('ГЛАВНОЕ МЕНЮ', '', () => g.backToMenu()));
    body.appendChild(col);
  }
}
