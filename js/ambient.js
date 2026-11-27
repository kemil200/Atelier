// Fond sonore généré : bruit brun filtré + battements binauraux optionnels (casque).

export const BEATS = {
  apaiser: 8, // alpha
  hypnose: 6, // thêta
  penser: 10,
  energie: 14, // bêta bas
  soi: 6, // thêta
};

export class Ambient {
  constructor() {
    this.nodes = [];
    this.master = null;
  }

  start(ctx, dest, { noise = 0.3, binaural = false, beat = 6 } = {}) {
    this.stop();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(dest);
    master.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
    this.master = master;
    this.ctx = ctx;

    if (noise > 0) {
      const len = ctx.sampleRate * 6;
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.02 * white) / 1.02;
          d[i] = last * 3.2;
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 520;
      const g = ctx.createGain();
      g.gain.value = noise * 0.5;
      // Lente ondulation, comme une respiration de vagues.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = noise * 0.18;
      lfo.connect(lfoGain).connect(g.gain);
      src.connect(lp).connect(g).connect(master);
      src.start();
      lfo.start();
      this.nodes.push(src, lfo);
      this.noiseGain = g;
    }

    if (binaural) {
      const base = 180;
      const mk = (freq, pan) => {
        const o = ctx.createOscillator();
        o.frequency.value = freq;
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        const g = ctx.createGain();
        g.gain.value = 0.045;
        o.connect(g).connect(p).connect(master);
        o.start();
        this.nodes.push(o);
        return o;
      };
      mk(base, -1);
      this.beatOsc = mk(base + beat, 1);
    }
  }

  // Cloche douce (partiels inharmoniques, longue décroissance).
  bell(ctx, dest) {
    const t = ctx.currentTime;
    [[432, 1], [1083, 0.35], [1660, 0.18], [2470, 0.08]].forEach(([f, a]) => {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22 * a, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 7);
      o.connect(g).connect(dest);
      o.start(t);
      o.stop(t + 7.2);
    });
  }

  setNoise(v) {
    if (this.noiseGain) this.noiseGain.gain.value = v * 0.5;
  }

  stop() {
    if (this.master && this.ctx) {
      const m = this.master;
      const nodes = this.nodes;
      m.gain.cancelScheduledValues(this.ctx.currentTime);
      m.gain.setValueAtTime(m.gain.value, this.ctx.currentTime);
      m.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
      setTimeout(() => {
        nodes.forEach((n) => { try { n.stop(); } catch {} });
        m.disconnect();
      }, 1700);
    }
    this.nodes = [];
    this.master = null;
    this.noiseGain = null;
  }
}
