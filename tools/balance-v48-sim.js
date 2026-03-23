#!/usr/bin/env node
/**
 * PIKIT v4.8 Balance Simulator
 * Adaptive system pickaxe (weak/full), max 4 sys, 1-100 players
 * Target: HE 52-53% @ 2-30 players
 */

// v4.8 파라미터 (constants.js와 동기화)
const COMBO = {
  MULTIPLIERS: [1, 1.05, 1.1, 1.2, 1.35, 1.5],
  THRESHOLDS: [0, 3, 6, 10, 15, 25],
};

const BLK = {
  diamond_block: { hp: 180, weight: 1,  reward: 4500, tntResist: true },
  gold_block:    { hp: 90,  weight: 2,  reward: 1800, tntResist: true },
  emerald_block: { hp: 55,  weight: 5,  reward: 540  },
  iron_block:    { hp: 20,  weight: 12, reward: 100  },
  copper_block:  { hp: 15,  weight: 20, reward: 50   },
  stone:         { hp: 3,   weight: 20, reward: 28   },
  dirt:          { hp: 2,   weight: 18, reward: 22   },
  gravel:        { hp: 3,   weight: 12, reward: 25   },
  clay:          { hp: 2,   weight: 10, reward: 24   },
};

// v4.8 가격
const PICKS = {
  basic: { price: 3100, damage: 3, scale: 0.8,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  power: { price: 8100, damage: 5, scale: 1.0,  gravityMult: 1.0, speedMult: 1.0, lifetime: 30000 },
  light: { price: 3600, damage: 4, scale: 0.7,  gravityMult: 0.5, speedMult: 1.0, lifetime: 35000 },
  swift: { price: 3300, damage: 3, scale: 0.75, gravityMult: 1.0, speedMult: 1.6, lifetime: 25000 },
};

const TNT_DEF   = { price: 8000, damage: 30, radiusX: 2, radiusDown: 3 };
const PURCHASE_MIX = { basic: 0.35, power: 0.15, light: 0.20, swift: 0.25, tnt: 0.05 };

// 어댑티브 시스템 곡괭이 정의
const SYS_FULL = { damage: 5, scale: 1.5, gravityMult: 0.3, speedMult: 0.1 };
const SYS_WEAK = { damage: 5, scale: 0.8, gravityMult: 0.5, speedMult: 0.03 };
const WEAK_MODE_THRESHOLD = 3; // player picks ≤ 3 → weak mode
const DYNAMIC_THRESHOLDS = [
  { minPicks: 46, sysCnt: 4 },
  { minPicks: 21, sysCnt: 3 },
  { minPicks: 11, sysCnt: 2 },
  { minPicks: 4,  sysCnt: 1 },
  { minPicks: 0,  sysCnt: 0 },
];

function enc(d) {
  return 2.5 * (d.scale / 0.8) * Math.pow(d.speedMult, 0.7) * Math.pow(d.gravityMult, 0.3);
}

function buildPool() {
  const p = [], tw = Object.values(BLK).reduce((s, x) => s + x.weight, 0);
  for (const [t, d] of Object.entries(BLK)) if (d.weight > 0) p.push({ ...d, type: t, p: d.weight / tw });
  return p;
}

function pickBlock(pool) {
  let r = Math.random(), c = 0;
  for (const b of pool) { c += b.p; if (r <= c) return b; }
  return pool[pool.length - 1];
}

function getDynamicSysConfig(playerPicks) {
  const isWeak = playerPicks <= WEAK_MODE_THRESHOLD;

  // DYNAMIC_THRESHOLDS의 sysCnt = 동적 추가 수 (앵커 제외) — GameEngine과 동일 해석
  let dynamicCnt = 0;
  for (const t of DYNAMIC_THRESHOLDS) {
    if (playerPicks >= t.minPicks) { dynamicCnt = t.sysCnt; break; }
  }
  dynamicCnt = Math.min(dynamicCnt, 3); // MAX_SYSTEM_PICKAXES(4) - 1 앵커

  const totalSys = 1 + dynamicCnt; // 앵커(1) + 동적

  return {
    totalSys,
    dynamicCnt,
    anchorMode: isWeak ? SYS_WEAK : SYS_FULL,
    dynamicMode: SYS_FULL,
    isWeak,
  };
}

function calcSteal(playerPicks) {
  const { totalSys, isWeak } = getDynamicSysConfig(playerPicks);

  // 앵커는 weak/full 모드에 따라 rate 다름
  const anchorRate = isWeak ? enc(SYS_WEAK) : enc(SYS_FULL);
  // 동적 곡괭이는 항상 full
  const dynamicRate = (totalSys - 1) * enc(SYS_FULL);
  const totalSysRate = anchorRate + dynamicRate;

  const avgPlayerRate =
    PURCHASE_MIX.basic * enc(PICKS.basic) +
    PURCHASE_MIX.power * enc(PICKS.power) +
    PURCHASE_MIX.light * enc(PICKS.light) +
    PURCHASE_MIX.swift * enc(PICKS.swift);

  const totalPlayerRate = playerPicks * avgPlayerRate;
  return totalSysRate / (totalSysRate + totalPlayerRate);
}

function simPickaxe(def, pool, steal, rate) {
  const lt = def.lifetime / 1000;
  const tot = Math.floor(rate * lt);
  let rew = 0, combo = 0, hp = 0, cur = null;
  for (let i = 0; i < tot; i++) {
    if (Math.random() < steal) { combo = 0; continue; }
    if (hp <= 0) { cur = pickBlock(pool); hp = cur.hp; }
    hp -= def.damage;
    if (hp <= 0) {
      combo++;
      let cm = COMBO.MULTIPLIERS[0];
      for (let j = COMBO.THRESHOLDS.length - 1; j >= 0; j--)
        if (combo >= COMBO.THRESHOLDS[j]) { cm = COMBO.MULTIPLIERS[j]; break; }
      rew += Math.round(cur.reward * cm);
      hp = 0;
    }
    if (hp <= 0 && Math.random() < 0.15) combo = 0;
  }
  return rew;
}

function simTNT(tnt, pool) {
  const eff = Math.floor((tnt.radiusX * 2 + 1) * (tnt.radiusDown + tnt.radiusX + 1) * 0.7);
  let r = 0;
  for (let i = 0; i < eff; i++) {
    const b = pickBlock(pool);
    if ((b.tntResist ? Math.floor(tnt.damage * 0.4) : tnt.damage) >= b.hp) r += b.reward;
  }
  return r;
}

function simSession(pool, steal, rates, iters) {
  const returns = [];
  for (let sess = 0; sess < iters; sess++) {
    let totalSpent = 0, totalEarned = 0;
    while (totalSpent < 10000) {
      const roll = Math.random();
      let cumP = 0, chosenType = 'basic';
      for (const [t, mix] of Object.entries(PURCHASE_MIX)) {
        cumP += mix; if (roll <= cumP) { chosenType = t; break; }
      }
      if (chosenType === 'tnt') {
        totalSpent += TNT_DEF.price;
        totalEarned += simTNT(TNT_DEF, pool);
      } else {
        const def = PICKS[chosenType];
        totalSpent += def.price;
        totalEarned += simPickaxe(def, pool, steal, rates[chosenType]);
      }
    }
    returns.push(totalEarned);
  }
  returns.sort((a, b) => a - b);
  return {
    p10: returns[Math.floor(iters * 0.10)],
    p25: returns[Math.floor(iters * 0.25)],
    p50: returns[Math.floor(iters * 0.50)],
    p75: returns[Math.floor(iters * 0.75)],
    p90: returns[Math.floor(iters * 0.90)],
    avg: returns.reduce((a, b) => a + b, 0) / iters,
  };
}

// per-pickaxe 분포 (basic 기준)
function simPickaxeDistribution(pool, steal, rate, iters) {
  const basicPrice = PICKS.basic.price;
  const returns = [];
  for (let i = 0; i < iters; i++) {
    const rew = simPickaxe(PICKS.basic, pool, steal, rate);
    returns.push(rew / basicPrice * 100); // % of price
  }
  returns.sort((a, b) => a - b);
  return {
    p5:  returns[Math.floor(iters * 0.05)].toFixed(1),
    p10: returns[Math.floor(iters * 0.10)].toFixed(1),
    p25: returns[Math.floor(iters * 0.25)].toFixed(1),
    p50: returns[Math.floor(iters * 0.50)].toFixed(1),
    p75: returns[Math.floor(iters * 0.75)].toFixed(1),
    p90: returns[Math.floor(iters * 0.90)].toFixed(1),
    p95: returns[Math.floor(iters * 0.95)].toFixed(1),
    profit_pct: (returns.filter(r => r >= 100).length / iters * 100).toFixed(1),
  };
}

const pool = buildPool();

console.log('=== PIKIT v4.8 Balance Simulation ===');
console.log('Prices: basic=3100 power=8100 light=3600 swift=3300');
console.log('Adaptive sys: max 4, weak mode (<=3 player picks)\n');

const rates = {};
for (const [t, d] of Object.entries(PICKS)) rates[t] = enc(d);

// HE by player count
console.log('--- HE by Player Count ---');
console.log('Players | picks | sys(mode)    | steal%  | basic_ROI | blended_HE');
console.log('--------|-------|--------------|---------|-----------|------------');

for (const pc of [1, 2, 5, 10, 15, 20, 30, 50, 80, 100]) {
  const avgPicks = pc * 1.5;
  const { totalSys, anchorMode, isWeak } = getDynamicSysConfig(avgPicks);
  const steal = calcSteal(avgPicks);

  // per-type ROI
  let bS = 0, bR = 0;
  for (const [t, def] of Object.entries(PICKS)) {
    let totalR = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) totalR += simPickaxe(def, pool, steal, rates[t]);
    const avgR = totalR / N;
    if (PURCHASE_MIX[t]) { bS += def.price * PURCHASE_MIX[t]; bR += avgR * PURCHASE_MIX[t]; }
  }
  // TNT
  let tR = 0;
  for (let i = 0; i < 5000; i++) tR += simTNT(TNT_DEF, pool);
  bS += TNT_DEF.price * PURCHASE_MIX.tnt;
  bR += (tR / 5000) * PURCHASE_MIX.tnt;

  const he = (1 - bR / bS) * 100;
  const basicR = (() => { let r=0; for(let i=0;i<5000;i++) r+=simPickaxe(PICKS.basic,pool,steal,rates.basic); return r/5000; })();
  const basicROI = (basicR / PICKS.basic.price * 100).toFixed(1);
  const sysLabel = `${totalSys}(${isWeak?'weak':'full'})`;

  const heStr = he.toFixed(1) + '%';
  const inRange = he >= 51.5 && he <= 53.5;
  const flag = inRange ? 'OK' : (he > 55 ? 'HIGH' : 'LOW');

  console.log(`P${String(pc).padStart(3)}   | ${String(Math.round(avgPicks)).padStart(5)} | ${sysLabel.padEnd(12)} | ${(steal*100).toFixed(2).padStart(6)}% | ${basicROI.padStart(7)}%   | ${heStr.padStart(6)} ${flag}`);
}

// per-pickaxe distribution (basic @ 5p)
console.log('\n--- Per-Pickaxe Distribution (basic @ 5 players) ---');
const steal5p = calcSteal(7.5);
const dist = simPickaxeDistribution(pool, steal5p, rates.basic, 30000);
console.log(`P5=${dist.p5}%  P10=${dist.p10}%  P25=${dist.p25}%  P50=${dist.p50}%  P75=${dist.p75}%  P90=${dist.p90}%  P95=${dist.p95}%`);
console.log(`Profit runs (>=100% recovery): ${dist.profit_pct}%`);

// 10K session distribution @ 5p
console.log('\n--- 10K Session Distribution (5 players) ---');
const sessRates = {};
for (const [t, d] of Object.entries(PICKS)) sessRates[t] = rates[t];
const sess5p = simSession(pool, steal5p, sessRates, 5000);
console.log(`P10=${sess5p.p10} P25=${sess5p.p25} P50=${sess5p.p50} P75=${sess5p.p75} P90=${sess5p.p90} avg=${Math.round(sess5p.avg)}`);

// Jackpot pool accumulation estimate
console.log('\n--- Jackpot Pool Accumulation (estimate) ---');
const heEstimate = 0.53;
const spendPerHour_5p = 5 * 3 * (3600 / 30) * 3500; // 5p * 3picks avg * refreshes/hr * avg_price
const houseProfit_5p = spendPerHour_5p * heEstimate;
const poolGrowth_5p = Math.floor(houseProfit_5p / 50000) * 2500;
console.log(`5 players: spend/hr=${Math.round(spendPerHour_5p).toLocaleString()}cr, house_profit=${Math.round(houseProfit_5p).toLocaleString()}cr, pool+=${poolGrowth_5p.toLocaleString()}cr/hr`);
const spendPerHour_20p = 20 * 3 * (3600 / 30) * 3500;
const houseProfit_20p = spendPerHour_20p * heEstimate;
const poolGrowth_20p = Math.floor(houseProfit_20p / 50000) * 2500;
console.log(`20 players: spend/hr=${Math.round(spendPerHour_20p).toLocaleString()}cr, house_profit=${Math.round(houseProfit_20p).toLocaleString()}cr, pool+=${poolGrowth_20p.toLocaleString()}cr/hr`);
const hoursTo50k_20p = Math.ceil(50000 / Math.max(1, poolGrowth_20p));
console.log(`20 players: ~${hoursTo50k_20p}hr to reach 50K pool threshold`);

console.log('\n=== Validation Summary ===');
console.log('Target: HE 52-53% @ 2-30 players');
console.log('Target: P90+ basic >= 100% return (profit cases)');
