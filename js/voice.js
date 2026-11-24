// Voix : ElevenLabs (avec cache local) ou synthèse vocale du navigateur en secours.

const API = 'https://api.elevenlabs.io/v1';
const CACHE = 'voix-elevenlabs-v1';

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export async function listVoices(apiKey) {
  const r = await fetch(`${API}/voices`, { headers: { 'xi-api-key': apiKey } });
  if (!r.ok) throw new Error(await errorText(r));
  const data = await r.json();
  return (data.voices || []).map((v) => ({
    id: v.voice_id,
    name: v.name,
    lang: v.labels?.language || v.labels?.accent || '',
    preview: v.preview_url,
  }));
}

async function errorText(r) {
  let msg = `Erreur ElevenLabs ${r.status}`;
  try {
    const j = await r.json();
    const d = j.detail;
    if (typeof d === 'string') msg += ` : ${d}`;
    else if (d?.message) msg += ` : ${d.message}`;
  } catch {}
  if (r.status === 401) msg = 'Clé API ElevenLabs refusée (401). Vérifiez-la dans les réglages.';
  if (r.status === 402 || r.status === 429) msg += ' (quota ou limite atteinte)';
  return msg;
}

export async function clearVoiceCache() {
  await caches.delete(CACHE);
}

export async function voiceCacheSize() {
  if (!('caches' in window)) return 0;
  const c = await caches.open(CACHE);
  return (await c.keys()).length;
}

export class Voice {
  constructor(getSettings) {
    this.getSettings = getSettings;
    this.ctx = null;
    this.out = null;
    this.buffers = new Map();
    this.current = null;
    this.fallback = false;
    this.onWarn = () => {};
  }

  attach(ctx, destination) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 1;
    this.out.connect(destination);
  }

  get useEleven() {
    const s = this.getSettings();
    return s.engine === 'elevenlabs' && s.apiKey && s.voiceId && !this.fallback;
  }

  setVolume(v) {
    if (this.out) this.out.gain.value = v;
  }

  keyFor(text) {
    const s = this.getSettings();
    return `${s.voiceId}|${s.model}|${s.speed}|${s.stability}|${text}`;
  }

  async fetchAudio(text) {
    const s = this.getSettings();
    const key = await sha(this.keyFor(text));
    const url = `${location.origin}/__voix/${key}.mp3`;
    let cache = null;
    if ('caches' in window) {
      cache = await caches.open(CACHE);
      const hit = await cache.match(url);
      if (hit) return hit.arrayBuffer();
    }
    const body = {
      text,
      model_id: s.model,
      voice_settings: {
        stability: Number(s.stability),
        similarity_boost: 0.8,
        style: 0,
        use_speaker_boost: true,
        speed: Number(s.speed),
      },
    };
    if (/flash|turbo/.test(s.model)) body.language_code = 'fr';
    const r = await fetch(`${API}/text-to-speech/${encodeURIComponent(s.voiceId)}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': s.apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await errorText(r));
    const blob = await r.blob();
    if (cache) await cache.put(url, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }));
    return blob.arrayBuffer();
  }

  async load(text) {
    const k = this.keyFor(text);
    if (this.buffers.has(k)) return this.buffers.get(k);
    const p = this.fetchAudio(text).then((ab) => this.ctx.decodeAudioData(ab));
    this.buffers.set(k, p);
    try {
      return await p;
    } catch (e) {
      this.buffers.delete(k);
      throw e;
    }
  }

  // Prépare à l'avance tous les textes connus d'une séance (2 requêtes en parallèle).
  async prepare(texts, onProgress = () => {}) {
    const list = [...new Set(texts)].filter(Boolean);
    if (!this.useEleven) {
      onProgress(1, 1);
      return;
    }
    let done = 0;
    onProgress(0, list.length);
    const queue = [...list];
    const worker = async () => {
      while (queue.length && !this.fallback) {
        const t = queue.shift();
        try {
          await this.load(t);
        } catch (e) {
          this.fallback = true;
          this.onWarn(`${e.message} — la voix du navigateur prend le relais.`);
          return;
        }
        onProgress(++done, list.length);
      }
    };
    await Promise.all([worker(), worker()]);
  }

  // Joue un texte et se résout à la fin (ou à l'arrêt).
  async speak(text, signal) {
    if (!text) return;
    if (signal?.aborted) return;
    if (this.useEleven) {
      let buf;
      try {
        buf = await this.load(text);
      } catch (e) {
        this.fallback = true;
        this.onWarn(`${e.message} — la voix du navigateur prend le relais.`);
        return this.speakBrowser(text, signal);
      }
      if (signal?.aborted) return;
      return new Promise((resolve) => {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.out);
        this.current = src;
        const end = () => {
          if (this.current === src) this.current = null;
          resolve();
        };
        src.onended = end;
        signal?.addEventListener('abort', () => {
          try { src.stop(); } catch {}
          end();
        }, { once: true });
        src.start();
      });
    }
    return this.speakBrowser(text, signal);
  }

  // Lance un texte sans attendre sa fin (repères de respiration).
  cue(text) {
    this.speak(text).catch(() => {});
  }

  speakBrowser(text, signal) {
    if (!('speechSynthesis' in window)) return Promise.resolve();
    const s = this.getSettings();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      const v = pickFrenchVoice(s.browserVoice);
      if (v) u.voice = v;
      u.rate = Math.max(0.6, Number(s.speed) * 0.88);
      u.pitch = 0.95;
      u.volume = Number(s.voiceVolume ?? 1);
      u.onend = u.onerror = () => resolve();
      signal?.addEventListener('abort', () => {
        speechSynthesis.cancel();
        resolve();
      }, { once: true });
      speechSynthesis.speak(u);
    });
  }

  pause() {
    if ('speechSynthesis' in window) speechSynthesis.pause();
  }

  resume() {
    if ('speechSynthesis' in window) speechSynthesis.resume();
  }

  stop() {
    try { this.current?.stop(); } catch {}
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
}

export function frenchVoices() {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('fr'));
}

function pickFrenchVoice(name) {
  const voices = frenchVoices();
  if (name) {
    const v = voices.find((x) => x.name === name);
    if (v) return v;
  }
  const rank = (v) => (/natural|neural|online/i.test(v.name) ? 3 : 0) + (/google|denise|henri|amélie|thomas/i.test(v.name) ? 2 : 0) + (v.lang === 'fr-FR' ? 1 : 0);
  return voices.sort((a, b) => rank(b) - rank(a))[0] || null;
}
