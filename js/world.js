// ============================================================
// World — Terrain generation, biomes, caves, trees, chunks
// ============================================================

import { SimplexNoise, fbm2D, fbm3D } from './noise.js';
import { BlockType, isSolid } from './blocks.js';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './chunk.js';

const BASE_HEIGHT = 38;
const WATER_LEVEL = 32;
const RENDER_DISTANCE = 6;

export class World {
    constructor(scene, solidMaterial, waterMaterial, seed = 98765) {
        this.scene = scene;
        this.solidMaterial = solidMaterial;
        this.waterMaterial = waterMaterial;
        this.chunks = new Map();
        this.noise = new SimplexNoise(seed);
        this.noiseBiome = new SimplexNoise(seed + 100);
        this.noiseCave = new SimplexNoise(seed + 200);
        this.noiseTree = new SimplexNoise(seed + 300);
        this.renderDistance = RENDER_DISTANCE;
        this._treePositions = new Map(); // cache per chunk
        this.modifiedBlocks = new Map(); // track player modifications for save/load
    }

    // ── Coordinate Helpers ──────────────────────────────────
    static chunkCoord(w) { return Math.floor(w / CHUNK_SIZE); }
    static localCoord(w) { return ((w % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE; }
    static chunkKey(cx, cz) { return `${cx},${cz}`; }

    // ── Block Access (world coords) ─────────────────────────
    getBlock(x, y, z) {
        if (y < 0 || y >= CHUNK_HEIGHT) return BlockType.AIR;
        const cx = World.chunkCoord(x);
        const cz = World.chunkCoord(z);
        const chunk = this.chunks.get(World.chunkKey(cx, cz));
        if (!chunk) return BlockType.AIR;
        return chunk.getBlock(World.localCoord(x), y, World.localCoord(z));
    }

    setBlock(x, y, z, type) {
        if (y < 0 || y >= CHUNK_HEIGHT) return;
        const cx = World.chunkCoord(x);
        const cz = World.chunkCoord(z);
        const key = World.chunkKey(cx, cz);
        const chunk = this.chunks.get(key);
        if (!chunk) return;
        const lx = World.localCoord(x);
        const lz = World.localCoord(z);
        chunk.setBlock(lx, y, lz, type);
        // Track modification for save system
        this.modifiedBlocks.set(`${x},${y},${z}`, type);
        chunk.buildMesh(this, this.solidMaterial, this.waterMaterial, this.scene);

        // Rebuild neighbors if block is on boundary
        if (lx === 0) this._rebuildChunk(cx - 1, cz);
        if (lx === CHUNK_SIZE - 1) this._rebuildChunk(cx + 1, cz);
        if (lz === 0) this._rebuildChunk(cx, cz - 1);
        if (lz === CHUNK_SIZE - 1) this._rebuildChunk(cx, cz + 1);
    }

    _rebuildChunk(cx, cz) {
        const chunk = this.chunks.get(World.chunkKey(cx, cz));
        if (chunk) chunk.buildMesh(this, this.solidMaterial, this.waterMaterial, this.scene);
    }

    // ── Biome ──────────────────────────────────────────────
    getBiome(x, z) {
        const temp = this.noiseBiome.noise2D(x * 0.004, z * 0.004);
        const humid = this.noiseBiome.noise2D(x * 0.004 + 500, z * 0.004 + 500);

        if (temp > 0.3) return 'desert';
        if (temp < -0.35) return 'snow';
        if (humid > 0.1) return 'forest';
        return 'plains';
    }

    // ── Terrain Height ─────────────────────────────────────
    getTerrainHeight(x, z) {
        const n = this.noise;
        let h = 0;
        h += n.noise2D(x * 0.008, z * 0.008) * 22;
        h += n.noise2D(x * 0.025, z * 0.025) * 10;
        h += n.noise2D(x * 0.06,  z * 0.06)  * 4;
        h += n.noise2D(x * 0.12,  z * 0.12)  * 2;
        return Math.floor(BASE_HEIGHT + h);
    }

    // ── Terrain Generation ─────────────────────────────────
    generateChunkTerrain(chunk) {
        const cx = chunk.cx;
        const cz = chunk.cz;
        const wx = cx * CHUNK_SIZE;
        const wz = cz * CHUNK_SIZE;

        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                const x = wx + lx;
                const z = wz + lz;
                const height = this.getTerrainHeight(x, z);
                const biome = this.getBiome(x, z);

                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    let block = BlockType.AIR;

                    if (y === 0) {
                        block = BlockType.BEDROCK;
                    } else if (y < height - 4) {
                        block = BlockType.STONE;

                        // Ore generation
                        if (y < 40) {
                            const oreVal = this.noiseCave.noise3D(x * 0.1, y * 0.1, z * 0.1);
                            if (oreVal > 0.65) block = BlockType.COAL_ORE;
                            else if (oreVal < -0.7 && y < 25) block = BlockType.IRON_ORE;
                        }
                    } else if (y < height) {
                        block = biome === 'desert' ? BlockType.SAND : BlockType.DIRT;
                    } else if (y === height) {
                        if (biome === 'desert') {
                            block = BlockType.SAND;
                        } else if (biome === 'snow') {
                            block = BlockType.SNOW;
                        } else if (height <= WATER_LEVEL + 1) {
                            block = BlockType.SAND;
                        } else {
                            block = BlockType.GRASS;
                        }
                    } else if (y <= WATER_LEVEL) {
                        block = BlockType.WATER;
                    }

                    // Cave carving (3D noise)
                    if (y > 1 && y < height - 1 && block !== BlockType.WATER && block !== BlockType.AIR) {
                        const cave = fbm3D(this.noiseCave, x * 0.04, y * 0.06, z * 0.04, 2);
                        if (cave > 0.45) block = BlockType.AIR;
                    }

                    chunk.setBlock(lx, y, lz, block);
                }
            }
        }

        // Generate trees for this chunk
        this._generateTrees(chunk);
    }

    // ── Tree Generation ────────────────────────────────────
    _generateTrees(chunk) {
        const cx = chunk.cx;
        const cz = chunk.cz;
        const wx = cx * CHUNK_SIZE;
        const wz = cz * CHUNK_SIZE;

        // Extend tree placement zone so leaves from neighboring chunks' trees are included
        for (let tz = -1; tz <= 1; tz++) {
            for (let tx = -1; tx <= 1; tx++) {
                const tcx = cx + tx;
                const tcz = cz + tz;
                const twx = tcx * CHUNK_SIZE;
                const twz = tcz * CHUNK_SIZE;

                for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                        const x = twx + lx;
                        const z = twz + lz;
                        const biome = this.getBiome(x, z);
                        if (biome === 'desert') continue;

                        // Deterministic tree placement
                        const treeVal = this._treeHash(x, z);
                        const threshold = biome === 'forest' ? 0.985 : 0.993;
                        if (treeVal < threshold) continue;

                        const height = this.getTerrainHeight(x, z);
                        if (height <= WATER_LEVEL + 1) continue;

                        this._placeTreeInChunk(chunk, x, height + 1, z, wx, wz, biome);
                    }
                }
            }
        }
    }

    _treeHash(x, z) {
        // Deterministic hash for tree placement
        const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
        return n - Math.floor(n);
    }

    _placeTreeInChunk(chunk, tx, ty, tz, chunkWX, chunkWZ, biome) {
        const trunkHeight = 4 + Math.floor(this._treeHash(tx + 100, tz + 100) * 3);

        // Place trunk and leaves only if they fall within this chunk
        const setIfInChunk = (x, y, z, block) => {
            const lx = x - chunkWX;
            const lz = z - chunkWZ;
            if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && y >= 0 && y < CHUNK_HEIGHT) {
                const existing = chunk.getBlock(lx, y, lz);
                if (existing === BlockType.AIR || existing === BlockType.LEAVES) {
                    chunk.setBlock(lx, y, lz, block);
                }
            }
        };

        // Trunk
        for (let i = 0; i < trunkHeight; i++) {
            setIfInChunk(tx, ty + i, tz, BlockType.OAK_LOG);
        }

        // Leaves
        const leafBase = ty + trunkHeight - 2;
        const leafTop = ty + trunkHeight + 1;
        for (let ly = leafBase; ly <= leafTop; ly++) {
            const radius = ly < leafTop ? 2 : 1;
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    if (dx === 0 && dz === 0 && ly < ty + trunkHeight) continue;
                    if (Math.abs(dx) === radius && Math.abs(dz) === radius) {
                        if (this._treeHash(tx + dx * 7, tz + dz * 13 + ly) > 0.55) continue;
                    }
                    setIfInChunk(tx + dx, ly, tz + dz, BlockType.LEAVES);
                }
            }
        }
    }

    // ── Chunk Loading / Unloading ───────────────────────────
    loadChunk(cx, cz) {
        const key = World.chunkKey(cx, cz);
        if (this.chunks.has(key)) return;

        const chunk = new Chunk(cx, cz);
        this.generateChunkTerrain(chunk);
        // Apply any saved modifications for this chunk
        this._applyChunkModifications(chunk);
        this.chunks.set(key, chunk);
        chunk.buildMesh(this, this.solidMaterial, this.waterMaterial, this.scene);
    }

    updateChunks(playerX, playerZ) {
        const pcx = World.chunkCoord(playerX);
        const pcz = World.chunkCoord(playerZ);
        const rd = this.renderDistance;

        // Load nearby chunks
        for (let dx = -rd; dx <= rd; dx++) {
            for (let dz = -rd; dz <= rd; dz++) {
                if (dx * dx + dz * dz > (rd + 0.5) * (rd + 0.5)) continue;
                this.loadChunk(pcx + dx, pcz + dz);
            }
        }

        // Unload distant chunks
        const unloadDist = rd + 3;
        for (const [key, chunk] of this.chunks) {
            const dx = chunk.cx - pcx;
            const dz = chunk.cz - pcz;
            if (dx * dx + dz * dz > unloadDist * unloadDist) {
                chunk.dispose(this.scene);
                this.chunks.delete(key);
            }
        }
    }

    // ── Initial World Generation (with progress callback) ──
    generateInitial(centerX, centerZ, onProgress) {
        const pcx = World.chunkCoord(centerX);
        const pcz = World.chunkCoord(centerZ);
        const rd = this.renderDistance;

        const positions = [];
        for (let dx = -rd; dx <= rd; dx++)
            for (let dz = -rd; dz <= rd; dz++)
                if (dx * dx + dz * dz <= (rd + 0.5) * (rd + 0.5))
                    positions.push([pcx + dx, pcz + dz]);

        let idx = 0;
        const total = positions.length;

        return new Promise((resolve) => {
            const batch = () => {
                const batchSize = 4;
                for (let i = 0; i < batchSize && idx < total; i++, idx++) {
                    const [cx, cz] = positions[idx];
                    this.loadChunk(cx, cz);
                }
                if (onProgress) onProgress(idx / total);
                if (idx < total) {
                    requestAnimationFrame(batch);
                } else {
                    resolve();
                }
            };
            batch();
        });
    }

    // ── Save / Load Modifications ───────────────────────────
    _applyChunkModifications(chunk) {
        const wx = chunk.cx * CHUNK_SIZE;
        const wz = chunk.cz * CHUNK_SIZE;
        for (const [key, type] of this.modifiedBlocks) {
            const [x, y, z] = key.split(',').map(Number);
            const lx = x - wx;
            const lz = z - wz;
            if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && y >= 0 && y < CHUNK_HEIGHT) {
                chunk.setBlock(lx, y, lz, type);
            }
        }
    }

    getModifications() {
        const mods = [];
        for (const [key, type] of this.modifiedBlocks) {
            const [x, y, z] = key.split(',').map(Number);
            mods.push({ x, y, z, type });
        }
        return mods;
    }

    setModifications(mods) {
        this.modifiedBlocks.clear();
        for (const mod of mods) {
            this.modifiedBlocks.set(`${mod.x},${mod.y},${mod.z}`, mod.type);
        }
    }

    // ── Raycasting (DDA voxel traversal) ────────────────────
    raycast(origin, direction, maxDist = 7) {
        let x = Math.floor(origin.x);
        let y = Math.floor(origin.y);
        let z = Math.floor(origin.z);

        const stepX = direction.x >= 0 ? 1 : -1;
        const stepY = direction.y >= 0 ? 1 : -1;
        const stepZ = direction.z >= 0 ? 1 : -1;

        const tDeltaX = direction.x !== 0 ? Math.abs(1 / direction.x) : Infinity;
        const tDeltaY = direction.y !== 0 ? Math.abs(1 / direction.y) : Infinity;
        const tDeltaZ = direction.z !== 0 ? Math.abs(1 / direction.z) : Infinity;

        let tMaxX = direction.x !== 0
            ? ((direction.x > 0 ? (x + 1 - origin.x) : (origin.x - x)) * tDeltaX) : Infinity;
        let tMaxY = direction.y !== 0
            ? ((direction.y > 0 ? (y + 1 - origin.y) : (origin.y - y)) * tDeltaY) : Infinity;
        let tMaxZ = direction.z !== 0
            ? ((direction.z > 0 ? (z + 1 - origin.z) : (origin.z - z)) * tDeltaZ) : Infinity;

        let face = [0, 0, 0];
        const maxSteps = Math.ceil(maxDist) * 3;

        for (let i = 0; i < maxSteps; i++) {
            const block = this.getBlock(x, y, z);
            if (block !== BlockType.AIR && block !== BlockType.WATER) {
                return { pos: [x, y, z], normal: face, block };
            }

            if (tMaxX < tMaxY) {
                if (tMaxX < tMaxZ) {
                    if (tMaxX > maxDist) break;
                    x += stepX; tMaxX += tDeltaX;
                    face = [-stepX, 0, 0];
                } else {
                    if (tMaxZ > maxDist) break;
                    z += stepZ; tMaxZ += tDeltaZ;
                    face = [0, 0, -stepZ];
                }
            } else {
                if (tMaxY < tMaxZ) {
                    if (tMaxY > maxDist) break;
                    y += stepY; tMaxY += tDeltaY;
                    face = [0, -stepY, 0];
                } else {
                    if (tMaxZ > maxDist) break;
                    z += stepZ; tMaxZ += tDeltaZ;
                    face = [0, 0, -stepZ];
                }
            }
        }

        return null;
    }

    // Spawn height at world coordinates
    getSpawnHeight(x, z) {
        return this.getTerrainHeight(Math.floor(x), Math.floor(z)) + 2;
    }
}
