#!/usr/bin/env node
/**
 * PIKIT v4.5 Balance Simulation - Round 4 (Analytical + Grid Search)
 *
 * KEY INSIGHT: steal(5) - steal(10) is always significant because:
 *   steal(5) = s/(s+22.5), steal(10) = s/(s+45)
 *   For s=5: steal(5)=18.2%, steal(10)=10.0%, diff=8.2%
 *   For s=3: steal(5)=11.8%, steal(10)=6.3%, diff=5.5%
 *   For s=1: steal(5)=4.3%, steal(10)=2.2%, diff=2.1%
 *
 * With s=1 (tiny sys), the HE gap 5p-10p is ~2-3%. We need gap of ~1%.
 * Only way to get 5p=55%, 10p=54%:
 *   1. Very small system (sysEncRate ~0.5-2.0) so gap is small
 *   2. Then tune prices/rewards so baseline is right
 *
 * OR accept 5p≈55%, 10p≈52-53% as the best achievable.
 *
 * Let's do a GRID SEARCH over sysEncRate vs price multiplier.
 */

const COMBO = {
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

const MIX = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };
const ITERS = 40000;

function buildBlockPool(bt) {
  const pool = []; const tw = Object.values(bt).reduce((s, b) => s + b.weight, 0);
  for (const [t, d] of Object.entries(bt)) { if (d.weight > 0) pool.push({ type: t, ...d, probability: d.weight / tw }); }
  return pool;
}
function pickRB(pool) { const r = Math.random(); let c = 0; for (const b of pool) { c += b.probability; if (r <= c) return b; } return pool[pool.length - 1]; }
function getBR(b) { return b.rewardType === 'random' ? Math.floor(Math.random() * b.reward) + 1 : b.reward; }
function calcER(d) { return 2.5 * (d.scale / 0.8) * Math.pow(d.speedMult, 0.7) * Math.pow(d.gravityMult, 0.3); }

function simPick(def, pool, steal, enc) {
  const ls = def.lifetime === Infinity ? 60 : def.lifetime / 1000;
  const te = Math.floor(enc * ls);
  let tr = 0, bd = 0, ch = 0, chp = 0, cb = null;
  for (let i = 0; i < te; i++) {
    if (Math.random() < steal) { ch = 0; continue; }
    if (chp <= 0) { cb = pickRB(pool); chp = cb.hp; }
    chp -= def.damage;
    if (chp <= 0) { ch++; let cm = COMBO.MULTIPLIERS[0]; for (let j = COMBO.THRESHOLDS.length - 1; j >= 0; j--) if (ch >= COMBO.THRESHOLDS[j]) { cm = COMBO.MULTIPLIERS[j]; break; } tr += Math.round(getBR(cb) * cm); bd++; chp = 0; }
    if (chp <= 0 && Math.random() < 0.15) ch = 0;
  }
  return { totalReward: tr, blocksDestroyed: bd };
}

function simTNT(td, pool) {
  const eff = Math.floor((td.radiusX * 2 + 1) * (td.radiusDown + td.radiusX + 1) * 0.7);
  let r = 0;
  for (let i = 0; i < eff; i++) { const b = pickRB(pool); if ((b.tntResist ? Math.floor(td.damage * 0.4) : td.damage) >= b.hp) r += getBR(b); }
  return r;
}

// First, let's understand the theoretical minimum gap
console.log('=== THEORETICAL STEAL ANALYSIS ===');
console.log('sysEnc | steal@5p | steal@10p | gap');
for (let s = 0.5; s <= 7; s += 0.5) {
  const s5 = s / (s + 22.5);
  const s10 = s / (s + 45);
  console.log(`  ${s.toFixed(1).padStart(4)} |  ${(s5*100).toFixed(1).padStart(5)}%  |  ${(s10*100).toFixed(1).padStart(5)}%   | ${((s5-s10)*100).toFixed(1)}%`);
}

// The steal gap drives HE gap. Each 1% steal difference ≈ 1-1.5% HE difference.
// For HE gap of 1% (55 vs 54), need steal gap ≈ 0.7-1%.
// From table: sysEnc ≈ 0.5-1.0 gives gap 1-2%.
// But with sysEnc < 1, steal@5p < 5%, which means almost no house edge from system.
// We'd need prices alone to create 55% HE, which means ROI ≈ 45%.

// Let's run a grid search with very small sys + tuned prices
const TNT = { price: 8000, damage: 30, radiusX: 2, radiusDown: 3 };

const BLOCKS_BASE = {
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

function makeBlocks(rewardMult) {
  const b = {};
  for (const [k, v] of Object.entries(BLOCKS_BASE)) {
    b[k] = { ...v };
    if (v.rewardType === 'fixed' && v.reward > 10) b[k].reward = Math.round(v.reward * rewardMult);
  }
  return b;
}

function makePicks(priceMult, sysScale, sysSpeed, sysGrav) {
  return {
    basic:  { price: Math.round(1800 * priceMult), damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    power:  { price: Math.round(5000 * priceMult), damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    light:  { price: Math.round(2200 * priceMult), damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
    swift:  { price: Math.round(2200 * priceMult), damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
    system: { price: 0, damage: 8, scale: sysScale, gravityMult: sysGrav, speedMult: sysSpeed, lifetime: Infinity },
  };
}

function quickSim(picks, blocks, tntDef, playerCounts) {
  const pool = buildBlockPool(blocks);
  const enc = {}; for (const [t, d] of Object.entries(picks)) enc[t] = calcER(d);
  const sr = enc['system'];
  const pt = Object.keys(picks).filter(t => t !== 'system');
  const results = {};

  for (const pc of playerCounts) {
    const steal = sr / (sr + pc * 1.5 * 3.0);
    let bS = 0, bR = 0;
    for (const t of pt) {
      const d = picks[t]; const rate = enc[t];
      let rS = 0;
      for (let i = 0; i < ITERS; i++) rS += simPick(d, pool, steal, rate).totalReward;
      const avg = rS / ITERS;
      if (MIX[t]) { bS += d.price * MIX[t]; bR += avg * MIX[t]; }
    }
    let tR = 0; for (let i = 0; i < ITERS; i++) tR += simTNT(tntDef, pool);
    bS += tntDef.price * MIX.tnt; bR += (tR / ITERS) * MIX.tnt;
    results[pc] = 1 - (bR / bS);
  }
  return results;
}

// GRID SEARCH
console.log('\n=== GRID SEARCH ===');
console.log('Testing sys configs × reward multipliers');
console.log('Scoring: |5p-55%| + |10p-54%| + penalty if 20p>52%\n');

const sysConfigs = [
  { scale: 0.8, speed: 0.8, grav: 0.7, label: 'sys 0.8/0.8s' },
  { scale: 0.9, speed: 0.9, grav: 0.7, label: 'sys 0.9/0.9s' },
  { scale: 1.0, speed: 1.0, grav: 0.7, label: 'sys 1.0/1.0s' },
  { scale: 1.1, speed: 1.0, grav: 0.7, label: 'sys 1.1/1.0s' },
  { scale: 1.2, speed: 1.1, grav: 0.7, label: 'sys 1.2/1.1s' },
  { scale: 1.0, speed: 0.8, grav: 0.5, label: 'sys 1.0/0.8s/0.5g' },
  { scale: 0.9, speed: 0.8, grav: 0.5, label: 'sys 0.9/0.8s/0.5g' },
  { scale: 1.5, speed: 1.3, grav: 0.7, label: 'sys 1.5/1.3s' },
  { scale: 1.3, speed: 1.2, grav: 0.7, label: 'sys 1.3/1.2s' },
];

const rewardMults = [1.0, 1.1, 1.15, 1.2, 1.25, 1.3];

const gridResults = [];

for (const sc of sysConfigs) {
  for (const rm of rewardMults) {
    const picks = makePicks(1.0, sc.scale, sc.speed, sc.grav);
    const blocks = makeBlocks(rm);
    const he = quickSim(picks, blocks, TNT, [5, 10, 20, 40]);
    const he5 = he[5] * 100, he10 = he[10] * 100, he20 = he[20] * 100, he40 = he[40] * 100;
    const err = Math.abs(he5 - 55) + Math.abs(he10 - 54);
    gridResults.push({ sc, rm, he5, he10, he20, he40, err });
  }
}

gridResults.sort((a, b) => a.err - b.err);
console.log('Top 15 results:');
console.log(`${'SysConfig'.padEnd(25)} | RewMult | 5p HE | 10p HE | 20p HE | 40p HE | Score`);
console.log('-'.repeat(95));
for (let i = 0; i < Math.min(15, gridResults.length); i++) {
  const r = gridResults[i];
  console.log(`${r.sc.label.padEnd(25)} | ${r.rm.toFixed(2).padStart(5)}x  | ${r.he5.toFixed(1)}% | ${r.he10.toFixed(1)}%  | ${r.he20.toFixed(1)}%  | ${r.he40.toFixed(1)}%  | ${r.err.toFixed(1)}`);
}

// Now run detailed analysis on top 3
console.log('\n\n=== DETAILED ANALYSIS OF TOP 3 ===\n');

for (let i = 0; i < 3; i++) {
  const r = gridResults[i];
  const picks = makePicks(1.0, r.sc.scale, r.sc.speed, r.sc.grav);
  const blocks = makeBlocks(r.rm);
  const pool = buildBlockPool(blocks);
  const enc = {}; for (const [t, d] of Object.entries(picks)) enc[t] = calcER(d);
  const sr = enc['system'];
  const pt = Object.keys(picks).filter(t => t !== 'system');

  console.log(`\n--- #${i+1}: ${r.sc.label} × ${r.rm}x rewards ---`);
  console.log(`  sysEncRate: ${sr.toFixed(2)}`);

  for (const pc of [5, 10, 20, 40]) {
    const steal = sr / (sr + pc * 1.5 * 3.0);
    console.log(`\n  @${pc}p (steal ${(steal*100).toFixed(1)}%):`);
    let bS = 0, bR = 0;
    for (const t of pt) {
      const d = picks[t]; const rate = enc[t];
      let rS = 0, bS2 = 0;
      for (let j = 0; j < 60000; j++) { const res = simPick(d, pool, steal, rate); rS += res.totalReward; bS2 += res.blocksDestroyed; }
      const avg = rS / 60000; const blk = bS2 / 60000;
      console.log(`    ${t.padEnd(7)} | ${String(d.price).padStart(5)}cr blk${blk.toFixed(1).padStart(5)} rew${avg.toFixed(0).padStart(5)} ROI${(avg/d.price*100).toFixed(1).padStart(5)}%`);
      if (MIX[t]) { bS += d.price * MIX[t]; bR += avg * MIX[t]; }
    }
    let tR = 0; for (let j = 0; j < 60000; j++) tR += simTNT(TNT, pool);
    const ta = tR / 60000;
    console.log(`    tnt     | ${String(TNT.price).padStart(5)}cr rew${ta.toFixed(0).padStart(5)} ROI${(ta/TNT.price*100).toFixed(1).padStart(5)}%`);
    bS += TNT.price * MIX.tnt; bR += ta * MIX.tnt;
    console.log(`    HE: ${((1-bR/bS)*100).toFixed(1)}%`);
  }

  // Print the exact values
  console.log(`\n  === EXACT VALUES ===`);
  console.log(`  System: scale=${r.sc.scale}, speedMult=${r.sc.speed}, gravityMult=${r.sc.grav}, damage=8`);
  console.log(`  Prices: basic=${picks.basic.price}, power=${picks.power.price}, light=${picks.light.price}, swift=${picks.swift.price}`);
  console.log(`  Block rewards (× ${r.rm}):`);
  for (const [k, v] of Object.entries(blocks)) {
    if (v.weight > 0 && v.rewardType === 'fixed') console.log(`    ${k}: ${v.reward}`);
  }
}
