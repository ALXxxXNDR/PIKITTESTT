#!/usr/bin/env node
/**
 * PIKIT v4.5 Balance Simulation - Round 2
 * Round 1 showed even aggressive system reduction only gets 5p to ~61%.
 * Need COMBINATION: tiny system + lower prices OR higher block rewards + tiny system
 * Target: 5p=55%, 10p=54%
 */

const COMBO = {
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

const BLOCKS_V44 = {
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

const MIX = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };
const PLAYER_COUNTS = [5, 10, 20, 40];
const ITERS = 50000;

function buildBlockPool(blockTypes) {
  const pool = [];
  const totalWeight = Object.values(blockTypes).reduce((s, b) => s + b.weight, 0);
  for (const [type, def] of Object.entries(blockTypes)) {
    if (def.weight > 0) pool.push({ type, ...def, probability: def.weight / totalWeight });
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

function simulatePickaxe(def, pool, stealRate, encRate) {
  const lifetimeSec = def.lifetime === Infinity ? 60 : def.lifetime / 1000;
  const totalEnc = Math.floor(encRate * lifetimeSec);
  let totalReward = 0, blocksDestroyed = 0, consecutiveHits = 0;
  let currentBlockHP = 0, currentBlock = null;
  for (let i = 0; i < totalEnc; i++) {
    if (Math.random() < stealRate) { consecutiveHits = 0; continue; }
    if (currentBlockHP <= 0) { currentBlock = pickRandomBlock(pool); currentBlockHP = currentBlock.hp; }
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

function simulateTNT(tntDef, pool) {
  const eff = Math.floor((tntDef.radiusX * 2 + 1) * (tntDef.radiusDown + tntDef.radiusX + 1) * 0.7);
  let r = 0;
  for (let i = 0; i < eff; i++) {
    const b = pickRandomBlock(pool);
    if ((b.tntResist ? Math.floor(tntDef.damage * 0.4) : tntDef.damage) >= b.hp) r += getBlockReward(b);
  }
  return r;
}

function runConfig(label, picks, blocks, tntDef) {
  const pool = buildBlockPool(blocks);
  const encRates = {};
  for (const [t, d] of Object.entries(picks)) encRates[t] = calcEncounterRate(d);
  const sysRate = encRates['system'];
  const calcSteal = pc => sysRate / (sysRate + pc * 1.5 * 3.0);
  const pickTypes = Object.keys(picks).filter(t => t !== 'system');
  const results = {};

  for (const pc of PLAYER_COUNTS) {
    const steal = calcSteal(pc);
    let bS = 0, bR = 0;
    const pickResults = {};
    for (const t of pickTypes) {
      const d = picks[t]; const rate = encRates[t];
      let rSum = 0, bSum = 0;
      for (let i = 0; i < ITERS; i++) { const r = simulatePickaxe(d, pool, steal, rate); rSum += r.totalReward; bSum += r.blocksDestroyed; }
      const avg = rSum / ITERS; const blk = bSum / ITERS;
      const roi = avg / d.price;
      pickResults[t] = { avg, blk, roi, price: d.price };
      if (MIX[t]) { bS += d.price * MIX[t]; bR += avg * MIX[t]; }
    }
    let tR = 0;
    for (let i = 0; i < ITERS; i++) tR += simulateTNT(tntDef, pool);
    const tntAvg = tR / ITERS;
    pickResults['tnt'] = { avg: tntAvg, roi: tntAvg / tntDef.price, price: tntDef.price };
    bS += tntDef.price * MIX.tnt; bR += tntAvg * MIX.tnt;
    const he = 1 - (bR / bS);
    results[pc] = { steal, he, bS, bR, pickResults };
  }
  return { label, sysRate, results };
}

function printResult(res) {
  console.log(`\n${'='.repeat(78)}`);
  console.log(`  ${res.label}`);
  console.log(`${'='.repeat(78)}`);
  console.log(`  System enc rate: ${res.sysRate.toFixed(2)}/s`);

  for (const pc of PLAYER_COUNTS) {
    const r = res.results[pc];
    console.log(`\n  @${pc} players (steal ${(r.steal*100).toFixed(1)}%):`);
    for (const [t, pr] of Object.entries(r.pickResults)) {
      if (t === 'tnt') {
        console.log(`    tnt     | rew ${pr.avg.toFixed(0).padStart(5)} ROI ${(pr.roi*100).toFixed(1).padStart(5)}%`);
      } else {
        console.log(`    ${t.padEnd(7)} | ${String(pr.price).padStart(5)}cr blk ${pr.blk.toFixed(1).padStart(5)} rew ${pr.avg.toFixed(0).padStart(5)} ROI ${(pr.roi*100).toFixed(1).padStart(5)}%`);
      }
    }
    console.log(`    HOUSE EDGE: ${(r.he*100).toFixed(1)}%  (spend ${r.bS.toFixed(0)} -> return ${r.bR.toFixed(0)})`);
  }

  const he5 = res.results[5].he * 100;
  const he10 = res.results[10].he * 100;
  const err5 = Math.abs(he5 - 55);
  const err10 = Math.abs(he10 - 54);
  const totalErr = err5 + err10;

  const r10 = res.results[10].pickResults;
  const rois = Object.entries(r10).filter(([t]) => t !== 'tnt').map(([,v]) => v.roi);
  const roiSpread = (Math.max(...rois) - Math.min(...rois)) * 100;

  console.log(`\n  >>> SCORE: |5p-55%|=${err5.toFixed(1)} + |10p-54%|=${err10.toFixed(1)} = ${totalErr.toFixed(1)} (ROI spread @10p: ${roiSpread.toFixed(1)}pp)`);
  return { totalErr, roiSpread, he5, he10, he20: res.results[20].he * 100, he40: res.results[40].he * 100 };
}

const TNT = { price: 8000, damage: 30, radiusX: 2, radiusDown: 3 };
const configs = [];

// Strategy: The system encounter rate at 5p creates steal ~14% even with small sys.
// We need the RAW pickaxe ROI (without steal) to be ~52-53% so that after 10-14% steal it drops to ~45%.
// Then blended HE = 55%.
// Current raw ROI is ~58-60% => after steal ~48-50% => HE ~57-60%.
// We need to BOOST raw ROI to ~60-65% by lowering prices significantly.

// D0: Tiny sys (0.9/5dmg) + very low prices
configs.push(['D0: sys 0.9/5dmg/0.7g/1.0s + low prices', {
  basic:  { price: 1400, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 4000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 1700, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 1700, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 5, scale: 0.9,  gravityMult: 0.7, speedMult: 1.0, lifetime: Infinity },
}, BLOCKS_V44, TNT]);

// D1: sys 1.0/6dmg + lower prices
configs.push(['D1: sys 1.0/6dmg/0.7g/1.0s + lower prices', {
  basic:  { price: 1500, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 4200, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 1800, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 1800, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 6, scale: 1.0,  gravityMult: 0.7, speedMult: 1.0, lifetime: Infinity },
}, BLOCKS_V44, TNT]);

// D2: sys 1.1/6dmg + prices ~1600 range
configs.push(['D2: sys 1.1/6dmg/0.7g/1.1s + mid-low prices', {
  basic:  { price: 1500, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 4200, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 1800, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 1800, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 6, scale: 1.1,  gravityMult: 0.7, speedMult: 1.1, lifetime: Infinity },
}, BLOCKS_V44, TNT]);

// D3: sys 1.2/7dmg + lower prices (best from R1 was sys 1.2, now with price reduction)
configs.push(['D3: sys 1.2/7dmg/0.7g/1.2s + lower prices', {
  basic:  { price: 1500, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 4200, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 1800, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 1800, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 7, scale: 1.2,  gravityMult: 0.7, speedMult: 1.2, lifetime: Infinity },
}, BLOCKS_V44, TNT]);

// D4: sys 1.0/6dmg + even lower prices
configs.push(['D4: sys 1.0/6dmg/0.6g/1.0s + very low prices', {
  basic:  { price: 1300, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 3800, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 1600, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 1600, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 6, scale: 1.0,  gravityMult: 0.6, speedMult: 1.0, lifetime: Infinity },
}, BLOCKS_V44, TNT]);

// D5: sys 1.1/7dmg + price ~1600
configs.push(['D5: sys 1.1/7dmg/0.65g/1.1s + low prices', {
  basic:  { price: 1500, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 4200, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 1800, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 1800, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 7, scale: 1.1,  gravityMult: 0.65, speedMult: 1.1, lifetime: Infinity },
}, BLOCKS_V44, TNT]);

// D6: sys 1.3/8dmg + price ~1500 (keep sys moderate but heavily reduce prices)
configs.push(['D6: sys 1.3/8dmg/0.7g/1.2s + low prices', {
  basic:  { price: 1400, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 4000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 1700, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 1700, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.3,  gravityMult: 0.7, speedMult: 1.2, lifetime: Infinity },
}, BLOCKS_V44, TNT]);

// D7: Increase block rewards instead of lowering prices (boost copper/iron/emerald)
const BLOCKS_BOOSTED = {
  diamond_block: { hp: 180, weight: 1,  reward: 5500, rewardType: 'fixed', tntResist: true },
  gold_block:    { hp: 90,  weight: 2,  reward: 2200, rewardType: 'fixed', tntResist: true },
  emerald_block: { hp: 55,  weight: 5,  reward: 700,  rewardType: 'fixed' },
  iron_block:    { hp: 32,  weight: 12, reward: 180,  rewardType: 'fixed' },
  copper_block:  { hp: 20,  weight: 20, reward: 60,   rewardType: 'fixed' },
  stone:         { hp: 10,  weight: 20, reward: 3,    rewardType: 'random' },
  dirt:          { hp: 7,   weight: 18, reward: 3,    rewardType: 'random' },
  gravel:        { hp: 9,   weight: 12, reward: 3,    rewardType: 'random' },
  clay:          { hp: 8,   weight: 10, reward: 3,    rewardType: 'random' },
};
configs.push(['D7: sys 1.2/8dmg + boosted block rewards', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.2,  gravityMult: 0.7, speedMult: 1.2, lifetime: Infinity },
}, BLOCKS_BOOSTED, TNT]);

// D8: Boost rewards MORE + sys 1.1/7dmg
const BLOCKS_BOOSTED2 = {
  diamond_block: { hp: 180, weight: 1,  reward: 6000, rewardType: 'fixed', tntResist: true },
  gold_block:    { hp: 90,  weight: 2,  reward: 2500, rewardType: 'fixed', tntResist: true },
  emerald_block: { hp: 55,  weight: 5,  reward: 750,  rewardType: 'fixed' },
  iron_block:    { hp: 32,  weight: 12, reward: 200,  rewardType: 'fixed' },
  copper_block:  { hp: 20,  weight: 20, reward: 65,   rewardType: 'fixed' },
  stone:         { hp: 10,  weight: 20, reward: 3,    rewardType: 'random' },
  dirt:          { hp: 7,   weight: 18, reward: 3,    rewardType: 'random' },
  gravel:        { hp: 9,   weight: 12, reward: 3,    rewardType: 'random' },
  clay:          { hp: 8,   weight: 10, reward: 3,    rewardType: 'random' },
};
configs.push(['D8: sys 1.1/7dmg + heavily boosted rewards', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 7, scale: 1.1,  gravityMult: 0.7, speedMult: 1.1, lifetime: Infinity },
}, BLOCKS_BOOSTED2, TNT]);

// D9: Combined: lower prices + boosted rewards + small sys
configs.push(['D9: sys 1.1/7dmg + boost rewards + low prices', {
  basic:  { price: 1500, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 4200, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 1800, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 1800, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 7, scale: 1.1,  gravityMult: 0.7, speedMult: 1.1, lifetime: Infinity },
}, BLOCKS_BOOSTED, TNT]);

// D10: Longer pickaxe lifetimes (more encounters = more reward per purchase)
configs.push(['D10: sys 1.2/7dmg + longer lifetimes', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 40000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 40000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 45000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 33000 },
  system: { price: 0,    damage: 7, scale: 1.2,  gravityMult: 0.7, speedMult: 1.2, lifetime: Infinity },
}, BLOCKS_V44, TNT]);

// D11: Lower block HP (more blocks broken per encounter = more reward)
const BLOCKS_LOWER_HP = {
  diamond_block: { hp: 150, weight: 1,  reward: 5000, rewardType: 'fixed', tntResist: true },
  gold_block:    { hp: 75,  weight: 2,  reward: 2000, rewardType: 'fixed', tntResist: true },
  emerald_block: { hp: 45,  weight: 5,  reward: 600,  rewardType: 'fixed' },
  iron_block:    { hp: 26,  weight: 12, reward: 150,  rewardType: 'fixed' },
  copper_block:  { hp: 16,  weight: 20, reward: 50,   rewardType: 'fixed' },
  stone:         { hp: 8,   weight: 20, reward: 3,    rewardType: 'random' },
  dirt:          { hp: 5,   weight: 18, reward: 3,    rewardType: 'random' },
  gravel:        { hp: 7,   weight: 12, reward: 3,    rewardType: 'random' },
  clay:          { hp: 6,   weight: 10, reward: 3,    rewardType: 'random' },
};
configs.push(['D11: sys 1.3/8dmg + lower block HP', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.3,  gravityMult: 0.7, speedMult: 1.2, lifetime: Infinity },
}, BLOCKS_LOWER_HP, TNT]);

// ============================================================
console.log('PIKIT v4.5 Balance Simulation - ROUND 2');
console.log(`Iterations: ${ITERS} | Target: 5p=55%, 10p=54%\n`);

const allResults = [];
for (const [label, picks, blocks, tnt] of configs) {
  const res = runConfig(label, picks, blocks, tnt);
  const score = printResult(res);
  allResults.push({ label, score, res });
}

console.log(`\n\n${'#'.repeat(78)}`);
console.log('  SUMMARY TABLE — sorted by score');
console.log(`${'#'.repeat(78)}`);

allResults.sort((a, b) => a.score.totalErr - b.score.totalErr);

console.log(`${'Config'.padEnd(55)} | 5p HE | 10p HE | 20p HE | 40p HE | Score | ROI Sp`);
console.log('-'.repeat(110));
for (const { label, score } of allResults) {
  const short = label.substring(0, 54);
  console.log(`${short.padEnd(55)} | ${score.he5.toFixed(1)}% | ${score.he10.toFixed(1)}%  | ${score.he20.toFixed(1)}%  | ${score.he40.toFixed(1)}%  | ${score.totalErr.toFixed(1).padStart(4)}  | ${score.roiSpread.toFixed(1)}pp`);
}

const best = allResults[0];
console.log(`\n*** WINNER: ${best.label}`);
console.log(`    5p: ${best.score.he5.toFixed(1)}% | 10p: ${best.score.he10.toFixed(1)}% | 20p: ${best.score.he20.toFixed(1)}% | 40p: ${best.score.he40.toFixed(1)}%`);
console.log(`    Score: ${best.score.totalErr.toFixed(2)} | ROI Spread: ${best.score.roiSpread.toFixed(1)}pp ***`);
