#!/usr/bin/env node
/**
 * PIKIT v4.6 Balance Simulation
 *
 * CONSTRAINT: System pickaxe scale FIXED at 1.5 (non-negotiable visual requirement)
 * TARGET: 5 players = 55% house edge, 10 players = 54% house edge
 *
 * With scale=1.5, base encounter multiplier is 2.5*(1.5/0.8) = 4.6875
 * Need very low speedMult/gravMult to keep system encounter rate around 1.0
 *
 * Sweep: speedMult (0.1~0.5), gravMult (0.2~0.7), damage (3~8), priceMult (1.0~1.3)
 */

const COMBO = {
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

// Block definitions (unchanged from v4.5)
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

// Base user pickaxe prices (before multiplier)
const BASE_PRICES = { basic: 1900, power: 5400, light: 2400, swift: 2400 };
const PURCHASE_MIX = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };

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

function testHouseEdge(picks, pool, tntDef, playerCount, iters) {
  const rates = {};
  for (const [t, d] of Object.entries(picks)) rates[t] = enc(d);
  const sysRate = rates['system'];
  const steal = sysRate / (sysRate + playerCount * 1.5 * 3.0);
  const userTypes = Object.keys(picks).filter(t => t !== 'system');

  let bSpent = 0, bReward = 0;
  for (const t of userTypes) {
    const d = picks[t];
    const rate = rates[t];
    let rS = 0;
    for (let i = 0; i < iters; i++) rS += simPickaxe(d, pool, steal, rate).rew;
    if (PURCHASE_MIX[t]) {
      bSpent += d.price * PURCHASE_MIX[t];
      bReward += (rS / iters) * PURCHASE_MIX[t];
    }
  }
  let tR = 0;
  for (let i = 0; i < iters; i++) tR += simTNT(tntDef, pool);
  bSpent += tntDef.price * PURCHASE_MIX.tnt;
  bReward += (tR / iters) * PURCHASE_MIX.tnt;
  return { he: 1 - (bReward / bSpent), steal };
}

function makePicks(pm, sysDm, sysSpeed, sysGrav) {
  return {
    basic:  { price: Math.round(BASE_PRICES.basic * pm),  damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    power:  { price: Math.round(BASE_PRICES.power * pm),  damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
    light:  { price: Math.round(BASE_PRICES.light * pm),  damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
    swift:  { price: Math.round(BASE_PRICES.swift * pm),  damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
    system: { price: 0, damage: sysDm, scale: 1.5, gravityMult: sysGrav, speedMult: sysSpeed, lifetime: Infinity },
  };
}

const pool = buildPool(BLK);

// ============ PHASE 1: COARSE SWEEP ============
console.log('PIKIT v4.6 Balance Simulation');
console.log('System scale FIXED at 1.5');
console.log('Target: 5p=55%, 10p=54%\n');
console.log('=== PHASE 1: Coarse Sweep ===\n');

const results = [];
const sysSpeedRange = [0.10, 0.13, 0.15, 0.18, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50];
const sysGravRange  = [0.20, 0.25, 0.30, 0.35, 0.40, 0.50, 0.60, 0.70];
const sysDmgRange   = [3, 4, 5, 6, 7, 8];
const pmRange       = [1.00, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30];

let count = 0;
const totalCombos = sysSpeedRange.length * sysGravRange.length * sysDmgRange.length * pmRange.length;
console.log(`Sweeping ${totalCombos} combinations...\n`);

for (const sysSpeed of sysSpeedRange) {
  for (const sysGrav of sysGravRange) {
    const sysEnc = 2.5 * (1.5 / 0.8) * Math.pow(sysSpeed, 0.7) * Math.pow(sysGrav, 0.3);
    // Pre-filter: sysEnc between 0.3 and 3.0
    if (sysEnc < 0.3 || sysEnc > 3.0) continue;

    for (const sysDm of sysDmgRange) {
      for (const pm of pmRange) {
        count++;
        const picks = makePicks(pm, sysDm, sysSpeed, sysGrav);
        const r5  = testHouseEdge(picks, pool, TNT_DEF, 5,  8000);
        const r10 = testHouseEdge(picks, pool, TNT_DEF, 10, 8000);

        const s5  = Math.abs(r5.he - 0.55);
        const s10 = Math.abs(r10.he - 0.54);
        const total = s5 + s10;

        results.push({
          sysSpeed, sysGrav, sysDm, pm, sysEnc,
          he5: r5.he, he10: r10.he, steal5: r5.steal, steal10: r10.steal,
          s5, s10, total
        });
      }
    }
  }
}

results.sort((a, b) => a.total - b.total);

console.log(`Evaluated ${count} combinations\n`);
console.log('Top 20 candidates:');
console.log('Rank | SysSpd | SysGrv | Dm | PM   | EncR  | Steal5 | 5p HE  | 10p HE | Score');
console.log('-'.repeat(90));
for (let i = 0; i < Math.min(20, results.length); i++) {
  const s = results[i];
  console.log(
    `  ${(i+1).toString().padStart(2)} | ${s.sysSpeed.toFixed(2)}  | ${s.sysGrav.toFixed(2)}  | ${s.sysDm} ` +
    `| ${s.pm.toFixed(2)} | ${s.sysEnc.toFixed(2)} ` +
    `| ${(s.steal5*100).toFixed(1)}%  | ${(s.he5*100).toFixed(1)}%  | ${(s.he10*100).toFixed(1)}%  | ${(s.total*100).toFixed(2)}%`
  );
}

// ============ PHASE 2: FINE-TUNE TOP 5 ============
console.log('\n=== PHASE 2: Fine-tune top 5 ===\n');

const fineResults = [];
const top5 = results.slice(0, 5);

for (const t of top5) {
  // Fine-tune around each top candidate
  const spSteps = [-0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03];
  const grSteps = [-0.05, -0.03, 0, 0.03, 0.05];
  const pmSteps = [-0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03];

  for (const dsp of spSteps) {
    for (const dgr of grSteps) {
      for (const dpm of pmSteps) {
        const sp = Math.round((t.sysSpeed + dsp) * 100) / 100;
        const gr = Math.round((t.sysGrav + dgr) * 100) / 100;
        const pm = Math.round((t.pm + dpm) * 100) / 100;
        if (sp < 0.05 || sp > 0.6 || gr < 0.1 || gr > 0.8 || pm < 0.9 || pm > 1.4) continue;

        const sysEnc = 2.5 * (1.5 / 0.8) * Math.pow(sp, 0.7) * Math.pow(gr, 0.3);
        const picks = makePicks(pm, t.sysDm, sp, gr);
        const r5  = testHouseEdge(picks, pool, TNT_DEF, 5,  15000);
        const r10 = testHouseEdge(picks, pool, TNT_DEF, 10, 15000);

        const s5  = Math.abs(r5.he - 0.55);
        const s10 = Math.abs(r10.he - 0.54);
        fineResults.push({
          sysSpeed: sp, sysGrav: gr, sysDm: t.sysDm, pm, sysEnc,
          he5: r5.he, he10: r10.he, steal5: r5.steal, steal10: r10.steal,
          s5, s10, total: s5 + s10
        });
      }
    }
  }
}

fineResults.sort((a, b) => a.total - b.total);

console.log('Top 15 fine-tuned:');
console.log('Rank | SysSpd | SysGrv | Dm | PM   | EncR  | Steal5 | 5p HE  | 10p HE | Score');
console.log('-'.repeat(90));
for (let i = 0; i < Math.min(15, fineResults.length); i++) {
  const s = fineResults[i];
  console.log(
    `  ${(i+1).toString().padStart(2)} | ${s.sysSpeed.toFixed(2)}  | ${s.sysGrav.toFixed(2)}  | ${s.sysDm} ` +
    `| ${s.pm.toFixed(2)} | ${s.sysEnc.toFixed(2)} ` +
    `| ${(s.steal5*100).toFixed(1)}%  | ${(s.he5*100).toFixed(1)}%  | ${(s.he10*100).toFixed(1)}%  | ${(s.total*100).toFixed(3)}%`
  );
}

// ============ PHASE 3: PRECISION VALIDATION ============
const W = fineResults[0];
console.log(`\n${'='.repeat(80)}`);
console.log(`  WINNER: sys speed=${W.sysSpeed} grav=${W.sysGrav} dmg=${W.sysDm} | priceMult=${W.pm}`);
console.log(`  sysEncRate=${W.sysEnc.toFixed(3)} | steal@5p=${(W.steal5*100).toFixed(1)}% steal@10p=${(W.steal10*100).toFixed(1)}%`);
console.log(`${'='.repeat(80)}`);

console.log('\n=== PHASE 3: Precision Validation (100K iterations) ===\n');

const wPicks = makePicks(W.pm, W.sysDm, W.sysSpeed, W.sysGrav);
const wRates = {};
for (const [t, d] of Object.entries(wPicks)) wRates[t] = enc(d);
const wSysRate = wRates['system'];
const userTypes = ['basic', 'power', 'light', 'swift'];

for (const pc of [3, 5, 10, 20, 40]) {
  const steal = wSysRate / (wSysRate + pc * 1.5 * 3.0);
  let bS = 0, bR = 0;
  console.log(`  @${pc} players (steal ${(steal*100).toFixed(2)}%):`);

  const perPick = {};
  for (const t of userTypes) {
    const d = wPicks[t];
    const rate = wRates[t];
    let rS = 0, bkS = 0;
    for (let i = 0; i < 100000; i++) {
      const r = simPickaxe(d, pool, steal, rate);
      rS += r.rew; bkS += r.blocks;
    }
    const avgRew = rS / 100000;
    const avgBlk = bkS / 100000;
    const roi = (avgRew / d.price) * 100;
    perPick[t] = { avgRew, avgBlk, roi };
    console.log(`    ${t.padEnd(6)} ${d.price.toString().padStart(5)}cr DMG${d.damage} sc${d.scale} | blk${avgBlk.toFixed(1).padStart(5)} rew${avgRew.toFixed(0).padStart(6)} ROI ${roi.toFixed(1).padStart(5)}%`);
    if (PURCHASE_MIX[t]) { bS += d.price * PURCHASE_MIX[t]; bR += avgRew * PURCHASE_MIX[t]; }
  }

  let tR = 0;
  for (let i = 0; i < 100000; i++) tR += simTNT(TNT_DEF, pool);
  const tAvg = tR / 100000;
  console.log(`    tnt    ${TNT_DEF.price}cr DMG${TNT_DEF.damage}       | rew${tAvg.toFixed(0).padStart(6)} ROI ${((tAvg/TNT_DEF.price)*100).toFixed(1).padStart(5)}%`);
  bS += TNT_DEF.price * PURCHASE_MIX.tnt;
  bR += tAvg * PURCHASE_MIX.tnt;

  const he = 1 - (bR / bS);
  const mark = pc === 5 ? ' <<< target 55%' : pc === 10 ? ' <<< target 54%' : '';
  console.log(`    BLENDED HE = ${(he*100).toFixed(2)}%${mark}`);

  // Check per-pickaxe ROI balance
  if (pc === 5) {
    const rois = userTypes.map(t => perPick[t].roi);
    const maxDiff = Math.max(...rois) - Math.min(...rois);
    console.log(`    ROI spread: ${Math.min(...rois).toFixed(1)}% ~ ${Math.max(...rois).toFixed(1)}% (diff ${maxDiff.toFixed(1)}%)`);
  }
  console.log('');
}

// ============ FINAL OUTPUT ============
console.log('\n' + '='.repeat(80));
console.log('  FINAL VALUES FOR constants.js (v4.6)');
console.log('='.repeat(80));
console.log('\nPICKAXE_TYPES:');
console.log(`  basic:  price ${wPicks.basic.price}, damage 3, scale 0.8, gravMult 1.0, speedMult 1.0, lifetime 30s`);
console.log(`  power:  price ${wPicks.power.price}, damage 5, scale 1.0, gravMult 1.0, speedMult 1.0, lifetime 30s`);
console.log(`  light:  price ${wPicks.light.price}, damage 4, scale 0.7, gravMult 0.5, speedMult 1.0, lifetime 35s`);
console.log(`  swift:  price ${wPicks.swift.price}, damage 3, scale 0.75, gravMult 1.0, speedMult 1.6, lifetime 25s`);
console.log(`  system: damage ${W.sysDm}, scale 1.5, gravMult ${W.sysGrav}, speedMult ${W.sysSpeed}`);
console.log('\nTNT: unchanged (price 8000, damage 30, radiusX 2, radiusDown 3)');
console.log('BLOCKS: unchanged');
console.log('COMBO: unchanged');
