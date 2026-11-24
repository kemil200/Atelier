// Quiz « Repérez le biais » : scénarios du quotidien, quatre choix.
import { $, esc, shuffle, progress, emit } from './core.js';
import { BIASES, DISTORTIONS } from './biases.js';

const NAMES = Object.fromEntries([...BIASES.map((b) => [b.id, b.name]), ...DISTORTIONS.map((d) => [d.id, d.name])]);

const Q = [
  { s: 'Léa refuse de revendre son vélo 400 €. Pourtant, elle ne paierait jamais ce prix pour le même vélo d’occasion.', a: 'dotation', o: ['halo', 'joueur', 'projecteur'], e: 'Le simple fait de posséder le vélo augmente sa valeur à ses yeux.' },
  { s: 'Après un reportage sur les cambriolages, Marc installe trois nouvelles serrures. Les chiffres de son quartier n’ont pas bougé.', a: 'disponibilite', o: ['statu-quo', 'ikea', 'retrospectif'], e: 'Des images marquantes rendent le risque plus « disponible », donc plus probable en apparence.' },
  { s: 'Inès est persuadée que son manager la déteste. Elle relit ses mails en y cherchant des signes de froideur.', a: 'confirmation', o: ['ancrage', 'exposition', 'pic-fin'], e: 'Elle cherche ce qui confirme son idée, pas ce qui pourrait la contredire.' },
  { s: '« J’ai payé l’abonnement pour l’année, alors je continue ce programme, même s’il me fait mal au dos. »', a: 'cout-irrecuperable', o: ['optimisme', 'contraste', 'frequence'], e: 'L’argent est dépensé dans tous les cas. Seule compte la suite.' },
  { s: 'Au loto, Paul évite les numéros sortis la semaine dernière : « ils ne vont pas retomber de sitôt ».', a: 'joueur', o: ['dotation', 'transparence', 'humeur'], e: 'Chaque tirage est indépendant : les boules n’ont pas de mémoire.' },
  { s: 'Un candidat très à l’aise à l’oral est jugé plus compétent techniquement, sans que personne ait vérifié.', a: 'halo', o: ['taux-base', 'zeigarnik', 'reactance'], e: 'Une qualité visible déborde sur le jugement des autres qualités.' },
  { s: 'Après la défaite, un supporter : « Je le savais dès le coup d’envoi ! »', a: 'retrospectif', o: ['surconfiance', 'cadrage', 'troupeau'], e: 'Une fois le résultat connu, il paraît avoir toujours été évident.' },
  { s: 'Sophie prévoit un week-end pour repeindre son salon. Il lui en faudra quatre, comme la dernière fois.', a: 'planification', o: ['negativite', 'apophenie', 'projection'], e: 'On planifie le scénario idéal en oubliant l’expérience passée.' },
  { s: 'Le serveur renverse un verre : « quel maladroit ». Vous renversez un verre : « la table est bancale ».', a: 'attribution', o: ['halo', 'monde-juste', 'google'], e: 'Leur caractère pour les autres, les circonstances pour nous.' },
  { s: 'Kevin est sûr que toute la réunion a remarqué sa voix tremblante. Interrogés, ses collègues n’ont rien vu.', a: 'transparence', o: ['ancrage', 'statu-quo', 'retro-rose'], e: 'On surestime la visibilité de nos émotions.' },
  { s: 'Un traitement « efficace dans 90 % des cas » est préféré au même traitement « inefficace dans 10 % des cas ».', a: 'cadrage', o: ['dunning-kruger', 'zeigarnik', 'stereotype'], e: 'Même information, présentation différente, choix différent.' },
  { s: 'Nadia garde la même banque depuis 15 ans, malgré des frais deux fois plus élevés qu’ailleurs.', a: 'statu-quo', o: ['joueur', 'generation', 'projecteur'], e: 'Ne rien changer semble sans risque… mais coûte cher.' },
  { s: 'Un vendeur montre d’abord un modèle à 2 000 €. Celui à 900 € semble soudain raisonnable.', a: 'ancrage', o: ['taux-base', 'reactance', 'faux-souvenirs'], e: 'Le premier prix sert de point de référence pour tous les suivants.' },
  { s: 'Un mois après avoir appris le mot « procrastination », Julie a l’impression de l’entendre partout.', a: 'frequence', o: ['humeur', 'surconfiance', 'ikea'], e: 'Ce n’est pas le mot qui est devenu plus fréquent, c’est son attention.' },
  { s: '« Je me sens incapable, donc je vais forcément rater cet entretien. »', a: 'emotion', o: ['etiquetage', 'filtre', 'doit'], e: 'Un sentiment n’est pas une preuve.' },
  { s: 'Hugo reçoit dix retours positifs et une critique. Il conclut que sa présentation était ratée.', a: 'filtre', o: ['lecture-pensees', 'doit', 'personnalisation'], e: 'Un seul détail négatif colore toute l’image.' },
  { s: '« Elle n’a pas répondu à mon message : elle doit me trouver lourd. »', a: 'lecture-pensees', o: ['tout-ou-rien', 'etiquetage', 'surgeneralisation'], e: 'On prête aux autres des pensées sans preuve.' },
  { s: 'Après une erreur de calcul, Amine se dit : « Je suis vraiment un incapable. »', a: 'etiquetage', o: ['catastrophisme', 'disqualification', 'emotion'], e: 'Un acte ponctuel devient une étiquette qui vise toute la personne.' },
  { s: 'Jeanne doit se lancer demain dans le sport. Ce soir, la série d’à côté l’emporte encore.', a: 'present', o: ['aversion-perte', 'risque-zero', 'contraste'], e: 'La récompense immédiate pèse plus que le bénéfice futur.' },
  { s: '« Si je rate ce partiel, je rate mon année, puis je ne trouverai jamais de travail… »', a: 'catastrophisme', o: ['surgeneralisation', 'lecture-pensees', 'doit'], e: 'On enchaîne les scénarios du pire en les tenant pour probables.' },
];

const ROUND = 8;

export function renderQuiz(el, onDone) {
  const qs = shuffle(Q).slice(0, ROUND);
  let i = 0;
  let score = 0;
  const show = () => {
    const q = qs[i];
    const choices = shuffle([q.a, ...q.o]);
    el.innerHTML = `
      <div class="meta"><p class="eyebrow">Question ${i + 1} sur ${ROUND}</p><p class="eyebrow">Score ${score}</p></div>
      <div class="q-bar"><span style="width:${(i / ROUND) * 100}%"></span></div>
      <p class="q-text">${esc(q.s)}</p>
      <div class="opts grid2">${choices.map((c) => `<button class="opt" data-id="${c}">${esc(NAMES[c])}</button>`).join('')}</div>
      <div class="q-feedback" id="qf" hidden></div>`;
    el.querySelectorAll('.opt').forEach((b) => {
      b.onclick = () => {
        const ok = b.dataset.id === q.a;
        if (ok) score++;
        el.querySelectorAll('.opt').forEach((x) => {
          x.disabled = true;
          if (x.dataset.id === q.a) x.classList.add('right');
        });
        if (!ok) b.classList.add('wrong');
        const fb = $('#qf', el);
        const link = BIASES.some((x) => x.id === q.a) ? `#biais/${q.a}` : '#pieges';
        fb.innerHTML = `<p><strong>${ok ? 'Exact.' : `C’était : ${esc(NAMES[q.a])}.`}</strong> ${esc(q.e)} <a href="${link}">En savoir plus</a></p>
          <div class="row end"><button class="btn primary" id="next">${i + 1 < ROUND ? 'Suivante' : 'Voir le résultat'}</button></div>`;
        fb.hidden = false;
        $('#next', el).focus();
        $('#next', el).onclick = () => { i++; i < ROUND ? show() : end(); };
      };
    });
  };
  const end = () => {
    const p = progress.update((x) => x.quiz.push({ date: new Date().toISOString(), score, total: ROUND }));
    const best = Math.max(...p.quiz.map((x) => x.score));
    const msg = score === ROUND ? 'Sans faute. Votre radar à biais est bien réglé.'
      : score >= ROUND * 0.75 ? 'Très bon repérage.'
      : score >= ROUND / 2 ? 'Pas mal. Les fiches vous aideront à affiner.'
      : 'Ces biais sont subtils, c’est normal. Rejouez après avoir lu quelques fiches.';
    el.innerHTML = `
      <p class="eyebrow">Résultat</p>
      <p class="big-num">${score} / ${ROUND}</p>
      <p>${msg}</p>
      <p class="hint">Meilleur score : ${best} / ${ROUND} · ${p.quiz.length} partie${p.quiz.length > 1 ? 's' : ''} jouée${p.quiz.length > 1 ? 's' : ''}</p>
      <div class="row"><button class="btn primary" id="again">Nouvelle partie</button><a class="btn" href="#biais">Toutes les fiches</a></div>`;
    $('#again', el).onclick = () => renderQuiz(el, onDone);
    emit('complete', { type: 'quiz', id: 'quiz' });
    onDone?.(score);
  };
  show();
}
