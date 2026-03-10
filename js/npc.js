// ============================================================
// NPC — Simple villager-like NPCs that wander the world
// ============================================================

import * as THREE from 'three';
import { isSolid, BlockType } from './blocks.js';

const NPC_SPEED = 1.5;
const NPC_GRAVITY = 20;
const NPC_COLORS = [
    { body: 0x8B4513, head: 0xFFDBAC, robe: 0x9B7653 }, // Villager brown
    { body: 0x2E5E2E, head: 0xFFDBAC, robe: 0x4A7A4A }, // Green robe
    { body: 0x4A3080, head: 0xFFDBAC, robe: 0x6A50A0 }, // Purple robe
    { body: 0x8B2020, head: 0xFFDBAC, robe: 0xAB4040 }, // Red robe
    { body: 0x1E3A5F, head: 0xFFDBAC, robe: 0x3E5A7F }, // Blue robe
];

export class NPC {
    constructor(world, scene, x, y, z, colorIdx = 0) {
        this.world = world;
        this.scene = scene;

        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.onGround = false;

        // Wandering AI
        this.walkDir = new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize();
        this.walkTimer = 2 + Math.random() * 5;
        this.idleTimer = 0;
        this.isIdle = false;
        this.targetYaw = Math.atan2(this.walkDir.x, this.walkDir.y);
        this.currentYaw = this.targetYaw;

        // Animation
        this.walkPhase = Math.random() * Math.PI * 2;
        this.headBob = 0;

        // Build the NPC mesh
        const colors = NPC_COLORS[colorIdx % NPC_COLORS.length];
        this.group = this._buildModel(colors);
        this.group.position.copy(this.position);
        this.scene.add(this.group);
    }

    _buildModel(colors) {
        const group = new THREE.Group();

        // Body (robe)
        const bodyGeo = new THREE.BoxGeometry(0.5, 0.75, 0.35);
        const bodyMat = new THREE.MeshLambertMaterial({ color: colors.robe });
        this.body = new THREE.Mesh(bodyGeo, bodyMat);
        this.body.position.y = 0.65;
        this.body.castShadow = true;
        group.add(this.body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const headMat = new THREE.MeshLambertMaterial({ color: colors.head });
        this.head = new THREE.Mesh(headGeo, headMat);
        this.head.position.y = 1.25;
        this.head.castShadow = true;
        group.add(this.head);

        // Nose
        const noseGeo = new THREE.BoxGeometry(0.1, 0.15, 0.12);
        const noseMat = new THREE.MeshLambertMaterial({ color: 0xDDB896 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, 1.2, 0.25);
        group.add(nose);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.02);
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.1, 1.3, 0.2);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.1, 1.3, 0.2);
        group.add(rightEye);

        // Left arm
        const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.25);
        const armMat = new THREE.MeshLambertMaterial({ color: colors.body });
        this.leftArm = new THREE.Mesh(armGeo, armMat);
        this.leftArm.position.set(-0.35, 0.7, 0);
        this.leftArm.geometry.translate(0, 0.325, 0);
        this.leftArm.position.y = 0.7;
        group.add(this.leftArm);

        // Right arm
        this.rightArm = new THREE.Mesh(armGeo, armMat.clone());
        this.rightArm.position.set(0.35, 0.7, 0);
        this.rightArm.geometry = armGeo.clone();
        this.rightArm.geometry.translate(0, 0.325, 0);
        this.rightArm.position.y = 0.7;
        group.add(this.rightArm);

        // Left leg
        const legGeo = new THREE.BoxGeometry(0.22, 0.5, 0.25);
        const legMat = new THREE.MeshLambertMaterial({ color: colors.body });
        this.leftLeg = new THREE.Mesh(legGeo, legMat);
        this.leftLeg.geometry.translate(0, -0.25, 0);
        this.leftLeg.position.set(-0.13, 0.28, 0);
        group.add(this.leftLeg);

        // Right leg
        this.rightLeg = new THREE.Mesh(legGeo.clone(), legMat.clone());
        this.rightLeg.geometry.translate(0, -0.25, 0);
        this.rightLeg.position.set(0.13, 0.28, 0);
        group.add(this.rightLeg);

        return group;
    }

    update(dt, playerPos) {
        dt = Math.min(dt, 0.05);

        // AI: alternate between walking and idling
        if (this.isIdle) {
            this.idleTimer -= dt;
            if (this.idleTimer <= 0) {
                this.isIdle = false;
                this.walkTimer = 2 + Math.random() * 6;
                // Pick a new random direction, sometimes toward the player
                if (playerPos && this.position.distanceTo(playerPos) < 30 && Math.random() > 0.5) {
                    // Walk toward player
                    const toPlayer = new THREE.Vector2(
                        playerPos.x - this.position.x,
                        playerPos.z - this.position.z
                    ).normalize();
                    this.walkDir.set(toPlayer.x, toPlayer.y);
                } else {
                    const angle = Math.random() * Math.PI * 2;
                    this.walkDir.set(Math.cos(angle), Math.sin(angle));
                }
                this.targetYaw = Math.atan2(this.walkDir.x, this.walkDir.y);
            }
        } else {
            this.walkTimer -= dt;
            if (this.walkTimer <= 0) {
                this.isIdle = true;
                this.idleTimer = 1 + Math.random() * 4;
            }
        }

        // Smooth yaw rotation
        let yawDiff = this.targetYaw - this.currentYaw;
        while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
        this.currentYaw += yawDiff * Math.min(1, dt * 5);

        // Movement
        if (!this.isIdle) {
            this.velocity.x = this.walkDir.x * NPC_SPEED;
            this.velocity.z = this.walkDir.y * NPC_SPEED;
        } else {
            this.velocity.x = 0;
            this.velocity.z = 0;
        }

        // Gravity
        this.velocity.y -= NPC_GRAVITY * dt;

        // Apply movement with simple collision
        this._move(dt);

        // Try to step up 1-block obstacles
        if (!this.isIdle) {
            const frontX = Math.floor(this.position.x + this.walkDir.x * 0.4);
            const frontZ = Math.floor(this.position.z + this.walkDir.y * 0.4);
            const footY = Math.floor(this.position.y);
            const blockAhead = this.world.getBlock(frontX, footY, frontZ);
            const blockAbove = this.world.getBlock(frontX, footY + 1, frontZ);
            const blockAbove2 = this.world.getBlock(frontX, footY + 2, frontZ);

            if (isSolid(blockAhead) && !isSolid(blockAbove) && !isSolid(blockAbove2) && this.onGround) {
                // Step up
                this.velocity.y = 7;
                this.onGround = false;
            } else if (isSolid(blockAhead) && isSolid(blockAbove)) {
                // Turn around
                const angle = Math.random() * Math.PI * 2;
                this.walkDir.set(Math.cos(angle), Math.sin(angle));
                this.targetYaw = Math.atan2(this.walkDir.x, this.walkDir.y);
            }
        }

        // Avoid falling off cliffs
        if (!this.isIdle && this.onGround) {
            const aheadX = Math.floor(this.position.x + this.walkDir.x * 1.2);
            const aheadZ = Math.floor(this.position.z + this.walkDir.y * 1.2);
            const groundY = Math.floor(this.position.y) - 1;
            const groundBlock = this.world.getBlock(aheadX, groundY, aheadZ);
            const groundBlock2 = this.world.getBlock(aheadX, groundY - 1, aheadZ);
            if (!isSolid(groundBlock) && !isSolid(groundBlock2)) {
                // Cliff detected, turn around
                this.walkDir.negate();
                this.targetYaw = Math.atan2(this.walkDir.x, this.walkDir.y);
            }
        }

        // Animation
        if (!this.isIdle) {
            this.walkPhase += dt * 8;
            const swing = Math.sin(this.walkPhase) * 0.5;
            this.leftArm.rotation.x = swing;
            this.rightArm.rotation.x = -swing;
            this.leftLeg.rotation.x = -swing;
            this.rightLeg.rotation.x = swing;
            this.headBob = Math.sin(this.walkPhase * 2) * 0.02;
        } else {
            // Idle animation (gentle breathing)
            this.walkPhase += dt * 1.5;
            this.leftArm.rotation.x *= 0.9;
            this.rightArm.rotation.x *= 0.9;
            this.leftLeg.rotation.x *= 0.9;
            this.rightLeg.rotation.x *= 0.9;
            this.headBob = Math.sin(this.walkPhase) * 0.01;
        }

        // Look at player when nearby and idle
        if (this.isIdle && playerPos && this.position.distanceTo(playerPos) < 8) {
            const toPlayer = new THREE.Vector2(
                playerPos.x - this.position.x,
                playerPos.z - this.position.z
            );
            this.targetYaw = Math.atan2(toPlayer.x, toPlayer.y);
        }

        // Update mesh
        this.group.position.copy(this.position);
        this.group.position.y += this.headBob;
        this.group.rotation.y = this.currentYaw;
        this.head.position.y = 1.25 + this.headBob;
    }

    _move(dt) {
        const hw = 0.2;
        const h = 1.6;
        const pos = this.position;

        // X
        pos.x += this.velocity.x * dt;
        if (this._collides(pos, hw, h)) {
            pos.x -= this.velocity.x * dt;
            this.velocity.x = 0;
        }

        // Y
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

        // Z
        pos.z += this.velocity.z * dt;
        if (this._collides(pos, hw, h)) {
            pos.z -= this.velocity.z * dt;
            this.velocity.z = 0;
        }

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

    dispose() {
        this.scene.remove(this.group);
        this.group.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
    }
}

export class NPCManager {
    constructor(world, scene) {
        this.world = world;
        this.scene = scene;
        this.npcs = [];
        this.maxNPCs = 8;
        this.spawnRadius = 40;
        this.despawnRadius = 80;
    }

    spawnInitial(playerX, playerZ) {
        for (let i = 0; i < this.maxNPCs; i++) {
            this._spawnNear(playerX, playerZ, i);
        }
    }

    _spawnNear(px, pz, colorIdx) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 10 + Math.random() * this.spawnRadius;
        const x = px + Math.cos(angle) * dist;
        const z = pz + Math.sin(angle) * dist;
        const y = this.world.getTerrainHeight(Math.floor(x), Math.floor(z)) + 1;

        // Don't spawn underwater
        if (y <= 33) return;

        const npc = new NPC(this.world, this.scene, x, y, z, colorIdx);
        this.npcs.push(npc);
    }

    update(dt, playerPos) {
        // Update existing NPCs
        for (let i = this.npcs.length - 1; i >= 0; i--) {
            const npc = this.npcs[i];
            const dist = npc.position.distanceTo(playerPos);

            // Despawn if too far
            if (dist > this.despawnRadius) {
                npc.dispose();
                this.npcs.splice(i, 1);
                continue;
            }

            npc.update(dt, playerPos);
        }

        // Spawn new NPCs if needed
        if (this.npcs.length < this.maxNPCs && Math.random() < 0.005) {
            this._spawnNear(playerPos.x, playerPos.z, Math.floor(Math.random() * NPC_COLORS.length));
        }
    }

    dispose() {
        this.npcs.forEach(npc => npc.dispose());
        this.npcs = [];
    }
}
