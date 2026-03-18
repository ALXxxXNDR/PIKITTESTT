#!/usr/bin/env node
/**
 * PIKIT v4.5 Balance Simulation - Round 5 (Final Fine-tuning)
 *
 * Best from R4: sys 0.8/0.8s/0.7g gave 5p=56.2%, 10p=53.2%
 * Need to lower 5p by ~1% and raise 10p by ~0.8%.
 * Strategy: fine-tune sys enc rate (between 1.5 and 2.5) and reward mult (1.0-1.05)
 */

const COMBO = {
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

const MIX = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };
const ITERS = 60000;

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

function fullSim(label, picks, blocks, tntDef) {
  const pool = buildBlockPool(blocks);
  const enc = {}; for (const [t, d] of Object.entries(picks)) enc[t] = calcER(d);
  const sr = enc['system'];
  const pt = Object.keys(picks).filter(t => t !== 'system');

  console.log(`\n${'='.repeat(78)}`);
  console.log(`  ${label} | sysEnc=${sr.toFixed(2)}/s`);
  console.log(`${'='.repeat(78)}`);

  const heByPc = {};
  for (const pc of [5, 10, 20, 40]) {
    const steal = sr / (sr + pc * 1.5 * 3.0);
    console.log(`\n  @${pc}p (steal ${(steal*100).toFixed(1)}%):`);
    let bS = 0, bR = 0;
    const rois = [];
    for (const t of pt) {
      const d = picks[t]; const rate = enc[t];
      let rS = 0, bSm = 0;
      for (let i = 0; i < ITERS; i++) { const res = simPick(d, pool, steal, rate); rS += res.totalReward; bSm += res.blocksDestroyed; }
      const avg = rS / ITERS; const blk = bSm / ITERS;
      const roi = avg / d.price;
      rois.push(roi);
      console.log(`    ${t.padEnd(7)} | ${String(d.price).padStart(5)}cr blk${blk.toFixed(1).padStart(5)} rew${avg.toFixed(0).padStart(5)} ROI${(roi*100).toFixed(1).padStart(5)}%`);
      if (MIX[t]) { bS += d.price * MIX[t]; bR += avg * MIX[t]; }
    }
    let tR = 0; for (let i = 0; i < ITERS; i++) tR += simTNT(tntDef, pool);
    const ta = tR / ITERS;
    console.log(`    tnt     | ${String(tntDef.price).padStart(5)}cr rew${ta.toFixed(0).padStart(5)} ROI${(ta/tntDef.price*100).toFixed(1).padStart(5)}%`);
    bS += tntDef.price * MIX.tnt; bR += ta * MIX.tnt;
    const he = (1 - bR/bS) * 100;
    const spread = (Math.max(...rois) - Math.min(...rois)) * 100;
    console.log(`    HE: ${he.toFixed(1)}% | ROI spread: ${spread.toFixed(1)}pp`);
    heByPc[pc] = he;
  }

  const err = Math.abs(heByPc[5] - 55) + Math.abs(heByPc[10] - 54);
  console.log(`\n  >>> SCORE: ${err.toFixed(1)} (5p=${heByPc[5].toFixed(1)}% 10p=${heByPc[10].toFixed(1)}% 20p=${heByPc[20].toFixed(1)}% 40p=${heByPc[40].toFixed(1)}%)`);
  return { err, he5: heByPc[5], he10: heByPc[10], he20: heByPc[20], he40: heByPc[40] };
}

// ============================================================
// CANDIDATES: Fine-tune around the sweet spot
// ============================================================

const results = [];

// F0: sys 0.8/0.8s/0.7g - baseline from R4 (5p~56, 10p~53)
// Need to bring 5p down ~1% → slightly lower sys or slightly higher rewards
results.push({ label: 'F0', ...fullSim('F0: sys 0.8/0.8s/0.7g (R4 baseline)', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 0.8,  gravityMult: 0.7, speedMult: 0.8, lifetime: Infinity },
}, BLOCKS_BASE, TNT) });

// F1: sys 0.85/0.85s/0.7g — slightly higher enc to raise steal
results.push({ label: 'F1', ...fullSim('F1: sys 0.85/0.85s/0.7g', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 0.85, gravityMult: 0.7, speedMult: 0.85, lifetime: Infinity },
}, BLOCKS_BASE, TNT) });

// F2: sys 0.9/0.85s/0.7g
results.push({ label: 'F2', ...fullSim('F2: sys 0.9/0.85s/0.7g', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 0.9,  gravityMult: 0.7, speedMult: 0.85, lifetime: Infinity },
}, BLOCKS_BASE, TNT) });

// F3: Like F0 but with slight price reduction to bring HE down
results.push({ label: 'F3', ...fullSim('F3: sys 0.8/0.8s + prices -5%', {
  basic:  { price: 1700, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 4800, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2100, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2100, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 0.8,  gravityMult: 0.7, speedMult: 0.8, lifetime: Infinity },
}, BLOCKS_BASE, TNT) });

// F4: Like F0 but with 3% reward boost
const B103 = { ...BLOCKS_BASE,
  diamond_block: { hp: 180, weight: 1,  reward: 5150, rewardType: 'fixed', tntResist: true },
  gold_block:    { hp: 90,  weight: 2,  reward: 2060, rewardType: 'fixed', tntResist: true },
  emerald_block: { hp: 55,  weight: 5,  reward: 618,  rewardType: 'fixed' },
  iron_block:    { hp: 32,  weight: 12, reward: 155,  rewardType: 'fixed' },
  copper_block:  { hp: 20,  weight: 20, reward: 52,   rewardType: 'fixed' },
};
results.push({ label: 'F4', ...fullSim('F4: sys 0.8/0.8s + rewards +3%', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 0.8,  gravityMult: 0.7, speedMult: 0.8, lifetime: Infinity },
}, B103, TNT) });

// F5: sys 0.75/0.75s/0.7g — even smaller sys, tighter gap
results.push({ label: 'F5', ...fullSim('F5: sys 0.75/0.75s/0.7g', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 0.75, gravityMult: 0.7, speedMult: 0.75, lifetime: Infinity },
}, BLOCKS_BASE, TNT) });

// F6: sys 0.85/0.8s/0.7g + prices -3%
results.push({ label: 'F6', ...fullSim('F6: sys 0.85/0.8s + prices -3%', {
  basic:  { price: 1750, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 4850, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2130, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2130, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 0.85, gravityMult: 0.7, speedMult: 0.8, lifetime: Infinity },
}, BLOCKS_BASE, TNT) });

// F7: sys 0.9/0.9s/0.7g + prices -2%
results.push({ label: 'F7', ...fullSim('F7: sys 0.9/0.9s + prices -2%', {
  basic:  { price: 1760, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 4900, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2160, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2160, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 0.9,  gravityMult: 0.7, speedMult: 0.9, lifetime: Infinity },
}, BLOCKS_BASE, TNT) });

// F8: sys 0.8/0.8s + swift price up (to equalize ROIs)
results.push({ label: 'F8', ...fullSim('F8: sys 0.8/0.8s + swift 2400', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2400, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 0.8,  gravityMult: 0.7, speedMult: 0.8, lifetime: Infinity },
}, BLOCKS_BASE, TNT) });

// F9: sys 0.85/0.85s + power 4800 (equalize basic-power ROI gap)
results.push({ label: 'F9', ...fullSim('F9: sys 0.85/0.85s + power 4800/swift 2300', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 4800, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2300, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 0.85, gravityMult: 0.7, speedMult: 0.85, lifetime: Infinity },
}, BLOCKS_BASE, TNT) });

// Sort and display
console.log(`\n\n${'#'.repeat(78)}`);
console.log('  FINAL SORTED SUMMARY');
console.log(`${'#'.repeat(78)}`);
results.sort((a, b) => a.err - b.err);
console.log(`${'Label'.padEnd(6)} | 5p HE | 10p HE | 20p HE | 40p HE | Score`);
console.log('-'.repeat(60));
for (const r of results) {
  console.log(`${r.label.padEnd(6)} | ${r.he5.toFixed(1)}% | ${r.he10.toFixed(1)}%  | ${r.he20.toFixed(1)}%  | ${r.he40.toFixed(1)}%  | ${r.err.toFixed(2)}`);
}
console.log(`\n*** WINNER: ${results[0].label} ***`);
