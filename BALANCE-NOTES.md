# PIKIT v4.7 Balance Mathematical Analysis

## Target Parameters
- Concurrent players: 3~80
- Max pickaxes per player per field: 3
- TNT: unlimited
- House win rate: **55% at 5 players, 54% at 10 players**
- PIKIT system pickaxe: **1.5 block size** (non-negotiable visual requirement)
- Jackpot: min 10 players + 1.5M credits spent since last
- **NEW**: P10 >= 3,000 credits per 10K spent (minimum viable session)

---

## 1. Simulation Methodology

Balance verified using `tools/balance-v47-sim.js` (sweep) and `tools/balance-v47-final.js` (final validation):
- **60,000+ iterations** per configuration
- Combined sweep: block rewards × price multiplier (300+ combinations)
- Calibrated encounter rate: `2.5 × (scale/0.8) × speedMult^0.7 × gravMult^0.3`
- System steal: `sysEncRate / (sysEncRate + playerCount × 1.5 × 3.0)`
- Combo: 15% break chance between block destroys
- Purchase mix: basic 35%, power 15%, light 20%, swift 25%, TNT 5%

---

## 2. System Pickaxe — "Giant Floating PIKIT"

### Unchanged from v4.6
| Parameter | Value |
|-----------|-------|
| scale | 1.5 |
| damage | 5 |
| gravityMult | 0.3 |
| speedMult | 0.1 |
| Encounter rate | 0.65/s |

### Encounter Rate Math
```
encRate = 2.5 × (1.5/0.8) × 0.1^0.7 × 0.3^0.3
        = 2.5 × 1.875 × 0.200 × 0.697
        = 0.652/s
```

### Steal Rate
```
stealRate = 0.652 / (0.652 + playerCount × 4.5)

@3p:  0.652 / 14.15 = 4.6%
@5p:  0.652 / 23.15 = 2.8%
@10p: 0.652 / 45.65 = 1.4%
@20p: 0.652 / 90.65 = 0.7%
@40p: 0.652 / 180.65 = 0.4%
```

---

## 3. Block Reward & HP

| Block | Weight | HP | Reward | Type | Contribution |
|-------|--------|----|--------|------|--------------|
| Diamond | 1% | 180 | 4,500 | fixed | 45.0 |
| Gold | 2% | 90 | 1,800 | fixed | 36.0 |
| Emerald | 5% | 55 | 540 | fixed | 27.0 |
| Iron | 12% | 20 | 100 | fixed | 12.0 |
| Copper | 20% | 15 | 50 | fixed | 10.0 |
| Stone | 20% | 3 | 28 | fixed | 5.6 |
| Dirt | 18% | 2 | 22 | fixed | 3.96 |
| Gravel | 12% | 3 | 25 | fixed | 3.0 |
| Clay | 10% | 2 | 24 | fixed | 2.4 |
| **Total** | **100%** | **avg ~14** | | | **~115.0** |

### v4.6 → v4.7 Key Changes
- Common blocks (stone/dirt/gravel/clay): HP 7-10 → 2-3, reward 1-5 → 22-28 (fixed)
- Iron: HP 32→20, reward 150→100
- Copper: HP 20→15, reward unchanged
- Diamond: reward 5000→4500 (-10%)
- Gold: reward 2000→1800 (-10%)
- Weighted average reward: ~149 → ~115 (but blocks break much faster)

---

## 4. Per-Pickaxe Balance

### At 5 Players (primary target, steal 2.8%)
| Pickaxe | Price | DMG | Lifetime | ROI |
|---------|-------|-----|----------|-----|
| Basic | 3,400 | 3 | 30s | **49.4%** |
| Power | 8,800 | 5 | 30s | **44.9%** |
| Light | 3,900 | 4 | 35s | **47.1%** |
| Swift | 3,600 | 3 | 25s | **51.8%** |
| **Spread** | | | | **6.9%** |

### At 10 Players (secondary target, steal 1.4%)
| Pickaxe | Price | DMG | Lifetime | ROI |
|---------|-------|-----|----------|-----|
| Basic | 3,400 | 3 | 30s | **50.5%** |
| Power | 8,800 | 5 | 30s | **46.2%** |
| Light | 3,900 | 4 | 35s | **48.4%** |
| Swift | 3,600 | 3 | 25s | **52.9%** |

---

## 5. Blended House Edge

| Players | Steal | Blended ROI | House Edge |
|---------|-------|-------------|-----------|
| 3 | 4.6% | 43.2% | **56.8%** |
| **5** | **2.8%** | **44.7%** | **55.3%** ✅ |
| **10** | **1.4%** | **46.1%** | **53.9%** ✅ |
| 20 | 0.7% | 46.8% | **53.2%** |
| 40 | 0.4% | 47.2% | **52.8%** |
| 80 | 0.2% | 47.5% | **52.5%** |

---

## 6. Session Percentile Analysis

Distribution of returns per 10,000 credits spent (5 players, 60K iterations):

| Percentile | Credits Returned | ROI | Interpretation |
|------------|-----------------|-----|----------------|
| P5 | 2,510 | 25.1% | Very unlucky session |
| **P10** | **3,123** | **31.2%** | **Minimum viable (target >= 3,000)** ✅ |
| P25 | 3,947 | 39.5% | Below average |
| **P50** | **5,132** | **51.3%** | **Median session** |
| P75 | 6,480 | 64.8% | Above average |
| P90 | 8,225 | 82.3% | Lucky session |
| P95 | 10,890 | 108.9% | Very lucky (profitable) |
| Max | 15,379 | 153.8% | Jackpot session |

### v4.6 vs v4.7 Comparison
| Percentile | v4.6 | v4.7 | Change |
|------------|------|------|--------|
| P10 | 2,002 | 3,123 | **+56%** |
| P25 | 3,403 | 3,947 | +16% |
| P50 | 5,014 | 5,132 | +2% |
| P90 | 9,172 | 8,225 | -10% |
| Max | 21,987 | 15,379 | -30% |

The distribution is compressed: worst sessions improve dramatically, best sessions decrease. Overall house edge remains the same.

---

## 7. TNT Economy (unchanged)

| Item | Price | DMG | Revenue | ROI |
|------|-------|-----|---------|-----|
| TNT | 8,000 | 30 | ~235 | **~3%** |

---

## 8. Version History Summary

| Version | Target | System Scale | Key Change |
|---------|--------|-------------|-----------|
| v4.3 | 55% @20p | 2.0 | Initial balance overhaul |
| v4.4 | 55% @20p | 1.8 | Pickaxe balance equalization |
| v4.5 | 55% @5p | 0.5 | Low player count optimization |
| v4.6 | 55% @5p | 1.5 | Large PIKIT + ultra-slow movement |
| **v4.7** | **55% @5p** | **1.5** | **Consistent rewards — common block overhaul** |

### v4.6 → v4.7 Full Diff
| Parameter | v4.6 | v4.7 | Change |
|-----------|------|------|--------|
| Basic price | 2,100 | 3,400 | +62% |
| Power price | 5,400 | 8,800 | +63% |
| Light price | 2,400 | 3,900 | +63% |
| Swift price | 2,200 | 3,600 | +64% |
| Stone HP | 10 | 3 | -70% |
| Stone reward | 1-5 | 28 | +460% (fixed) |
| Dirt HP | 7 | 2 | -71% |
| Dirt reward | 1-5 | 22 | +340% (fixed) |
| Gravel HP | 9 | 3 | -67% |
| Gravel reward | 1-5 | 25 | +400% (fixed) |
| Clay HP | 8 | 2 | -75% |
| Clay reward | 1-5 | 24 | +380% (fixed) |
| Iron HP | 32 | 20 | -38% |
| Iron reward | 150 | 100 | -33% |
| Copper HP | 20 | 15 | -25% |
| Diamond reward | 5,000 | 4,500 | -10% |
| Gold reward | 2,000 | 1,800 | -10% |
| System pickaxe | (all) | (all) | Unchanged |

---

## 9. Design Philosophy

### "Consistent Rewards" Concept
Every block break matters. In v4.6, 60% of blocks gave 1-5 credits — essentially zero. Players could spend thousands and feel nothing. v4.7 ensures every single block destroyed provides meaningful feedback:

- **Common blocks (60% of field)**: HP 2-3, reward 22-28cr
  - A basic pickaxe (DMG 3) destroys them in 1 hit
  - Each destruction gives immediate, visible reward
  - 10 common blocks = ~250cr — tangible progress
- **Mid-tier blocks (32%)**: iron/copper still require multiple hits but reward proportionally
- **Rare blocks (8%)**: diamond/gold/emerald are the "jackpot moments" — still exciting, slightly reduced

### Why Raise Prices ~60%?
With common blocks now giving 22-28cr instead of 1-5cr, the total credits earned per pickaxe lifetime increased dramatically. Without price adjustment, house edge would drop below 40%. The ~60% price increase restores the target 55% house edge while keeping the improved reward distribution.

### The Tradeoff
```
v4.6: High variance — "lottery" (P10: 2,002, Max: 21,987, range: 19,985)
v4.7: Low variance — "consistent" (P10: 3,123, Max: 15,379, range: 12,256)
```
The range compressed by 39%. Players lose less in bad sessions and win less in great sessions, but the median barely changes. This is intentional — retention improves when worst-case sessions feel playable.

### Why Not Just Change System Scale?
With scale 1.5, the encounter rate formula gives a high base:
```
base = 2.5 × (1.5/0.8) = 4.69/s
```
Only extreme reductions in speed/gravity can bring this down to ~0.65/s.
The math requires `speedMult^0.7 × gravMult^0.3 ≈ 0.14`, achieved by:
- speedMult=0.1 → 0.1^0.7 = 0.200
- gravMult=0.3 → 0.3^0.3 = 0.697
- Product: 0.200 × 0.697 = 0.139 ✓
