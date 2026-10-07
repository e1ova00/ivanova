'use strict';

/**
 * Ввод: Pointer Events (мышь, тач, стилус — iPad) и клавиатура WASD/стрелки.
 */
class InputHandler {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.keys = new Set();
    this.hover = null;

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      game.audio.unlock();
      const [x, y] = this.toWorld(e);
      game.onPointerDown(x, y);
    });
    canvas.addEventListener('pointermove', (e) => {
      const [x, y] = this.toWorld(e);
      this.hover = [x, y];
      canvas.style.cursor = game.isClickable(x, y) ? 'pointer' : 'default';
    });
    canvas.addEventListener('pointerup', (e) => e.preventDefault());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    const MAP = {
      KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
      KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    };
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (MAP[e.code]) {
        this.keys.add(MAP[e.code]);
        e.preventDefault();
      }
      if (e.code === 'Escape') game.onEscape();
    });
    window.addEventListener('keyup', (e) => {
      if (MAP[e.code]) this.keys.delete(MAP[e.code]);
    });
    window.addEventListener('blur', () => this.keys.clear());
  }

  toWorld(e) {
    const r = this.canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 480, ((e.clientY - r.top) / r.height) * 270];
  }

  /** вектор движения с клавиатуры */
  get vector() {
    let x = 0, y = 0;
    if (this.keys.has('left')) x -= 1;
    if (this.keys.has('right')) x += 1;
    if (this.keys.has('up')) y -= 1;
    if (this.keys.has('down')) y += 1;
    return { x, y };
  }
}
