#!/usr/bin/env node
/**
 * PIKIT v4.5 FINAL Balance Simulation
 *
 * From rounds 1-5 we learned:
 * - With steal formula, 5p-10p gap is at MINIMUM ~2.5% HE
 * - Best achievable: 5p≈55%, 10p≈52.5-53%
 * - OR: 5p≈56%, 10p≈54% (if we accept 5p being ~1% over)
 *
 * STRATEGY: Accept the gap and find configs closest to BOTH targets:
 * Option A: Prioritize 5p=55%, accept 10p≈52-53% (F5 from R5)
 * Option B: Target 5p=56%, 10p=53.5% (split the difference)
 * Option C: Use per-pickaxe price tuning for better spread control
 *
 * Let's also try modifying the steal formula constant (avgPickaxesActive)
 * to see if that helps. Currently 1.5 — what if we make it variable?
 */

const COMBO = {
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

const MIX = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };
const ITERS = 80000; // High accuracy for final

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

function fullSim(label, picks, blocks, tntDef, stealFormula) {
  const pl = buildBlockPool(blocks);
  const enc = {}; for (const [t, d] of Object.entries(picks)) enc[t] = calcER(d);
  const sr = enc['system'];
  const pt = Object.keys(picks).filter(t => t !== 'system');

  console.log(`\n${'='.repeat(80)}`);
  console.log(`  ${label}`);
  console.log(`  sysEnc=${sr.toFixed(2)}/s | stealFormula: ${stealFormula || 'default (pc*1.5*3.0)'}`);
  console.log(`${'='.repeat(80)}`);

  const heByPc = {};
  for (const pc of [5, 10, 20, 40]) {
    let steal;
    if (stealFormula === 'scaled') {
      // Scale avgPickaxesActive with player count: fewer players = more picks per player
      const avgPicks = 1.5 + 5.0 / pc; // 2.5 at 5p, 2.0 at 10p, 1.75 at 20p, 1.625 at 40p
      steal = sr / (sr + pc * avgPicks * 3.0);
    } else {
      steal = sr / (sr + pc * 1.5 * 3.0);
    }

    console.log(`\n  @${pc}p (steal ${(steal*100).toFixed(1)}%):`);
    let bS = 0, bR = 0;
    const rois = [];
    for (const t of pt) {
      const d = picks[t]; const rate = enc[t];
      let rS = 0, bSm = 0;
      for (let i = 0; i < ITERS; i++) { const res = simPick(d, pl, steal, rate); rS += res.totalReward; bSm += res.blocksDestroyed; }
      const avg = rS / ITERS; const blk = bSm / ITERS;
      const roi = avg / d.price;
      rois.push(roi);
      console.log(`    ${t.padEnd(7)} | ${String(d.price).padStart(5)}cr blk${blk.toFixed(1).padStart(5)} rew${avg.toFixed(0).padStart(6)} ROI${(roi*100).toFixed(1).padStart(5)}%`);
      if (MIX[t]) { bS += d.price * MIX[t]; bR += avg * MIX[t]; }
    }
    let tR = 0; for (let i = 0; i < ITERS; i++) tR += simTNT(tntDef, pl);
    const ta = tR / ITERS;
    console.log(`    tnt     | ${String(tntDef.price).padStart(5)}cr rew${ta.toFixed(0).padStart(6)} ROI${(ta/tntDef.price*100).toFixed(1).padStart(5)}%`);
    bS += tntDef.price * MIX.tnt; bR += ta * MIX.tnt;
    const he = (1 - bR/bS) * 100;
    const spread = (Math.max(...rois) - Math.min(...rois)) * 100;
    console.log(`    HE: ${he.toFixed(1)}% | ROI spread: ${spread.toFixed(1)}pp`);
    heByPc[pc] = he;
  }

  const err = Math.abs(heByPc[5] - 55) + Math.abs(heByPc[10] - 54);
  console.log(`\n  SCORE: ${err.toFixed(1)} (5p=${heByPc[5].toFixed(1)}% 10p=${heByPc[10].toFixed(1)}% 20p=${heByPc[20].toFixed(1)}% 40p=${heByPc[40].toFixed(1)}%)`);
  return { err, he5: heByPc[5], he10: heByPc[10], he20: heByPc[20], he40: heByPc[40] };
}

const results = [];

// G0: BEST from R5 — F5: sys 0.75/0.75s/0.7g (5p≈55.4%, 10p≈52.8%)
results.push({ label: 'G0: F5 baseline (sys 0.75/0.75s)', ...fullSim(
  'G0: F5 baseline — sys 0.75/0.75s/0.7g',
  {
    basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
    swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
    system: { price: 0,    damage: 8, scale: 0.75, gravityMult: 0.7, speedMult: 0.75, lifetime: Infinity },
  }, BLOCKS, TNT, 'default')
});

// G1: Same but with SCALED steal formula (more picks per player at low counts)
results.push({ label: 'G1: F5 + scaled steal', ...fullSim(
  'G1: sys 0.75/0.75s + SCALED steal (avgPicks=1.5+5/pc)',
  {
    basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
    swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
    system: { price: 0,    damage: 8, scale: 0.75, gravityMult: 0.7, speedMult: 0.75, lifetime: Infinity },
  }, BLOCKS, TNT, 'scaled')
});

// G2: Bigger sys + scaled steal (so gap narrows at low player counts)
results.push({ label: 'G2: sys 1.2/1.0s + scaled steal', ...fullSim(
  'G2: sys 1.2/1.0s/0.7g + SCALED steal',
  {
    basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
    swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
    system: { price: 0,    damage: 8, scale: 1.2,  gravityMult: 0.7, speedMult: 1.0, lifetime: Infinity },
  }, BLOCKS, TNT, 'scaled')
});

// G3: sys 1.5/1.2s + scaled steal + current v4.4 prices
results.push({ label: 'G3: sys 1.5/1.2s + scaled steal', ...fullSim(
  'G3: sys 1.5/1.2s/0.7g + SCALED steal',
  {
    basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
    swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
    system: { price: 0,    damage: 8, scale: 1.5,  gravityMult: 0.7, speedMult: 1.2, lifetime: Infinity },
  }, BLOCKS, TNT, 'scaled')
});

// G4: v4.4 sys (1.8/1.5s) + scaled steal
results.push({ label: 'G4: v4.4 sys + scaled steal', ...fullSim(
  'G4: v4.4 sys 1.8/1.5s/0.7g + SCALED steal',
  {
    basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
    swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
    system: { price: 0,    damage: 8, scale: 1.8,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
  }, BLOCKS, TNT, 'scaled')
});

// G5: sys 1.0/0.9s + scaled steal
results.push({ label: 'G5: sys 1.0/0.9s + scaled', ...fullSim(
  'G5: sys 1.0/0.9s/0.7g + SCALED steal',
  {
    basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
    swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
    system: { price: 0,    damage: 8, scale: 1.0,  gravityMult: 0.7, speedMult: 0.9, lifetime: Infinity },
  }, BLOCKS, TNT, 'scaled')
});

// G6: sys 1.3/1.1s + scaled steal
results.push({ label: 'G6: sys 1.3/1.1s + scaled', ...fullSim(
  'G6: sys 1.3/1.1s/0.7g + SCALED steal',
  {
    basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
    swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
    system: { price: 0,    damage: 8, scale: 1.3,  gravityMult: 0.7, speedMult: 1.1, lifetime: Infinity },
  }, BLOCKS, TNT, 'scaled')
});

// G7: sys 1.4/1.15s + scaled steal
results.push({ label: 'G7: sys 1.4/1.15s + scaled', ...fullSim(
  'G7: sys 1.4/1.15s/0.7g + SCALED steal',
  {
    basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
    swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
    system: { price: 0,    damage: 8, scale: 1.4,  gravityMult: 0.7, speedMult: 1.15, lifetime: Infinity },
  }, BLOCKS, TNT, 'scaled')
});

console.log(`\n\n${'#'.repeat(80)}`);
console.log('  FINAL SORTED SUMMARY');
console.log(`${'#'.repeat(80)}`);
results.sort((a, b) => a.err - b.err);
console.log(`${'Label'.padEnd(40)} | 5p HE | 10p HE | 20p HE | 40p HE | Score`);
console.log('-'.repeat(90));
for (const r of results) {
  console.log(`${r.label.padEnd(40)} | ${r.he5.toFixed(1)}% | ${r.he10.toFixed(1)}%  | ${r.he20.toFixed(1)}%  | ${r.he40.toFixed(1)}%  | ${r.err.toFixed(2)}`);
}

const best = results[0];
console.log(`\n${'*'.repeat(80)}`);
console.log(`  BEST: ${best.label}`);
console.log(`  5p=${best.he5.toFixed(1)}% | 10p=${best.he10.toFixed(1)}% | 20p=${best.he20.toFixed(1)}% | 40p=${best.he40.toFixed(1)}%`);
console.log(`  Score: ${best.err.toFixed(2)}`);
console.log(`${'*'.repeat(80)}`);
