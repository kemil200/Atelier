import { $, $$, esc, store, toast, bus, emit, progress } from './core.js';
import { SESSIONS, FAMILIES, FAMILY_ORDER, BREATH_CUES } from './sessions.js';
import { BIASES, BIAS_FAMILIES, DISTORTIONS, biasOfTheDay } from './biases.js';
import { EXPERIMENTS, runExperiment } from './lab.js';
import { renderQuiz } from './quiz.js';
import { PROGRAMS } from './programs.js';
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

/* ---------- Navigation ---------- */
const PAGES = ['accueil', 'seances', 'biais', 'labo', 'quiz', 'parcours', 'journal', 'reglages'];
let lastPage = null;

function route() {
  const [page0, param] = location.hash.replace(/^#\/?/, '').split('/');
  const page = PAGES.includes(page0) ? page0 : 'accueil';
  if (page !== 'biais' && $('#bias-dialog').open) $('#bias-dialog').close();
  $$('.page').forEach((p) => (p.hidden = p.dataset.page !== page));
  $$('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav.split(' ').includes(page)));
  if (page !== lastPage) scrollTo({ top: 0, behavior: 'instant' });
  lastPage = page;
  RENDER[page]?.(param);
}
addEventListener('hashchange', route);
const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

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
    <div class="stat"><b>${avg == null ? '–' : (avg > 0 ? '−' : '+') + Math.abs(avg).toFixed(1)}</b><span>tension moyenne</span></div>
    <div class="stat"><b>${p.read.length}/${BIASES.length}</b><span>biais lus</span></div>`;
}

function renderHome() {
  $('#stats').innerHTML = statsHtml();
  const b = biasOfTheDay();
  const fam = BIAS_FAMILIES[b.fam];
  const mine = progress.get().mine.includes(b.id);
  $('#home-bias').style.setProperty('--fam', fam.color);
  $('#home-bias').innerHTML = `
    <p class="eyebrow">Biais du jour · ${fam.label}</p>
    <h3>${esc(b.name)}</h3>
    <p>${esc(b.def)}</p>
    <p class="hint">${esc(b.ex)}</p>
    <div class="row">
      <a class="btn small" href="#biais/${b.id}">Lire la fiche</a>
      ${b.lab ? `<a class="btn small ghost" href="#labo/${b.lab}">Vivre l'expérience</a>` : ''}
      <button class="btn small ghost" id="home-mine">${mine ? 'Je me reconnais ✓' : 'Je me reconnais'}</button>
    </div>`;
  $('#home-mine').onclick = () => { progress.toggle('mine', b.id); renderHome(); };
  renderHomeProgram();
}

function renderHomeProgram() {
  const el = $('#home-program');
  const pr = PROGRAMS.find((p) => p.id === programs.active);
  if (!pr) {
    el.style.setProperty('--fam', 'var(--accent)');
    el.innerHTML = `
      <p class="eyebrow">Parcours</p>
      <h3>Une activité par jour</h3>
      <p>Choisissez un parcours de cinq ou sept jours : stress, clarté d'esprit, sommeil ou élan. L'app vous indique chaque jour quoi faire.</p>
      <div class="row"><a class="btn small primary" href="#parcours">Choisir un parcours</a></div>`;
    return;
  }
  const done = programs.done[pr.id] || [];
  const next = pr.days.findIndex((_, i) => !done.includes(i));
  el.style.setProperty('--fam', pr.color);
  el.innerHTML = `
    <p class="eyebrow">Votre parcours · ${done.length}/${pr.days.length}</p>
    <h3>${esc(pr.title)}</h3>
    <div class="q-bar"><span style="width:${(done.length / pr.days.length) * 100}%"></span></div>
    ${next < 0 ? '<p>Parcours terminé. Bravo !</p><div class="row"><a class="btn small" href="#parcours">Choisir le suivant</a></div>'
      : `<p><strong>Jour ${next + 1} :</strong> ${esc(itemTitle(pr.days[next]))}</p><p class="hint">${esc(pr.days[next].note)}</p>
      <div class="row"><a class="btn small primary" href="${itemHref(pr.days[next])}">Commencer</a><a class="btn small ghost" href="#parcours">Voir le parcours</a></div>`}`;
}

/* ---------- Séances ---------- */
let selected = store.get('selected', 'coherence');
let famFilter = 'tout';
let before = 5;
const sortedSessions = () => [...SESSIONS].sort((a, b) => FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family) || a.minutes - b.minutes);
const voiceLabel = () => (settings.engine === 'elevenlabs' && settings.apiKey && settings.voiceId ? 'Voix ElevenLabs' : 'Voix du navigateur · <a href="#reglages">configurer ElevenLabs</a>');

function renderSessions(param) {
  if (param && SESSIONS.some((s) => s.id === param)) {
    selected = param;
    store.set('selected', selected);
    famFilter = 'tout';
  }
  $('#fam-filter').innerHTML = [['tout', 'Toutes', 'var(--accent)'], ...FAMILY_ORDER.map((k) => [k, FAMILIES[k].label, FAMILIES[k].color])]
    .map(([k, l, c]) => `<button class="pill${famFilter === k ? ' on' : ''}" data-f="${k}" style="--fam:${c}">${l}</button>`).join('');
  const done = new Set(journal.map((e) => e.sid));
  $('#chips').innerHTML = sortedSessions().filter((s) => famFilter === 'tout' || s.family === famFilter).map((s) => `
    <button class="chip${done.has(s.id) ? ' done' : ''}" role="tab" data-id="${s.id}" aria-selected="${s.id === selected}" style="--fam:${FAMILIES[s.family].color}">
      <span class="t"><span class="dot"></span>${esc(s.title)}</span>
      <span class="d">${s.minutes} min</span>
    </button>`).join('');
  renderPanel();
  if (param) setTimeout(() => $('#panel').scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
}

function renderPanel() {
  const s = SESSIONS.find((x) => x.id === selected) || SESSIONS[0];
  const fam = FAMILIES[s.family];
  const p = $('#panel');
  p.style.setProperty('--fam', fam.color);
  const related = BIASES.filter((b) => b.session === s.id);
  p.innerHTML = `
    <div>
      <div class="meta"><p class="eyebrow">${fam.label} · ${s.minutes} min</p><p class="eyebrow">${s.steps.some((x) => x.input) ? 'Avec écriture' : 'Écoute seule'}</p></div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.pitch)}</p>
      <ol>${s.phases.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
      ${s.sleep ? '<p class="hint">À écouter au lit : pas de question à la fin, la séance s’enregistre seule.</p>' : `
      <label class="field">Votre niveau de tension en ce moment <output id="before-out">${before}</output>
        <input type="range" id="before" min="0" max="10" step="1" value="${before}">
      </label>`}
      <div class="start">
        <button class="btn primary" id="start">Commencer la séance</button>
        <span class="hint">${voiceLabel()}</span>
      </div>
    </div>
    <div class="why">
      <p class="eyebrow">Pourquoi ça marche</p>
      <p>${esc(s.why)}</p>
      ${related.length ? `<p class="eyebrow">Biais travaillés</p><p>${related.map((b) => `<a href="#biais/${b.id}">${esc(b.name)}</a>`).join(' · ')}</p>` : ''}
    </div>`;
  $('#before')?.addEventListener('input', (e) => { before = +e.target.value; $('#before-out').textContent = before; });
  $('#start').addEventListener('click', () => runSession(s, s.sleep ? null : before));
}

$('#chips').addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  selected = b.dataset.id;
  store.set('selected', selected);
  $$('#chips .chip').forEach((c) => c.setAttribute('aria-selected', c.dataset.id === selected));
  renderPanel();
});
$('#fam-filter').addEventListener('click', (e) => {
  const b = e.target.closest('.pill');
  if (!b) return;
  famFilter = b.dataset.f;
  renderSessions();
});

$('#timer-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  const min = +f.minutes.value;
  const v = f.visual.value;
  const visual = v === 'breathing' ? 'breath' : v;
  runSession({
    id: 'minuteur', title: `Minuteur libre · ${min} min`, family: 'apaiser', minutes: min,
    steps: [
      { v: visual, vo: v === 'fixation' ? { dim: 0.4 } : v === 'horizon' ? { light: 0.4 } : {}, bell: true, say: 'Installez-vous. Restez simplement avec votre respiration, jusqu’à la prochaine cloche.', wait: 1 },
      { timer: min * 60, quiet: !f.show.checked, autoBreath: v === 'breathing', silent: true },
      { bell: true, say: 'C’est terminé. Prenez un instant avant de reprendre vos activités.', wait: 3 },
    ],
  }, null);
});

/* ---------- Biais ---------- */
let biasFam = 'tout';
let biasQuery = '';
let biasOrder = BIASES;
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function renderBiases(param) {
  drawBiases();
  if (param === 'pieges') setTimeout(() => $('#pieges').scrollIntoView({ behavior: 'smooth' }), 60);
  else if (param) openBias(param);
  else if ($('#bias-dialog').open) $('#bias-dialog').close();
}

function drawBiases() {
  const p = progress.get();
  $('#fam-cards').innerHTML = Object.entries(BIAS_FAMILIES).map(([k, f]) => `
    <button class="fam-card${biasFam === k ? ' on' : ''}" data-f="${k}" style="--fam:${f.color}">
      <span class="eyebrow">${f.short} · ${BIASES.filter((b) => b.fam === k).length} biais</span>
      <strong>${f.label}</strong>
      <span>${esc(f.why)}</span>
    </button>`).join('');
  $('#bias-filter').innerHTML = [['tout', 'Tous', 'var(--accent)'], ...Object.entries(BIAS_FAMILIES).map(([k, f]) => [k, f.label, f.color]), ['mine', `Mes biais (${p.mine.length})`, 'var(--c-energy)']]
    .map(([k, l, c]) => `<button class="pill${biasFam === k ? ' on' : ''}" data-f="${k}" style="--fam:${c}">${l}</button>`).join('');
  const q = norm(biasQuery.trim());
  biasOrder = BIASES.filter((b) => (biasFam === 'tout' || b.fam === biasFam || (biasFam === 'mine' && p.mine.includes(b.id))))
    .filter((b) => !q || norm([b.name, b.en, b.def, b.ex].join(' ')).includes(q));
  $('#bias-count').textContent = `${biasOrder.length} biais affiché${biasOrder.length > 1 ? 's' : ''} · ${p.read.length} lu${p.read.length > 1 ? 's' : ''} sur ${BIASES.length}`;
  $('#bias-grid').innerHTML = biasOrder.length ? biasOrder.map((b) => `
    <a class="bias-card${p.read.includes(b.id) ? ' read' : ''}" href="#biais/${b.id}" style="--fam:${BIAS_FAMILIES[b.fam].color}">
      <span class="eyebrow"><span class="dot"></span>${BIAS_FAMILIES[b.fam].short}${p.mine.includes(b.id) ? ' · ★' : ''}${b.lab ? ' · expérience' : ''}</span>
      <strong>${esc(b.name)}</strong>
      <span>${esc(b.def)}</span>
    </a>`).join('') : `<p class="empty">${biasFam === 'mine' ? 'Aucun biais marqué. Ouvrez une fiche et cliquez sur « Je me reconnais ».' : 'Aucun biais ne correspond.'}</p>`;
  $('#traps').innerHTML = DISTORTIONS.map((d) => `
    <div class="trap"><strong>${esc(d.name)}</strong><span>${esc(d.ex)}</span><em>${esc(d.q)}</em></div>`).join('');
}

$('#fam-cards').addEventListener('click', (e) => {
  const b = e.target.closest('.fam-card');
  if (!b) return;
  biasFam = biasFam === b.dataset.f ? 'tout' : b.dataset.f;
  drawBiases();
  $('#bias-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('#bias-filter').addEventListener('click', (e) => {
  const b = e.target.closest('.pill');
  if (!b) return;
  biasFam = b.dataset.f;
  drawBiases();
});
$('#bias-search').addEventListener('input', (e) => { biasQuery = e.target.value; drawBiases(); });

function openBias(id) {
  const b = BIASES.find((x) => x.id === id);
  if (!b) return;
  progress.add('read', id);
  emit('complete', { type: 'bias', id });
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
    <div class="sheet-top"><p class="eyebrow"><span class="dot"></span>${fam.label}</p><button class="icon small" id="bd-close" aria-label="Fermer">✕</button></div>
    <h3>${esc(b.name)}</h3>
    <p class="en">${esc(b.en)}</p>
    <p class="def">${esc(b.def)}</p>
    <dl class="bias-dl">
      <dt>Exemple</dt><dd>${esc(b.ex)}</dd>
      <dt>Antidote</dt><dd>${esc(b.anti)}</dd>
      ${b.psy ? `<dt>Bien-être</dt><dd>${esc(b.psy)}</dd>` : ''}
    </dl>
    <label class="field">Votre exemple personnel <span class="hint">(on retient mieux ce qu'on relie à soi)</span>
      <textarea id="bd-example" rows="2" placeholder="Quand m'est-il arrivé de…">${esc(examples[id] || '')}</textarea>
    </label>
    <div class="row">
      <button class="btn small${p.mine.includes(id) ? ' primary' : ''}" id="bd-mine">${p.mine.includes(id) ? 'Je me reconnais ✓' : 'Je me reconnais'}</button>
      ${b.lab ? `<a class="btn small" href="#labo/${b.lab}">Vivre l'expérience</a>` : ''}
      ${s ? `<a class="btn small" href="#seances/${s.id}">Séance : ${esc(s.title)}</a>` : ''}
    </div>
    <div class="sheet-nav">
      <a href="#biais/${prev.id}">← ${esc(prev.name)}</a>
      <a href="#biais/${next.id}">${esc(next.name)} →</a>
    </div>`;
  const d = $('#bias-dialog');
  if (!d.open) d.showModal();
  $('#bd-close').onclick = () => d.close();
  $('#bd-mine').onclick = () => { progress.toggle('mine', id); openBias(id); };
  $('#bd-example').oninput = (e) => {
    const ex = store.get('examples', {});
    ex[id] = e.target.value;
    store.set('examples', ex);
  };
  drawBiases();
}
$('#bias-dialog').addEventListener('close', () => {
  if (location.hash.startsWith('#biais/') && location.hash !== '#biais/pieges') history.replaceState(null, '', '#biais');
});
$('#bias-dialog').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

/* ---------- Labo et quiz ---------- */
let currentLab = null;
function renderLab(param) {
  const done = progress.get().labs;
  const id = EXPERIMENTS.some((e) => e.id === param) ? param : currentLab || EXPERIMENTS[0].id;
  const changed = id !== currentLab || !$('#lab-panel').innerHTML;
  currentLab = id;
  $('#lab-chips').innerHTML = EXPERIMENTS.map((e) => `
    <button class="chip${done.includes(e.id) ? ' done' : ''}" data-id="${e.id}" aria-selected="${e.id === id}" style="--fam:${BIAS_FAMILIES[BIASES.find((b) => b.id === e.bias).fam].color}">
      <span class="t"><span class="dot"></span>${esc(e.title)}</span><span class="d">${e.time}</span>
    </button>`).join('');
  if (changed) runExperiment(id, $('#lab-panel'));
  if (param) setTimeout(() => $('#lab-chips').scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
}
$('#lab-chips').addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  currentLab = null;
  go(`#labo/${b.dataset.id}`);
});

function renderQuizPage() {
  const el = $('#quiz-panel');
  if (el.dataset.started) return;
  const p = progress.get();
  const best = p.quiz.length ? Math.max(...p.quiz.map((x) => x.score)) : null;
  el.innerHTML = `
    <p class="eyebrow">Quiz</p>
    <h3>Prêt à repérer les biais ?</h3>
    <p>Pour chaque situation, choisissez le biais ou le piège de pensée en jeu. Une explication suit chaque réponse.</p>
    ${best != null ? `<p class="hint">Meilleur score : ${best} / 8</p>` : ''}
    <div class="row"><button class="btn primary" id="quiz-go">Commencer</button></div>`;
  $('#quiz-go').onclick = () => { el.dataset.started = '1'; renderQuiz(el); };
}

/* ---------- Parcours ---------- */
function itemTitle(it) {
  if (it.type === 'session') return `Séance « ${SESSIONS.find((s) => s.id === it.id)?.title} »`;
  if (it.type === 'lab') return `Expérience « ${EXPERIMENTS.find((s) => s.id === it.id)?.title} »`;
  if (it.type === 'bias') return `Fiche « ${BIASES.find((s) => s.id === it.id)?.name} »`;
  return 'Quiz « Repérez le biais »';
}
function itemHref(it) {
  return { session: `#seances/${it.id}`, lab: `#labo/${it.id}`, bias: `#biais/${it.id}`, quiz: '#quiz' }[it.type];
}

function renderPrograms() {
  $('#programs').innerHTML = PROGRAMS.map((pr) => {
    const done = programs.done[pr.id] || [];
    const active = programs.active === pr.id;
    const next = pr.days.findIndex((_, i) => !done.includes(i));
    return `
    <article class="program${active ? ' active' : ''}" style="--fam:${pr.color}">
      <div class="meta"><p class="eyebrow">${pr.days.length} jours · ${done.length}/${pr.days.length} faits</p>${active ? '<p class="eyebrow on">En cours</p>' : ''}</div>
      <h3>${esc(pr.title)}</h3>
      <p>${esc(pr.pitch)}</p>
      <div class="q-bar"><span style="width:${(done.length / pr.days.length) * 100}%"></span></div>
      ${active ? `<ol class="days">${pr.days.map((d, i) => `
        <li class="${done.includes(i) ? 'done' : i === next ? 'next' : ''}">
          <span class="day">J${i + 1}</span>
          <span class="what"><strong>${esc(itemTitle(d))}</strong><span>${esc(d.note)}</span></span>
          ${done.includes(i) ? '<span class="ok">✓</span>' : `<a class="btn small${i === next ? ' primary' : ' ghost'}" href="${itemHref(d)}">${i === next ? 'Commencer' : 'Ouvrir'}</a>`}
        </li>`).join('')}</ol>
        <div class="row"><button class="btn small ghost" data-reset="${pr.id}">Recommencer ce parcours</button></div>`
      : `<div class="row"><button class="btn${programs.active ? '' : ' primary'}" data-start="${pr.id}">${done.length ? 'Reprendre' : 'Suivre ce parcours'}</button></div>`}
    </article>`;
  }).join('');
}
$('#programs').addEventListener('click', (e) => {
  const s = e.target.closest('[data-start]');
  const r = e.target.closest('[data-reset]');
  if (s) { programs.active = s.dataset.start; savePrograms(); renderPrograms(); toast('Parcours activé. Il apparaît aussi sur l’accueil.'); }
  if (r && confirm('Remettre ce parcours à zéro ?')) { programs.done[r.dataset.reset] = []; savePrograms(); renderPrograms(); }
});

bus.addEventListener('complete', (e) => {
  const { type, id } = e.detail;
  if (type === 'lab') $(`#lab-chips [data-id="${id}"]`)?.classList.add('done');
  progress.update((p) => { p.days = [...new Set([...(p.days || []), new Date().toISOString()])].slice(-400); });
  const pr = PROGRAMS.find((p) => p.id === programs.active);
  if (!pr || type === 'bias' && !pr.days.some((d) => d.type === 'bias' && d.id === id)) return;
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
};

function renderJournal() {
  const p = progress.get();
  $('#journal-stats').innerHTML = statsHtml() + `
    <div class="stat"><b>${p.labs.length}/${EXPERIMENTS.length}</b><span>expériences</span></div>
    <div class="stat"><b>${p.quiz.length ? Math.max(...p.quiz.map((x) => x.score)) + '/8' : '–'}</b><span>meilleur quiz</span></div>`;
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
  const items = [...journal].reverse().slice(0, 80).map((e) => {
    const fam = FAMILIES[e.family] || FAMILIES.apaiser;
    const d = e.avant != null && e.apres != null ? e.apres - e.avant : null;
    const notes = Object.entries(e.notes || {}).filter(([k, v]) => NOTE_LABELS[k] && v !== '' && v != null && !(Array.isArray(v) && !v.length));
    return `<li><details class="j-item" style="--fam:${fam.color}">
      <summary><span class="when">${fmt.format(new Date(e.date))}</span><span class="name">${esc(e.title)}</span>
      <span class="delta">${e.avant == null && e.apres == null ? `${e.minutes} min` : `${e.avant ?? '–'} → ${e.apres ?? '–'}`}${d != null ? ` <b class="${d < 0 ? 'down' : d > 0 ? 'up' : ''}">${d > 0 ? '+' : ''}${d}</b>` : ''}</span></summary>
      ${notes.length ? `<dl>${notes.map(([k, v]) => `<dt>${NOTE_LABELS[k]}</dt><dd>${esc(Array.isArray(v) ? v.join('\n') : v)}</dd>`).join('')}</dl>` : '<p class="hint">Pas de notes pour cette séance.</p>'}
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
    emit('complete', { type: 'session', id: s.id });
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
  biais: renderBiases,
  labo: renderLab,
  quiz: renderQuizPage,
  parcours: renderPrograms,
  journal: renderJournal,
};

// Ancien raccourci du manifeste : ?seance=coherence
const q = new URLSearchParams(location.search).get('seance');
if (q && SESSIONS.some((s) => s.id === q)) history.replaceState(null, '', `${location.pathname}#seances/${q}`);

syncForm();
updateCacheInfo();
route();
const welcome = $('#welcome');
if (!store.get('ok', false) && welcome.showModal) {
  welcome.showModal();
  welcome.addEventListener('close', () => store.set('ok', true), { once: true });
}
