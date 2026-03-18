#!/usr/bin/env node
/**
 * PIKIT v4.7 Balance Simulation — Reward Distribution Rebalance
 *
 * PROBLEM: Common blocks (60% of field) give 1~5 credits → "0 or jackpot" feel
 * GOAL:
 *   - Spending 10,000cr → minimum 2,000~3,000 back (20-30% floor)
 *   - Occasional big wins 15,000~30,000
 *   - House edge 53-55% at 5-10 players
 *   - Common blocks: lower HP (break faster) + higher rewards (feel rewarding)
 *
 * KEY METRIC: Not just avg ROI, but P10/P25 percentiles of returns
 *
 * SWEEP: commonRewardMult × commonHpMult × priceMult × rareRewardMult
 */

const COMBO = {
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

// v4.6 baseline blocks
const BLK_BASE = {
  diamond_block: { hp: 180, weight: 1,  reward: 5000, rewardType: 'fixed', tntResist: true, rare: true },
  gold_block:    { hp: 90,  weight: 2,  reward: 2000, rewardType: 'fixed', tntResist: true, rare: true },
  emerald_block: { hp: 55,  weight: 5,  reward: 600,  rewardType: 'fixed', rare: true },
  iron_block:    { hp: 32,  weight: 12, reward: 150,  rewardType: 'fixed', rare: false },
  copper_block:  { hp: 20,  weight: 20, reward: 50,   rewardType: 'fixed', rare: false },
  stone:         { hp: 10,  weight: 20, reward: 3,    rewardType: 'random', common: true },
  dirt:          { hp: 7,   weight: 18, reward: 3,    rewardType: 'random', common: true },
  gravel:        { hp: 9,   weight: 12, reward: 3,    rewardType: 'random', common: true },
  clay:          { hp: 8,   weight: 10, reward: 3,    rewardType: 'random', common: true },
};

// v4.6 system pickaxe (unchanged)
const SYSTEM = { damage: 5, scale: 1.5, gravityMult: 0.3, speedMult: 0.1 };

// v4.6 base prices
const BASE_PRICES = { basic: 2100, power: 5400, light: 2400, swift: 2200 };
const PURCHASE_MIX = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };
const TNT_DEF = { price: 8000, damage: 30, radiusX: 2, radiusDown: 3 };

function makeBlocks(commonHpMult, commonRewardFixed, copperHp, copperReward, ironHp, ironReward, rareRewardMult) {
  return {
    diamond_block: { ...BLK_BASE.diamond_block, reward: Math.round(BLK_BASE.diamond_block.reward * rareRewardMult) },
    gold_block:    { ...BLK_BASE.gold_block,    reward: Math.round(BLK_BASE.gold_block.reward * rareRewardMult) },
    emerald_block: { ...BLK_BASE.emerald_block,  reward: Math.round(BLK_BASE.emerald_block.reward * rareRewardMult) },
    iron_block:    { ...BLK_BASE.iron_block,    hp: ironHp, reward: ironReward },
    copper_block:  { ...BLK_BASE.copper_block,  hp: copperHp, reward: copperReward },
    stone:         { ...BLK_BASE.stone,  hp: Math.round(10 * commonHpMult), reward: commonRewardFixed, rewardType: 'fixed' },
    dirt:          { ...BLK_BASE.dirt,   hp: Math.max(1, Math.round(7 * commonHpMult)), reward: Math.round(commonRewardFixed * 0.8), rewardType: 'fixed' },
    gravel:        { ...BLK_BASE.gravel, hp: Math.round(9 * commonHpMult), reward: Math.round(commonRewardFixed * 0.9), rewardType: 'fixed' },
    clay:          { ...BLK_BASE.clay,   hp: Math.max(1, Math.round(8 * commonHpMult)), reward: Math.round(commonRewardFixed * 0.85), rewardType: 'fixed' },
  };
}

function buildPool(b) {
  const p = [], tw = Object.values(b).reduce((s, x) => s + x.weight, 0);
  for (const [t, d] of Object.entries(b)) if (d.weight > 0) p.push({ ...d, type: t, p: d.weight / tw });
  return p;
}
function pk(p) { let r = Math.random(), c = 0; for (const b of p) { c += b.p; if (r <= c) return b; } return p[p.length - 1]; }
function br(b) { return b.rewardType === 'random' ? Math.floor(Math.random() * b.reward) + 1 : b.reward; }
function enc(d) { return 2.5 * (d.scale / 0.8) * Math.pow(d.speedMult, 0.7) * Math.pow(d.gravityMult, 0.3); }

function simPickaxe(def, pool, steal, rate) {
  const lt = def.lifetime === Infinity ? 60 : def.lifetime / 1000;
  const tot = Math.floor(rate * lt);
  let rew = 0, combo = 0, hp = 0, cur = null, blocks = 0;
  for (let i = 0; i < tot; i++) {
    if (Math.random() < steal) { combo = 0; continue; }
    if (hp <= 0) { cur = pk(pool); hp = cur.hp; }
    hp -= def.damage;
    if (hp <= 0) {
      combo++;
      blocks++;
      let cm = COMBO.MULTIPLIERS[0];
      for (let j = COMBO.THRESHOLDS.length - 1; j >= 0; j--)
        if (combo >= COMBO.THRESHOLDS[j]) { cm = COMBO.MULTIPLIERS[j]; break; }
      rew += Math.round(br(cur) * cm);
      hp = 0;
    }
    if (hp <= 0 && Math.random() < 0.15) combo = 0;
  }
  return { rew, blocks };
}

function simTNT(tnt, pool) {
  const eff = Math.floor((tnt.radiusX * 2 + 1) * (tnt.radiusDown + tnt.radiusX + 1) * 0.7);
  let r = 0;
  for (let i = 0; i < eff; i++) {
    const b = pk(pool);
    if ((b.tntResist ? Math.floor(tnt.damage * 0.4) : tnt.damage) >= b.hp) r += br(b);
  }
  return r;
}

function makePicks(pm) {
  return {
    basic:  { price: Math.round(BASE_PRICES.basic * pm),  damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    power:  { price: Math.round(BASE_PRICES.power * pm),  damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    light:  { price: Math.round(BASE_PRICES.light * pm),  damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
    swift:  { price: Math.round(BASE_PRICES.swift * pm),  damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
    system: { price: 0, damage: SYSTEM.damage, scale: SYSTEM.scale, gravityMult: SYSTEM.gravityMult, speedMult: SYSTEM.speedMult, lifetime: Infinity },
  };
}

// Simulate spending ~10,000 credits and track return distribution
function simSession(picks, pool, steal, iters) {
  const rates = {};
  for (const [t, d] of Object.entries(picks)) rates[t] = enc(d);
  const userTypes = ['basic', 'power', 'light', 'swift'];

  const sessionReturns = [];

  for (let sess = 0; sess < iters; sess++) {
    let totalSpent = 0;
    let totalEarned = 0;

    // Simulate spending ~10,000 credits with purchase mix
    while (totalSpent < 10000) {
      const roll = Math.random();
      let cumP = 0;
      let chosenType = 'basic';

      for (const [t, mix] of Object.entries(PURCHASE_MIX)) {
        cumP += mix;
        if (roll <= cumP) { chosenType = t; break; }
      }

      if (chosenType === 'tnt') {
        totalSpent += TNT_DEF.price;
        totalEarned += simTNT(TNT_DEF, pool);
      } else {
        const def = picks[chosenType];
        const rate = rates[chosenType];
        totalSpent += def.price;
        totalEarned += simPickaxe(def, pool, steal, rate).rew;
      }
    }

    sessionReturns.push(totalEarned);
  }

  sessionReturns.sort((a, b) => a - b);

  return {
    p5:  sessionReturns[Math.floor(iters * 0.05)],
    p10: sessionReturns[Math.floor(iters * 0.10)],
    p25: sessionReturns[Math.floor(iters * 0.25)],
    p50: sessionReturns[Math.floor(iters * 0.50)],
    p75: sessionReturns[Math.floor(iters * 0.75)],
    p90: sessionReturns[Math.floor(iters * 0.90)],
    p95: sessionReturns[Math.floor(iters * 0.95)],
    avg: sessionReturns.reduce((a, b) => a + b, 0) / iters,
    max: sessionReturns[iters - 1],
    min: sessionReturns[0],
  };
}

function testHouseEdge(picks, pool, playerCount, iters) {
  const rates = {};
  for (const [t, d] of Object.entries(picks)) rates[t] = enc(d);
  const sysRate = rates['system'];
  const steal = sysRate / (sysRate + playerCount * 1.5 * 3.0);
  const userTypes = ['basic', 'power', 'light', 'swift'];

  let bSpent = 0, bReward = 0;
  const perPick = {};
  for (const t of userTypes) {
    const d = picks[t];
    const rate = rates[t];
    let rS = 0;
    for (let i = 0; i < iters; i++) rS += simPickaxe(d, pool, steal, rate).rew;
    const avgRew = rS / iters;
    perPick[t] = { avgRew, roi: (avgRew / d.price) * 100 };
    if (PURCHASE_MIX[t]) {
      bSpent += d.price * PURCHASE_MIX[t];
      bReward += avgRew * PURCHASE_MIX[t];
    }
  }
  let tR = 0;
  for (let i = 0; i < iters; i++) tR += simTNT(TNT_DEF, pool);
  bSpent += TNT_DEF.price * PURCHASE_MIX.tnt;
  bReward += (tR / iters) * PURCHASE_MIX.tnt;
  return { he: 1 - (bReward / bSpent), steal, perPick };
}

// ============ PHASE 1: COARSE SWEEP ============
console.log('PIKIT v4.7 Balance Simulation — Reward Distribution Rebalance');
console.log('Goal: Common blocks give meaningful rewards, floor 20-30% per 10K spent');
console.log('Constraint: House edge 53-55% at 5-10 players\n');

// v4.6 BASELINE first
console.log('=== BASELINE (v4.6) ===\n');
{
  const pool = buildPool(BLK_BASE);
  const picks = makePicks(1.0);
  const sysRate = enc(SYSTEM);
  const steal5 = sysRate / (sysRate + 5 * 1.5 * 3.0);

  const r5 = testHouseEdge(picks, pool, 5, 30000);
  const r10 = testHouseEdge(picks, pool, 10, 30000);
  console.log(`  5p HE: ${(r5.he*100).toFixed(1)}% | 10p HE: ${(r10.he*100).toFixed(1)}%`);

  const sess = simSession(picks, pool, steal5, 10000);
  console.log(`  10K session @5p: avg=${sess.avg.toFixed(0)} P10=${sess.p10} P25=${sess.p25} P50=${sess.p50} P90=${sess.p90} max=${sess.max}`);
  console.log(`  Per-pick ROI @5p: basic=${r5.perPick.basic.roi.toFixed(1)}% power=${r5.perPick.power.roi.toFixed(1)}% light=${r5.perPick.light.roi.toFixed(1)}% swift=${r5.perPick.swift.roi.toFixed(1)}%`);

  // Weighted avg block reward
  const totalW = Object.values(BLK_BASE).reduce((s, x) => s + x.weight, 0);
  let avgR = 0;
  for (const [t, d] of Object.entries(BLK_BASE)) {
    if (d.weight > 0) {
      const r = d.rewardType === 'random' ? 3 : d.reward;
      avgR += (d.weight / totalW) * r;
    }
  }
  console.log(`  Avg block reward: ${avgR.toFixed(1)}`);
  console.log('');
}

// ============ PHASE 1: SWEEP ============
console.log('=== PHASE 1: Coarse Sweep ===\n');

const results = [];

// Parameters to sweep:
// commonReward: fixed reward for stone (dirt/gravel/clay scaled from this)
// commonHpMult: multiplier on original HP (lower = easier to break)
// priceMult: multiplier on pickaxe prices (higher = more expensive)
// rareRewardMult: multiplier on diamond/gold/emerald rewards
// copperReward/ironReward adjustments

const commonRewardRange = [10, 15, 20, 25, 30, 35, 40];
const commonHpMultRange = [0.3, 0.4, 0.5, 0.6];
const priceMultRange = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0];
const rareMultRange = [0.7, 0.8, 0.9, 1.0];

// Also sweep copper and iron adjustments
const copperConfigs = [
  { hp: 12, reward: 40 },
  { hp: 15, reward: 50 },
  { hp: 10, reward: 35 },
];
const ironConfigs = [
  { hp: 20, reward: 100 },
  { hp: 25, reward: 120 },
  { hp: 28, reward: 150 },
];

let count = 0;
const totalCombos = commonRewardRange.length * commonHpMultRange.length * priceMultRange.length *
                    rareMultRange.length * copperConfigs.length * ironConfigs.length;
console.log(`Sweeping ${totalCombos} combinations...\n`);

for (const cr of commonRewardRange) {
  for (const chm of commonHpMultRange) {
    for (const rm of rareMultRange) {
      for (const cc of copperConfigs) {
        for (const ic of ironConfigs) {
          for (const pm of priceMultRange) {
            count++;

            const blk = makeBlocks(chm, cr, cc.hp, cc.reward, ic.hp, ic.reward, rm);
            const pool = buildPool(blk);
            const picks = makePicks(pm);

            const r5 = testHouseEdge(picks, pool, 5, 5000);
            const r10 = testHouseEdge(picks, pool, 10, 5000);

            // Quick check: is HE in range?
            const s5 = Math.abs(r5.he - 0.55);
            const s10 = Math.abs(r10.he - 0.54);
            const heScore = s5 + s10;

            // Only keep candidates with reasonable HE
            if (heScore < 0.06) {
              // Quick session percentile check (small sample)
              const sysRate = enc(SYSTEM);
              const steal5 = sysRate / (sysRate + 5 * 1.5 * 3.0);
              const sess = simSession(picks, pool, steal5, 2000);

              // Score: HE accuracy + floor quality
              // We want P10 >= 2000 and P25 >= 2500
              const floorScore = Math.max(0, 2000 - sess.p10) / 1000 + Math.max(0, 2500 - sess.p25) / 1000;
              // We want P90 >= 8000 (big wins possible)
              const ceilingScore = Math.max(0, 8000 - sess.p90) / 5000;

              const totalScore = heScore + floorScore * 0.3 + ceilingScore * 0.1;

              // Per-pickaxe ROI spread
              const rois = Object.values(r5.perPick).map(x => x.roi);
              const roiSpread = Math.max(...rois) - Math.min(...rois);

              results.push({
                cr, chm, rm, cc, ic, pm,
                he5: r5.he, he10: r10.he,
                steal5: r5.steal, steal10: r10.steal,
                sessAvg: sess.avg, p10: sess.p10, p25: sess.p25, p50: sess.p50, p90: sess.p90, max: sess.max,
                roiSpread,
                heScore, floorScore, totalScore,
                perPick: r5.perPick,
              });
            }
          }
        }
      }
    }
  }
  process.stdout.write(`  Swept commonReward=${cr} (${count}/${totalCombos})\n`);
}

// Sort by total score (lower is better)
results.sort((a, b) => a.totalScore - b.totalScore);

console.log(`\nEvaluated ${count} combos, ${results.length} candidates passed HE filter\n`);

console.log('Top 25 candidates:');
console.log('Rank | CR  | HP×  | Rare× | Cu     | Fe      | PM   | 5pHE  | 10pHE | P10   | P25   | P50   | P90   | Score');
console.log('-'.repeat(120));
for (let i = 0; i < Math.min(25, results.length); i++) {
  const s = results[i];
  console.log(
    `  ${(i+1).toString().padStart(2)} | ${s.cr.toString().padStart(3)} | ${s.chm.toFixed(1)} | ${s.rm.toFixed(1)}  ` +
    `| ${s.cc.hp}/${s.cc.reward.toString().padStart(2)} | ${s.ic.hp}/${s.ic.reward.toString().padStart(3)} ` +
    `| ${s.pm.toFixed(1)} | ${(s.he5*100).toFixed(1)}% | ${(s.he10*100).toFixed(1)}% ` +
    `| ${s.p10.toString().padStart(5)} | ${s.p25.toString().padStart(5)} | ${s.p50.toString().padStart(5)} ` +
    `| ${s.p90.toString().padStart(5)} | ${s.totalScore.toFixed(4)}`
  );
}

// ============ PHASE 2: FINE-TUNE TOP 5 ============
console.log('\n=== PHASE 2: Fine-tune top 5 ===\n');

const fineResults = [];
const top5 = results.slice(0, 5);

for (const t of top5) {
  const crSteps = [-3, -2, -1, 0, 1, 2, 3];
  const pmSteps = [-0.05, -0.03, 0, 0.03, 0.05];

  for (const dcr of crSteps) {
    for (const dpm of pmSteps) {
      const cr = t.cr + dcr;
      const pm = Math.round((t.pm + dpm) * 100) / 100;
      if (cr < 5 || cr > 50 || pm < 0.8 || pm > 2.5) continue;

      const blk = makeBlocks(t.chm, cr, t.cc.hp, t.cc.reward, t.ic.hp, t.ic.reward, t.rm);
      const pool = buildPool(blk);
      const picks = makePicks(pm);

      const r5 = testHouseEdge(picks, pool, 5, 15000);
      const r10 = testHouseEdge(picks, pool, 10, 15000);

      const s5 = Math.abs(r5.he - 0.55);
      const s10 = Math.abs(r10.he - 0.54);
      const heScore = s5 + s10;

      if (heScore < 0.04) {
        const sysRate = enc(SYSTEM);
        const steal5 = sysRate / (sysRate + 5 * 1.5 * 3.0);
        const sess = simSession(picks, pool, steal5, 5000);

        const floorScore = Math.max(0, 2000 - sess.p10) / 1000 + Math.max(0, 2500 - sess.p25) / 1000;
        const ceilingScore = Math.max(0, 8000 - sess.p90) / 5000;
        const totalScore = heScore + floorScore * 0.3 + ceilingScore * 0.1;

        const rois = Object.values(r5.perPick).map(x => x.roi);
        const roiSpread = Math.max(...rois) - Math.min(...rois);

        fineResults.push({
          cr, chm: t.chm, rm: t.rm, cc: t.cc, ic: t.ic, pm,
          he5: r5.he, he10: r10.he,
          sessAvg: sess.avg, p10: sess.p10, p25: sess.p25, p50: sess.p50, p90: sess.p90, max: sess.max,
          roiSpread, heScore, totalScore,
          perPick: r5.perPick,
        });
      }
    }
  }
}

fineResults.sort((a, b) => a.totalScore - b.totalScore);

console.log('Top 15 fine-tuned:');
console.log('Rank | CR  | HP×  | Rare× | Cu     | Fe      | PM   | 5pHE  | 10pHE | P10   | P25   | P50   | P90   | Spread | Score');
console.log('-'.repeat(130));
for (let i = 0; i < Math.min(15, fineResults.length); i++) {
  const s = fineResults[i];
  console.log(
    `  ${(i+1).toString().padStart(2)} | ${s.cr.toString().padStart(3)} | ${s.chm.toFixed(1)} | ${s.rm.toFixed(1)}  ` +
    `| ${s.cc.hp}/${s.cc.reward.toString().padStart(2)} | ${s.ic.hp}/${s.ic.reward.toString().padStart(3)} ` +
    `| ${s.pm.toFixed(2)} | ${(s.he5*100).toFixed(1)}% | ${(s.he10*100).toFixed(1)}% ` +
    `| ${s.p10.toString().padStart(5)} | ${s.p25.toString().padStart(5)} | ${s.p50.toString().padStart(5)} ` +
    `| ${s.p90.toString().padStart(5)} | ${s.roiSpread.toFixed(1)}%   | ${s.totalScore.toFixed(4)}`
  );
}

// ============ PHASE 3: PRECISION VALIDATION ============
const W = fineResults.length > 0 ? fineResults[0] : results[0];
console.log(`\n${'='.repeat(100)}`);
console.log(`  WINNER: commonReward=${W.cr} commonHpMult=${W.chm} rareMult=${W.rm} copper=${W.cc.hp}/${W.cc.reward} iron=${W.ic.hp}/${W.ic.reward} priceMult=${W.pm}`);
console.log(`${'='.repeat(100)}`);

console.log('\n=== PHASE 3: Precision Validation (80K iterations) ===\n');

const wBlk = makeBlocks(W.chm, W.cr, W.cc.hp, W.cc.reward, W.ic.hp, W.ic.reward, W.rm);
const wPool = buildPool(wBlk);
const wPicks = makePicks(W.pm);
const wRates = {};
for (const [t, d] of Object.entries(wPicks)) wRates[t] = enc(d);

// Show new block table
console.log('New Block Table:');
console.log('  Block       | HP  | Reward | Type  | Weight');
console.log('  ' + '-'.repeat(55));
for (const [t, d] of Object.entries(wBlk)) {
  if (d.weight > 0) {
    console.log(`  ${t.padEnd(13)} | ${d.hp.toString().padStart(3)} | ${d.reward.toString().padStart(6)} | ${d.rewardType.padEnd(5)} | ${d.weight}%`);
  }
}

// Weighted average block reward
const totalW = Object.values(wBlk).reduce((s, x) => s + x.weight, 0);
let avgR = 0;
for (const [t, d] of Object.entries(wBlk)) {
  if (d.weight > 0) avgR += (d.weight / totalW) * d.reward;
}
console.log(`\n  Avg block reward: ${avgR.toFixed(1)} (was ~149)\n`);

for (const pc of [3, 5, 10, 20, 40]) {
  const steal = wRates['system'] / (wRates['system'] + pc * 1.5 * 3.0);
  let bS = 0, bR = 0;
  console.log(`  @${pc} players (steal ${(steal*100).toFixed(2)}%):`);

  const userTypes = ['basic', 'power', 'light', 'swift'];
  for (const t of userTypes) {
    const d = wPicks[t];
    const rate = wRates[t];
    let rS = 0, bkS = 0;
    for (let i = 0; i < 80000; i++) {
      const r = simPickaxe(d, wPool, steal, rate);
      rS += r.rew; bkS += r.blocks;
    }
    const avgRew = rS / 80000;
    const avgBlk = bkS / 80000;
    const roi = (avgRew / d.price) * 100;
    console.log(`    ${t.padEnd(6)} ${d.price.toString().padStart(5)}cr DMG${d.damage} | blk${avgBlk.toFixed(1).padStart(5)} rew${avgRew.toFixed(0).padStart(6)} ROI ${roi.toFixed(1).padStart(5)}%`);
    if (PURCHASE_MIX[t]) { bS += d.price * PURCHASE_MIX[t]; bR += avgRew * PURCHASE_MIX[t]; }
  }

  let tR = 0;
  for (let i = 0; i < 80000; i++) tR += simTNT(TNT_DEF, wPool);
  const tAvg = tR / 80000;
  console.log(`    tnt    ${TNT_DEF.price}cr DMG${TNT_DEF.damage}       | rew${tAvg.toFixed(0).padStart(6)} ROI ${((tAvg/TNT_DEF.price)*100).toFixed(1).padStart(5)}%`);
  bS += TNT_DEF.price * PURCHASE_MIX.tnt;
  bR += tAvg * PURCHASE_MIX.tnt;

  const he = 1 - (bR / bS);
  const mark = pc === 5 ? ' <<< target 55%' : pc === 10 ? ' <<< target 54%' : '';
  console.log(`    BLENDED HE = ${(he*100).toFixed(2)}%${mark}`);
  console.log('');
}

// Session percentile analysis
console.log('=== Session Analysis (spending ~10,000 credits) ===\n');
for (const pc of [5, 10]) {
  const steal = wRates['system'] / (wRates['system'] + pc * 1.5 * 3.0);
  const sess = simSession(wPicks, wPool, steal, 20000);
  console.log(`  @${pc} players, 20K sessions:`);
  console.log(`    Min:  ${sess.min.toLocaleString()}`);
  console.log(`    P5:   ${sess.p5.toLocaleString()}`);
  console.log(`    P10:  ${sess.p10.toLocaleString()}  ← floor target: 2,000~3,000`);
  console.log(`    P25:  ${sess.p25.toLocaleString()}`);
  console.log(`    P50:  ${sess.p50.toLocaleString()}  ← median`);
  console.log(`    P75:  ${sess.p75.toLocaleString()}`);
  console.log(`    P90:  ${sess.p90.toLocaleString()}  ← good luck`);
  console.log(`    P95:  ${sess.p95.toLocaleString()}`);
  console.log(`    Max:  ${sess.max.toLocaleString()}  ← jackpot territory`);
  console.log(`    Avg:  ${sess.avg.toFixed(0).toLocaleString()}`);
  console.log('');
}

// ============ FINAL OUTPUT ============
console.log('\n' + '='.repeat(100));
console.log('  FINAL VALUES FOR constants.js (v4.7)');
console.log('='.repeat(100));

console.log('\nPICKAXE_TYPES:');
console.log(`  basic:  price ${wPicks.basic.price}, damage 3, scale 0.8, gravMult 1.0, speedMult 1.0, lifetime 30s`);
console.log(`  power:  price ${wPicks.power.price}, damage 5, scale 1.0, gravMult 1.0, speedMult 1.0, lifetime 30s`);
console.log(`  light:  price ${wPicks.light.price}, damage 4, scale 0.7, gravMult 0.5, speedMult 1.0, lifetime 35s`);
console.log(`  swift:  price ${wPicks.swift.price}, damage 3, scale 0.75, gravMult 1.0, speedMult 1.6, lifetime 25s`);
console.log(`  system: damage ${SYSTEM.damage}, scale 1.5, gravMult ${SYSTEM.gravityMult}, speedMult ${SYSTEM.speedMult} (unchanged)`);

console.log('\nBLOCK_TYPES (changed):');
for (const [t, d] of Object.entries(wBlk)) {
  const old = BLK_BASE[t];
  if (d.weight > 0) {
    const hpChanged = d.hp !== old.hp ? ` (was ${old.hp})` : '';
    const rewChanged = d.reward !== old.reward ? ` (was ${old.reward})` : '';
    const typeChanged = d.rewardType !== old.rewardType ? ` (was ${old.rewardType})` : '';
    console.log(`  ${t.padEnd(13)}: hp ${d.hp}${hpChanged}, reward ${d.reward}${rewChanged}, type ${d.rewardType}${typeChanged}`);
  }
}

console.log('\nTNT: unchanged (price 8000, damage 30)');
console.log('COMBO: unchanged');
console.log('SYSTEM PICKAXE: unchanged from v4.6');
