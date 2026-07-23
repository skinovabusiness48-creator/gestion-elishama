# ELISHAMA — Guide d'installation & utilisation hors connexion

> Application de gestion de restaurant — Windows · Android · macOS · Linux

## 1. Prérequis (à faire une seule fois)

Vous avez besoin d'installer **Node.js** (ou Bun) sur votre ordinateur. C'est le moteur qui fait tourner l'application localement.

### Option A — Node.js (recommandé, le plus simple)
1. Allez sur https://nodejs.org
2. Téléchargez la version **LTS** (ex: 20.x ou 22.x) pour Windows
3. Lancez l'installeur, suivez les étapes (cochez « Add to PATH »)
4. Vérifiez : ouvrez l'**Invite de commandes** et tapez `node -v` → doit afficher une version

### Option B — Bun (plus rapide)
1. Allez sur https://bun.sh
2. Suivez les instructions pour Windows (PowerShell : `irm bun.sh/install.ps1 | iex`)

---

## 2. Installer l'application ELISHAMA sur votre machine

### Étape 1 — Copier le dossier du projet
Copiez **tout le dossier du projet** (celui qui contient `package.json`, le dossier `src/`, `prisma/`, `public/`) sur votre ordinateur, par exemple dans :
```
C:\ELISHAMA
```

### Étape 2 — Installer les dépendances (une seule fois)
Ouvrez l'**Invite de commandes** dans le dossier du projet :
```bash
cd C:\ELISHAMA
npm install
```
*(ou `bun install` si vous utilisez Bun)*

### Étape 3 — Préparer la base de données (une seule fois)
```bash
npm run db:push
```
Cela crée la base de données SQLite locale (`db/custom.db`).

---

## 3. Lancer l'application (au quotidien)

### Mode production (le plus rapide à l'usage)
```bash
cd C:\ELISHAMA
npm run build
npm run start
```
Puis ouvrez votre navigateur à l'adresse : **http://localhost:3000**

### Mode développement (si vous voulez modifier le code)
```bash
cd C:\ELISHAMA
npm run dev
```

> ⚠️ **Important** : L'application **doit être lancée** pour être utilisée. Une fois lancée, elle fonctionne **100 % hors connexion** (pas besoin d'internet). Toutes vos données restent sur votre ordinateur.

---

## 4. Installer ELISHAMA comme une vraie application (PWA)

Pour avoir ELISHAMA dans votre menu Démarrer / sur votre bureau, avec sa propre fenêtre (comme une app native) :

### Sur Windows (Chrome ou Edge)
1. Lancez l'application (étape 3) et ouvrez **http://localhost:3000**
2. Dans Chrome ou Edge, cliquez sur l'icône **⊕ Installer** à droite de la barre d'adresse
   - Ou menu (⋮) → **Installer ELISHAMA…** / **Apps → Installer cette application**
3. Confirmez l'installation
4. ✅ ELISHAMA apparaît maintenant dans votre **menu Démarrer** et peut être épinglée au **bureau** ou à la **barre des tâches**
5. Elle s'ouvre dans sa propre fenêtre, sans la barre d'outils du navigateur

### Sur Android (Chrome)
1. Ouvrez **http://localhost:3000** dans Chrome (l'ordinateur doit être allumé et l'app lancée, même réseau Wi-Fi)
2. Menu (⋮) → **Ajouter à l'écran d'accueil** → **Installer**
3. ✅ Icône sur l'écran d'accueil, ouverture en plein écran

### Sur iPhone/iPad (Safari)
1. Ouvrez l'URL → bouton **Partager** → **Sur l'écran d'accueil**

---

## 5. Lancer ELISHAMA automatiquement au démarrage de Windows

Pour ne pas avoir à taper les commandes à chaque fois :

1. Ouvrez le Bloc-notes
2. Collez :
```bat
@echo off
cd /d C:\ELISHAMA
npm run start
```
3. Enregistrez sous `C:\ELISHAMA\demarrer-elishama.bat`
4. Appuyez sur **Win + R**, tapez `shell:startup` → Entrée
5. Copiez un **raccourci** du fichier `.bat` dans ce dossier Démarrage

→ Au prochain démarrage de Windows, ELISHAMA se lancera automatiquement. Ouvrez ensuite l'icône installée (PWA) ou allez sur http://localhost:3000.

---

## 6. Utilisation 100 % hors connexion

✅ **Vos données sont stockées localement** :
- Base de données : `C:\ELISHAMA\db\custom.db` (SQLite)
- Photos : `C:\ELISHAMA\public\uploads\`

✅ **Aucune donnée envoyée sur internet** — tout reste sur votre machine.

✅ Une fois le serveur lancé, vous pouvez couper votre connexion internet : l'application continue de fonctionner.

---

## 7. Sauvegarder vos données

Dans l'application → module **Sauvegarde** :
- Bouton **« Sauvegarder maintenant »** → télécharge un fichier `Sauvegarde_DD_MM_YYYY.zip`
- Ce ZIP contient **la base de données + toutes les photos**
- Conservez-le sur une clé USB ou un disque externe

Pour restaurer : module Sauvegarde → **« Restaurer »** → choisissez le ZIP.

---

## 8. Mises à jour

Pour mettre à jour l'application avec une nouvelle version :
1. Sauvegardez vos données (module Sauvegarde → ZIP)
2. Remplacez les fichiers du projet par la nouvelle version
3. Relancez `npm install` puis `npm run build && npm run start`
4. Si besoin, restaurez votre sauvegarde

---

## 9. En cas de problème

| Problème | Solution |
|---|---|
| « port 3000 déjà utilisé » | Une autre app occupe le port. Modifiez le port : `npm run start -- -p 3001` |
| Page blanche | Vérifiez que le serveur tourne (la fenêtre de commandes doit rester ouverte) |
| Données perdues | Restaurez une sauvegarde (module Sauvegarde) |
| Lenteur au 1er lancement | Normal : compilation. Les lancements suivants sont instantanés |

---

**Besoin d'aide ?** Toutes les données sont à vous — aucune dépendance à un service externe. Votre restaurant ELISHAMA, vos données, sur votre machine.
