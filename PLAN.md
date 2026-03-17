# PIKIT - Falling Pickaxe Multiplayer Betting Game

## Overview
A real-time multiplayer web game based on a Minecraft-style infinite falling mine.
**The mine runs 24/7 with idle system pickaxes** constantly falling and breaking blocks.
Players **watch the live feed**, observe timing and block patterns, then **buy their own pickaxe** at the right moment to maximize rewards.

## Core Concept (Watch → Bet → Earn)
1. **ALWAYS RUNNING**: System pickaxes (labeled "PIKIT") continuously fall and break blocks. The game never stops.
2. **WATCH**: Users see the live mine — blocks being destroyed, ores appearing, depth progressing.
3. **BET**: When a user spots a good opportunity (rare ore cluster, good timing), they buy a pickaxe.
4. **EARN**: The user's pickaxe falls for 30 seconds, destroying blocks and earning rewards for each block broken.

> **Key difference from v1**: The game is always alive. Users are spectators by default, buyers by choice.

## Revenue Model
- **House Edge**: 25% on all purchases (average return rate: 75%)
- **Jackpot System**: Diamond/Emerald/Obsidian blocks are rare but high-reward → gambling excitement
- **Combo System**: Consecutive hits increase reward multiplier → encourages re-purchase
- **FOMO**: Watching system pickaxes hit rare ores makes users want to participate

## Item Price Table (v3)

| Item | Price | Damage | Duration | Special |
|------|-------|--------|----------|---------|
| Basic Pickaxe | 1,000 | 4 | 30s | Standard |
| Power Pickaxe | 5,000 | 8 | 40s | Bigger, longer, stronger |
| Light Pickaxe | 5,000 | 7 | 35s | 0.5x gravity, compact |
| Swift Pickaxe | 5,000 | 5 | 30s | 1.8x speed, more hits |
| TNT | 10,000 | 30 | On contact | ±4 blocks + 3 down |

## Block Reward Table (v3)

| Block | Type | Spawn % | Reward | HP |
|-------|------|---------|--------|-----|
| Jackpot Block | credit | 0.1% (conditional) | 1,000,000 | 50 |
| Diamond Block | credit | 1% | 100,000 | 40 |
| Gold Block | credit | 3% | 30,000 | 30 |
| Emerald Block | credit | 8% | 8,000 | 22 |
| Iron Block | credit | 15% | 2,000 | 15 |
| Copper Block | credit | 40% | 300 | 8 |
| Stone | random | 12% | 1~5 | 5 |
| Dirt | random | 10% | 1~5 | 3 |
| Gravel | random | 6% | 1~5 | 4 |
| Clay | random | 5% | 1~5 | 4 |

## Addictive Mechanics
1. **Always-On Live Feed**: Mine is always running, always something to watch
2. **Spectator Mode**: Watch system pickaxes hit blocks → "I could have earned that!"
3. **Timing Strategy**: Users try to buy when they see rare ore clusters appearing
4. **Combo System**: x1.2 → x1.5 → x2.0 → x3.0 → x5.0 multiplier
5. **Jackpot Alerts**: Global notification when someone hits a rare block
6. **Leaderboard**: Real-time profit ranking → competition
7. **Visual Feedback**: Explosions, camera shake, particles

---

## Tech Stack
- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: HTML5 Canvas + Vanilla JS
- **Communication**: WebSocket (20fps state broadcast, 60fps server tick)
- **State**: In-memory (MVP phase)
- **Language**: All UI in **English**

---

## Checklist

### Phase 1: Project Setup
- [x] Node.js project init (package.json, dependencies)
- [x] Express + Socket.IO server structure
- [x] Static file serving

### Phase 2: Game Engine (Server)
- [x] Block class (types, HP, rewards, destruction)
- [x] Chunk generation (weighted random block placement)
- [x] Pickaxe class (falling physics, collision, damage)
- [x] TNT/MegaTNT class (explosion radius, timer)
- [x] Game loop (60fps server tick, state update)
- [x] Collision detection (pickaxe-block)
- [x] Always-on system pickaxes (idle game progression)

### Phase 3: Multiplayer System
- [x] Player session management (join/leave)
- [x] Item purchase API (pickaxe, TNT)
- [x] Per-player balance/reward system
- [x] Real-time state broadcast

### Phase 4: Frontend Rendering
- [x] Canvas setup (9:16 ratio)
- [x] Block rendering (textures, destroy stages)
- [x] Pickaxe rendering (with owner name labels)
- [x] TNT/explosion effects
- [x] Camera system (tracking + shake)
- [x] HUD (balance, rewards, depth)

### Phase 5: UI/UX
- [x] Login/nickname input
- [x] Item shop panel (sidebar)
- [x] Real-time leaderboard
- [x] Jackpot alert system
- [ ] Earning history UI
- [x] Responsive layout
- [x] All text in English
- [x] Real-time chat system (Socket.IO)
- [x] Player join/leave notifications
- [x] Chat rate limiting (1 msg/sec, max 200 chars)

### Phase 6: Balance & Polish
- [x] Block reward balance tuning
- [x] Combo system
- [ ] Sound effects
- [ ] Performance optimization (state compression, delta updates)

### Phase 7: v3 Visual & UX Overhaul
- [x] 8-bit retro pixel art blocks (procedural Canvas rendering)
- [x] 8-bit retro pixel art pickaxes (16x16 grid, code-drawn)
- [x] 8-bit retro TNT & explosions (square particles, pixel debris)
- [x] Retro HUD with monospace font
- [x] Pickaxe-shaped collision hitbox (rotated sample points)
- [x] Remove system pickaxe from shop (server-side filter)
- [x] Detailed pickaxe descriptions (DMG, duration, traits)
- [x] My Info popup (profile, balance, PNL, logout)
- [x] Shop auto-close after purchase
- [x] Floating transparent chat (always visible, click to type)
- [x] Block guide with actual 8-bit block icons, sorted by reward
- [x] User pickaxes smaller (scale 0.65~1.0)
- [x] System pickaxe large (scale 2.0) with premium design + particle trail + glow
- [ ] Earning history UI
- [ ] Sound effects (8-bit chiptune style)

---

## Changelog

### v3 (Current)
- **8-bit Retro Pixel Art Style**: All blocks and pickaxes are now drawn procedurally using Canvas 2D
  - Blocks: pixelated textures with 3D bevel borders, ore clusters with glow, stone cracks
  - Pickaxes: 16x16 pixel grid shapes drawn in code (no image dependencies)
  - TNT: pixel-style with red body, white band, "TNT" text
  - Explosions: square-shaped expanding layers instead of circles
  - HUD: monospace "Courier New" font for retro feel
  - Particles: square pixels instead of round, no rotation
  - Starfield background with parallax
- **Pickaxe-shaped Hitbox**: Collision uses rotated sample points matching actual pickaxe shape (head + handle), not AABB rectangle
  - 14 sample points define the pickaxe silhouette
  - Points are rotated by pickaxe.rotation before checking block intersection
- **System Pickaxe Hidden from Shop**: "PIKIT System" pickaxe is filtered out when sending config to client. Server blocks purchase attempts.
- **Detailed Pickaxe Descriptions**: Each pickaxe now shows DMG, duration, gravity/speed modifiers, and playstyle description
- **My Info Popup**: Compact profile panel in top-right HUD
  - Shows: nickname, balance, total earned, total spent, PNL
  - Actions: +10,000 credits, logout
- **Shop Auto-Close**: Shop panel closes after purchasing an item so user can watch the action
- **Floating Chat**: Chat messages are always visible with transparent background
  - Chat button opens the input field for typing
  - Messages fade-in at top with CSS mask gradient
  - Bottom nav simplified to Shop + Rank only
- **Block Guide Upgrade**: Uses actual 8-bit rendered block icons, sorted by reward value
- **Pickaxe Size Rebalance**:
  - User pickaxes: smaller (basic 0.8, light 0.65, swift 0.75, power 1.0)
  - System "PIKIT" pickaxe: large (2.0) with premium netherite design
  - System pickaxe has glowing magenta aura, particle trail, rainbow name label
  - Actions: +10,000 credits, logout
  - Toggles on profile button click

### v2
- **Concept Change**: Game always runs with system pickaxes. Users watch and buy at the right timing.
- **Language**: All UI converted to English
- **System Pickaxes**: 2-3 always active, auto-respawn every 5 seconds
- **Spectator by default**: Users see the live mine immediately on join (before buying)

### v1 (Initial MVP)
- Basic multiplayer betting game
- Korean UI
- System pickaxes added as afterthought

---

## File Structure

```
PIKIT/
├── PLAN.md                    ← This document
├── package.json
├── server/
│   ├── index.js               ← Express + Socket.IO server entry
│   ├── game/
│   │   ├── GameEngine.js      ← Main game loop & state management
│   │   ├── Block.js           ← Block class
│   │   ├── Chunk.js           ← Chunk generation & management
│   │   ├── Pickaxe.js         ← Pickaxe physics & collision
│   │   ├── TNT.js             ← TNT explosion logic
│   │   ├── Player.js          ← Player state
│   │   └── constants.js       ← Game constants (ALL balance values)
├── public/
│   ├── index.html             ← Main page
│   ├── css/
│   │   └── style.css          ← Styles
│   ├── js/
│   │   ├── main.js            ← Client entry point
│   │   ├── renderer.js        ← Canvas rendering engine
│   │   ├── camera.js          ← Camera system
│   │   ├── hud.js             ← HUD rendering
│   │   ├── ui.js              ← UI panel management
│   │   └── socket.js          ← WebSocket communication
│   └── assets/                ← Textures, sounds
└── _reference_repo/           ← Original reference
```

## Modification Guide

| What to change | File |
|----------------|------|
| Block rewards / spawn rates | `server/game/constants.js` |
| Item prices | `server/game/constants.js` |
| Pickaxe damage / speed | `server/game/constants.js` |
| Physics (fall speed, gravity) | `server/game/constants.js` + `Pickaxe.js` |
| Chunk generation patterns | `server/game/Chunk.js` |
| TNT explosion radius | `server/game/TNT.js` |
| Combo multipliers | `server/game/constants.js` |
| UI layout | `public/css/style.css` |
| HUD display items | `public/js/hud.js` |
| Shop panel | `public/js/ui.js` |
| Visual effects | `public/js/renderer.js` |
| Server tick rate | `server/game/constants.js` (`GAME.TICK_RATE`) |
| System pickaxe behavior | `server/game/GameEngine.js` (`_spawnSystemPickaxe`) |
| Number of idle pickaxes | `server/game/GameEngine.js` (`SYSTEM_PICKAXE_COUNT`) |
