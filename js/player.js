// ============================================================
// Player — FPS camera, movement, physics, block interaction
// ============================================================

import * as THREE from 'three';
import { BlockType, isSolid, HOTBAR_BLOCKS } from './blocks.js';

const GRAVITY = 28;
const JUMP_VELOCITY = 9;
const WALK_SPEED = 4.5;
const SPRINT_SPEED = 7;
const MOUSE_SENSITIVITY = 0.002;
const PLAYER_HEIGHT = 1.62;
const PLAYER_BODY_HEIGHT = 1.8;
const PLAYER_HALF_WIDTH = 0.28;

export class Player {
    constructor(camera, world) {
        this.camera = camera;
        this.world = world;

        this.position = new THREE.Vector3(8, 60, 8);
        this.velocity = new THREE.Vector3();
        this.yaw = 0;
        this.pitch = 0;
        this.onGround = false;

        this.keys = {};
        this.isLocked = false;

        // Block interaction
        this.selectedSlot = 0;
        this.breakCooldown = 0;
        this.placeCooldown = 0;

        // Target block highlight
        this.targetBlock = null;

        this._bindEvents();
    }

    // ── Input Binding ───────────────────────────────────────
    _bindEvents() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            // Hotbar selection
            if (e.code >= 'Digit1' && e.code <= 'Digit9') {
                this.selectedSlot = parseInt(e.code.charAt(5)) - 1;
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isLocked) return;
            this.yaw -= e.movementX * MOUSE_SENSITIVITY;
            this.pitch -= e.movementY * MOUSE_SENSITIVITY;
            this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
        });

        document.addEventListener('mousedown', (e) => {
            if (!this.isLocked) return;
            if (e.button === 0) this._breakBlock();
            if (e.button === 2) this._placeBlock();
        });

        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // ── Camera Direction ────────────────────────────────────
    getForward() {
        return new THREE.Vector3(
            -Math.sin(this.yaw),
            0,
            -Math.cos(this.yaw)
        ).normalize();
    }

    getRight() {
        return new THREE.Vector3(
            Math.cos(this.yaw),
            0,
            -Math.sin(this.yaw)
        ).normalize();
    }

    getLookDirection() {
        return new THREE.Vector3(
            -Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            -Math.cos(this.yaw) * Math.cos(this.pitch)
        ).normalize();
    }

    // ── Update ──────────────────────────────────────────────
    update(dt) {
        dt = Math.min(dt, 0.05); // Cap delta time

        // Movement input
        const forward = this.getForward();
        const right = this.getRight();
        const isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
        const speed = isSprinting ? SPRINT_SPEED : WALK_SPEED;

        const moveDir = new THREE.Vector3();
        if (this.keys['KeyW']) moveDir.add(forward);
        if (this.keys['KeyS']) moveDir.sub(forward);
        if (this.keys['KeyD']) moveDir.add(right);
        if (this.keys['KeyA']) moveDir.sub(right);

        if (moveDir.length() > 0) {
            moveDir.normalize().multiplyScalar(speed);
        }

        this.velocity.x = moveDir.x;
        this.velocity.z = moveDir.z;

        // Jump
        if (this.keys['Space'] && this.onGround) {
            this.velocity.y = JUMP_VELOCITY;
            this.onGround = false;
        }

        // Gravity
        this.velocity.y -= GRAVITY * dt;

        // Apply velocity with collision detection (axis by axis)
        this._moveWithCollision(dt);

        // Update camera
        this.camera.position.set(
            this.position.x,
            this.position.y + PLAYER_HEIGHT,
            this.position.z
        );

        // Build camera rotation from yaw and pitch
        const quat = new THREE.Quaternion();
        const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
        quat.setFromEuler(euler);
        this.camera.quaternion.copy(quat);

        // Update target block
        this._updateTarget();

        // Cooldowns
        if (this.breakCooldown > 0) this.breakCooldown -= dt;
        if (this.placeCooldown > 0) this.placeCooldown -= dt;
    }

    // ── Collision Detection & Resolution ───────────────────
    _moveWithCollision(dt) {
        const hw = PLAYER_HALF_WIDTH;
        const h = PLAYER_BODY_HEIGHT;
        const pos = this.position;

        // X axis
        pos.x += this.velocity.x * dt;
        if (this._collides(pos, hw, h)) {
            if (this.velocity.x > 0)
                pos.x = Math.floor(pos.x + hw) - hw - 0.001;
            else
                pos.x = Math.ceil(pos.x - hw) + hw + 0.001;
            this.velocity.x = 0;
        }

        // Y axis
        pos.y += this.velocity.y * dt;
        if (this._collides(pos, hw, h)) {
            if (this.velocity.y < 0) {
                pos.y = Math.floor(pos.y) + 1.0;
                this.onGround = true;
            } else {
                pos.y = Math.floor(pos.y + h) - h;
            }
            this.velocity.y = 0;
        } else {
            this.onGround = false;
        }

        // Z axis
        pos.z += this.velocity.z * dt;
        if (this._collides(pos, hw, h)) {
            if (this.velocity.z > 0)
                pos.z = Math.floor(pos.z + hw) - hw - 0.001;
            else
                pos.z = Math.ceil(pos.z - hw) + hw + 0.001;
            this.velocity.z = 0;
        }

        // Floor clamp
        if (pos.y < 1) {
            pos.y = 1;
            this.velocity.y = 0;
            this.onGround = true;
        }
    }

    _collides(pos, hw, h) {
        const minX = Math.floor(pos.x - hw);
        const maxX = Math.floor(pos.x + hw);
        const minY = Math.floor(pos.y);
        const maxY = Math.floor(pos.y + h - 0.01);
        const minZ = Math.floor(pos.z - hw);
        const maxZ = Math.floor(pos.z + hw);

        for (let bx = minX; bx <= maxX; bx++)
            for (let by = minY; by <= maxY; by++)
                for (let bz = minZ; bz <= maxZ; bz++) {
                    const block = this.world.getBlock(bx, by, bz);
                    if (isSolid(block)) return true;
                }

        return false;
    }

    // ── Block Interaction ───────────────────────────────────
    _updateTarget() {
        const origin = new THREE.Vector3(
            this.position.x,
            this.position.y + PLAYER_HEIGHT,
            this.position.z
        );
        const dir = this.getLookDirection();
        this.targetBlock = this.world.raycast(origin, dir, 7);
    }

    _breakBlock() {
        if (this.breakCooldown > 0) return;
        if (!this.targetBlock) return;

        const [x, y, z] = this.targetBlock.pos;
        if (this.world.getBlock(x, y, z) === BlockType.BEDROCK) return;

        this.world.setBlock(x, y, z, BlockType.AIR);
        this.breakCooldown = 0.2;
        this._playSound(200, 0.08, 'square');
    }

    _placeBlock() {
        if (this.placeCooldown > 0) return;
        if (!this.targetBlock) return;

        const [bx, by, bz] = this.targetBlock.pos;
        const [nx, ny, nz] = this.targetBlock.normal;
        const px = bx + nx;
        const py = by + ny;
        const pz = bz + nz;

        // Don't place inside the player
        const hw = PLAYER_HALF_WIDTH;
        const playerMinX = this.position.x - hw;
        const playerMaxX = this.position.x + hw;
        const playerMinY = this.position.y;
        const playerMaxY = this.position.y + PLAYER_BODY_HEIGHT;
        const playerMinZ = this.position.z - hw;
        const playerMaxZ = this.position.z + hw;

        if (px + 1 > playerMinX && px < playerMaxX &&
            py + 1 > playerMinY && py < playerMaxY &&
            pz + 1 > playerMinZ && pz < playerMaxZ) {
            return;
        }

        if (this.world.getBlock(px, py, pz) === BlockType.AIR ||
            this.world.getBlock(px, py, pz) === BlockType.WATER) {
            const blockType = HOTBAR_BLOCKS[this.selectedSlot] || BlockType.DIRT;
            this.world.setBlock(px, py, pz, blockType);
            this.placeCooldown = 0.2;
            this._playSound(350, 0.06, 'triangle');
        }
    }

    // ── Simple Procedural Sound ─────────────────────────────
    _playSound(freq, duration, type = 'square') {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.3, ctx.currentTime + duration);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch (e) { /* Audio not available */ }
    }

    // ── Debug Info ──────────────────────────────────────────
    getDebugInfo() {
        const p = this.position;
        const biome = this.world.getBiome(Math.floor(p.x), Math.floor(p.z));
        return [
            `Pos: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`,
            `Chunk: ${Math.floor(p.x / 16)}, ${Math.floor(p.z / 16)}`,
            `Biome: ${biome}`,
            `Ground: ${this.onGround}`,
            `Chunks loaded: ${this.world.chunks.size}`,
        ].join('\n');
    }
}
