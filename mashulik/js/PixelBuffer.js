'use strict';

/**
 * Offscreen-холст для процедурного pixel-art.
 * Все примитивы рисуют целыми пикселями через fillRect().
 */
class PixelBuffer {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  }

  px(x, y, c) {
    if (!c) return;
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  rect(x, y, w, h, c) {
    if (!c) return;
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  clear(x, y, w, h) {
    this.ctx.clearRect(x, y, w, h);
  }

  /** пиксельный диск */
  disc(cx, cy, r, c) {
    const r2 = r * r + r * 0.6;
    for (let y = Math.floor(-r); y <= Math.ceil(r); y++) {
      for (let x = Math.floor(-r); x <= Math.ceil(r); x++) {
        if (x * x + y * y <= r2) this.px(cx + x, cy + y, c);
      }
    }
  }

  /** пиксельный эллипс (заливка) */
  ellipse(cx, cy, rx, ry, c) {
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
        if ((x * x) / (rx * rx + 0.3) + (y * y) / (ry * ry + 0.3) <= 1) this.px(cx + x, cy + y, c);
      }
    }
  }

  /** линия Брезенхэма */
  line(x0, y0, x1, y1, c, w = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.rect(x0, y0, w, w, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** квадратичная кривая пикселями */
  curve(x0, y0, cx, cy, x1, y1, c, w = 1) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5) + 2;
    let px = x0, py = y0;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      this.line(px, py, x, y, c, w);
      px = x; py = y;
    }
  }

  /**
   * Обводка по силуэту: каждый прозрачный пиксель рядом с непрозрачным
   * закрашивается затемнённым цветом соседа (или фиксированным цветом).
   */
  outline(fixed = null, k = 0.55) {
    const img = this.ctx.getImageData(0, 0, this.w, this.h);
    const d = img.data;
    const out = new Uint8ClampedArray(d);
    const W = this.w, H = this.h;
    let fr = 0, fg = 0, fb = 0;
    if (fixed) [fr, fg, fb] = Utils.hexToRgb(fixed);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (d[i + 3] > 20) continue;
        let n = -1;
        if (x > 0 && d[i - 4 + 3] > 120) n = i - 4;
        else if (x < W - 1 && d[i + 4 + 3] > 120) n = i + 4;
        else if (y > 0 && d[i - W * 4 + 3] > 120) n = i - W * 4;
        else if (y < H - 1 && d[i + W * 4 + 3] > 120) n = i + W * 4;
        if (n < 0) continue;
        if (fixed) { out[i] = fr; out[i + 1] = fg; out[i + 2] = fb; }
        else { out[i] = d[n] * k; out[i + 1] = d[n + 1] * k; out[i + 2] = d[n + 2] * k; }
        out[i + 3] = 255;
      }
    }
    img.data.set(out);
    this.ctx.putImageData(img, 0, 0);
  }

  /** зеркальная копия */
  flipped() {
    const b = new PixelBuffer(this.w, this.h);
    b.ctx.save();
    b.ctx.translate(this.w, 0);
    b.ctx.scale(-1, 1);
    b.ctx.drawImage(this.canvas, 0, 0);
    b.ctx.restore();
    return b;
  }

  /**
   * Растеризация листа. Лист задаётся основанием (x0,y0), углом, длиной и шириной.
   * shape(u) -> полуширина 0..1 вдоль листа, fill(u, vn, x, y) -> цвет или null (дырка).
   * uMin < 0 позволяет рисовать «лопасти» за основанием (у алоказий).
   */
  leaf(x0, y0, angleDeg, len, wid, shape, fill, uMin = 0) {
    const a = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(a), dy = Math.sin(a);
    const half = wid / 2;
    const R = len + half + 2;
    for (let y = Math.floor(y0 - R); y <= Math.ceil(y0 + R); y++) {
      for (let x = Math.floor(x0 - R); x <= Math.ceil(x0 + R); x++) {
        const px = x + 0.5 - x0, py = y + 0.5 - y0;
        const u = (px * dx + py * dy) / len;
        if (u < uMin || u > 1) continue;
        const v = (-px * dy + py * dx) / half;
        const w = shape(u, v);
        if (w <= 0 || Math.abs(v) > w) continue;
        const c = fill(u, v / w, x, y, v);
        if (c) this.px(x, y, c);
      }
    }
  }
}
