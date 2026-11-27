import { $, $$, esc, store, toast, bus, emit, progress } from './core.js';
import { SESSIONS, FAMILIES, FAMILY_ORDER, BREATH_CUES } from './sessions.js';
import { BIASES, BIAS_FAMILIES, DISTORTIONS, biasOfTheDay } from './biases.js';
import { EXPERIMENTS, runExperiment } from './lab.js';
import { renderQuiz } from './quiz.js';
import { PROGRAMS } from './programs.js';
import { THEMES, ALL_AFFIRMATIONS, affirmationOfTheDay, TIPS } from './affirmations.js';
import { EXERCISES } from './introspection.js';
import { Voice, listVoices, clearVoiceCache, voiceCacheSize, frenchVoices } from './voice.js';
import { Visuals } from './visuals.js';
import { Ambient, BEATS } from './ambient.js';

/* ---------- État ---------- */
const DEFAULTS = {
  engine: 'browser', apiKey: '', voiceId: '', voiceName: '', voices: [],
  model: 'eleven_multilingual_v2', speed: 0.9, stability: 0.6, voiceVolume: 1,
  browserVoice: '', noise: 0.35, binaural: false, captions: true,
  reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, fullscreen: true,
  reminderTime: '20:30',
};
let settings = { ...DEFAULTS, ...store.get('settings', {}) };
const saveSettings = () => store.set('settings', settings);
let journal = store.get('journal', []);
let programs = { active: null, done: {}, ...store.get('programs', {}) };
const savePrograms = () => store.set('programs', programs);

/* ---------- Audio partagé ---------- */
let ctx = null;
let master = null;
const voice = new Voice(() => settings);
voice.onWarn = (m) => toast(m, 7000);
const ambient = new Ambient();
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

/* ---------- Navigation façon application ---------- */
// Chaque écran a un titre et un parent (pour le bouton retour). Les listes ont un écran de détail.
const ROUTES = {
  accueil: { title: "Atelier de l'esprit" },
  seances: { title: 'Séances', parent: '#accueil', detail: 'seance' },
  seance: { parent: '#seances' },
  minuteur: { title: 'Minuteur libre', parent: '#accueil' },
  biais: { title: 'Biais cognitifs', parent: '#accueil', detail: 'fiche' },
  fiche: { parent: '#biais' },
  pieges: { title: 'Pièges de pensée', parent: '#biais' },
  labo: { title: 'Labo', parent: '#biais', detail: 'experience' },
  experience: { parent: '#labo' },
  quiz: { title: 'Quiz', parent: '#biais' },
  parcours: { title: 'Parcours', parent: '#accueil', detail: 'programme' },
  programme: { parent: '#parcours' },
  journal: { title: 'Journal', parent: '#accueil' },
  reglages: { title: 'Réglages', parent: '#accueil' },
  esprit: { title: 'Reprogrammer', parent: '#accueil' },
  affirmations: { title: 'Affirmations', parent: '#esprit' },
  introspection: { title: 'Introspection', parent: '#esprit', detail: 'exercice' },
  exercice: { parent: '#introspection' },
};
const stack = [];
const scrolls = {};
let current = null;

function parse(hash) {
  const [base0, param] = hash.replace(/^#\/?/, '').split('/');
  const base = ROUTES[base0] && !['seance', 'fiche', 'experience', 'programme', 'exercice'].includes(base0) ? base0 : 'accueil';
  const screen = param && ROUTES[base].detail ? ROUTES[base].detail : base;
  return { base, screen, param, hash: `#${base}${param ? `/${param}` : ''}` };
}

function setTitle(t) {
  $('#appbar-title').textContent = t;
  document.title = t === "Atelier de l'esprit" ? t : `${t} · Atelier de l'esprit`;
}

function route() {
  const r = parse(location.hash || '#accueil');
  const back = stack.length > 1 && stack[stack.length - 2] === r.hash;
  if (current) scrolls[current] = scrollY;
  if (back) stack.pop();
  else if (stack[stack.length - 1] !== r.hash) stack.push(r.hash);
  current = r.hash;

  const def = ROUTES[r.screen];
  $$('.screen').forEach((s) => {
    const on = s.dataset.screen === r.screen;
    s.hidden = !on;
    if (on) {
      s.classList.remove('enter', 'enter-back');
      void s.offsetWidth;
      s.classList.add(back ? 'enter-back' : 'enter');
    }
  });
  $$('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav.split(' ').includes(r.screen)));
  document.body.dataset.screen = r.screen;
  $('#back').hidden = r.screen === 'accueil';
  $('#brand').hidden = r.screen !== 'accueil';
  if (def.title) setTitle(def.title);
  RENDER[r.screen]?.(r.param);
  scrollTo({ top: back ? scrolls[r.hash] || 0 : 0, behavior: 'instant' });
}
addEventListener('hashchange', route);
const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

$('#back').onclick = () => {
  if (stack.length > 1) history.back();
  else {
    const r = parse(location.hash);
    const parent = ROUTES[r.screen].parent || '#accueil';
    stack.length = 0;
    location.replace(parent);
  }
};

/* ---------- Accueil ---------- */
function dayKey(d) { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; }
function streak() {
  const p = progress.get();
  const dates = [...journal.map((e) => e.date), ...p.quiz.map((q) => q.date), ...(p.days || [])];
  const days = new Set(dates.map(dayKey));
  let n = 0;
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const plural = (n, w) => `${w}${n > 1 ? 's' : ''}`;

function statsHtml() {
  const p = progress.get();
  const minutes = Math.round(journal.reduce((a, e) => a + (e.minutes || 0), 0));
  const withBoth = journal.filter((e) => e.avant != null && e.apres != null);
  const avg = withBoth.length ? withBoth.reduce((a, e) => a + (e.avant - e.apres), 0) / withBoth.length : null;
  return `
    <div class="stat"><b>${journal.length}</b><span>${plural(journal.length, 'séance')}</span></div>
    <div class="stat"><b>${minutes}</b><span>minutes</span></div>
    <div class="stat"><b>${streak()}</b><span>jours de suite</span></div>
    <div class="stat"><b>${avg == null ? '–' : (avg > 0 ? '−' : '+') + Math.abs(avg).toFixed(1)}</b><span>tension moy.</span></div>
    <div class="stat"><b>${p.read.length}/${BIASES.length}</b><span>biais lus</span></div>`;
}

function nextProgramStep() {
  const pr = PROGRAMS.find((p) => p.id === programs.active);
  if (!pr) return null;
  const done = programs.done[pr.id] || [];
  const i = pr.days.findIndex((_, k) => !done.includes(k));
  return { pr, done, i };
}

function renderHome() {
  const h = new Date().getHours();
  $('#greet').textContent = h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  const date = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  $('#greet-date').textContent = date;
  const s = streak();
  $('#greet-sub').textContent = s > 1 ? `${s} jours de suite. Continuez comme ça.` : h >= 21 || h < 5 ? 'Une séance pour bien finir la journée ?' : 'Que voulez-vous faire aujourd’hui ?';
  $('#tile-journal').textContent = journal.length ? `${journal.length} ${plural(journal.length, 'séance')}` : 'Vos progrès';
  $('#stats').innerHTML = statsHtml();

  const a = affirmationOfTheDay(affState().custom);
  const ha = $('#home-affirm');
  ha.style.setProperty('--fam', 'var(--c-self)');
  ha.innerHTML = `<span class="ic" aria-hidden="true">✦</span><span class="tx"><span class="eyebrow">Affirmation du jour</span><strong class="quote">« ${esc(a.je)} »</strong><span>Écouter, choisir les vôtres</span></span><span class="chev" aria-hidden="true">›</span>`;

  const b = biasOfTheDay();
  const hb = $('#home-bias');
  hb.href = `#biais/${b.id}`;
  hb.style.setProperty('--fam', BIAS_FAMILIES[b.fam].color);
  hb.innerHTML = `<span class="ic" aria-hidden="true">💡</span><span class="tx"><span class="eyebrow">Biais du jour</span><strong>${esc(b.name)}</strong><span>${esc(b.def)}</span></span><span class="chev" aria-hidden="true">›</span>`;

  const hp = $('#home-program');
  const st = nextProgramStep();
  if (!st) {
    hp.href = '#parcours';
    hp.style.setProperty('--fam', 'var(--c-mind)');
    hp.innerHTML = `<span class="ic" aria-hidden="true">🧭</span><span class="tx"><span class="eyebrow">Parcours</span><strong>Une activité par jour</strong><span>Stress, clarté, sommeil ou élan : choisissez un programme.</span></span><span class="chev" aria-hidden="true">›</span>`;
    $('#tile-program').textContent = `${PROGRAMS.length} programmes`;
  } else if (st.i < 0) {
    hp.href = '#parcours';
    hp.style.setProperty('--fam', st.pr.color);
    hp.innerHTML = `<span class="ic" aria-hidden="true">🏁</span><span class="tx"><span class="eyebrow">Parcours terminé</span><strong>${esc(st.pr.title)}</strong><span>Bravo ! Choisissez le suivant.</span></span><span class="chev" aria-hidden="true">›</span>`;
    $('#tile-program').textContent = 'Terminé ✓';
  } else {
    const d = st.pr.days[st.i];
    hp.href = itemHref(d);
    hp.style.setProperty('--fam', st.pr.color);
    hp.innerHTML = `<span class="ic" aria-hidden="true">🧭</span><span class="tx"><span class="eyebrow">Parcours · jour ${st.i + 1}/${st.pr.days.length}</span><strong>${esc(itemTitle(d))}</strong><span>${esc(d.note)}</span></span><span class="chev" aria-hidden="true">›</span>`;
    $('#tile-program').textContent = `Jour ${st.i + 1}/${st.pr.days.length}`;
  }
}
$('#show-warn').onclick = () => $('#welcome').showModal();

/* ---------- Séances : liste et détail ---------- */
let famFilter = 'tout';
let before = 5;
const sortedSessions = () => [...SESSIONS].sort((a, b) => FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family) || a.minutes - b.minutes);
const voiceLabel = () => (settings.engine === 'elevenlabs' && settings.apiKey && settings.voiceId ? 'Voix ElevenLabs' : 'Voix du navigateur · <a href="#reglages">configurer ElevenLabs</a>');

function renderSessions() {
  $('#fam-filter').innerHTML = [['tout', 'Toutes', 'var(--accent)'], ...FAMILY_ORDER.map((k) => [k, FAMILIES[k].label, FAMILIES[k].color])]
    .map(([k, l, c]) => `<button class="pill${famFilter === k ? ' on' : ''}" data-f="${k}" style="--fam:${c}">${l}</button>`).join('');
  const done = new Set(journal.map((e) => e.sid));
  $('#chips').innerHTML = sortedSessions().filter((s) => famFilter === 'tout' || s.family === famFilter).map((s) => `
    <a class="item" href="#seances/${s.id}" style="--fam:${FAMILIES[s.family].color}">
      <span class="dot"></span>
      <span class="tx"><strong>${esc(s.title)}${done.has(s.id) ? ' <em class="ok">✓</em>' : ''}</strong><span>${esc(s.pitch)}</span></span>
      <span class="meta-r">${s.minutes} min</span>
      <span class="chev" aria-hidden="true">›</span>
    </a>`).join('');
}
$('#fam-filter').addEventListener('click', (e) => {
  const b = e.target.closest('.pill');
  if (!b) return;
  famFilter = b.dataset.f;
  renderSessions();
});

function renderSessionDetail(id) {
  const s = SESSIONS.find((x) => x.id === id);
  if (!s) return go('#seances');
  setTitle(s.title);
  const fam = FAMILIES[s.family];
  const p = $('#panel');
  p.style.setProperty('--fam', fam.color);
  const related = BIASES.filter((b) => b.session === s.id);
  p.innerHTML = `
    <div class="hero-mini"><p class="eyebrow"><span class="dot"></span>${fam.label} · ${s.minutes} min · ${s.steps.some((x) => x.input) ? 'avec écriture' : 'écoute seule'}</p>
    <h2>${esc(s.title)}</h2>
    <p class="lead">${esc(s.pitch)}</p></div>
    <h3 class="section-t">Déroulé</h3>
    <ol class="steps-list">${s.phases.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
    <h3 class="section-t">Pourquoi ça marche</h3>
    <p class="muted">${esc(s.why)}</p>
    ${related.length ? `<h3 class="section-t">Biais travaillés</h3><div class="pills">${related.map((b) => `<a class="pill" href="#biais/${b.id}" style="--fam:${BIAS_FAMILIES[b.fam].color}">${esc(b.name)}</a>`).join('')}</div>` : ''}
    <div class="sticky-cta">
      ${s.sleep ? '<p class="hint">À écouter au lit : pas de question à la fin, la séance s’enregistre seule.</p>' : `
      <label class="field">Votre tension en ce moment <output id="before-out">${before}</output>
        <input type="range" id="before" min="0" max="10" step="1" value="${before}">
      </label>`}
      <button class="btn primary big" id="start">Commencer la séance</button>
      <p class="hint center">${voiceLabel()}</p>
    </div>`;
  $('#before')?.addEventListener('input', (e) => { before = +e.target.value; $('#before-out').textContent = before; });
  $('#start').addEventListener('click', () => runSession(s, s.sleep ? null : before));
}

$('#timer-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  const min = +f.minutes.value;
  const v = f.visual.value;
  runSession({
    id: 'minuteur', title: `Minuteur libre · ${min} min`, family: 'apaiser', minutes: min,
    steps: [
      { v: v === 'breathing' ? 'breath' : v, vo: v === 'fixation' ? { dim: 0.4 } : v === 'horizon' ? { light: 0.4 } : {}, bell: true, say: 'Installez-vous. Restez simplement avec votre respiration, jusqu’à la prochaine cloche.', wait: 1 },
      { timer: min * 60, quiet: !f.show.checked, autoBreath: v === 'breathing' },
      { bell: true, say: 'C’est terminé. Prenez un instant avant de reprendre vos activités.', wait: 3 },
    ],
  }, null);
});

/* ---------- Biais : liste et fiche ---------- */
let biasFam = 'tout';
let biasQuery = '';
let biasOrder = BIASES;
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function renderBiases() {
  const p = progress.get();
  $('#fam-cards').innerHTML = Object.entries(BIAS_FAMILIES).map(([k, f]) => `
    <button class="fam-card${biasFam === k ? ' on' : ''}" data-f="${k}" style="--fam:${f.color}">
      <span class="eyebrow">${f.short} · ${BIASES.filter((b) => b.fam === k).length} biais</span>
      <strong>${f.label}</strong>
      <span>${esc(f.why)}</span>
    </button>`).join('');
  $('#bias-filter').innerHTML = [['tout', 'Tous', 'var(--accent)'], ...Object.entries(BIAS_FAMILIES).map(([k, f]) => [k, f.label, f.color]), ['mine', `★ Mes biais (${p.mine.length})`, 'var(--c-energy)']]
    .map(([k, l, c]) => `<button class="pill${biasFam === k ? ' on' : ''}" data-f="${k}" style="--fam:${c}">${l}</button>`).join('');
  const q = norm(biasQuery.trim());
  biasOrder = BIASES.filter((b) => biasFam === 'tout' || b.fam === biasFam || (biasFam === 'mine' && p.mine.includes(b.id)))
    .filter((b) => !q || norm([b.name, b.en, b.def, b.ex].join(' ')).includes(q));
  $('#bias-count').textContent = `${biasOrder.length} biais · ${p.read.length} lu${p.read.length > 1 ? 's' : ''} sur ${BIASES.length}`;
  $('#bias-grid').innerHTML = biasOrder.length ? biasOrder.map((b) => `
    <a class="item${p.read.includes(b.id) ? ' read' : ''}" href="#biais/${b.id}" style="--fam:${BIAS_FAMILIES[b.fam].color}">
      <span class="dot"></span>
      <span class="tx"><strong>${esc(b.name)}${p.mine.includes(b.id) ? ' <em class="star">★</em>' : ''}</strong><span>${esc(b.def)}</span></span>
      ${b.lab ? '<span class="meta-r">expérience</span>' : ''}
      <span class="chev" aria-hidden="true">›</span>
    </a>`).join('') : `<p class="empty">${biasFam === 'mine' ? 'Aucun biais marqué. Ouvrez une fiche et touchez « Je me reconnais ».' : 'Aucun biais ne correspond.'}</p>`;
}
$('#fam-cards').addEventListener('click', (e) => {
  const b = e.target.closest('.fam-card');
  if (!b) return;
  biasFam = biasFam === b.dataset.f ? 'tout' : b.dataset.f;
  renderBiases();
  $('#bias-search').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('#bias-filter').addEventListener('click', (e) => {
  const b = e.target.closest('.pill');
  if (!b) return;
  biasFam = b.dataset.f;
  renderBiases();
});
$('#bias-search').addEventListener('input', (e) => { biasQuery = e.target.value; renderBiases(); });

function renderBiasDetail(id) {
  const b = BIASES.find((x) => x.id === id);
  if (!b) return go('#biais');
  progress.add('read', id);
  emit('complete', { type: 'bias', id });
  setTitle(b.name);
  const fam = BIAS_FAMILIES[b.fam];
  const p = progress.get();
  const examples = store.get('examples', {});
  const list = biasOrder.some((x) => x.id === id) ? biasOrder : BIASES;
  const i = list.findIndex((x) => x.id === id);
  const prev = list[(i - 1 + list.length) % list.length];
  const next = list[(i + 1) % list.length];
  const s = b.session && SESSIONS.find((x) => x.id === b.session);
  const el = $('#bias-detail');
  el.style.setProperty('--fam', fam.color);
  el.innerHTML = `
    <div class="hero-mini"><p class="eyebrow"><span class="dot"></span>${fam.label}</p>
    <h2>${esc(b.name)}</h2>
    <p class="en">${esc(b.en)}</p>
    <p class="lead">${esc(b.def)}</p></div>
    <dl class="bias-dl">
      <dt>Exemple</dt><dd>${esc(b.ex)}</dd>
      <dt>Antidote</dt><dd>${esc(b.anti)}</dd>
      ${b.psy ? `<dt>Bien-être</dt><dd>${esc(b.psy)}</dd>` : ''}
    </dl>
    <div class="actions">
      <button class="btn${p.mine.includes(id) ? ' primary' : ''}" id="bd-mine">${p.mine.includes(id) ? '★ Je me reconnais' : '☆ Je me reconnais'}</button>
      ${b.lab ? `<a class="btn" href="#labo/${b.lab}">Vivre l'expérience</a>` : ''}
      ${s ? `<a class="btn" href="#seances/${s.id}">Séance : ${esc(s.title)}</a>` : ''}
    </div>
    <label class="field">Votre exemple personnel <span class="hint">(on retient mieux ce qu'on relie à soi)</span>
      <textarea id="bd-example" rows="3" placeholder="Quand m'est-il arrivé de…">${esc(examples[id] || '')}</textarea>
    </label>
    <div class="sheet-nav">
      <a href="#biais/${prev.id}" data-replace>‹ ${esc(prev.name)}</a>
      <a href="#biais/${next.id}" data-replace>${esc(next.name)} ›</a>
    </div>`;
  $('#bd-mine').onclick = () => {
    progress.toggle('mine', id);
    const on = progress.get().mine.includes(id);
    $('#bd-mine').classList.toggle('primary', on);
    $('#bd-mine').textContent = on ? '★ Je me reconnais' : '☆ Je me reconnais';
  };
  $('#bd-example').oninput = (e) => {
    const ex = store.get('examples', {});
    ex[id] = e.target.value;
    store.set('examples', ex);
  };
}

// Fiche précédente / suivante : remplace l'écran au lieu de l'empiler.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-replace]');
  if (!a) return;
  e.preventDefault();
  stack.pop();
  location.replace(a.getAttribute('href'));
});

function renderTraps() {
  $('#traps').innerHTML = DISTORTIONS.map((d) => `
    <div class="trap"><strong>${esc(d.name)}</strong><span>${esc(d.ex)}</span><em>${esc(d.q)}</em></div>`).join('');
}

/* ---------- Labo et quiz ---------- */
function renderLabList() {
  const done = progress.get().labs;
  $('#lab-chips').innerHTML = EXPERIMENTS.map((e) => {
    const b = BIASES.find((x) => x.id === e.bias);
    return `
    <a class="item" href="#labo/${e.id}" style="--fam:${BIAS_FAMILIES[b.fam].color}">
      <span class="dot"></span>
      <span class="tx"><strong>${esc(e.title)}${done.includes(e.id) ? ' <em class="ok">✓</em>' : ''}</strong><span>${esc(b.name)}</span></span>
      <span class="meta-r">${e.time}</span>
      <span class="chev" aria-hidden="true">›</span>
    </a>`;
  }).join('');
}
let labShown = null;
function renderExperiment(id) {
  const exp = EXPERIMENTS.find((e) => e.id === id);
  if (!exp) return go('#labo');
  setTitle(exp.title);
  // En revenant d'une fiche, on retrouve l'expérience où on l'avait laissée.
  if (labShown !== id || !$('#lab-panel').innerHTML) runExperiment(id, $('#lab-panel'));
  labShown = id;
}

function renderQuizPage() {
  const el = $('#quiz-panel');
  if (el.dataset.started) return;
  const p = progress.get();
  const best = p.quiz.length ? Math.max(...p.quiz.map((x) => x.score)) : null;
  el.innerHTML = `
    <div class="hero-mini"><p class="eyebrow">8 questions</p>
    <h2>Repérez le biais</h2>
    <p class="lead">Pour chaque situation du quotidien, choisissez le biais ou le piège de pensée en jeu. Une explication suit chaque réponse.</p></div>
    ${best != null ? `<p class="hint">Meilleur score : ${best} / 8</p>` : ''}
    <button class="btn primary big" id="quiz-go">Commencer</button>`;
  $('#quiz-go').onclick = () => { el.dataset.started = '1'; renderQuiz(el); };
}

/* ---------- Reprogrammer : hub ---------- */
function renderHub() {
  const st = affState();
  const listens = journal.filter((e) => e.sid === 'affirmations').length;
  $('#hub-affirm').textContent = st.selected.length
    ? `${st.selected.length} dans votre sélection · ${listens} écoute${listens > 1 ? 's' : ''}`
    : 'Choisissez, écrivez et écoutez vos phrases de reprogrammation.';
  const introDone = new Set(journal.filter((e) => e.kind === 'intro').map((e) => e.sid));
  $('#hub-intro').textContent = introDone.size ? `${introDone.size} exercice${introDone.size > 1 ? 's' : ''} fait${introDone.size > 1 ? 's' : ''} sur ${EXERCISES.length}` : `${EXERCISES.length} exercices d'écriture guidée : croyances, valeurs, blessures, futur.`;
  const d21 = programs.done['image-21'] || [];
  $('#hub-21').textContent = programs.active === 'image-21' ? `En cours · jour ${Math.min(d21.length + 1, 21)}/21` : d21.length ? `${d21.length}/21 jours faits` : 'Un programme complet, une activité par jour.';
  const done = new Set(journal.map((e) => e.sid));
  $('#hub-sessions').innerHTML = SESSIONS.filter((s) => s.family === 'soi').map((s) => `
    <a class="item" href="#seances/${s.id}" style="--fam:${FAMILIES.soi.color}">
      <span class="dot"></span>
      <span class="tx"><strong>${esc(s.title)}${done.has(s.id) ? ' <em class="ok">✓</em>' : ''}</strong><span>${esc(s.pitch)}</span></span>
      <span class="meta-r">${s.minutes} min</span>
      <span class="chev" aria-hidden="true">›</span>
    </a>`).join('');
}

/* ---------- Affirmations ---------- */
function affState() {
  return { selected: [], custom: [], person: 'je', reps: 3, mode: 'now', theme: 'image', ...store.get('affirm', {}) };
}
function saveAff(st) { store.set('affirm', st); }
function affById(id, st = affState()) {
  return ALL_AFFIRMATIONS.find((a) => a.id === id) || st.custom.find((c) => c.id === id);
}
const affText = (a, person) => (person === 'tu' && a.tu ? a.tu : a.je);

function renderAffirmations() {
  const st = affState();
  // Affirmation du jour
  const day = affirmationOfTheDay(st.custom);
  const inSel = st.selected.includes(day.id);
  $('#aff-daily').innerHTML = `
    <p class="eyebrow">Affirmation du jour</p>
    <p class="big-quote">« ${esc(affText(day, st.person))} »</p>
    <div class="row">
      <button class="btn small primary" data-speak="${esc(day.id)}">▶ Écouter</button>
      <button class="btn small${inSel ? ' ghost' : ''}" data-toggle="${esc(day.id)}">${inSel ? '★ Dans ma sélection' : '☆ Ajouter à ma sélection'}</button>
    </div>`;

  // Sélection
  const sel = st.selected.map((id) => affById(id, st)).filter(Boolean);
  $('#aff-count').textContent = `(${sel.length})`;
  $('#aff-selection').innerHTML = sel.length ? sel.map((a) => `
    <div class="item aff" style="--fam:${THEMES.find((t) => t.id === a.theme)?.color || 'var(--c-self)'}">
      <span class="dot"></span>
      <span class="tx"><strong class="quote">${esc(affText(a, st.person))}</strong></span>
      <button class="icon-btn" data-speak="${esc(a.id)}" aria-label="Écouter">▶</button>
      <button class="icon-btn" data-toggle="${esc(a.id)}" aria-label="Retirer de la sélection">✕</button>
    </div>`).join('') : '<p class="empty">Votre sélection est vide. Choisissez des affirmations dans les thèmes ci-dessous, ou écrivez la vôtre.</p>';

  // Options de lecture
  const f = $('#aff-play');
  f.person.value = st.person;
  f.reps.value = String(st.reps);
  f.mode.value = st.mode;
  $('#aff-go').disabled = !sel.length;
  const sec = sel.length * st.reps * 7 + 45;
  $('#aff-est').textContent = sel.length ? `Environ ${Math.max(1, Math.round(sec / 60))} min · ${st.mode === 'soir' ? 'termine sans réveil, pour s’endormir' : 'avec une courte relaxation au début'}` : '';

  // Thèmes
  $('#aff-themes').innerHTML = [...THEMES, ...(st.custom.length ? [{ id: 'perso', title: `Mes phrases (${st.custom.length})`, color: 'var(--accent)' }] : [])]
    .map((t) => `<button class="pill${st.theme === t.id ? ' on' : ''}" data-theme="${t.id}" style="--fam:${t.color}">${t.icon ? t.icon + ' ' : ''}${esc(t.title)}</button>`).join('');
  const theme = THEMES.find((t) => t.id === st.theme);
  const items = theme ? ALL_AFFIRMATIONS.filter((a) => a.theme === theme.id) : st.custom;
  const allOn = items.length && items.every((a) => st.selected.includes(a.id));
  $('#aff-theme-intro').innerHTML = `${esc(theme ? theme.intro : 'Les affirmations que vous avez écrites.')}
    ${items.length ? `<span class="theme-bar"><span class="hint">${items.length} phrases · ${items.filter((a) => st.selected.includes(a.id)).length} choisies</span>
    <button type="button" class="btn small${allOn ? ' ghost' : ''}" data-addall="${esc(st.theme)}">${allOn ? 'Tout retirer' : '★ Tout ajouter'}</button></span>` : ''}`;
  $('#aff-list').innerHTML = items.map((a) => {
    const on = st.selected.includes(a.id);
    return `
    <div class="item aff${on ? ' on' : ''}" style="--fam:${theme?.color || 'var(--accent)'}">
      <button class="star" data-toggle="${esc(a.id)}" aria-pressed="${on}" aria-label="${on ? 'Retirer de' : 'Ajouter à'} ma sélection">${on ? '★' : '☆'}</button>
      <span class="tx"><strong class="quote">${esc(affText(a, st.person))}</strong>${a.pont ? '<span class="badge">pont</span>' : ''}</span>
      <button class="icon-btn" data-speak="${esc(a.id)}" aria-label="Écouter">▶</button>
      ${theme ? '' : `<button class="icon-btn" data-delete="${esc(a.id)}" aria-label="Supprimer">🗑</button>`}
    </div>`;
  }).join('') || '<p class="empty">Aucune phrase.</p>';

  $('#aff-tips').innerHTML = TIPS.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('');
}

$('section[data-screen="affirmations"]').addEventListener('click', async (e) => {
  const st = affState();
  const t = e.target.closest('[data-toggle]');
  const sp = e.target.closest('[data-speak]');
  const th = e.target.closest('[data-theme]');
  const del = e.target.closest('[data-delete]');
  const all = e.target.closest('[data-addall]');
  if (all) {
    const ids = (all.dataset.addall === 'perso' ? st.custom : ALL_AFFIRMATIONS.filter((a) => a.theme === all.dataset.addall)).map((a) => a.id);
    const allOn = ids.every((id) => st.selected.includes(id));
    st.selected = allOn ? st.selected.filter((id) => !ids.includes(id)) : [...st.selected, ...ids.filter((id) => !st.selected.includes(id))];
    saveAff(st);
    renderAffirmations();
    toast(allOn ? 'Thème retiré de votre sélection.' : `${ids.length} affirmations dans votre sélection.`);
  } else if (t) {
    const id = t.dataset.toggle;
    st.selected = st.selected.includes(id) ? st.selected.filter((x) => x !== id) : [...st.selected, id];
    saveAff(st);
    renderAffirmations();
  } else if (th) {
    st.theme = th.dataset.theme;
    saveAff(st);
    renderAffirmations();
  } else if (del) {
    if (!confirm('Supprimer cette affirmation ?')) return;
    st.custom = st.custom.filter((c) => c.id !== del.dataset.delete);
    st.selected = st.selected.filter((x) => x !== del.dataset.delete);
    if (!st.custom.length && st.theme === 'perso') st.theme = 'image';
    saveAff(st);
    renderAffirmations();
  } else if (sp) {
    const a = affById(sp.dataset.speak, st);
    if (!a) return;
    audio();
    voice.fallback = false;
    sp.disabled = true;
    try { await voice.speak(affText(a, st.person)); } finally { sp.disabled = false; }
  }
});

$('#aff-play').addEventListener('change', (e) => {
  const st = affState();
  const f = e.currentTarget;
  st.person = f.person.value || 'je';
  st.reps = +(f.reps.value || 3);
  st.mode = f.mode.value || 'now';
  saveAff(st);
  renderAffirmations();
});
$('#aff-play').addEventListener('submit', (e) => {
  e.preventDefault();
  const st = affState();
  const list = st.selected.map((id) => affById(id, st)).filter(Boolean);
  if (list.length) runSession(affirmSession(list, st), null);
});
$('#aff-write').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = e.target.text.value.trim();
  if (!text) return;
  addCustomAffirmation(text);
  e.target.reset();
  toast('Affirmation ajoutée à votre sélection.');
});

function addCustomAffirmation(text) {
  const st = affState();
  const clean = text.replace(/^["«\s]+|["»\s]+$/g, '');
  if (st.custom.some((c) => c.je === clean)) return;
  const id = `perso-${Date.now()}`;
  st.custom.push({ id, je: clean, theme: 'perso' });
  st.selected.push(id);
  saveAff(st);
}

function affirmSession(list, st) {
  const soir = st.mode === 'soir';
  const reps = Math.max(1, st.reps);
  const steps = [
    { v: 'breath', say: soir
      ? 'Allongez-vous confortablement. Ces phrases vont accompagner votre endormissement, ce moment où l’esprit est le plus réceptif.'
      : 'Installez-vous confortablement. Pour chaque phrase, écoutez, répétez-la intérieurement, et laissez-vous la ressentir comme déjà vraie.', wait: 1 },
    { breath: { in: 4, out: 6, cycles: 3, cues: 0 } },
  ];
  list.forEach((a, i) => {
    const text = affText(a, st.person);
    for (let r = 0; r < reps; r++) {
      steps.push({ ...(i === 0 && r === 0 ? { v: soir ? 'fixation' : 'glow', vo: soir ? { dim: 0.7 } : {} } : {}), say: text, wait: r === reps - 1 ? 5 : 3 });
    }
  });
  steps.push(soir
    ? { vo: { dim: 1 }, say: 'Laissez ces phrases descendre en vous… et glissez doucement vers le sommeil.', wait: 20 }
    : { say: 'Gardez ces phrases avec vous aujourd’hui. Et choisissez un geste concret qui va dans leur sens.', wait: 2 });
  const minutes = Math.max(1, Math.round((list.length * reps * 7 + 45) / 60));
  return { id: 'affirmations', kind: 'affirm', title: soir ? 'Affirmations du soir' : 'Mes affirmations', family: 'soi', minutes, sleep: soir, steps };
}

/* ---------- Introspection ---------- */
function renderIntroList() {
  const counts = {};
  journal.filter((e) => e.kind === 'intro').forEach((e) => (counts[e.sid] = (counts[e.sid] || 0) + 1));
  $('#intro-list').innerHTML = EXERCISES.map((x) => {
    const n = counts[`intro:${x.id}`] || 0;
    const draft = store.get(`draft.${x.id}`, null);
    return `
    <a class="item" href="#introspection/${x.id}" style="--fam:${x.color}">
      <span class="dot"></span>
      <span class="tx"><strong>${esc(x.title)}${n ? ` <em class="ok">✓${n > 1 ? ` ×${n}` : ''}</em>` : ''}</strong><span>${esc(x.intro)}</span>${draft ? '<span class="badge">brouillon en cours</span>' : ''}</span>
      <span class="meta-r">${x.minutes} min</span>
      <span class="chev" aria-hidden="true">›</span>
    </a>`;
  }).join('');
}

function renderExercise(id) {
  const x = EXERCISES.find((e) => e.id === id);
  if (!x) return go('#introspection');
  setTitle(x.title);
  const el = $('#exercise-panel');
  el.style.setProperty('--fam', x.color);
  const draft = store.get(`draft.${id}`, { i: -1, a: {}, t0: Date.now() });
  const saveDraft = () => store.set(`draft.${id}`, draft);

  const showIntro = () => {
    el.innerHTML = `
      <div class="hero-mini"><p class="eyebrow"><span class="dot"></span>Introspection · ${x.steps.length} questions · ${x.minutes} min</p>
      <h2>${esc(x.title)}</h2>
      <p class="lead">${esc(x.intro)}</p></div>
      <h3 class="section-t">Pourquoi cet exercice</h3>
      <p class="muted">${esc(x.why)}</p>
      <p class="hint">Installez-vous dans un endroit calme. Il n’y a pas de bonne réponse : écrivez ce qui vient.</p>
      <button class="btn primary big" id="ex-start">${draft.i >= 0 ? 'Reprendre où j’en étais' : 'Commencer'}</button>
      ${draft.i >= 0 ? '<button class="btn ghost small mt-s" id="ex-restart">Recommencer à zéro</button>' : ''}`;
    $('#ex-start').onclick = () => { if (draft.i < 0) { draft.i = 0; draft.t0 = Date.now(); } saveDraft(); showStep(); };
    $('#ex-restart')?.addEventListener('click', () => { Object.assign(draft, { i: 0, a: {}, t0: Date.now() }); saveDraft(); showStep(); });
  };

  const field = (s) => {
    const v = draft.a[s.key];
    if (s.type === 'scale') return `<span class="scale-val" id="ex-val">${v ?? 5}</span><input type="range" id="ex-field" min="0" max="10" value="${v ?? 5}">`;
    if (s.type === 'choices') return `<div class="opts toggles" id="ex-field">${s.options.map((o) => `<button type="button" class="opt" aria-pressed="${(v || []).includes(o)}">${esc(o)}</button>`).join('')}</div>`;
    const rows = s.type === 'long' ? 10 : s.type === 'list' ? 4 : 4;
    return `<textarea id="ex-field" rows="${rows}" placeholder="${s.type === 'list' ? 'Une réponse par ligne' : 'Écrivez ici…'}">${esc(Array.isArray(v) ? v.join('\n') : v || '')}</textarea>`;
  };
  const read = (s) => {
    if (s.type === 'scale') return +$('#ex-field').value;
    if (s.type === 'choices') return $$('#ex-field .opt[aria-pressed="true"]').map((b) => b.textContent);
    const v = $('#ex-field').value.trim();
    return s.type === 'list' ? v.split('\n').map((l) => l.trim()).filter(Boolean) : v;
  };

  const showStep = () => {
    const s = x.steps[draft.i];
    el.innerHTML = `
      <div class="ex-head"><p class="eyebrow">Question ${draft.i + 1} sur ${x.steps.length}</p><div class="q-bar"><span style="width:${(draft.i / x.steps.length) * 100}%"></span></div></div>
      <h2 class="ex-q">${esc(s.q)}</h2>
      ${s.hint ? `<p class="hint">${esc(s.hint)}</p>` : ''}
      <div class="ex-field">${field(s)}</div>
      <div class="ex-nav">
        <button class="btn ghost" id="ex-prev">${draft.i ? '‹ Précédente' : '‹ Présentation'}</button>
        <button class="btn primary" id="ex-next">${draft.i + 1 < x.steps.length ? 'Suivante ›' : 'Terminer'}</button>
      </div>`;
    if (s.type === 'scale') $('#ex-field').oninput = (e) => ($('#ex-val').textContent = e.target.value);
    if (s.type === 'choices') $$('#ex-field .opt').forEach((b) => (b.onclick = () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true')));
    const f = $('#ex-field');
    if (f.tagName === 'TEXTAREA') {
      f.focus();
      f.oninput = () => { draft.a[s.key] = read(s); saveDraft(); };
    }
    $('#ex-prev').onclick = () => {
      draft.a[s.key] = read(s);
      draft.i--;
      saveDraft();
      draft.i < 0 ? (draft.i = 0, showIntro()) : showStep();
    };
    $('#ex-next').onclick = () => {
      const v = read(s);
      const empty = v === '' || (Array.isArray(v) && !v.length);
      if (empty && !s.optional && s.type !== 'scale') {
        f.classList.add('shake');
        setTimeout(() => f.classList.remove('shake'), 400);
        return toast('Écrivez quelques mots, même imparfaits, pour continuer.');
      }
      draft.a[s.key] = v;
      draft.i++;
      saveDraft();
      draft.i < x.steps.length ? showStep() : showEnd();
      scrollTo({ top: 0, behavior: 'instant' });
    };
  };

  const showEnd = () => {
    const sugg = x.affirm ? draft.a[x.affirm] : '';
    const fmt = (v) => (Array.isArray(v) ? v.join(', ') : v === '' || v == null ? '—' : String(v));
    el.innerHTML = `
      <div class="hero-mini"><p class="eyebrow"><span class="dot"></span>Exercice terminé</p>
      <h2>${esc(x.title)}</h2>
      <p class="lead">${esc(x.outro)}</p></div>
      ${sugg ? `
      <div class="daily">
        <p class="eyebrow">Votre affirmation</p>
        <textarea id="ex-aff" rows="2">${esc(String(sugg))}</textarea>
        <label class="check"><input type="checkbox" id="ex-aff-add" checked> L’ajouter à mes affirmations</label>
      </div>` : ''}
      <h3 class="section-t">Vos réponses</h3>
      <dl class="bias-dl qa">${x.steps.map((s) => `<dt>${esc(s.q)}</dt><dd>${esc(fmt(draft.a[s.key]))}</dd>`).join('')}</dl>
      <button class="btn primary big" id="ex-save">Enregistrer dans le journal</button>
      <button class="btn ghost small mt-s" id="ex-edit">‹ Revoir mes réponses</button>`;
    $('#ex-edit').onclick = () => { draft.i = x.steps.length - 1; saveDraft(); showStep(); };
    $('#ex-save').onclick = () => {
      journal.push({
        sid: `intro:${x.id}`, kind: 'intro', title: x.title, family: 'soi', date: new Date().toISOString(),
        minutes: Math.max(1, Math.round((Date.now() - (draft.t0 || Date.now())) / 60000)), avant: null, apres: null,
        qa: x.steps.map((s) => ({ q: s.q, a: fmt(draft.a[s.key]) })),
      });
      store.set('journal', journal);
      const aff = $('#ex-aff')?.value.trim();
      const added = !!(aff && $('#ex-aff-add')?.checked);
      if (added) addCustomAffirmation(aff);
      localStorage.removeItem(`atelier.draft.${x.id}`);
      emit('complete', { type: 'intro', id: x.id });
      el.innerHTML = `
        <div class="hero-mini"><p class="eyebrow"><span class="dot"></span>Enregistré</p>
        <h2>Merci pour ce temps avec vous-même.</h2>
        <p class="lead">Vos réponses sont dans le journal${added ? ', et votre affirmation dans votre sélection' : ''}.</p></div>
        <div class="actions"><a class="btn primary" href="#affirmations">Écouter mes affirmations</a><a class="btn" href="#journal">Voir le journal</a><a class="btn ghost" href="#introspection">Autres exercices</a></div>`;
    };
  };

  draft.i >= x.steps.length ? showEnd() : showIntro();
}

/* ---------- Parcours ---------- */
function itemTitle(it) {
  if (it.type === 'intro') return `Introspection « ${EXERCISES.find((s) => s.id === it.id)?.title} »`;
  if (it.type === 'affirm') return 'Écouter vos affirmations';
  if (it.type === 'session') return `Séance « ${SESSIONS.find((s) => s.id === it.id)?.title} »`;
  if (it.type === 'lab') return `Expérience « ${EXPERIMENTS.find((s) => s.id === it.id)?.title} »`;
  if (it.type === 'bias') return `Fiche « ${BIASES.find((s) => s.id === it.id)?.name} »`;
  return 'Quiz « Repérez le biais »';
}
function itemHref(it) {
  return { session: `#seances/${it.id}`, lab: `#labo/${it.id}`, bias: `#biais/${it.id}`, quiz: '#quiz', intro: `#introspection/${it.id}`, affirm: '#affirmations' }[it.type];
}

function renderPrograms() {
  $('#programs').innerHTML = PROGRAMS.map((pr) => {
    const done = programs.done[pr.id] || [];
    const active = programs.active === pr.id;
    return `
    <a class="item program-item${active ? ' active' : ''}" href="#parcours/${pr.id}" style="--fam:${pr.color}">
      <span class="dot"></span>
      <span class="tx"><strong>${esc(pr.title)}</strong><span>${esc(pr.pitch)}</span>
        <span class="q-bar"><span style="width:${(done.length / pr.days.length) * 100}%"></span></span></span>
      <span class="meta-r">${active ? 'En cours' : `${done.length}/${pr.days.length}`}</span>
      <span class="chev" aria-hidden="true">›</span>
    </a>`;
  }).join('');
}

function renderProgramDetail(id) {
  const pr = PROGRAMS.find((p) => p.id === id);
  if (!pr) return go('#parcours');
  setTitle(pr.title);
  const done = programs.done[pr.id] || [];
  const active = programs.active === pr.id;
  const next = pr.days.findIndex((_, i) => !done.includes(i));
  const el = $('#program-detail');
  el.style.setProperty('--fam', pr.color);
  el.innerHTML = `
    <div class="hero-mini"><p class="eyebrow"><span class="dot"></span>${pr.days.length} jours · ${done.length}/${pr.days.length} faits${active ? ' · en cours' : ''}</p>
    <h2>${esc(pr.title)}</h2>
    <p class="lead">${esc(pr.pitch)}</p>
    <div class="q-bar"><span style="width:${(done.length / pr.days.length) * 100}%"></span></div></div>
    ${active ? '' : `<button class="btn primary big" id="pr-start">${done.length ? 'Reprendre ce parcours' : 'Suivre ce parcours'}</button>`}
    <ol class="days">${pr.days.map((d, i) => `
      <li class="${done.includes(i) ? 'done' : active && i === next ? 'next' : ''}">
        <a href="${itemHref(d)}">
          <span class="day">J${i + 1}</span>
          <span class="what"><strong>${esc(itemTitle(d))}</strong><span>${esc(d.note)}</span></span>
          <span class="ok">${done.includes(i) ? '✓' : '›'}</span>
        </a>
      </li>`).join('')}</ol>
    ${active ? `<button class="btn ghost small" id="pr-reset">Recommencer ce parcours</button>` : ''}`;
  $('#pr-start')?.addEventListener('click', () => {
    programs.active = pr.id;
    savePrograms();
    renderProgramDetail(id);
    toast('Parcours activé. Il apparaît aussi sur l’accueil.');
  });
  $('#pr-reset')?.addEventListener('click', () => {
    if (!confirm('Remettre ce parcours à zéro ?')) return;
    programs.done[pr.id] = [];
    savePrograms();
    renderProgramDetail(id);
  });
}

bus.addEventListener('complete', (e) => {
  const { type, id } = e.detail;
  progress.update((p) => { p.days = [...new Set([...(p.days || []), new Date().toISOString()])].slice(-400); });
  const pr = PROGRAMS.find((p) => p.id === programs.active);
  if (!pr) return;
  const done = programs.done[pr.id] || [];
  const i = pr.days.findIndex((d, k) => !done.includes(k) && d.type === type && d.id === id);
  if (i < 0) return;
  programs.done[pr.id] = [...done, i];
  savePrograms();
  toast(`Parcours : jour ${i + 1} validé.`);
});

/* ---------- Journal ---------- */
const NOTE_LABELS = {
  situation: 'Situation', pensee: 'Pensée', croyance: 'Croyance avant', pieges: 'Pièges repérés', pour: 'Pour', contre: 'Contre',
  alternative: 'Pensée juste', croyance2: 'Croyance après', feuilles: 'Pensées', motcle: 'Mot-clé',
  difficulte: 'Difficulté', message: 'Phrase pour soi', objectif: 'Objectif', pas: 'Premier pas',
  soucis: 'Déposé avant de dormir', bonnes: 'Bonnes choses', decision: 'Décision', penchant: 'Penchant', premortem: 'Pré-mortem',
  zero: 'En partant de zéro', argcontre: 'Argument contraire', ami: 'Conseil à un ami', dix: '10-10-10',
  tache: 'Tâche', geste: 'Premier geste', quand: 'Plan',
  scene: 'Scène répétée', succes: 'Succès', qualites: 'Qualités', defi: 'Défi', mots: 'Nouvelle image',
  gesteimage: 'Geste cohérent', question: 'Question pour la nuit', ressources: 'Ressources', vision: 'Vision financière', action: 'Action',
};

function renderJournal() {
  const p = progress.get();
  $('#journal-stats').innerHTML = statsHtml() + `
    <div class="stat"><b>${p.labs.length}/${EXPERIMENTS.length}</b><span>expériences</span></div>
    <div class="stat"><b>${p.quiz.length ? Math.max(...p.quiz.map((x) => x.score)) + '/8' : '–'}</b><span>meilleur quiz</span></div>`;
  const el = $('#journal-body');
  if (!journal.length) {
    el.innerHTML = '<p class="empty">Aucune séance pour l\'instant. Votre première trace apparaîtra ici.</p><a class="btn primary big" href="#seances">Choisir une séance</a>';
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
  const items = [...journal].reverse().slice(0, 80).map((e) => {
    const fam = FAMILIES[e.family] || FAMILIES.apaiser;
    const d = e.avant != null && e.apres != null ? e.apres - e.avant : null;
    const notes = e.qa
      ? e.qa.filter((x) => x.a && x.a !== '—').map((x) => [x.q, x.a])
      : Object.entries(e.notes || {}).filter(([k, v]) => NOTE_LABELS[k] && v !== '' && v != null && !(Array.isArray(v) && !v.length)).map(([k, v]) => [NOTE_LABELS[k], v]);
    return `<li><details class="j-item${e.qa ? ' qa' : ''}" style="--fam:${fam.color}">
      <summary><span class="when">${fmt.format(new Date(e.date))}</span><span class="name">${e.kind === 'intro' ? '✎ ' : ''}${esc(e.title)}</span>
      <span class="delta">${e.avant == null && e.apres == null ? `${e.minutes} min` : `${e.avant ?? '–'} → ${e.apres ?? '–'}`}${d != null ? ` <b class="${d < 0 ? 'down' : d > 0 ? 'up' : ''}">${d > 0 ? '+' : ''}${d}</b>` : ''}</span></summary>
      ${notes.length ? `<dl>${notes.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(Array.isArray(v) ? v.join('\n') : v)}</dd>`).join('')}</dl>` : '<p class="hint">Pas de notes pour cette séance.</p>'}
    </details></li>`;
  }).join('');
  el.innerHTML = `${spark}<ul class="j-list">${items}</ul>
    <div class="row"><button class="btn small" id="export">Exporter le journal (JSON)</button><button class="btn ghost small" id="wipe">Effacer le journal</button></div>`;
  $('#export').onclick = () => download(`journal-atelier-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(journal, null, 2), 'application/json');
  $('#wipe').onclick = () => {
    if (confirm('Effacer définitivement tout le journal de cet appareil ?')) {
      journal = [];
      store.set('journal', journal);
      renderJournal();
    }
  };
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
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
    $('#s-ask-ok').hidden = false;
    if (input.type === 'scale') {
      slot.innerHTML = `<span class="scale-val" id="s-ask-val">5</span><input type="range" id="s-ask-field" min="0" max="10" step="1" value="5">`;
      $('#s-ask-field').oninput = (e) => ($('#s-ask-val').textContent = e.target.value);
    } else if (input.type === 'choices') {
      slot.innerHTML = `<div class="opts${input.multi ? ' toggles' : ''}" id="s-ask-field">${input.options.map((o) => `<button type="button" class="opt" aria-pressed="false">${esc(o)}</button>`).join('')}</div>`;
      $('#s-ask-ok').hidden = !input.multi;
      $$('#s-ask-field .opt').forEach((b) => {
        b.onclick = () => {
          if (input.multi) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
          else done(b.textContent);
        };
      });
    } else {
      slot.innerHTML = `<textarea id="s-ask-field" rows="${input.type === 'list' ? 4 : 3}" placeholder="${esc(input.placeholder || '')}"></textarea>`;
      const f = $('#s-ask-field');
      f.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && input.type !== 'list') { e.preventDefault(); form.requestSubmit(); } };
    }
    $('#s-ask-skip').hidden = !input.optional;
    form.hidden = false;
    S.classList.remove('calm');
    setTimeout(() => (input.type === 'choices' ? $('#s-ask-field .opt') : $('#s-ask-field'))?.focus(), 50);
    function done(val) {
      form.hidden = true;
      form.onsubmit = null;
      $('#s-ask-skip').onclick = null;
      player.ctl?.signal.removeEventListener('abort', onAbort);
      resolve(val);
    }
    const onAbort = () => done(input.type === 'list' || input.multi ? [] : '');
    player.ctl?.signal.addEventListener('abort', onAbort);
    form.onsubmit = (e) => {
      e.preventDefault();
      if (input.type === 'choices') return done($$('#s-ask-field .opt[aria-pressed="true"]').map((b) => b.textContent));
      const v = $('#s-ask-field').value;
      if (input.type !== 'scale' && !input.optional && !v.trim()) { $('#s-ask-field').focus(); return; }
      done(input.type === 'scale' ? +v : input.type === 'list' ? v.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 3) : v.trim());
    };
    $('#s-ask-skip').onclick = () => onAbort();
  });
}

function breathPhases(b) {
  if (b.phases) return b.phases.map(([label, d, to, cue]) => ({ label, d, to, cue }));
  return [['in', b.in, 1], ['hold', b.hold, null], ['out', b.out, 0], ['hold2', b.hold2, null]]
    .filter(([, d]) => d > 0)
    .map(([k, d, to]) => ({ label: BREATH_CUES[k].replace('…', ''), d, to, cue: BREATH_CUES[k] }));
}

async function breathe(b, signal) {
  const phases = breathPhases(b);
  for (let c = 0; c < b.cycles; c++) {
    for (const ph of phases) {
      if (signal.aborted) return;
      vis.breathTo(ph.to == null ? vis.breathValue() : ph.to, ph.d, ph.label);
      if (c < (b.cues ?? 0)) voice.cue(ph.cue);
      caption(`Cycle ${c + 1} sur ${b.cycles}`);
      await sleep(ph.d * 1000, signal);
    }
  }
  vis.breathTo(0.35, 2, '');
}

async function timer(step, signal) {
  const total = step.timer;
  const t0 = performance.now();
  let paused = 0;
  let pausedAt = null;
  let lastBreath = -1;
  while (!signal.aborted) {
    if (player.paused) { pausedAt ??= performance.now(); await sleep(200, signal); continue; }
    if (pausedAt != null) { paused += performance.now() - pausedAt; pausedAt = null; }
    const el = Math.floor((performance.now() - t0 - paused) / 1000);
    const left = total - el;
    if (left <= 0) break;
    const txt = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    $('#s-step').textContent = `${txt} restantes`;
    if (!step.quiet) vis.count = txt;
    if (step.autoBreath) {
      const phase = Math.floor(el / 5);
      if (phase !== lastBreath) { lastBreath = phase; vis.breathTo(phase % 2 ? 0 : 1, 5, phase % 2 ? 'Expirez' : 'Inspirez'); }
    }
    await sleep(250, signal);
  }
  vis.count = null;
}

function afterInput(key, val) {
  player.inputs[key] = val;
  if (Array.isArray(val)) val.forEach((v, i) => (player.inputs[`${key}${i + 1}`] = v));
  if (key === 'feuilles') {
    vis.words = val.length ? val : ['une pensée'];
    const first = (val[0] || 'cela ne changera jamais').replace(/[.!?…]+$/, '');
    player.inputs.premiere = first.charAt(0).toLowerCase() + first.slice(1);
  }
  if (key === 'pieges' && val.length) {
    player.inputs.piegeQ = DISTORTIONS.find((d) => d.name === val[0])?.q || '';
  }
}

async function runStep(step, signal) {
  if (step.when && !player.inputs[step.when]) return;
  if (step.v || step.vo) vis.set(step.v, step.vo || {});
  if ('count' in step) vis.setCount(step.count);
  if (step.bell && ctx) ambient.bell(ctx, master);
  if (step.say) {
    const text = fill(step.say);
    caption(step.cap ? fill(step.cap) : text);
    await voice.speak(text, signal);
  }
  if (signal.aborted) return;
  if (step.input) {
    afterInput(step.input.key, await ask(step.input));
    caption('');
  }
  if (step.breath) await breathe(step.breath, signal);
  if (step.timer) await timer(step, signal);
  if (step.wait) await sleep(step.wait * 1000, signal);
}

function collectTexts(s) {
  const texts = s.steps.filter((x) => x.say && !x.say.includes('{')).map((x) => x.say);
  s.steps.filter((x) => x.breath?.cues).forEach((x) => breathPhases(x.breath).forEach((p) => texts.push(p.cue)));
  return texts;
}

function setPaused(p) {
  player.paused = p;
  vis.paused = p;
  $('#s-veil').hidden = !p;
  $('#s-pause').textContent = p ? '▶' : '❚❚';
  if (p) { ctx?.suspend(); voice.pause(); } else { ctx?.resume(); voice.resume(); }
}

function cleanNotes(inputs) {
  const out = {};
  for (const [k, v] of Object.entries(inputs)) if (NOTE_LABELS[k]) out[k] = v;
  return out;
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

  ambient.start(ctx, master, { noise: settings.noise, binaural: settings.binaural, beat: s.sleep ? 4 : BEATS[s.family] });
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
    await runStep(s.steps[i], ctl.signal);
    while (player.paused && !run.signal.aborted) await sleep(200, run.signal);
  }
  if (run.signal.aborted) return;
  caption('');
  vis.setCount(null);
  const minutes = Math.round(((Date.now() - t0) / 60000) * 10) / 10;
  const save = (apres) => {
    journal.push({ sid: s.id, title: s.title, family: s.family, date: new Date().toISOString(), minutes, avant, apres, notes: cleanNotes(player.inputs) });
    store.set('journal', journal);
    emit('complete', s.kind === 'affirm' ? { type: 'affirm', id: 'affirm' } : { type: 'session', id: s.id });
  };
  if (avant == null) {
    // Sommeil et minuteur : pas de question, enregistrement direct.
    save(null);
    ambient.stop();
    await sleep(s.sleep ? 4000 : 1500, run.signal);
    if (run.signal.aborted) return;
    closeSession();
    toast('Séance enregistrée dans le journal.');
    route();
    return;
  }
  ambient.stop();
  S.classList.remove('calm');
  const end = $('#s-end');
  $('#s-after').value = Math.max(0, avant - 2);
  $('#s-after-out').textContent = $('#s-after').value;
  $('#s-before-note').textContent = `Avant la séance : ${avant} / 10`;
  end.hidden = false;
  end.onsubmit = (e) => {
    e.preventDefault();
    save(+$('#s-after').value);
    closeSession();
    toast('Séance enregistrée dans le journal.');
    go('#journal');
  };
}

function closeSession() {
  player.run?.abort();
  player.ctl?.abort();
  voice.stop();
  ambient.stop();
  if (player.paused) setPaused(false);
  vis.stop();
  vis.count = null;
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
  sel.innerHTML = '<option value="">Automatique</option>' + frenchVoices().map((v) => `<option>${esc(v.name)}</option>`).join('');
  sel.value = settings.browserVoice || '';
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = fillBrowserVoices;

function syncForm() {
  form.dataset.engine = settings.engine;
  form.querySelectorAll('[name=engine]').forEach((r) => (r.checked = r.value === settings.engine));
  form.apiKey.value = settings.apiKey;
  form.model.value = settings.model;
  form.reminderTime.value = settings.reminderTime;
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
  if (!k || el.type === 'file') return;
  if (k === 'engine') settings.engine = el.value;
  else if (el.type === 'checkbox') settings[k] = el.checked;
  else if (el.type === 'range') { settings[k] = +el.value; form[k + 'Out'].value = fmtOut[k](el.value); }
  else if (k === 'voiceIdManual') { if (el.value.trim()) { settings.voiceId = el.value.trim(); settings.voiceName = el.value.trim(); } }
  else if (k === 'voiceId') { settings.voiceId = el.value; settings.voiceName = el.selectedOptions[0]?.textContent || ''; }
  else settings[k] = el.value.trim();
  if (k === 'voiceVolume') voice.setVolume(settings.voiceVolume);
  form.dataset.engine = settings.engine;
  saveSettings();
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

// Rappel quotidien : fichier .ics récurrent.
$('#ics').onclick = () => {
  const [h, m] = (settings.reminderTime || '20:30').split(':');
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const day = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const url = location.origin + location.pathname;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Atelier de l\'esprit//FR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:atelier-rappel-${Date.now()}@atelier`, `DTSTAMP:${stamp}`,
    `DTSTART:${day}T${pad(h)}${pad(m)}00`, 'DURATION:PT10M', 'RRULE:FREQ=DAILY',
    'SUMMARY:Atelier de l\'esprit : ma séance du jour', `DESCRIPTION:Quelques minutes pour vous : ${url}`, `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Atelier de l\'esprit', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  download('rappel-atelier.ics', ics, 'text/calendar');
  toast('Ouvrez le fichier téléchargé pour l’ajouter à votre agenda.');
};

// Sauvegarde / restauration de toutes les données (sans la clé API).
$('#export-all').onclick = () => {
  const data = {};
  for (const k of Object.keys(localStorage)) {
    if (!k.startsWith('atelier.')) continue;
    try { data[k] = JSON.parse(localStorage.getItem(k)); } catch {}
  }
  if (data['atelier.settings']) data['atelier.settings'] = { ...data['atelier.settings'], apiKey: '' };
  download(`atelier-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
};
$('#import-all').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const keys = Object.keys(data).filter((k) => k.startsWith('atelier.'));
    if (!keys.length) throw new Error();
    if (!confirm(`Remplacer les données de cet appareil par cette sauvegarde (${keys.length} éléments) ?`)) return;
    const key = settings.apiKey;
    keys.forEach((k) => localStorage.setItem(k, JSON.stringify(data[k])));
    if (key) { const st = store.get('settings', {}); st.apiKey = key; store.set('settings', st); }
    location.reload();
  } catch {
    toast('Ce fichier n’est pas une sauvegarde valide.');
  } finally {
    e.target.value = '';
  }
};
$('#reset-all').onclick = () => {
  if (!confirm('Effacer définitivement journal, progrès, parcours et réglages de cet appareil ?')) return;
  Object.keys(localStorage).filter((k) => k.startsWith('atelier.')).forEach((k) => localStorage.removeItem(k));
  location.reload();
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
const RENDER = {
  accueil: renderHome,
  seances: renderSessions,
  seance: renderSessionDetail,
  biais: renderBiases,
  fiche: renderBiasDetail,
  pieges: renderTraps,
  labo: renderLabList,
  experience: renderExperiment,
  quiz: renderQuizPage,
  parcours: renderPrograms,
  programme: renderProgramDetail,
  journal: renderJournal,
  esprit: renderHub,
  affirmations: renderAffirmations,
  introspection: renderIntroList,
  exercice: renderExercise,
};

// Anciens liens : ?seance=… et #biais/pieges
const q = new URLSearchParams(location.search).get('seance');
if (q && SESSIONS.some((s) => s.id === q)) history.replaceState(null, '', `${location.pathname}#seances/${q}`);
if (location.hash === '#biais/pieges') history.replaceState(null, '', `${location.pathname}#pieges`);

syncForm();
updateCacheInfo();
route();
const welcome = $('#welcome');
if (!store.get('ok', false) && welcome.showModal) {
  welcome.showModal();
  welcome.addEventListener('close', () => store.set('ok', true), { once: true });
}
