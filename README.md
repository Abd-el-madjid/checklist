# Dossier de départ — Besançon (React + Vite)

Checklist interactive pour la préparation du départ à Besançon : suivi de
progression, budget "à acheter", sections personnalisables et liaison entre
sections.

Port React de l'app HTML originale. Le contenu (chapitres, sections,
éléments) vit désormais dans son propre fichier `src/data.js`, séparé du
reste du code.

## Structure du projet

```
├── index.html              point d'entrée Vite
├── src/
│   ├── main.jsx             montage React
│   ├── App.jsx               état global + orchestration
│   ├── data.js               ⭐ contenu du dossier (sections, éléments)
│   ├── logic.js               fonctions pures (agrégation, liaison, budget)
│   ├── storage.js             persistance localStorage
│   ├── styles.css             styles (thème "ticket/papier")
│   └── components/
│       ├── Ticket.jsx
│       ├── TabBar.jsx
│       ├── SectionBlock.jsx
│       ├── ItemRow.jsx
│       ├── BudgetPanel.jsx
│       └── modals/
│           ├── ConfirmModal.jsx      (décocher / supprimer, 5s avant confirmation)
│           ├── BuyModal.jsx          (marquer "à acheter" + prix estimé)
│           ├── RealPriceModal.jsx    (prix réel payé, à la coche)
│           ├── AddItemModal.jsx      (bouton "+ Ajouter un élément")
│           └── AddSectionModal.jsx   (bouton "+ Nouvelle section")
```

## Développement local

```bash
npm install
npm run dev
```

Ouvre l'URL affichée (par défaut http://localhost:5173).

## Build de production

```bash
npm run build
```

Génère le dossier `dist/` (fichiers statiques prêts à déployer).

```bash
npm run preview
```

pour tester le build de production en local avant déploiement.

## Déploiement sur Cloudflare Pages

### Option A — via le dashboard Cloudflare (le plus simple)

1. Pousse ce dossier sur un repo GitHub/GitLab.
2. Dans le dashboard Cloudflare → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
3. Sélectionne le repo, puis configure :
   - **Framework preset** : Vite
   - **Build command** : `npm run build`
   - **Build output directory** : `dist`
4. Déployer. Chaque push sur la branche principale redéploie automatiquement.

### Option B — via Wrangler CLI (sans repo Git)

```bash
npm install -g wrangler
npm run build
wrangler pages deploy dist --project-name besancon-checklist
```

(Nécessite `wrangler login` au préalable.)

## Modifier le contenu du dossier

Tout le contenu (chapitres "Départ / Bagages / Acheter / Après", leurs
sections et leurs éléments) est dans **`src/data.js`**. C'est un simple
fichier JS avec des exports nommés (`DEPART_SECS`, `BAGAGE_SECS`,
`ACHETER_SECS`, `AFTER_SECS`, `CHAPTERS_META`) — modifie-le directement,
sauvegarde, et Vite recharge automatiquement en dev.

Le bouton **"⬇ exporter data.js"** dans l'app génère un nouveau fichier
`data.js` à partir de l'état courant (éléments ajoutés, tickets "à acheter"
appliqués, etc.) — pratique pour figer une version et la recoller dans
`src/data.js` comme nouveau point de départ "en dur".

## Notes

- Toute la progression (cases cochées, éléments ajoutés, sections
  personnalisées, budget) est sauvegardée dans le `localStorage` du
  navigateur — propre à chaque appareil/navigateur, rien n'est envoyé à un
  serveur.
- Les sections personnalisées peuvent être "liées" à une section existante :
  leurs éléments apparaissent alors dans les deux listes, avec un seul état
  coché partagé.
