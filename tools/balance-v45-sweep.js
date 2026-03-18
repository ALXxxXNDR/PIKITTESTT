#!/usr/bin/env node
/**
 * PIKIT v4.5 PURE CONSTANTS Sweep
 * Target: 5 players → 55% house edge, 10 players → 54% house edge
 * Only changes: system pickaxe constants (NO GameEngine code changes)
 */

const COMBO = {
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

function buildPool(blocks) {
  const pool = [];
  const tw = Object.values(blocks).reduce((s, b) => s + b.weight, 0);
  for (const [t, d] of Object.entries(blocks)) pool.push({ type: t, ...d, p: d.weight / tw });
  return pool;
}

function pick(pool) {
  let r = Math.random(), c = 0;
  for (const b of pool) { c += b.p; if (r <= c) return b; }
  return pool[pool.length - 1];
}

function bRew(b) { return b.rewardType === 'random' ? Math.floor(Math.random() * b.reward) + 1 : b.reward; }

function enc(d) { return 2.5 * (d.scale / 0.8) * Math.pow(d.speedMult, 0.7) * Math.pow(d.gravityMult, 0.3); }

function simPick(def, pool, steal, rate) {
  const lt = def.lifetime === Infinity ? 60 : def.lifetime / 1000;
  const tot = Math.floor(rate * lt);
  let rew = 0, blk = 0, combo = 0, hp = 0, cur = null;
  for (let i = 0; i < tot; i++) {
    if (Math.random() < steal) { combo = 0; continue; }
    if (hp <= 0) { cur = pick(pool); hp = cur.hp; }
    hp -= def.damage;
    if (hp <= 0) {
      combo++;
      let cm = COMBO.MULTIPLIERS[0];
      for (let j = COMBO.THRESHOLDS.length - 1; j >= 0; j--)
        if (combo >= COMBO.THRESHOLDS[j]) { cm = COMBO.MULTIPLIERS[j]; break; }
      rew += Math.round(bRew(cur) * cm);
      blk++; hp = 0;
    }
    if (hp <= 0 && Math.random() < 0.15) combo = 0;
  }
  return { rew, blk };
}

function simTNT(tnt, pool) {
  const eff = Math.floor((tnt.radiusX * 2 + 1) * (tnt.radiusDown + tnt.radiusX + 1) * 0.7);
  let r = 0;
  for (let i = 0; i < eff; i++) {
    const b = pick(pool);
    if ((b.tntResist ? Math.floor(tnt.damage * 0.4) : tnt.damage) >= b.hp) r += bRew(b);
  }
  return r;
}

function test(picks, blocks, tnt, iters = 30000) {
  const pool = buildPool(blocks);
  const rates = {};
  for (const [t, d] of Object.entries(picks)) rates[t] = enc(d);
  const sysRate = rates['system'];
  const calcSteal = pc => sysRate / (sysRate + pc * 1.5 * 3.0);
  const mix = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };
  const types = Object.keys(picks).filter(t => t !== 'system');

  const res = {};
  for (const pc of [5, 10, 20, 40]) {
    const steal = calcSteal(pc);
    let bS = 0, bR = 0;
    for (const t of types) {
      const d = picks[t]; const rate = rates[t];
      let rS = 0;
      for (let i = 0; i < iters; i++) rS += simPick(d, pool, steal, rate).rew;
      const avg = rS / iters;
      if (mix[t]) { bS += d.price * mix[t]; bR += avg * mix[t]; }
    }
    let tR = 0;
    for (let i = 0; i < iters; i++) tR += simTNT(tnt, pool);
    bS += tnt.price * mix.tnt; bR += (tR / iters) * mix.tnt;
    res[pc] = 1 - (bR / bS);
  }
  return res;
}

// ============ BLOCKS (unchanged) ============
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
const UP = {
  basic: { price: 1800, damage: 3, scale: 0.8, gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power: { price: 5000, damage: 5, scale: 1.0, gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light: { price: 2200, damage: 4, scale: 0.7, gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift: { price: 2200, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
};

function mk(sc, sp, gv, dm) {
  return { ...UP, system: { price: 0, damage: dm, scale: sc, gravityMult: gv, speedMult: sp, lifetime: Infinity } };
}

console.log('PIKIT v4.5 — System Pickaxe Parameter Sweep');
console.log('Target: 5p=55%, 10p=54%\n');

// Phase 1: Wide sweep
console.log('=== PHASE 1: Wide sweep ===');
const scores = [];

for (const dm of [6, 8]) {
  for (const sc of [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2]) {
    for (const sp of [0.6, 0.7, 0.8, 0.9, 1.0]) {
      const sysEnc = 2.5 * (sc / 0.8) * Math.pow(sp, 0.7) * Math.pow(0.7, 0.3);
      // Pre-filter: sysEnc should be 1.5~4.0 range for viable house edge
      if (sysEnc < 1.0 || sysEnc > 5.0) continue;

      const r = test(mk(sc, sp, 0.7, dm), BLK, TNT_DEF, 15000);
      const s5 = Math.abs(r[5] - 0.55);
      const s10 = Math.abs(r[10] - 0.54);
      const total = s5 + s10;
      scores.push({ sc, sp, dm, sysEnc, r, s5, s10, total });
    }
  }
}

scores.sort((a, b) => a.total - b.total);

console.log('Top 10 candidates:');
console.log('Rank | Scale | Speed | DMG | EncRate | 5p HE  | 10p HE | 20p HE | 40p HE | Score');
console.log('─'.repeat(90));
for (let i = 0; i < Math.min(10, scores.length); i++) {
  const s = scores[i];
  const m5 = Math.abs(s.r[5] - 0.55) < 0.015 ? '✅' : '  ';
  const m10 = Math.abs(s.r[10] - 0.54) < 0.015 ? '✅' : '  ';
  console.log(
    `  ${(i+1).toString().padStart(2)} | ${s.sc.toFixed(1).padStart(4)} | ${s.sp.toFixed(1).padStart(4)} | ${s.dm} ` +
    `| ${s.sysEnc.toFixed(2).padStart(5)} | ${(s.r[5]*100).toFixed(1).padStart(5)}%${m5} ` +
    `| ${(s.r[10]*100).toFixed(1).padStart(5)}%${m10} | ${(s.r[20]*100).toFixed(1).padStart(5)}% ` +
    `| ${(s.r[40]*100).toFixed(1).padStart(5)}% | ${(s.total*100).toFixed(2)}%`
  );
}

// Phase 2: Fine-tune around top candidates
console.log('\n=== PHASE 2: Fine-tune top candidates ===');
const top = scores.slice(0, 3);
const fineScores = [];

for (const t of top) {
  for (const dsc of [-0.1, -0.05, 0, 0.05, 0.1]) {
    for (const dsp of [-0.1, -0.05, 0, 0.05, 0.1]) {
      const sc = Math.round((t.sc + dsc) * 100) / 100;
      const sp = Math.round((t.sp + dsp) * 100) / 100;
      if (sc < 0.4 || sp < 0.4) continue;
      const sysEnc = 2.5 * (sc / 0.8) * Math.pow(sp, 0.7) * Math.pow(0.7, 0.3);
      if (sysEnc < 0.8 || sysEnc > 5.0) continue;

      const r = test(mk(sc, sp, 0.7, t.dm), BLK, TNT_DEF, 25000);
      const s5 = Math.abs(r[5] - 0.55);
      const s10 = Math.abs(r[10] - 0.54);
      fineScores.push({ sc, sp, dm: t.dm, sysEnc, r, s5, s10, total: s5 + s10 });
    }
  }
}

fineScores.sort((a, b) => a.total - b.total);

console.log('Top 10 fine-tuned:');
console.log('Rank | Scale | Speed | DMG | EncRate | 5p HE  | 10p HE | 20p HE | 40p HE | Score');
console.log('─'.repeat(90));
for (let i = 0; i < Math.min(10, fineScores.length); i++) {
  const s = fineScores[i];
  const m5 = Math.abs(s.r[5] - 0.55) < 0.01 ? '✅' : '  ';
  const m10 = Math.abs(s.r[10] - 0.54) < 0.01 ? '✅' : '  ';
  console.log(
    `  ${(i+1).toString().padStart(2)} | ${s.sc.toFixed(2).padStart(5)} | ${s.sp.toFixed(2).padStart(5)} | ${s.dm} ` +
    `| ${s.sysEnc.toFixed(2).padStart(5)} | ${(s.r[5]*100).toFixed(1).padStart(5)}%${m5} ` +
    `| ${(s.r[10]*100).toFixed(1).padStart(5)}%${m10} | ${(s.r[20]*100).toFixed(1).padStart(5)}% ` +
    `| ${(s.r[40]*100).toFixed(1).padStart(5)}% | ${(s.total*100).toFixed(3)}%`
  );
}

// Phase 3: WINNER — precision run
const winner = fineScores[0];
console.log(`\n${'═'.repeat(80)}`);
console.log(`  🏆 WINNER: scale=${winner.sc} speed=${winner.sp} dmg=${winner.dm}`);
console.log(`  EncRate: ${winner.sysEnc.toFixed(3)}/s`);
console.log(`${'═'.repeat(80)}`);

console.log('\n=== PRECISION RUN (80K iterations) ===');
const picks = mk(winner.sc, winner.sp, 0.7, winner.dm);
const pool = buildPool(BLK);
const rates = {};
for (const [t, d] of Object.entries(picks)) rates[t] = enc(d);
const sysRate = rates['system'];
const calcSteal = pc => sysRate / (sysRate + pc * 1.5 * 3.0);
const mixFn = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };
const types = Object.keys(picks).filter(t => t !== 'system');
const PREC_ITER = 80000;

for (const pc of [3, 5, 10, 20, 40, 80]) {
  const steal = calcSteal(pc);
  let bS = 0, bR = 0;
  console.log(`\n  @${pc} players (steal ${(steal*100).toFixed(1)}%):`);
  for (const t of types) {
    const d = picks[t]; const rate = rates[t];
    let rS = 0, bkS = 0;
    for (let i = 0; i < PREC_ITER; i++) { const r = simPick(d, pool, steal, rate); rS += r.rew; bkS += r.blk; }
    const avg = rS / PREC_ITER;
    console.log(`    ${t.padEnd(6)} ${d.price.toString().padStart(5)}cr DMG${d.damage} | blk${(bkS/PREC_ITER).toFixed(1).padStart(5)} rew${avg.toFixed(0).padStart(5)} ROI${((avg/d.price)*100).toFixed(1).padStart(5)}%`);
    if (mixFn[t]) { bS += d.price * mixFn[t]; bR += avg * mixFn[t]; }
  }
  let tR = 0;
  for (let i = 0; i < PREC_ITER; i++) tR += simTNT(TNT_DEF, pool);
  const ta = tR / PREC_ITER;
  console.log(`    tnt    ${TNT_DEF.price}cr DMG${TNT_DEF.damage} | rew${ta.toFixed(0).padStart(5)} ROI${((ta/TNT_DEF.price)*100).toFixed(1).padStart(5)}%`);
  bS += TNT_DEF.price * mixFn.tnt; bR += ta * mixFn.tnt;
  const he = 1 - (bR / bS);
  const mark = pc === 5 ? ` (target 55%)` : pc === 10 ? ` (target 54%)` : '';
  console.log(`    BLENDED → HE ${(he*100).toFixed(2)}%${mark}`);
}

console.log(`\n\n=== FINAL VALUES FOR constants.js ===`);
console.log(`system pickaxe:`);
console.log(`  scale: ${winner.sc}`);
console.log(`  speedMult: ${winner.sp}`);
console.log(`  gravityMult: 0.7`);
console.log(`  damage: ${winner.dm}`);
console.log(`\nAll other values unchanged from v4.4`);
