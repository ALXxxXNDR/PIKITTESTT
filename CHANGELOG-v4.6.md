# PIKIT v4.6 Changelog — Large PIKIT Pickaxe Rebalance

**Date**: 2026-03-18
**Goal**: Keep PIKIT pickaxe at 1.5 block size while maintaining 55% HE @5p, 54% @10p

---

## Problem
v4.5 reduced system pickaxe scale to 0.5, making it too small — blocks only destroyed in a single column. User requires the PIKIT pickaxe to remain **1.5 blocks in size** for proper visual impact and multi-column block destruction.

## Solution
"Giant Floating Pickaxe" approach: keep scale 1.5 but make it extremely slow-moving. The PIKIT pickaxe is now a large, slowly drifting obstacle that occasionally hits blocks.

## Changes

### System Pickaxe (PIKIT)
| Parameter | v4.5 | v4.6 | Change | Rationale |
|-----------|------|------|--------|-----------|
| scale | 0.5 | **1.5** | +200% | Visual: 1.5 blocks wide |
| damage | 6 | **5** | -17% | Slower block destruction |
| gravityMult | 0.7 | **0.3** | -57% | Ultra-slow fall (floats) |
| speedMult | 0.55 | **0.1** | -82% | Near-stationary horizontal |
| Encounter rate | 0.92/s | **0.65/s** | -29% | Lower block competition |

### User Pickaxe Prices
| Pickaxe | v4.5 | v4.6 | Change |
|---------|------|------|--------|
| Basic | 1,900 | **2,100** | +10.5% |
| Power | 5,400 | 5,400 | 0% |
| Light | 2,400 | 2,400 | 0% |
| Swift | 2,400 | **2,200** | -8.3% |

### Unchanged
- All block HP & rewards
- TNT (8000cr, 30dmg)
- Combo system (max 1.5x)
- Jackpot config
- Game physics (gravity 400, terminal velocity 450)
- User pickaxe abilities (damage, scale, gravity, speed, lifetime)

## Simulation Results

### House Edge
| Players | v4.5 | v4.6 | Target |
|---------|------|------|--------|
| 3 | 57.8% | 56.6% | — |
| **5** | 55.9% | **55.1%** | **55%** ✅ |
| **10** | 54.2% | **54.0%** | **54%** ✅ |
| 20 | 53.2% | 53.0% | — |
| 40 | 52.4% | 52.6% | — |

### Per-Pickaxe ROI at 5 Players
| Pickaxe | Price | ROI |
|---------|-------|-----|
| Basic | 2,100 | 49.7% |
| Power | 5,400 | 52.1% |
| Light | 2,400 | 51.0% |
| Swift | 2,200 | 53.3% |

**Spread: 3.6% — all pickaxes viable, no dominant strategy**

## Design Note
The "Giant Floating PIKIT" creates an interesting gameplay dynamic:
- Large hitbox covers multiple columns (solves single-column problem)
- Ultra-slow movement means it drifts predictably
- Players can anticipate its path and mine around it
- Visually imposing magenta pickaxe adds atmosphere
- Low encounter rate (0.65/s) ensures fair competition

## Migration
- **Server restart required** (Chunk.js block pool cache)
- No code changes — constants only
