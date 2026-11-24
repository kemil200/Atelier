// Labo : expériences courtes pour ressentir un biais avant de le comprendre.
import { $, esc, shuffle, progress, emit } from './core.js';
import { BIASES } from './biases.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const EXPERIMENTS = [
  { id: 'roue', title: 'La roue', time: '1 min', bias: 'ancrage', steps: 3 },
  { id: 'cadrage', title: 'Le plan', time: '30 s', bias: 'cadrage', steps: 2 },
  { id: 'camille', title: 'Camille', time: '30 s', bias: 'conjonction', steps: 2 },
  { id: 'pile', title: 'Pile ou face', time: '30 s', bias: 'joueur', steps: 3 },
  { id: 'regle', title: 'Devinez la règle', time: '2 min', bias: 'confirmation', steps: 2 },
  { id: 'test', title: 'Le test positif', time: '1 min', bias: 'taux-base', steps: 2 },
  { id: 'pari', title: 'Le pari', time: '30 s', bias: 'aversion-perte', steps: 3 },
  { id: 'mots', title: 'Douze mots', time: '1 min', bias: 'faux-souvenirs', steps: 3 },
];

// Rend une étape dans le panneau : en-tête, contenu, puis appelle mount(root).
function stage(el, exp, n, html, mount) {
  const total = exp.steps;
  el.innerHTML = `
    <div class="meta"><h3>${esc(exp.title)}</h3><p class="eyebrow">${n > total ? 'Ce qui s’est passé' : `Étape ${n} sur ${total}`}</p></div>
    <div class="lab-body">${html}</div>`;
  mount?.(el);
}

function reveal(el, exp, html) {
  const b = BIASES.find((x) => x.id === exp.bias);
  stage(el, exp, exp.steps + 1, `${html}
    <div class="lab-bias">
      <p class="eyebrow">Le biais en jeu</p>
      <p><strong>${esc(b.name)}</strong> : ${esc(b.def)}</p>
      <p class="hint">Antidote : ${esc(b.anti)}</p>
      <div class="row"><a class="btn small" href="#biais/${b.id}">Fiche complète</a><button class="btn ghost small" data-again>Recommencer</button></div>
    </div>`, (root) => {
    $('[data-again]', root).onclick = () => runExperiment(exp.id, el);
  });
  progress.add('labs', exp.id);
  emit('complete', { type: 'lab', id: exp.id });
}

const opts = (list) => `<div class="opts">${list.map((o, i) => `<button class="opt" data-i="${i}">${o}</button>`).join('')}</div>`;
const onOpt = (root, fn) => root.querySelectorAll('.opt').forEach((b) => (b.onclick = () => fn(+b.dataset.i, b)));

const RUN = {
  // ---------- Ancrage ----------
  async roue(el, exp) {
    const anchor = Math.random() < 0.5 ? 10 : 65;
    stage(el, exp, 1, `
      <p>Il vous faut d’abord un nombre au hasard entre 0 et 100. Faites tourner la roue.</p>
      <div class="wheel-wrap"><div class="wheel" id="wheel"></div><div class="wheel-pin"></div></div>
      <p class="big-num" id="wheel-num">–</p>
      <div class="row"><button class="btn primary" id="spin">Tourner</button></div>`, (root) => {
      const w = $('#wheel', root);
      w.innerHTML = Array.from({ length: 10 }, (_, i) => `<span style="--r:${i * 36}deg">${i * 10}</span>`).join('');
      $('#spin', root).onclick = async (e) => {
        e.target.disabled = true;
        w.style.transform = `rotate(${1440 + Math.random() * 360}deg)`;
        await wait(2600);
        if (!w.isConnected) return;
        $('#wheel-num', root).textContent = anchor;
        await wait(900);
        if (w.isConnected) step2();
      };
    });
    const step2 = () => stage(el, exp, 2, `
      <p class="big-num small">${anchor}</p>
      <p>Le pourcentage de pays africains parmi les membres de l’ONU est-il <strong>supérieur</strong> ou <strong>inférieur</strong> à ${anchor} % ?</p>
      ${opts(['Supérieur', 'Inférieur'])}`, (root) => onOpt(root, () => step3()));
    const step3 = () => stage(el, exp, 3, `
      <p>Et selon vous, quel est ce pourcentage ?</p>
      <p class="big-num" id="est-out">30 %</p>
      <input type="range" id="est" min="0" max="100" value="30">
      <div class="row end"><button class="btn primary" id="ok">Valider</button></div>`, (root) => {
      $('#est', root).oninput = (e) => ($('#est-out', root).textContent = `${e.target.value} %`);
      $('#ok', root).onclick = () => done(+$('#est', root).value);
    });
    const done = (est) => reveal(el, exp, `
      <p>Réponse : l’ONU compte 193 membres, dont 54 pays africains, soit <strong>28 %</strong>. Vous avez répondu <strong>${est} %</strong>, après avoir tiré <strong>${anchor}</strong>.</p>
      <p>Vous saviez que la roue n’avait aucun rapport avec la question. Pourtant, ce nombre a pu tirer votre estimation vers lui. Ici, la roue ne pouvait donner que 10 ou 65.</p>
      <p>Dans l’expérience originale de Tversky et Kahneman (1974), les participants qui avaient tiré 10 estimaient en moyenne 25 %. Ceux qui avaient tiré 65 estimaient en moyenne 45 %.</p>`);
  },

  // ---------- Cadrage ----------
  async cadrage(el, exp) {
    const gain = Math.random() < 0.5;
    const A = gain ? '200 personnes seront sauvées.' : '400 personnes mourront.';
    const B = gain
      ? 'Une chance sur trois de sauver les 600 personnes, deux chances sur trois de ne sauver personne.'
      : 'Une chance sur trois que personne ne meure, deux chances sur trois que les 600 meurent.';
    stage(el, exp, 1, `
      <p>Une épidémie menace 600 personnes. Vous devez choisir entre deux plans.</p>
      ${opts([`<b>Plan A.</b> ${A}`, `<b>Plan B.</b> ${B}`])}`, (root) => onOpt(root, (i) => step2(i)));
    const step2 = (i) => stage(el, exp, 2, `
      <p>Voici la même situation, formulée autrement :</p>
      <ul class="plain">
        <li><b>Plan A.</b> ${gain ? '400 personnes mourront.' : '200 personnes seront sauvées.'}</li>
        <li><b>Plan B.</b> ${gain ? 'Une chance sur trois que personne ne meure, deux chances sur trois que les 600 meurent.' : 'Une chance sur trois de sauver les 600 personnes, deux chances sur trois de ne sauver personne.'}</li>
      </ul>
      <p>Avec cette formulation, auriez-vous fait le même choix ?</p>
      ${opts(['Oui, le même', 'Non, j’aurais changé', 'Je ne sais pas'])}`, (root) => onOpt(root, () => done(i)));
    const done = (i) => reveal(el, exp, `
      <p>Les deux versions décrivent exactement la même chose : 200 sauvés, c’est 400 morts. Vous avez vu la version « ${gain ? 'vies sauvées' : 'décès'} » et choisi le plan <strong>${i ? 'B (le pari)' : 'A (le certain)'}</strong>.</p>
      <p>Dans l’étude de Tversky et Kahneman (1981), 72 % des gens choisissaient le plan certain quand on parlait de vies sauvées. Quand on parlait de décès, 78 % choisissaient le pari. On fuit le risque face aux gains, et on le recherche face aux pertes.</p>`);
  },

  // ---------- Conjonction ----------
  async camille(el, exp) {
    const order = shuffle([0, 1]);
    const labels = ['Camille est employée de banque.', 'Camille est employée de banque et milite dans une association écologiste.'];
    stage(el, exp, 1, `
      <p>Camille a 31 ans. Elle ne mange pas de viande, se déplace à vélo, trie tout et a passé ses dernières vacances à ramasser des déchets sur une plage. Pendant ses études, elle manifestait souvent pour le climat.</p>
      <p><strong>Qu’est-ce qui est le plus probable ?</strong></p>
      ${opts(order.map((k) => labels[k]))}`, (root) => onOpt(root, (i) => step2(order[i])));
    const step2 = (pick) => stage(el, exp, 2, `
      <p>Dernière question : à quel point êtes-vous sûr de votre réponse ?</p>
      ${opts(['Très sûr', 'Plutôt sûr', 'Pas sûr du tout'])}`, (root) => onOpt(root, () => done(pick)));
    const done = (pick) => reveal(el, exp, `
      <svg class="venn" viewBox="0 0 300 150" role="img" aria-label="Le groupe des employées de banque militantes est inclus dans celui des employées de banque">
        <circle cx="120" cy="75" r="68" fill="var(--b-sens)" fill-opacity=".18" stroke="var(--b-sens)"/>
        <circle cx="150" cy="85" r="30" fill="var(--b-sens)" fill-opacity=".4" stroke="var(--b-sens)"/>
        <text x="72" y="45" fill="currentColor" font-size="11">employées de banque</text>
        <text x="150" y="89" fill="currentColor" font-size="10" text-anchor="middle">+ militantes</text>
      </svg>
      <p>${pick === 0 ? 'Bien vu : ' : 'Vous avez choisi la seconde réponse, comme la plupart des gens. Pourtant, '}toutes les employées de banque militantes sont aussi des employées de banque. La première réponse est donc forcément au moins aussi probable.</p>
      <p>La description rend la seconde histoire plus <em>crédible</em>, mais chaque détail ajouté la rend moins <em>probable</em>. Dans l’étude originale de Tversky et Kahneman (1983), qui portait sur une certaine « Linda », environ 85 % des personnes se trompaient.</p>`);
  },

  // ---------- Sophisme du joueur ----------
  async pile(el, exp) {
    stage(el, exp, 1, `
      <p>Une pièce parfaitement équilibrée est lancée cinq fois.</p>
      <div class="coins" id="coins"></div>`, async (root) => {
      const c = $('#coins', root);
      for (let i = 0; i < 5; i++) {
        await wait(550);
        if (!c.isConnected) return;
        c.insertAdjacentHTML('beforeend', '<span class="coin">F</span>');
      }
      await wait(600);
      if (!c.isConnected) return;
      c.insertAdjacentHTML('afterend', `<p>Face, cinq fois de suite. Au prochain lancer :</p>${opts(['Pile a plus de chances', 'Face a plus de chances', 'Autant de chances'])}`);
      onOpt(root, (i) => step2(i));
    });
    const step2 = (a) => stage(el, exp, 2, `
      <p>Laquelle de ces deux suites de cinq lancers est la plus probable ?</p>
      ${opts(['<span class="mono">F F F F F</span>', '<span class="mono">P F P P F</span>', 'Les deux pareilles'])}`, (root) => onOpt(root, (b) => step3(a, b)));
    const step3 = (a, b) => stage(el, exp, 3, `
      <p>Si vous deviez parier 10 € sur le prochain lancer, vous choisiriez…</p>
      ${opts(['Pile', 'Face', 'Peu importe'])}`, (root) => onOpt(root, () => done(a, b)));
    const done = (a, b) => reveal(el, exp, `
      <p>${a === 2 ? 'Juste : ' : 'Piège : '}la pièce n’a pas de mémoire. Après cinq « face », le prochain lancer reste à <strong>50/50</strong>.</p>
      <p>${b === 2 ? 'Et juste encore : ' : 'Et pour les suites : '}chaque suite précise de cinq lancers a exactement la même probabilité, 1 sur 32. « P F P P F » <em>paraît</em> plus aléatoire, c’est tout.</p>
      <p>Ce sophisme coûte cher dans les casinos. On le retrouve aussi au quotidien : « après trois mauvaises journées, demain sera forcément bonne ».</p>`);
  },

  // ---------- Wason 2-4-6 ----------
  async regle(el, exp) {
    const tests = [];
    const rule = (a, b, c) => a < b && b < c;
    const draw = (root) => {
      $('#hist', root).innerHTML = [['2', '4', '6', true], ...tests].map(([a, b, c, ok]) => `<li class="${ok ? 'yes' : 'no'}"><span class="mono">${a} – ${b} – ${c}</span><b>${ok ? 'oui' : 'non'}</b></li>`).join('');
      $('#guess', root).disabled = tests.length < 3;
    };
    stage(el, exp, 1, `
      <p>J’ai une règle en tête. La suite <strong class="mono">2 – 4 – 6</strong> la respecte. Proposez vos propres suites de trois nombres : je vous dis si elles respectent la règle. Testez-en au moins trois.</p>
      <form class="triple" id="triple">
        <input type="number" required aria-label="Premier nombre"><input type="number" required aria-label="Deuxième nombre"><input type="number" required aria-label="Troisième nombre">
        <button class="btn">Tester</button>
      </form>
      <ul class="hist" id="hist"></ul>
      <div class="row end"><button class="btn primary" id="guess" disabled>J’ai trouvé la règle</button></div>`, (root) => {
      draw(root);
      $('#triple', root).onsubmit = (e) => {
        e.preventDefault();
        const ins = [...e.target.querySelectorAll('input')];
        const [a, b, c] = ins.map((x) => +x.value);
        tests.push([a, b, c, rule(a, b, c)]);
        ins.forEach((x) => (x.value = ''));
        ins[0].focus();
        draw(root);
      };
      $('#guess', root).onclick = () => step2();
    });
    const step2 = () => stage(el, exp, 2, `
      <p>Quelle est la règle ?</p>
      ${opts(['Des nombres pairs qui augmentent de 2', 'Des nombres qui augmentent toujours du même écart', 'N’importe quels nombres croissants', 'Trois nombres pairs'])}`, (root) => onOpt(root, (i) => done(i)));
    const done = (i) => {
      const nos = tests.filter((t) => !t[3]).length;
      const plus2 = tests.filter(([a, b, c]) => b - a === 2 && c - b === 2).length;
      reveal(el, exp, `
        <p>La règle était simplement : <strong>trois nombres croissants</strong>. ${i === 2 ? 'Vous l’avez trouvée, bravo.' : 'Ce n’était pas votre réponse.'}</p>
        <p>Vous avez fait ${tests.length} essais : ${plus2} suivaient le motif « +2 », et ${nos} ont reçu un « non ». ${nos === 0 ? 'Vous n’avez reçu que des « oui ». C’est le signe que vous cherchiez à confirmer votre idée plutôt qu’à la mettre à l’épreuve.' : 'Tester des suites susceptibles d’être refusées, c’est exactement la bonne stratégie.'}</p>
        <p>Dans l’expérience de Peter Wason (1960), la plupart des participants proposaient des suites qui confirmaient leur hypothèse, comme 8-10-12, au lieu d’essayer de la réfuter, par exemple avec 1-2-50.</p>`);
    };
  },

  // ---------- Taux de base ----------
  async test(el, exp) {
    stage(el, exp, 1, `
      <p>Une maladie touche <strong>1 personne sur 1 000</strong>. Un test la détecte chez tous les malades, mais il se trompe chez <strong>5 %</strong> des personnes saines, qui reçoivent alors un résultat positif.</p>
      <p>Votre test est positif. Quelle est la probabilité que vous soyez vraiment malade ?</p>
      <p class="big-num" id="p-out">50 %</p>
      <input type="range" id="p" min="0" max="100" value="50">
      <div class="row end"><button class="btn primary" id="ok">Valider</button></div>`, (root) => {
      $('#p', root).oninput = (e) => ($('#p-out', root).textContent = `${e.target.value} %`);
      $('#ok', root).onclick = () => step2(+$('#p', root).value);
    });
    const step2 = (p) => stage(el, exp, 2, `
      <p>Imaginez 1 000 personnes testées. Chaque point est une personne.</p>
      <div class="dots" id="dots" aria-hidden="true"></div>
      <p class="legend"><span style="--fam:var(--bad)">malade, test positif (1)</span><span style="--fam:var(--b-vite)">saine, test positif (≈ 50)</span><span style="--fam:var(--faint)">saine, test négatif</span></p>
      <div class="row end"><button class="btn primary" id="ok">Voir la réponse</button></div>`, (root) => {
      const pos = new Set(shuffle([...Array(1000).keys()]).slice(0, 51));
      const sick = [...pos][0];
      $('#dots', root).innerHTML = Array.from({ length: 1000 }, (_, i) => `<i class="${i === sick ? 's' : pos.has(i) ? 'f' : ''}"></i>`).join('');
      $('#ok', root).onclick = () => done(p);
    });
    const done = (p) => reveal(el, exp, `
      <p>Sur 1 000 personnes : 1 malade, testé positif, et environ 50 personnes saines testées positives par erreur. Parmi les 51 positifs, une seule est malade. La probabilité est donc d’environ <strong>2 %</strong>. Vous avez répondu ${p} %.</p>
      <p>En 1978, la même question a été posée à 60 médecins et étudiants de Harvard. La réponse la plus fréquente était 95 %, et seuls 11 ont trouvé 2 %. Sans le taux de base, un « test fiable » fait peur bien plus qu’il ne devrait.</p>`);
  },

  // ---------- Aversion à la perte ----------
  async pari(el, exp) {
    stage(el, exp, 1, `
      <p>On vous propose un pile ou face, une seule fois :</p>
      <ul class="plain"><li><b>Pile</b> : vous gagnez <strong>150 €</strong>.</li><li><b>Face</b> : vous perdez <strong>100 €</strong>.</li></ul>
      <p>Vous jouez ?</p>
      ${opts(['Oui, je joue', 'Non merci'])}`, (root) => onOpt(root, (i) => step2(i === 0)));
    const step2 = (yes) => stage(el, exp, 2, `
      <p>Face, vous perdez toujours 100 €. Combien faudrait-il gagner à pile pour que vous acceptiez <em>sans hésiter</em> ?</p>
      <p class="big-num" id="g-out">150 €</p>
      <input type="range" id="g" min="100" max="500" step="10" value="150">
      <div class="row end"><button class="btn primary" id="ok">Valider</button></div>`, (root) => {
      $('#g', root).oninput = (e) => ($('#g-out', root).textContent = `${e.target.value} €`);
      $('#ok', root).onclick = () => step3(yes, +$('#g', root).value);
    });
    const step3 = (yes, g) => stage(el, exp, 3, `
      <p>Et si l’on vous proposait de rejouer ce même pari (gagner 150 €, perdre 100 €) <strong>cent fois de suite</strong> ?</p>
      ${opts(['J’accepte', 'Je refuse'])}`, (root) => onOpt(root, (i) => done(yes, g, i === 0)));
    const done = (yes, g, many) => reveal(el, exp, `
      <p>En moyenne, ce pari rapporte <strong>+25 €</strong> par lancer : il est avantageux. Vous avez ${yes ? 'accepté' : 'refusé'} de jouer une fois${many !== yes ? `, mais ${many ? 'accepté' : 'refusé'} de jouer cent fois` : ''}. Pour risquer 100 €, vous demandez ${g} €, soit un rapport de <strong>${(g / 100).toFixed(1)} pour 1</strong>.</p>
      <p>La plupart des gens demandent environ 200 € pour risquer 100 € : une perte pèse à peu près deux fois plus lourd qu’un gain. Vu sur cent lancers, le même pari paraît soudain raisonnable. C’est l’un des meilleurs antidotes à ce biais.</p>`);
  },

  // ---------- Faux souvenirs (paradigme DRM) ----------
  async mots(el, exp) {
    const words = ['lit', 'repos', 'réveil', 'fatigue', 'rêve', 'oreiller', 'couverture', 'sieste', 'ronfler', 'bâiller', 'nuit', 'calme'];
    stage(el, exp, 1, `
      <p>Douze mots vont s’afficher, un par un. Essayez de tous les retenir.</p>
      <div class="row"><button class="btn primary" id="go">C’est parti</button></div>`, (root) => {
      $('#go', root).onclick = () => step2();
    });
    const step2 = () => stage(el, exp, 2, '<p class="flash" id="flash" aria-live="polite"></p>', async (root) => {
      const f = $('#flash', root);
      for (const w of words) {
        if (!f.isConnected) return;
        f.textContent = w;
        await wait(1300);
        f.textContent = '';
        await wait(200);
      }
      await wait(400);
      if (f.isConnected) step3();
    });
    const probe = shuffle(['oreiller', 'sommeil', 'chaise', 'rêve', 'lit', 'voiture', 'fenêtre', 'nuit']);
    const step3 = () => stage(el, exp, 3, `
      <p>Cochez les mots qui faisaient partie de la liste.</p>
      <div class="checks">${probe.map((w) => `<label class="check"><input type="checkbox" value="${w}"> ${w}</label>`).join('')}</div>
      <div class="row end"><button class="btn primary" id="ok">Valider</button></div>`, (root) => {
      $('#ok', root).onclick = () => done([...root.querySelectorAll('input:checked')].map((x) => x.value));
    });
    const done = (picked) => {
      const lure = picked.includes('sommeil');
      const right = picked.filter((w) => words.includes(w)).length;
      reveal(el, exp, `
        <p>Vous avez reconnu ${right} ${right > 1 ? 'vrais mots' : 'vrai mot'} sur 4. ${lure ? 'Et vous avez coché <strong>« sommeil »</strong>… qui n’était <strong>pas</strong> dans la liste.' : 'Vous n’avez pas coché « sommeil ». Pourtant, beaucoup le font : il n’était <strong>pas</strong> dans la liste.'}</p>
        <p>Tous les mots tournaient autour du sommeil. Votre mémoire a enregistré le thème et a reconstruit le reste. Dans les études de Roediger et McDermott (1995), le mot piège était « reconnu » presque aussi souvent que les vrais mots, et souvent avec une grande certitude.</p>
        <p>Un souvenir n’est pas un enregistrement : c’est une reconstruction.</p>`);
    };
  },
};

export function runExperiment(id, el) {
  const exp = EXPERIMENTS.find((e) => e.id === id) || EXPERIMENTS[0];
  RUN[exp.id](el, exp);
}
