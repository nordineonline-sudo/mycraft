// ============================================================
// Procedural Texture Atlas Generator
// Generates all 16x16 pixel-art block textures on a canvas
// and packs them into a single texture atlas for WebGL
// ============================================================

import * as THREE from 'three';

const T = 16; // Texture size in pixels
export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 4;

// Texture indices in the atlas
export const TEX = {
    GRASS_TOP: 0,
    GRASS_SIDE: 1,
    DIRT: 2,
    STONE: 3,
    SAND: 4,
    WATER: 5,
    OAK_LOG_SIDE: 6,
    OAK_LOG_TOP: 7,
    LEAVES: 8,
    BEDROCK: 9,
    COBBLESTONE: 10,
    OAK_PLANKS: 11,
    SNOW: 12,
    COAL_ORE: 13,
    IRON_ORE: 14,
    GLASS: 15,
};

// ── Seeded RNG ──────────────────────────────────────────────
function makeRng(seed) {
    let s = seed & 0x7fffffff;
    return () => {
        s = (s * 16807 + 12345) & 0x7fffffff;
        return (s & 0xfffffff) / 0x10000000;
    };
}

// ── Helpers ─────────────────────────────────────────────────
function px(data, x, y, r, g, b, a = 255) {
    const i = (y * T + x) * 4;
    data[i] = Math.max(0, Math.min(255, r));
    data[i+1] = Math.max(0, Math.min(255, g));
    data[i+2] = Math.max(0, Math.min(255, b));
    data[i+3] = Math.max(0, Math.min(255, a));
}

function fill(data, r, g, b, a, rng, variation = 12) {
    for (let y = 0; y < T; y++)
        for (let x = 0; x < T; x++) {
            const v = Math.floor(rng() * variation * 2) - variation;
            px(data, x, y, r + v, g + v, b + Math.floor(v * 0.5), a);
        }
}

function spots(data, rng, count, dr, dg, db) {
    for (let i = 0; i < count; i++) {
        const x = Math.floor(rng() * T);
        const y = Math.floor(rng() * T);
        const idx = (y * T + x) * 4;
        data[idx]   = Math.max(0, Math.min(255, data[idx] + dr));
        data[idx+1] = Math.max(0, Math.min(255, data[idx+1] + dg));
        data[idx+2] = Math.max(0, Math.min(255, data[idx+2] + db));
    }
}

function patches(data, rng, count, radius, dr, dg, db) {
    for (let i = 0; i < count; i++) {
        const cx = Math.floor(rng() * T);
        const cy = Math.floor(rng() * T);
        const r = 1 + Math.floor(rng() * radius);
        for (let dy = -r; dy <= r; dy++)
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy > r * r + 1) continue;
                const px2 = ((cx + dx) % T + T) % T;
                const py = ((cy + dy) % T + T) % T;
                const idx = (py * T + px2) * 4;
                data[idx]   = Math.max(0, Math.min(255, data[idx] + dr));
                data[idx+1] = Math.max(0, Math.min(255, data[idx+1] + dg));
                data[idx+2] = Math.max(0, Math.min(255, data[idx+2] + db));
            }
    }
}

// ── Texture Generators ─────────────────────────────────────

function genGrassTop(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    fill(d, 92, 155, 50, 255, rng, 15);
    spots(d, rng, 30, -18, -18, -8);
    spots(d, rng, 15, 12, 18, 6);
    return d;
}

function genGrassSide(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    for (let y = 0; y < T; y++)
        for (let x = 0; x < T; x++) {
            const v = Math.floor(rng() * 16) - 8;
            if (y < 3) {
                px(d, x, y, 92 + v, 155 + v, 50 + Math.floor(v * 0.4));
            } else if (y === 3) {
                if (rng() > 0.4)
                    px(d, x, y, 92 + v, 155 + v, 50 + Math.floor(v * 0.4));
                else
                    px(d, x, y, 134 + v, 96 + v, 67 + Math.floor(v * 0.5));
            } else {
                px(d, x, y, 134 + v, 96 + v, 67 + Math.floor(v * 0.5));
            }
        }
    return d;
}

function genDirt(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    fill(d, 134, 96, 67, 255, rng, 12);
    spots(d, rng, 20, -15, -12, -8);
    spots(d, rng, 10, 10, 8, 5);
    return d;
}

function genStone(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    fill(d, 128, 128, 128, 255, rng, 14);
    patches(d, rng, 6, 2, -18, -18, -18);
    patches(d, rng, 4, 1, 12, 12, 12);
    return d;
}

function genSand(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    fill(d, 219, 211, 160, 255, rng, 8);
    spots(d, rng, 20, -8, -6, -4);
    return d;
}

function genWater(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    for (let y = 0; y < T; y++)
        for (let x = 0; x < T; x++) {
            const v = Math.floor(rng() * 20) - 10;
            const wave = Math.sin((x + y) * 0.6) * 8;
            px(d, x, y,
                30 + v + Math.floor(wave),
                90 + v + Math.floor(wave * 0.5),
                185 + v,
                200
            );
        }
    return d;
}

function genOakLogSide(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    for (let y = 0; y < T; y++)
        for (let x = 0; x < T; x++) {
            const v = Math.floor(rng() * 10) - 5;
            const stripe = (x % 4 === 0 || x % 4 === 1) ? 15 : 0;
            px(d, x, y, 103 + v + stripe, 82 + v + stripe, 49 + v + Math.floor(stripe * 0.5));
        }
    patches(d, rng, 3, 1, -12, -10, -6);
    return d;
}

function genOakLogTop(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    const cx = 7.5, cy = 7.5;
    for (let y = 0; y < T; y++)
        for (let x = 0; x < T; x++) {
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
            const ring = Math.sin(dist * 1.8) * 0.5 + 0.5;
            const v = Math.floor(rng() * 8) - 4;
            const r = Math.floor(103 + ring * 40 + v);
            const g = Math.floor(82 + ring * 35 + v);
            const b = Math.floor(49 + ring * 20 + v);
            px(d, x, y, r, g, b);
        }
    return d;
}

function genLeaves(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    for (let y = 0; y < T; y++)
        for (let x = 0; x < T; x++) {
            const v = Math.floor(rng() * 30) - 15;
            const alpha = rng() > 0.12 ? 255 : 0;
            px(d, x, y, 52 + v, 120 + v, 28 + Math.floor(v * 0.4), alpha);
        }
    return d;
}

function genBedrock(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    fill(d, 55, 55, 55, 255, rng, 18);
    patches(d, rng, 8, 2, -20, -20, -20);
    spots(d, rng, 15, 10, 10, 10);
    return d;
}

function genCobblestone(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    fill(d, 122, 122, 122, 255, rng, 16);
    // Create stone-like patches
    for (let i = 0; i < 10; i++) {
        const cx = Math.floor(rng() * T);
        const cy = Math.floor(rng() * T);
        const r = 1 + Math.floor(rng() * 2);
        const bright = Math.floor(rng() * 30) - 15;
        for (let dy = -r; dy <= r; dy++)
            for (let dx = -r; dx <= r; dx++) {
                const px2 = ((cx + dx) % T + T) % T;
                const py = ((cy + dy) % T + T) % T;
                const idx = (py * T + px2) * 4;
                data_set(d, idx, bright);
            }
    }
    // Dark mortar lines
    for (let y = 0; y < T; y += 4)
        for (let x = 0; x < T; x++) {
            const idx = (y * T + x) * 4;
            d[idx] -= 20; d[idx+1] -= 20; d[idx+2] -= 20;
        }
    for (let x = 0; x < T; x += 4)
        for (let y = 0; y < T; y++) {
            const idx = (y * T + x) * 4;
            d[idx] -= 15; d[idx+1] -= 15; d[idx+2] -= 15;
        }
    return d;
}

function data_set(d, idx, v) {
    d[idx]   = Math.max(0, Math.min(255, d[idx] + v));
    d[idx+1] = Math.max(0, Math.min(255, d[idx+1] + v));
    d[idx+2] = Math.max(0, Math.min(255, d[idx+2] + v));
}

function genOakPlanks(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    for (let y = 0; y < T; y++)
        for (let x = 0; x < T; x++) {
            const v = Math.floor(rng() * 10) - 5;
            const line = (y % 4 === 0) ? -20 : 0;
            px(d, x, y, 162 + v + line, 130 + v + line, 78 + v + Math.floor(line * 0.5));
        }
    return d;
}

function genSnow(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    for (let y = 0; y < T; y++)
        for (let x = 0; x < T; x++) {
            const v = Math.floor(rng() * 8) - 4;
            px(d, x, y, 242 + v, 248 + v, 255, 255);
        }
    spots(d, rng, 12, -6, -4, -8);
    return d;
}

function genCoalOre(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    // Stone base
    fill(d, 128, 128, 128, 255, rng, 10);
    // Coal spots
    for (let i = 0; i < 5; i++) {
        const cx = 2 + Math.floor(rng() * 12);
        const cy = 2 + Math.floor(rng() * 12);
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
                if (Math.abs(dx) + Math.abs(dy) > 1 && rng() > 0.5) continue;
                const px2 = (cx + dx + T) % T;
                const py = (cy + dy + T) % T;
                const idx = (py * T + px2) * 4;
                d[idx] = 30; d[idx+1] = 30; d[idx+2] = 30;
            }
    }
    return d;
}

function genIronOre(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    fill(d, 128, 128, 128, 255, rng, 10);
    for (let i = 0; i < 5; i++) {
        const cx = 2 + Math.floor(rng() * 12);
        const cy = 2 + Math.floor(rng() * 12);
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
                if (Math.abs(dx) + Math.abs(dy) > 1 && rng() > 0.5) continue;
                const px2 = (cx + dx + T) % T;
                const py = (cy + dy + T) % T;
                const idx = (py * T + px2) * 4;
                d[idx] = 200; d[idx+1] = 180; d[idx+2] = 140;
            }
    }
    return d;
}

function genGlass(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    for (let y = 0; y < T; y++)
        for (let x = 0; x < T; x++) {
            // Mostly transparent, white edges
            const edge = (x === 0 || x === T-1 || y === 0 || y === T-1);
            if (edge) {
                px(d, x, y, 210, 230, 240, 180);
            } else {
                px(d, x, y, 200, 220, 240, 40);
            }
        }
    // Center highlight
    px(d, 3, 3, 255, 255, 255, 100);
    px(d, 4, 3, 255, 255, 255, 80);
    px(d, 3, 4, 255, 255, 255, 80);
    return d;
}

// Snow-covered grass side
function genSnowSide(rng) {
    const d = new Uint8ClampedArray(T * T * 4);
    for (let y = 0; y < T; y++)
        for (let x = 0; x < T; x++) {
            const v = Math.floor(rng() * 10) - 5;
            if (y < 3) {
                px(d, x, y, 242 + v, 248 + v, 255);
            } else if (y === 3) {
                if (rng() > 0.4)
                    px(d, x, y, 242 + v, 248 + v, 255);
                else
                    px(d, x, y, 134 + v, 96 + v, 67 + Math.floor(v * 0.5));
            } else {
                px(d, x, y, 134 + v, 96 + v, 67 + Math.floor(v * 0.5));
            }
        }
    return d;
}

// ── Atlas Builder ───────────────────────────────────────────

export function createTextureAtlas() {
    const W = ATLAS_COLS * T;
    const H = ATLAS_ROWS * T;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const rng = makeRng(42);

    const generators = [
        genGrassTop,      // 0
        genGrassSide,     // 1
        genDirt,          // 2
        genStone,         // 3
        genSand,          // 4
        genWater,         // 5
        genOakLogSide,    // 6
        genOakLogTop,     // 7
        genLeaves,        // 8
        genBedrock,       // 9
        genCobblestone,   // 10
        genOakPlanks,     // 11
        genSnow,          // 12
        genCoalOre,       // 13
        genIronOre,       // 14
        genGlass,         // 15
    ];

    const textureData = [];
    generators.forEach((gen, idx) => {
        const data = gen(rng);
        textureData.push(data);
        const col = idx % ATLAS_COLS;
        const row = Math.floor(idx / ATLAS_COLS);
        const imgData = new ImageData(data, T, T);
        ctx.putImageData(imgData, col * T, row * T);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    const solidMaterial = new THREE.MeshLambertMaterial({
        map: texture,
        side: THREE.FrontSide,
        alphaTest: 0.1,
    });

    const waterMaterial = new THREE.MeshLambertMaterial({
        map: texture,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
    });

    return { texture, solidMaterial, waterMaterial, canvas, textureData };
}

/** Map face-local UV [0,1] to atlas UV for a given texture index */
export function getUV(texIdx, u, v) {
    const col = texIdx % ATLAS_COLS;
    const row = Math.floor(texIdx / ATLAS_COLS);
    return [
        (col + u) / ATLAS_COLS,
        1.0 - (row + 1.0 - v) / ATLAS_ROWS,
    ];
}
