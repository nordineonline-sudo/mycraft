// ============================================================
// Chunk — Block storage & mesh generation with face culling
// ============================================================

import * as THREE from 'three';
import { FACES, getTexture, isSolid, isTransparent, BlockType } from './blocks.js';
import { getUV } from './textures.js';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 128;

export class Chunk {
    constructor(cx, cz) {
        this.cx = cx;
        this.cz = cz;
        this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
        this.solidMesh = null;
        this.waterMesh = null;
        this.dirty = true;
    }

    // ── Block access (local coords) ─────────────────────────
    _idx(lx, ly, lz) {
        return ly * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx;
    }

    getBlock(lx, ly, lz) {
        if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE)
            return BlockType.AIR;
        return this.blocks[this._idx(lx, ly, lz)];
    }

    setBlock(lx, ly, lz, type) {
        if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE)
            return;
        this.blocks[this._idx(lx, ly, lz)] = type;
        this.dirty = true;
    }

    // ── Mesh Generation ─────────────────────────────────────
    buildMesh(world, solidMaterial, waterMaterial, scene) {
        // Remove old meshes
        this._disposeMeshes(scene);

        const solidVerts = [];
        const solidNorms = [];
        const solidUvs = [];
        const solidIndices = [];

        const waterVerts = [];
        const waterNorms = [];
        const waterUvs = [];
        const waterIndices = [];

        const wx = this.cx * CHUNK_SIZE;
        const wz = this.cz * CHUNK_SIZE;

        for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                    const block = this.blocks[this._idx(lx, ly, lz)];
                    if (block === BlockType.AIR) continue;

                    const bx = wx + lx;
                    const by = ly;
                    const bz = wz + lz;
                    const isWater = block === BlockType.WATER;

                    for (const face of FACES) {
                        const nx = lx + face.dir[0];
                        const ny = ly + face.dir[1];
                        const nz = lz + face.dir[2];

                        // Get neighbor block (may be in adjacent chunk)
                        let neighbor;
                        if (nx >= 0 && nx < CHUNK_SIZE && ny >= 0 && ny < CHUNK_HEIGHT && nz >= 0 && nz < CHUNK_SIZE) {
                            neighbor = this.blocks[this._idx(nx, ny, nz)];
                        } else {
                            neighbor = world.getBlock(bx + face.dir[0], by + face.dir[1], bz + face.dir[2]);
                        }

                        // Determine if face should be drawn
                        const neighborSolid = isSolid(neighbor);
                        const neighborTransparent = isTransparent(neighbor);

                        let drawFace = false;
                        if (isWater) {
                            // Water: draw face if neighbor is air or non-water transparent
                            drawFace = neighbor === BlockType.AIR || (neighborTransparent && neighbor !== BlockType.WATER);
                        } else if (isTransparent(block)) {
                            // Transparent solid (glass): draw if neighbor is different
                            drawFace = neighbor !== block && (neighborTransparent || !neighborSolid);
                        } else {
                            // Opaque: draw if neighbor is transparent
                            drawFace = neighborTransparent || !neighborSolid;
                        }

                        if (!drawFace) continue;

                        // Select target arrays
                        const verts  = isWater ? waterVerts  : solidVerts;
                        const norms  = isWater ? waterNorms  : solidNorms;
                        const uvs    = isWater ? waterUvs    : solidUvs;
                        const idxArr = isWater ? waterIndices : solidIndices;

                        const texIdx = getTexture(block, face.texFace);
                        const baseVert = verts.length / 3;

                        // Add 4 vertices
                        for (const corner of face.corners) {
                            verts.push(bx + corner[0], by + corner[1], bz + corner[2]);
                            norms.push(face.dir[0], face.dir[1], face.dir[2]);
                            const uv = getUV(texIdx, corner[3], corner[4]);
                            uvs.push(uv[0], uv[1]);
                        }

                        // Two triangles: [0,1,2] and [2,1,3]
                        idxArr.push(
                            baseVert, baseVert + 1, baseVert + 2,
                            baseVert + 2, baseVert + 1, baseVert + 3,
                        );
                    }
                }
            }
        }

        // Build solid mesh
        if (solidVerts.length > 0) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(solidVerts, 3));
            geo.setAttribute('normal',   new THREE.Float32BufferAttribute(solidNorms, 3));
            geo.setAttribute('uv',       new THREE.Float32BufferAttribute(solidUvs, 2));
            geo.setIndex(solidIndices);
            this.solidMesh = new THREE.Mesh(geo, solidMaterial);
            this.solidMesh.matrixAutoUpdate = false;
            scene.add(this.solidMesh);
        }

        // Build water mesh
        if (waterVerts.length > 0) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(waterVerts, 3));
            geo.setAttribute('normal',   new THREE.Float32BufferAttribute(waterNorms, 3));
            geo.setAttribute('uv',       new THREE.Float32BufferAttribute(waterUvs, 2));
            geo.setIndex(waterIndices);
            this.waterMesh = new THREE.Mesh(geo, waterMaterial);
            this.waterMesh.matrixAutoUpdate = false;
            this.waterMesh.renderOrder = 1;
            scene.add(this.waterMesh);
        }

        this.dirty = false;
    }

    _disposeMeshes(scene) {
        if (this.solidMesh) {
            scene.remove(this.solidMesh);
            this.solidMesh.geometry.dispose();
            this.solidMesh = null;
        }
        if (this.waterMesh) {
            scene.remove(this.waterMesh);
            this.waterMesh.geometry.dispose();
            this.waterMesh = null;
        }
    }

    dispose(scene) {
        this._disposeMeshes(scene);
    }
}
