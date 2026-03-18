# PIKIT v4.7 Rebalance Analysis

## 1. Per-Pickaxe Earning Simulation (Basic Pickaxe)

### Parameters
- DMG: 3, Lifetime: 30s, Scale: 0.8 (96px hitbox), Cost: 2,100 credits
- Tick rate: 60fps, Gravity: 400 px/s^2, Terminal velocity: 450 px/s
- Field: 8 blocks wide (960px mineable), blocks 120px each

### How Collisions Work
- Each tick, pickaxe checks collision via 14 shape points against blocks in current +/- 1 chunk
- On collision: damage applied, pickaxe bounces off (only ONE block per tick)
- After bounce, pickaxe must travel away and come back before hitting another block
- Bounce restitution 0.75, minimum bounce speed 150 px/s upward
- Typical bounce cycle: ~0.5-1.0s between hits (fall -> hit -> bounce up -> fall again)

### Hits-to-Destroy by Block Type (DMG 3)

| Block Type    | HP  | Hits to Kill | Weight | Reward       | Credits/Block |
|---------------|-----|-------------|--------|-------------|---------------|
| Dirt          | 7   | 3           | 18%    | 1-5 random  | ~3 avg        |
| Clay          | 8   | 3           | 10%    | 1-5 random  | ~3 avg        |
| Gravel        | 9   | 3           | 12%    | 1-5 random  | ~3 avg        |
| Stone         | 10  | 4           | 20%    | 1-5 random  | ~3 avg        |
| Copper        | 20  | 7           | 20%    | 50 fixed    | 50            |
| Iron          | 32  | 11          | 12%    | 150 fixed   | 150           |
| Emerald       | 55  | 19          | 5%     | 600 fixed   | 600           |
| Gold          | 90  | 30          | 2%     | 2,000 fixed | 2,000         |
| Diamond       | 180 | 60          | 1%     | 5,000 fixed | 5,000         |

### BUG FOUND: Block.js getReward() Mismatch
`Block.js` line 36: `Math.floor(Math.random() * 5) + 1` returns 1-5, but constants.js comments say "gives 1~3" and `reward: 3` suggests max should be 3. The actual average random reward is **3.0** (range 1-5), not 2.0 (range 1-3). This means common blocks pay slightly more than documented. All analysis below uses the ACTUAL code behavior (1-5, avg 3.0).

### Estimated Block Encounters in 30s

The pickaxe falls at ~300-450 px/s average, bounces off blocks, and covers roughly 1 block height per bounce cycle. Realistic estimates:

- **Bounce cycle time**: ~0.6-1.0s average (fall 120px at ~300px/s = 0.4s, bounce up + fall back ~0.4-0.6s)
- **Hits per lifetime**: ~35-50 total collision events in 30s
- **But most hits don't destroy**: common blocks take 3-4 hits, so the pickaxe often hits the SAME block multiple times before it breaks

Given that the pickaxe bounces and often returns to the same block:
- Dirt (3 hits): ~0.6s x 3 = 1.8s per block
- Stone (4 hits): ~0.6s x 4 = 2.4s per block
- Copper (7 hits): ~0.6s x 7 = 4.2s per block

But the pickaxe doesn't always return to the same block -- it bounces sideways, hits walls, encounters other blocks. Realistically:
- Effective block kills in 30s: **8-15 blocks** (mostly common)
- Many hits are "wasted" on blocks that don't break (pickaxe moves on after 1-2 hits)

### Realistic Earning Breakdown (Basic Pickaxe, 30s)

Typical session (solo, no competition):
- ~5 common blocks destroyed (dirt/stone/gravel/clay): 5 x 3 = **15 credits**
- ~2 copper blocks destroyed: 2 x 50 = **100 credits**
- ~0.5 iron blocks destroyed: 0.5 x 150 = **75 credits**
- ~0.1 emerald blocks: 0.1 x 600 = **60 credits**
- Rare blocks (gold/diamond): ~0 in typical run

**Typical total: ~250-500 credits per basic pickaxe** (before combo)
**Best case (lucky emerald): ~600-800 credits**
**With combo (max 1.5x at 25 hits): ~375-750 credits**

### ROI Analysis
- Cost: 2,100 credits
- Typical return: 250-500 credits = **12-24% ROI**
- The v4.6 simulation claims 50-53% ROI -- this likely factors in rare block variance over many runs and multi-player block-sharing effects

Wait -- the simulated 50% ROI means the AVERAGE includes occasional gold/diamond hits that pull up the mean significantly. This is the core problem: the median return is far below the mean.


## 2. Current Reward Distribution Problem

### The Variance Trap
Current reward structure is extremely top-heavy:

| Block       | Weight | Credits | Weighted Contribution |
|-------------|--------|---------|----------------------|
| Common (4)  | 60%    | ~3 avg  | 1.8 per block        |
| Copper      | 20%    | 50      | 10.0 per block       |
| Iron        | 12%    | 150     | 18.0 per block       |
| Emerald     | 5%     | 600     | 30.0 per block       |
| Gold        | 2%     | 2,000   | 40.0 per block       |
| Diamond     | 1%     | 5,000   | 50.0 per block       |

**Weighted average reward per block: ~149.8 credits** (matches the comment in constants.js)

But this average is misleading. In any given run:
- 60% of blocks you encounter pay ~3 credits
- 20% pay 50 credits
- Only 8% (emerald+gold+diamond) provide the bulk of value

### The Feel Problem
A player buys a basic pickaxe for 2,100 credits. In a typical 30s run:
- They see the pickaxe bouncing around hitting dirt and stone
- Each dirt block takes 3 hits and pays 2-3 credits
- After 30 seconds, they earned maybe 200-400 credits
- **They lost 1,700-1,900 credits in one run**
- This happens 80-90% of the time
- Occasionally (10-20% of runs), they hit an emerald or gold and earn 800-2000+ credits
- Very rarely (<2% of runs), they hit gold/diamond for a big win

The player experience: "I keep losing almost everything. This isn't fun."

### Common Block Economics are Broken
- Dirt: HP 7, DMG 3, 3 hits to kill, reward ~3 credits
- **Effort-to-reward ratio**: 3 hits (1.8s of pickaxe time) for 3 credits
- That's 1.67 credits per hit, or ~100 credits per 30s if ONLY hitting common blocks
- Common blocks are 60% of the field but contribute <5% of total earnings

### The 10,000 Credit Test
Spending 10,000 credits (buying ~4-5 basic pickaxes):
- Median outcome: 1,000-2,000 credits back (10-20% return)
- Mean outcome: ~4,500-5,000 credits back (45-50% return -- pulled up by rare events)
- The gap between median and mean = frustration


## 3. Design Goals for v4.7

### Target Metrics
1. **Minimum floor**: Spending 10,000 credits should return AT LEAST 2,000-3,000 credits (20-30% floor) in 90%+ of sessions
2. **Occasional big wins**: 15,000-30,000 credit payouts should still exist
3. **House edge**: 53-55% at 5-10 players (unchanged)
4. **Average return**: ~45% (unchanged from current design intent)
5. **Variance**: Reduced for common play; the 10th-90th percentile band should narrow

### The Lever: Raise the Floor Without Raising the Ceiling
- Increase common block rewards significantly
- Decrease common block HP so they break faster
- Slightly reduce rare block rewards to compensate
- Net effect: more consistent base income, same average


## 4. Proposed v4.7 Changes

### 4A. Common Block Changes (the big lever)

**Current -> Proposed:**

| Block   | HP Now | HP New | Reward Now | Reward New    | Hits@DMG3 Now | Hits@DMG3 New |
|---------|--------|--------|------------|---------------|---------------|---------------|
| Dirt    | 7      | 4      | 1-5 rand   | 8 fixed       | 3             | 2             |
| Clay    | 8      | 5      | 1-5 rand   | 10 fixed      | 3             | 2             |
| Gravel  | 9      | 5      | 1-5 rand   | 10 fixed      | 3             | 2             |
| Stone   | 10     | 6      | 1-5 rand   | 12 fixed      | 4             | 2             |

**Rationale:**
- HP reduced to 4-6: basic pickaxe (DMG 3) kills ALL common blocks in 2 hits instead of 3-4
- This means ~50% more common blocks destroyed per lifetime
- Reward changed from random 1-5 to fixed 8-12: predictable, meaningful, no frustrating 1-credit drops
- "Random" reward type should be removed entirely for commons -- randomness on tiny rewards just feels bad

**Impact on blocks destroyed per basic pickaxe lifetime:**
- Old: ~8-12 common blocks in 30s (3-4 hits each)
- New: ~15-20 common blocks in 30s (2 hits each)
- Common block income: old ~24-36 credits, new ~150-240 credits

### 4B. Copper Block Changes

| Block   | HP Now | HP New | Reward Now | Reward New |
|---------|--------|--------|------------|------------|
| Copper  | 20     | 14     | 50         | 40         |

**Rationale:**
- HP reduced slightly so DMG 3 kills in 5 hits (from 7) -- more satisfying
- Reward reduced from 50 to 40 to offset increased common block payouts
- Still feels like a meaningful upgrade over commons (4x reward)

### 4C. Iron Block Changes

| Block   | HP Now | HP New | Reward Now | Reward New |
|---------|--------|--------|------------|------------|
| Iron    | 32     | 25     | 150        | 120        |

**Rationale:**
- HP reduced slightly (11 hits -> 9 hits at DMG 3)
- Reward reduced from 150 to 120
- Still a strong pickup but slightly dampened to compensate for raised floor

### 4D. Upper Rare Block Changes

| Block    | HP Now | HP New | Reward Now | Reward New |
|----------|--------|--------|------------|------------|
| Emerald  | 55     | 50     | 600        | 500        |
| Gold     | 90     | 85     | 2,000      | 1,800      |
| Diamond  | 180    | 170    | 5,000      | 4,500      |

**Rationale:**
- Minimal HP changes (these are already encounter-rate-limited by weight)
- Rewards reduced ~10-17% to fund the common block floor increase
- Still exciting to find -- 4,500 on diamond is still a huge hit
- Gold at 1,800 still nearly pays for a basic pickaxe in one block

### 4E. Weight Adjustments (Optional)

No weight changes proposed. The current distribution (60% common, 20% copper, 12% iron, 5% emerald, 2% gold, 1% diamond) is fine. The problem is reward-per-encounter, not encounter rate.

### 4F. Price Adjustments

No price changes proposed. Current prices are well-calibrated for the house edge target. Changing both prices AND rewards simultaneously makes it hard to verify house edge.

### 4G. Combo System -- No Changes

Current combo (max 1.5x at 25 hits) is fine. With faster common block kills, players will reach combo thresholds more consistently, which naturally boosts floor returns by ~10-20%.

### 4H. Block.js Bug Fix

`Block.js` line 36: `Math.floor(Math.random() * 5) + 1` should be changed to match whatever the v4.7 design uses. If commons become fixed reward, this code path may become unused (only if ALL random-type blocks are converted to fixed).

Recommendation: Convert all common blocks to `rewardType: 'fixed'` in v4.7. Random rewards on low-value blocks create frustration without excitement.


## 5. Impact Projection

### New Weighted Average Reward per Block

| Block       | Weight | New Reward | Weighted   |
|-------------|--------|-----------|------------|
| Dirt        | 18%    | 8         | 1.44       |
| Stone       | 20%    | 12        | 2.40       |
| Gravel      | 12%    | 10        | 1.20       |
| Clay        | 10%    | 10        | 1.00       |
| Copper      | 20%    | 40        | 8.00       |
| Iron        | 12%    | 120       | 14.40      |
| Emerald     | 5%     | 500       | 25.00      |
| Gold        | 2%     | 1,800     | 36.00      |
| Diamond     | 1%     | 4,500     | 45.00      |
| **Total**   | 100%   |           | **134.44** |

**Old weighted average: ~149.8 credits/block**
**New weighted average: ~134.4 credits/block** (10.3% reduction)

BUT: common blocks now break ~50% faster (2 hits vs 3-4), so blocks-destroyed-per-lifetime increases significantly. The net effect:

### Basic Pickaxe Expected Return (New)

Old: ~10-12 effective block kills/lifetime x 149.8 avg = ~1,500-1,800 credits (before competition)
New: ~15-20 effective block kills/lifetime x 134.4 avg = ~2,000-2,700 credits (before competition)

More importantly, the FLOOR changes:
- Old floor (all-common run): ~10 blocks x 3 credits = 30 credits (1.4% ROI)
- New floor (all-common run): ~18 blocks x 10 credits = 180 credits (8.6% ROI)
- New realistic floor (commons + a few copper): ~14 common x 10 + 3 copper x 40 = 260 credits (12.4% ROI)

### 10,000 Credit Session (New)

Buying ~4-5 basic pickaxes:
- **Worst 10% outcome**: ~2,000-2,500 credits (20-25% return) -- MEETS THE FLOOR TARGET
- **Median outcome**: ~3,500-4,500 credits (35-45% return)
- **Mean outcome**: ~4,500 credits (45% return)
- **Best 10% outcome**: ~7,000-15,000 credits (includes rare block hits)
- **Jackpot scenario**: 15,000-30,000 credits (gold/diamond hit)

### House Edge Verification

The house edge depends on (avg return per credit spent). With competition from other players and the system pickaxe:

- Solo per-pickaxe ROI: ~50-55% (slightly higher than old due to faster common kills)
- With 5 players competing: blocks get stolen, effective ROI drops to ~43-47%
- With system pickaxe stealing ~2-3%: effective ROI ~41-45%
- **Projected house edge at 5 players: ~55-57%**

This is slightly HIGH. Two options to bring it back to 53-55%:
1. Increase common rewards by 1-2 more (e.g., dirt 9, stone 13, gravel 11, clay 11)
2. Reduce copper/iron HP by 1-2 more to increase kill rate

**Recommendation**: Run the Monte Carlo simulation (`balance-v46-sim.js` pattern) with these new numbers before committing. Fine-tune common rewards +/- 2 credits to hit exact 54% house edge at 5 players.


## 6. Summary of All Proposed Number Changes

```
COMMON BLOCKS (raise floor):
  dirt:    HP  7 -> 4,   reward 1-5 random -> 8 fixed
  clay:    HP  8 -> 5,   reward 1-5 random -> 10 fixed
  gravel:  HP  9 -> 5,   reward 1-5 random -> 10 fixed
  stone:   HP 10 -> 6,   reward 1-5 random -> 12 fixed

MID-TIER (slight nerf to fund floor):
  copper:  HP 20 -> 14,  reward 50 -> 40
  iron:    HP 32 -> 25,  reward 150 -> 120

RARE (small nerf to fund floor):
  emerald: HP 55 -> 50,  reward 600 -> 500
  gold:    HP 90 -> 85,  reward 2,000 -> 1,800
  diamond: HP 180 -> 170, reward 5,000 -> 4,500

PRICES: No changes
WEIGHTS: No changes
COMBO: No changes
JACKPOT: No changes

BUG FIX: Block.js getReward() returns 1-5 but comments say 1-3
  -> Convert all common blocks to rewardType: 'fixed', making this moot
```

## 7. Risks and Open Questions

1. **Power pickaxe (DMG 5) kills dirt in 1 hit**: With dirt HP 4 and DMG 5, power pickaxe one-shots dirt. This might make power pickaxe too efficient at farming commons. Monitor in simulation.

2. **Swift pickaxe benefits most**: Swift's 1.6x speed means more block encounters. Combined with faster common kills, swift might become dominant. May need swift-specific tuning later.

3. **System pickaxe impact**: System pickaxe (DMG 5) will also kill common blocks much faster, slightly increasing house take. Factor this into simulation.

4. **TNT value**: TNT at 8,000 credits with these lower-HP blocks becomes slightly more valuable (kills more blocks in blast radius). TNT ROI might increase from ~3% to ~5-8%. Acceptable.

5. **Combo interaction**: Faster common kills = faster combo buildup = slightly higher combo multipliers on average. This amplifies the floor raise by an estimated 10-15%.
