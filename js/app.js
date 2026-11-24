import { SESSIONS, FAMILIES, BREATH_CUES } from './sessions.js';
import { Voice, listVoices, clearVoiceCache, voiceCacheSize, frenchVoices } from './voice.js';
import { Visuals } from './visuals.js';
import { Ambient, BEATS } from './ambient.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Stockage local ---------- */
const store = {
  get(k, d) {
    try { const v = localStorage.getItem('atelier.' + k); return v == null ? d : JSON.parse(v); } catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem('atelier.' + k, JSON.stringify(v)); } catch {}
  },
};

const DEFAULTS = {
  engine: 'browser', apiKey: '', voiceId: '', voiceName: '', voices: [],
  model: 'eleven_multilingual_v2', speed: 0.9, stability: 0.6, voiceVolume: 1,
  browserVoice: '', noise: 0.35, binaural: false, captions: true,
  reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, fullscreen: true,
};
let settings = { ...DEFAULTS, ...store.get('settings', {}) };
const saveSettings = () => store.set('settings', settings);
let journal = store.get('journal', []);

/* ---------- Audio partagé ---------- */
let ctx = null;
let master = null;
function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.connect(ctx.destination);
    voice.attach(ctx, master);
    voice.setVolume(settings.voiceVolume);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
const voice = new Voice(() => settings);
voice.onWarn = (m) => toast(m, 7000);
const ambient = new Ambient();

let toastTimer;
function toast(msg, ms = 3500) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), ms);
}

/* ---------- Accueil : stats, puces, panneau ---------- */
function dayKey(d) { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; }
function streak() {
  const days = new Set(journal.map((e) => dayKey(e.date)));
  let n = 0;
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function renderStats() {
  const minutes = Math.round(journal.reduce((a, e) => a + (e.minutes || 0), 0));
  const withBoth = journal.filter((e) => e.avant != null && e.apres != null);
  const avg = withBoth.length ? withBoth.reduce((a, e) => a + (e.avant - e.apres), 0) / withBoth.length : null;
  $('#stats').innerHTML = `
    <div class="stat"><b>${journal.length}</b><span>séance${journal.length > 1 ? 's' : ''}</span></div>
    <div class="stat"><b>${minutes}</b><span>minutes</span></div>
    <div class="stat"><b>${streak()}</b><span>jours de suite</span></div>
    <div class="stat"><b>${avg == null ? '–' : (avg > 0 ? '−' : '+') + Math.abs(avg).toFixed(1)}</b><span>tension moyenne</span></div>`;
}

let selected = store.get('selected', SESSIONS[0].id);
let before = 5;

function renderChips() {
  $('#legend').innerHTML = Object.values(FAMILIES).map((f) => `<span style="--fam:${f.color}">${f.label}</span>`).join('');
  const done = new Set(journal.map((e) => e.sid));
  $('#chips').innerHTML = SESSIONS.map((s) => `
    <button class="chip${done.has(s.id) ? ' done' : ''}" role="tab" data-id="${s.id}" aria-selected="${s.id === selected}" style="--fam:${FAMILIES[s.family].color}">
      <span class="t"><span class="dot"></span>${esc(s.title)}</span>
      <span class="d">${s.minutes} min</span>
    </button>`).join('');
}

function renderPanel() {
  const s = SESSIONS.find((x) => x.id === selected) || SESSIONS[0];
  const fam = FAMILIES[s.family];
  const p = $('#panel');
  p.style.setProperty('--fam', fam.color);
  p.innerHTML = `
    <div>
      <div class="meta"><p class="eyebrow">${fam.label} · ${s.minutes} min</p><p class="eyebrow">${s.steps.filter((x) => x.input).length ? 'Avec écriture' : 'Écoute seule'}</p></div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.pitch)}</p>
      <ol>${s.phases.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
      <label class="field">Votre niveau de tension en ce moment <output id="before-out">${before}</output>
        <input type="range" id="before" min="0" max="10" step="1" value="${before}">
      </label>
      <div class="start">
        <button class="btn primary" id="start">Commencer la séance</button>
        <span class="hint">${settings.engine === 'elevenlabs' && settings.apiKey && settings.voiceId ? 'Voix ElevenLabs' : 'Voix du navigateur · <a href="#reglages">configurer ElevenLabs</a>'}</span>
      </div>
    </div>
    <div class="why">
      <p class="eyebrow">Pourquoi ça marche</p>
      <p>${esc(s.why)}</p>
    </div>`;
  $('#before').addEventListener('input', (e) => { before = +e.target.value; $('#before-out').textContent = before; });
  $('#start').addEventListener('click', () => runSession(s, before));
}

$('#chips').addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  selected = b.dataset.id;
  store.set('selected', selected);
  renderChips();
  renderPanel();
});

/* ---------- Journal ---------- */
const NOTE_LABELS = {
  situation: 'Situation', pensee: 'Pensée', croyance: 'Croyance avant', pour: 'Pour', contre: 'Contre',
  alternative: 'Pensée juste', croyance2: 'Croyance après', feuilles: 'Pensées', motcle: 'Mot-clé',
  difficulte: 'Difficulté', message: 'Phrase pour soi', objectif: 'Objectif', pas: 'Premier pas',
};

function renderJournal() {
  const el = $('#journal-body');
  if (!journal.length) {
    el.innerHTML = '<p class="empty">Aucune séance pour l\'instant. Votre première trace apparaîtra ici.</p>';
    return;
  }
  const pts = journal.filter((e) => e.avant != null && e.apres != null).slice(-20);
  let spark = '';
  if (pts.length > 1) {
    const W = 520, H = 70;
    const x = (i) => (i / (pts.length - 1)) * (W - 10) + 5;
    const y = (v) => H - 6 - (v / 10) * (H - 12);
    const line = (k) => pts.map((e, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(e[k]).toFixed(1)}`).join('');
    spark = `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tension avant et après les ${pts.length} dernières séances">
      <path d="${line('avant')}" fill="none" stroke="var(--faint)" stroke-width="1.5" stroke-dasharray="3 4"/>
      <path d="${line('apres')}" fill="none" stroke="var(--accent)" stroke-width="2"/>
    </svg><p class="hint">Pointillés : tension avant · trait plein : après (${pts.length} dernières séances)</p>`;
  }
  const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const items = [...journal].reverse().slice(0, 60).map((e) => {
    const fam = FAMILIES[e.family] || FAMILIES.apaiser;
    const d = e.avant != null && e.apres != null ? e.apres - e.avant : null;
    const notes = Object.entries(e.notes || {}).filter(([k, v]) => NOTE_LABELS[k] && v !== '' && v != null);
    return `<li><details class="j-item" style="--fam:${fam.color}">
      <summary><span class="when">${fmt.format(new Date(e.date))}</span><span class="name">${esc(e.title)}</span>
      <span class="delta">${e.avant ?? '–'} → ${e.apres ?? '–'}${d != null ? ` <b class="${d < 0 ? 'down' : d > 0 ? 'up' : ''}">${d > 0 ? '+' : ''}${d}</b>` : ''}</span></summary>
      ${notes.length ? `<dl>${notes.map(([k, v]) => `<dt>${NOTE_LABELS[k]}</dt><dd>${esc(Array.isArray(v) ? v.join('\n') : v)}</dd>`).join('')}</dl>` : '<p class="hint">Pas de notes pour cette séance.</p>'}
    </details></li>`;
  }).join('');
  el.innerHTML = `${spark}<ul class="j-list">${items}</ul>
    <div class="row"><button class="btn small" id="export">Exporter (JSON)</button><button class="btn ghost small" id="wipe">Effacer le journal</button></div>`;
  $('#export').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(journal, null, 2)], { type: 'application/json' }));
    a.download = `journal-atelier-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  $('#wipe').onclick = () => {
    if (confirm('Effacer définitivement tout le journal de cet appareil ?')) {
      journal = [];
      store.set('journal', journal);
      refresh();
    }
  };
}

function refresh() {
  renderStats();
  renderChips();
  renderPanel();
  renderJournal();
}

/* ---------- Lecteur de séance ---------- */
const S = $('#session');
const vis = new Visuals($('#stage'));
const player = { paused: false, run: null, ctl: null, inputs: {}, wake: null };

function fill(text) {
  return text.replace(/\{(\w+)\}/g, (_, k) => {
    const v = player.inputs[k];
    return Array.isArray(v) ? v.join(', ') : v ?? '';
  }).replace(/\s+([.,])/g, '$1').trim();
}

function sleep(ms, signal) {
  return new Promise((resolve) => {
    let elapsed = 0;
    const tick = 100;
    const id = setInterval(() => {
      if (signal?.aborted) { clearInterval(id); return resolve(); }
      if (!player.paused) elapsed += tick;
      if (elapsed >= ms) { clearInterval(id); resolve(); }
    }, tick);
  });
}

let capTimer;
function caption(text) {
  const c = $('#caption');
  c.classList.remove('on');
  clearTimeout(capTimer);
  if (!settings.captions || !text) return;
  capTimer = setTimeout(() => { c.textContent = text; c.classList.add('on'); }, 350);
}

function ask(input) {
  return new Promise((resolve) => {
    const form = $('#s-ask');
    const slot = $('#s-ask-slot');
    $('#s-ask-label').textContent = input.label;
    if (input.type === 'scale') {
      slot.innerHTML = `<span class="scale-val" id="s-ask-val">5</span><input type="range" id="s-ask-field" min="0" max="10" step="1" value="5">`;
      $('#s-ask-field').oninput = (e) => ($('#s-ask-val').textContent = e.target.value);
    } else {
      slot.innerHTML = `<textarea id="s-ask-field" rows="${input.type === 'list' ? 4 : 3}" placeholder="${esc(input.placeholder || '')}"></textarea>`;
      const f = $('#s-ask-field');
      f.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && input.type !== 'list') { e.preventDefault(); form.requestSubmit(); } };
    }
    $('#s-ask-skip').hidden = !input.optional;
    form.hidden = false;
    S.classList.remove('calm');
    setTimeout(() => $('#s-ask-field')?.focus(), 50);
    const done = (val) => {
      form.hidden = true;
      form.onsubmit = null;
      $('#s-ask-skip').onclick = null;
      player.ctl?.signal.removeEventListener('abort', onAbort);
      resolve(val);
    };
    const onAbort = () => done('');
    player.ctl?.signal.addEventListener('abort', onAbort);
    form.onsubmit = (e) => {
      e.preventDefault();
      const v = $('#s-ask-field').value;
      if (input.type !== 'scale' && !input.optional && !v.trim()) { $('#s-ask-field').focus(); return; }
      done(input.type === 'scale' ? +v : input.type === 'list' ? v.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 3) : v.trim());
    };
    $('#s-ask-skip').onclick = () => done('');
  });
}

async function breathe(b, signal) {
  const phases = [
    ['in', b.in, 1], ['hold', b.hold, null], ['out', b.out, 0], ['hold2', b.hold2, null],
  ].filter(([, d]) => d > 0);
  for (let c = 0; c < b.cycles; c++) {
    for (const [k, dur, target] of phases) {
      if (signal.aborted) return;
      vis.breathTo(target == null ? vis.breathValue() : target, dur, BREATH_CUES[k].replace('…', ''));
      if (c < (b.cues ?? 0)) voice.cue(BREATH_CUES[k]);
      caption(`Cycle ${c + 1} sur ${b.cycles}`);
      await sleep(dur * 1000, signal);
    }
  }
  vis.breathTo(0.35, 2, '');
}

async function runStep(step, signal) {
  if (step.v || step.vo) vis.set(step.v, step.vo || {});
  if ('count' in step) vis.setCount(step.count);
  if (step.say) {
    const text = fill(step.say);
    caption(step.cap ? fill(step.cap) : text);
    await voice.speak(text, signal);
  }
  if (signal.aborted) return;
  if (step.input) {
    const val = await ask(step.input);
    player.inputs[step.input.key] = val;
    if (step.input.key === 'feuilles') {
      vis.words = val.length ? val : ['une pensée'];
      const first = (val[0] || 'cela ne changera jamais').replace(/[.!?…]+$/, '');
      player.inputs.premiere = first.charAt(0).toLowerCase() + first.slice(1);
    }
    caption('');
  }
  if (step.breath) await breathe(step.breath, signal);
  if (step.wait) await sleep(step.wait * 1000, signal);
}

function collectTexts(s) {
  const texts = s.steps.filter((x) => x.say && !x.say.includes('{')).map((x) => x.say);
  s.steps.filter((x) => x.breath?.cues).forEach((x) => {
    texts.push(BREATH_CUES.in, BREATH_CUES.out);
    if (x.breath.hold) texts.push(BREATH_CUES.hold);
    if (x.breath.hold2) texts.push(BREATH_CUES.hold2);
  });
  return texts;
}

function setPaused(p) {
  player.paused = p;
  vis.paused = p;
  $('#s-veil').hidden = !p;
  $('#s-pause').textContent = p ? '▶' : '❚❚';
  if (p) { ctx?.suspend(); voice.pause(); } else { ctx?.resume(); voice.resume(); }
}

async function runSession(s, avant) {
  audio();
  voice.fallback = false;
  player.run?.abort();
  const run = new AbortController();
  Object.assign(player, { paused: false, run, inputs: {} });
  const fam = FAMILIES[s.family];
  S.style.setProperty('--fam', fam.color);
  S.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#s-title').textContent = s.title;
  $('#s-step').textContent = 'Préparation';
  $('#s-bar').style.width = '0';
  $('#caption').classList.remove('on');
  ['#s-ask', '#s-end', '#s-veil'].forEach((x) => ($(x).hidden = true));
  vis.motion = settings.reduceMotion ? 0.35 : 1;
  vis.words = [];
  vis.leaves = [];
  vis.setCount(null);
  vis.set('stars', {});
  vis.fade = 1;
  vis.resize();
  vis.start();
  if (settings.fullscreen && document.fullscreenEnabled && !document.fullscreenElement) S.requestFullscreen?.().catch(() => {});
  try { player.wake = await navigator.wakeLock?.request('screen'); } catch {}

  // Préparation des voix
  const prep = $('#s-prep');
  if (settings.engine === 'elevenlabs' && settings.apiKey && settings.voiceId) {
    prep.hidden = false;
    await voice.prepare(collectTexts(s), (d, n) => {
      $('#s-prep-text').textContent = `Préparation de la voix… ${d} / ${n}`;
      $('#s-prep-bar').style.width = `${(d / n) * 100}%`;
    });
    prep.hidden = true;
    if (run.signal.aborted) return;
  }

  ambient.start(ctx, master, { noise: settings.noise, binaural: settings.binaural, beat: BEATS[s.family] });
  const t0 = Date.now();
  const total = s.steps.length;
  for (let i = 0; i < total; i++) {
    if (run.signal.aborted) break;
    const ctl = new AbortController();
    run.signal.addEventListener('abort', () => ctl.abort(), { once: true });
    player.ctl = ctl;
    $('#s-step').textContent = `Étape ${i + 1} sur ${total}`;
    $('#s-bar').style.width = `${((i + 1) / total) * 100}%`;
    S.classList.toggle('calm', i > 0);
    await runStep(s.steps[i], player.ctl.signal);
    while (player.paused && !run.signal.aborted) await sleep(200, run.signal);
  }
  if (run.signal.aborted) return;
  ambient.stop();
  caption('');
  vis.setCount(null);
  S.classList.remove('calm');
  const minutes = (Date.now() - t0) / 60000;
  const end = $('#s-end');
  $('#s-after').value = Math.max(0, avant - 2);
  $('#s-after-out').textContent = $('#s-after').value;
  $('#s-before-note').textContent = `Avant la séance : ${avant} / 10`;
  end.hidden = false;
  end.onsubmit = (e) => {
    e.preventDefault();
    journal.push({
      sid: s.id, title: s.title, family: s.family, date: new Date().toISOString(),
      minutes: Math.round(minutes * 10) / 10, avant, apres: +$('#s-after').value, notes: { ...player.inputs, premiere: undefined },
    });
    store.set('journal', journal);
    closeSession();
    refresh();
    toast('Séance enregistrée dans le journal.');
    location.hash = '#journal';
  };
}

function closeSession() {
  player.run?.abort();
  player.ctl?.abort();
  voice.stop();
  ambient.stop();
  if (player.paused) setPaused(false);
  vis.stop();
  S.hidden = true;
  document.body.style.overflow = '';
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  player.wake?.release?.().catch(() => {});
  player.wake = null;
}

$('#s-after').addEventListener('input', (e) => ($('#s-after-out').textContent = e.target.value));
$('#s-pause').onclick = () => setPaused(!player.paused);
$('#s-resume').onclick = () => setPaused(false);
$('#s-skip').onclick = () => { if (player.paused) setPaused(false); voice.stop(); player.ctl?.abort(); };
$('#s-quit').onclick = () => {
  if ($('#s-end').hidden && !confirm('Quitter la séance ? Elle ne sera pas enregistrée.')) return;
  closeSession();
};
document.addEventListener('keydown', (e) => {
  if (S.hidden || e.target.matches('textarea, input')) return;
  if (e.code === 'Space') { e.preventDefault(); setPaused(!player.paused); }
  if (e.key === 'Escape' && !document.fullscreenElement) $('#s-quit').click();
});
document.addEventListener('visibilitychange', async () => {
  if (!S.hidden && document.visibilityState === 'visible' && !player.wake) {
    try { player.wake = await navigator.wakeLock?.request('screen'); } catch {}
  }
});

/* ---------- Réglages ---------- */
const form = $('#settings');
const fmtOut = { speed: (v) => `×${(+v).toFixed(2)}`, stability: (v) => (+v).toFixed(2), voiceVolume: (v) => `${Math.round(v * 100)} %`, noise: (v) => `${Math.round(v * 100)} %` };

function fillVoiceSelect() {
  const sel = form.voiceId;
  const list = settings.voices || [];
  sel.innerHTML = list.length
    ? list.map((v) => `<option value="${esc(v.id)}">${esc(v.name)}${v.lang ? ` · ${esc(v.lang)}` : ''}</option>`).join('')
    : '<option value="">Chargez vos voix…</option>';
  if (settings.voiceId && !list.some((v) => v.id === settings.voiceId)) {
    sel.insertAdjacentHTML('afterbegin', `<option value="${esc(settings.voiceId)}">${esc(settings.voiceName || settings.voiceId)}</option>`);
  }
  sel.value = settings.voiceId || '';
}

function fillBrowserVoices() {
  const sel = form.browserVoice;
  const vs = frenchVoices();
  sel.innerHTML = '<option value="">Automatique</option>' + vs.map((v) => `<option>${esc(v.name)}</option>`).join('');
  sel.value = settings.browserVoice || '';
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = fillBrowserVoices;

function syncForm() {
  form.dataset.engine = settings.engine;
  form.querySelectorAll('[name=engine]').forEach((r) => (r.checked = r.value === settings.engine));
  form.apiKey.value = settings.apiKey;
  form.model.value = settings.model;
  for (const k of ['speed', 'stability', 'voiceVolume', 'noise']) {
    form[k].value = settings[k];
    form[k + 'Out'].value = fmtOut[k](settings[k]);
  }
  for (const k of ['binaural', 'captions', 'reduceMotion', 'fullscreen']) form[k].checked = !!settings[k];
  fillVoiceSelect();
  fillBrowserVoices();
}

form.addEventListener('input', (e) => {
  const el = e.target;
  const k = el.name;
  if (!k) return;
  if (k === 'engine') settings.engine = el.value;
  else if (el.type === 'checkbox') settings[k] = el.checked;
  else if (el.type === 'range') { settings[k] = +el.value; form[k + 'Out'].value = fmtOut[k](el.value); }
  else if (k === 'voiceIdManual') { if (el.value.trim()) { settings.voiceId = el.value.trim(); settings.voiceName = el.value.trim(); } }
  else if (k === 'voiceId') { settings.voiceId = el.value; settings.voiceName = el.selectedOptions[0]?.textContent || ''; }
  else settings[k] = el.value.trim();
  if (k === 'voiceVolume') voice.setVolume(settings.voiceVolume);
  form.dataset.engine = settings.engine;
  saveSettings();
  if (['engine', 'voiceId', 'apiKey', 'voiceIdManual'].includes(k)) renderPanel();
});

$('#load-voices').onclick = async () => {
  if (!settings.apiKey) return toast('Saisissez d’abord votre clé API ElevenLabs.');
  const b = $('#load-voices');
  b.disabled = true;
  b.textContent = 'Chargement…';
  try {
    const voices = await listVoices(settings.apiKey);
    settings.voices = voices;
    if (!settings.voiceId && voices[0]) { settings.voiceId = voices[0].id; settings.voiceName = voices[0].name; }
    saveSettings();
    fillVoiceSelect();
    renderPanel();
    toast(`${voices.length} voix chargées. Les voix « multilingual » parlent toutes français.`);
  } catch (e) {
    toast(e.message || 'Impossible de charger les voix.', 6000);
  } finally {
    b.disabled = false;
    b.textContent = 'Charger mes voix';
  }
};

$('#test-voice').onclick = async () => {
  audio();
  voice.fallback = false;
  const b = $('#test-voice');
  b.disabled = true;
  try {
    await voice.speak('Bonjour. Installez-vous confortablement, et laissez votre respiration ralentir, doucement.');
  } finally {
    b.disabled = false;
    updateCacheInfo();
  }
};

async function updateCacheInfo() {
  try {
    const n = await voiceCacheSize();
    $('#cache-info').textContent = n ? `${n} phrase${n > 1 ? 's' : ''} en cache` : '';
  } catch {}
}
$('#clear-cache').onclick = async () => {
  await clearVoiceCache();
  voice.buffers.clear();
  updateCacheInfo();
  toast('Cache audio vidé.');
};

/* ---------- PWA ---------- */
let installEvt = null;
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvt = e;
  $('#install').hidden = false;
});
$('#install').onclick = async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice;
  installEvt = null;
  $('#install').hidden = true;
};
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

/* ---------- Démarrage ---------- */
syncForm();
refresh();
updateCacheInfo();
const welcome = $('#welcome');
if (!store.get('ok', false) && welcome.showModal) {
  welcome.showModal();
  welcome.addEventListener('close', () => store.set('ok', true), { once: true });
}
// Raccourci depuis le manifeste : ?seance=coherence
const q = new URLSearchParams(location.search).get('seance');
if (q && SESSIONS.some((s) => s.id === q)) {
  selected = q;
  refresh();
  location.hash = '#seances';
}
