#!/usr/bin/env node
/**
 * PIKIT v4.7 Final Validation — Rounded values
 * Winner from sweep: commonReward=28, hpMult=0.3, rareMult=0.9, copper=15/50, iron=20/100, priceMult=1.63
 * Rounded prices: basic=3400, power=8800, light=3900, swift=3600
 * Also test nearby price options
 */

const COMBO = {
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

const BLK = {
  diamond_block: { hp: 180, weight: 1,  reward: 4500, rewardType: 'fixed', tntResist: true },
  gold_block:    { hp: 90,  weight: 2,  reward: 1800, rewardType: 'fixed', tntResist: true },
  emerald_block: { hp: 55,  weight: 5,  reward: 540,  rewardType: 'fixed' },
  iron_block:    { hp: 20,  weight: 12, reward: 100,  rewardType: 'fixed' },
  copper_block:  { hp: 15,  weight: 20, reward: 50,   rewardType: 'fixed' },
  stone:         { hp: 3,   weight: 20, reward: 28,   rewardType: 'fixed' },
  dirt:          { hp: 2,   weight: 18, reward: 22,   rewardType: 'fixed' },
  gravel:        { hp: 3,   weight: 12, reward: 25,   rewardType: 'fixed' },
  clay:          { hp: 2,   weight: 10, reward: 24,   rewardType: 'fixed' },
};

const SYSTEM = { damage: 5, scale: 1.5, gravityMult: 0.3, speedMult: 0.1 };
const TNT_DEF = { price: 8000, damage: 30, radiusX: 2, radiusDown: 3 };
const PURCHASE_MIX = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };

function buildPool(b) {
  const p = [], tw = Object.values(b).reduce((s, x) => s + x.weight, 0);
  for (const [t, d] of Object.entries(b)) if (d.weight > 0) p.push({ ...d, type: t, p: d.weight / tw });
  return p;
}
function pk(p) { let r = Math.random(), c = 0; for (const b of p) { c += b.p; if (r <= c) return b; } return p[p.length - 1]; }
function br(b) { return b.reward; }  // All fixed now
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

function simSession(picks, pool, steal, rates, iters) {
  const sessionReturns = [];
  const userTypes = ['basic', 'power', 'light', 'swift'];

  for (let sess = 0; sess < iters; sess++) {
    let totalSpent = 0, totalEarned = 0;
    while (totalSpent < 10000) {
      const roll = Math.random();
      let cumP = 0, chosenType = 'basic';
      for (const [t, mix] of Object.entries(PURCHASE_MIX)) {
        cumP += mix;
        if (roll <= cumP) { chosenType = t; break; }
      }
      if (chosenType === 'tnt') {
        totalSpent += TNT_DEF.price;
        totalEarned += simTNT(TNT_DEF, pool);
      } else {
        const def = picks[chosenType];
        totalSpent += def.price;
        totalEarned += simPickaxe(def, pool, steal, rates[chosenType]).rew;
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

const pool = buildPool(BLK);

// Price options to test (rounded nicely)
const options = {
  A: { basic: 3400, power: 8800, light: 3900, swift: 3600 },
  B: { basic: 3500, power: 9000, light: 4000, swift: 3600 },
  C: { basic: 3300, power: 8500, light: 3800, swift: 3500 },
  D: { basic: 3400, power: 8500, light: 3900, swift: 3500 },
  E: { basic: 3500, power: 8800, light: 4000, swift: 3500 },
};

console.log('PIKIT v4.7 Final Validation\n');
console.log('Block changes:');
console.log('  Stone:   HP 10→3,  reward 1-5→28 (fixed)');
console.log('  Dirt:    HP 7→2,   reward 1-5→22 (fixed)');
console.log('  Gravel:  HP 9→3,   reward 1-5→25 (fixed)');
console.log('  Clay:    HP 8→2,   reward 1-5→24 (fixed)');
console.log('  Iron:    HP 32→20, reward 150→100');
console.log('  Copper:  HP 20→15, reward 50→50 (unchanged)');
console.log('  Diamond: reward 5000→4500');
console.log('  Gold:    reward 2000→1800');
console.log('  Emerald: reward 600→540');
console.log('');

const sysRate = enc(SYSTEM);

for (const [name, prices] of Object.entries(options)) {
  const picks = {
    basic:  { price: prices.basic,  damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    power:  { price: prices.power,  damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    light:  { price: prices.light,  damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
    swift:  { price: prices.swift,  damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
    system: { price: 0, damage: SYSTEM.damage, scale: SYSTEM.scale, gravityMult: SYSTEM.gravityMult, speedMult: SYSTEM.speedMult, lifetime: Infinity },
  };

  const rates = {};
  for (const [t, d] of Object.entries(picks)) rates[t] = enc(d);

  console.log(`=== Option ${name}: basic=${prices.basic} power=${prices.power} light=${prices.light} swift=${prices.swift} ===`);

  for (const pc of [5, 10]) {
    const steal = sysRate / (sysRate + pc * 1.5 * 3.0);
    let bS = 0, bR = 0;

    for (const t of ['basic', 'power', 'light', 'swift']) {
      const d = picks[t];
      let rS = 0;
      for (let i = 0; i < 60000; i++) rS += simPickaxe(d, pool, steal, rates[t]).rew;
      const avgRew = rS / 60000;
      const roi = (avgRew / d.price) * 100;
      if (pc === 5) {
        process.stdout.write(`  ${t.padEnd(6)} ${d.price.toString().padStart(5)}cr ROI ${roi.toFixed(1)}%`);
      }
      if (PURCHASE_MIX[t]) { bS += d.price * PURCHASE_MIX[t]; bR += avgRew * PURCHASE_MIX[t]; }
    }

    let tR = 0;
    for (let i = 0; i < 60000; i++) tR += simTNT(TNT_DEF, pool);
    bS += TNT_DEF.price * PURCHASE_MIX.tnt;
    bR += (tR / 60000) * PURCHASE_MIX.tnt;

    const he = 1 - (bR / bS);

    if (pc === 5) {
      console.log('');
      // Session analysis
      const sess = simSession(picks, pool, steal, rates, 15000);
      console.log(`  5p HE=${(he*100).toFixed(1)}%  |  10K session: P10=${sess.p10} P25=${sess.p25} P50=${sess.p50} P90=${sess.p90} max=${sess.max}`);
    } else {
      console.log(`  10p HE=${(he*100).toFixed(1)}%`);
    }
  }
  console.log('');
}
