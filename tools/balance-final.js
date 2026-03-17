#!/usr/bin/env node
/**
 * PIKIT Final Balance Tuner — Fine-tuning from Candidate E
 * Target: 54-55% house edge at 20-40 players, evenly balanced pickaxes
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
  const r = Math.random(); let cum = 0;
  for (const b of pool) { cum += b.probability; if (r <= cum) return b; }
  return pool[pool.length - 1];
}

function getBlockReward(block) {
  return block.rewardType === 'random' ? Math.floor(Math.random() * block.reward) + 1 : block.reward;
}

function calcEncounterRate(def) {
  return 2.5 * (def.scale / 0.8) * Math.pow(def.speedMult, 0.7) * Math.pow(def.gravityMult, 0.3);
}

function simulatePickaxe(def, blockPool, stealRate, encRate) {
  const lifetimeSec = def.lifetime === Infinity ? 60 : def.lifetime / 1000;
  const totalEnc = Math.floor(encRate * lifetimeSec);
  let totalReward = 0, blocksDestroyed = 0, consecutiveHits = 0;
  let currentBlockHP = 0, currentBlock = null;
  for (let i = 0; i < totalEnc; i++) {
    if (Math.random() < stealRate) { consecutiveHits = 0; continue; }
    if (currentBlockHP <= 0) { currentBlock = pickRandomBlock(blockPool); currentBlockHP = currentBlock.hp; }
    currentBlockHP -= def.damage;
    if (currentBlockHP <= 0) {
      consecutiveHits++;
      let cm = COMBO.MULTIPLIERS[0];
      for (let j = COMBO.THRESHOLDS.length - 1; j >= 0; j--)
        if (consecutiveHits >= COMBO.THRESHOLDS[j]) { cm = COMBO.MULTIPLIERS[j]; break; }
      totalReward += Math.round(getBlockReward(currentBlock) * cm);
      blocksDestroyed++;
      currentBlockHP = 0;
    }
    if (currentBlockHP <= 0 && Math.random() < 0.15) consecutiveHits = 0;
  }
  return { totalReward, blocksDestroyed };
}

function simulateTNT(tntDef, blockPool) {
  const eff = Math.floor((tntDef.radiusX * 2 + 1) * (tntDef.radiusDown + tntDef.radiusX + 1) * 0.7);
  let r = 0;
  for (let i = 0; i < eff; i++) {
    const b = pickRandomBlock(blockPool);
    if ((b.tntResist ? Math.floor(tntDef.damage * 0.4) : tntDef.damage) >= b.hp) r += getBlockReward(b);
  }
  return r;
}

function test(label, picks, blocks, tntDef, iters = 40000) {
  const pool = buildBlockPool(blocks);
  const encRates = {};
  for (const [t, d] of Object.entries(picks)) encRates[t] = calcEncounterRate(d);
  const sysRate = encRates['system'];
  const calcSteal = pc => sysRate / (sysRate + pc * 1.5 * 3.0);

  let avgBR = 0;
  for (const b of pool) avgBR += (b.rewardType === 'random' ? (b.reward+1)/2 : b.reward) * b.probability;

  console.log(`\n${'═'.repeat(74)}`);
  console.log(`  ${label}`);
  console.log(`${'═'.repeat(74)}`);
  console.log(`  Sys enc: ${sysRate.toFixed(1)}/s | Avg block reward: ${avgBR.toFixed(0)} cr`);

  const mix = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };
  const results = {};
  const pickTypes = Object.keys(picks).filter(t => t !== 'system');

  for (const pc of [10, 20, 40]) {
    const steal = calcSteal(pc);
    console.log(`\n  @${pc} players (steal ${(steal*100).toFixed(1)}%):`);
    let bS = 0, bR = 0;
    for (const t of pickTypes) {
      const d = picks[t]; const rate = encRates[t];
      let rSum = 0, bSum = 0;
      for (let i = 0; i < iters; i++) { const r = simulatePickaxe(d, pool, steal, rate); rSum += r.totalReward; bSum += r.blocksDestroyed; }
      const avg = rSum / iters; const blk = bSum / iters;
      const roi = avg / d.price;
      results[`${t}_${pc}`] = { avg, blk, roi };
      console.log(`    ${t.padEnd(6)} ${d.price.toString().padStart(5)}cr DMG${d.damage} | blk${blk.toFixed(1).padStart(5)} rew${avg.toFixed(0).padStart(5)} ROI${(roi*100).toFixed(1).padStart(5)}%`);
      if (mix[t]) { bS += d.price * mix[t]; bR += avg * mix[t]; }
    }
    // TNT
    let tR = 0;
    for (let i = 0; i < iters; i++) tR += simulateTNT(tntDef, pool);
    const tntAvg = tR / iters;
    console.log(`    tnt    ${tntDef.price.toString().padStart(5)}cr DMG${tntDef.damage} | rew${tntAvg.toFixed(0).padStart(5)} ROI${((tntAvg/tntDef.price)*100).toFixed(1).padStart(5)}%`);
    bS += tntDef.price * mix.tnt; bR += tntAvg * mix.tnt;
    const he = 1 - (bR / bS);
    console.log(`    BLENDED: ${bS.toFixed(0)} → ${bR.toFixed(0)} | ROI ${((bR/bS)*100).toFixed(1)}% | HOUSE EDGE ${(he*100).toFixed(1)}%`);
  }
}

// ============ BLOCKS: Moderate HP increase from v4.3 ============
const BLOCKS = {
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

const TNT = { price: 8000, damage: 30, radiusX: 2, radiusDown: 3 };

// F1: Candidate E baseline (system scale 2.0, damage 10)
test('F1: Candidate E (system 2.0/10dmg)', {
  basic:  { price: 2000, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5500, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2500, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2500, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 10,scale: 2.0,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
}, BLOCKS, TNT);

// F2: Reduce system effectiveness (scale 1.5, damage 8)
test('F2: Weaker system (1.5/8dmg)', {
  basic:  { price: 2000, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5500, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2500, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2500, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.5,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
}, BLOCKS, TNT);

// F3: System 1.5/8dmg + slightly lower pickaxe prices
test('F3: Weaker system + lower prices', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.5,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
}, BLOCKS, TNT);

// F4: System 1.8/8dmg (compromise) + prices between E and F3
test('F4: Medium system (1.8/8dmg) + tuned prices', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.8,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
}, BLOCKS, TNT);

// F5: Same as F4 but system 1.6 scale (between 1.5 and 1.8)
test('F5: System (1.6/8dmg) + tuned prices', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.6,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
}, BLOCKS, TNT);

// F6: F5 but bump prices slightly for 55% target
test('F6: System 1.6/8 + nudged prices up', {
  basic:  { price: 2000, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5500, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2300, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2300, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.6,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
}, BLOCKS, TNT);
