# PIKIT v4.5 Changelog — Balance Retune for Low Player Counts

**Date**: 2026-03-18
**Goal**: House edge 55% at 5 players, 54% at 10 players

---

## Problem
v4.4 balance was tuned for 20 players (55% HE), but at lower player counts the system pickaxe dominated:
- 5 players: **67% house edge** (too high — players lose money too fast)
- 10 players: **60% house edge** (still too harsh)

Root cause: System pickaxe (scale 1.8, speed 1.5) had encounter rate 6.71/sec, causing steal rates of 23% at 5 players.

## Solution
Two-pronged approach:
1. **Drastically reduce system pickaxe** effectiveness (encounter rate 6.71→0.92/sec)
2. **Slightly increase user pickaxe prices** (~5-8%) to maintain house profitability

## Changes

### Pickaxe Prices
| Pickaxe | v4.4 Price | v4.5 Price | Change |
|---------|-----------|-----------|--------|
| Basic | 1,800 | **1,900** | +5.6% |
| Power | 5,000 | **5,400** | +8.0% |
| Light | 2,200 | **2,400** | +9.1% |
| Swift | 2,200 | **2,400** | +9.1% |

### System Pickaxe (PIKIT)
| Parameter | v4.4 | v4.5 | Change |
|-----------|------|------|--------|
| damage | 8 | **6** | -25% |
| scale | 1.8 | **0.5** | -72% |
| speedMult | 1.5 | **0.55** | -63% |
| gravityMult | 0.7 | 0.7 | 0% |
| Encounter rate | 6.71/s | **0.92/s** | -86% |

### Unchanged
- Block HP & rewards (all types)
- TNT (price 8000, damage 30)
- Combo system (max 1.5x)
- Jackpot config (1.5M threshold, 0.05% chance, 250K reward)
- Game physics (gravity 400, terminal velocity 450)
- Player pickaxe abilities (damage, scale, gravity, speed, lifetime)

## Simulation Results

### House Edge by Player Count
| Players | v4.4 | v4.5 | Target |
|---------|------|------|--------|
| 3 | 58.4% | 57.8% | — |
| **5** | **67.0%** | **55.9%** | **55%** ✅ |
| **10** | **60.0%** | **54.2%** | **54%** ✅ |
| 20 | 55.4% | 53.2% | — |
| 40 | 52.7% | 52.4% | — |
| 80 | ~51% | 52.0% | — |

### Per-Pickaxe ROI at 5 Players
| Pickaxe | ROI | Comment |
|---------|-----|---------|
| Basic | 52.2% | Best cheap option |
| Power | 51.2% | Premium, high block count |
| Light | 50.6% | Long-lived, floaty |
| Swift | 48.2% | Fast, many encounters |

### Per-Pickaxe ROI at 10 Players
| Pickaxe | ROI | Comment |
|---------|-----|---------|
| Basic | 54.5% | Good value |
| Power | 53.2% | Balanced premium |
| Light | 52.3% | Consistent |
| Swift | 50.5% | Speed-focused |

## Methodology
- Monte Carlo simulation with 50,000-80,000 iterations per configuration
- Parameter sweep: 300+ system pickaxe combinations (scale × speed × damage × price multiplier)
- Two-phase optimization: wide sweep → fine-tune top candidates
- Verified with rounded prices at 50,000 iterations
- Simulation tools: `tools/balance-v45-combined.js`, `tools/balance-v45-sweep.js`

## Key Design Insight
The system pickaxe's encounter rate determines the "spread" between low and high player count house edges. A lower encounter rate (~1.0/sec) creates a flatter curve:
- Small difference between 5p and 10p (only ~1.7% HE change)
- Stable house profitability across all player counts (52-56%)
- Fair gameplay even with very few players

## Migration Notes
- **Server restart required** (Chunk.js caches block pool)
- System pickaxe is now visually smaller (scale 0.5 = 60px vs 120px blocks)
- System pickaxe color unchanged (#FF00FF magenta) — still distinctive
- No code changes required — constants only
