#!/usr/bin/env node
/**
 * PIKIT Balance Simulator — Monte Carlo simulation
 * Models pickaxe physics, block HP/rewards, system pickaxe competition,
 * combo system, TNT economy to calculate precise house edge.
 *
 * Usage: node tools/balance-simulator.js [--iterations 50000] [--players 20]
 */

// ============ Import current constants (copy for simulation) ============
const GAME = {
  TICK_RATE: 60,
  INTERNAL_WIDTH: 1080,
  INTERNAL_HEIGHT: 1920,
  BLOCK_SIZE: 120,
  CHUNK_WIDTH: 8,
  CHUNK_HEIGHT: 16,
  WALL_THICKNESS: 60,
  GRAVITY: 400,
  TERMINAL_VELOCITY: 450,
};

const PICKAXE_TYPES = {
  basic:  { price: 2500, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 6, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 35000 },
  light:  { price: 4000, damage: 5, scale: 0.65, gravityMult: 0.5, speedMult: 1.0, lifetime: 30000 },
  swift:  { price: 3500, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.8, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 2.0,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
};

const BLOCK_TYPES = {
  diamond_block: { hp: 150, weight: 1,  reward: 5000, rewardType: 'fixed', tntResist: true },
  gold_block:    { hp: 80,  weight: 2,  reward: 2000, rewardType: 'fixed', tntResist: true },
  emerald_block: { hp: 50,  weight: 5,  reward: 600,  rewardType: 'fixed' },
  iron_block:    { hp: 30,  weight: 12, reward: 150,  rewardType: 'fixed' },
  copper_block:  { hp: 18,  weight: 20, reward: 50,   rewardType: 'fixed' },
  stone:         { hp: 10,  weight: 20, reward: 3,    rewardType: 'random' },  // 1~3
  dirt:          { hp: 6,   weight: 18, reward: 3,    rewardType: 'random' },
  gravel:        { hp: 8,   weight: 12, reward: 3,    rewardType: 'random' },
  clay:          { hp: 7,   weight: 10, reward: 3,    rewardType: 'random' },
};

const COMBO = {
  TIMEOUT: 2000,
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

const TNT = { price: 15000, damage: 25, radiusX: 2, radiusDown: 3 };

// ============ Build weighted block pool ============
function buildBlockPool() {
  const pool = [];
  const totalWeight = Object.values(BLOCK_TYPES).reduce((s, b) => s + b.weight, 0);
  for (const [type, def] of Object.entries(BLOCK_TYPES)) {
    pool.push({ type, ...def, probability: def.weight / totalWeight });
  }
  return pool;
}

function pickRandomBlock(pool) {
  const r = Math.random();
  let cum = 0;
  for (const b of pool) {
    cum += b.probability;
    if (r <= cum) return b;
  }
  return pool[pool.length - 1];
}

function getBlockReward(block) {
  if (block.rewardType === 'random') {
    return Math.floor(Math.random() * block.reward) + 1;
  }
  return block.reward;
}

// ============ Physics Simulation ============
// Simulate a single pickaxe's lifetime, counting blocks destroyed and rewards earned
function simulatePickaxeLifetime(pickType, blockPool, competitionFactor) {
  const def = PICKAXE_TYPES[pickType];
  const dt = 1 / GAME.TICK_RATE;

  // Physics state
  let vy = 0;
  let vx = (Math.random() * 200 - 100) * def.speedMult;  // Initial random horizontal
  const gravity = GAME.GRAVITY * def.gravityMult;
  const termVel = GAME.TERMINAL_VELOCITY * (def.gravityMult < 1 ? 0.7 : 1.0);
  const hitboxSize = GAME.BLOCK_SIZE * def.scale;
  const restitution = 0.75;
  const bounceEnergy = 200 * def.speedMult;

  // Block encounter model:
  // In a field of 8 columns x 16 rows per chunk, blocks are 120px apart.
  // A pickaxe falling at some speed hits blocks at a rate determined by:
  //   - vertical speed → how fast it encounters new rows
  //   - horizontal speed → how many columns it covers (bounce pattern)
  //   - hitbox size → collision probability per block

  // Simplified physics: track y position, detect "block encounters" per row
  let y = 0;
  let lastBlockRow = -1;
  let totalReward = 0;
  let blocksDestroyed = 0;
  let combo = 0;
  let lastHitTime = 0;
  let elapsed = 0;
  let hitPoints = {}; // Track partial damage to blocks

  // Simulate at game tick rate
  const maxTicks = def.lifetime === Infinity ?
    60 * GAME.TICK_RATE :  // 60 seconds for system pickaxe simulation
    (def.lifetime / 1000) * GAME.TICK_RATE;

  // Block encounter rate model:
  // Pickaxe bounces between blocks. Each "encounter" takes some time
  // based on vertical distance between blocks and current speed.
  // Average vertical distance between block rows = BLOCK_SIZE = 120px
  // Average time per row = 120 / avg_vy

  // More realistic approach: simulate tick by tick
  let blockEncounterY = GAME.BLOCK_SIZE; // First block row
  let consecutiveHits = 0;

  for (let tick = 0; tick < maxTicks; tick++) {
    elapsed = tick / GAME.TICK_RATE;

    // Apply gravity
    vy += gravity * dt;
    if (vy > termVel) vy = termVel;

    // Air resistance on horizontal
    vx *= 0.995;

    // Move
    y += vy * dt;

    // Wall bounce (simplified: just reverse vx occasionally)
    if (Math.random() < 0.02 * Math.abs(vx) / 200) {
      vx = -vx * 0.8;
    }

    // Check if we've reached the next block row
    const currentRow = Math.floor(y / GAME.BLOCK_SIZE);
    if (currentRow > lastBlockRow) {
      // Encounter blocks in this row
      // Probability of hitting a block depends on hitbox coverage
      const hitProbability = Math.min(1.0, (hitboxSize / GAME.BLOCK_SIZE) * 1.2);
      // Horizontal coverage: wider hitbox + speed = more column coverage
      const colsCovered = Math.min(GAME.CHUNK_WIDTH,
        Math.ceil(hitboxSize / GAME.BLOCK_SIZE) + Math.abs(vx) * dt / GAME.BLOCK_SIZE);

      // How many blocks can be in this row (8 cols, minus some destroyed)
      const blockDensity = 0.85; // ~85% of columns have blocks (some empty gaps)

      for (let col = 0; col < Math.min(colsCovered, 2); col++) {
        if (Math.random() < hitProbability * blockDensity) {
          // Hit a block!
          const block = pickRandomBlock(blockPool);

          // Competition: system pickaxe or other players may have already damaged/destroyed this
          if (Math.random() < competitionFactor) {
            // Block was "stolen" by competition
            lastBlockRow = currentRow;
            continue;
          }

          // Calculate hits needed
          const hitsNeeded = Math.ceil(block.hp / def.damage);

          // Time to destroy this block (hits happen each bounce cycle)
          // Average bounce cycle time ≈ 2 * hitboxSize / (vy + bounceEnergy)
          const avgBounceTime = 0.3; // ~0.3 seconds per bounce cycle (estimated)
          const timeToDestroy = hitsNeeded * avgBounceTime;

          // Can we destroy it in remaining lifetime?
          const remainingTime = (maxTicks - tick) / GAME.TICK_RATE;

          if (timeToDestroy <= remainingTime && hitsNeeded <= 20) {
            // Block destroyed!
            const reward = getBlockReward(block);

            // Combo
            if (elapsed - lastHitTime < COMBO.TIMEOUT / 1000) {
              consecutiveHits++;
            } else {
              consecutiveHits = 1;
            }
            lastHitTime = elapsed;

            // Find combo multiplier
            let comboMult = COMBO.MULTIPLIERS[0];
            for (let i = COMBO.THRESHOLDS.length - 1; i >= 0; i--) {
              if (consecutiveHits >= COMBO.THRESHOLDS[i]) {
                comboMult = COMBO.MULTIPLIERS[i];
                break;
              }
            }

            totalReward += Math.round(reward * comboMult);
            blocksDestroyed++;

            // Skip forward in time for the hits
            tick += Math.floor(timeToDestroy * GAME.TICK_RATE * 0.5);

            // Bounce after block destruction
            vy = -bounceEnergy * (0.5 + Math.random() * 0.5);
            vx += (Math.random() - 0.5) * bounceEnergy;
          } else if (hitsNeeded > 20) {
            // Block too tanky, bounce off with partial damage
            vy = -vy * restitution;
            vx += (Math.random() - 0.5) * bounceEnergy * 0.5;
          }

          lastBlockRow = currentRow;
          break; // One block per row encounter
        }
      }
      lastBlockRow = currentRow;
    }
  }

  return { totalReward, blocksDestroyed, elapsed };
}

// ============ Detailed Block-Level Simulation ============
// More accurate: simulate exact damage-per-hit and block encounters
function simulatePickaxeDetailed(pickType, blockPool, systemStealRate) {
  const def = PICKAXE_TYPES[pickType];
  const lifetimeSec = def.lifetime === Infinity ? 60 : def.lifetime / 1000;

  // Model: pickaxe encounters blocks at a rate based on its physics
  // Key factors:
  //   - Gravity/speed → determines how fast pickaxe moves through field
  //   - Scale → hitbox size determines encounter rate
  //   - Bounce mechanics → determines how long pickaxe stays in block-rich area

  // Estimated block encounter rate (blocks encountered per second)
  // Based on physics analysis:
  // - Basic (1.0 grav, 1.0 spd, 0.8 scale): ~2.5 encounters/sec
  // - Power (1.0 grav, 1.0 spd, 1.0 scale): ~3.0 encounters/sec
  // - Light (0.5 grav, 1.0 spd, 0.65 scale): ~1.5 encounters/sec (slow fall = more time, but less area)
  // - Swift (1.0 grav, 1.8 spd, 0.75 scale): ~4.0 encounters/sec (fast = more encounters)
  // - System (0.7 grav, 1.5 spd, 2.0 scale): ~5.0 encounters/sec (huge hitbox + fast)

  const encounterRates = {
    basic: 2.5,
    power: 3.0,
    light: 1.8,  // Slow but stays in air longer
    swift: 4.0,  // Fast horizontal coverage
    system: 5.0, // Large hitbox + fast
  };

  const encounterRate = encounterRates[pickType] || 2.5;
  const totalEncounters = Math.floor(encounterRate * lifetimeSec);

  let totalReward = 0;
  let blocksDestroyed = 0;
  let consecutiveHits = 0;
  let currentBlockHP = 0;
  let currentBlock = null;
  let hitsOnCurrentBlock = 0;

  for (let i = 0; i < totalEncounters; i++) {
    // System pickaxe steal chance
    if (Math.random() < systemStealRate) {
      consecutiveHits = 0;
      continue;
    }

    // Pick a new block to encounter (or continue hitting current one)
    if (currentBlockHP <= 0) {
      currentBlock = pickRandomBlock(blockPool);
      currentBlockHP = currentBlock.hp;
      hitsOnCurrentBlock = 0;
    }

    // Deal damage
    currentBlockHP -= def.damage;
    hitsOnCurrentBlock++;

    // If block destroyed
    if (currentBlockHP <= 0) {
      const reward = getBlockReward(currentBlock);

      // Combo
      consecutiveHits++;
      let comboMult = COMBO.MULTIPLIERS[0];
      for (let j = COMBO.THRESHOLDS.length - 1; j >= 0; j--) {
        if (consecutiveHits >= COMBO.THRESHOLDS[j]) {
          comboMult = COMBO.MULTIPLIERS[j];
          break;
        }
      }

      totalReward += Math.round(reward * comboMult);
      blocksDestroyed++;
      currentBlockHP = 0; // Next encounter gets new block
    }

    // Occasionally break combo (pickaxe bounces away, misses)
    if (currentBlockHP <= 0 && Math.random() < 0.15) {
      consecutiveHits = 0;
    }
  }

  return { totalReward, blocksDestroyed };
}

// ============ TNT Simulation ============
function simulateTNT(blockPool) {
  // TNT hits ~5 wide x 4 down = ~20 blocks in explosion radius
  // Some blocks are bedrock (wall), some already destroyed
  const blocksInRadius = (TNT.radiusX * 2 + 1) * (TNT.radiusDown + TNT.radiusX + 1);
  const effectiveBlocks = Math.floor(blocksInRadius * 0.7); // ~70% are actual blocks

  let totalReward = 0;
  let destroyed = 0;

  for (let i = 0; i < effectiveBlocks; i++) {
    const block = pickRandomBlock(blockPool);
    const effectiveDamage = block.tntResist ? Math.floor(TNT.damage * 0.4) : TNT.damage;

    if (effectiveDamage >= block.hp) {
      totalReward += getBlockReward(block);
      destroyed++;
    }
  }

  return { totalReward, destroyed, cost: TNT.price };
}

// ============ Main Simulation ============
function runSimulation(iterations = 50000, playerCount = 20) {
  const blockPool = buildBlockPool();

  // System pickaxe steal rate depends on player count
  // 1 system pickaxe vs N player pickaxes (max 3 each)
  // System encounters ~5/sec, each player pickaxe ~2.5-4/sec
  // Average player pickaxes active: ~1.5 per player (not always buying)
  const avgPlayerPickaxes = playerCount * 1.5;
  const systemEncounterShare = 5.0 / (5.0 + avgPlayerPickaxes * 3.0);
  const systemStealRate = systemEncounterShare; // Probability system gets a block instead of player

  console.log('\n========================================');
  console.log('  PIKIT Balance Simulator v1.0');
  console.log('========================================');
  console.log(`Iterations: ${iterations}`);
  console.log(`Simulated players: ${playerCount}`);
  console.log(`System steal rate: ${(systemStealRate * 100).toFixed(1)}%`);
  console.log('');

  // Weighted average block reward
  let avgBlockReward = 0;
  for (const b of blockPool) {
    const avgReward = b.rewardType === 'random' ? (b.reward + 1) / 2 : b.reward;
    avgBlockReward += avgReward * b.probability;
  }
  console.log(`Weighted avg block reward: ${avgBlockReward.toFixed(1)} credits`);

  // Weighted average block HP
  let avgBlockHP = 0;
  for (const b of blockPool) {
    avgBlockHP += b.hp * b.probability;
  }
  console.log(`Weighted avg block HP: ${avgBlockHP.toFixed(1)}`);
  console.log('');

  // ========== Per-pickaxe simulation ==========
  const pickTypes = ['basic', 'power', 'light', 'swift'];
  const results = {};

  for (const type of pickTypes) {
    const def = PICKAXE_TYPES[type];
    let totalRewardSum = 0;
    let totalBlocksSum = 0;

    for (let i = 0; i < iterations; i++) {
      const result = simulatePickaxeDetailed(type, blockPool, systemStealRate);
      totalRewardSum += result.totalReward;
      totalBlocksSum += result.blocksDestroyed;
    }

    const avgReward = totalRewardSum / iterations;
    const avgBlocks = totalBlocksSum / iterations;
    const roi = avgReward / def.price;
    const playerReturn = roi;

    results[type] = { avgReward, avgBlocks, roi, price: def.price };

    console.log(`--- ${type.toUpperCase()} (price: ${def.price}, dmg: ${def.damage}, lifetime: ${def.lifetime/1000}s) ---`);
    console.log(`  Avg blocks destroyed: ${avgBlocks.toFixed(1)}`);
    console.log(`  Avg reward earned: ${avgReward.toFixed(0)} credits`);
    console.log(`  ROI: ${(roi * 100).toFixed(1)}% (player return)`);
    console.log(`  House edge per pickaxe: ${((1 - roi) * 100).toFixed(1)}%`);
    console.log('');
  }

  // ========== TNT simulation ==========
  let tntRewardSum = 0;
  let tntBlocksSum = 0;
  for (let i = 0; i < iterations; i++) {
    const result = simulateTNT(blockPool);
    tntRewardSum += result.totalReward;
    tntBlocksSum += result.destroyed;
  }
  const tntAvgReward = tntRewardSum / iterations;
  const tntAvgBlocks = tntBlocksSum / iterations;
  const tntROI = tntAvgReward / TNT.price;

  console.log(`--- TNT (price: ${TNT.price}, dmg: ${TNT.damage}) ---`);
  console.log(`  Avg blocks destroyed: ${tntAvgBlocks.toFixed(1)}`);
  console.log(`  Avg reward: ${tntAvgReward.toFixed(0)} credits`);
  console.log(`  ROI: ${(tntROI * 100).toFixed(1)}%`);
  console.log(`  House edge per TNT: ${((1 - tntROI) * 100).toFixed(1)}%`);
  console.log('');

  // ========== Blended house edge ==========
  // Assume purchase distribution:
  // Players tend to buy cheaper pickaxes more often
  // Estimated purchase mix: basic 35%, power 15%, light 20%, swift 25%, TNT 5%
  const purchaseMix = {
    basic: 0.35,
    power: 0.15,
    light: 0.20,
    swift: 0.25,
    tnt: 0.05,
  };

  let blendedSpend = 0;
  let blendedReturn = 0;

  for (const [type, weight] of Object.entries(purchaseMix)) {
    if (type === 'tnt') {
      blendedSpend += TNT.price * weight;
      blendedReturn += tntAvgReward * weight;
    } else {
      blendedSpend += PICKAXE_TYPES[type].price * weight;
      blendedReturn += results[type].avgReward * weight;
    }
  }

  const blendedROI = blendedReturn / blendedSpend;
  const houseEdge = 1 - blendedROI;

  console.log('========================================');
  console.log('  BLENDED RESULTS');
  console.log('========================================');
  console.log(`Purchase mix: basic ${purchaseMix.basic*100}%, power ${purchaseMix.power*100}%, light ${purchaseMix.light*100}%, swift ${purchaseMix.swift*100}%, TNT ${purchaseMix.tnt*100}%`);
  console.log(`Blended avg spend: ${blendedSpend.toFixed(0)} credits`);
  console.log(`Blended avg return: ${blendedReturn.toFixed(0)} credits`);
  console.log(`Blended ROI: ${(blendedROI * 100).toFixed(2)}%`);
  console.log(`\n>>> HOUSE EDGE: ${(houseEdge * 100).toFixed(2)}% <<<`);
  console.log(`>>> Target: 54-55% <<<`);
  console.log('');

  // ========== Sensitivity Analysis ==========
  console.log('========================================');
  console.log('  SENSITIVITY: Player count impact');
  console.log('========================================');
  for (const pc of [3, 5, 10, 20, 40, 80]) {
    const avgPP = pc * 1.5;
    const steal = 5.0 / (5.0 + avgPP * 3.0);

    let bSpend = 0, bReturn = 0;
    for (const [type, weight] of Object.entries(purchaseMix)) {
      if (type === 'tnt') {
        bSpend += TNT.price * weight;
        // TNT not affected by steal
        let tR = 0;
        for (let i = 0; i < 5000; i++) {
          tR += simulateTNT(blockPool).totalReward;
        }
        bReturn += (tR / 5000) * weight;
      } else {
        bSpend += PICKAXE_TYPES[type].price * weight;
        let tR = 0;
        for (let i = 0; i < 5000; i++) {
          tR += simulatePickaxeDetailed(type, blockPool, steal).totalReward;
        }
        bReturn += (tR / 5000) * weight;
      }
    }
    const he = 1 - (bReturn / bSpend);
    console.log(`  ${pc} players: steal ${(steal*100).toFixed(1)}%, house edge ${(he*100).toFixed(1)}%`);
  }

  return { results, tntROI, blendedROI, houseEdge };
}

// Run
const args = process.argv.slice(2);
let iterations = 50000;
let players = 20;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--iterations' && args[i+1]) iterations = parseInt(args[i+1]);
  if (args[i] === '--players' && args[i+1]) players = parseInt(args[i+1]);
}

runSimulation(iterations, players);
