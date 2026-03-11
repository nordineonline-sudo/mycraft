# GitHub Copilot / AI Agent Instructions — MyCraft

Purpose: give an AI coding agent the immediate, actionable knowledge to be productive in this repo.

- **Big picture**: This is a client-side, vanilla ES module web app (no bundler). Entry is `index.html` which loads `js/main.js` as a module and Three.js via an `importmap` CDN. The app is a small Minecraft-like voxel engine: `main.js` orchestrates UI, game loop and rendering; `world.js` handles procedural terrain and chunk management; `chunk.js` stores block arrays and builds meshes; `player.js` handles camera and controls.

- **How to run locally (fast)**:
  - Start a static server from project root:

    ```bash
    python3 -m http.server 1234 --bind 0.0.0.0
    # then open http://localhost:1234
    ```

  - VS Code DevContainer is provided and will auto-start the server on port 1234.

- **No build step / runtime notes**:
  - Uses native ES modules + importmap to load Three.js from CDN.
  - There is no bundler; change files directly and reload the browser.

- **Key files to inspect and modify**:
  - `index.html` — UI skeleton, controls, and importmap.
  - `js/main.js` — `Game` class: menu, loading, scene init, game loop, UI hooks.
  - `js/world.js` — `World` class: terrain generation, biomes, chunk loading, `generateInitial()` and `updateChunks()`.
  - `js/chunk.js` — chunk storage (typed arrays) and mesh building; constants like `CHUNK_SIZE` and `CHUNK_HEIGHT` live here.
  - `js/blocks.js` — block IDs, `isSolid()` and block properties used across world & rendering.
  - `js/textures.js` — procedural texture atlas generator; used when creating materials.
  - `js/save.js` — `SaveManager` uses `localStorage` and exposes `SLOT_COUNT` and helpers used by `main.js`.
  - `js/touch.js` — mobile/touch control implementation; helpful for mobile-specific changes.

- **Important runtime patterns & conventions (do not change lightly)**:
  - Deterministic generation: `World` uses seeded `SimplexNoise` instances (seed offsets for biome/cave/tree). Keep deterministic math intact when changing generation logic.
  - Chunk boundary handling: when `World.setBlock()` mutates a boundary block it rebuilds neighbor chunk meshes (`_rebuildChunk`). Always call `chunk.buildMesh()` after block changes.
  - Modifications tracking: `World.modifiedBlocks` stores player edits keyed by `x,y,z` — used by `SaveManager` to persist changes. When importing saves, call `world.setModifications()` prior to building meshes.
  - Raycasting: `World.raycast()` performs a DDA voxel traversal; return shape is `{ pos: [x,y,z], normal: [nx,ny,nz], block }` or `null`.

- **Constants & tuning knobs** (quick places to change behavior):
  - Render distance / chunk radius — `RENDER_DISTANCE` in `js/world.js`.
  - Base terrain height, water level — `BASE_HEIGHT`, `WATER_LEVEL` in `js/world.js`.
  - Day/night duration — `dayDuration` on `Game` in `js/main.js`.

- **Testing & debugging**:
  - There are no automated tests; debug by running the server and using the in-game `F3` overlay and console logs.
  - Pointer lock / input differences: desktop uses Pointer Lock; mobile uses `TouchControls`. Check `main.js` for pointer lock flows and `touch.js` for mobile event handling.

- **Editor / formatting / commits**:
  - Code uses modern ES style and simple formatting — keep changes minimal and follow local style.
  - If updating generation or save formats, also update `PLAN.md` and `README.md`.

- **Where to look for more context**:
  - [PLAN.md](../PLAN.md) — project plan and long-form notes (recommended read before major changes).
  - `.github/workflows/docker-publish.yml` — CI/deployment hints.

If anything in these instructions is unclear or you want additional examples (e.g., how to add a new block type and ensure it appears in mesh + save system), tell me which area to expand. 

================================================
## 1. SÉQUENCE OBLIGATOIRE DE RÉPONSE
================================================

À chaque demande utilisateur, tu dois impérativement respecter cet ordre :

### 1. Reformulation du besoin
- Tu commences toujours par reformuler le prompt utilisateur :
  - corrigé
  - clarifié
  - synthétisé
- Cette reformulation est présentée dans un bloc de code.

### 2. Plan de développement
- Tu proposes ensuite un plan structuré incluant :
  - les étapes principales,
  - les hypothèses,
  - les livrables attendus.

### 3. Phase d'interrogation (si nécessaire)
- Tu peux poser des questions sous forme de QCM :
  - Choix A, B, C, D
  - Si sous-choix numérotés comme suit : A1, A2, B1, B2, etc.
- Objectif : lever toute ambiguïté avant implémentation.

### 4. Demande de confirmation
- Tu résumes ce que tu vas réaliser.
- Tu demandes explicitement une validation :
  **Confirmation : oui (ok) / non (no)**

**Aucune génération finale n'est autorisée sans confirmation explicite.**
================================================
commandes automatisées
================================================

- **!refactor** : propose une refactorisation du code existant.
- **!optimize** : suggère des optimisations de performance.
- **comit** : 
  - 1. met à jout les fichiers README.md et PLAN.md avec les changements apportés.
  - 2. génère un message de commit clair et descriptif.
  - 3. crée un commit avec les changements et le message généré.
  - 4. pousse le commit sur la branche distante.
  