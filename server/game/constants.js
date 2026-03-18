// ============================================
// PIKIT - Game Balance Constants
// Guide: Adjust all balance values in this file
// v4.5 Golden Balance — house edge 55% @ 5 players, 54% @ 10 players
// Monte Carlo simulation: tools/balance-v45-combined.js
// Per-pickaxe ROI 48-52% @5p, system steal ~4% @5p / ~2% @10p
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

// ========== Pickaxe Definitions (4 unique types + system) ==========
// v4.5 ROI @5p: basic ~52%, power ~51%, light ~51%, swift ~48%
// v4.5 ROI @10p: basic ~55%, power ~53%, light ~52%, swift ~51%
// System pickaxe deliberately small — low steal rate for fair play at low player counts
const PICKAXE_TYPES = {
  basic: {
    name: 'Basic Pickaxe',
    price: 1900,
    damage: 3,
    scale: 0.8,           // Small user pickaxe
    gravityMult: 1.0,
    speedMult: 1.0,
    lifetime: 30000,
    texture: 'wooden_pickaxe.png',
    color: '#8B6914',
    description: 'DMG 3 | 30s | Standard gravity & speed. A reliable all-rounder for beginners.',
  },
  power: {
    name: 'Power Pickaxe',
    price: 5400,
    damage: 5,
    scale: 1.0,           // Medium user pickaxe (biggest user pick)
    gravityMult: 1.0,
    speedMult: 1.0,
    lifetime: 30000,
    texture: 'diamond_pickaxe.png',
    color: '#00CED1',
    description: 'DMG 5 | 30s | Oversized head deals heavy damage. Best block-per-second ratio.',
  },
  light: {
    name: 'Light Pickaxe',
    price: 2400,
    damage: 4,
    scale: 0.7,           // Compact user pickaxe
    gravityMult: 0.5,
    speedMult: 1.0,
    lifetime: 35000,
    texture: 'golden_pickaxe.png',
    color: '#FFD700',
    description: 'DMG 4 | 35s | 0.5x gravity — floats slowly. Longest lifetime, stays airborne longer.',
  },
  swift: {
    name: 'Swift Pickaxe',
    price: 2400,
    damage: 3,
    scale: 0.75,          // Small-medium user pickaxe
    gravityMult: 1.0,
    speedMult: 1.6,
    lifetime: 25000,
    texture: 'iron_pickaxe.png',
    color: '#C0C0C0',
    description: 'DMG 3 | 25s | 1.6x speed — hits many more blocks. Lower damage but higher total output.',
  },
  system: {
    name: 'PIKIT',
    price: 0,
    damage: 6,             // Moderate damage — balanced steal
    scale: 0.5,            // Compact system pickaxe — low encounter rate for fair low-player-count games
    gravityMult: 0.7,      // Slightly slower fall
    speedMult: 0.55,       // Slower horizontal — reduced block competition
    lifetime: Infinity,    // Never expires — permanent house pickaxe
    texture: 'system_pickaxe.png',
    color: '#FF00FF',
    description: 'PIKIT house pickaxe — competes with players for blocks',
  }
};

// ========== TNT Definition (single type) ==========
// TNT only explodes on block contact, not by fuse timer
// v4.5: price 8000, damage 30 — utility item, ~3% ROI (unchanged from v4.4)
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

// ========== Block Definitions (10 types + bedrock) ==========
// v4.5: Block HP/rewards unchanged from v4.4
// Avg block reward ≈ 149 credits (weighted), avg HP ≈ 19
// NOTE: Chunk.js caches the block spawn pool on first use. After changing
// block weights here, a full server restart is required to invalidate that cache.
const BLOCK_TYPES = {
  // === 6 Credit Blocks (fixed reward, rarest = highest reward) ===
  jackpot: {
    name: 'Jackpot Block',
    hp: 300,               // Very tanky — requires sustained damage
    weight: 0,             // NOT in normal pool — special conditional spawn
    reward: 250000,        // 250K credits
    rewardType: 'fixed',
    color: '#FF00FF',
    texture: 'jackpot.png',
    tntResist: true,       // TNT can't 1-shot this
  },
  diamond_block: {
    name: 'Diamond Block',
    hp: 180,               // Very tanky (up from 150)
    weight: 1,             // 1% spawn
    reward: 5000,          // 5K credits
    rewardType: 'fixed',
    color: '#00CED1',
    texture: 'diamond_ore.png',
    tntResist: true,       // TNT can't 1-shot this
  },
  gold_block: {
    name: 'Gold Block',
    hp: 90,                // Tanky (up from 80)
    weight: 2,             // 2% spawn
    reward: 2000,          // 2K credits
    rewardType: 'fixed',
    color: '#FFD700',
    texture: 'gold_ore.png',
    tntResist: true,       // TNT can't 1-shot this
  },
  emerald_block: {
    name: 'Emerald Block',
    hp: 55,                // Moderate (up from 50)
    weight: 5,             // 5% spawn
    reward: 600,           // 600 credits
    rewardType: 'fixed',
    color: '#50C878',
    texture: 'emerald_ore.png',
  },
  iron_block: {
    name: 'Iron Block',
    hp: 32,                // Moderate (up from 30)
    weight: 12,            // 12% spawn
    reward: 150,           // 150 credits
    rewardType: 'fixed',
    color: '#BC8F8F',
    texture: 'iron_ore.png',
  },
  copper_block: {
    name: 'Copper Block',
    hp: 20,                // Light (up from 18)
    weight: 20,            // 20% spawn
    reward: 50,            // 50 credits
    rewardType: 'fixed',
    color: '#B87333',
    texture: 'copper_ore.png',
  },

  // === 4 Random Credit Blocks (1~3 credit reward) ===
  stone: {
    name: 'Stone',
    hp: 10,                // Same as v4.3
    weight: 20,            // 20% spawn
    reward: 3,             // max random
    rewardType: 'random',  // gives 1~3
    color: '#808080',
    texture: 'stone.png',
  },
  dirt: {
    name: 'Dirt',
    hp: 7,                 // Up from 6
    weight: 18,            // 18% spawn
    reward: 3,
    rewardType: 'random',  // gives 1~3
    color: '#8B5E3C',
    texture: 'dirt.png',
  },
  gravel: {
    name: 'Gravel',
    hp: 9,                 // Up from 8
    weight: 12,            // 12% spawn
    reward: 3,
    rewardType: 'random',  // gives 1~3
    color: '#696969',
    texture: 'cobblestone.png',
  },
  clay: {
    name: 'Clay',
    hp: 8,                 // Up from 7
    weight: 10,            // 10% spawn
    reward: 3,
    rewardType: 'random',  // gives 1~3
    color: '#A09070',
    texture: 'andesite.png',
  },

  // === Wall Block ===
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
// v4.5: unchanged from v4.3
const JACKPOT_CONFIG = {
  SPAWN_THRESHOLD: 1500000,  // 1.5M credits must be spent before jackpot can spawn
  SPAWN_CHANCE: 0.0005,      // 0.05% chance per eligible block position (down from 0.1%)
  REWARD: 250000,            // 250K credits (down from 1M — matches jackpot block reward)
  MIN_PLAYERS: 10,           // Minimum active players required for jackpot to be eligible
};

// ========== Combo System ==========
// v4.5: unchanged from v4.3 (max 1.5x)
const COMBO = {
  TIMEOUT: 2000,
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],  // Was [1, 1.2, 1.5, 2.0, 3.0, 5.0]
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

// House edge target — 55% at 5 players, 54% at 10 players (simulation-verified)
// Actual range: ~56% @5p, ~54% @10p, ~53% @20p, ~52% @40p
const HOUSE_EDGE = 0.55;

// Initial balance
const INITIAL_BALANCE = 10000;

module.exports = {
  GAME,
  PICKAXE_TYPES,
  TNT_TYPES,
  BLOCK_TYPES,
  JACKPOT_CONFIG,
  COMBO,
  HOUSE_EDGE,
  INITIAL_BALANCE,
};
