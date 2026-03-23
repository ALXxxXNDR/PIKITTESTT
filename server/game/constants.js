// ============================================
// PIKIT - Game Balance Constants
// Guide: Adjust all balance values in this file
// v4.8 Balance Update — adaptive sys pickaxe (max 4, weak mode), dynamic jackpot pool
// v4.7 Reward Distribution Rebalance — house edge 55% @ 5p, 54% @ 10p
// Common blocks: low HP (1-hit break) + meaningful rewards (22-28cr)
// 10K spending floor: P10 ~3,100cr (was ~2,000 in v4.6)
// Monte Carlo simulation: tools/balance-v47-sim.js, tools/balance-v47-final.js
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
// v4.7 ROI @5p:  basic ~49%, power ~45%, light ~47%, swift ~52%
// v4.7 ROI @10p: basic ~51%, power ~47%, light ~49%, swift ~53%
// Prices increased ~60% to compensate for higher common block rewards
// PIKIT system: large (1.5 blocks) but very slow — gentle block competition
const PICKAXE_TYPES = {
  basic: {
    name: 'Basic Pickaxe',
    price: 3200,
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
    price: 8300,
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
    price: 3700,
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
    price: 3400,
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
    damage: 5,             // Low damage — slow block destruction
    scale: 1.5,            // Large 1.5-block-size pickaxe — visually imposing
    gravityMult: 0.3,      // Ultra-slow fall — floats like a giant obstacle
    speedMult: 0.1,        // Barely moves horizontally — low encounter rate despite large size
    lifetime: Infinity,    // Never expires — permanent house pickaxe (anchor)
    texture: 'system_pickaxe.png',
    color: '#FF00FF',
    description: 'PIKIT house pickaxe — competes with players for blocks',
  },
  system_weak: {
    name: 'PIKIT',
    price: 0,
    damage: 5,
    scale: 0.8,
    gravityMult: 0.5,
    speedMult: 0.03,   // v4.8 sim-verified: 0.05→0.03 for HE ≤55% solo
    lifetime: 60000,
    texture: 'system_pickaxe.png',
    color: '#888888',
    description: 'PIKIT (Resting) — reduced activity in low-player mode',
  }
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

// ========== Block Definitions (10 types + bedrock) ==========
// v4.7: Common blocks — LOW HP (1-hit break) + MEANINGFUL rewards (22-28cr)
// v4.7: Rare blocks — slightly reduced rewards to compensate
// Avg block reward ≈ 115 credits (weighted), avg HP ≈ 5
// Players now earn steady small rewards from common blocks + occasional big wins
// NOTE: Chunk.js caches the block spawn pool on first use. After changing
// block weights here, a full server restart is required to invalidate that cache.
const BLOCK_TYPES = {
  // === 6 Credit Blocks (fixed reward, rarest = highest reward) ===
  jackpot: {
    name: 'Jackpot Block',
    hp: 1500,              // Raid boss — requires sustained team damage (was 300)
    weight: 0,             // NOT in normal pool — special conditional spawn
    reward: 250000,        // 250K credits (overridden by dynamic jackpotPool at runtime)
    rewardType: 'fixed',
    color: '#FF00FF',
    texture: 'jackpot.png',
    tntResist: true,       // TNT can't 1-shot this
  },
  diamond_block: {
    name: 'Diamond Block',
    hp: 180,               // Very tanky — unchanged
    weight: 1,             // 1% spawn
    reward: 4500,          // 4.5K credits (was 5000, -10%)
    rewardType: 'fixed',
    color: '#00CED1',
    texture: 'diamond_ore.png',
    tntResist: true,       // TNT can't 1-shot this
  },
  gold_block: {
    name: 'Gold Block',
    hp: 90,                // Tanky — unchanged
    weight: 2,             // 2% spawn
    reward: 1800,          // 1.8K credits (was 2000, -10%)
    rewardType: 'fixed',
    color: '#FFD700',
    texture: 'gold_ore.png',
    tntResist: true,       // TNT can't 1-shot this
  },
  emerald_block: {
    name: 'Emerald Block',
    hp: 55,                // Moderate — unchanged
    weight: 5,             // 5% spawn
    reward: 540,           // 540 credits (was 600, -10%)
    rewardType: 'fixed',
    color: '#50C878',
    texture: 'emerald_ore.png',
  },
  iron_block: {
    name: 'Iron Block',
    hp: 20,                // Easier to break (was 32, -37%)
    weight: 12,            // 12% spawn
    reward: 100,           // 100 credits (was 150, -33%)
    rewardType: 'fixed',
    color: '#BC8F8F',
    texture: 'iron_ore.png',
  },
  copper_block: {
    name: 'Copper Block',
    hp: 15,                // Easier to break (was 20, -25%)
    weight: 20,            // 20% spawn
    reward: 50,            // 50 credits — unchanged
    rewardType: 'fixed',
    color: '#B87333',
    texture: 'copper_ore.png',
  },

  // === 4 Common Blocks (fixed reward, 1-hit breakable with DMG 3) ===
  // v4.7: HP drastically reduced + rewards increased from 1~5 → 22~28 fixed
  // This ensures every block break gives meaningful credits
  stone: {
    name: 'Stone',
    hp: 3,                 // 1-hit with DMG 3 (was 10)
    weight: 20,            // 20% spawn
    reward: 28,            // 28 credits (was 1~5 random)
    rewardType: 'fixed',
    color: '#808080',
    texture: 'stone.png',
  },
  dirt: {
    name: 'Dirt',
    hp: 2,                 // 1-hit with DMG 3 (was 7)
    weight: 18,            // 18% spawn
    reward: 22,            // 22 credits (was 1~5 random)
    rewardType: 'fixed',
    color: '#8B5E3C',
    texture: 'dirt.png',
  },
  gravel: {
    name: 'Gravel',
    hp: 3,                 // 1-hit with DMG 3 (was 9)
    weight: 12,            // 12% spawn
    reward: 25,            // 25 credits (was 1~5 random)
    rewardType: 'fixed',
    color: '#696969',
    texture: 'cobblestone.png',
  },
  clay: {
    name: 'Clay',
    hp: 2,                 // 1-hit with DMG 3 (was 8)
    weight: 10,            // 10% spawn
    reward: 24,            // 24 credits (was 1~5 random)
    rewardType: 'fixed',
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
// v4.8: pool-based spawn condition, HP 1500, dynamic reward from jackpotPool
const JACKPOT_CONFIG = {
  SPAWN_THRESHOLD: 0,        // No longer used — replaced by pool-based condition
  SPAWN_CHANCE: 0.0001,      // 0.01% chance per eligible block position (was 0.05%)
  RESPAWN_CHANCE: 0.00001,   // 0.001% re-spawn chance after jackpot escapes viewport
  REWARD: 0,                 // Fixed reward deprecated — dynamic pool used instead
  HP: 1500,                  // Raid boss HP (was 300) — requires sustained team effort
  MIN_PLAYERS: 0,            // Player count condition removed (pool-based is sufficient)
};

// ========== Jackpot Pool Config ==========
// v4.8: house profit milestones feed the jackpot pool
const JACKPOT_POOL_CONFIG = {
  HOUSE_PROFIT_MILESTONE: 50000,  // Every 50,000cr of house profit triggers an allocation
  POOL_ALLOCATION: 2500,          // 2,500 credits added to jackpot pool per milestone
  MIN_POOL_TO_SPAWN: 50000,       // Pool must reach 50,000 before jackpot block can spawn
};

// ========== Combo System ==========
// v4.7: unchanged from v4.3 (max 1.5x)
const COMBO = {
  TIMEOUT: 2000,
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],  // Was [1, 1.2, 1.5, 2.0, 3.0, 5.0]
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

// House edge target — v4.8 simulation-verified (tools/balance-v48-sim.js)
// Actual range: ~54% @1p, ~53% @2-15p, ~52% @20-30p, ~51% @50p, ~51% @80-100p
// system_weak speedMult=0.03 (was 0.05) — keeps solo HE ≤55%
// DYNAMIC_SYSTEM_RATIO_THRESHOLDS in GameEngine.js updated for tighter control
const HOUSE_EDGE = 0.53;

// Initial balance
const INITIAL_BALANCE = 10000;

module.exports = {
  GAME,
  PICKAXE_TYPES,
  TNT_TYPES,
  BLOCK_TYPES,
  JACKPOT_CONFIG,
  JACKPOT_POOL_CONFIG,
  COMBO,
  HOUSE_EDGE,
  INITIAL_BALANCE,
};
