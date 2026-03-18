# PIKIT v4.7 Changelog — Consistent Rewards Rebalance

**Date**: 2026-03-18
**Goal**: Flatten reward distribution — common blocks give meaningful rewards ("steady income + occasional jackpot")

---

## Problem
v4.6 common blocks (stone, dirt, gravel, clay — 60% of the field) gave only 1-5 credits with HP 7-10, creating a "lottery" feel. Players spending 10K credits could return near 0 if they only encountered common blocks. The P10 (bottom 10% of sessions) was just 2,002 credits — meaning 1 in 10 sessions felt completely unrewarding.

## Solution
"Consistent Rewards" approach:
1. **Lower common block HP** (2-3) so they break in 1 hit (player DMG is 3)
2. **Raise common block rewards** to 22-28 credits (fixed, not random)
3. **Raise pickaxe prices ~60%** to maintain house edge
4. **Reduce rare block rewards by 10%** to compress the reward range

## Changes

### Block Changes
| Block | v4.6 HP | v4.7 HP | v4.6 Reward | v4.7 Reward | Change |
|-------|---------|---------|-------------|-------------|--------|
| Stone | 10 | **3** | 1-5 (random) | **28 (fixed)** | Easier + more rewarding |
| Dirt | 7 | **2** | 1-5 (random) | **22 (fixed)** | Easier + more rewarding |
| Gravel | 9 | **3** | 1-5 (random) | **25 (fixed)** | Easier + more rewarding |
| Clay | 8 | **2** | 1-5 (random) | **24 (fixed)** | Easier + more rewarding |
| Iron | 32 | **20** | 150 | **100** | Easier but less reward |
| Copper | 20 | **15** | 50 | 50 | Easier, same reward |
| Diamond | 180 | 180 | 5,000 | **4,500** | -10% reward |
| Gold | 90 | 90 | 2,000 | **1,800** | -10% reward |
| Emerald | 55 | 55 | 540 | 540 | Unchanged |

### Pickaxe Price Changes
| Pickaxe | v4.6 | v4.7 | Change |
|---------|------|------|--------|
| Basic | 2,100 | **3,400** | +62% |
| Power | 5,400 | **8,800** | +63% |
| Light | 2,400 | **3,900** | +63% |
| Swift | 2,200 | **3,600** | +64% |

### Unchanged
- System pickaxe (scale 1.5, gravity 0.3, speed 0.1, damage 5)
- TNT (8,000cr, 30dmg)
- Combo system (max 1.5x)
- Jackpot config
- Game physics (gravity 400, terminal velocity 450)
- User pickaxe abilities (damage, scale, gravity, speed, lifetime)

## Simulation Results

### House Edge
| Players | v4.6 | v4.7 | Target |
|---------|------|------|--------|
| 3 | 56.8% | 56.8% | — |
| **5** | 55.2% | **55.3%** | **55%** ✅ |
| **10** | 53.9% | **53.9%** | **54%** ✅ |
| 20 | 53.0% | 53.2% | — |
| 40 | 52.6% | 52.8% | — |

### Per-Pickaxe ROI at 5 Players
| Pickaxe | Price | ROI |
|---------|-------|-----|
| Basic | 3,400 | 49.4% |
| Power | 8,800 | 44.9% |
| Light | 3,900 | 47.1% |
| Swift | 3,600 | 51.8% |

**Spread: 6.9% — within acceptable range**

### Session Analysis (10K Credits Spent)
| Percentile | v4.6 | v4.7 | Change |
|------------|------|------|--------|
| P10 (worst sessions) | 2,002 | **3,123** | +56% |
| P25 | 3,403 | **3,947** | +16% |
| P50 (median) | 5,014 | **5,132** | +2% |
| P90 (lucky sessions) | 9,172 | **8,225** | -10% |
| Max (jackpot) | 21,987 | **15,379** | -30% |

## Design Note
The "Consistent Rewards" approach fundamentally changes how common blocks feel:

- **Common blocks break in 1 hit** (HP 2-3 vs DMG 3) — fast, satisfying gameplay
- **Each break gives 22-28 credits** — steady income stream instead of near-zero
- **Players feel rewarded even when hitting only common blocks** — no more "dead" sessions
- **Rare blocks (diamond/gold/emerald) still provide exciting big wins** — the jackpot dream remains
- **Result**: P10 at 10K spending went from 2,002 to 3,123 (55% improvement in worst-case sessions)

The tradeoff: maximum potential payout decreases (21,987 → 15,379), but the floor rises significantly. This is a deliberate shift from "lottery" to "slot machine with guaranteed minimum" — players always walk away with something.

## Migration
- **Server restart required** (Chunk.js block pool cache)
- Code changes: `constants.js` (block HP/rewards, pickaxe prices), `Block.js` (getReward() cleanup)
