// Visuels plein écran (canvas). Mouvements lents, aucun clignotement.

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export class Visuals {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.mode = 'stars';
    this.opts = { dim: 0, light: 0.2, y: 0.05, full: false };
    this.target = { ...this.opts };
    this.time = 0;
    this.last = performance.now();
    this.paused = false;
    this.running = false;
    this.fade = 1;
    this.count = null;
    this.countT = 0;
    this.breath = { from: 0, to: 0, start: 0, dur: 1, label: '', left: 0 };
    this.words = [];
    this.leaves = [];
    this.nextLeaf = 0;
    this.motion = 1;
    this.stars = Array.from({ length: 140 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3,
      s: Math.random() * 0.012 + 0.003, p: Math.random() * TAU,
    }));
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.w = this.c.clientWidth || innerWidth;
    this.h = this.c.clientHeight || innerHeight;
    this.c.width = this.w * dpr;
    this.c.height = this.h * dpr;
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
  }

  set(mode, opts = {}) {
    if (mode && mode !== this.mode) {
      this.mode = mode;
      this.fade = 1;
      if (mode === 'leaves') this.nextLeaf = this.time + 0.5;
      // Les options d'un nouveau visuel s'appliquent sans transition.
      Object.assign(this.opts, opts);
    }
    Object.assign(this.target, opts);
  }

  setCount(n) {
    this.count = n;
    this.countT = this.time;
  }

  breathTo(to, dur, label) {
    const cur = this.breathValue();
    this.breath = { from: cur, to, start: this.time, dur: Math.max(dur, 0.01), label };
  }

  breathValue() {
    const b = this.breath;
    const t = Math.min(1, (this.time - b.start) / b.dur);
    return lerp(b.from, b.to, ease(t));
  }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.dt = this.paused ? 0 : dt;
    if (!this.paused) {
      this.time += dt;
      for (const k of Object.keys(this.target)) {
        if (typeof this.target[k] === 'number') this.opts[k] = lerp(this.opts[k] ?? 0, this.target[k], Math.min(1, dt * 0.6));
        else this.opts[k] = this.target[k];
      }
      this.fade = Math.max(0, this.fade - dt * 0.8);
    }
    this.draw();
    requestAnimationFrame(this.frame);
  }

  draw() {
    const { g, w, h } = this;
    g.save();
    const fn = this['draw_' + this.mode] || this.draw_stars;
    fn.call(this, g, w, h, this.time * this.motion);
    if (this.count != null) this.drawCount(g, w, h);
    if (this.fade > 0) {
      g.fillStyle = `rgba(7,9,14,${this.fade})`;
      g.fillRect(0, 0, w, h);
    }
    g.restore();
  }

  bg(g, w, h, inner = '#141a2a', outer = '#07090e') {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 1.6);
    r.addColorStop(0, inner);
    r.addColorStop(1, outer);
    g.fillStyle = r;
    g.fillRect(0, 0, w, h);
  }

  draw_stars(g, w, h, t) {
    this.bg(g, w, h);
    for (const s of this.stars) {
      const y = ((s.y - t * s.s) % 1 + 1) % 1;
      const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.6 + s.p));
      g.fillStyle = `rgba(200,225,235,${a})`;
      g.beginPath();
      g.arc(s.x * w, y * h, s.r, 0, TAU);
      g.fill();
    }
  }

  draw_breath(g, w, h) {
    this.bg(g, w, h, '#10222a', '#06090d');
    const v = this.breathValue();
    const m = Math.min(w, h);
    const r = lerp(m * 0.12, m * 0.34, v);
    for (let i = 4; i >= 1; i--) {
      g.fillStyle = `rgba(78,205,196,${0.035 * i})`;
      g.beginPath();
      g.arc(w / 2, h / 2, r + i * m * 0.035, 0, TAU);
      g.fill();
    }
    const grd = g.createRadialGradient(w / 2, h / 2, r * 0.1, w / 2, h / 2, r);
    grd.addColorStop(0, 'rgba(140,235,225,0.55)');
    grd.addColorStop(1, 'rgba(40,150,150,0.25)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(w / 2, h / 2, r, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(160,240,230,0.5)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(w / 2, h / 2, m * 0.34, 0, TAU);
    g.setLineDash([2, 8]);
    g.stroke();
    g.setLineDash([]);
    const b = this.breath;
    if (b.label) {
      const left = Math.max(0, Math.ceil(b.dur - (this.time - b.start)));
      g.fillStyle = 'rgba(235,245,240,0.92)';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `600 ${Math.round(m * 0.05)}px "Bricolage Grotesque", system-ui, sans-serif`;
      g.fillText(b.label, w / 2, h / 2 - m * 0.015);
      g.font = `400 ${Math.round(m * 0.028)}px "IBM Plex Mono", monospace`;
      g.fillStyle = 'rgba(235,245,240,0.6)';
      g.fillText(String(left), w / 2, h / 2 + m * 0.05);
    }
  }

  draw_spiral(g, w, h, t) {
    this.bg(g, w, h, '#16142b', '#06060c');
    const cx = w / 2, cy = h / 2;
    const R = Math.hypot(w, h) / 2;
    const rot = t * 0.22;
    const arms = 2;
    const turns = 9;
    g.lineWidth = Math.max(2, Math.min(w, h) * 0.012);
    g.lineCap = 'round';
    for (let a = 0; a < arms; a++) {
      g.beginPath();
      const steps = 900;
      for (let i = 0; i <= steps; i++) {
        const th = (i / steps) * turns * TAU;
        const r = (th / (turns * TAU)) * R;
        const ang = th - rot + (a * TAU) / arms;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      const grd = g.createRadialGradient(cx, cy, 0, cx, cy, R);
      grd.addColorStop(0, a ? 'rgba(150,140,255,0.55)' : 'rgba(110,220,210,0.55)');
      grd.addColorStop(1, 'rgba(60,60,120,0.05)');
      g.strokeStyle = grd;
      g.stroke();
    }
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.8);
    const core = g.createRadialGradient(cx, cy, 0, cx, cy, 40 + pulse * 10);
    core.addColorStop(0, 'rgba(255,255,255,0.9)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = core;
    g.beginPath();
    g.arc(cx, cy, 50, 0, TAU);
    g.fill();
  }

  draw_fixation(g, w, h, t) {
    const dim = this.opts.dim || 0;
    this.bg(g, w, h, `rgb(${lerp(26, 8, dim)},${lerp(30, 10, dim)},${lerp(48, 16, dim)})`, '#030407');
    const cx = w / 2, cy = h / 2;
    const p = 0.5 + 0.5 * Math.sin((t * TAU) / 8);
    const halo = g.createRadialGradient(cx, cy, 0, cx, cy, 90 + p * 40);
    halo.addColorStop(0, `rgba(255,230,190,${0.35 + 0.2 * p})`);
    halo.addColorStop(1, 'rgba(255,230,190,0)');
    g.fillStyle = halo;
    g.beginPath();
    g.arc(cx, cy, 140, 0, TAU);
    g.fill();
    g.fillStyle = '#fff6e8';
    g.beginPath();
    g.arc(cx, cy, 4.5, 0, TAU);
    g.fill();
    // Vignettage progressif : le champ visuel se resserre.
    const v = g.createRadialGradient(cx, cy, Math.min(w, h) * lerp(0.6, 0.18, dim), cx, cy, Math.hypot(w, h) / 2);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, `rgba(0,0,0,${lerp(0.3, 0.92, dim)})`);
    g.fillStyle = v;
    g.fillRect(0, 0, w, h);
  }

  draw_leaves(g, w, h, t) {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0b1a1e');
    sky.addColorStop(1, '#0d2a2c');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // Courant
    g.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      const y0 = (i / 26) * h;
      g.strokeStyle = `rgba(120,200,200,${0.05 + (i % 3) * 0.02})`;
      g.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const y = y0 + Math.sin(x * 0.012 - t * 0.9 + i) * 6;
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    if (t >= this.nextLeaf) {
      const word = this.words.length ? this.words[this.leaves.length % this.words.length] : '';
      this.leaves.push({ x: -120, y: h * (0.2 + Math.random() * 0.6), rot: Math.random() * 0.6 - 0.3, word, sp: 42 + Math.random() * 14, ph: Math.random() * TAU });
      this.nextLeaf = t + 4.5 + Math.random() * 2;
    }
    const dt = this.dt || 0;
    this.leaves = this.leaves.filter((l) => l.x < w + 220);
    for (const l of this.leaves) {
      l.x += l.sp * dt * this.motion;
      const y = l.y + Math.sin(t * 0.7 + l.ph) * 10;
      g.save();
      g.translate(l.x, y);
      g.rotate(l.rot + Math.sin(t * 0.5 + l.ph) * 0.08);
      const lw = Math.max(110, Math.min(260, 40 + (l.word.length || 6) * 8));
      const grd = g.createLinearGradient(-lw / 2, 0, lw / 2, 0);
      grd.addColorStop(0, 'rgba(190,170,90,0.85)');
      grd.addColorStop(1, 'rgba(110,160,80,0.85)');
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(0, 0, lw / 2, 26, 0, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(60,80,40,0.6)';
      g.beginPath();
      g.moveTo(-lw / 2 + 8, 0);
      g.lineTo(lw / 2 - 8, 0);
      g.stroke();
      if (l.word) {
        g.fillStyle = '#10201a';
        g.font = '500 14px "Source Serif 4", Georgia, serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(l.word.length > 32 ? l.word.slice(0, 31) + '…' : l.word, 0, -1);
      }
      g.restore();
    }
  }

  draw_horizon(g, w, h, t) {
    const L = this.opts.light ?? 0.3;
    const sky = g.createLinearGradient(0, 0, 0, h * 0.62);
    sky.addColorStop(0, `rgb(${lerp(8, 70, L)},${lerp(10, 110, L)},${lerp(26, 170, L)})`);
    sky.addColorStop(1, `rgb(${lerp(30, 250, L)},${lerp(24, 190, L)},${lerp(48, 140, L)})`);
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h * 0.62);
    const sunY = lerp(h * 0.7, h * 0.4, L);
    const sun = g.createRadialGradient(w / 2, sunY, 0, w / 2, sunY, Math.min(w, h) * 0.32);
    sun.addColorStop(0, `rgba(255,236,190,${0.4 + 0.5 * L})`);
    sun.addColorStop(0.18, `rgba(255,200,140,${0.3 + 0.3 * L})`);
    sun.addColorStop(1, 'rgba(255,180,120,0)');
    g.fillStyle = sun;
    g.fillRect(0, 0, w, h * 0.62);
    const sea = g.createLinearGradient(0, h * 0.62, 0, h);
    sea.addColorStop(0, `rgb(${lerp(14, 90, L)},${lerp(20, 110, L)},${lerp(40, 150, L)})`);
    sea.addColorStop(1, '#05070c');
    g.fillStyle = sea;
    g.fillRect(0, h * 0.62, w, h * 0.38);
    for (let i = 0; i < 14; i++) {
      const y = h * 0.63 + i * i * 1.8;
      g.strokeStyle = `rgba(255,220,180,${(0.18 - i * 0.011) * (0.3 + L)})`;
      g.beginPath();
      for (let x = 0; x <= w; x += 12) {
        const yy = y + Math.sin(x * 0.02 + t * (0.5 + i * 0.05) + i) * (1 + i * 0.4);
        x ? g.lineTo(x, yy) : g.moveTo(x, yy);
      }
      g.stroke();
    }
  }

  draw_scan(g, w, h, t) {
    this.bg(g, w, h, '#121a26', '#05070b');
    const s = Math.min(w / 1.6, h / 1.15);
    const ox = w / 2, oy = (h - s) / 2;
    const Y = (v) => oy + v * s;
    const band = Y(this.opts.y ?? 0.1);
    const full = this.opts.full;
    // Silhouette
    g.save();
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(150,200,220,0.35)';
    g.fillStyle = 'rgba(80,140,170,0.08)';
    g.beginPath();
    g.arc(ox, Y(0.08), s * 0.065, 0, TAU);
    g.fill(); g.stroke();
    g.beginPath();
    g.roundRect(ox - s * 0.1, Y(0.17), s * 0.2, s * 0.36, s * 0.05);
    g.fill(); g.stroke();
    g.lineWidth = s * 0.045;
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(80,140,170,0.22)';
    const limb = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1, Y(y1)); g.lineTo(x2, Y(y2)); g.stroke(); };
    limb(ox - s * 0.12, 0.2, ox - s * 0.2, 0.48);
    limb(ox + s * 0.12, 0.2, ox + s * 0.2, 0.48);
    limb(ox - s * 0.05, 0.55, ox - s * 0.07, 0.95);
    limb(ox + s * 0.05, 0.55, ox + s * 0.07, 0.95);
    g.restore();
    // Bande de lumière
    const p = 0.5 + 0.5 * Math.sin(t * 0.9);
    if (full) {
      g.fillStyle = `rgba(120,230,220,${0.06 + 0.05 * p})`;
      g.fillRect(0, 0, w, h);
    } else {
      const bh = s * 0.12;
      const grd = g.createLinearGradient(0, band - bh, 0, band + bh);
      grd.addColorStop(0, 'rgba(120,230,220,0)');
      grd.addColorStop(0.5, `rgba(120,230,220,${0.22 + 0.1 * p})`);
      grd.addColorStop(1, 'rgba(120,230,220,0)');
      g.fillStyle = grd;
      g.fillRect(0, band - bh, w, bh * 2);
    }
  }

  draw_glow(g, w, h, t) {
    this.bg(g, w, h, '#24151a', '#08060a');
    const p = 0.5 + 0.5 * Math.sin((t * TAU) / 10);
    const m = Math.min(w, h);
    const r = m * (0.22 + 0.08 * p);
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r * 1.6);
    grd.addColorStop(0, `rgba(255,190,150,${0.5 + 0.2 * p})`);
    grd.addColorStop(0.45, 'rgba(230,120,110,0.18)');
    grd.addColorStop(1, 'rgba(230,120,110,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  }

  drawCount(g, w, h) {
    const a = Math.min(1, (this.time - this.countT) / 0.8);
    const m = Math.min(w, h);
    g.fillStyle = `rgba(240,246,244,${0.55 * a})`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `300 ${Math.round(m * 0.22)}px "Bricolage Grotesque", system-ui, sans-serif`;
    g.fillText(String(this.count), w / 2, h * 0.36);
  }
}
