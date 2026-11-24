// Biais cognitifs : textes originaux. Classement par « problème à résoudre »,
// inspiré du Cognitive Bias Codex (Buster Benson, John Manoogian III).

export const BIAS_FAMILIES = {
  trop: {
    label: "Trop d'informations",
    short: 'Filtrer',
    color: 'var(--b-trop)',
    why: "Le cerveau reçoit bien plus d'informations qu'il ne peut en traiter. Il trie : il remarque ce qui est familier, nouveau, répété, ou qui confirme ce qu'il pense déjà.",
  },
  sens: {
    label: 'Pas assez de sens',
    short: 'Combler',
    color: 'var(--b-sens)',
    why: "Le monde est incomplet et ambigu. Pour lui donner du sens, le cerveau comble les trous avec des stéréotypes, des histoires et ses propres pensées.",
  },
  vite: {
    label: "Besoin d'agir vite",
    short: 'Trancher',
    color: 'var(--b-vite)',
    why: "Il faut décider sans tout savoir. Le cerveau privilégie le présent, le connu, ce qui évite les pertes, et se fait confiance pour avancer.",
  },
  memoire: {
    label: 'Que retenir ?',
    short: 'Simplifier',
    color: 'var(--b-mem)',
    why: "On ne peut pas tout garder. La mémoire compresse, généralise et reconstruit, et elle se trompe parfois en le faisant.",
  },
};

export const BIASES = [
  // ---------- Trop d'informations ----------
  {
    id: 'disponibilite', fam: 'trop', name: 'Heuristique de disponibilité', en: 'Availability heuristic',
    def: "On juge la fréquence ou le risque d'un événement selon la facilité avec laquelle des exemples nous viennent à l'esprit.",
    ex: "Après un reportage sur un accident d'avion, l'avion paraît plus dangereux que la voiture, alors que c'est l'inverse.",
    anti: 'Avant de juger un risque, chercher les chiffres réels plutôt que les exemples marquants.',
    psy: "Les ruminations rendent les scénarios catastrophes très « disponibles », ce qui nourrit l'anxiété.",
  },
  {
    id: 'confirmation', fam: 'trop', name: 'Biais de confirmation', en: 'Confirmation bias', lab: 'regle',
    def: 'On cherche, on remarque et on retient surtout ce qui confirme ce que l’on pense déjà.',
    ex: 'Persuadé qu’un collègue vous en veut, vous relevez chacun de ses silences et oubliez ses gestes aimables.',
    anti: 'Se demander : « Qu’est-ce qui me prouverait que j’ai tort ? », puis le chercher activement.',
    psy: 'Il entretient les croyances négatives sur soi en filtrant les réussites. C’est ce que travaille la séance « Recadrer une pensée ».',
    session: 'recadrage',
  },
  {
    id: 'ancrage', fam: 'trop', name: "Effet d'ancrage", en: 'Anchoring', lab: 'roue',
    def: 'Le premier chiffre ou la première information reçue influence fortement les jugements qui suivent, même s’il est sans rapport.',
    ex: 'Un pull « 120 € barré, 60 € » paraît une affaire, même s’il n’a jamais valu 120 €.',
    anti: 'Faire sa propre estimation avant de regarder le prix proposé, et envisager plusieurs points de départ.',
  },
  {
    id: 'negativite', fam: 'trop', name: 'Biais de négativité', en: 'Negativity bias',
    def: 'À intensité égale, le négatif pèse plus lourd et retient plus l’attention que le positif.',
    ex: 'Une seule critique parmi dix compliments occupe toute la soirée.',
    anti: 'Noter volontairement trois choses positives chaque jour pour rééquilibrer le tableau.',
    psy: 'Utile pour survivre, il devient pesant au quotidien. La séance « Trois bonnes choses » l’entraîne dans l’autre sens.',
    session: 'gratitude',
  },
  {
    id: 'cadrage', fam: 'trop', name: 'Effet de cadrage', en: 'Framing effect', lab: 'cadrage',
    def: 'La même information, présentée en gains ou en pertes, en réussite ou en échec, change nos choix.',
    ex: 'Un yaourt « 95 % sans matières grasses » attire plus que le même « à 5 % de matières grasses ».',
    anti: 'Reformuler l’information dans l’autre sens avant de décider.',
  },
  {
    id: 'contraste', fam: 'trop', name: 'Effet de contraste', en: 'Contrast effect',
    def: 'On juge une chose par comparaison avec ce qu’on vient de voir, et non dans l’absolu.',
    ex: 'Après un appartement délabré, le suivant, simplement correct, paraît magnifique.',
    anti: 'Fixer ses critères à l’avance et comparer chaque option à ces critères, pas à la précédente.',
  },
  {
    id: 'frequence', fam: 'trop', name: 'Illusion de fréquence', en: 'Frequency illusion (Baader-Meinhof)',
    def: 'Après avoir remarqué une chose une première fois, on a l’impression de la voir partout.',
    ex: 'Vous achetez une voiture rouge : soudain, les routes semblent pleines de voitures rouges.',
    anti: 'Se rappeler que c’est notre attention qui a changé, pas le monde.',
  },
  {
    id: 'angle-mort', fam: 'trop', name: 'Angle mort des biais', en: 'Bias blind spot',
    def: 'On repère facilement les biais des autres tout en se croyant soi-même plutôt objectif.',
    ex: '« Lui se fait avoir par la publicité. Moi, je choisis en connaissance de cause. »',
    anti: 'Partir du principe qu’on est aussi biaisé que la moyenne, et demander un regard extérieur.',
  },
  {
    id: 'autruche', fam: 'trop', name: "Politique de l'autruche", en: 'Ostrich effect',
    def: 'On évite les informations qu’on devine désagréables, même quand elles nous seraient utiles.',
    ex: 'Ne plus ouvrir ses relevés bancaires à partir du 20 du mois.',
    anti: 'Prévoir un moment court et fixe pour regarder les mauvaises nouvelles en face.',
    psy: 'L’évitement soulage sur le moment mais entretient l’anxiété à long terme.',
  },
  {
    id: 'exposition', fam: 'trop', name: 'Effet de simple exposition', en: 'Mere-exposure effect',
    def: 'On apprécie davantage ce qu’on a déjà vu souvent, simplement parce que c’est familier.',
    ex: 'Une chanson agaçante à la radio finit par vous plaire.',
    anti: 'Se demander : « Est-ce que je l’aime, ou est-ce que je le connais ? »',
  },
  // ---------- Pas assez de sens ----------
  {
    id: 'halo', fam: 'sens', name: 'Effet de halo', en: 'Halo effect',
    def: 'Une qualité frappante (aisance, beauté, diplôme) colore le jugement de toutes les autres.',
    ex: 'On prête plus volontiers intelligence et honnêteté à une personne séduisante.',
    anti: 'Évaluer chaque critère séparément, si possible à l’aveugle.',
  },
  {
    id: 'attribution', fam: 'sens', name: "Erreur fondamentale d'attribution", en: 'Fundamental attribution error',
    def: 'On explique le comportement des autres par leur caractère, et le nôtre par les circonstances.',
    ex: 'Quelqu’un vous coupe la route : « quel égoïste ». Vous coupez la route : « j’étais en retard, c’est exceptionnel ».',
    anti: 'Imaginer trois raisons liées à la situation avant de juger la personne.',
  },
  {
    id: 'conjonction', fam: 'sens', name: 'Erreur de conjonction', en: 'Conjunction fallacy', lab: 'camille',
    def: 'On juge un scénario détaillé plus probable qu’un scénario plus simple qui le contient.',
    ex: 'Trouver plus probable qu’un ami soit « prof et militant écolo » que simplement « prof ».',
    anti: 'Chaque détail ajouté rend une histoire plus crédible… mais mathématiquement moins probable.',
  },
  {
    id: 'joueur', fam: 'sens', name: 'Sophisme du joueur', en: "Gambler's fallacy", lab: 'pile',
    def: 'On croit qu’un événement aléatoire devient plus ou moins probable selon ce qui vient de se produire.',
    ex: 'Après cinq « rouge » à la roulette, miser sur « noir » parce qu’il « doit » sortir.',
    anti: 'Le hasard n’a pas de mémoire : chaque tirage repart de zéro.',
  },
  {
    id: 'taux-base', fam: 'sens', name: 'Négligence du taux de base', en: 'Base rate neglect', lab: 'test',
    def: 'On ignore la fréquence générale d’un phénomène pour se focaliser sur une information particulière.',
    ex: 'Paniquer après un test positif pour une maladie très rare, alors que la plupart des positifs sont des faux positifs.',
    anti: 'Toujours se demander : « Sur 1 000 personnes, combien sont réellement concernées ? »',
    psy: 'Très utile contre l’angoisse liée à la santé.',
  },
  {
    id: 'stereotype', fam: 'sens', name: 'Stéréotypes', en: 'Stereotyping',
    def: 'On attribue à une personne les caractéristiques supposées de son groupe.',
    ex: 'Supposer qu’un homme saura moins bien s’occuper d’un nourrisson.',
    anti: 'Chercher l’information sur la personne elle-même, pas sur sa catégorie.',
  },
  {
    id: 'projection', fam: 'sens', name: 'Biais de projection', en: 'Projection bias',
    def: 'On suppose que les autres pensent, ressentent ou veulent la même chose que nous.',
    ex: 'Offrir à quelqu’un le cadeau qu’on aimerait recevoir.',
    anti: 'Poser la question plutôt que supposer.',
  },
  {
    id: 'transparence', fam: 'sens', name: 'Illusion de transparence', en: 'Illusion of transparency',
    def: 'On surestime à quel point nos états intérieurs (trac, gêne, colère) sont visibles pour les autres.',
    ex: 'Pendant un oral, vous êtes sûr que tout le monde voit votre trac. En réalité, presque personne ne le remarque.',
    anti: 'Se rappeler que les autres voient beaucoup moins que ce que nous ressentons.',
    psy: 'Le simple fait de connaître ce biais réduit l’anxiété de prise de parole.',
  },
  {
    id: 'projecteur', fam: 'sens', name: 'Effet projecteur', en: 'Spotlight effect',
    def: 'On croit être bien plus observé et jugé qu’on ne l’est réellement.',
    ex: 'Une tache sur votre chemise vous obsède toute la journée. Personne ne l’a vue.',
    anti: 'Les autres sont occupés… par leur propre projecteur.',
    psy: 'Au cœur de l’anxiété sociale.',
  },
  {
    id: 'monde-juste', fam: 'sens', name: 'Croyance en un monde juste', en: 'Just-world hypothesis',
    def: 'On pense que chacun obtient ce qu’il mérite, au risque de blâmer les victimes.',
    ex: '« S’il a été licencié, c’est qu’il ne travaillait pas assez. »',
    anti: 'Distinguer la responsabilité de la malchance, et chercher les facteurs extérieurs.',
    psy: 'Retournée contre soi, elle nourrit la culpabilité : « si ça m’arrive, je l’ai mérité ».',
  },
  {
    id: 'apophenie', fam: 'sens', name: 'Apophénie', en: 'Apophenia / clustering illusion',
    def: 'On voit des motifs et des liens là où il n’y a que du hasard.',
    ex: '« Chaque fois que je lave ma voiture, il pleut. »',
    anti: 'Compter aussi les fois où cela ne s’est pas produit.',
  },
  {
    id: 'controle', fam: 'sens', name: 'Illusion de contrôle', en: 'Illusion of control',
    def: 'On surestime notre influence sur des événements qui relèvent largement du hasard.',
    ex: 'Lancer les dés plus fort quand on veut un grand nombre.',
    anti: 'Trier : ce qui dépend de moi, ce qui n’en dépend pas. Agir sur le premier, accepter le second.',
    psy: 'À l’inverse, l’anxiété fait souvent sous-estimer notre contrôle réel.',
  },
  // ---------- Besoin d'agir vite ----------
  {
    id: 'aversion-perte', fam: 'vite', name: 'Aversion à la perte', en: 'Loss aversion', lab: 'pari',
    def: 'Perdre fait environ deux fois plus mal que gagner la même somme ne fait plaisir.',
    ex: 'Refuser un pile ou face où l’on gagne 150 € ou perd 100 €, pourtant avantageux.',
    anti: 'Regarder la décision comme si on devait la répéter cent fois.',
  },
  {
    id: 'cout-irrecuperable', fam: 'vite', name: 'Coûts irrécupérables', en: 'Sunk cost fallacy',
    def: 'On poursuit un projet parce qu’on y a déjà investi, plutôt que parce qu’il a de l’avenir.',
    ex: 'Finir un film ennuyeux parce que la place était chère.',
    anti: 'Se demander : « Si je partais de zéro aujourd’hui, est-ce que je choisirais ça ? »',
    session: 'decision',
  },
  {
    id: 'statu-quo', fam: 'vite', name: 'Biais du statu quo', en: 'Status quo bias',
    def: 'On préfère que les choses restent comme elles sont, même quand un changement serait avantageux.',
    ex: 'Garder le même forfait téléphonique depuis dix ans.',
    anti: 'Traiter « ne rien changer » comme une option à évaluer, pas comme la valeur par défaut.',
  },
  {
    id: 'optimisme', fam: 'vite', name: "Biais d'optimisme", en: 'Optimism bias',
    def: 'On pense que les malheurs arrivent surtout aux autres.',
    ex: 'Ne pas mettre sa ceinture pour un trajet court.',
    anti: 'Faire un « pré-mortem » : imaginer que le projet a échoué et chercher pourquoi.',
    session: 'decision',
  },
  {
    id: 'planification', fam: 'vite', name: 'Erreur de planification', en: 'Planning fallacy',
    def: 'On sous-estime systématiquement le temps, le coût et les risques d’une tâche.',
    ex: '« Ce rapport me prendra une heure. » Trois heures plus tard…',
    anti: 'Se baser sur la durée réelle de tâches similaires passées, puis ajouter une marge.',
  },
  {
    id: 'dunning-kruger', fam: 'vite', name: 'Effet Dunning-Kruger', en: 'Dunning–Kruger effect',
    def: 'Quand on débute, on manque justement des compétences qui permettraient de voir ses erreurs, et l’on surestime son niveau.',
    ex: 'Après deux vidéos en ligne, se sentir capable de refaire l’installation électrique.',
    anti: 'Demander un retour à quelqu’un d’expérimenté, et tester ses connaissances. (L’ampleur de cet effet est débattue par les chercheurs.)',
  },
  {
    id: 'surconfiance', fam: 'vite', name: 'Excès de confiance', en: 'Overconfidence effect',
    def: 'On est plus sûr de ses jugements qu’on ne devrait l’être.',
    ex: 'Être « certain à 100 % » d’une réponse… et se tromper.',
    anti: 'Donner ses certitudes en pourcentage, puis vérifier après coup.',
  },
  {
    id: 'present', fam: 'vite', name: 'Préférence pour le présent', en: 'Present bias / hyperbolic discounting',
    def: 'On préfère une petite récompense immédiate à une plus grande récompense plus tard.',
    ex: 'Repousser le sport à demain. Encore.',
    anti: 'Rendre le futur concret, et réduire au minimum l’effort pour commencer.',
    psy: 'Moteur de la procrastination. Voir les séances « Votre futur soi » et « Démarrer maintenant ».',
    session: 'demarrer',
  },
  {
    id: 'dotation', fam: 'vite', name: 'Effet de dotation', en: 'Endowment effect',
    def: 'On accorde plus de valeur à un objet simplement parce qu’il nous appartient.',
    ex: 'Exiger bien plus pour revendre sa voiture qu’on n’accepterait de payer pour la même.',
    anti: 'Se demander : « Combien paierais-je pour l’acheter aujourd’hui ? »',
  },
  {
    id: 'troupeau', fam: 'vite', name: 'Effet de mode', en: 'Bandwagon effect',
    def: 'On adopte une idée ou un comportement parce que beaucoup d’autres le font.',
    ex: 'Choisir le restaurant plein plutôt que le vide d’à côté, sans rien savoir des deux.',
    anti: 'Se demander : « Est-ce que je le ferais si personne ne le faisait ? »',
  },
  {
    id: 'reactance', fam: 'vite', name: 'Réactance', en: 'Reactance',
    def: 'On a envie de faire l’inverse de ce qu’on nous demande quand on sent sa liberté menacée.',
    ex: 'Avoir encore plus envie du gâteau dès qu’on se l’interdit.',
    anti: 'Reformuler la contrainte comme un choix personnel : « je choisis de… ».',
  },
  {
    id: 'risque-zero', fam: 'vite', name: 'Biais du risque zéro', en: 'Zero-risk bias',
    def: 'On préfère supprimer totalement un petit risque plutôt que réduire fortement un risque plus grand.',
    ex: 'Payer cher pour éliminer un risque minime, en négligeant un risque bien plus important.',
    anti: 'Comparer la quantité de risque réellement évitée par chaque option.',
  },
  {
    id: 'ikea', fam: 'vite', name: 'Effet IKEA', en: 'IKEA effect',
    def: 'On surévalue ce qu’on a construit ou créé soi-même.',
    ex: 'Trouver son étagère montée de travers plus belle que celle du magasin.',
    anti: 'Demander un avis à quelqu’un qui n’a pas participé.',
  },
  // ---------- Que retenir ? ----------
  {
    id: 'retrospectif', fam: 'memoire', name: 'Biais rétrospectif', en: 'Hindsight bias',
    def: 'Une fois le résultat connu, on a l’impression qu’on « le savait depuis le début ».',
    ex: '« C’était évident que ce couple allait se séparer. »',
    anti: 'Noter ses prédictions avant de connaître le résultat.',
    psy: 'Il nourrit la culpabilité : « j’aurais dû le voir venir ». Sur le moment, vous ne le pouviez souvent pas.',
  },
  {
    id: 'pic-fin', fam: 'memoire', name: 'Règle pic-fin', en: 'Peak–end rule',
    def: 'On juge une expérience surtout d’après son moment le plus intense et sa fin, pas sa durée.',
    ex: 'Des vacances moyennes laissent un excellent souvenir si le dernier jour est magnifique.',
    anti: 'Soigner la fin des moments importants.',
    psy: 'C’est pour cela que chaque séance se termine en douceur.',
  },
  {
    id: 'faux-souvenirs', fam: 'memoire', name: 'Faux souvenirs', en: 'False memory / misinformation effect', lab: 'mots',
    def: 'La mémoire reconstruit : des détails suggérés après coup peuvent s’intégrer au souvenir.',
    ex: 'Des témoins « se souviennent » de verre brisé qui n’existait pas après qu’on leur a parlé d’un choc violent.',
    anti: 'Noter tôt ce qui s’est passé, et se méfier de sa propre certitude.',
  },
  {
    id: 'retro-rose', fam: 'memoire', name: 'Rétrospection rose', en: 'Rosy retrospection',
    def: 'On se souvient du passé comme plus agréable qu’il ne l’était.',
    ex: '« C’était mieux avant. »',
    anti: 'Relire ce qu’on écrivait à l’époque.',
  },
  {
    id: 'zeigarnik', fam: 'memoire', name: 'Effet Zeigarnik', en: 'Zeigarnik effect',
    def: 'Les tâches inachevées restent plus présentes à l’esprit que les tâches terminées.',
    ex: 'Le mail non envoyé qui revient au moment de dormir.',
    anti: 'Écrire la prochaine étape sur papier : l’esprit peut alors lâcher prise.',
    psy: 'La séance « Glisser vers le sommeil » commence justement par là.',
    session: 'sommeil',
  },
  {
    id: 'humeur', fam: 'memoire', name: "Mémoire congruente à l'humeur", en: 'Mood-congruent memory',
    def: 'On se souvient plus facilement de ce qui correspond à notre humeur du moment.',
    ex: 'Un jour de déprime, seuls les échecs passés remontent.',
    anti: 'Tenir un carnet de réussites, et le relire les jours difficiles.',
    psy: 'Le journal de l’app sert aussi à ça.',
  },
  {
    id: 'google', fam: 'memoire', name: 'Effet Google', en: 'Google effect / digital amnesia',
    def: 'On retient moins une information quand on sait qu’on pourra la retrouver facilement.',
    ex: 'Ne plus connaître aucun numéro de téléphone par cœur.',
    anti: 'Se tester de mémoire avant de chercher.',
  },
  {
    id: 'generation', fam: 'memoire', name: 'Effet de génération', en: 'Generation effect',
    def: 'On retient mieux ce qu’on produit soi-même que ce qu’on se contente de lire.',
    ex: 'Une réponse trouvée seul reste bien plus longtemps qu’une réponse lue.',
    anti: 'Un biais à exploiter : reformulez, écrivez, expliquez. C’est pour cela que certaines séances vous font écrire.',
  },
  {
    id: 'auto-reference', fam: 'memoire', name: "Effet d'autoréférence", en: 'Self-reference effect',
    def: 'On retient mieux une information quand on la relie à soi.',
    ex: 'Un biais dont on a un exemple personnel ne s’oublie plus.',
    anti: 'Autre biais utile : cliquez sur « Je me reconnais » et trouvez votre propre exemple.',
  },
];

// Pièges de pensée des thérapies cognitives (distorsions cognitives, A. Beck, D. Burns).
export const DISTORTIONS = [
  { id: 'tout-ou-rien', name: 'Pensée tout ou rien', ex: '« Si ce n’est pas parfait, c’est un échec. »', q: 'Où en suis-je vraiment, sur une échelle de 0 à 100 ?' },
  { id: 'surgeneralisation', name: 'Surgénéralisation', ex: '« Je rate toujours tout. »', q: 'Toujours ? Quels sont les contre-exemples ?' },
  { id: 'filtre', name: 'Filtre mental', ex: 'Ne retenir que la remarque négative d’une réunion qui s’est bien passée.', q: 'Qu’est-ce que je laisse de côté ?' },
  { id: 'disqualification', name: 'Disqualification du positif', ex: '« Il m’a félicité par politesse. »', q: 'Si un ami recevait ce compliment, comment le prendrait-il ?' },
  { id: 'lecture-pensees', name: 'Lecture des pensées', ex: '« Elle me trouve ennuyeux. »', q: 'Quelles preuves ai-je de ce qu’elle pense vraiment ?' },
  { id: 'catastrophisme', name: 'Catastrophisme', ex: '« Je vais être licencié, puis perdre mon appartement… »', q: 'Quel est le scénario le plus probable ? Et si le pire arrivait, que ferais-je ?' },
  { id: 'emotion', name: 'Raisonnement émotionnel', ex: '« Je me sens nul, donc je suis nul. »', q: 'Un sentiment est-il une preuve ?' },
  { id: 'doit', name: 'Les « je dois »', ex: '« Je dois toujours être disponible. »', q: 'Et si je disais « je préférerais » ?' },
  { id: 'etiquetage', name: 'Étiquetage', ex: '« Je suis un raté. »', q: 'Est-ce que je décris un acte, ou toute une personne ?' },
  { id: 'personnalisation', name: 'Personnalisation', ex: '« C’est de ma faute s’il est de mauvaise humeur. »', q: 'Quels autres facteurs ont pu jouer ?' },
];

export function biasOfTheDay(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 86400000);
  return BIASES[(day * 7 + date.getFullYear()) % BIASES.length];
}
