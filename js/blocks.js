// ============================================================
// Block Type Definitions & Face Geometry
// ============================================================

import { TEX } from './textures.js';

// ── Block Type Enum ─────────────────────────────────────────
export const BlockType = {
    AIR:          0,
    GRASS:        1,
    DIRT:         2,
    STONE:        3,
    SAND:         4,
    WATER:        5,
    OAK_LOG:      6,
    LEAVES:       7,
    BEDROCK:      8,
    COBBLESTONE:  9,
    OAK_PLANKS:  10,
    SNOW:        11,
    COAL_ORE:    12,
    IRON_ORE:    13,
    GLASS:       14,
};

// ── Block Properties ────────────────────────────────────────
// Each block has: name, solid, transparent, textures {top, side, bottom}
const BLOCK_PROPS = {
    [BlockType.AIR]:         { name: 'Air',         solid: false, transparent: true,  tex: null },
    [BlockType.GRASS]:       { name: 'Grass',       solid: true,  transparent: false, tex: { top: TEX.GRASS_TOP, side: TEX.GRASS_SIDE, bottom: TEX.DIRT } },
    [BlockType.DIRT]:        { name: 'Dirt',         solid: true,  transparent: false, tex: { top: TEX.DIRT, side: TEX.DIRT, bottom: TEX.DIRT } },
    [BlockType.STONE]:       { name: 'Stone',       solid: true,  transparent: false, tex: { top: TEX.STONE, side: TEX.STONE, bottom: TEX.STONE } },
    [BlockType.SAND]:        { name: 'Sand',        solid: true,  transparent: false, tex: { top: TEX.SAND, side: TEX.SAND, bottom: TEX.SAND } },
    [BlockType.WATER]:       { name: 'Water',       solid: false, transparent: true,  tex: { top: TEX.WATER, side: TEX.WATER, bottom: TEX.WATER } },
    [BlockType.OAK_LOG]:     { name: 'Oak Log',     solid: true,  transparent: false, tex: { top: TEX.OAK_LOG_TOP, side: TEX.OAK_LOG_SIDE, bottom: TEX.OAK_LOG_TOP } },
    [BlockType.LEAVES]:      { name: 'Leaves',      solid: true,  transparent: false, tex: { top: TEX.LEAVES, side: TEX.LEAVES, bottom: TEX.LEAVES } },
    [BlockType.BEDROCK]:     { name: 'Bedrock',     solid: true,  transparent: false, tex: { top: TEX.BEDROCK, side: TEX.BEDROCK, bottom: TEX.BEDROCK } },
    [BlockType.COBBLESTONE]: { name: 'Cobblestone', solid: true,  transparent: false, tex: { top: TEX.COBBLESTONE, side: TEX.COBBLESTONE, bottom: TEX.COBBLESTONE } },
    [BlockType.OAK_PLANKS]:  { name: 'Planks',     solid: true,  transparent: false, tex: { top: TEX.OAK_PLANKS, side: TEX.OAK_PLANKS, bottom: TEX.OAK_PLANKS } },
    [BlockType.SNOW]:        { name: 'Snow',        solid: true,  transparent: false, tex: { top: TEX.SNOW, side: TEX.SNOW, bottom: TEX.SNOW } },
    [BlockType.COAL_ORE]:    { name: 'Coal Ore',   solid: true,  transparent: false, tex: { top: TEX.COAL_ORE, side: TEX.COAL_ORE, bottom: TEX.COAL_ORE } },
    [BlockType.IRON_ORE]:    { name: 'Iron Ore',   solid: true,  transparent: false, tex: { top: TEX.IRON_ORE, side: TEX.IRON_ORE, bottom: TEX.IRON_ORE } },
    [BlockType.GLASS]:       { name: 'Glass',       solid: true,  transparent: true,  tex: { top: TEX.GLASS, side: TEX.GLASS, bottom: TEX.GLASS } },
};

export function getBlockProps(type) {
    return BLOCK_PROPS[type] || BLOCK_PROPS[BlockType.AIR];
}

export function isSolid(type) {
    const p = BLOCK_PROPS[type];
    return p ? p.solid : false;
}

export function isTransparent(type) {
    const p = BLOCK_PROPS[type];
    return p ? p.transparent : true;
}

export function getTexture(type, face) {
    const p = BLOCK_PROPS[type];
    if (!p || !p.tex) return 0;
    return p.tex[face] ?? p.tex.side;
}

// ── Face Geometry Definitions ────────────────────────────────
// Each face has: direction normal, 4 corner vertices [x,y,z,u,v]
// Triangle indices: [0,1,2] and [2,1,3] (strip pattern)
// Verified: cross product of (v1-v0)×(v2-v0) = face normal direction
export const FACES = [
    { // RIGHT (+X)
        dir: [1, 0, 0],
        corners: [
            [1, 0, 0,  0, 0],
            [1, 1, 0,  0, 1],
            [1, 0, 1,  1, 0],
            [1, 1, 1,  1, 1],
        ],
        texFace: 'side',
    },
    { // LEFT (-X)
        dir: [-1, 0, 0],
        corners: [
            [0, 0, 1,  0, 0],
            [0, 1, 1,  0, 1],
            [0, 0, 0,  1, 0],
            [0, 1, 0,  1, 1],
        ],
        texFace: 'side',
    },
    { // TOP (+Y)
        dir: [0, 1, 0],
        corners: [
            [0, 1, 0,  0, 0],
            [0, 1, 1,  0, 1],
            [1, 1, 0,  1, 0],
            [1, 1, 1,  1, 1],
        ],
        texFace: 'top',
    },
    { // BOTTOM (-Y)
        dir: [0, -1, 0],
        corners: [
            [1, 0, 0,  0, 0],
            [1, 0, 1,  0, 1],
            [0, 0, 0,  1, 0],
            [0, 0, 1,  1, 1],
        ],
        texFace: 'bottom',
    },
    { // FRONT (+Z)
        dir: [0, 0, 1],
        corners: [
            [0, 0, 1,  0, 0],
            [1, 0, 1,  1, 0],
            [0, 1, 1,  0, 1],
            [1, 1, 1,  1, 1],
        ],
        texFace: 'side',
    },
    { // BACK (-Z)
        dir: [0, 0, -1],
        corners: [
            [1, 0, 0,  0, 0],
            [0, 0, 0,  1, 0],
            [1, 1, 0,  0, 1],
            [0, 1, 0,  1, 1],
        ],
        texFace: 'side',
    },
];

// Blocks available in the player hotbar
export const HOTBAR_BLOCKS = [
    BlockType.GRASS,
    BlockType.DIRT,
    BlockType.STONE,
    BlockType.OAK_LOG,
    BlockType.OAK_PLANKS,
    BlockType.COBBLESTONE,
    BlockType.SAND,
    BlockType.LEAVES,
    BlockType.GLASS,
];
