# ⛏️ MyCraft

Un jeu voxel 3D inspiré par Minecraft, entièrement dans le navigateur. Écrit en JavaScript vanilla avec Three.js — aucune dépendance, aucun bundler.

![MyCraft](https://img.shields.io/badge/Three.js-v0.160.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Platform](https://img.shields.io/badge/platform-Desktop%20%2B%20Mobile-orange)

---

## 🎮 Fonctionnalités

### Monde
- 🌍 Génération procédurale infinie (bruit Simplex multi-octave)
- 🏜️ 4 biomes : désert, neige, forêt, plaines
- 🌊 Eau animée avec scintillement
- 🕳️ Grottes générées en 3D
- 💎 Minerais (charbon, fer)
- 🌲 Arbres générés procéduralement
- ☁️ Nuages procéduraux

### Gameplay
- ⛏️ Casser et placer des blocs (15 types)
- 🧱 Hotbar avec 9 blocs sélectionnables
- 🎯 Crosshair et sélection de bloc avec wireframe
- 🏃 Marche, sprint et saut avec physique réaliste
- 🤖 PNJ villageois avec IA de promenade

### Visuel
- 🌅 Cycle jour/nuit (10 minutes) avec coucher de soleil
- ⭐ Étoiles la nuit
- 🔦 Éclairage dynamique (soleil, ambiant, torche nocturne)
- 🎨 Textures procédurales 16×16 pixel art
- ⛏️ Pioche 3D animée en overlay

### Interface
- 📋 Menu principal avec fond animé et particules
- 💾 Système de sauvegarde (5 emplacements)
- 📺 Mode plein écran
- 📱 Contrôles tactiles complets (joystick + boutons)
- 🔍 Infos debug (F3)

---

## 🚀 Démarrage rapide

### Prérequis
- Python 3 (pour le serveur HTTP)
- Un navigateur moderne (Chrome, Firefox, Edge, Safari)

### Lancer le jeu

```bash
cd mycraft
python3 -m http.server 1234 --bind 0.0.0.0
```

Ouvrir dans le navigateur : **http://localhost:1234**

> Depuis un autre poste sur le même réseau : `http://<IP-DE-LA-MACHINE>:1234`

### Avec DevContainer (VS Code)

Le projet inclut une configuration DevContainer qui lance automatiquement le serveur :

1. Ouvrir le dossier dans VS Code
2. `Ctrl+Shift+P` → **Dev Containers: Reopen in Container**
3. Le serveur démarre automatiquement sur le port 1234

---

## 🎹 Contrôles

### Desktop (clavier + souris)

| Touche | Action |
|--------|--------|
| `W A S D` | Se déplacer |
| `Espace` | Sauter |
| `Shift` | Sprinter |
| `Clic gauche` | Casser un bloc |
| `Clic droit` | Placer un bloc |
| `1` — `9` | Sélectionner un bloc |
| `F3` | Infos debug |
| `ESC` | Retour au menu |

### Mobile (tactile)

| Zone / Bouton | Action |
|---------------|--------|
| Joystick (gauche) | Se déplacer |
| Zone droite (glisser) | Regarder autour |
| ⬆ | Sauter |
| ⛏ | Casser un bloc |
| ◼ | Placer un bloc |
| ◀ ▶ | Changer de bloc |
| ☰ | Menu |

---

## 💾 Système de sauvegarde

- **5 emplacements** de sauvegarde
- Sauvegarde la position du joueur, sa rotation, le bloc sélectionné, l'heure du jour et toutes les modifications de terrain
- Les sauvegardes sont stockées dans le `localStorage` du navigateur
- Accessible depuis le menu principal → **Sauvegardes**

---

## 🏗️ Architecture du projet

```
mycraft/
├── index.html              Point d'entrée HTML
├── css/
│   └── style.css           Styles UI (menu, jeu, modals, responsive)
├── js/
│   ├── main.js             Classe Game — orchestrateur principal
│   ├── world.js            Génération terrain, biomes, chunks
│   ├── chunk.js            Stockage blocs & génération mesh
│   ├── player.js           Contrôles FPS, physique, interactions
│   ├── blocks.js           Types de blocs & propriétés
│   ├── textures.js         Atlas de textures procédurales
│   ├── noise.js            Bruit Simplex + fractales
│   ├── npc.js              PNJ villageois avec IA
│   ├── touch.js            Contrôles tactiles mobiles
│   └── save.js             Gestion des sauvegardes (localStorage)
├── .devcontainer/
│   └── devcontainer.json   Configuration conteneur de développement
├── PLAN.md                 Plan technique détaillé de l'application
└── README.md               Ce fichier
```

### Modules principaux

| Module | Classe/Export | Rôle |
|--------|--------------|------|
| `main.js` | `Game` | Chef d'orchestre : menu, rendu, boucle de jeu, UI |
| `world.js` | `World` | Génération procédurale, gestion des chunks, raycasting |
| `chunk.js` | `Chunk` | Stockage des blocs (Uint8Array), construction des meshes |
| `player.js` | `Player` | Caméra FPS, mouvement WASD, physique, interaction blocs |
| `blocks.js` | `BlockType`, `FACES` | Enum des 15 types de blocs, géométrie des faces |
| `textures.js` | `createTextureAtlas()` | Génération procédurale d'un atlas 4×4 textures 16×16 |
| `noise.js` | `SimplexNoise` | Bruit de Perlin simplifié 2D/3D avec fbm |
| `npc.js` | `NPC`, `NPCManager` | PNJ box-model, IA de wandering, spawn/despawn |
| `touch.js` | `TouchControls` | Joystick virtuel, zone de look, boutons d'action |
| `save.js` | `SaveManager` | 5 slots de sauvegarde via localStorage |

---

## 🌍 Génération du monde

| Paramètre | Valeur |
|-----------|--------|
| Taille chunk | 16 × 128 × 16 blocs |
| Distance de rendu | 6 chunks (~96 blocs) |
| Hauteur de base | 38 |
| Niveau de l'eau | 32 |
| Biomes | Désert, Neige, Forêt, Plaines |
| Caves | Bruit 3D, seuil > 0.45 |
| Minerais | Charbon (y < 40), Fer (y < 25) |

---

## 🧱 Types de blocs

| ID | Nom | Propriétés |
|----|-----|------------|
| 0 | Air | — |
| 1 | Herbe | Solide, texture top/side/bottom |
| 2 | Terre | Solide |
| 3 | Pierre | Solide |
| 4 | Sable | Solide |
| 5 | Eau | Transparent, animé |
| 6 | Tronc de chêne | Solide, texture top/side |
| 7 | Feuilles | Transparent |
| 8 | Neige | Solide |
| 9 | Bedrock | Solide, incassable |
| 10 | Minerai de charbon | Solide |
| 11 | Minerai de fer | Solide |
| 12 | Planches | Solide |
| 13 | Pierre taillée | Solide |
| 14 | Verre | Transparent |

---

## 🌅 Cycle jour/nuit

- **Durée** : 600 secondes (10 minutes pour un cycle complet)
- **Effets** :
  - Couleur du ciel : bleu → orange (coucher) → bleu nuit
  - Étoiles visibles la nuit
  - Lumière du soleil orangée au coucher/lever
  - Lumière torche automatique la nuit
  - Intensité des lumières variable

---

## ⚙️ Technologies

| Technologie | Usage |
|-------------|-------|
| JavaScript ES2022+ | Langage principal, ES Modules natifs |
| Three.js v0.160.0 | Rendu 3D (WebGL), chargé via CDN |
| CSS3 | Interface utilisateur, animations, responsive |
| HTML5 | Structure, Canvas, Pointer Lock API, Fullscreen API |
| localStorage | Persistance des sauvegardes |
| Python http.server | Serveur de fichiers statiques |
| Docker (Alpine 3.22) | Conteneur de développement |

---

## 📱 Compatibilité

| Plateforme | Support |
|------------|---------|
| Chrome Desktop | ✅ Complet |
| Firefox Desktop | ✅ Complet |
| Edge Desktop | ✅ Complet |
| Safari Desktop | ✅ Complet |
| Chrome Mobile (Android) | ✅ Contrôles tactiles |
| Safari Mobile (iOS) | ✅ Contrôles tactiles |
| VS Code Simple Browser | ⚠️ Pointer Lock limité |

---

## 📝 Plan technique

Voir le fichier [PLAN.md](PLAN.md) pour le plan technique détaillé de l'application (architecture, méthodes, flux, etc.).

> **Note pour les agents IA** : Consultez `PLAN.md` en début de session et mettez-le à jour après chaque modification structurelle.

Consultez également `.github/copilot-instructions.md` pour des directives spécifiques destinées aux agents IA et aux contributeurs automatisés.

---

## 📄 Licence

Ce projet est sous licence MIT.

---

*MyCraft v1.0.2.0 — Inspiré par Minecraft* ⛏️
