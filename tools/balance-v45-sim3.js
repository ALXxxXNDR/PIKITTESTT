#!/usr/bin/env node
/**
 * PIKIT v4.5 Balance Simulation - Round 3 (Fine-tuning)
 *
 * Key insight from Round 2:
 * - D7 (sys 1.2/8dmg + boosted rewards) hit 5p=55.3% but 10p=49.8% (need 54%)
 * - Need BIGGER system (higher steal) so 10p stays high, but compensate with rewards
 * - Bigger sys = steeper curve = higher 5p AND higher 10p
 * - Then tune rewards/prices to land both on target
 *
 * Target: 5p=55%, 10p=54%
 */

const COMBO = {
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

const MIX = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };
const PLAYER_COUNTS = [5, 10, 20, 40];
const ITERS = 60000;

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
    if (chp <= 0) {
      ch++;
      let cm = COMBO.MULTIPLIERS[0];
      for (let j = COMBO.THRESHOLDS.length - 1; j >= 0; j--) if (ch >= COMBO.THRESHOLDS[j]) { cm = COMBO.MULTIPLIERS[j]; break; }
      tr += Math.round(getBR(cb) * cm); bd++; chp = 0;
    }
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

function run(label, picks, blocks, tntDef) {
  const pool = buildBlockPool(blocks);
  const enc = {}; for (const [t, d] of Object.entries(picks)) enc[t] = calcER(d);
  const sr = enc['system'];
  const cs = pc => sr / (sr + pc * 1.5 * 3.0);
  const pt = Object.keys(picks).filter(t => t !== 'system');
  const results = {};

  for (const pc of PLAYER_COUNTS) {
    const steal = cs(pc); let bS = 0, bR = 0;
    const pr = {};
    for (const t of pt) {
      const d = picks[t]; const rate = enc[t];
      let rS = 0, bSm = 0;
      for (let i = 0; i < ITERS; i++) { const r = simPick(d, pool, steal, rate); rS += r.totalReward; bSm += r.blocksDestroyed; }
      const avg = rS / ITERS; const blk = bSm / ITERS;
      pr[t] = { avg, blk, roi: avg / d.price, price: d.price };
      if (MIX[t]) { bS += d.price * MIX[t]; bR += avg * MIX[t]; }
    }
    let tR = 0; for (let i = 0; i < ITERS; i++) tR += simTNT(tntDef, pool);
    const ta = tR / ITERS;
    pr['tnt'] = { avg: ta, roi: ta / tntDef.price, price: tntDef.price };
    bS += tntDef.price * MIX.tnt; bR += ta * MIX.tnt;
    results[pc] = { steal, he: 1 - (bR / bS), bS, bR, pickResults: pr };
  }
  return { label, sysRate: sr, results };
}

function print(res) {
  console.log(`\n${'='.repeat(78)}`);
  console.log(`  ${res.label}`);
  console.log(`${'='.repeat(78)}`);
  console.log(`  Sys enc: ${res.sysRate.toFixed(2)}/s`);
  for (const pc of PLAYER_COUNTS) {
    const r = res.results[pc];
    console.log(`\n  @${pc}p (steal ${(r.steal*100).toFixed(1)}%):`);
    for (const [t, pr] of Object.entries(r.pickResults)) {
      if (t === 'tnt') console.log(`    tnt     | rew ${pr.avg.toFixed(0).padStart(5)} ROI ${(pr.roi*100).toFixed(1).padStart(5)}%`);
      else console.log(`    ${t.padEnd(7)} | ${String(pr.price).padStart(5)}cr blk${pr.blk.toFixed(1).padStart(5)} rew${pr.avg.toFixed(0).padStart(5)} ROI${(pr.roi*100).toFixed(1).padStart(5)}%`);
    }
    console.log(`    HE: ${(r.he*100).toFixed(1)}%`);
  }
  const he5 = res.results[5].he * 100, he10 = res.results[10].he * 100;
  const e5 = Math.abs(he5 - 55), e10 = Math.abs(he10 - 54);
  const r10 = res.results[10].pickResults;
  const rois = Object.entries(r10).filter(([t]) => t !== 'tnt').map(([,v]) => v.roi);
  const spread = (Math.max(...rois) - Math.min(...rois)) * 100;
  console.log(`\n  SCORE: |5p-55|=${e5.toFixed(1)} + |10p-54|=${e10.toFixed(1)} = ${(e5+e10).toFixed(1)} (spread ${spread.toFixed(1)}pp)`);
  return { totalErr: e5+e10, spread, he5, he10, he20: res.results[20].he*100, he40: res.results[40].he*100 };
}

const TNT = { price: 8000, damage: 30, radiusX: 2, radiusDown: 3 };

// The math: stealRate = sysEnc / (sysEnc + pc * 4.5)
// For 5p: steal = sysEnc / (sysEnc + 22.5)
// For 10p: steal = sysEnc / (sysEnc + 45)
// We want HE(5) - HE(10) ≈ 1% (55 vs 54)
// Bigger sys = bigger gap between 5p and 10p steal
// Need sys that creates just enough gap

// Let's work backwards:
// At 5p with current prices, raw ROI ~60%. Need steal to bring blended to 45% ROI (55% HE).
// At 10p, need blended 46% ROI (54% HE).
// Steal(5p) - Steal(10p) should create ~1% HE difference.

const configs = [];

// E0: sys 1.5/8dmg + boosted rewards (bigger sys for higher 10p steal)
const B1 = {
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

configs.push(['E0: sys 1.5/8dmg/0.7g/1.3s + boost rew', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.5,  gravityMult: 0.7, speedMult: 1.3, lifetime: Infinity },
}, B1, TNT]);

// E1: sys 1.6/8dmg + boost rew (even bigger sys)
configs.push(['E1: sys 1.6/8dmg/0.7g/1.3s + boost rew', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.6,  gravityMult: 0.7, speedMult: 1.3, lifetime: Infinity },
}, B1, TNT]);

// E2: sys 1.7/8dmg + boost rew
configs.push(['E2: sys 1.7/8dmg/0.7g/1.3s + boost rew', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.7,  gravityMult: 0.7, speedMult: 1.3, lifetime: Infinity },
}, B1, TNT]);

// E3: sys 1.8/8dmg + higher boost rew (same sys as v4.4 but with boosted rewards)
const B2 = {
  diamond_block: { hp: 180, weight: 1,  reward: 6000, rewardType: 'fixed', tntResist: true },
  gold_block:    { hp: 90,  weight: 2,  reward: 2400, rewardType: 'fixed', tntResist: true },
  emerald_block: { hp: 55,  weight: 5,  reward: 750,  rewardType: 'fixed' },
  iron_block:    { hp: 32,  weight: 12, reward: 190,  rewardType: 'fixed' },
  copper_block:  { hp: 20,  weight: 20, reward: 65,   rewardType: 'fixed' },
  stone:         { hp: 10,  weight: 20, reward: 3,    rewardType: 'random' },
  dirt:          { hp: 7,   weight: 18, reward: 3,    rewardType: 'random' },
  gravel:        { hp: 9,   weight: 12, reward: 3,    rewardType: 'random' },
  clay:          { hp: 8,   weight: 10, reward: 3,    rewardType: 'random' },
};
configs.push(['E3: sys 1.8/8dmg/0.7g/1.5s + big boost rew', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.8,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
}, B2, TNT]);

// E4: sys 1.6/8dmg + B2 rewards
configs.push(['E4: sys 1.6/8dmg/0.7g/1.3s + big boost', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.6,  gravityMult: 0.7, speedMult: 1.3, lifetime: Infinity },
}, B2, TNT]);

// E5: sys 1.5/8dmg + B2 + slightly lower prices
configs.push(['E5: sys 1.5/8dmg + B2 + lower prices', {
  basic:  { price: 1600, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 4500, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2000, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2000, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.5,  gravityMult: 0.7, speedMult: 1.3, lifetime: Infinity },
}, B2, TNT]);

// E6: sys 1.4/8dmg + B2 + current prices
configs.push(['E6: sys 1.4/8dmg/0.7g/1.3s + B2', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.4,  gravityMult: 0.7, speedMult: 1.3, lifetime: Infinity },
}, B2, TNT]);

// E7: sys 1.5/8dmg/0.7g/1.4s + B2 (higher speed = more steal)
configs.push(['E7: sys 1.5/8dmg/0.7g/1.4s + B2', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.5,  gravityMult: 0.7, speedMult: 1.4, lifetime: Infinity },
}, B2, TNT]);

// E8: Intermediate reward boost B1.5
const B15 = {
  diamond_block: { hp: 180, weight: 1,  reward: 5800, rewardType: 'fixed', tntResist: true },
  gold_block:    { hp: 90,  weight: 2,  reward: 2300, rewardType: 'fixed', tntResist: true },
  emerald_block: { hp: 55,  weight: 5,  reward: 720,  rewardType: 'fixed' },
  iron_block:    { hp: 32,  weight: 12, reward: 185,  rewardType: 'fixed' },
  copper_block:  { hp: 20,  weight: 20, reward: 62,   rewardType: 'fixed' },
  stone:         { hp: 10,  weight: 20, reward: 3,    rewardType: 'random' },
  dirt:          { hp: 7,   weight: 18, reward: 3,    rewardType: 'random' },
  gravel:        { hp: 9,   weight: 12, reward: 3,    rewardType: 'random' },
  clay:          { hp: 8,   weight: 10, reward: 3,    rewardType: 'random' },
};
configs.push(['E8: sys 1.6/8dmg/0.7g/1.3s + B1.5 rew', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.6,  gravityMult: 0.7, speedMult: 1.3, lifetime: Infinity },
}, B15, TNT]);

// E9: sys 1.7/8dmg + B2
configs.push(['E9: sys 1.7/8dmg/0.7g/1.3s + B2', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.7,  gravityMult: 0.7, speedMult: 1.3, lifetime: Infinity },
}, B2, TNT]);

// E10: sys 1.65/8dmg + B2
configs.push(['E10: sys 1.65/8dmg/0.7g/1.3s + B2', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.65, gravityMult: 0.7, speedMult: 1.3, lifetime: Infinity },
}, B2, TNT]);

// E11: sys 1.55/8dmg + B2
configs.push(['E11: sys 1.55/8dmg/0.7g/1.3s + B2', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.55, gravityMult: 0.7, speedMult: 1.3, lifetime: Infinity },
}, B2, TNT]);

console.log('PIKIT v4.5 Balance Simulation - ROUND 3');
console.log(`Iterations: ${ITERS} | Target: 5p=55%, 10p=54%\n`);

const all = [];
for (const [label, picks, blocks, tnt] of configs) {
  const res = run(label, picks, blocks, tnt);
  const score = print(res);
  all.push({ label, score, res });
}

console.log(`\n${'#'.repeat(78)}`);
console.log('  SORTED SUMMARY');
console.log(`${'#'.repeat(78)}`);
all.sort((a, b) => a.score.totalErr - b.score.totalErr);
console.log(`${'Config'.padEnd(50)} | 5p HE | 10p HE | 20p HE | 40p HE | Score`);
console.log('-'.repeat(100));
for (const { label, score } of all) {
  console.log(`${label.substring(0,49).padEnd(50)} | ${score.he5.toFixed(1)}% | ${score.he10.toFixed(1)}%  | ${score.he20.toFixed(1)}%  | ${score.he40.toFixed(1)}%  | ${score.totalErr.toFixed(1)}`);
}
console.log(`\n*** BEST: ${all[0].label} ***`);
console.log(`    5p=${all[0].score.he5.toFixed(1)}% 10p=${all[0].score.he10.toFixed(1)}% 20p=${all[0].score.he20.toFixed(1)}% 40p=${all[0].score.he40.toFixed(1)}%`);
