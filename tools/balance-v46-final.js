#!/usr/bin/env node
/**
 * PIKIT v4.6 Final Validation
 * Tests the winning config with clean rounded numbers
 * Also tests per-pickaxe price adjustments to tighten ROI spread
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

// Test multiple configurations with clean numbers
const configs = [
  {
    name: 'A: Rounded from sim winner (speed=0.08, grav=0.35)',
    picks: {
      basic:  { price: 1900, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
      power:  { price: 5400, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
      light:  { price: 2400, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
      swift:  { price: 2400, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
      system: { price: 0, damage: 5, scale: 1.5, gravityMult: 0.35, speedMult: 0.08, lifetime: Infinity },
    }
  },
  {
    name: 'B: Tighten ROI spread (raise basic, lower swift price)',
    picks: {
      basic:  { price: 2100, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
      power:  { price: 5400, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
      light:  { price: 2400, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
      swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
      system: { price: 0, damage: 5, scale: 1.5, gravityMult: 0.35, speedMult: 0.08, lifetime: Infinity },
    }
  },
  {
    name: 'C: More aggressive ROI balance (basic 2200, swift 2100)',
    picks: {
      basic:  { price: 2200, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
      power:  { price: 5500, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
      light:  { price: 2400, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
      swift:  { price: 2100, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
      system: { price: 0, damage: 5, scale: 1.5, gravityMult: 0.35, speedMult: 0.08, lifetime: Infinity },
    }
  },
  {
    name: 'D: Higher sys speed 0.10 + grav 0.30 (sysEnc ~0.65)',
    picks: {
      basic:  { price: 2000, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
      power:  { price: 5500, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
      light:  { price: 2400, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
      swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
      system: { price: 0, damage: 5, scale: 1.5, gravityMult: 0.30, speedMult: 0.10, lifetime: Infinity },
    }
  },
  {
    name: 'E: Balanced ROI + sys speed 0.10 grav 0.30',
    picks: {
      basic:  { price: 2100, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
      power:  { price: 5500, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
      light:  { price: 2500, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
      swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
      system: { price: 0, damage: 5, scale: 1.5, gravityMult: 0.30, speedMult: 0.10, lifetime: Infinity },
    }
  },
];

const ITERS = 150000;

for (const cfg of configs) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`  ${cfg.name}`);
  console.log(`${'='.repeat(80)}`);

  const rates = {};
  for (const [t, d] of Object.entries(cfg.picks)) rates[t] = enc(d);
  const sysEnc = rates['system'];
  console.log(`  sysEncRate = ${sysEnc.toFixed(3)}\n`);

  for (const pc of [5, 10]) {
    const steal = sysEnc / (sysEnc + pc * 1.5 * 3.0);
    let bS = 0, bR = 0;
    const rois = [];
    console.log(`  @${pc}p (steal ${(steal*100).toFixed(2)}%):`);

    for (const t of ['basic', 'power', 'light', 'swift']) {
      const d = cfg.picks[t];
      const rate = rates[t];
      let rS = 0, bkS = 0;
      for (let i = 0; i < ITERS; i++) {
        const r = simPickaxe(d, pool, steal, rate);
        rS += r.rew; bkS += r.blocks;
      }
      const avg = rS / ITERS;
      const roi = (avg / d.price) * 100;
      rois.push(roi);
      console.log(`    ${t.padEnd(6)} ${d.price.toString().padStart(5)}cr | rew${avg.toFixed(0).padStart(6)} ROI ${roi.toFixed(1).padStart(5)}%`);
      if (MIX[t]) { bS += d.price * MIX[t]; bR += avg * MIX[t]; }
    }

    let tR = 0;
    for (let i = 0; i < ITERS; i++) tR += simTNT(TNT_DEF, pool);
    const ta = tR / ITERS;
    console.log(`    tnt    ${TNT_DEF.price}cr | rew${ta.toFixed(0).padStart(6)} ROI ${((ta/TNT_DEF.price)*100).toFixed(1).padStart(5)}%`);
    bS += TNT_DEF.price * MIX.tnt; bR += ta * MIX.tnt;

    const he = 1 - (bR / bS);
    const spread = Math.max(...rois) - Math.min(...rois);
    const target = pc === 5 ? 55 : 54;
    const mark = Math.abs(he*100 - target) < 1 ? 'OK' : 'MISS';
    console.log(`    HE = ${(he*100).toFixed(2)}% (target ${target}%) [${mark}] | ROI spread ${spread.toFixed(1)}%\n`);
  }
}
