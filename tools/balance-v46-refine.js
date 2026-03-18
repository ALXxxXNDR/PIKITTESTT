#!/usr/bin/env node
/**
 * PIKIT v4.6 — Refine config D
 * Base: sys speed=0.10, grav=0.30, dmg=5, scale=1.5
 * Prices: basic 2000, power 5500, light 2400, swift 2200
 * HE: 5p=54.86%, 10p=53.58% — need slight upward nudge (~0.2-0.4%)
 *
 * Try small price increases to push HE closer to 55%/54%
 */

const COMBO = {
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

const BLK = {
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
const TNT_DEF = { price: 8000, damage: 30, radiusX: 2, radiusDown: 3 };
const MIX = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };

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
      combo++; blocks++;
      let cm = COMBO.MULTIPLIERS[0];
      for (let j = COMBO.THRESHOLDS.length - 1; j >= 0; j--)
        if (combo >= COMBO.THRESHOLDS[j]) { cm = COMBO.MULTIPLIERS[j]; break; }
      rew += Math.round(br(cur) * cm); hp = 0;
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

const pool = buildPool(BLK);
const ITERS = 200000;

// Sweep around config D
const candidates = [];

for (const basicP of [2000, 2050, 2100]) {
  for (const powerP of [5400, 5500, 5600]) {
    for (const lightP of [2400, 2450, 2500]) {
      for (const swiftP of [2100, 2200, 2300]) {
        candidates.push({
          basic:  { price: basicP,  damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
          power:  { price: powerP,  damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
          light:  { price: lightP,  damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
          swift:  { price: swiftP,  damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
          system: { price: 0, damage: 5, scale: 1.5, gravityMult: 0.30, speedMult: 0.10, lifetime: Infinity },
        });
      }
    }
  }
}

console.log(`Testing ${candidates.length} price combinations with 200K iters each...\n`);

const results = [];
for (const picks of candidates) {
  const rates = {};
  for (const [t, d] of Object.entries(picks)) rates[t] = enc(d);
  const sysEnc = rates['system'];

  const res = {};
  for (const pc of [5, 10]) {
    const steal = sysEnc / (sysEnc + pc * 1.5 * 3.0);
    let bS = 0, bR = 0;
    const rois = [];
    for (const t of ['basic', 'power', 'light', 'swift']) {
      const d = picks[t]; const rate = rates[t];
      let rS = 0;
      for (let i = 0; i < ITERS; i++) rS += simPickaxe(d, pool, steal, rate).rew;
      const avg = rS / ITERS;
      rois.push((avg / d.price) * 100);
      if (MIX[t]) { bS += d.price * MIX[t]; bR += avg * MIX[t]; }
    }
    let tR = 0;
    for (let i = 0; i < ITERS; i++) tR += simTNT(TNT_DEF, pool);
    bS += TNT_DEF.price * MIX.tnt; bR += (tR / ITERS) * MIX.tnt;
    const he = 1 - (bR / bS);
    res[`he${pc}`] = he;
    res[`rois${pc}`] = rois;
    res[`spread${pc}`] = Math.max(...rois) - Math.min(...rois);
  }

  const score5 = Math.abs(res.he5 - 0.55);
  const score10 = Math.abs(res.he10 - 0.54);
  // Penalize ROI spread > 3%
  const spreadPenalty = Math.max(0, res.spread5 - 3) * 0.005;
  const total = score5 + score10 + spreadPenalty;

  results.push({
    basicP: picks.basic.price, powerP: picks.power.price,
    lightP: picks.light.price, swiftP: picks.swift.price,
    ...res, total
  });
}

results.sort((a, b) => a.total - b.total);

console.log('Top 10:');
console.log('Rank | Basic | Power | Light | Swift | 5p HE  | 10p HE | Spread5 | Score');
console.log('-'.repeat(85));
for (let i = 0; i < Math.min(10, results.length); i++) {
  const s = results[i];
  console.log(
    `  ${(i+1).toString().padStart(2)} | ${s.basicP} | ${s.powerP} | ${s.lightP} | ${s.swiftP} ` +
    `| ${(s.he5*100).toFixed(2)}% | ${(s.he10*100).toFixed(2)}% | ${s.spread5.toFixed(1)}%   | ${(s.total*100).toFixed(3)}%`
  );
}

// Full precision run on winner
const W = results[0];
console.log(`\n${'='.repeat(80)}`);
console.log(`  WINNER: basic=${W.basicP} power=${W.powerP} light=${W.lightP} swift=${W.swiftP}`);
console.log(`  System: damage=5, scale=1.5, gravMult=0.30, speedMult=0.10`);
console.log(`${'='.repeat(80)}\n`);

const wPicks = {
  basic:  { price: W.basicP,  damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: W.powerP,  damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: W.lightP,  damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: W.swiftP,  damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0, damage: 5, scale: 1.5, gravityMult: 0.30, speedMult: 0.10, lifetime: Infinity },
};
const wRates = {};
for (const [t, d] of Object.entries(wPicks)) wRates[t] = enc(d);

console.log('=== FULL PRECISION (250K iters) ===\n');
for (const pc of [3, 5, 10, 20, 40]) {
  const steal = wRates['system'] / (wRates['system'] + pc * 1.5 * 3.0);
  let bS = 0, bR = 0;
  console.log(`  @${pc}p (steal ${(steal*100).toFixed(2)}%):`);
  for (const t of ['basic', 'power', 'light', 'swift']) {
    const d = wPicks[t]; const rate = wRates[t];
    let rS = 0, bkS = 0;
    for (let i = 0; i < 250000; i++) {
      const r = simPickaxe(d, pool, steal, rate);
      rS += r.rew; bkS += r.blocks;
    }
    const avg = rS / 250000;
    const roi = (avg / d.price) * 100;
    console.log(`    ${t.padEnd(6)} ${d.price.toString().padStart(5)}cr DMG${d.damage} sc${d.scale} | blk${(bkS/250000).toFixed(1).padStart(5)} rew${avg.toFixed(0).padStart(6)} ROI ${roi.toFixed(1).padStart(5)}%`);
    if (MIX[t]) { bS += d.price * MIX[t]; bR += avg * MIX[t]; }
  }
  let tR = 0;
  for (let i = 0; i < 250000; i++) tR += simTNT(TNT_DEF, pool);
  const ta = tR / 250000;
  console.log(`    tnt    ${TNT_DEF.price}cr DMG30       | rew${ta.toFixed(0).padStart(6)} ROI ${((ta/TNT_DEF.price)*100).toFixed(1).padStart(5)}%`);
  bS += TNT_DEF.price * MIX.tnt; bR += ta * MIX.tnt;
  const he = 1 - (bR / bS);
  const mark = pc === 5 ? ' <<< target 55%' : pc === 10 ? ' <<< target 54%' : '';
  console.log(`    BLENDED HE = ${(he*100).toFixed(2)}%${mark}\n`);
}
