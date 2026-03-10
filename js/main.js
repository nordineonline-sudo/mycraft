// ============================================================
// MyCraft — Main entry point
// Menu, Scene, day/night, clouds, fog, water FX, pickaxe, NPCs
// ============================================================

import * as THREE from 'three';
import { createTextureAtlas, TEX } from './textures.js';
import { World } from './world.js';
import { Player } from './player.js';
import { HOTBAR_BLOCKS, getBlockProps } from './blocks.js';
import { NPCManager } from './npc.js';

// ── Loading tips ────────────────────────────────────────────
const TIPS = [
    '💡 Astuce : Utilisez Shift pour sprinter !',
    '💡 Astuce : Les grottes cachent des minerais précieux !',
    '💡 Astuce : Appuyez sur F3 pour voir les infos de debug.',
    '💡 Astuce : Explorez différents biomes : désert, neige, forêt !',
    '💡 Astuce : Clic droit pour placer un bloc.',
    '💡 Astuce : Les PNJ se promènent dans le monde !',
];

class Game {
    constructor() {
        this.clock = new THREE.Clock();
        this.timeOfDay = 0.25;
        this.dayDuration = 600;
        this.started = false;

        this._initMenu();
    }

    // ── Main Menu ───────────────────────────────────────────
    _initMenu() {
        this.mainMenu = document.getElementById('main-menu');
        const btnPlay = document.getElementById('btn-play');
        const btnControls = document.getElementById('btn-controls');
        const btnBack = document.getElementById('btn-back');
        const controlsPanel = document.getElementById('menu-controls-panel');
        const buttonsPanel = document.getElementById('menu-buttons');
        const titleDiv = document.getElementById('menu-title');

        btnPlay.addEventListener('click', () => {
            this.mainMenu.style.display = 'none';
            this._startGame();
        });

        btnControls.addEventListener('click', () => {
            buttonsPanel.style.display = 'none';
            titleDiv.style.display = 'none';
            controlsPanel.style.display = 'block';
        });

        btnBack.addEventListener('click', () => {
            controlsPanel.style.display = 'none';
            buttonsPanel.style.display = 'flex';
            titleDiv.style.display = 'block';
        });

        // Animate menu background
        this._animateMenuBG();

        // Spawn floating particles
        this._spawnMenuParticles();
    }

    _animateMenuBG() {
        const canvas = document.getElementById('menu-bg-canvas');
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const blocks = [];
        for (let i = 0; i < 60; i++) {
            blocks.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 6 + Math.random() * 20,
                speed: 0.2 + Math.random() * 0.6,
                opacity: 0.03 + Math.random() * 0.08,
                color: ['#4ecca3', '#45b7d1', '#6c5ce7', '#a29bfe', '#2d8a63'][Math.floor(Math.random() * 5)],
                rotation: Math.random() * Math.PI,
                rotSpeed: (Math.random() - 0.5) * 0.02,
            });
        }

        const draw = () => {
            if (!this.mainMenu || this.mainMenu.style.display === 'none') return;

            ctx.fillStyle = '#0a0a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Gradient overlay
            const grad = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, canvas.width * 0.6
            );
            grad.addColorStop(0, 'rgba(78, 204, 163, 0.05)');
            grad.addColorStop(1, 'rgba(10, 10, 26, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Floating blocks
            blocks.forEach(b => {
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(b.rotation);
                ctx.globalAlpha = b.opacity;
                ctx.fillStyle = b.color;
                ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size);
                ctx.restore();

                b.y -= b.speed;
                b.rotation += b.rotSpeed;
                if (b.y < -b.size) {
                    b.y = canvas.height + b.size;
                    b.x = Math.random() * canvas.width;
                }
            });

            requestAnimationFrame(draw);
        };
        draw();
    }

    _spawnMenuParticles() {
        const container = document.getElementById('menu-particles');
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.style.cssText = `
                position: absolute;
                width: ${2 + Math.random() * 4}px;
                height: ${2 + Math.random() * 4}px;
                background: rgba(78, 204, 163, ${0.2 + Math.random() * 0.3});
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: particleFloat ${5 + Math.random() * 10}s linear infinite;
                animation-delay: ${Math.random() * 5}s;
            `;
            container.appendChild(p);
        }

        // Add CSS animation dynamically
        if (!document.getElementById('particle-style')) {
            const style = document.createElement('style');
            style.id = 'particle-style';
            style.textContent = `
                @keyframes particleFloat {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(-100vh) translateX(${Math.random() * 40 - 20}px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ── Start Game ──────────────────────────────────────────
    async _startGame() {
        if (this.started) return;
        this.started = true;

        this._initRenderer();
        this._initScene();
        this._initUI();

        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.display = 'flex';

        // Random tip
        const tipEl = document.querySelector('#loading-tips .tip');
        tipEl.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];

        await this.start();
    }

    // ── Renderer Setup ─────────────────────────────────────
    _initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x87ceeb);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // ── Scene Setup ─────────────────────────────────────────
    _initScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 400);

        // Fog
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);

        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
        this.scene.add(this.ambientLight);

        // Directional light (sun) with shadows
        this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.sunLight.position.set(100, 100, 50);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 1024;
        this.sunLight.shadow.mapSize.height = 1024;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 200;
        this.sunLight.shadow.camera.left = -50;
        this.sunLight.shadow.camera.right = 50;
        this.sunLight.shadow.camera.top = 50;
        this.sunLight.shadow.camera.bottom = -50;
        this.sunLight.shadow.bias = -0.002;
        this.scene.add(this.sunLight);

        // Hemisphere light for sky/ground coloring
        this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x665544, 0.3);
        this.scene.add(this.hemiLight);

        // Stars for nighttime
        this._createStars();

        // Point light near player (torch effect)
        this.torchLight = new THREE.PointLight(0xffaa44, 0, 12);
        this.scene.add(this.torchLight);
    }

    // ── Stars ───────────────────────────────────────────────
    _createStars() {
        const starCount = 1500;
        const starGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const r = 350;
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.cos(phi);
            positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.2,
            transparent: true,
            opacity: 0,
            sizeAttenuation: false,
        });
        this.stars = new THREE.Points(starGeo, starMat);
        this.scene.add(this.stars);
    }

    // ── Pickaxe 3D Hand ─────────────────────────────────────
    _createPickaxe() {
        // Create a 3D pickaxe that renders on top as an overlay
        this.pickaxeScene = new THREE.Scene();
        this.pickaxeCamera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10);
        this.pickaxeCamera.position.set(0, 0, 0);

        // Ambient light for pickaxe
        const pAmbient = new THREE.AmbientLight(0xffffff, 0.7);
        this.pickaxeScene.add(pAmbient);
        const pDir = new THREE.DirectionalLight(0xffffff, 0.6);
        pDir.position.set(1, 1, 1);
        this.pickaxeScene.add(pDir);

        // Pickaxe group
        this.pickaxeGroup = new THREE.Group();

        // Handle (stick)
        const handleGeo = new THREE.BoxGeometry(0.04, 0.5, 0.04);
        const handleMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0, 0, 0);
        handle.rotation.z = Math.PI / 4;
        this.pickaxeGroup.add(handle);

        // Pickaxe head (T-shaped)
        const headGroup = new THREE.Group();

        // Main head block
        const headGeo = new THREE.BoxGeometry(0.28, 0.07, 0.06);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const headMesh = new THREE.Mesh(headGeo, headMat);
        headGroup.add(headMesh);

        // Left point
        const pointGeo = new THREE.BoxGeometry(0.07, 0.07, 0.06);
        const pointL = new THREE.Mesh(pointGeo, headMat.clone());
        pointL.material.color.setHex(0x777777);
        pointL.position.set(-0.16, -0.05, 0);
        headGroup.add(pointL);

        // Right point
        const pointR = new THREE.Mesh(pointGeo.clone(), headMat.clone());
        pointR.material.color.setHex(0x777777);
        pointR.position.set(0.16, -0.05, 0);
        headGroup.add(pointR);

        // Blue gem detail
        const gemGeo = new THREE.BoxGeometry(0.05, 0.04, 0.065);
        const gemMat = new THREE.MeshLambertMaterial({ color: 0x44aadd });
        const gem = new THREE.Mesh(gemGeo, gemMat);
        gem.position.set(0, 0.01, 0);
        headGroup.add(gem);

        headGroup.position.set(0.18, 0.18, 0);
        headGroup.rotation.z = Math.PI / 4;
        this.pickaxeGroup.add(headGroup);

        // Position the pickaxe in view
        this.pickaxeGroup.position.set(0.55, -0.45, -0.7);
        this.pickaxeGroup.rotation.set(0.1, -0.3, -0.3);

        this.pickaxeScene.add(this.pickaxeGroup);

        // Swing animation state
        this.pickaxeSwing = 0;
        this.pickaxeSwinging = false;
        this.pickaxeIdleBob = 0;
    }

    // ── UI Setup ────────────────────────────────────────────
    _initUI() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingBar = document.getElementById('loading-bar');
        this.loadingText = document.getElementById('loading-text');
        this.gameUI = document.getElementById('game-ui');
        this.pauseMenu = document.getElementById('pause-menu');
        this.debugInfo = document.getElementById('debug-info');
        this.showDebug = false;
    }

    // ── Start Game ──────────────────────────────────────────
    async start() {
        // Generate texture atlas
        this.loadingText.textContent = 'Génération des textures...';
        await this._delay(50);

        const atlas = createTextureAtlas();
        this.solidMaterial = atlas.solidMaterial;
        this.waterMaterial = atlas.waterMaterial;
        this.textureData = atlas.textureData;

        // Create world
        this.loadingText.textContent = 'Création du monde...';
        await this._delay(50);

        this.world = new World(this.scene, this.solidMaterial, this.waterMaterial);

        // Generate initial chunks with progress
        await this.world.generateInitial(8, 8, (progress) => {
            this.loadingBar.style.width = `${Math.floor(progress * 100)}%`;
            this.loadingText.textContent = `Génération du terrain... ${Math.floor(progress * 100)}%`;
        });

        // Create player
        this.loadingText.textContent = 'Invocation des PNJ...';
        await this._delay(50);

        const spawnY = this.world.getSpawnHeight(8, 8);
        this.player = new Player(this.camera, this.world);
        this.player.position.set(8, spawnY, 8);

        // Create NPCs
        this.npcManager = new NPCManager(this.world, this.scene);
        this.npcManager.spawnInitial(8, 8);

        // Create block highlight wireframe
        this._createHighlight();

        // Create clouds
        this._createClouds();

        // Create 3D pickaxe
        this._createPickaxe();

        // Build hotbar UI
        this._buildHotbar();

        // Setup pointer lock
        this._setupPointerLock();

        // Pickaxe swing on break
        this._setupPickaxeSwing();

        // Hide loading, show game
        this.loadingScreen.style.display = 'none';
        this.gameUI.style.display = 'block';
        this.pauseMenu.style.display = 'flex';

        // F3 debug toggle
        document.addEventListener('keydown', (e) => {
            if (e.code === 'F3') {
                e.preventDefault();
                this.showDebug = !this.showDebug;
                this.debugInfo.style.display = this.showDebug ? 'block' : 'none';
            }
        });

        // Start game loop
        this.clock.start();
        this._loop();
    }

    // ── Pickaxe Swing Trigger ───────────────────────────────
    _setupPickaxeSwing() {
        document.addEventListener('mousedown', (e) => {
            if (!this.player || !this.player.isLocked) return;
            if (e.button === 0) {
                this.pickaxeSwinging = true;
                this.pickaxeSwing = 0;
            }
        });
    }

    // ── Pointer Lock ────────────────────────────────────────
    _setupPointerLock() {
        const canvas = this.renderer.domElement;

        const requestLock = () => {
            canvas.requestPointerLock();
        };

        canvas.addEventListener('click', requestLock);
        this.pauseMenu.addEventListener('click', requestLock);

        document.addEventListener('pointerlockchange', () => {
            const locked = document.pointerLockElement === canvas;
            this.player.isLocked = locked;
            this.pauseMenu.style.display = locked ? 'none' : 'flex';
            document.body.style.cursor = locked ? 'none' : 'default';
        });
    }

    // ── Highlight Wireframe ────────────────────────────────
    _createHighlight() {
        const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
        const edges = new THREE.EdgesGeometry(geo);
        this.highlight = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1.5, transparent: true, opacity: 0.5 })
        );
        this.highlight.visible = false;
        this.scene.add(this.highlight);
    }

    // ── Clouds ──────────────────────────────────────────────
    _createClouds() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(size, size);

        const cn = this.world.noise;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const n = cn.noise2D(x * 0.015, y * 0.015)
                        + cn.noise2D(x * 0.03, y * 0.03) * 0.5;
                const alpha = n > 0.15 ? Math.min(200, (n - 0.15) * 350) : 0;
                const idx = (y * size + x) * 4;
                imgData.data[idx] = 255;
                imgData.data[idx + 1] = 255;
                imgData.data[idx + 2] = 255;
                imgData.data[idx + 3] = alpha;
            }
        }
        ctx.putImageData(imgData, 0, 0);

        const cloudTex = new THREE.CanvasTexture(canvas);
        cloudTex.wrapS = THREE.RepeatWrapping;
        cloudTex.wrapT = THREE.RepeatWrapping;

        const cloudGeo = new THREE.PlaneGeometry(800, 800);
        const cloudMat = new THREE.MeshBasicMaterial({
            map: cloudTex,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        this.clouds = new THREE.Mesh(cloudGeo, cloudMat);
        this.clouds.rotation.x = -Math.PI / 2;
        this.clouds.position.y = 100;
        this.scene.add(this.clouds);
    }

    // ── Hotbar UI ───────────────────────────────────────────
    _buildHotbar() {
        const hotbar = document.getElementById('hotbar');
        hotbar.innerHTML = '';

        HOTBAR_BLOCKS.forEach((blockType, idx) => {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot' + (idx === 0 ? ' selected' : '');

            const num = document.createElement('span');
            num.className = 'slot-number';
            num.textContent = idx + 1;
            slot.appendChild(num);

            // Create preview canvas from texture data
            const preview = document.createElement('canvas');
            preview.width = 16;
            preview.height = 16;
            const ctx = preview.getContext('2d');

            const props = getBlockProps(blockType);
            if (props.tex && this.textureData) {
                const texIdx = props.tex.top ?? props.tex.side;
                if (this.textureData[texIdx]) {
                    const imgData = new ImageData(
                        new Uint8ClampedArray(this.textureData[texIdx]),
                        16, 16
                    );
                    ctx.putImageData(imgData, 0, 0);
                }
            }
            slot.appendChild(preview);
            hotbar.appendChild(slot);
        });
    }

    _updateHotbar() {
        const slots = document.querySelectorAll('.hotbar-slot');
        slots.forEach((slot, idx) => {
            slot.classList.toggle('selected', idx === this.player.selectedSlot);
        });
    }

    // ── Water Animation ─────────────────────────────────────
    _updateWater(dt) {
        if (this.waterMaterial) {
            // Animate water opacity for a shimmering effect
            const t = this.clock.elapsedTime;
            this.waterMaterial.opacity = 0.5 + Math.sin(t * 1.5) * 0.08;
        }
    }

    // ── Day/Night Cycle ─────────────────────────────────────
    _updateDayNight(dt) {
        this.timeOfDay = (this.timeOfDay + dt / this.dayDuration) % 1;
        const t = this.timeOfDay;
        const sunAngle = t * Math.PI * 2 - Math.PI / 2;

        // Sun position
        this.sunLight.position.set(
            Math.cos(sunAngle) * 150,
            Math.sin(sunAngle) * 150,
            60
        );

        // Update shadow camera to follow player
        if (this.player) {
            this.sunLight.target.position.copy(this.player.position);
            this.sunLight.target.updateMatrixWorld();
        }

        const sunY = Math.sin(sunAngle);

        // Sky color interpolation
        const dayColor = new THREE.Color(0x87ceeb);
        const sunsetColor = new THREE.Color(0xe87040);
        const nightColor = new THREE.Color(0x0a0a2e);
        let skyColor;

        if (sunY > 0.25) {
            skyColor = dayColor;
        } else if (sunY > 0) {
            skyColor = sunsetColor.clone().lerp(dayColor, sunY / 0.25);
        } else if (sunY > -0.25) {
            skyColor = nightColor.clone().lerp(sunsetColor, (sunY + 0.25) / 0.25);
        } else {
            skyColor = nightColor;
        }

        this.renderer.setClearColor(skyColor);
        if (this.scene.fog) {
            this.scene.fog.color.copy(skyColor);
        }

        // Light intensities
        const dayFactor = Math.max(0, Math.min(1, (sunY + 0.2) / 0.7));
        this.sunLight.intensity = 0.1 + dayFactor * 0.75;
        this.ambientLight.intensity = 0.12 + dayFactor * 0.45;
        this.hemiLight.intensity = 0.08 + dayFactor * 0.25;

        // Tint sun light during sunset
        if (sunY > -0.1 && sunY < 0.2) {
            this.sunLight.color.setHex(0xffa050);
        } else {
            this.sunLight.color.setHex(0xffffff);
        }

        // Stars visibility
        if (this.stars) {
            const starOpacity = Math.max(0, Math.min(1, (-sunY - 0.05) * 4));
            this.stars.material.opacity = starOpacity;
            this.stars.position.copy(this.player.position);
        }

        // Torch light at night
        if (this.torchLight && this.player) {
            const nightFactor = 1 - dayFactor;
            this.torchLight.intensity = nightFactor * 1.5;
            this.torchLight.position.set(
                this.player.position.x,
                this.player.position.y + 1.5,
                this.player.position.z
            );
        }
    }

    // ── Update Pickaxe ──────────────────────────────────────
    _updatePickaxe(dt) {
        if (!this.pickaxeGroup) return;

        // Idle bobbing (synced with player walk)
        this.pickaxeIdleBob += dt * 2.5;
        const bobX = Math.sin(this.pickaxeIdleBob) * 0.01;
        const bobY = Math.sin(this.pickaxeIdleBob * 2) * 0.008;

        // Swing animation
        if (this.pickaxeSwinging) {
            this.pickaxeSwing += dt * 12;
            if (this.pickaxeSwing >= Math.PI) {
                this.pickaxeSwinging = false;
                this.pickaxeSwing = 0;
            }
        }

        const swingRotation = this.pickaxeSwinging
            ? Math.sin(this.pickaxeSwing) * -0.8
            : 0;

        this.pickaxeGroup.position.set(
            0.55 + bobX,
            -0.45 + bobY + (this.pickaxeSwinging ? Math.sin(this.pickaxeSwing) * 0.1 : 0),
            -0.7
        );
        this.pickaxeGroup.rotation.set(
            0.1 + swingRotation,
            -0.3,
            -0.3 + swingRotation * 0.3
        );
    }

    // ── Main Loop ───────────────────────────────────────────
    _loop() {
        requestAnimationFrame(() => this._loop());

        const dt = this.clock.getDelta();
        if (!this.player.isLocked) {
            this.renderer.render(this.scene, this.camera);
            // Render pickaxe overlay
            if (this.pickaxeScene) {
                this.renderer.autoClear = false;
                this.renderer.clearDepth();
                this.renderer.render(this.pickaxeScene, this.pickaxeCamera);
                this.renderer.autoClear = true;
            }
            return;
        }

        // Update player
        this.player.update(dt);

        // Update world chunks
        this.world.updateChunks(this.player.position.x, this.player.position.z);

        // Day/night cycle
        this._updateDayNight(dt);

        // Water animation
        this._updateWater(dt);

        // Update NPCs
        if (this.npcManager) {
            this.npcManager.update(dt, this.player.position);
        }

        // Update pickaxe animation
        this._updatePickaxe(dt);

        // Clouds drift
        if (this.clouds) {
            this.clouds.position.x = this.player.position.x + Math.sin(this.clock.elapsedTime * 0.3) * 20;
            this.clouds.position.z = this.player.position.z + this.clock.elapsedTime * 2;
        }

        // Block highlight
        if (this.player.targetBlock) {
            const [x, y, z] = this.player.targetBlock.pos;
            this.highlight.position.set(x + 0.5, y + 0.5, z + 0.5);
            this.highlight.visible = true;
        } else {
            this.highlight.visible = false;
        }

        // UI updates
        this._updateHotbar();

        if (this.showDebug) {
            const npcCount = this.npcManager ? this.npcManager.npcs.length : 0;
            this.debugInfo.textContent = this.player.getDebugInfo()
                + `\nPNJ: ${npcCount}`
                + `\nFPS: ${Math.round(1 / Math.max(dt, 0.001))}`;
        }

        // Render main scene
        this.renderer.render(this.scene, this.camera);

        // Render pickaxe overlay (on top)
        if (this.pickaxeScene) {
            this.renderer.autoClear = false;
            this.renderer.clearDepth();
            this.renderer.render(this.pickaxeScene, this.pickaxeCamera);
            this.renderer.autoClear = true;
        }
    }

    _delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
}

// ── Launch ──────────────────────────────────────────────────
const game = new Game();
