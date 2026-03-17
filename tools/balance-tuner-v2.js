#!/usr/bin/env node
/**
 * PIKIT Balance Tuner v2 — Calibrated encounter rates
 * Encounter rates calibrated against actual game physics simulation
 * Base rate = 2.5 hits/sec, scaled by hitbox size, speed, gravity
 */

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
  for (const b of pool) { cum += b.probability; if (r <= cum) return b; }
  return pool[pool.length - 1];
}

function getBlockReward(block) {
  return block.rewardType === 'random' ? Math.floor(Math.random() * block.reward) + 1 : block.reward;
}

// Calibrated encounter rate formula
// Base rate 2.5 represents a standard-sized (scale 0.8) pickaxe with normal gravity & speed
function calcEncounterRate(def) {
  const BASE_RATE = 2.5;
  // Scale > 0.8 → bigger hitbox → more encounters (linear)
  const scaleMultiplier = def.scale / 0.8;
  // Speed multiplier increases horizontal coverage
  const speedMultiplier = Math.pow(def.speedMult, 0.7); // Diminishing returns
  // Low gravity → slower fall → fewer encounters per second (but not as harsh as linear)
  const gravityMultiplier = Math.pow(def.gravityMult, 0.3);
  return BASE_RATE * scaleMultiplier * speedMultiplier * gravityMultiplier;
}

function simulatePickaxe(def, blockPool, systemStealRate, encounterRate) {
  const lifetimeSec = def.lifetime === Infinity ? 60 : def.lifetime / 1000;
  const totalEncounters = Math.floor(encounterRate * lifetimeSec);

  let totalReward = 0, blocksDestroyed = 0, consecutiveHits = 0;
  let currentBlockHP = 0, currentBlock = null;

  for (let i = 0; i < totalEncounters; i++) {
    if (Math.random() < systemStealRate) { consecutiveHits = 0; continue; }
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
        if (consecutiveHits >= COMBO.THRESHOLDS[j]) { comboMult = COMBO.MULTIPLIERS[j]; break; }
      }
      totalReward += Math.round(reward * comboMult);
      blocksDestroyed++;
      currentBlockHP = 0;
    }
    // 15% chance to break combo between blocks (bounce away)
    if (currentBlockHP <= 0 && Math.random() < 0.15) consecutiveHits = 0;
  }
  return { totalReward, blocksDestroyed };
}

function simulateTNT(tntDef, blockPool) {
  const blocksInRadius = (tntDef.radiusX * 2 + 1) * (tntDef.radiusDown + tntDef.radiusX + 1);
  const effectiveBlocks = Math.floor(blocksInRadius * 0.7);
  let totalReward = 0;
  for (let i = 0; i < effectiveBlocks; i++) {
    const block = pickRandomBlock(blockPool);
    const dmg = block.tntResist ? Math.floor(tntDef.damage * 0.4) : tntDef.damage;
    if (dmg >= block.hp) totalReward += getBlockReward(block);
  }
  return totalReward;
}

function testConfig(label, pickaxes, blocks, tntDef, iterations = 40000) {
  const blockPool = buildBlockPool(blocks);

  // Calculate encounter rates
  const encounterRates = {};
  for (const [type, def] of Object.entries(pickaxes)) {
    encounterRates[type] = calcEncounterRate(def);
  }

  // System steal rate at various player counts
  const systemRate = encounterRates['system'] || 5.0;
  const calcSteal = (pc) => {
    const avgPlayerPicks = pc * 1.5;
    return systemRate / (systemRate + avgPlayerPicks * 3.0);
  };

  const playerCount = 20;
  const systemStealRate = calcSteal(playerCount);

  // Avg block stats
  let avgBlockReward = 0, avgBlockHP = 0;
  for (const b of blockPool) {
    avgBlockReward += (b.rewardType === 'random' ? (b.reward + 1) / 2 : b.reward) * b.probability;
    avgBlockHP += b.hp * b.probability;
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${label}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`  System steal @${playerCount}p: ${(systemStealRate*100).toFixed(1)}% | Avg block: ${avgBlockReward.toFixed(0)} cr / ${avgBlockHP.toFixed(0)} HP`);
  console.log(`  ${'─'.repeat(66)}`);

  const results = {};
  const pickTypes = Object.keys(pickaxes).filter(t => t !== 'system');

  for (const type of pickTypes) {
    const def = pickaxes[type];
    const rate = encounterRates[type];
    let totalRewardSum = 0, totalBlocksSum = 0;

    for (let i = 0; i < iterations; i++) {
      const r = simulatePickaxe(def, blockPool, systemStealRate, rate);
      totalRewardSum += r.totalReward;
      totalBlocksSum += r.blocksDestroyed;
    }

    const avgReward = totalRewardSum / iterations;
    const avgBlocks = totalBlocksSum / iterations;
    const roi = avgReward / def.price;
    results[type] = { avgReward, avgBlocks, roi, price: def.price };

    const bar = '█'.repeat(Math.round(roi * 50));
    const lt = def.lifetime === Infinity ? '  ∞' : `${(def.lifetime/1000).toString().padStart(3)}s`;
    console.log(`  ${type.padEnd(6)} ${def.price.toString().padStart(5)}cr DMG${def.damage} ${lt} sc${def.scale} g${def.gravityMult} sp${def.speedMult} | enc${rate.toFixed(1)}/s blk${avgBlocks.toFixed(1).padStart(5)} rew${avgReward.toFixed(0).padStart(5)} ROI${(roi*100).toFixed(1).padStart(5)}% ${bar}`);
  }

  // TNT
  let tntRewardSum = 0;
  for (let i = 0; i < iterations; i++) tntRewardSum += simulateTNT(tntDef, blockPool);
  const tntAvgReward = tntRewardSum / iterations;
  const tntROI = tntAvgReward / tntDef.price;
  console.log(`  tnt    ${tntDef.price.toString().padStart(5)}cr DMG${tntDef.damage} AoE ${tntDef.radiusX}x${tntDef.radiusDown}                    | rew${tntAvgReward.toFixed(0).padStart(5)} ROI${(tntROI*100).toFixed(1).padStart(5)}%`);

  // Blended (basic 35%, swift 25%, light 20%, power 15%, TNT 5%)
  const mix = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };
  let bSpend = 0, bReturn = 0;
  for (const [t, w] of Object.entries(mix)) {
    if (t === 'tnt') { bSpend += tntDef.price * w; bReturn += tntAvgReward * w; }
    else { bSpend += pickaxes[t].price * w; bReturn += results[t].avgReward * w; }
  }
  const houseEdge = 1 - (bReturn / bSpend);

  console.log(`  ${'─'.repeat(66)}`);
  console.log(`  Blended: spend ${bSpend.toFixed(0)} → return ${bReturn.toFixed(0)} → ROI ${((bReturn/bSpend)*100).toFixed(1)}%`);
  console.log(`  >>> HOUSE EDGE: ${(houseEdge * 100).toFixed(2)}% <<<  (target 54-55%)`);

  // Sensitivity
  console.log(`  Player sensitivity:`);
  for (const pc of [3, 10, 20, 40, 80]) {
    const steal = calcSteal(pc);
    let s = 0, r = 0;
    for (const [t, w] of Object.entries(mix)) {
      if (t === 'tnt') { s += tntDef.price * w; r += tntAvgReward * w; continue; }
      const rate = encounterRates[t];
      let tR = 0;
      for (let i = 0; i < 5000; i++) tR += simulatePickaxe(pickaxes[t], blockPool, steal, rate).totalReward;
      s += pickaxes[t].price * w;
      r += (tR / 5000) * w;
    }
    const mark = pc === 20 ? ' ◄── baseline' : '';
    console.log(`    ${pc.toString().padStart(2)}p: steal ${(steal*100).toFixed(1)}% → house edge ${((1-r/s)*100).toFixed(1)}%${mark}`);
  }

  return { results, tntROI, houseEdge };
}

// ============ BLOCK DEFINITIONS (shared) ============
const BLOCKS_CURRENT = {
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

// ============ TEST 1: CURRENT VALUES ============
testConfig('CURRENT VALUES (v4.3)', {
  basic:  { price: 2500, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 6, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 35000 },
  light:  { price: 4000, damage: 5, scale: 0.65, gravityMult: 0.5, speedMult: 1.0, lifetime: 30000 },
  swift:  { price: 3500, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.8, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 2.0,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
}, BLOCKS_CURRENT, { price: 15000, damage: 25, radiusX: 2, radiusDown: 3 });

// ============ CANDIDATE A: Even out all pickaxes, keep rewards ============
testConfig('CANDIDATE A: Even pickaxes, same blocks', {
  basic:  { price: 2000, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 8000, damage: 6, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2500, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 3000, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 10,scale: 2.0,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
}, BLOCKS_CURRENT, { price: 10000, damage: 25, radiusX: 2, radiusDown: 3 });

// ============ CANDIDATE B: Adjust block rewards down ============
const BLOCKS_B = {
  diamond_block: { hp: 150, weight: 1,  reward: 4000, rewardType: 'fixed', tntResist: true },
  gold_block:    { hp: 80,  weight: 2,  reward: 1500, rewardType: 'fixed', tntResist: true },
  emerald_block: { hp: 50,  weight: 5,  reward: 500,  rewardType: 'fixed' },
  iron_block:    { hp: 30,  weight: 12, reward: 120,  rewardType: 'fixed' },
  copper_block:  { hp: 18,  weight: 20, reward: 40,   rewardType: 'fixed' },
  stone:         { hp: 10,  weight: 20, reward: 3,    rewardType: 'random' },
  dirt:          { hp: 6,   weight: 18, reward: 3,    rewardType: 'random' },
  gravel:        { hp: 8,   weight: 12, reward: 3,    rewardType: 'random' },
  clay:          { hp: 7,   weight: 10, reward: 3,    rewardType: 'random' },
};

testConfig('CANDIDATE B: Lower block rewards, balanced picks', {
  basic:  { price: 2000, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 6000, damage: 6, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2500, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 3000, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 10,scale: 2.0,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
}, BLOCKS_B, { price: 10000, damage: 25, radiusX: 2, radiusDown: 3 });

// ============ CANDIDATE C: Higher block HP + same rewards = lower throughput ============
const BLOCKS_C = {
  diamond_block: { hp: 200, weight: 1,  reward: 5000, rewardType: 'fixed', tntResist: true },
  gold_block:    { hp: 100, weight: 2,  reward: 2000, rewardType: 'fixed', tntResist: true },
  emerald_block: { hp: 60,  weight: 5,  reward: 600,  rewardType: 'fixed' },
  iron_block:    { hp: 35,  weight: 12, reward: 150,  rewardType: 'fixed' },
  copper_block:  { hp: 22,  weight: 20, reward: 50,   rewardType: 'fixed' },
  stone:         { hp: 12,  weight: 20, reward: 3,    rewardType: 'random' },
  dirt:          { hp: 8,   weight: 18, reward: 3,    rewardType: 'random' },
  gravel:        { hp: 10,  weight: 12, reward: 3,    rewardType: 'random' },
  clay:          { hp: 9,   weight: 10, reward: 3,    rewardType: 'random' },
};

testConfig('CANDIDATE C: Higher block HP, same rewards', {
  basic:  { price: 2000, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 6000, damage: 6, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2500, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 3000, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 10,scale: 2.0,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
}, BLOCKS_C, { price: 10000, damage: 30, radiusX: 2, radiusDown: 3 });

// ============ CANDIDATE D: Fine-tune C for exact 54-55% ============
testConfig('CANDIDATE D: Tuned for 54-55% target', {
  basic:  { price: 2000, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5500, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2500, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2500, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 10,scale: 2.0,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
}, BLOCKS_C, { price: 8000, damage: 30, radiusX: 2, radiusDown: 3 });

// ============ CANDIDATE E: Bump rewards or reduce HP slightly from C ============
const BLOCKS_E = {
  diamond_block: { hp: 180, weight: 1,  reward: 5000, rewardType: 'fixed', tntResist: true },
  gold_block:    { hp: 90,  weight: 2,  reward: 2000, rewardType: 'fixed', tntResist: true },
  emerald_block: { hp: 55,  weight: 5,  reward: 600,  rewardType: 'fixed' },
  iron_block:    { hp: 32,  weight: 12, reward: 150,  rewardType: 'fixed' },
  copper_block:  { hp: 20,  weight: 20, reward: 50,   rewardType: 'fixed' },
  stone:         { hp: 10,  weight: 20, reward: 3,    rewardType: 'random' },
  dirt:          { hp: 7,   weight: 18, reward: 3,    rewardType: 'random' },
  gravel:        { hp: 9,   weight: 12, reward: 3,    rewardType: 'random' },
  clay:          { hp: 8,   weight: 10, reward: 3,    rewardType: 'random' },
};

testConfig('CANDIDATE E: Moderate HP increase, balanced', {
  basic:  { price: 2000, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5500, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2500, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2500, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 10,scale: 2.0,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
}, BLOCKS_E, { price: 8000, damage: 30, radiusX: 2, radiusDown: 3 });
