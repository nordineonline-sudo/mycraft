# 📋 MyCraft — Plan de l'application

> **⚠️ INSTRUCTIONS POUR L'AGENT IA**
>
> Ce fichier est le plan de référence de l'application MyCraft.
> **Tu DOIS le consulter en début de session** pour comprendre l'architecture.
> **Tu DOIS le mettre à jour** à chaque modification structurelle :
> - Ajout/suppression/renommage de fichier
> - Ajout/suppression de classe, méthode publique ou export
> - Changement de dépendances ou d'architecture
> - Ajout de nouvelles fonctionnalités
> - Correction de bugs majeurs
>
> Mets à jour la section concernée ET la date de dernière modification en bas.

---

## 1. Vue d'ensemble

**MyCraft** est un jeu voxel (type Minecraft) en 3D dans le navigateur, écrit en **JavaScript vanilla** avec **Three.js** (v0.160.0 via CDN). Aucun bundler, aucun framework — 100% ES Modules natifs.

| Propriété            | Valeur                                    |
|----------------------|-------------------------------------------|
| Langage              | JavaScript (ES2022+, ES Modules)          |
| Moteur 3D            | Three.js v0.160.0 (CDN import map)        |
| Serveur              | Python `http.server` (port 1234)          |
| Stockage             | `localStorage` (sauvegardes)              |
| Police               | Press Start 2P (Google Fonts)             |
| Plateformes          | Desktop (souris + clavier) + Mobile (tactile) |
| Conteneur            | Alpine 3.22 (devcontainer)                |

---

## 2. Arborescence des fichiers

```
mycraft/
├── index.html                  # Point d'entrée HTML, structure UI
├── css/
│   └── style.css               # Tous les styles (menu, jeu, modals, responsive)
├── js/
│   ├── main.js                 # Classe Game — chef d'orchestre (~1036 lignes)
│   ├── world.js                # Classe World — terrain, biomes, chunks (~391 lignes)
│   ├── chunk.js                # Classe Chunk — stockage blocs & mesh (~171 lignes)
│   ├── player.js               # Classe Player — contrôles FPS, physique (~306 lignes)
│   ├── blocks.js               # BlockType enum, propriétés, faces (~144 lignes)
│   ├── textures.js             # Atlas procédural 16×16 pixels (~409 lignes)
│   ├── noise.js                # SimplexNoise + fbm2D/3D (~167 lignes)
│   ├── npc.js                  # NPC + NPCManager (~360 lignes)
│   ├── touch.js                # TouchControls — joystick virtuel (~278 lignes)
│   └── save.js                 # SaveManager — 5 slots localStorage (~111 lignes)
├── .devcontainer/
│   └── devcontainer.json       # Config conteneur Alpine + port 1234
├── README.md                   # Documentation utilisateur
└── PLAN.md                     # Ce fichier (plan technique)
```

---

## 3. Architecture des modules

### 3.1 Graphe de dépendances

```
index.html
  └── js/main.js (Game)
        ├── three (CDN)
        ├── js/textures.js      → createTextureAtlas(), TEX, getUV()
        ├── js/world.js (World)
        │     ├── js/noise.js   → SimplexNoise, fbm2D, fbm3D
        │     ├── js/blocks.js  → BlockType, isSolid
        │     └── js/chunk.js (Chunk)
        │           ├── js/blocks.js → FACES, getTexture, isSolid, isTransparent, BlockType
        │           └── js/textures.js → getUV
        ├── js/player.js (Player)
        │     └── js/blocks.js  → BlockType, isSolid, HOTBAR_BLOCKS
        ├── js/npc.js (NPC, NPCManager)
        │     └── js/blocks.js  → isSolid, BlockType
        ├── js/touch.js (TouchControls)
        ├── js/save.js (SaveManager)
        └── js/blocks.js        → HOTBAR_BLOCKS, getBlockProps
```

### 3.2 Détail des modules

#### `js/main.js` — Classe `Game` (non exportée, instanciée au chargement)

Le cœur de l'application. Orchestre tout : menu, rendu, scène, boucle de jeu.

| Méthode | Rôle |
|---------|------|
| `constructor()` | Initialise clock, timeOfDay, appelle `_initMenu()` |
| `_initMenu()` | Bind les boutons du menu principal (Continuer, Nouvelle Partie, Sauvegardes, Plein écran, Contrôles) |
| `_updateMenuButtons()` | Affiche/masque Continuer et Sauvegardes selon l'état |
| `_returnToMenu()` | Retour au menu principal (depuis ESC, bouton ☰, ou pointer lock perdu) |
| `_resumeGame()` | Reprend la partie en cours depuis le menu |
| `_cleanupGame()` | Détruit world, NPCs, étoiles, nuages, touch controls — reset complet |
| `_showSaveModal()` | Affiche la modale de sauvegarde |
| `_renderSaveSlots()` | Génère dynamiquement les 5 slots (💾 sauver, 📂 charger, 🗑️ supprimer) |
| `_showToast(msg)` | Notification toast en bas de l'écran |
| `_toggleFullscreen()` | Bascule plein écran via Fullscreen API |
| `_animateMenuBG()` | Animation canvas du fond du menu (blocs flottants) |
| `_spawnMenuParticles()` | Particules flottantes dans le menu |
| `async _startGame(saveData?)` | Lance le chargement (renderer, scène, puis `start()`) |
| `_initRenderer()` | Crée le WebGLRenderer + shadows |
| `_initScene()` | Crée scène, caméra, lumières (sun, ambient, hemi, torch), fog |
| `_createStars()` | 3000 étoiles pour la nuit |
| `_createPickaxe()` | Pioche 3D overlay (scène séparée) |
| `_initUI()` | Référence les éléments DOM du jeu |
| `async start(saveData?)` | Génère atlas textures, crée world/player/NPCs, lance la boucle |
| `_setupPickaxeSwing()` | Listener mousedown pour l'animation de swing |
| `_setupPointerLock()` | Pointer Lock API — clic sur canvas = lock, perte = retour menu |
| `_createHighlight()` | Wireframe de sélection de bloc |
| `_createClouds()` | Plan nuageux procédural |
| `_buildHotbar()` | Génère la hotbar avec preview des textures |
| `_updateHotbar()` | Met à jour la sélection visuelle |
| `_updateWater(dt)` | Animation opacité eau |
| `_updateDayNight(dt)` | Cycle jour/nuit (600s), couleurs ciel, intensités lumière, étoiles |
| `_updatePickaxe(dt)` | Bobbing + animation swing pioche |
| `_loop()` | Boucle `requestAnimationFrame` — update tout + render scène + overlay pioche |

**Flux principal :**
```
constructor → _initMenu() → [clic Nouvelle Partie] → _startGame() → _initRenderer() + _initScene() + _initUI() → start(saveData?) → _loop()
                           → [clic Continuer]       → _resumeGame()
                           → [ESC / bouton ☰]       → _returnToMenu()
```

#### `js/world.js` — Classe `World`

| Élément | Détail |
|---------|--------|
| `RENDER_DISTANCE` | 6 chunks |
| `BASE_HEIGHT` | 38 |
| `WATER_LEVEL` | 32 |
| `constructor(scene, solidMaterial, waterMaterial, seed)` | Crée 4 instances SimplexNoise (terrain, biome, cave, tree) |
| `getBlock(x,y,z)` / `setBlock(x,y,z,type)` | Accès blocs en coordonnées monde. `setBlock` track les modifications pour la sauvegarde |
| `getBiome(x,z)` | Retourne `desert`, `snow`, `forest` ou `plains` |
| `getTerrainHeight(x,z)` | Hauteur du terrain par bruit multi-octave |
| `generateChunkTerrain(chunk)` | Remplit un chunk (biomes, ores, caves) |
| `_generateTrees(chunk)` | Arbres déterministes (trunk + leaves) |
| `loadChunk(cx,cz)` | Charge/génère un chunk + applique modifications sauvegardées |
| `updateChunks(px,pz)` | Load/unload dynamique autour du joueur |
| `generateInitial(cx,cz,onProgress)` | Génération initiale avec callback de progression |
| `raycast(origin,dir,maxDist)` | DDA voxel traversal pour sélection/interaction blocs |
| `getModifications()` | Retourne les blocs modifiés pour la sauvegarde |
| `setModifications(mods)` | Restaure les modifications depuis une sauvegarde |
| `modifiedBlocks` | `Map<string, BlockType>` — tracking des changements joueur |

#### `js/chunk.js` — Classe `Chunk`

| Élément | Détail |
|---------|--------|
| `CHUNK_SIZE` | 16 |
| `CHUNK_HEIGHT` | 128 |
| `blocks` | `Uint8Array(16 × 128 × 16)` |
| `buildMesh(world, solidMat, waterMat, scene)` | Génère les meshes avec face culling. Sépare solide et eau. |
| `dispose(scene)` | Nettoie les meshes de la scène |

#### `js/player.js` — Classe `Player`

| Élément | Détail |
|---------|--------|
| Physique | Gravité 28, saut 9, marche 4.5, sprint 7 |
| Dimensions | Hauteur 1.62 (yeux), corps 1.8, demi-largeur 0.28 |
| `update(dt)` | Mouvement WASD, physique, collision AABB, raycast target |
| `_breakBlock()` | Casse le bloc ciblé |
| `_placeBlock()` | Place le bloc sélectionné |
| `getDebugInfo()` | Retourne infos position/biome pour F3 |
| `keys` | Object — état des touches clavier |
| `isLocked` | Boolean — contrôles actifs quand `true` |

#### `js/blocks.js` — Types de blocs et propriétés

| Export | Détail |
|--------|--------|
| `BlockType` | Enum : AIR=0, GRASS=1, DIRT=2, STONE=3, SAND=4, WATER=5, OAK_LOG=6, LEAVES=7, SNOW=8, BEDROCK=9, COAL_ORE=10, IRON_ORE=11, PLANKS=12, COBBLESTONE=13, GLASS=14 |
| `FACES` | 6 faces avec direction, corners, UV |
| `HOTBAR_BLOCKS` | 9 blocs de la hotbar : [GRASS, DIRT, STONE, COBBLESTONE, PLANKS, OAK_LOG, SAND, GLASS, LEAVES] |
| `getBlockProps(type)` | Propriétés (solid, transparent, tex) |
| `isSolid(type)` | Test de solidité |
| `isTransparent(type)` | Test de transparence |
| `getTexture(type, face)` | Index texture pour une face |

#### `js/textures.js` — Atlas de textures procédurales

| Export | Détail |
|--------|--------|
| `TEX` | Enum des indices de texture (GRASS_TOP=0 ... GLASS=15) |
| `ATLAS_COLS / ATLAS_ROWS` | 4×4 = 16 textures de 16×16 pixels |
| `createTextureAtlas()` | Génère un canvas 64×64, retourne `{ texture, solidMaterial, waterMaterial, canvas, textureData }` |
| `getUV(texIdx, u, v)` | Calcule les UV pour un index de texture |

#### `js/noise.js` — Bruit de Perlin simplifié

| Export | Détail |
|--------|--------|
| `SimplexNoise` | Classe avec `noise2D(x,y)` et `noise3D(x,y,z)` |
| `fbm2D(noise,x,y,octaves,lacunarity,gain)` | Bruit fractal 2D |
| `fbm3D(noise,x,y,z,octaves,lacunarity,gain)` | Bruit fractal 3D |

#### `js/npc.js` — PNJ

| Export | Détail |
|--------|--------|
| `NPC` | Villageois box-model avec robe colorée, IA de wandering, step-up, évitement falaises, regarde le joueur |
| `NPCManager` | Gère max 8 NPCs, spawn/despawn par distance au joueur |

#### `js/touch.js` — Contrôles tactiles

| Export | Détail |
|--------|--------|
| `TouchControls` | Joystick virtuel (zone gauche), zone de look (zone droite), boutons action (sauter ⬆, casser ⛏, placer ◼), navigation hotbar (◀ ▶) |
| `isMobile` | Auto-détection mobile (user-agent + touch + largeur écran) |
| `dispose()` | Supprime l'UI tactile |

#### `js/save.js` — Système de sauvegarde

| Export | Détail |
|--------|--------|
| `SaveManager` | Classe statique, 5 slots (`mycraft_save_0` à `mycraft_save_4`) |
| `save(slot, gameData)` | Sauvegarde : position joueur, yaw/pitch, selectedSlot, timeOfDay, modifiedBlocks |
| `load(slot)` | Charge les données d'un slot |
| `delete(slot)` | Supprime un slot |
| `getAllSlots()` | Retourne les 5 slots (null si vide) |
| `hasAnySave()` | Vérifie s'il existe au moins une sauvegarde |
| `formatDate(iso)` | Formate une date ISO pour l'affichage |

---

## 4. Interface utilisateur (HTML/CSS)

### 4.1 Structure HTML (`index.html`)

| Section | ID | Rôle |
|---------|----|------|
| Menu principal | `#main-menu` | Fond animé canvas, titre, boutons (Continuer, Nouvelle Partie, Sauvegardes, Plein écran, Contrôles) |
| Écran de chargement | `#loading-screen` | Barre de progression + astuce aléatoire |
| UI de jeu | `#game-ui` | Crosshair, bouton ☰, hotbar, debug F3, vignette |
| Modale sauvegardes | `#save-modal` | 5 slots avec boutons sauver/charger/supprimer |
| Toast | `#toast` | Notification temporaire (2.5s) |

### 4.2 Boutons du menu

| ID | Texte | Comportement |
|----|-------|--------------|
| `#btn-continue` | ▶ Continuer | Visible si partie en cours → reprend le jeu |
| `#btn-new-game` | 🆕 Nouvelle Partie | Démarre une nouvelle partie (confirmation si partie en cours) |
| `#btn-saves` | 💾 Sauvegardes | Visible si partie en cours OU sauvegarde existante → ouvre modale |
| `#btn-fullscreen` | 📺 Plein écran | Bascule Fullscreen API |
| `#btn-controls` | 🎮 Contrôles | Affiche le panneau des contrôles clavier |
| `#btn-game-menu` | ☰ | En jeu, retour au menu principal |

### 4.3 Styles CSS (`css/style.css`)

| Section | Contenu |
|---------|---------|
| Menu principal | Fond animé, titre flottant, boutons avec hover/active, panneau contrôles |
| Chargement | Barre de progression verte, astuces animées |
| Game UI | Crosshair, hotbar avec preview textures, vignette, debug |
| Save modal | Overlay flou, slots avec boutons d'action colorés |
| Bouton ☰ | Fixé en haut à droite, semi-transparent |
| Toast | Notification animée en bas |
| Touch controls | Joystick, zone look, boutons action, nav hotbar |
| Responsive | Breakpoints `768px` et `480px` |

---

## 5. Systèmes de jeu

### 5.1 Cycle jour/nuit
- Durée : 600 secondes (10 minutes)
- Variable : `this.timeOfDay` (0.0 → 1.0)
- Affecte : couleur du ciel, intensité des lumières, visibilité des étoiles, couleur du soleil au coucher

### 5.2 Génération du terrain
- Bruit Simplex multi-octave pour la hauteur
- 4 biomes : désert, neige, forêt, plaines
- Caves : bruit 3D (seuil > 0.45)
- Minerais : charbon (y < 40), fer (y < 25)
- Arbres : placement déterministe par hash, tronc + feuillage

### 5.3 Chunks
- Taille : 16 × 128 × 16
- Chargement dynamique : rayon 6 chunks autour du joueur
- Déchargement : rayon 9 chunks
- Mesh : face culling, séparation solide/eau

### 5.4 Sauvegarde
- 5 slots dans `localStorage`
- Données sauvées : position joueur, rotation, bloc sélectionné, heure du jour, blocs modifiés
- Les modifications sont ré-appliquées lors du rechargement des chunks

### 5.5 Contrôles

**Desktop :**
| Touche | Action |
|--------|--------|
| WASD | Se déplacer |
| Espace | Sauter |
| Shift | Sprinter |
| Clic gauche | Casser un bloc |
| Clic droit | Placer un bloc |
| 1-9 | Sélectionner bloc dans la hotbar |
| F3 | Toggle debug info |
| ESC | Retour au menu principal |

**Mobile :**
| Zone/Bouton | Action |
|-------------|--------|
| Joystick gauche | Se déplacer |
| Zone droite (glisser) | Regarder autour |
| ⬆ | Sauter |
| ⛏ | Casser un bloc |
| ◼ | Placer un bloc |
| ◀ ▶ | Changer de bloc |
| ☰ | Menu |

---

## 6. Configuration serveur / DevContainer

- **Image Docker** : `mcr.microsoft.com/devcontainers/base:alpine-3.22`
- **Port** : 1234 (mappé via `runArgs: ["-p", "1234:1234"]`)
- **Démarrage auto** : `postStartCommand` lance `python3 -m http.server 1234 --bind 0.0.0.0`
- **Accès réseau** : accessible depuis n'importe quel poste via `http://<IP>:1234`

---

## 7. Bugs connus / Limitations

- Le Pointer Lock ne fonctionne pas dans les iframes (Simple Browser de VS Code) — tester dans un vrai navigateur
- Pas de persistance des chunks non modifiés (seules les modifications manuelles sont sauvées)
- Les NPC n'ont pas de collision joueur-NPC
- Pas de son (système audio non implémenté)
- Pas de crafting / inventaire étendu
- Pas de multijoueur

---

## 8. Idées d'améliorations futures

- [ ] Système de son (bruits de pas, cassage, placement)
- [ ] Inventaire étendu avec crafting
- [ ] Nouveaux types de blocs
- [ ] Biomes supplémentaires
- [ ] Mobs hostiles
- [ ] Multijoueur (WebSocket)
- [ ] Système de particules (cassage de bloc)
- [ ] Meilleur éclairage (ambient occlusion)

---

**Dernière mise à jour** : 10 mars 2026
