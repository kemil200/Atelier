// Outils partagés : sélection DOM, échappement, stockage local, notifications, bus d'événements.

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const shuffle = (a) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

export const store = {
  get(k, d) {
    try { const v = localStorage.getItem('atelier.' + k); return v == null ? d : JSON.parse(v); } catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem('atelier.' + k, JSON.stringify(v)); } catch {}
  },
};

let toastTimer;
export function toast(msg, ms = 3500) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), ms);
}

// Événements de l'app : 'complete' { type: 'session'|'lab'|'quiz'|'bias', id }
export const bus = new EventTarget();
export const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));

// Progrès hors séances (expériences faites, biais lus, scores de quiz, « je me reconnais »).
export const progress = {
  get() {
    return { labs: [], read: [], mine: [], quiz: [], ...store.get('progress', {}) };
  },
  update(fn) {
    const p = progress.get();
    fn(p);
    store.set('progress', p);
    return p;
  },
  add(list, id) {
    return progress.update((p) => { if (!p[list].includes(id)) p[list].push(id); });
  },
  toggle(list, id) {
    return progress.update((p) => {
      p[list] = p[list].includes(id) ? p[list].filter((x) => x !== id) : [...p[list], id];
    });
  },
};
