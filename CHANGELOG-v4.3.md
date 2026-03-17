# PIKIT v4.3 Changelog — Balance Overhaul

## Release Date: 2026-03-18

---

### 1. Player Pickaxe Limit

- **Max 3 pickaxes per player per field** (TNT unlimited)
- Server enforces limit in `GameEngine.buyPickaxe()` before price check
- Error message: "Max 3 pickaxes per field! Wait for one to expire."
- Shop UI shows active pickaxe counter (X/3), turns red at limit
- With 80 max players × 3 pickaxes = 240 max player pickaxes per field

### 2. Pickaxe Rebalance

| Pickaxe | Old Price | New Price | Old DMG | New DMG | Old Lifetime | New Lifetime |
|---------|-----------|-----------|---------|---------|-------------|-------------|
| Basic | 1,000 | 2,500 | 4 | 3 | 30s | 30s |
| Power | 5,000 | 5,000 | 8 | 6 | 40s | 35s |
| Light | 5,000 | 4,000 | 7 | 5 | 35s | 30s |
| Swift | 5,000 | 3,500 | 5 | 3 | 30s | 25s |
| System | 0 | 0 | 15 | 8 | inf | inf |

- All user pickaxes: damage reduced, prices diversified
- System pickaxe: damage reduced from 15→8 (still competes but doesn't dominate)

### 3. Block Rebalance

**Block HP (all increased significantly):**

| Block | Old HP | New HP |
|-------|--------|--------|
| Jackpot | 50 | 300 |
| Diamond | 40 | 150 |
| Gold | 30 | 80 |
| Emerald | 22 | 50 |
| Iron | 15 | 30 |
| Copper | 8 | 18 |
| Stone | 5 | 10 |
| Dirt | 3 | 6 |
| Gravel | 4 | 8 |
| Clay | 4 | 7 |

**Block Rewards (drastically reduced):**

| Block | Old Reward | New Reward | Reduction |
|-------|-----------|-----------|-----------|
| Jackpot | 1,000,000 | 250,000 | -75% |
| Diamond | 100,000 | 5,000 | -95% |
| Gold | 30,000 | 2,000 | -93% |
| Emerald | 8,000 | 600 | -93% |
| Iron | 2,000 | 150 | -93% |
| Copper | 300 | 50 | -83% |
| Stone-Clay | 1~5 | 1~3 | -40% |

**Spawn Weights (rebalanced, total = 100):**

| Block | Old Weight | New Weight |
|-------|-----------|-----------|
| Copper | 40% | 20% |
| Stone | 12% | 20% |
| Dirt | 10% | 18% |
| Iron | 15% | 12% |
| Gravel | 6% | 12% |
| Clay | 5% | 10% |
| Emerald | 8% | 5% |
| Gold | 3% | 2% |
| Diamond | 1% | 1% |

More common blocks (stone/dirt/gravel) fill the field; fewer copper/iron spawns reduce free credits.

### 4. Jackpot Conditions

- **Min 10 players** must be in the field for jackpot to be eligible
- Credits spent threshold: 2M → 1.5M (slightly easier to trigger with more players)
- Spawn chance per eligible block: 0.1% → 0.05% (half as likely per position)
- Jackpot reward: 1M → 250K credits
- Expected frequency: ~1 per 15-25 min with 20+ active players

### 5. Combo System

| Stage | Old Multiplier | New Multiplier |
|-------|---------------|---------------|
| 0 | 1.0x | 1.0x |
| 1 (3 hits) | 1.2x | 1.05x |
| 2 (6 hits) | 1.5x | 1.1x |
| 3 (10 hits) | 2.0x | 1.2x |
| 4 (15 hits) | 3.0x | 1.35x |
| 5 (25 hits) | 5.0x | 1.5x |

Max combo bonus reduced from 5x to 1.5x. Old combo system allowed massive reward inflation.

### 6. TNT Rebalance

- Price: 10,000 → 15,000 (+50%)
- Damage: 30 → 25 (-17%)
- TNT is now a strategic tool, not a profit mechanism
- TNT-resistant blocks (jackpot, diamond, gold) still take only 40% damage

### 7. High-Value Notification Threshold

- Rare block destruction notification: reward threshold lowered from 5,000 to 1,000
- Ensures gold blocks (2,000 reward) still trigger cinematic effects

### 8. Files Changed

| File | Change |
|------|--------|
| `server/game/constants.js` | Complete balance rewrite (pickaxes, blocks, jackpot, combo, TNT) |
| `server/game/GameEngine.js` | Max 3 pickaxe limit, notification threshold adjustment |
| `server/game/Chunk.js` | Min player count check for jackpot spawn |
| `public/js/ui.js` | Active pickaxe counter in shop (X/3) |
| `BALANCE-NOTES.md` | Mathematical analysis of all balance changes |
| `CHANGELOG-v4.3.md` | This file |
| `CHECKLIST-v4.3-balance.md` | Progress tracking |
