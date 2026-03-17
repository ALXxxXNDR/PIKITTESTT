# PIKIT v4.3 Balance Overhaul Checklist

## Target Conditions
- Concurrent players: 3~80
- Max pickaxes per player per field: 3
- TNT: unlimited
- House win rate: 55%
- Jackpot: min 10 players + 1.5M credits spent since last

## 1. Player Pickaxe Limit
- [x] GameEngine.buyPickaxe(): Check player active pickaxe count (max 3)
- [x] Server error message when limit reached
- [x] Client UI feedback when limit reached (active counter X/3 in shop)

## 2. Pickaxe Rebalance
- [x] Basic: price 1000→2500, damage 4→3
- [x] Power: damage 8→6, lifetime 40s→35s
- [x] Light: price 5000→4000, damage 7→5, lifetime 35s→30s
- [x] Swift: price 5000→3500, damage 5→3, lifetime 30s→25s
- [x] System: damage 15→8 (house needs edge but not domination)

## 3. Block Rebalance
- [x] Common blocks (stone/dirt/gravel/clay): HP ↑, rewards 1~3 (from 1~5)
- [x] Copper: HP 8→18, reward 300→50
- [x] Iron: HP 15→30, reward 2000→150
- [x] Emerald: HP 22→50, reward 8000→600
- [x] Gold: HP 30→80, reward 30000→2000
- [x] Diamond: HP 40→150, reward 100000→5000
- [x] Jackpot: HP 50→300, reward 1000000→250000
- [x] Spawn weights rebalanced (total = 100)

## 4. Jackpot Conditions
- [x] Min 10 players in field (JACKPOT_CONFIG.MIN_PLAYERS)
- [x] 1.5M credits spent since last jackpot (SPAWN_THRESHOLD)
- [x] Reduced spawn chance (0.1% → 0.05%)
- [x] Update JACKPOT_CONFIG (all fields updated)

## 5. Combo System
- [x] Reduce combo multipliers (max 5.0x → 1.5x)

## 6. TNT Rebalance
- [x] Price 10000→15000
- [x] Damage 30→25

## 7. Notification Threshold
- [x] High-value block notification: 5000→1000 (matches new reward scale)

## 8. Documentation
- [x] BALANCE-NOTES.md (mathematical analysis)
- [x] CHANGELOG-v4.3.md
