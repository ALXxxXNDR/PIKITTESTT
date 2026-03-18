#!/usr/bin/env node
/**
 * PIKIT v4.5 Combined Sweep — System + Price adjustment
 *
 * Mathematical insight:
 * HE_5p - HE_10p ≈ baseROI × (S5 - S10)
 * For 55% and 54%: diff = 1%, so baseROI × (S5-S10) = 0.01
 *
 * With lower sysEnc → smaller S5-S10 spread → easier to hit both targets
 * But need to RAISE prices to reduce baseROI from ~51% to ~47%
 */

const COMBO = {
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

function buildPool(b) {
  const p = [], tw = Object.values(b).reduce((s, x) => s + x.weight, 0);
  for (const [t, d] of Object.entries(b)) p.push({ ...d, type: t, p: d.weight / tw });
  return p;
}
function pk(p) { let r = Math.random(), c = 0; for (const b of p) { c += b.p; if (r <= c) return b; } return p[p.length-1]; }
function br(b) { return b.rewardType === 'random' ? Math.floor(Math.random() * b.reward) + 1 : b.reward; }
function enc(d) { return 2.5 * (d.scale / 0.8) * Math.pow(d.speedMult, 0.7) * Math.pow(d.gravityMult, 0.3); }

function simP(def, pool, steal, rate) {
  const lt = def.lifetime === Infinity ? 60 : def.lifetime / 1000;
  const tot = Math.floor(rate * lt);
  let rew = 0, combo = 0, hp = 0, cur = null;
  for (let i = 0; i < tot; i++) {
    if (Math.random() < steal) { combo = 0; continue; }
    if (hp <= 0) { cur = pk(pool); hp = cur.hp; }
    hp -= def.damage;
    if (hp <= 0) {
      combo++;
      let cm = COMBO.MULTIPLIERS[0];
      for (let j = COMBO.THRESHOLDS.length - 1; j >= 0; j--)
        if (combo >= COMBO.THRESHOLDS[j]) { cm = COMBO.MULTIPLIERS[j]; break; }
      rew += Math.round(br(cur) * cm); hp = 0;
    }
    if (hp <= 0 && Math.random() < 0.15) combo = 0;
  }
  return rew;
}

function simT(tnt, pool) {
  const eff = Math.floor((tnt.radiusX * 2 + 1) * (tnt.radiusDown + tnt.radiusX + 1) * 0.7);
  let r = 0;
  for (let i = 0; i < eff; i++) {
    const b = pk(pool);
    if ((b.tntResist ? Math.floor(tnt.damage * 0.4) : tnt.damage) >= b.hp) r += br(b);
  }
  return r;
}

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

function testHE(picks, pool, tntDef, pc, iters) {
  const rates = {};
  for (const [t, d] of Object.entries(picks)) rates[t] = enc(d);
  const sysRate = rates['system'];
  const steal = sysRate / (sysRate + pc * 1.5 * 3.0);
  const mix = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };
  const types = Object.keys(picks).filter(t => t !== 'system');

  let bS = 0, bR = 0;
  for (const t of types) {
    const d = picks[t]; const rate = rates[t];
    let rS = 0;
    for (let i = 0; i < iters; i++) rS += simP(d, pool, steal, rate);
    if (mix[t]) { bS += d.price * mix[t]; bR += (rS / iters) * mix[t]; }
  }
  let tR = 0;
  for (let i = 0; i < iters; i++) tR += simT(tntDef, pool);
  bS += tntDef.price * mix.tnt; bR += (tR / iters) * mix.tnt;
  return 1 - (bR / bS);
}

const pool = buildPool(BLK);

// ============ COMBINED SWEEP ============
// Variables: system(scale, speed), prices(priceMult)
// priceMult: multiplier on all user pickaxe prices (1.0 = unchanged, 1.1 = 10% more expensive)

console.log('PIKIT v4.5 — Combined System + Price Sweep');
console.log('Target: 5p=55%, 10p=54%\n');

const results = [];

for (const sysSc of [0.5, 0.6, 0.7, 0.8, 0.9, 1.0]) {
  for (const sysSp of [0.6, 0.7, 0.8, 0.9, 1.0]) {
    const sysEnc = 2.5 * (sysSc / 0.8) * Math.pow(sysSp, 0.7) * Math.pow(0.7, 0.3);
    if (sysEnc < 0.5 || sysEnc > 4.0) continue;

    for (const pm of [1.0, 1.05, 1.1, 1.15, 1.2]) {
      for (const sysDm of [6, 8]) {
        const picks = {
          basic: { price: Math.round(1800 * pm), damage: 3, scale: 0.8, gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
          power: { price: Math.round(5000 * pm), damage: 5, scale: 1.0, gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
          light: { price: Math.round(2200 * pm), damage: 4, scale: 0.7, gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
          swift: { price: Math.round(2200 * pm), damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
          system: { price: 0, damage: sysDm, scale: sysSc, gravityMult: 0.7, speedMult: sysSp, lifetime: Infinity },
        };

        const he5 = testHE(picks, pool, TNT_DEF, 5, 12000);
        const he10 = testHE(picks, pool, TNT_DEF, 10, 12000);
        const s5 = Math.abs(he5 - 0.55);
        const s10 = Math.abs(he10 - 0.54);
        const total = s5 + s10;

        results.push({ sysSc, sysSp, sysDm, pm, sysEnc, he5, he10, s5, s10, total, picks });
      }
    }
  }
}

results.sort((a, b) => a.total - b.total);

console.log('Top 15 candidates:');
console.log('Rank | SysSc | SysSp | Dm | PM   | EncR  | 5p HE  | 10p HE | Score');
console.log('─'.repeat(80));
for (let i = 0; i < Math.min(15, results.length); i++) {
  const s = results[i];
  const m5 = s.s5 < 0.01 ? '✅' : '  ';
  const m10 = s.s10 < 0.01 ? '✅' : '  ';
  console.log(
    `  ${(i+1).toString().padStart(2)} | ${s.sysSc.toFixed(1)} | ${s.sysSp.toFixed(1)} | ${s.sysDm} ` +
    `| ${s.pm.toFixed(2)} | ${s.sysEnc.toFixed(2)} ` +
    `| ${(s.he5*100).toFixed(1)}%${m5} | ${(s.he10*100).toFixed(1)}%${m10} | ${(s.total*100).toFixed(2)}%`
  );
}

// Phase 2: Fine-tune top 3
console.log('\n=== PHASE 2: Fine-tune top 3 ===');
const fineResults = [];
const top3 = results.slice(0, 3);

for (const t of top3) {
  for (const dsc of [-0.05, 0, 0.05]) {
    for (const dsp of [-0.05, 0, 0.05]) {
      for (const dpm of [-0.025, 0, 0.025]) {
        const sc = Math.round((t.sysSc + dsc) * 100) / 100;
        const sp = Math.round((t.sysSp + dsp) * 100) / 100;
        const pm = Math.round((t.pm + dpm) * 1000) / 1000;
        if (sc < 0.3 || sp < 0.4 || pm < 0.9) continue;

        const sysEnc = 2.5 * (sc / 0.8) * Math.pow(sp, 0.7) * Math.pow(0.7, 0.3);
        const picks = {
          basic: { price: Math.round(1800 * pm), damage: 3, scale: 0.8, gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
          power: { price: Math.round(5000 * pm), damage: 5, scale: 1.0, gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
          light: { price: Math.round(2200 * pm), damage: 4, scale: 0.7, gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
          swift: { price: Math.round(2200 * pm), damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
          system: { price: 0, damage: t.sysDm, scale: sc, gravityMult: 0.7, speedMult: sp, lifetime: Infinity },
        };

        const he5 = testHE(picks, pool, TNT_DEF, 5, 20000);
        const he10 = testHE(picks, pool, TNT_DEF, 10, 20000);
        fineResults.push({ sc, sp, dm: t.sysDm, pm, sysEnc, he5, he10, total: Math.abs(he5-0.55)+Math.abs(he10-0.54), picks });
      }
    }
  }
}

fineResults.sort((a, b) => a.total - b.total);

console.log('Top 10 fine-tuned:');
console.log('Rank | SysSc | SysSp | Dm | PM    | EncR  | 5p HE  | 10p HE | Score');
console.log('─'.repeat(80));
for (let i = 0; i < Math.min(10, fineResults.length); i++) {
  const s = fineResults[i];
  console.log(
    `  ${(i+1).toString().padStart(2)} | ${s.sc.toFixed(2)} | ${s.sp.toFixed(2)} | ${s.dm} ` +
    `| ${s.pm.toFixed(3)} | ${s.sysEnc.toFixed(2)} ` +
    `| ${(s.he5*100).toFixed(1)}% | ${(s.he10*100).toFixed(1)}% | ${(s.total*100).toFixed(3)}%`
  );
}

// ============ WINNER — PRECISION RUN ============
const W = fineResults[0];
console.log(`\n${'═'.repeat(80)}`);
console.log(`  🏆 WINNER: sys scale=${W.sc} speed=${W.sp} dmg=${W.dm} | priceMult=${W.pm}`);
console.log(`${'═'.repeat(80)}`);

console.log('\n=== PRECISION RUN (80K iterations) ===');
const types = ['basic', 'power', 'light', 'swift'];
const mix = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };
const wRates = {};
for (const [t, d] of Object.entries(W.picks)) wRates[t] = enc(d);
const wSysRate = wRates['system'];

for (const pc of [3, 5, 10, 20, 40, 80]) {
  const steal = wSysRate / (wSysRate + pc * 1.5 * 3.0);
  let bS = 0, bR = 0;
  console.log(`\n  @${pc} players (steal ${(steal*100).toFixed(1)}%):`);
  for (const t of types) {
    const d = W.picks[t]; const rate = wRates[t];
    let rS = 0, bkS = 0;
    for (let i = 0; i < 80000; i++) {
      const r = (() => {
        const lt = d.lifetime / 1000;
        const tot = Math.floor(rate * lt);
        let rew = 0, blk = 0, combo = 0, hp = 0, cur = null;
        for (let j = 0; j < tot; j++) {
          if (Math.random() < steal) { combo = 0; continue; }
          if (hp <= 0) { cur = pk(pool); hp = cur.hp; }
          hp -= d.damage;
          if (hp <= 0) {
            combo++;
            let cm = COMBO.MULTIPLIERS[0];
            for (let k = COMBO.THRESHOLDS.length - 1; k >= 0; k--)
              if (combo >= COMBO.THRESHOLDS[k]) { cm = COMBO.MULTIPLIERS[k]; break; }
            rew += Math.round(br(cur) * cm); blk++; hp = 0;
          }
          if (hp <= 0 && Math.random() < 0.15) combo = 0;
        }
        return { rew, blk };
      })();
      rS += r.rew; bkS += r.blk;
    }
    const avg = rS / 80000;
    console.log(`    ${t.padEnd(6)} ${d.price.toString().padStart(5)}cr DMG${d.damage} | blk${(bkS/80000).toFixed(1).padStart(5)} rew${avg.toFixed(0).padStart(5)} ROI${((avg/d.price)*100).toFixed(1).padStart(5)}%`);
    if (mix[t]) { bS += d.price * mix[t]; bR += avg * mix[t]; }
  }
  let tR = 0;
  for (let i = 0; i < 80000; i++) tR += simT(TNT_DEF, pool);
  const ta = tR / 80000;
  console.log(`    tnt    ${TNT_DEF.price}cr DMG${TNT_DEF.damage} | rew${ta.toFixed(0).padStart(5)} ROI${((ta/TNT_DEF.price)*100).toFixed(1).padStart(5)}%`);
  bS += TNT_DEF.price * mix.tnt; bR += ta * mix.tnt;
  const he = 1 - (bR / bS);
  const mark = pc === 5 ? ' ◄ target 55%' : pc === 10 ? ' ◄ target 54%' : '';
  console.log(`    BLENDED → HE ${(he*100).toFixed(2)}%${mark}`);
}

console.log('\n\n=== FINAL VALUES FOR constants.js ===');
console.log('PICKAXE PRICES:');
console.log(`  basic:  ${W.picks.basic.price}`);
console.log(`  power:  ${W.picks.power.price}`);
console.log(`  light:  ${W.picks.light.price}`);
console.log(`  swift:  ${W.picks.swift.price}`);
console.log('SYSTEM PICKAXE:');
console.log(`  damage: ${W.dm}`);
console.log(`  scale:  ${W.sc}`);
console.log(`  speedMult: ${W.sp}`);
console.log(`  gravityMult: 0.7`);
console.log(`BLOCKS: unchanged`);
console.log(`TNT: unchanged`);
