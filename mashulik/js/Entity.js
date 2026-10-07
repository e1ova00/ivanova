'use strict';

/** Базовая игровая сущность: позиция в мире и сортировка по глубине. */
class Entity {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.active = true;
  }

  /** чем ниже на экране — тем позже рисуется (Y-sorting) */
  get sortY() {
    return this.y;
  }

  update(/* dt, game */) {}

  render(/* ctx, game */) {}
}

/** Персонаж: умеет ходить по пути, анимировать шаги и поворачиваться. */
class Character extends Entity {
  constructor(x, y, speed) {
    super(x, y);
    this.speed = speed;
    this.dir = 'down';
    this.path = null;
    this.onArrive = null;
    this.animT = 0;
    this.frame = 0;
    this.moving = false;
    this.blinkT = Utils.rand(1, 4);
    this.blink = false;
  }

  /** построить путь A* и пойти; onArrive вызывается по прибытии */
  moveTo(collision, tx, ty, onArrive = null) {
    const path = collision.findPath(this.x, this.y, tx, ty);
    if (!path || !path.length) {
      this.path = null;
      this.onArrive = null;
      return false;
    }
    this.path = path;
    this.onArrive = onArrive;
    return true;
  }

  stopMoving() {
    this.path = null;
    this.onArrive = null;
    this.moving = false;
  }

  face(dir) {
    this.dir = dir;
  }

  faceTo(x, y) {
    const dx = x - this.x, dy = y - this.y;
    if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? 'right' : 'left';
    else this.dir = dy > 0 ? 'down' : 'up';
  }

  setDirFromVector(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy) * 1.1) this.dir = dx > 0 ? 'right' : 'left';
    else if (dy !== 0) this.dir = dy > 0 ? 'down' : 'up';
  }

  followPath(dt) {
    if (!this.path) return;
    let remaining = this.speed * dt;
    while (this.path && remaining > 0) {
      const [tx, ty] = this.path[0];
      const dx = tx - this.x, dy = ty - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.01) this.setDirFromVector(dx, dy);
      if (d <= remaining) {
        this.x = tx;
        this.y = ty;
        remaining -= d;
        this.path.shift();
        if (!this.path.length) {
          this.path = null;
          const cb = this.onArrive;
          this.onArrive = null;
          if (cb) cb();
        }
      } else {
        this.x += (dx / d) * remaining;
        this.y += (dy / d) * remaining;
        remaining = 0;
      }
    }
    this.moving = true;
  }

  updateAnimation(dt) {
    if (this.moving) {
      this.animT += dt;
      this.frame = Math.floor(this.animT * 7) % 4;
    } else {
      this.animT = 0;
      this.frame = 0;
    }
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      if (this.blink) {
        this.blink = false;
        this.blinkT = Utils.rand(2, 5);
      } else {
        this.blink = true;
        this.blinkT = 0.13;
      }
    }
  }

  drawShadow(ctx) {
    ctx.fillStyle = 'rgba(70, 40, 30, 0.22)';
    ctx.fillRect(Math.round(this.x) - 6, Math.round(this.y) - 1, 12, 2);
    ctx.fillRect(Math.round(this.x) - 4, Math.round(this.y) - 2, 8, 4);
  }
}
