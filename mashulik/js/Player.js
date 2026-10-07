'use strict';

/**
 * Маша. Состояния: IDLE, WALK_*, WATERING, INSPECTING, CHECKOUT, HAPPY, WORRIED.
 */
class Player extends Character {
  constructor(x, y) {
    super(x, y, 64);
    this.state = 'IDLE';
    this.action = null; // {type, t, duration, cb}
    this.moodT = 0;
    this.mood = 'idle';
    this.swayT = 0;
    this.keyVec = { x: 0, y: 0 };
  }

  get busy() {
    return !!this.action;
  }

  /** короткое действие на месте (полив, осмотр, касса) */
  doAction(type, duration, cb) {
    this.stopMoving();
    this.action = { type, t: 0, duration, cb };
    this.state = type;
  }

  setMood(mood, seconds = 1.6) {
    this.mood = mood;
    this.moodT = seconds;
    this.state = mood === 'happy' ? 'HAPPY' : mood === 'worried' ? 'WORRIED' : this.state;
  }

  update(dt, game) {
    this.moving = false;
    this.swayT += dt;

    if (this.action) {
      this.action.t += dt;
      if (this.action.t >= this.action.duration) {
        const cb = this.action.cb;
        this.action = null;
        this.state = 'IDLE';
        if (cb) cb();
      }
    } else if (this.keyVec.x || this.keyVec.y) {
      // клавиатура: прямое управление с коллизиями
      this.stopMoving();
      const len = Math.hypot(this.keyVec.x, this.keyVec.y);
      const dx = (this.keyVec.x / len) * this.speed * dt;
      const dy = (this.keyVec.y / len) * this.speed * dt;
      const r = game.collision.move(this.x, this.y, dx, dy);
      this.x = r.x;
      this.y = r.y;
      this.setDirFromVector(this.keyVec.x, this.keyVec.y);
      this.moving = true;
    } else if (this.path) {
      this.followPath(dt);
    }

    if (this.moodT > 0) {
      this.moodT -= dt;
      if (this.moodT <= 0) this.mood = 'idle';
    }

    if (!this.action) {
      if (this.moving) this.state = 'WALK_' + this.dir.toUpperCase();
      else if (this.mood === 'happy') this.state = 'HAPPY';
      else if (this.mood === 'worried') this.state = 'WORRIED';
      else this.state = 'IDLE';
    }
    this.updateAnimation(dt);
  }

  render(ctx, game) {
    this.drawShadow(ctx);
    const a = this.action;
    let frame = this.frame;
    let yOff = 0;
    // покачивание в простое, прыжок радости
    if (!this.moving && !a) {
      const breath = Math.sin(this.swayT * 2.2);
      yOff = breath > 0.85 ? -1 : 0;
      if (this.mood === 'happy') yOff = -Math.abs(Math.round(Math.sin(this.swayT * 9) * 2));
    }
    if (a && a.type === 'CHECKOUT') frame = Math.floor(a.t * 8) % 2 ? 1 : 0;
    const sway = !this.moving ? (Math.sin(this.swayT * 1.6) > 0.3 ? 1 : 0) : 0;
    const sprite = Sprites.masha(this.dir, frame, {
      blink: this.blink,
      sway,
      mood: a && a.type === 'INSPECTING' ? 'idle' : this.mood,
      action: a && a.type === 'INSPECTING' ? 'inspect' : null,
    });
    const x = Math.round(this.x) - 13;
    const y = Math.round(this.y) - 37 + yOff;
    ctx.drawImage(sprite, x, y);

    // лейка при поливе
    if (a && a.type === 'WATERING') {
      const tilt = a.t > 0.25;
      const can = Sprites.wateringCan(tilt);
      const fx = this.dir === 'left' ? -1 : 1;
      ctx.save();
      if (this.dir === 'left') {
        ctx.translate(x + 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(can, -4, y + 16);
      } else if (this.dir === 'up') {
        ctx.drawImage(can, x + 12, y + 14);
      } else {
        ctx.drawImage(can, x + 16, y + 18);
      }
      ctx.restore();
      void fx; void game;
    }
  }
}
