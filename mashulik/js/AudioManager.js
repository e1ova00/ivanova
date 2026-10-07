'use strict';

/**
 * Весь звук синтезируется Web Audio API — без аудиофайлов.
 * AudioContext создаётся только после первого действия пользователя.
 */
class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicTimer = null;
    this.nextNoteTime = 0;
    this.step = 0;
    this.bar = 0;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    // мягкий фильтр для «тёплого» чиптюна
    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 2200;
    this.musicGain.connect(this.musicFilter);
    this.musicFilter.connect(this.master);
    this.sfxGain.connect(this.master);
    this.applySettings();
    this.startMusic();
  }

  applySettings() {
    if (!this.ctx) return;
    const s = this.settings;
    const now = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(s.music ? s.musicVolume * 0.32 : 0, now, 0.2);
    this.sfxGain.gain.setTargetAtTime(s.sound ? s.soundVolume * 0.7 : 0, now, 0.05);
  }

  // ---------- примитивы ----------
  tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, attack = 0.005, slide = 0, dest = null } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(dest || this.sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  noise(dur, { vol = 0.2, at = 0, freq = 1200, q = 1, type = 'bandpass' } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + at;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
  }

  // ---------- эффекты ----------
  play(name) {
    if (!this.ctx || !this.settings.sound) return;
    switch (name) {
      case 'click':
        this.tone(880, 0.06, { type: 'square', vol: 0.05 });
        this.tone(1320, 0.04, { type: 'square', vol: 0.03, at: 0.03 });
        break;
      case 'bell':
        this.tone(1568, 0.9, { vol: 0.12 });
        this.tone(2093, 0.8, { vol: 0.08, at: 0.12 });
        this.tone(3136, 0.4, { vol: 0.03, at: 0.12 });
        break;
      case 'water':
        for (let i = 0; i < 6; i++) {
          this.tone(Utils.rand(900, 1500), 0.08, { vol: 0.05, at: i * 0.07, slide: 0.5 });
        }
        this.noise(0.5, { vol: 0.05, freq: 2400, q: 0.7 });
        break;
      case 'checkout':
        this.noise(0.12, { vol: 0.12, freq: 3000, q: 2 });
        this.tone(1318, 0.25, { type: 'triangle', vol: 0.12, at: 0.1 });
        this.tone(1760, 0.5, { type: 'triangle', vol: 0.1, at: 0.18 });
        break;
      case 'coins':
        [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f, 0.12, { type: 'square', vol: 0.035, at: i * 0.05 }));
        break;
      case 'correct':
        this.tone(784, 0.12, { type: 'triangle', vol: 0.12 });
        this.tone(1175, 0.22, { type: 'triangle', vol: 0.12, at: 0.09 });
        break;
      case 'wrong':
        this.tone(330, 0.18, { type: 'triangle', vol: 0.1, slide: 0.8 });
        this.tone(262, 0.25, { type: 'triangle', vol: 0.08, at: 0.12, slide: 0.85 });
        break;
      case 'achievement':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.09, at: i * 0.08 }));
        this.tone(2093, 0.6, { vol: 0.05, at: 0.35 });
        break;
      case 'levelup':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.3, { type: 'square', vol: 0.04, at: i * 0.09 }));
        [1568, 2093].forEach((f, i) => this.tone(f, 0.8, { vol: 0.06, at: 0.5 + i * 0.1 }));
        break;
      case 'delivery':
        this.noise(0.08, { vol: 0.25, freq: 220, q: 1, type: 'lowpass' });
        this.noise(0.08, { vol: 0.25, freq: 220, q: 1, type: 'lowpass', at: 0.16 });
        this.tone(660, 0.15, { type: 'triangle', vol: 0.08, at: 0.35 });
        this.tone(880, 0.25, { type: 'triangle', vol: 0.08, at: 0.45 });
        break;
      case 'pop':
        this.tone(600, 0.08, { vol: 0.08, slide: 1.8 });
        break;
      case 'page':
        this.noise(0.1, { vol: 0.05, freq: 4000, q: 0.5 });
        break;
      default:
        break;
    }
  }

  // ---------- фоновая мелодия ----------
  /**
   * Мягкий lo-fi чиптюн: аккорды Fmaj7 – Em7 – Dm7 – Cmaj7 (треугольная волна),
   * пентатоническая мелодия (квадрат, тихо) и «колокольчики».
   */
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.scheduler(), 90);
  }

  scheduler() {
    const bpm = 78;
    const stepDur = 60 / bpm / 2; // восьмые
    while (this.nextNoteTime < this.ctx.currentTime + 0.35) {
      this.playStep(this.step, this.nextNoteTime, stepDur);
      this.nextNoteTime += stepDur;
      this.step++;
    }
  }

  playStep(step, time, dur) {
    const chords = [
      [174.6, 220, 261.6, 329.6], // Fmaj7
      [164.8, 196, 246.9, 293.7], // Em7
      [146.8, 174.6, 220, 261.6], // Dm7
      [130.8, 164.8, 196, 246.9], // Cmaj7
    ];
    const bar = Math.floor(step / 8) % 4;
    const s = step % 8;
    const chord = chords[bar];
    const at = time - this.ctx.currentTime;
    const mg = this.musicGain;
    // бас и арпеджио
    if (s === 0) this.tone(chord[0] / 2, dur * 7, { type: 'triangle', vol: 0.16, at, attack: 0.03, dest: mg });
    const arp = [0, 2, 1, 3, 2, 1, 3, 2][s];
    this.tone(chord[arp] * 2, dur * 1.6, { type: 'triangle', vol: 0.05, at, attack: 0.01, dest: mg });
    // мелодия — детерминированная по такту, чтобы звучала как композиция
    const phrase = [
      [9, null, 7, null, 5, 7, null, null],
      [7, null, 4, null, 2, null, 4, null],
      [5, null, 7, 9, null, 7, null, null],
      [4, null, 2, null, 0, null, null, null],
    ];
    const cycle = Math.floor(step / 32) % 2;
    const n = phrase[bar][s];
    const scale = [523.3, 587.3, 659.3, 698.5, 784, 880, 987.8, 1046.5, 1174.7, 1318.5];
    if (n !== null && n !== undefined) {
      const idx = cycle ? Math.max(0, n - 2) : n;
      this.tone(scale[idx] || scale[0], dur * 1.8, { type: 'square', vol: 0.022, at, attack: 0.02, dest: mg });
      this.tone((scale[idx] || scale[0]) * 2, dur * 1.2, { type: 'sine', vol: 0.012, at: at + 0.01, dest: mg });
    }
    // мерцающие «колокольчики» иногда
    if (s === 5 && bar % 2 === 1) this.tone(scale[7 + (bar % 3)] * 2, 0.6, { vol: 0.012, at, dest: mg });
  }
}
