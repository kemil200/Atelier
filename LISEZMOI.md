# Atelier de l'esprit

PWA en français : dix séances courtes (2 à 6 min) d'autohypnose, de respiration et de travail sur les pensées (TCC, ACT, auto-compassion), guidées par une voix ElevenLabs et des visuels plein écran.

## Lancer en local

```bash
python -m http.server 5178
```

Puis ouvrir http://localhost:5178. (Le service worker et l'installation exigent `localhost` ou HTTPS, pas `file://`.)

## Mettre en ligne

C'est un site statique sans build : déposez le dossier tel quel sur Netlify, Vercel, Cloudflare Pages ou GitHub Pages. Une fois en HTTPS, le bouton « Installer » apparaît sur ordinateur et Android ; sur iPhone : Partager → « Sur l'écran d'accueil ».

## ElevenLabs

1. Créez une clé sur https://elevenlabs.io/app/settings/api-keys (droits Text to Speech + Voices en lecture).
2. Dans l'app : Réglages → ElevenLabs → collez la clé → « Charger mes voix » → choisissez une voix.
3. Chaque phrase est générée une seule fois puis gardée dans le cache de l'appareil : rejouer une séance ne coûte plus de crédits.

Ordre de grandeur : ~9 400 caractères pour générer les dix séances une fois avec Multilingual v2 (environ deux fois moins avec Flash v2.5), plus les phrases personnalisées (vos réponses relues à voix haute).

La clé est stockée dans le `localStorage` du navigateur et n'est envoyée qu'à api.elevenlabs.io. Pour une app publique partagée avec d'autres personnes, il faudrait plutôt un petit proxy serveur qui garde la clé côté serveur.

## Structure

- `js/sessions.js` : les scripts des séances (texte, visuels, pauses, questions). C'est le fichier à modifier pour écrire de nouvelles séances.
- `js/voice.js` : ElevenLabs + cache + voix du navigateur en secours.
- `js/visuals.js` : spirale, respiration, fixation, horizon, rivière, scan, halo.
- `js/ambient.js` : bruit doux et battements binauraux (Web Audio).
- `js/app.js` : interface, lecteur de séance, journal, réglages.
- `sw.js`, `manifest.json`, `icons/` : PWA.
