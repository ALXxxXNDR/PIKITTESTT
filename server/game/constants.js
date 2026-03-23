// ============================================
// PIKIT - Game Balance Constants
// Guide: Adjust all balance values in this file
// v5.0 Balance Rebalance — 10-tier blocks, 5-tier pickaxes, 90% return rate
// 10 block tiers with weights summing to 10000
// 5 user pickaxes (basic/power/light/swift/elite) + 1 system
// House edge: 10% (was 52%)
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
// v5.0: 5-tier pricing (1000–5000), increased damage across the board
// system_weak removed — single system pickaxe only
const PICKAXE_TYPES = {
  basic: {
    name: 'Basic Pickaxe',
    price: 1000,
    damage: 14,
    scale: 0.8,
    gravityMult: 1.0,
    speedMult: 1.0,
    lifetime: 30000,
    texture: 'wooden_pickaxe.png',
    color: '#8B6914',
    description: 'DMG 14 | 30s | Standard gravity & speed. A reliable all-rounder.',
  },
  power: {
    name: 'Power Pickaxe',
    price: 2000,
    damage: 30,
    scale: 1.0,
    gravityMult: 1.0,
    speedMult: 1.0,
    lifetime: 30000,
    texture: 'diamond_pickaxe.png',
    color: '#00CED1',
    description: 'DMG 30 | 30s | Oversized head deals heavy damage per hit.',
  },
  light: {
    name: 'Light Pickaxe',
    price: 3000,
    damage: 48,
    scale: 0.7,
    gravityMult: 0.5,
    speedMult: 1.0,
    lifetime: 35000,
    texture: 'golden_pickaxe.png',
    color: '#FFD700',
    description: 'DMG 48 | 35s | 0.5x gravity — floats slowly. Longest lifetime.',
  },
  swift: {
    name: 'Swift Pickaxe',
    price: 4000,
    damage: 70,
    scale: 0.75,
    gravityMult: 1.0,
    speedMult: 1.6,
    lifetime: 25000,
    texture: 'iron_pickaxe.png',
    color: '#C0C0C0',
    description: 'DMG 70 | 25s | 1.6x speed — hits many more blocks. High total output.',
  },
  elite: {
    name: 'Elite Pickaxe',
    price: 5000,
    damage: 95,
    scale: 0.9,
    gravityMult: 0.8,
    speedMult: 1.3,
    lifetime: 28000,
    texture: 'elite_pickaxe.png',
    color: '#9B59B6',
    description: 'DMG 95 | 28s | Premium pick. Massive damage with balanced physics.',
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

// ========== TNT Definition (single type) ==========
// TNT only explodes on block contact, not by fuse timer
// v4.7: price 8000, damage 30 — utility item, ~3% ROI (unchanged from v4.6)
const TNT_TYPES = {
  tnt: {
    name: 'TNT',
    price: 8000,
    damage: 30,           // Kills all common blocks + copper, weakens iron
    radiusX: 2,           // 5 blocks wide (center ± 2)
    radiusDown: 3,        // 3 extra blocks deeper than radiusX
    texture: 'tnt.png',
  },
};

// ========== Block Definitions (10 tiers + special) ==========
// v5.0: 10-tier system, weights sum to 10000
// Tier 1-4: Common | Tier 5-6: Uncommon | Tier 7-10: Rare (tntResist)
// NOTE: Chunk.js caches the block spawn pool on first use. After changing
// block weights here, a full server restart is required to invalidate that cache.
const BLOCK_TYPES = {
  // === Tier 1-4: Common Blocks ===
  dirt: {
    name: 'Dirt',
    hp: 10,
    weight: 1988,
    reward: 10,
    rewardType: 'fixed',
    color: '#8B5E3C',
    texture: 'dirt.png',
  },
  clay: {
    name: 'Clay',
    hp: 18,
    weight: 1656,
    reward: 25,
    rewardType: 'fixed',
    color: '#A09070',
    texture: 'andesite.png',
  },
  gravel: {
    name: 'Gravel',
    hp: 32,
    weight: 1380,
    reward: 63,
    rewardType: 'fixed',
    color: '#696969',
    texture: 'cobblestone.png',
  },
  stone: {
    name: 'Stone',
    hp: 58,
    weight: 1150,
    reward: 159,
    rewardType: 'fixed',
    color: '#808080',
    texture: 'stone.png',
  },

  // === Tier 5-6: Uncommon Blocks ===
  copper_block: {
    name: 'Copper Block',
    hp: 105,
    weight: 959,
    reward: 399,
    rewardType: 'fixed',
    color: '#B87333',
    texture: 'copper_ore.png',
  },
  iron_block: {
    name: 'Iron Block',
    hp: 190,
    weight: 799,
    reward: 1003,
    rewardType: 'fixed',
    color: '#BC8F8F',
    texture: 'iron_ore.png',
  },

  // === Tier 7-10: Rare Blocks (tntResist) ===
  emerald_block: {
    name: 'Emerald Block',
    hp: 342,
    weight: 666,
    reward: 2520,
    rewardType: 'fixed',
    color: '#50C878',
    texture: 'emerald_ore.png',
    tntResist: true,
  },
  gold_block: {
    name: 'Gold Block',
    hp: 616,
    weight: 555,
    reward: 6333,
    rewardType: 'fixed',
    color: '#FFD700',
    texture: 'gold_ore.png',
    tntResist: true,
  },
  netherite_block: {
    name: 'Netherite Block',
    hp: 1110,
    weight: 462,
    reward: 15916,
    rewardType: 'fixed',
    color: '#4A3728',
    texture: 'netherite_ore.png',
    tntResist: true,
  },
  diamond_block: {
    name: 'Diamond Block',
    hp: 2000,
    weight: 385,
    reward: 40000,
    rewardType: 'fixed',
    color: '#00CED1',
    texture: 'diamond_ore.png',
    tntResist: true,
  },

  // === Special Blocks ===
  jackpot: {
    name: 'Jackpot Block',
    hp: 1500,
    weight: 0,
    reward: 0,
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
// v4.8: pool-based spawn condition, HP 1500, dynamic reward from jackpotPool
const JACKPOT_CONFIG = {
  // SPAWN_THRESHOLD, REWARD, MIN_PLAYERS are v4.8 legacy — replaced by pool-based system
  SPAWN_CHANCE: 0.0001,      // 0.01% chance per eligible block position (was 0.05%)
  RESPAWN_CHANCE: 0.00001,   // 0.001% re-spawn chance after jackpot escapes viewport
  HP: 1500,                  // Raid boss HP (was 300) — requires sustained team effort
};

// ========== Jackpot Pool Config ==========
// v4.8: house profit milestones feed the jackpot pool
const JACKPOT_POOL_CONFIG = {
  HOUSE_PROFIT_MILESTONE: 50000,  // Every 50,000cr of house profit triggers an allocation
  POOL_ALLOCATION: 2500,          // 2,500 credits added to jackpot pool per milestone
  MIN_POOL_TO_SPAWN: 50000,       // Pool must reach 50,000 before jackpot block can spawn
};

// House edge target — v5.0: 10% (90% return rate)
const HOUSE_EDGE = 0.10;

// Initial balance
const INITIAL_BALANCE = 10000;

module.exports = {
  GAME,
  PICKAXE_TYPES,
  TNT_TYPES,
  BLOCK_TYPES,
  JACKPOT_CONFIG,
  JACKPOT_POOL_CONFIG,
  HOUSE_EDGE,
  INITIAL_BALANCE,
};
