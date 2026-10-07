'use strict';

/**
 * Пул частиц: объекты переиспользуются, неактивные пропускаются.
 * Типы: drop, sparkle, coin, star, leaf, dust, gold, heart.
 */
class ParticleSystem {
  constructor(size = 360) {
    this.pool = Array.from({ length: size }, () => ({ active: false }));
  }

  spawn() {
    for (const p of this.pool) if (!p.active) return p;
    return null;
  }

  emit(type, x, y, n = 1, opts = {}) {
    for (let i = 0; i < n; i++) {
      const p = this.spawn();
      if (!p) return;
      p.active = true;
      p.type = type;
      p.x = x + (opts.spread ? Utils.rand(-opts.spread, opts.spread) : 0);
      p.y = y + (opts.spread ? Utils.rand(-opts.spread / 2, opts.spread / 2) : 0);
      p.t = 0;
      p.rot = Utils.rand(0, 6.28);
      switch (type) {
        case 'drop':
          p.vx = Utils.rand(-8, 8); p.vy = Utils.rand(10, 30); p.g = 160; p.life = Utils.rand(0.4, 0.7);
          p.color = Utils.pick(['#9fd6f0', '#c8ecfa', '#7fbfe0']);
          break;
        case 'sparkle':
          p.vx = Utils.rand(-18, 18); p.vy = Utils.rand(-30, -8); p.g = 10; p.life = Utils.rand(0.6, 1.1);
          p.color = Utils.pick(['#c8f0b0', '#9fe08a', '#f0ffe0']);
          break;
        case 'coin':
          p.vx = Utils.rand(-30, 30); p.vy = Utils.rand(-70, -40); p.g = 180; p.life = Utils.rand(0.8, 1.1);
          p.color = '#f2c94c';
          break;
        case 'star':
          p.vx = Utils.rand(-40, 40); p.vy = Utils.rand(-50, -10); p.g = 40; p.life = Utils.rand(0.9, 1.4);
          p.color = Utils.pick(['#fff3b0', '#f6d36b', '#ffffff']);
          break;
        case 'leaf':
          p.vx = Utils.rand(-30, 30); p.vy = Utils.rand(-40, -5); p.g = 18; p.life = Utils.rand(1.6, 2.6);
          p.color = Utils.pick(['#7aa874', '#5f8f5c', '#9fc48a', '#f0b6c0']);
          break;
        case 'dust':
          p.vx = Utils.rand(-2, 2); p.vy = Utils.rand(-3, 1); p.g = 0; p.life = Utils.rand(3, 6);
          p.color = '#fff4d8';
          break;
        case 'gold':
          p.vx = 0; p.vy = Utils.rand(-6, -2); p.g = 0; p.life = Utils.rand(0.6, 1);
          p.color = '#f6dc8a';
          break;
        case 'heart':
          p.vx = Utils.rand(-6, 6); p.vy = -18; p.g = 0; p.life = 1.2;
          p.color = '#f08aa0';
          break;
        default:
          p.vx = 0; p.vy = 0; p.g = 0; p.life = 1; p.color = '#fff';
      }
      if (opts.vy !== undefined) p.vy = opts.vy;
    }
  }

  update(dt) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.t += dt;
      if (p.t >= p.life) { p.active = false; continue; }
      p.vy += p.g * dt;
      if (p.type === 'leaf') p.vx += Math.sin(p.t * 4 + p.rot) * 30 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  get count() {
    let n = 0;
    for (const p of this.pool) if (p.active) n++;
    return n;
  }

  render(ctx) {
    for (const p of this.pool) {
      if (!p.active) continue;
      const k = 1 - p.t / p.life;
      const x = Math.round(p.x), y = Math.round(p.y);
      ctx.globalAlpha = p.type === 'dust' ? 0.35 * Math.sin(k * Math.PI) : Math.min(1, k * 2);
      ctx.fillStyle = p.color;
      switch (p.type) {
        case 'drop':
          ctx.fillRect(x, y, 1, 2);
          break;
        case 'sparkle':
        case 'gold':
          if (Math.floor(p.t * 10) % 2) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
          else ctx.fillRect(x, y, 1, 1);
          break;
        case 'coin':
          ctx.fillRect(x - 1, y - 1, 3, 3);
          ctx.fillStyle = '#fff3b0';
          ctx.fillRect(x - 1, y - 1, 1, 1);
          ctx.fillStyle = '#c8962c';
          ctx.fillRect(x + 1, y + 1, 1, 1);
          break;
        case 'star':
          ctx.fillRect(x - 2, y, 5, 1);
          ctx.fillRect(x, y - 2, 1, 5);
          ctx.fillRect(x - 1, y - 1, 3, 3);
          break;
        case 'leaf':
          ctx.fillRect(x, y, 2, 1);
          ctx.fillRect(x + (Math.sin(p.t * 6 + p.rot) > 0 ? 1 : 0), y + 1, 2, 1);
          break;
        case 'heart':
          ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x - 1, y + 1, 3, 1); ctx.fillRect(x, y + 2, 1, 1);
          break;
        default:
          ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }
}
