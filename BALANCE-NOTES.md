# PIKIT v4.6 Balance Mathematical Analysis

## Target Parameters
- Concurrent players: 3~80
- Max pickaxes per player per field: 3
- TNT: unlimited
- House win rate: **55% at 5 players, 54% at 10 players**
- PIKIT system pickaxe: **1.5 block size** (non-negotiable visual requirement)
- Jackpot: min 10 players + 1.5M credits spent since last

---

## 1. Simulation Methodology

Balance verified using `tools/balance-v46-sim.js`:
- **60,000+ iterations** per configuration
- Combined sweep: system pickaxe params × price multiplier (300+ combinations)
- Calibrated encounter rate: `2.5 × (scale/0.8) × speedMult^0.7 × gravMult^0.3`
- System steal: `sysEncRate / (sysEncRate + playerCount × 1.5 × 3.0)`
- Combo: 15% break chance between block destroys
- Purchase mix: basic 35%, power 15%, light 20%, swift 25%, TNT 5%

---

## 2. System Pickaxe — "Giant Floating PIKIT"

### v4.5 → v4.6 Changes
| Parameter | v4.5 | v4.6 | Change |
|-----------|------|------|--------|
| scale | 0.5 | **1.5** | +200% |
| damage | 6 | **5** | -17% |
| gravityMult | 0.7 | **0.3** | -57% |
| speedMult | 0.55 | **0.1** | -82% |
| Encounter rate | 0.92/s | **0.65/s** | -29% |

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

## 3. Block Reward & HP (unchanged)

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

## 4. Per-Pickaxe Balance

### At 5 Players (primary target, steal 2.8%)
| Pickaxe | Price | DMG | Lifetime | ROI |
|---------|-------|-----|----------|-----|
| Basic | 2,100 | 3 | 30s | **49.7%** |
| Power | 5,400 | 5 | 30s | **52.1%** |
| Light | 2,400 | 4 | 35s | **51.0%** |
| Swift | 2,200 | 3 | 25s | **53.3%** |
| **Spread** | | | | **3.6%** |

### At 10 Players (secondary target, steal 1.4%)
| Pickaxe | Price | DMG | Lifetime | ROI |
|---------|-------|-----|----------|-----|
| Basic | 2,100 | 3 | 30s | **50.8%** |
| Power | 5,400 | 5 | 30s | **53.6%** |
| Light | 2,400 | 4 | 35s | **52.4%** |
| Swift | 2,200 | 3 | 25s | **54.4%** |

---

## 5. Blended House Edge

| Players | Steal | Blended ROI | House Edge |
|---------|-------|-------------|-----------|
| 3 | 4.6% | 43.4% | **56.6%** |
| **5** | **2.8%** | **44.9%** | **55.1%** ✅ |
| **10** | **1.4%** | **46.0%** | **54.0%** ✅ |
| 20 | 0.7% | 47.0% | **53.0%** |
| 40 | 0.4% | 47.4% | **52.6%** |
| 80 | 0.2% | 47.7% | **52.3%** |

---

## 6. TNT Economy (unchanged)

| Item | Price | DMG | Revenue | ROI |
|------|-------|-----|---------|-----|
| TNT | 8,000 | 30 | ~235 | **~3%** |

---

## 7. Version History Summary

| Version | Target | System Scale | Key Change |
|---------|--------|-------------|-----------|
| v4.3 | 55% @20p | 2.0 | Initial balance overhaul |
| v4.4 | 55% @20p | 1.8 | Pickaxe balance equalization |
| v4.5 | 55% @5p | 0.5 | Low player count optimization |
| **v4.6** | **55% @5p** | **1.5** | **Large PIKIT + ultra-slow movement** |

### v4.5 → v4.6 Full Diff
| Parameter | v4.5 | v4.6 | Change |
|-----------|------|------|--------|
| Basic price | 1,900 | 2,100 | +10.5% |
| Swift price | 2,400 | 2,200 | -8.3% |
| System scale | 0.5 | 1.5 | +200% |
| System damage | 6 | 5 | -17% |
| System gravMult | 0.7 | 0.3 | -57% |
| System speedMult | 0.55 | 0.1 | -82% |

---

## 8. Design Philosophy

### "Giant Floating PIKIT" Concept
The system pickaxe is large (1.5 blocks) but moves extremely slowly:
- **gravityMult 0.3** — falls at 30% normal speed, appears to float
- **speedMult 0.1** — almost no horizontal movement
- **damage 5** — takes many hits to destroy blocks

This creates a "floating obstacle" that:
1. Covers multiple columns (wide hitbox) — solves the v4.5 single-column problem
2. Moves predictably — players can strategize around it
3. Steals blocks slowly — fair competition at all player counts
4. Looks imposing — large magenta pickaxe adds visual drama

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
