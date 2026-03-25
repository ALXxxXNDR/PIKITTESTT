// ============================================
// PIKIT - Game Balance Constants
// v5.1 Balance — 10-tier blocks, 5-tier pickaxes, 95% return rate
// 10 block tiers with weights summing to 10000
// 5 user pickaxes (basic/power/light/swift/elite) + system (×3)
// House edge: 5%
// ============================================

const GAME = {
  TICK_RATE: 60,            // Server tick rate (fps)
  INTERNAL_WIDTH: 1080,     // Internal resolution (width)
  INTERNAL_HEIGHT: 1920,    // Internal resolution (height)
  BLOCK_SIZE: 120,          // Block size (px)
  CHUNK_WIDTH: 8,           // Chunk width in mineable blocks (no bedrock columns)
  CHUNK_HEIGHT: 16,         // Chunk height in blocks
  WALL_THICKNESS: 60,       // Thin wall on each side (px) — 60+8*120+60=1080
  GRAVITY: 400,             // Gravity (px/s^2) - low for floaty game feel
  TERMINAL_VELOCITY: 450,   // Max fall speed (px/s)
  BROADCAST_RATE: 20,       // State broadcast frequency (fps)
};

// ========== Pickaxe Definitions (5 user types + system) ==========
// v5.1: DMG rebalanced for 95% return rate
const PICKAXE_TYPES = {
  basic: {
    name: 'Basic Pickaxe',
    price: 1000,
    damage: 27,
    scale: 0.8,
    gravityMult: 1.0,
    speedMult: 1.0,
    lifetime: 30000,
    texture: 'wooden_pickaxe.png',
    color: '#8B6914',
    description: 'DMG 27 | 30s | Standard gravity & speed. A reliable all-rounder.',
  },
  power: {
    name: 'Power Pickaxe',
    price: 2000,
    damage: 58,
    scale: 1.0,
    gravityMult: 1.0,
    speedMult: 1.0,
    lifetime: 30000,
    texture: 'diamond_pickaxe.png',
    color: '#00CED1',
    description: 'DMG 58 | 30s | Oversized head deals heavy damage per hit.',
  },
  light: {
    name: 'Light Pickaxe',
    price: 3000,
    damage: 94,
    scale: 0.7,
    gravityMult: 0.5,
    speedMult: 1.0,
    lifetime: 35000,
    texture: 'golden_pickaxe.png',
    color: '#FFD700',
    description: 'DMG 94 | 35s | 0.5x gravity — floats slowly. Longest lifetime.',
  },
  swift: {
    name: 'Swift Pickaxe',
    price: 4000,
    damage: 136,
    scale: 0.75,
    gravityMult: 1.0,
    speedMult: 1.6,
    lifetime: 25000,
    texture: 'iron_pickaxe.png',
    color: '#C0C0C0',
    description: 'DMG 136 | 25s | 1.6x speed — hits many more blocks. High total output.',
  },
  elite: {
    name: 'Elite Pickaxe',
    price: 5000,
    damage: 186,
    scale: 0.9,
    gravityMult: 0.8,
    speedMult: 1.3,
    lifetime: 28000,
    texture: 'elite_pickaxe.png',
    color: '#9B59B6',
    description: 'DMG 186 | 28s | Premium pick. Massive damage with balanced physics.',
  },
  system: {
    name: 'PIKIT',
    price: 0,
    damage: 8,
    scale: 1.2,
    gravityMult: 0.8,
    speedMult: 0.6,
    lifetime: Infinity,
    texture: 'system_pickaxe.png',
    color: '#FF00FF',
    description: 'PIKIT house pickaxe — fast falling, wide bouncing game driver',
  },
};

// ========== TNT Definition ==========
// v5.1: price 6000, damage 500, 3×3 grid (8 surrounding blocks)
const TNT_TYPES = {
  tnt: {
    name: 'TNT',
    price: 6000,
    damage: 500,
    radiusX: 1,           // 3×3 grid: center ± 1 column
    radiusDown: 1,        // 3×3 grid: center ± 1 row
    texture: 'tnt.png',
  },
};

// ========== Block Definitions (10 tiers + special) ==========
// v5.1: Rebalanced for 95% return rate
// HP multiplier x1.29, Reward multiplier x1.60, Spawn decay x1.20
const BLOCK_TYPES = {
  // === Tier 1-4: Common Blocks ===
  dirt: {
    name: 'Dirt',
    hp: 100,
    weight: 1988,
    reward: 100,
    rewardType: 'fixed',
    color: '#8B5E3C',
    texture: 'dirt.png',
  },
  clay: {
    name: 'Clay',
    hp: 129,
    weight: 1656,
    reward: 160,
    rewardType: 'fixed',
    color: '#A09070',
    texture: 'andesite.png',
  },
  gravel: {
    name: 'Gravel',
    hp: 167,
    weight: 1380,
    reward: 257,
    rewardType: 'fixed',
    color: '#696969',
    texture: 'cobblestone.png',
  },
  stone: {
    name: 'Stone',
    hp: 215,
    weight: 1150,
    reward: 412,
    rewardType: 'fixed',
    color: '#808080',
    texture: 'stone.png',
  },

  // === Tier 5-6: Uncommon Blocks ===
  copper_block: {
    name: 'Copper Block',
    hp: 278,
    weight: 959,
    reward: 661,
    rewardType: 'fixed',
    color: '#B87333',
    texture: 'copper_ore.png',
  },
  iron_block: {
    name: 'Iron Block',
    hp: 359,
    weight: 799,
    reward: 1059,
    rewardType: 'fixed',
    color: '#BC8F8F',
    texture: 'iron_ore.png',
  },

  // === Tier 7-10: Rare Blocks (tntResist) ===
  emerald_block: {
    name: 'Emerald Block',
    hp: 464,
    weight: 666,
    reward: 1699,
    rewardType: 'fixed',
    color: '#50C878',
    texture: 'emerald_ore.png',
    tntResist: true,
  },
  gold_block: {
    name: 'Gold Block',
    hp: 599,
    weight: 555,
    reward: 2723,
    rewardType: 'fixed',
    color: '#FFD700',
    texture: 'gold_ore.png',
    tntResist: true,
  },
  netherite_block: {
    name: 'Netherite Block',
    hp: 774,
    weight: 462,
    reward: 4366,
    rewardType: 'fixed',
    color: '#4A3728',
    texture: 'netherite_ore.png',
    tntResist: true,
  },
  diamond_block: {
    name: 'Diamond Block',
    hp: 1000,
    weight: 385,
    reward: 7000,
    rewardType: 'fixed',
    color: '#00CED1',
    texture: 'diamond_ore.png',
    tntResist: true,
  },

  // === Special Blocks ===
  jackpot: {
    name: 'Jackpot Block',
    hp: 10000,
    weight: 0,
    reward: 250000,
    rewardType: 'fixed',
    color: '#FF00FF',
    texture: 'jackpot.png',
    tntResist: true,
  },
  bedrock: {
    name: 'Bedrock',
    hp: 999999,
    weight: 0,
    reward: 0,
    rewardType: 'fixed',
    color: '#333333',
    texture: 'bedrock.png',
  },
};

// ========== Jackpot System Config ==========
const JACKPOT_CONFIG = {
  SPAWN_CHANCE: 0.0001,
  RESPAWN_CHANCE: 0.00001,
  HP: 10000,
};

// ========== Jackpot Pool Config ==========
const JACKPOT_POOL_CONFIG = {
  HOUSE_PROFIT_MILESTONE: 50000,
  POOL_ALLOCATION: 2500,
  MIN_POOL_TO_SPAWN: 50000,
};

// House edge target — v5.1: 5% (95% return rate)
const HOUSE_EDGE = 0.05;

// Initial balance (0 in production, use dev addBalance for testing)
const INITIAL_BALANCE = 0;

const SYSTEM_PICKAXE_COUNT = 3;

module.exports = {
  GAME,
  PICKAXE_TYPES,
  TNT_TYPES,
  BLOCK_TYPES,
  JACKPOT_CONFIG,
  JACKPOT_POOL_CONFIG,
  HOUSE_EDGE,
  INITIAL_BALANCE,
  SYSTEM_PICKAXE_COUNT,
};
