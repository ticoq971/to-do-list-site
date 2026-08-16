# TaskFlow — Gestion de tâches hiérarchique

Application de gestion de tâches 100 % frontend, inspirée de Todoist, ClickUp et Notion.
Aucun backend, aucune API, aucune base de données distante : toutes les données sont
stockées dans le **LocalStorage** du navigateur.

## ⚠️ Important — Architecture "zéro build" et 100 % autonome

Cette application **ne nécessite aucune étape de compilation** (pas de `npm install`,
pas de `npm run build`, pas de Vite/Webpack) et **ne dépend d'aucun CDN externe au
runtime** : React, ReactDOM, Babel Standalone et Tailwind CSS sont tous **hébergés
directement dans le dossier `vendor/` de ce projet**.

- Le JSX est transpilé **en direct dans le navigateur** au chargement de la page
- Aucun `package.json`, aucun `node_modules`, aucun serveur de développement requis
- Aucun appel réseau vers `cdn.jsdelivr.net` / `cdn.tailwindcss.com` (évite tout blocage
  lié à une politique de sécurité du domaine d'hébergement)
- Un garde-fou dans `index.html` affiche un message d'erreur lisible si jamais un script
  échoue à charger ou à s'exécuter, plutôt que de laisser une page blanche silencieuse

➡️ **Pour consulter le site, ouvrez simplement `index.html`** (double-clic, ou servez le
dossier avec n'importe quel serveur statique). C'est exactement ce que fait le bouton
**Publish** de cette plateforme : il sert les fichiers tels quels, ce qui fonctionne
avec cette architecture (contrairement à un projet Vite/TypeScript classique qui
nécessiterait une compilation préalable).

## Fonctionnalités implémentées

### Projets
- Création, renommage, suppression, archivage/désarchivage
- Choix d'une couleur parmi une palette
- Barre de progression (par projet) dans la sidebar, la page Projets et le Dashboard

### Tâches hiérarchiques (profondeur illimitée)
- `parentId` pour représenter la hiérarchie Tâche → Sous-tâche → Sous-sous-tâche → …
- Titre, description, statut terminé/non terminé, priorité (basse/moyenne/haute/urgente),
  échéance, tags, date de création, position parmi les frères/sœurs
- Création / édition (modale de détail) / suppression (cascade sur les sous-tâches)
- Complétion en cascade (cocher une tâche coche aussi ses sous-tâches)
- Plier/déplier chaque niveau (état persistant)

### Drag & Drop
- Réordonner des tâches parmi leurs frères/sœurs
- Déposer une tâche « à l'intérieur » d'une autre pour la transformer en sous-tâche
- Remonter une sous-tâche au niveau supérieur (drag, ou raccourci `Shift+Tab`)
- Indicateurs visuels (ligne d'insertion, halo) pendant le survol

### Persistance locale
- Sauvegarde automatique à chaque changement (LocalStorage, clé `taskflow.data.v1`)
- Restauration complète au rechargement de la page
- Paramètres : **Export JSON**, **Import JSON**, **Réinitialisation complète**

### Interface
- Sidebar : Tableau de bord, Aujourd'hui, À venir, Projets, Terminées, Paramètres
- Recherche instantanée (titres, descriptions, tags)
- Filtres combinables : priorité, statut, projet, tag, plage de dates
- Mode sombre / clair avec sauvegarde du choix (`taskflow.theme`)
- Design desktop-first, responsive (sidebar en tiroir sur mobile)
- Animations discrètes (apparition de tâche, transitions de progression, coche, etc.)

### Dashboard
- Nombre total de tâches, terminées, restantes, en retard, dues aujourd'hui
- Progression par projet avec barres animées

### Raccourcis clavier
- `N` : focus sur le champ de création rapide de tâche
- `Entrée` : ouvrir la tâche sélectionnée
- `Espace` : terminer/réactiver la tâche sélectionnée
- `Tab` / `Shift+Tab` : indenter / dé-indenter (transformer en sous-tâche / remonter d'un niveau)
- `↑` / `↓` : naviguer entre les tâches visibles de la vue courante

## Entrées / routes de l'application

Navigation gérée par un petit routeur basé sur le hash de l'URL (`js/app.js`), sans
dépendance externe :

| Route | Description |
|---|---|
| `#/` | Tableau de bord |
| `#/today` | Tâches dues aujourd'hui ou en retard |
| `#/upcoming` | Tâches à échéance future |
| `#/projects` | Liste des projets (actifs / archivés) |
| `#/project/<id>` | Détail d'un projet et de son arbre de tâches |
| `#/completed` | Toutes les tâches terminées |
| `#/search` | Résultats de recherche instantanée |
| `#/settings` | Apparence, export/import/reset des données, raccourcis |

## Modèle de données

Stocké en un seul objet JSON dans `localStorage["taskflow.data.v1"]` :

```js
Project {
  id, name, color, archived, createdAt
}

Task {
  id, projectId, parentId,       // parentId = null pour une tâche racine
  title, description,
  completed, completedAt,
  priority,                      // 'low' | 'medium' | 'high' | 'urgent'
  dueDate,                       // ISO yyyy-mm-dd ou null
  tags,                          // string[]
  createdAt, updatedAt,
  position,                      // ordre parmi les tâches de même parent
  collapsed
}
```

## Architecture du code

```
index.html          Charge React/Babel/Tailwind (fichiers locaux vendor/) puis les scripts ci-dessous
vendor/              React, ReactDOM, Babel Standalone et Tailwind CSS hébergés localement
css/style.css        Animations et styles complémentaires à Tailwind
js/
  utils.js           Fonctions pures : id, dates, arbre hiérarchique, filtres, LocalStorage, seed
  store.js           Contexts + reducer : TaskStore, Filters, Selection, TaskModal, useTheme
  components.js       Composants réutilisables : Sidebar, Layout, TaskTree/TaskItem (drag&drop),
                      TaskModal, ProjectModal, QuickAddTask, SearchBar, Filters, StatCard…
  pages.js            Vues : Dashboard, Today, Upcoming, Projects, ProjectPage, Completed,
                      Search, Settings
  app.js              Routeur (hash), arbre de providers, montage React
```

Tous les fichiers `js/*.js` sont chargés comme des scripts classiques (`type="text/babel"`)
et partagent un **même scope global** : les hooks React sont déstructurés une seule fois
(dans `store.js`) pour éviter toute redéclaration.

## Fonctionnalités non implémentées / pistes d'évolution

- Vue "Calendrier" visuelle (actuellement seulement des listes triées par date)
- Multi-sélection de tâches pour actions groupées
- Undo/redo sur les actions destructrices (suppression, déplacement)
- Synchronisation multi-appareils (nécessiterait un backend — hors périmètre de ce projet 100 % statique)
- Migration vers un vrai bundler (Vite) + IndexedDB si le projet doit évoluer vers une
  base de code plus importante ou un volume de données conséquent

## Déploiement

Ce projet est un site 100 % statique : ouvrez `index.html` directement, ou publiez le
dossier tel quel sur n'importe quel hébergeur statique (le bouton **Publish** de cette
plateforme, Netlify, Vercel, GitHub Pages, etc.). Aucune étape de build n'est nécessaire.
