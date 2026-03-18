# PIKIT v4.5 Balance Mathematical Analysis

## Target Parameters
- Concurrent players: 3~80
- Max pickaxes per player per field: 3
- TNT: unlimited
- House win rate: **55% at 5 players, 54% at 10 players**
- Jackpot: min 10 players + 1.5M credits spent since last

---

## 1. Monte Carlo Simulation Methodology

Balance verified using `tools/balance-v45-combined.js`:
- **50,000-80,000 iterations** per configuration
- Parameter sweep: 300+ system pickaxe combinations (scale × speed × damage × price multiplier)
- Calibrated encounter rate: `2.5 × (scale/0.8) × speedMult^0.7 × gravMult^0.3`
- System steal: `sysEncRate / (sysEncRate + playerCount × 1.5 × 3.0)`
- Combo: 15% break chance between block destroys
- Purchase mix: basic 35%, power 15%, light 20%, swift 25%, TNT 5%

---

## 2. Block Reward & HP (unchanged from v4.4)

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

---

## 3. System Pickaxe — The Key Balance Lever

### v4.4 → v4.5 Changes
| Parameter | v4.4 | v4.5 | Change |
|-----------|------|------|--------|
| damage | 8 | **6** | -25% |
| scale | 1.8 | **0.5** | -72% |
| speedMult | 1.5 | **0.55** | -63% |
| Encounter rate | 6.71/s | **0.92/s** | -86% |

### Why This Works
The system pickaxe's encounter rate determines the house edge "spread" across player counts:

```
stealRate = sysEncRate / (sysEncRate + playerCount × 1.5 × 3.0)

v4.4 (sysEnc=6.71):  5p→23%, 10p→13%, 20p→7%   → huge spread
v4.5 (sysEnc=0.92):  5p→4%, 10p→2%, 20p→1%     → flat spread
```

Lower encounter rate = flatter curve = more consistent house edge across player counts.

### Steal Rate by Player Count
| Players | v4.4 steal | v4.5 steal | Difference |
|---------|-----------|-----------|-----------|
| 3 | 33% | 6.4% | -27pp |
| 5 | 23% | 3.9% | -19pp |
| 10 | 13% | 2.0% | -11pp |
| 20 | 7% | 1.0% | -6pp |
| 40 | 4% | 0.5% | -3pp |

---

## 4. Per-Pickaxe Balance

### At 5 Players (primary target)
| Pickaxe | Price | DMG | Lifetime | Blocks | Reward | ROI |
|---------|-------|-----|----------|--------|--------|-----|
| Basic | 1,900 | 3 | 30s | 10.3 | 1,010 | **52.2%** |
| Power | 5,400 | 5 | 30s | 21.3 | 2,751 | **51.2%** |
| Light | 2,400 | 4 | 35s | 11.5 | 1,198 | **50.6%** |
| Swift | 2,400 | 3 | 25s | 11.1 | 1,140 | **48.2%** |

### At 10 Players (secondary target)
| Pickaxe | Price | DMG | Lifetime | Blocks | Reward | ROI |
|---------|-------|-----|----------|--------|--------|-----|
| Basic | 1,900 | 3 | 30s | 10.9 | 1,055 | **54.5%** |
| Power | 5,400 | 5 | 30s | 22.4 | 2,857 | **53.2%** |
| Light | 2,400 | 4 | 35s | 12.2 | 1,237 | **52.3%** |
| Swift | 2,400 | 3 | 25s | 11.7 | 1,193 | **50.5%** |

**All pickaxes within 48-55% ROI — balanced meta**

---

## 5. Blended House Edge

| Players | System Steal | Blended ROI | House Edge |
|---------|-------------|-------------|-----------|
| 3 | 6.4% | 42.3% | **57.8%** |
| **5** | **3.9%** | **44.1%** | **55.9%** ✅ |
| **10** | **2.0%** | **45.8%** | **54.2%** ✅ |
| 20 | 1.0% | 46.8% | **53.2%** |
| 40 | 0.5% | 47.6% | **52.4%** |
| 80 | 0.3% | 48.0% | **52.0%** |

---

## 6. TNT Economy (unchanged)

| Item | Price | DMG | Blocks Hit | Revenue | ROI |
|------|-------|-----|-----------|---------|-----|
| TNT | 8,000 | 30 | ~16 | ~235 | **~3%** |

---

## 7. Combo System (unchanged)

| Stage | Threshold | Multiplier |
|-------|-----------|-----------|
| 0 | 0 hits | 1.0x |
| 1 | 3 hits | 1.05x |
| 5 | 25 hits | 1.5x (max) |

---

## 8. v4.4 → v4.5 Full Changes

| Parameter | v4.4 | v4.5 | Change |
|-----------|------|------|--------|
| Basic price | 1,800 | 1,900 | +5.6% |
| Power price | 5,000 | 5,400 | +8.0% |
| Light price | 2,200 | 2,400 | +9.1% |
| Swift price | 2,200 | 2,400 | +9.1% |
| System DMG | 8 | 6 | -25% |
| System scale | 1.8 | 0.5 | -72% |
| System speed | 1.5 | 0.55 | -63% |

All other values (block HP/rewards, TNT, combo, jackpot, physics) unchanged.

---

## 9. Design Philosophy

### Why Weak System Pickaxe?
The v4.4 approach used a strong system pickaxe (large, fast, high damage) as the primary house edge enforcer. This worked well at 20+ players but created a brutal experience for small groups.

v4.5 shifts the balance philosophy:
- **Pickaxe pricing** is now the primary house edge source (prices ~5-9% higher than v4.4)
- **System pickaxe** provides a mild, consistent ~2-6% additional edge
- Result: consistent 52-56% house edge across ALL player counts

### Player Experience
- At 5 players: players see ~49-52% return per pickaxe — frequent meaningful rewards
- Iron blocks (150cr) and copper (50cr) provide regular dopamine hits
- Occasional emerald (600cr) or gold (2,000cr) creates excitement
- Power pickaxe at 5,400cr feels premium but delivers proportional value
- No single "meta" pickaxe — all 4 types are viable choices
