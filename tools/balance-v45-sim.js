#!/usr/bin/env node
/**
 * PIKIT v4.5 Balance Simulation — FINAL
 *
 * FINDING: To hit 5p≈55%, 10p≈54%, we need TWO changes:
 *
 * 1. SCALED STEAL FORMULA: avgPickaxesActive = 1.5 + 5.0/playerCount
 *    This makes the steal curve flatter at low player counts.
 *    At 5p: avgPicks=2.5, at 10p: 2.0, at 20p: 1.75, at 40p: 1.625
 *
 * 2. REDUCED SYSTEM PICKAXE: scale 1.1, speedMult 0.9 (was 1.8/1.5)
 *    sysEncRate drops from 6.71/s to 2.87/s
 *
 * All other values (prices, blocks, TNT, combos) UNCHANGED from v4.4.
 *
 * Results:
 *   5p:  55.4% house edge (target: 55%)  ✓
 *   10p: 53.5% house edge (target: 54%)  ✓ (within 0.5%)
 *   20p: 51.8% (was 55% in v4.4)
 *   40p: 50.4% (was 53% in v4.4)
 *
 * ROI spread @10p: 4.3pp (basic 55% → swift 51%)
 * Per-pickaxe ROIs well balanced, no single pickaxe dominates.
 *
 * ALTERNATIVE (slightly higher 10p accuracy):
 *   System scale 1.15, speedMult 1.0 → 5p=56.1%, 10p=54.0%
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

const TNT = { price: 8000, damage: 30, radiusX: 2, radiusDown: 3 };

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

function fullTest(label, picks, stealType) {
  const pool = buildBlockPool(BLOCKS);
  const enc = {}; for (const [t, d] of Object.entries(picks)) enc[t] = calcER(d);
  const sr = enc['system'];
  const pt = Object.keys(picks).filter(t => t !== 'system');

  console.log(`\n${'='.repeat(80)}`);
  console.log(`  ${label}`);
  console.log(`  sysEncRate: ${sr.toFixed(2)}/s | stealType: ${stealType}`);
  console.log(`${'='.repeat(80)}`);

  for (const pc of [5, 10, 20, 40]) {
    let steal;
    if (stealType === 'scaled') {
      const avgPicks = 1.5 + 5.0 / pc;
      steal = sr / (sr + pc * avgPicks * 3.0);
    } else {
      steal = sr / (sr + pc * 1.5 * 3.0);
    }

    console.log(`\n  @${pc}p (steal ${(steal*100).toFixed(1)}%):`);
    let bS = 0, bR = 0;
    for (const t of pt) {
      const d = picks[t]; const rate = enc[t];
      let rS = 0, bSm = 0;
      for (let i = 0; i < ITERS; i++) { const res = simPick(d, pool, steal, rate); rS += res.totalReward; bSm += res.blocksDestroyed; }
      const avg = rS / ITERS; const blk = bSm / ITERS;
      console.log(`    ${t.padEnd(7)} | ${String(d.price).padStart(5)}cr blk${blk.toFixed(1).padStart(5)} rew${avg.toFixed(0).padStart(6)} ROI${(avg/d.price*100).toFixed(1).padStart(5)}%`);
      if (MIX[t]) { bS += d.price * MIX[t]; bR += avg * MIX[t]; }
    }
    let tR = 0; for (let i = 0; i < ITERS; i++) tR += simTNT(TNT, pool);
    const ta = tR / ITERS;
    console.log(`    tnt     | ${String(TNT.price).padStart(5)}cr rew${ta.toFixed(0).padStart(6)} ROI${(ta/TNT.price*100).toFixed(1).padStart(5)}%`);
    bS += TNT.price * MIX.tnt; bR += ta * MIX.tnt;
    console.log(`    HOUSE EDGE: ${((1-bR/bS)*100).toFixed(1)}%`);
  }
}

// ============================================================
// v4.4 BASELINE (for comparison)
// ============================================================
fullTest('v4.4 BASELINE (current)', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.8,  gravityMult: 0.7, speedMult: 1.5, lifetime: Infinity },
}, 'default');

// ============================================================
// v4.5 RECOMMENDED: Option A (best overall score)
// ============================================================
fullTest('v4.5 OPTION A — sys 1.1/0.9s + scaled steal', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.1,  gravityMult: 0.7, speedMult: 0.9, lifetime: Infinity },
}, 'scaled');

// ============================================================
// v4.5 ALTERNATIVE: Option B (better 10p accuracy)
// ============================================================
fullTest('v4.5 OPTION B — sys 1.15/1.0s + scaled steal', {
  basic:  { price: 1800, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power:  { price: 5000, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light:  { price: 2200, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift:  { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
  system: { price: 0,    damage: 8, scale: 1.15, gravityMult: 0.7, speedMult: 1.0, lifetime: Infinity },
}, 'scaled');

console.log('\n\n' + '='.repeat(80));
console.log('  SUMMARY OF CHANGES (v4.4 → v4.5)');
console.log('='.repeat(80));
console.log(`
  1. STEAL FORMULA (GameEngine.js):
     OLD: stealRate = sysEncRate / (sysEncRate + playerCount * 1.5 * 3.0)
     NEW: const avgPicks = 1.5 + 5.0 / playerCount;
          stealRate = sysEncRate / (sysEncRate + playerCount * avgPicks * 3.0)

     This scales the "effective pickaxes per player" inversely with player count.
     At 5 players: avgPicks = 2.5 (players buy more when room is small)
     At 10 players: avgPicks = 2.0
     At 20 players: avgPicks = 1.75
     At 40 players: avgPicks = 1.625

  2. SYSTEM PICKAXE (constants.js):
     Option A (recommended):
       scale: 1.1 (was 1.8)
       speedMult: 0.9 (was 1.5)
       gravityMult: 0.7 (unchanged)
       damage: 8 (unchanged)

     Option B (alternative):
       scale: 1.15 (was 1.8)
       speedMult: 1.0 (was 1.5)
       gravityMult: 0.7 (unchanged)
       damage: 8 (unchanged)

  3. ALL OTHER VALUES UNCHANGED:
     - Pickaxe prices: basic 1800, power 5000, light 2200, swift 2200
     - Block rewards/HP: all unchanged
     - TNT: price 8000, damage 30, radii unchanged
     - Combo multipliers/thresholds: unchanged
`);
