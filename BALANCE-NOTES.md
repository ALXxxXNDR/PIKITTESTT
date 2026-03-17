# PIKIT v4.4 Balance Mathematical Analysis

## Target Parameters
- Concurrent players: 3~80
- Max pickaxes per player per field: 3
- TNT: unlimited
- House win rate: **54-55% at 20 players** (simulation-verified)
- Jackpot: min 10 players + 1.5M credits spent since last

---

## 1. Monte Carlo Simulation Methodology

Balance was verified using `tools/balance-final.js` (config F4):
- **40,000 iterations** per pickaxe type per player count
- Calibrated encounter rates: base 2.5 hits/sec, scaled by hitbox size, speed, gravity
- System pickaxe steal modeled as competition ratio
- Combo system modeled with 15% break chance between blocks
- TNT modeled with area effect and tntResist mechanics

---

## 2. Expected Block Reward (Weighted Average)

| Block | Weight | HP | Reward | Contribution |
|-------|--------|-----|--------|--------------|
| Diamond | 1% | 180 | 5,000 | 50.0 |
| Gold | 2% | 90 | 2,000 | 40.0 |
| Emerald | 5% | 55 | 600 | 30.0 |
| Iron | 12% | 32 | 150 | 18.0 |
| Copper | 20% | 20 | 50 | 10.0 |
| Stone | 20% | 10 | ~2 | 0.4 |
| Dirt | 18% | 7 | ~2 | 0.36 |
| Gravel | 12% | 9 | ~2 | 0.24 |
| Clay | 10% | 8 | ~2 | 0.2 |
| **Total** | **100%** | **avg ~19** | | **~149.2** |

**Average block reward: ~149 credits, Average HP: ~19**

---

## 3. Simulation Results — Per-Pickaxe ROI

### At 20 Players (baseline, system steal ~6.9%)

| Pickaxe | Price | DMG | Lifetime | Blocks | Reward | ROI | House Edge |
|---------|-------|-----|----------|--------|--------|-----|-----------|
| Basic | 1,800 | 3 | 30s | 10.3 | 956 | **53.1%** | 46.9% |
| Power | 5,000 | 5 | 30s | 21.3 | 2,623 | **52.5%** | 47.5% |
| Light | 2,200 | 4 | 35s | 11.5 | 1,130 | **51.4%** | 48.6% |
| Swift | 2,200 | 3 | 25s | 11.1 | 1,082 | **49.2%** | 50.8% |

**All pickaxes within 49-53% ROI — balanced meta, no dominant strategy**

### Blended House Edge (purchase mix: basic 35%, power 15%, light 20%, swift 25%, TNT 5%)

| Players | System Steal | Blended ROI | House Edge |
|---------|-------------|-------------|-----------|
| 10 | 13.0% | 40.2% | **59.8%** |
| **20** | **6.9%** | **44.6%** | **55.4%** |
| 40 | 3.6% | 47.4% | **52.6%** |
| 80 | ~1.8% | ~49% | **~51%** |

---

## 4. System Pickaxe Analysis

| Parameter | v4.3 | v4.4 | Change |
|-----------|------|------|--------|
| Damage | 8 | 8 | 0% |
| Scale | 2.0 | 1.8 | -10% |
| gravityMult | 0.7 | 0.7 | 0% |
| speedMult | 1.5 | 1.5 | 0% |

- Scale reduced from 2.0→1.8 = smaller hitbox = fewer encounters
- This reduces system's encounter rate from ~7.5/sec to ~6.7/sec
- Key tuning lever: system steal rate determines house edge curve across player counts

### System Encounter Rate Model
```
encounterRate = 2.5 × (scale/0.8) × speedMult^0.7 × gravMult^0.3
System: 2.5 × (1.8/0.8) × 1.5^0.7 × 0.7^0.3 = 6.7/sec
stealRate@Np = sysRate / (sysRate + N×1.5×3.0)
```

---

## 5. TNT Economy

| Item | Price | DMG | Blocks Hit | Destroyed | Avg Revenue | ROI |
|------|-------|-----|-----------|-----------|-------------|-----|
| TNT | 8,000 | 30 | ~21 | ~16 | ~235 | **~3%** |

- TNT price halved from 15,000→8,000 (more accessible as utility)
- Damage increased 25→30 (kills copper at 20HP, weakens iron at 32HP)
- Still a credit sink — primary use is strategic clearing, not profit
- TNT-resistant blocks (jackpot, diamond, gold) take only 40% damage

---

## 6. Combo System (unchanged from v4.3)

| Stage | Threshold | Multiplier |
|-------|-----------|-----------|
| 0 | 0 hits | 1.0x |
| 1 | 3 hits | 1.05x |
| 2 | 6 hits | 1.1x |
| 3 | 10 hits | 1.2x |
| 4 | 15 hits | 1.35x |
| 5 | 25 hits | 1.5x |

Max 1.5x — modest bonus without breaking economy.

---

## 7. Jackpot Analysis (unchanged from v4.3)

### Spawn Conditions (ALL must be met)
1. No existing jackpot block on field
2. At least 10 players in field
3. 1.5M+ credits spent since last jackpot
4. 0.05% chance per block position in new chunks

### Jackpot Economics
- Reward: 250,000 credits
- Credits spent to trigger: 1,500,000+
- Jackpot as % of spend: 16.7%
- House captures 83% of all credits spent even when jackpot hits

---

## 8. v4.3 → v4.4 Changes Summary

| Parameter | v4.3 | v4.4 | Change |
|-----------|------|------|--------|
| Basic price | 2,500 | 1,800 | -28% |
| Basic DMG | 3 | 3 | 0% |
| Power price | 5,000 | 5,000 | 0% |
| Power DMG | 6 | 5 | -17% |
| Power lifetime | 35s | 30s | -14% |
| Light price | 4,000 | 2,200 | -45% |
| Light DMG | 5 | 4 | -20% |
| Light scale | 0.65 | 0.7 | +8% |
| Light lifetime | 30s | 35s | +17% |
| Swift price | 3,500 | 2,200 | -37% |
| Swift speedMult | 1.8 | 1.6 | -11% |
| System scale | 2.0 | 1.8 | -10% |
| TNT price | 15,000 | 8,000 | -47% |
| TNT DMG | 25 | 30 | +20% |
| Diamond HP | 150 | 180 | +20% |
| Gold HP | 80 | 90 | +13% |
| Emerald HP | 50 | 55 | +10% |
| Iron HP | 30 | 32 | +7% |
| Copper HP | 18 | 20 | +11% |
| Dirt HP | 6 | 7 | +17% |
| Gravel HP | 8 | 9 | +13% |
| Clay HP | 7 | 8 | +14% |

### Design Philosophy
- **Lower pickaxe prices** = more frequent purchases = more fun engagement
- **Slightly higher block HP** = blocks take longer to destroy = fewer blocks per lifetime
- **Balanced per-pickaxe ROI** = no single "meta" pick, all viable
- **System pickaxe tuned down** = fair competition, not domination
- **TNT cheaper but still low ROI** = utility tool accessible to all

---

## 9. Why This Works (Golden Balance)

The house edge is maintained through three mechanisms:

1. **Block HP vs Damage**: Block HP is tuned so that pickaxes can only destroy a limited number of blocks per lifetime. The HP/damage ratio ensures returns stay below purchase cost.

2. **System Pickaxe Competition**: The system pickaxe competes for blocks, "stealing" ~7% at 20 players. This scales naturally — more players = less system impact = slightly lower house edge.

3. **Combo Cap**: Max combo of 1.5x prevents reward snowballing. Even at peak combo, returns stay safely under purchase price.

**Player Fun Factor**: With 49-53% ROI, players frequently see meaningful rewards (iron blocks at 150cr, copper at 50cr, occasionally emerald at 600cr). They can win sessions even though the house has a long-term edge. This creates the "near-win excitement" that keeps players engaged.
