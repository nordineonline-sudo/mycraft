# MyCraft

Petit moteur de type voxel inspiré par Minecraft, écrit en JavaScript + Three.js.

## Ce que j'ai ajouté
- Menu principal stylisé (`index.html`, `css/style.css`) avec fond animé.
- Effets de lumière : ombres, étoiles la nuit, lumière type torche.
- Effets d'eau : opacité animée pour scintillement.
- Pioche 3D visible dans la main du joueur avec animation de swing.
- PNJ simples qui se promènent (`js/npc.js`).
- UI améliorée : hotbar, vignette, crosshair, écran de chargement.

## Structure importante
- `index.html` — entrée, menu et import des modules.
- `css/style.css` — styles UI et menu.
- `js/main.js` — logique principale (menu, scène, loop, pickaxe, NPC manager).
- `js/world.js`, `js/chunk.js`, `js/blocks.js`, `js/textures.js`, `js/noise.js` — moteur voxel.
- `js/player.js` — contrôles et physique du joueur.
- `js/npc.js` — PNJ (nouveau).

## Exécuter localement
1. Depuis le dossier du projet :

```bash
cd /workspaces/mycraft
python3 -m http.server 1234 --bind 0.0.0.0
```

2. Ouvrir dans un navigateur : `http://localhost:1234` (ou `http://<IP-de-la-machine>:1234` depuis un autre poste sur le même réseau).

## Devcontainer
- Le fichier ` .devcontainer/devcontainer.json` expose le port `1234` et lance le serveur via `postStartCommand`.
- Si vous utilisez VS Code, reconstruisez le conteneur : `Ctrl+Shift+P` → *Dev Containers: Rebuild Container*.

## Git & GitHub — push (si vous voulez que je pousse pour vous)
Si le dépôt local n'a pas de remote, ajoutez votre remote puis poussez :

```bash
cd /workspaces/mycraft
git remote add origin <URL_DU_REPO>
git push -u origin $(git rev-parse --abbrev-ref HEAD)
```

Si vous me fournissez l'URL du dépôt, je peux ajouter le remote et effectuer le push pour vous.

## Notes
- Le projet est léger et fonctionne sans dépendances externes (Three.js est chargé via CDN dans `index.html`).
- Pour tests plus avancés (build, bundling), on peut ajouter un `package.json` et un bundler (esbuild/rollup).

---

Si vous voulez, je peux maintenant :
- Ajouter le remote et pousser automatiquement si vous me donnez l'URL, ou
- Créer un `package.json` + script de dev pour lancer un serveur plus robuste, ou
- Ajuster le visuel des PNJ / pioche selon vos préférences.
