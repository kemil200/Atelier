// Parcours : une activité par jour. type = 'session' | 'lab' | 'quiz' | 'bias'.

export const PROGRAMS = [
  {
    id: 'stress',
    title: '7 jours pour apprivoiser le stress',
    color: 'var(--c-calm)',
    pitch: 'Une boîte à outils complète contre le stress : respirer, revenir au corps, s’ancrer et se parler avec douceur.',
    days: [
      { type: 'session', id: 'coherence', note: 'Le socle : six respirations par minute.' },
      { type: 'session', id: 'scan', note: 'Repérer où le stress se loge dans le corps.' },
      { type: 'session', id: 'sens', note: 'Un outil d’urgence pour les moments de panique.' },
      { type: 'session', id: 'ancrage', note: 'Créer un raccourci vers le calme.' },
      { type: 'session', id: 'compassion', note: 'Arrêter de se juger quand ça va mal.' },
      { type: 'session', id: 'lieu-sur', note: 'Se construire un refuge intérieur.' },
      { type: 'session', id: 'spirale', note: 'Une plongée plus profonde pour consolider.' },
    ],
  },
  {
    id: 'clarte',
    title: '7 jours pour penser plus clair',
    color: 'var(--c-mind)',
    pitch: 'Découvrir ses biais en les vivant, puis apprendre à recadrer ses pensées et ses décisions.',
    days: [
      { type: 'lab', id: 'roue', note: 'Sentir l’ancrage agir sur vous.' },
      { type: 'bias', id: 'confirmation', note: 'Le roi des biais, et comment le contrer.' },
      { type: 'session', id: 'recadrage', note: 'Examiner une pensée qui fait mal.' },
      { type: 'lab', id: 'regle', note: 'Chercher à se tromper : un exercice étonnant.' },
      { type: 'session', id: 'defusion', note: 'Prendre de la distance avec ses pensées.' },
      { type: 'quiz', id: 'quiz', note: 'Repérer les biais dans la vie de tous les jours.' },
      { type: 'session', id: 'decision', note: 'Passer une vraie décision au crible.' },
    ],
  },
  {
    id: 'sommeil',
    title: '5 soirs pour mieux dormir',
    color: 'var(--c-hyp)',
    pitch: 'Un rituel du soir pour vider sa tête et laisser venir le sommeil.',
    days: [
      { type: 'session', id: 'sommeil', note: 'Le rituel de base, à faire au lit.' },
      { type: 'session', id: 'carree', note: 'Calmer un esprit agité avant de se coucher.' },
      { type: 'session', id: 'gratitude', note: 'Finir la journée sur ce qui a été bien.' },
      { type: 'session', id: 'scan', note: 'Relâcher les tensions de la journée.' },
      { type: 'session', id: 'sommeil', note: 'Retour au rituel : il devient un réflexe.' },
    ],
  },
  {
    id: 'elan',
    title: '5 jours pour retrouver l’élan',
    color: 'var(--c-energy)',
    pitch: 'Contre la procrastination et le manque d’énergie : petits pas, futur concret, vraies actions.',
    days: [
      { type: 'session', id: 'reveil', note: 'Réveiller le corps pour réveiller l’esprit.' },
      { type: 'bias', id: 'present', note: 'Comprendre pourquoi on repousse.' },
      { type: 'session', id: 'demarrer', note: 'Deux minutes pour commencer, maintenant.' },
      { type: 'session', id: 'futur-soi', note: 'Rencontrer la personne que vous devenez.' },
      { type: 'session', id: 'demarrer', note: 'On recommence avec une autre tâche.' },
    ],
  },
];
