#!/usr/bin/env node
/**
 * PIKIT Balance Tuner — Tests proposed balance changes against current
 * Targets: each pickaxe 42-48% ROI, blended 54-55% house edge
 */

const GAME = {
  BLOCK_SIZE: 120,
  CHUNK_WIDTH: 8,
  GRAVITY: 400,
  TERMINAL_VELOCITY: 450,
};

const COMBO = {
  TIMEOUT: 2000,
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

function buildBlockPool(blockTypes) {
  const pool = [];
  const totalWeight = Object.values(blockTypes).reduce((s, b) => s + b.weight, 0);
  for (const [type, def] of Object.entries(blockTypes)) {
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
  if (block.rewardType === 'random') return Math.floor(Math.random() * block.reward) + 1;
  return block.reward;
}

function simulatePickaxe(pickType, def, blockPool, systemStealRate, encounterRate) {
  const lifetimeSec = def.lifetime / 1000;
  const totalEncounters = Math.floor(encounterRate * lifetimeSec);

  let totalReward = 0;
  let blocksDestroyed = 0;
  let consecutiveHits = 0;
  let currentBlockHP = 0;
  let currentBlock = null;

  for (let i = 0; i < totalEncounters; i++) {
    if (Math.random() < systemStealRate) {
      consecutiveHits = 0;
      continue;
    }

    if (currentBlockHP <= 0) {
      currentBlock = pickRandomBlock(blockPool);
      currentBlockHP = currentBlock.hp;
    }

    currentBlockHP -= def.damage;

    if (currentBlockHP <= 0) {
      const reward = getBlockReward(currentBlock);
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
      currentBlockHP = 0;
    }

    if (currentBlockHP <= 0 && Math.random() < 0.15) {
      consecutiveHits = 0;
    }
  }

  return { totalReward, blocksDestroyed };
}

function simulateTNT(tntDef, blockPool) {
  const blocksInRadius = (tntDef.radiusX * 2 + 1) * (tntDef.radiusDown + tntDef.radiusX + 1);
  const effectiveBlocks = Math.floor(blocksInRadius * 0.7);

  let totalReward = 0;
  for (let i = 0; i < effectiveBlocks; i++) {
    const block = pickRandomBlock(blockPool);
    const effectiveDamage = block.tntResist ? Math.floor(tntDef.damage * 0.4) : tntDef.damage;
    if (effectiveDamage >= block.hp) {
      totalReward += getBlockReward(block);
    }
  }
  return totalReward;
}

function testConfig(label, pickaxes, blocks, tntDef, systemDmg, iterations = 40000) {
  const blockPool = buildBlockPool(blocks);

  // Encounter rates based on physics
  const encounterRates = {};
  for (const [type, def] of Object.entries(pickaxes)) {
    if (type === 'system') continue;
    // Base encounter rate ≈ 2.0, modified by scale, speed, gravity
    const baseRate = 2.0;
    const scaleBonus = def.scale / 0.8; // Bigger = more encounters
    const speedBonus = def.speedMult;
    const gravPenalty = def.gravityMult < 1 ? 0.8 : 1.0; // Low grav = fewer encounters (slower)
    encounterRates[type] = baseRate * scaleBonus * speedBonus * gravPenalty;
  }

  // System steal rate (20 players assumed)
  const playerCount = 20;
  const avgPlayerPickaxes = playerCount * 1.5;
  const systemRate = 2.0 * (pickaxes.system.scale / 0.8) * pickaxes.system.speedMult * (pickaxes.system.gravityMult < 1 ? 0.8 : 1.0);
  const systemStealRate = systemRate / (systemRate + avgPlayerPickaxes * 3.0);

  // Avg block reward
  let avgBlockReward = 0;
  for (const b of blockPool) {
    avgBlockReward += (b.rewardType === 'random' ? (b.reward + 1) / 2 : b.reward) * b.probability;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`System steal: ${(systemStealRate * 100).toFixed(1)}%, Avg block reward: ${avgBlockReward.toFixed(1)}`);

  const results = {};
  const pickTypes = Object.keys(pickaxes).filter(t => t !== 'system');

  for (const type of pickTypes) {
    const def = pickaxes[type];
    const rate = encounterRates[type];
    let totalRewardSum = 0, totalBlocksSum = 0;

    for (let i = 0; i < iterations; i++) {
      const r = simulatePickaxe(type, def, blockPool, systemStealRate, rate);
      totalRewardSum += r.totalReward;
      totalBlocksSum += r.blocksDestroyed;
    }

    const avgReward = totalRewardSum / iterations;
    const avgBlocks = totalBlocksSum / iterations;
    const roi = avgReward / def.price;
    results[type] = { avgReward, avgBlocks, roi, price: def.price };

    const bar = '█'.repeat(Math.round(roi * 50));
    console.log(`  ${type.padEnd(6)} | ${def.price.toString().padStart(5)} cr | DMG ${def.damage} | ${(def.lifetime/1000).toString().padStart(3)}s | enc ${rate.toFixed(1)}/s | blocks ${avgBlocks.toFixed(1).padStart(5)} | reward ${avgReward.toFixed(0).padStart(5)} | ROI ${(roi*100).toFixed(1).padStart(5)}% | ${bar}`);
  }

  // TNT
  let tntRewardSum = 0;
  for (let i = 0; i < iterations; i++) {
    tntRewardSum += simulateTNT(tntDef, blockPool);
  }
  const tntAvgReward = tntRewardSum / iterations;
  const tntROI = tntAvgReward / tntDef.price;
  console.log(`  ${'tnt'.padEnd(6)} | ${tntDef.price.toString().padStart(5)} cr | DMG ${tntDef.damage} | AoE     | radius ${tntDef.radiusX}x${tntDef.radiusDown}   | reward ${tntAvgReward.toFixed(0).padStart(5)} | ROI ${(tntROI*100).toFixed(1).padStart(5)}%`);

  // Blended (basic 35%, swift 25%, light 20%, power 15%, TNT 5%)
  const mix = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };
  let bSpend = 0, bReturn = 0;
  for (const [t, w] of Object.entries(mix)) {
    if (t === 'tnt') { bSpend += tntDef.price * w; bReturn += tntAvgReward * w; }
    else { bSpend += pickaxes[t].price * w; bReturn += results[t].avgReward * w; }
  }
  const houseEdge = 1 - (bReturn / bSpend);

  console.log(`  ─────────────────────────────────────────────────────────────`);
  console.log(`  Blended: spend ${bSpend.toFixed(0)}, return ${bReturn.toFixed(0)}, ROI ${((bReturn/bSpend)*100).toFixed(1)}%`);
  console.log(`  >>> HOUSE EDGE: ${(houseEdge * 100).toFixed(2)}% <<<`);

  // Player count sensitivity
  console.log(`  Player count sensitivity:`);
  for (const pc of [3, 10, 20, 40, 80]) {
    const ap = pc * 1.5;
    const steal = systemRate / (systemRate + ap * 3.0);
    let s = 0, r = 0;
    for (const [t, w] of Object.entries(mix)) {
      if (t === 'tnt') { s += tntDef.price * w; r += tntAvgReward * w; continue; }
      const rate = encounterRates[t];
      let tR = 0;
      for (let i = 0; i < 5000; i++) tR += simulatePickaxe(t, pickaxes[t], blockPool, steal, rate).totalReward;
      s += pickaxes[t].price * w;
      r += (tR / 5000) * w;
    }
    console.log(`    ${pc.toString().padStart(2)} players → house edge ${((1 - r/s)*100).toFixed(1)}%`);
  }

  return { results, tntROI, houseEdge };
}

// ============ CURRENT CONFIG ============
const CURRENT_PICKS = {
  basic:  { price: 2500, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 6, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 35000 },
  light:  { price: 4000, damage: 5, scale: 0.65, gravityMult: 0.5, speedMult: 1.0, lifetime: 30000 },
  swift:  { price: 3500, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.8, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 2.0,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
};

const CURRENT_BLOCKS = {
  diamond_block: { hp: 150, weight: 1,  reward: 5000, rewardType: 'fixed', tntResist: true },
  gold_block:    { hp: 80,  weight: 2,  reward: 2000, rewardType: 'fixed', tntResist: true },
  emerald_block: { hp: 50,  weight: 5,  reward: 600,  rewardType: 'fixed' },
  iron_block:    { hp: 30,  weight: 12, reward: 150,  rewardType: 'fixed' },
  copper_block:  { hp: 18,  weight: 20, reward: 50,   rewardType: 'fixed' },
  stone:         { hp: 10,  weight: 20, reward: 3,    rewardType: 'random' },
  dirt:          { hp: 6,   weight: 18, reward: 3,    rewardType: 'random' },
  gravel:        { hp: 8,   weight: 12, reward: 3,    rewardType: 'random' },
  clay:          { hp: 7,   weight: 10, reward: 3,    rewardType: 'random' },
};

const CURRENT_TNT = { price: 15000, damage: 25, radiusX: 2, radiusDown: 3 };

// ============ PROPOSED CONFIG v1 ============
// Key changes: Power nerfed, Light buffed, System stronger, TNT cheaper
const PROPOSED_V1_PICKS = {
  basic:  { price: 2500, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 6000, damage: 4, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 28000 },
  light:  { price: 3000, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 3500, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.8, lifetime: 25000 },
  system: { price: 0,    damage: 10,scale: 2.0,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
};

const PROPOSED_V1_BLOCKS = {
  diamond_block: { hp: 150, weight: 1,  reward: 5000, rewardType: 'fixed', tntResist: true },
  gold_block:    { hp: 80,  weight: 2,  reward: 2000, rewardType: 'fixed', tntResist: true },
  emerald_block: { hp: 50,  weight: 5,  reward: 600,  rewardType: 'fixed' },
  iron_block:    { hp: 30,  weight: 12, reward: 150,  rewardType: 'fixed' },
  copper_block:  { hp: 18,  weight: 20, reward: 50,   rewardType: 'fixed' },
  stone:         { hp: 10,  weight: 20, reward: 3,    rewardType: 'random' },
  dirt:          { hp: 6,   weight: 18, reward: 3,    rewardType: 'random' },
  gravel:        { hp: 8,   weight: 12, reward: 3,    rewardType: 'random' },
  clay:          { hp: 7,   weight: 10, reward: 3,    rewardType: 'random' },
};

const PROPOSED_V1_TNT = { price: 8000, damage: 25, radiusX: 2, radiusDown: 3 };

// ============ PROPOSED CONFIG v2 ============
// Further tune: Power higher price, swift slightly adjusted, blocks tweaked
const PROPOSED_V2_PICKS = {
  basic:  { price: 2000, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 7000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 25000 },
  light:  { price: 3000, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 3000, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 10,scale: 2.0,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
};

const PROPOSED_V2_BLOCKS = {
  diamond_block: { hp: 180, weight: 1,  reward: 5000, rewardType: 'fixed', tntResist: true },
  gold_block:    { hp: 100, weight: 2,  reward: 2000, rewardType: 'fixed', tntResist: true },
  emerald_block: { hp: 60,  weight: 5,  reward: 600,  rewardType: 'fixed' },
  iron_block:    { hp: 35,  weight: 12, reward: 150,  rewardType: 'fixed' },
  copper_block:  { hp: 20,  weight: 20, reward: 50,   rewardType: 'fixed' },
  stone:         { hp: 12,  weight: 20, reward: 3,    rewardType: 'random' },
  dirt:          { hp: 6,   weight: 18, reward: 3,    rewardType: 'random' },
  gravel:        { hp: 8,   weight: 12, reward: 3,    rewardType: 'random' },
  clay:          { hp: 7,   weight: 10, reward: 3,    rewardType: 'random' },
};

const PROPOSED_V2_TNT = { price: 8000, damage: 30, radiusX: 2, radiusDown: 3 };

// ============ PROPOSED CONFIG v3 (fine-tune) ============
const PROPOSED_V3_PICKS = {
  basic:  { price: 2000, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 28000 },
  power:  { price: 7500, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 25000 },
  light:  { price: 3500, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 3000, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 22000 },
  system: { price: 0,    damage: 10,scale: 2.0,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
};

const PROPOSED_V3_BLOCKS = PROPOSED_V2_BLOCKS;

const PROPOSED_V3_TNT = { price: 8000, damage: 30, radiusX: 2, radiusDown: 3 };

// ============ RUN ALL ============
console.log('PIKIT Balance Tuner — Comparing configurations\n');

testConfig('CURRENT VALUES', CURRENT_PICKS, CURRENT_BLOCKS, CURRENT_TNT, 8);
testConfig('PROPOSED v1: Power nerfed, Light buffed, TNT cheaper', PROPOSED_V1_PICKS, PROPOSED_V1_BLOCKS, PROPOSED_V1_TNT, 10);
testConfig('PROPOSED v2: Prices adjusted, Block HP up, TNT buffed', PROPOSED_V2_PICKS, PROPOSED_V2_BLOCKS, PROPOSED_V2_TNT, 10);
testConfig('PROPOSED v3: Fine-tuned all pickaxes', PROPOSED_V3_PICKS, PROPOSED_V3_BLOCKS, PROPOSED_V3_TNT, 10);
