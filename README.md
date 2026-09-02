# Mosaïque

**Espace personnel modulaire** : une application web unique qui regroupe plusieurs outils
du quotidien — budgets de voyage, suivi des congés, routines de soins — dans une interface
cohérente, installable comme application (PWA) sur mobile et bureau.

> Application personnelle. Anciennement nommée « Vacances », d'où quelques noms techniques hérités.

---

## Modules

### ✈️ Voyages
Budget prévisionnel partagé pour organiser un voyage à plusieurs :
- personnes, périodes/séjours (nuits et jours) ;
- dépenses avec **répartition automatique** (au prorata des jours/nuits, par séjour, par
  personne ou personnalisée) ;
- suivi « réservé / payé », notes en Markdown par voyage, parts par personne, statistiques ;
- liens profonds vers un voyage (`#voyages-…`) pour le partager.

### 🗓️ Congés
Calendrier annuel de pose des congés :
- « peinture » des jours par type (CP, RTT, etc.), demi-journées, jours fériés calculés ;
- **soldes** par compte avec distinction pris / posé / prévisionnel et vue tableau ;
- gestion du **prévisionnel** (hachuré = pas encore officiel) ;
- vacances scolaires en surcouche, mode lecture seule, import/export JSON.

### 🧴 Skincare
Routines de soins, une par personne :
- tableau **produits × moments** (matin / soir / soir + rétinol), référence active mise en avant ;
- vue « liste du moment » sur mobile ;
- fiche produit complète (nom, moments d'application, références & alternatives) ;
- droits par personne : chacun modifie sa routine, consulte celle de l'autre en lecture seule.

---

## Stack technique

- **Front** : HTML / CSS / JavaScript **vanilla**, sans framework ni étape de build.
- **Données** : [Firebase](https://firebase.google.com/) — Authentication (e-mail/mot de passe)
  + Cloud Firestore (synchronisation temps réel entre appareils, `localStorage` en cache).
- **Notes** : rédigées en **Markdown**, rendues par [marked](https://marked.js.org/) — onglets
  « Aperçu / Écrire », barre d'outils, et conversion automatique du HTML collé.
- **Éditeur de texte riche** : [Quill](https://quilljs.com/) (commentaires de dépense).
- **PWA** : installable (manifest + icônes), plein écran sur mobile.
- **Hébergement** : GitHub Pages.

---

## Structure

```
index.html          — structure HTML + chargement des feuilles/scripts
styles.css          — styles de l'application
js/
  core.js           — configuration, état global, initialisation Firebase
  voyages.js        — module Voyages + utilitaires partagés
  shell.js          — navigation entre modules, droits, routage
  conges.js         — module Congés
  skincare.js       — module Skincare
  startup.js        — authentification, chargement, synchronisation
manifest.webmanifest, apple-touch-icon.png — PWA
```

> Le JavaScript est réparti par module mais partage une **portée globale** : les fichiers
> sont chargés dans un ordre précis (`core` → `voyages` → `shell` → `conges` → `skincare`
> → `startup`).

---

## Lancer / déployer

L'application est **entièrement statique** : n'importe quel serveur de fichiers suffit.

```bash
# aperçu local
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Le déploiement se fait via **GitHub Pages**. Une configuration Firebase (projet Firestore +
règles de sécurité) est nécessaire pour l'authentification et la synchronisation.

---

## Conventions

Pour garder l'ensemble cohérent :

- **Échelle typographique** limitée à quelques tailles ; **boutons** unifiés via la classe `.btn`.
- **Points de rupture pilotés par la largeur** (jamais l'orientation).
- Vérifier la **syntaxe** JS après chaque modification (`node --check`).
