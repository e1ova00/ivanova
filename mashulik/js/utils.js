'use strict';

/**
 * Небольшие утилиты, общие для всех модулей игры.
 */
const Utils = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  chance: (p) => Math.random() < p,
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],

  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),

  /** 18450 -> «18 450 ₽» */
  money(n) {
    const v = Math.round(n);
    const s = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + s + ' ₽';
  },

  /** минуты от полуночи -> «14:25» */
  time(min) {
    const h = Math.floor(min / 60) % 24;
    const m = Math.floor(min % 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  },

  /** рейтинг 4.567 -> «4,6» */
  rating: (r) => r.toFixed(1).replace('.', ','),

  /** Подстановка рода покупателя: «умудрил{ась|ся}» */
  g(text, gender) {
    return text.replace(/\{([^|{}]*)\|([^|{}]*)\}/g, (_, f, m) => (gender === 'm' ? m : f));
  },

  /** Подстановка рода растения: «эт[а|от|о]» (ж|м|ср) */
  pg(text, pgender) {
    return text.replace(/\[([^|\[\]]*)\|([^|\[\]]*)\|([^|\[\]]*)\]/g, (_, f, m, n) =>
      pgender === 'm' ? m : pgender === 'n' ? n : f);
  },

  /** детерминированный псевдослучайный хэш 0..1 для пиксельных узоров */
  hash(x, y, s = 0) {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return ((h >>> 0) % 10000) / 10000;
  },

  /** простой seeded-генератор */
  seeded(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  },

  hexToRgb(hex) {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  },

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((c) => Utils.clamp(Math.round(c), 0, 255).toString(16).padStart(2, '0')).join('');
  },

  mix(hexA, hexB, t) {
    const a = Utils.hexToRgb(hexA);
    const b = Utils.hexToRgb(hexB);
    return Utils.rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  },

  shade(hex, k) {
    const a = Utils.hexToRgb(hex);
    return Utils.rgbToHex(a[0] * k, a[1] * k, a[2] * k);
  },

  capitalize: (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s),

  stars(n) {
    const full = Math.round(n);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  },
};
