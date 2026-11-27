// Affirmations : textes originaux, à la première (je) et à la deuxième personne (tu).
// Chaque thème mêle des phrases « pont » (crédibles tout de suite) et des phrases affirmées.

export const THEMES = [
  {
    id: 'richesse', title: 'Richesse et abondance', color: 'var(--c-energy)', icon: '◈',
    intro: "Une relation calme et lucide à l'argent : remarquer ce qu'on a, oser demander, agir avec méthode.",
    items: [
      { je: "J'apprends chaque jour à gérer l'argent avec calme et lucidité.", tu: "Tu apprends chaque jour à gérer l'argent avec calme et lucidité.", pont: true },
      { je: "L'argent est un outil, et je deviens de plus en plus habile à m'en servir.", tu: "L'argent est un outil, et tu deviens de plus en plus habile à t'en servir.", pont: true },
      { je: "Je remarque les ressources dont je dispose déjà, et j'en prends soin.", tu: "Tu remarques les ressources dont tu disposes déjà, et tu en prends soin." },
      { je: "Je mérite une rémunération à la hauteur de la valeur que j'apporte.", tu: "Tu mérites une rémunération à la hauteur de la valeur que tu apportes." },
      { je: "Chaque compétence que je développe augmente ma valeur.", tu: "Chaque compétence que tu développes augmente ta valeur." },
      { je: "Je prends mes décisions financières avec réflexion, pas sous l'impulsion.", tu: "Tu prends tes décisions financières avec réflexion, pas sous l'impulsion." },
      { je: "J'ose saisir les occasions qui se présentent à moi.", tu: "Tu oses saisir les occasions qui se présentent à toi." },
      { je: "Je donne et je reçois avec aisance.", tu: "Tu donnes et tu reçois avec aisance." },
      { je: "Mon sentiment de valeur ne dépend pas de mon compte en banque.", tu: "Ton sentiment de valeur ne dépend pas de ton compte en banque." },
    ],
  },
  {
    id: 'image', title: 'Image de soi', color: 'var(--c-self)', icon: '◐',
    intro: "Selon Maxwell Maltz, nous agissons toujours en accord avec l'image que nous avons de nous-mêmes. Changer l'image change les actes.",
    items: [
      { je: "Je choisis l'image que j'ai de moi, et je la construis jour après jour.", tu: "Tu choisis l'image que tu as de toi, et tu la construis jour après jour.", pont: true },
      { je: "Je me vois de plus en plus comme une personne capable et digne de respect.", tu: "Tu te vois de plus en plus comme une personne capable et digne de respect.", pont: true },
      { je: "Mes erreurs sont des événements, pas mon identité.", tu: "Tes erreurs sont des événements, pas ton identité." },
      { je: "J'ai le droit de prendre ma place.", tu: "Tu as le droit de prendre ta place." },
      { je: "Je me souviens de mes réussites, et elles me donnent de l'élan.", tu: "Tu te souviens de tes réussites, et elles te donnent de l'élan." },
      { je: "J'agis aujourd'hui comme la personne que je deviens.", tu: "Tu agis aujourd'hui comme la personne que tu deviens." },
      { je: "Le regard des autres ne définit pas qui je suis.", tu: "Le regard des autres ne définit pas qui tu es." },
      { je: "Je suis digne de ce que je désire construire.", tu: "Tu es digne de ce que tu désires construire." },
    ],
  },
  {
    id: 'confiance', title: 'Confiance en soi', color: 'var(--c-calm)', icon: '▲',
    intro: "La confiance n'est pas l'absence de peur : c'est la décision d'agir avec elle.",
    items: [
      { je: "Je peux avoir peur et avancer quand même.", tu: "Tu peux avoir peur et avancer quand même.", pont: true },
      { je: "Ma confiance grandit chaque fois que je tiens une promesse faite à moi-même.", tu: "Ta confiance grandit chaque fois que tu tiens une promesse faite à toi-même.", pont: true },
      { je: "J'ai confiance en ma capacité à apprendre.", tu: "Tu as confiance en ta capacité à apprendre." },
      { je: "Ma voix compte, et je l'utilise.", tu: "Ta voix compte, et tu l'utilises." },
      { je: "J'ai déjà traversé des moments difficiles, et ils m'ont fait grandir.", tu: "Tu as déjà traversé des moments difficiles, et ils t'ont fait grandir." },
      { je: "Je fais de mon mieux, et c'est suffisant.", tu: "Tu fais de ton mieux, et c'est suffisant." },
      { je: "Je me fais confiance pour trouver des solutions.", tu: "Tu te fais confiance pour trouver des solutions." },
      { je: "Je mérite de réussir.", tu: "Tu mérites de réussir." },
    ],
  },
  {
    id: 'calme', title: 'Calme intérieur', color: 'var(--c-hyp)', icon: '○',
    intro: "Des phrases lentes pour le soir ou les moments de tension.",
    items: [
      { je: "Je peux ralentir. Rien ne presse en cet instant.", tu: "Tu peux ralentir. Rien ne presse en cet instant.", pont: true },
      { je: "À chaque expiration, je relâche un peu plus.", tu: "À chaque expiration, tu relâches un peu plus.", pont: true },
      { je: "Mes pensées passent ; je reste.", tu: "Tes pensées passent ; toi, tu restes." },
      { je: "Je n'ai pas à tout contrôler pour être en paix.", tu: "Tu n'as pas à tout contrôler pour être en paix." },
      { je: "Il existe en moi un lieu calme que rien ne peut atteindre.", tu: "Il existe en toi un lieu calme que rien ne peut atteindre." },
      { je: "Je fais face à chaque chose en son temps.", tu: "Tu fais face à chaque chose en son temps." },
      { je: "Mon corps sait se détendre, et je le laisse faire.", tu: "Ton corps sait se détendre, et tu le laisses faire." },
    ],
  },
  {
    id: 'reussite', title: 'Réussite et action', color: 'var(--c-mind)', icon: '➚',
    intro: "Maltz décrivait un « mécanisme de réussite » : un objectif clair, une image nette, puis l'action qui corrige sa trajectoire en chemin.",
    items: [
      { je: "Je sais où je vais, et chaque pas compte.", tu: "Tu sais où tu vas, et chaque pas compte.", pont: true },
      { je: "Je commence sans attendre le moment parfait, et j'ajuste en chemin.", tu: "Tu commences sans attendre le moment parfait, et tu ajustes en chemin.", pont: true },
      { je: "Mes erreurs me donnent les informations pour corriger ma trajectoire.", tu: "Tes erreurs te donnent les informations pour corriger ta trajectoire." },
      { je: "Je fais aujourd'hui une chose qui rapproche mon objectif.", tu: "Tu fais aujourd'hui une chose qui rapproche ton objectif." },
      { je: "La discipline est une forme de respect envers moi-même.", tu: "La discipline est une forme de respect envers toi-même." },
      { je: "Je termine ce que je commence.", tu: "Tu termines ce que tu commences." },
      { je: "Je me vois déjà réussir, et mon esprit trouve le chemin.", tu: "Tu te vois déjà réussir, et ton esprit trouve le chemin." },
    ],
  },
  {
    id: 'amour', title: 'Bienveillance envers soi', color: 'var(--bad)', icon: '♡',
    intro: "Se parler comme on parlerait à une personne aimée : c'est le socle de tout le reste.",
    items: [
      { je: "J'apprends à me parler avec plus de douceur.", tu: "Tu apprends à te parler avec plus de douceur.", pont: true },
      { je: "Je suis une personne en chemin, et c'est bien ainsi.", tu: "Tu es une personne en chemin, et c'est bien ainsi.", pont: true },
      { je: "Je m'accorde le droit de me tromper.", tu: "Tu t'accordes le droit de te tromper." },
      { je: "Je prends soin de moi sans culpabilité.", tu: "Tu prends soin de toi sans culpabilité." },
      { je: "Je suis digne d'amour, ici et maintenant.", tu: "Tu es digne d'amour, ici et maintenant." },
      { je: "Je me pardonne ce que je ne savais pas encore.", tu: "Tu te pardonnes ce que tu ne savais pas encore." },
      { je: "Mes besoins comptent autant que ceux des autres.", tu: "Tes besoins comptent autant que ceux des autres." },
    ],
  },
  {
    id: 'energie', title: 'Énergie et santé', color: 'var(--b-trop)', icon: '✦',
    intro: "Des phrases du matin, à associer à un geste concret pour le corps.",
    items: [
      { je: "Je choisis un geste aujourd'hui pour prendre soin de mon corps.", tu: "Tu choisis un geste aujourd'hui pour prendre soin de ton corps.", pont: true },
      { je: "Mon énergie revient quand je bouge, je respire et je dors.", tu: "Ton énergie revient quand tu bouges, tu respires et tu dors.", pont: true },
      { je: "J'écoute les signaux de mon corps.", tu: "Tu écoutes les signaux de ton corps." },
      { je: "Chaque matin est un nouveau départ.", tu: "Chaque matin est un nouveau départ." },
      { je: "Je mets mon énergie dans ce qui compte vraiment.", tu: "Tu mets ton énergie dans ce qui compte vraiment." },
      { je: "Je respire profondément, et la vie circule en moi.", tu: "Tu respires profondément, et la vie circule en toi." },
    ],
  },
];

export const ALL_AFFIRMATIONS = THEMES.flatMap((t) => t.items.map((it, i) => ({ ...it, id: `${t.id}-${i}`, theme: t.id })));

export function affirmationOfTheDay(custom = [], date = new Date()) {
  const pool = [...ALL_AFFIRMATIONS, ...custom.map((c) => ({ ...c, tu: c.je }))];
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 86400000);
  return pool[(day * 5 + 3) % pool.length];
}

// Règles pour écrire une affirmation qui « prend ».
export const TIPS = [
  ['Au présent', '« Je deviens… », « J’apprends… », pas « je serai ».'],
  ['Positive', 'Dites ce que vous voulez, pas ce que vous fuyez.'],
  ['Crédible', 'Si une petite voix dit « faux ! », passez par une phrase pont : « J’apprends à… », « De plus en plus… ».'],
  ['Courte et ressentie', 'Une phrase que vous pouvez dire en une respiration, et qui vous touche.'],
  ['Reliée à un acte', 'Associez-la à un petit geste concret dans la journée.'],
];
