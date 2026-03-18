#!/usr/bin/env node
/**
 * PIKIT v4.5 PRECISION PASS
 * Between G5 (sys 1.0/0.9s) and G2 (sys 1.2/1.0s) with scaled steal
 * Target: 5p=55%, 10p=54%
 * Scaled steal: avgPicks = 1.5 + 5.0/pc
 */

const COMBO = {
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

const MIX = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };
const ITERS = 80000;

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

const TNT = { price: 8000, damage: 30, radiusX: 2, radiusDown: 3 };
const pool = buildBlockPool(BLOCKS);

function run(label, picks) {
  const enc = {}; for (const [t, d] of Object.entries(picks)) enc[t] = calcER(d);
  const sr = enc['system'];
  const pt = Object.keys(picks).filter(t => t !== 'system');
  const heByPc = {};

  for (const pc of [5, 10, 20, 40]) {
    const avgPicks = 1.5 + 5.0 / pc;
    const steal = sr / (sr + pc * avgPicks * 3.0);
    let bS = 0, bR = 0;
    const pickData = {};
    for (const t of pt) {
      const d = picks[t]; const rate = enc[t];
      let rS = 0, bSm = 0;
      for (let i = 0; i < ITERS; i++) { const res = simPick(d, pool, steal, rate); rS += res.totalReward; bSm += res.blocksDestroyed; }
      const avg = rS / ITERS; const blk = bSm / ITERS;
      pickData[t] = { avg, blk, roi: avg / d.price, price: d.price };
      if (MIX[t]) { bS += d.price * MIX[t]; bR += avg * MIX[t]; }
    }
    let tR = 0; for (let i = 0; i < ITERS; i++) tR += simTNT(TNT, pool);
    const ta = tR / ITERS;
    pickData['tnt'] = { avg: ta, roi: ta / TNT.price, price: TNT.price };
    bS += TNT.price * MIX.tnt; bR += ta * MIX.tnt;
    heByPc[pc] = { he: (1 - bR/bS) * 100, steal, pickData, bS, bR };
  }
  return { label, sr, heByPc };
}

function printFull(r) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`  ${r.label} | sysEnc=${r.sr.toFixed(2)}/s`);
  console.log(`${'='.repeat(80)}`);
  for (const pc of [5, 10, 20, 40]) {
    const d = r.heByPc[pc];
    console.log(`\n  @${pc}p (steal ${(d.steal*100).toFixed(1)}%):`);
    const rois = [];
    for (const [t, pd] of Object.entries(d.pickData)) {
      if (t === 'tnt') console.log(`    tnt     | ${String(pd.price).padStart(5)}cr rew${pd.avg.toFixed(0).padStart(6)} ROI${(pd.roi*100).toFixed(1).padStart(5)}%`);
      else {
        rois.push(pd.roi);
        console.log(`    ${t.padEnd(7)} | ${String(pd.price).padStart(5)}cr blk${pd.blk.toFixed(1).padStart(5)} rew${pd.avg.toFixed(0).padStart(6)} ROI${(pd.roi*100).toFixed(1).padStart(5)}%`);
      }
    }
    const spread = (Math.max(...rois) - Math.min(...rois)) * 100;
    console.log(`    HE: ${d.he.toFixed(1)}% | ROI spread: ${spread.toFixed(1)}pp`);
  }
  const e5 = Math.abs(r.heByPc[5].he - 55), e10 = Math.abs(r.heByPc[10].he - 54);
  console.log(`\n  SCORE: ${(e5+e10).toFixed(2)} (|5p-55|=${e5.toFixed(1)} |10p-54|=${e10.toFixed(1)})`);
}

// Test configs between G5 (1.0/0.9) and G2 (1.2/1.0)
const configs = [
  ['H0: sys 1.05/0.95s/0.7g', 1.05, 0.95],
  ['H1: sys 1.1/0.95s/0.7g', 1.1, 0.95],
  ['H2: sys 1.1/1.0s/0.7g', 1.1, 1.0],
  ['H3: sys 1.15/1.0s/0.7g', 1.15, 1.0],
  ['H4: sys 1.15/0.95s/0.7g', 1.15, 0.95],
  ['H5: sys 1.1/0.9s/0.7g', 1.1, 0.9],
  ['H6: sys 1.05/1.0s/0.7g', 1.05, 1.0],
  ['H7: sys 1.2/0.95s/0.7g', 1.2, 0.95],
  ['H8: sys 1.0/1.0s/0.7g', 1.0, 1.0],
];

const allResults = [];
for (const [label, scale, speed] of configs) {
  const picks = {
    basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
    swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
    system: { price: 0,    damage: 8, scale, gravityMult: 0.7, speedMult: speed, lifetime: Infinity },
  };
  const res = run(label, picks);
  const e5 = Math.abs(res.heByPc[5].he - 55);
  const e10 = Math.abs(res.heByPc[10].he - 54);
  allResults.push({ ...res, err: e5 + e10, he5: res.heByPc[5].he, he10: res.heByPc[10].he, he20: res.heByPc[20].he, he40: res.heByPc[40].he });
}

allResults.sort((a, b) => a.err - b.err);

console.log('\n' + '#'.repeat(80));
console.log('  PRECISION RESULTS (scaled steal: avgPicks = 1.5 + 5/pc)');
console.log('#'.repeat(80));
console.log(`${'Config'.padEnd(35)} | 5p HE | 10p HE | 20p HE | 40p HE | Score`);
console.log('-'.repeat(90));
for (const r of allResults) {
  console.log(`${r.label.padEnd(35)} | ${r.he5.toFixed(1)}% | ${r.he10.toFixed(1)}%  | ${r.he20.toFixed(1)}%  | ${r.he40.toFixed(1)}%  | ${r.err.toFixed(2)}`);
}

// Print detailed results for top 3
console.log('\n\n=== DETAILED TOP 3 ===');
for (let i = 0; i < 3; i++) {
  printFull(allResults[i]);
}

const best = allResults[0];
console.log(`\n${'*'.repeat(80)}`);
console.log(`  WINNER: ${best.label}`);
console.log(`  5p=${best.he5.toFixed(1)}% | 10p=${best.he10.toFixed(1)}% | 20p=${best.he20.toFixed(1)}% | 40p=${best.he40.toFixed(1)}%`);
console.log(`  Score: ${best.err.toFixed(2)}`);
console.log(`${'*'.repeat(80)}`);

// Output exact values for implementation
console.log('\n\n=== IMPLEMENTATION VALUES ===');
console.log('Steal formula change needed in GameEngine.js:');
console.log('  OLD: const avgPickaxesActive = 1.5;');
console.log('  NEW: const avgPickaxesActive = 1.5 + 5.0 / playerCount;');
console.log('\nSystem pickaxe in constants.js:');
console.log(`  scale: ${best.label.match(/sys ([\d.]+)/)?.[1]}`);
console.log(`  speedMult: ${best.label.match(/([\d.]+)s/)?.[1]}`);
console.log('  gravityMult: 0.7');
console.log('  damage: 8');
console.log('\nAll other values (prices, blocks, TNT, combos) remain UNCHANGED from v4.4');
