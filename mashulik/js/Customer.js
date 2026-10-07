'use strict';

/**
 * Покупатель. Поведение — конечный автомат:
 * enter → browse/look → approach → waitHelp → dialog → toCheckout → waitCheckout → paying → leave
 */
class Customer extends Character {
  constructor(opts) {
    super(opts.x, opts.y, 40);
    Object.assign(this, {
      uid: opts.uid,
      name: opts.name,
      gender: opts.gender,
      look: opts.look,
      lookKey: opts.lookKey,
      archetype: opts.archetype,
      regular: opts.regular || null,
      returning: opts.returning || null,
    });
    this.state = 'enter';
    this.patience = 100;
    this.patienceRate = 100 / 110 / (opts.archetype.patience || 1);
    this.lookT = 0;
    this.lookAroundT = Utils.rand(1, 3);
    this.browseLeft = Utils.randInt(1, 2);
    this.alpha = 0;
    this.fading = false;
    this.waitedLong = false;
    this.queueIndex = -1;
    this.heartT = 0;
    // результаты визита
    this.satisfaction = 60;
    this.request = null;
    this.chosen = null;
    this.consult = null; // 'perfect' | 'good' | 'bad'
    this.priceReaction = null;
    this.upsell = null;
    this.paid = 0;
  }

  get waiting() {
    return this.state === 'waitHelp' || this.state === 'waitCheckout';
  }

  get moodLevel() {
    const p = this.patience;
    return p > 75 ? 3 : p > 50 ? 2 : p > 25 ? 1 : 0;
  }

  /** хит-бокс для клика */
  hit(px, py) {
    return px >= this.x - 9 && px <= this.x + 9 && py >= this.y - 30 && py <= this.y + 2;
  }

  update(dt, game) {
    this.moving = false;
    if (this.fading) {
      this.alpha -= dt * 3;
      if (this.alpha <= 0) this.active = false;
      return;
    }
    if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + dt * 3);

    if (this.path) this.followPath(dt);

    switch (this.state) {
      case 'look':
        this.lookT -= dt;
        this.lookAroundT -= dt;
        if (this.lookAroundT <= 0) {
          this.dir = this.dir === 'up' ? Utils.pick(['left', 'right']) : 'up';
          this.lookAroundT = Utils.rand(0.6, 1.4);
        }
        if (this.lookT <= 0) {
          this.browseLeft--;
          if (this.browseLeft > 0) game.customerBrowse(this);
          else game.customerApproach(this);
        }
        break;
      case 'waitHelp':
      case 'waitCheckout': {
        const k = this.state === 'waitCheckout' ? 0.75 : 1;
        this.patience -= this.patienceRate * k * dt * game.patienceFactor;
        if (this.patience < 45) this.waitedLong = true;
        // иногда оглядывается
        this.lookAroundT -= dt;
        if (this.lookAroundT <= 0 && !this.path) {
          this.dir = Utils.pick(['left', 'right', 'down', 'up']);
          this.lookAroundT = Utils.rand(1.2, 2.6);
        }
        if (this.patience <= 0) {
          this.patience = 0;
          game.customerGivesUp(this);
        }
        break;
      }
      default:
        break;
    }
    if (this.heartT > 0) this.heartT -= dt;
    this.updateAnimation(dt);
  }

  render(ctx) {
    ctx.save();
    ctx.globalAlpha = Utils.clamp(this.alpha, 0, 1);
    this.drawShadow(ctx);
    const sprite = Sprites.customer(this.look, this.dir, this.frame, this.blink, this.lookKey);
    ctx.drawImage(sprite, Math.round(this.x) - 10, Math.round(this.y) - 30);
    ctx.restore();
  }

  /** облачка и терпение рисуются поверх освещения */
  renderOverlay(ctx, t) {
    if (this.alpha < 0.9 || this.fading) return;
    const x = Math.round(this.x), y = Math.round(this.y) - 31;
    const bob = Math.round(Math.sin(t * 4 + this.uid) * 1);
    let kind = null;
    if (this.state === 'waitHelp') kind = '!';
    else if (this.state === 'waitCheckout') kind = '₽';
    else if (this.state === 'look' && this.heartT > 0) kind = 'heart';
    else if (this.state === 'look') kind = '...';
    if (kind) ctx.drawImage(Sprites.bubble(kind), x - 6, y - 14 + bob);
    if (this.waiting) {
      const face = Sprites.moodFace(this.moodLevel);
      const bx = x - 11, by = y - 22 + bob;
      ctx.drawImage(face, bx - 1, by - 3);
      ctx.fillStyle = '#4a3a3a';
      ctx.fillRect(bx + 9, by, 16, 4);
      ctx.fillStyle = '#efe6d6';
      ctx.fillRect(bx + 10, by + 1, 14, 2);
      const c = this.moodLevel >= 3 ? '#7fbf6a' : this.moodLevel === 2 ? '#c8c860' : this.moodLevel === 1 ? '#e8a050' : '#e06a5a';
      ctx.fillStyle = c;
      ctx.fillRect(bx + 10, by + 1, Math.max(1, Math.round((14 * this.patience) / 100)), 2);
    }
  }
}
