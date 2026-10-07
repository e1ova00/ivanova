'use strict';

/**
 * Простые прямоугольные коллизии (AABB) + сетка проходимости и A* для click-to-move.
 * Персонаж сталкивается «ступнями» — небольшим прямоугольником у ног.
 */
class CollisionSystem {
  constructor(bounds) {
    this.bounds = bounds; // {x, y, w, h} — проходимая часть пола
    this.obstacles = [];
    this.cell = 4;
    this.feet = { w: 10, h: 4 };
    this.cols = 0;
    this.rows = 0;
    this.grid = null;
  }

  setObstacles(list) {
    this.obstacles = list;
    this.buildGrid();
  }

  static overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  feetBox(x, y) {
    return { x: x - this.feet.w / 2, y: y - this.feet.h, w: this.feet.w, h: this.feet.h };
  }

  /** свободна ли точка для ног персонажа */
  isFree(x, y) {
    const B = this.bounds;
    const f = this.feetBox(x, y);
    if (f.x < B.x || f.y < B.y || f.x + f.w > B.x + B.w || f.y + f.h > B.y + B.h) return false;
    for (const o of this.obstacles) if (CollisionSystem.overlap(f, o)) return false;
    return true;
  }

  /**
   * Движение с разделением по осям — персонаж «скользит» вдоль мебели,
   * а не застревает в ней.
   */
  move(x, y, dx, dy) {
    let nx = x, ny = y;
    let blocked = false;
    if (dx && this.isFree(x + dx, y)) nx = x + dx; else if (dx) blocked = true;
    if (dy && this.isFree(nx, y + dy)) ny = y + dy; else if (dy) blocked = true;
    return { x: nx, y: ny, blocked };
  }

  buildGrid() {
    const c = this.cell;
    this.cols = Math.ceil(480 / c);
    this.rows = Math.ceil(270 / c);
    this.grid = new Uint8Array(this.cols * this.rows);
    for (let r = 0; r < this.rows; r++) {
      for (let q = 0; q < this.cols; q++) {
        this.grid[r * this.cols + q] = this.isFree(q * c + c / 2, r * c + c / 2) ? 1 : 0;
      }
    }
  }

  toCell(x, y) {
    return [Utils.clamp(Math.floor(x / this.cell), 0, this.cols - 1), Utils.clamp(Math.floor(y / this.cell), 0, this.rows - 1)];
  }

  cellCenter(q, r) {
    return [q * this.cell + this.cell / 2, r * this.cell + this.cell / 2];
  }

  walkable(q, r) {
    return q >= 0 && r >= 0 && q < this.cols && r < this.rows && this.grid[r * this.cols + q] === 1;
  }

  /** ближайшая проходимая клетка (поиск в ширину) */
  nearestFree(x, y) {
    const [sq, sr] = this.toCell(x, y);
    if (this.walkable(sq, sr)) return [sq, sr];
    const seen = new Uint8Array(this.cols * this.rows);
    const queue = [[sq, sr]];
    seen[sr * this.cols + sq] = 1;
    while (queue.length) {
      const [q, r] = queue.shift();
      for (const [dq, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nq = q + dq, nr = r + dr;
        if (nq < 0 || nr < 0 || nq >= this.cols || nr >= this.rows) continue;
        const i = nr * this.cols + nq;
        if (seen[i]) continue;
        seen[i] = 1;
        if (this.grid[i]) return [nq, nr];
        queue.push([nq, nr]);
      }
    }
    return null;
  }

  /** прямая видимость между точками для сглаживания пути */
  lineFree(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(d / 2);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!this.isFree(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }

  /** A* по сетке, возвращает список точек (сглаженный) */
  findPath(x0, y0, x1, y1) {
    if (this.lineFree(x0, y0, x1, y1) && this.isFree(x1, y1)) return [[x1, y1]];
    const start = this.nearestFree(x0, y0);
    const goal = this.nearestFree(x1, y1);
    if (!start || !goal) return null;
    const C = this.cols;
    const N = this.cols * this.rows;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const si = start[1] * C + start[0];
    const gi = goal[1] * C + goal[0];
    const h = (i) => {
      const dq = Math.abs((i % C) - goal[0]), dr = Math.abs(Math.floor(i / C) - goal[1]);
      return Math.max(dq, dr) + 0.414 * Math.min(dq, dr);
    };
    // бинарная куча
    const heap = [];
    const push = (i, f) => {
      heap.push([f, i]);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heap[p][0] <= heap[k][0]) break;
        [heap[p], heap[k]] = [heap[k], heap[p]];
        k = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1, r = l + 1;
          let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]];
          k = m;
        }
      }
      return top[1];
    };
    g[si] = 0;
    push(si, h(si));
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let found = false;
    let guard = 0;
    while (heap.length && guard++ < 20000) {
      const cur = pop();
      if (cur === gi) { found = true; break; }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const q = cur % C, r = Math.floor(cur / C);
      for (const [dq, dr, cost] of dirs) {
        const nq = q + dq, nr = r + dr;
        if (!this.walkable(nq, nr)) continue;
        if (dq && dr && (!this.walkable(q + dq, r) || !this.walkable(q, r + dr))) continue;
        const ni = nr * C + nq;
        const ng = g[cur] + cost;
        if (ng < g[ni]) {
          g[ni] = ng;
          came[ni] = cur;
          push(ni, ng + h(ni));
        }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let i = gi; i !== -1 && i !== si; i = came[i]) cells.push(i);
    cells.reverse();
    let pts = cells.map((i) => this.cellCenter(i % C, Math.floor(i / C)));
    // конечная точка — точная, если свободна
    if (this.isFree(x1, y1)) pts.push([x1, y1]);
    // сглаживание: выкидываем промежуточные точки при прямой видимости
    const out = [];
    let ax = x0, ay = y0;
    let k = 0;
    while (k < pts.length) {
      let far = k;
      for (let j = pts.length - 1; j > k; j--) {
        if (this.lineFree(ax, ay, pts[j][0], pts[j][1])) { far = j; break; }
      }
      out.push(pts[far]);
      [ax, ay] = pts[far];
      k = far + 1;
    }
    return out;
  }
}
