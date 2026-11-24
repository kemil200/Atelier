# Atelier de l'esprit

PWA en français pour le travail psychologique et l'amélioration de soi : séances courtes d'autohypnose, de respiration et de thérapies cognitives guidées par une voix ElevenLabs, plus un volet complet sur les biais cognitifs.

En ligne : https://kemil200.github.io/Atelier/

## Contenu

- **17 séances** (1 à 7 min) : SOS soupir apaisant, cohérence cardiaque, respiration carrée, ancrage 5-4-3-2-1, scan corporel, auto-compassion, ancre de calme, descente en spirale, lieu sûr, glisser vers le sommeil, recadrer une pensée (avec les pièges de pensée), feuilles sur la rivière, trois bonnes choses, décider sans biais, votre futur soi, démarrer maintenant, réveil énergisant.
- **Minuteur libre** avec cloche, visuel et fond sonore.
- **44 biais cognitifs** classés en 4 familles (inspiré du Cognitive Bias Codex), avec exemple, antidote, lien avec le bien-être, « je me reconnais » et exemple personnel.
- **10 pièges de pensée** des thérapies cognitives (distorsions cognitives).
- **Labo** : 8 expériences classiques (ancrage, cadrage, conjonction, sophisme du joueur, règle 2-4-6, taux de base, aversion à la perte, faux souvenirs).
- **Quiz** : 20 situations, 8 tirées au hasard par partie.
- **4 parcours** (stress, clarté, sommeil, élan) qui se cochent automatiquement.
- **Journal** : tension avant/après, notes, courbe, séries de jours, export.
- **Réglages** : voix, son, rappel quotidien (.ics), sauvegarde/restauration des données.

Les textes sur les biais sont originaux. Les résultats d'études cités sont ceux publiés par leurs auteurs.

## Lancer en local

```bash
python -m http.server 5178
```

Puis ouvrir http://localhost:5178. Le service worker et l'installation exigent `localhost` ou HTTPS, pas `file://`.

## Mettre à jour le site

Chaque commit poussé sur `main` met à jour GitHub Pages en une minute environ. Pensez à changer `VERSION` dans `sw.js` quand vous ajoutez un fichier.

## ElevenLabs

1. Créez une clé sur https://elevenlabs.io/app/settings/api-keys (droits Text to Speech + Voices en lecture).
2. Dans l'app : Réglages → ElevenLabs → collez la clé → « Charger mes voix » → choisissez une voix.
3. Chaque phrase est générée une seule fois puis gardée dans le cache de l'appareil : rejouer une séance ne coûte plus de crédits.

La clé est stockée dans le `localStorage` du navigateur et n'est envoyée qu'à api.elevenlabs.io. Pour une app publique partagée, il faudrait un petit proxy serveur qui garde la clé côté serveur.

## Structure

- `js/sessions.js` : scripts des séances (texte, visuels, pauses, questions, respiration, chronomètre).
- `js/biases.js` : biais, familles, pièges de pensée, biais du jour.
- `js/lab.js` : expériences du labo.
- `js/quiz.js` : quiz « Repérez le biais ».
- `js/programs.js` : parcours.
- `js/app.js` : navigation, pages, lecteur de séance, journal, réglages.
- `js/core.js` : outils partagés (stockage, progrès, événements).
- `js/voice.js`, `js/visuals.js`, `js/ambient.js` : voix, visuels plein écran, son.
- `sw.js`, `manifest.json`, `icons/` : PWA.
