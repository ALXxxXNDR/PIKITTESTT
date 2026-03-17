# PIKIT v4 Changelog

## v4.0.0 — On-Chain Update

### 1. Block Layout Expansion (7 → 8 mineable blocks)
- **CHUNK_WIDTH** changed from 9 (with bedrock walls) to 8 (mineable only)
- **WALL_THICKNESS: 60px** — thin bedrock walls replace full-block walls
- Layout: `60px wall + 8×120px blocks + 60px wall = 1080px` (same resolution)
- `Block.js`: x-coordinate now offset by `WALL_THICKNESS`
- `Chunk.js`: Bedrock block generation removed; walls are now visual-only
- `renderer.js`: New `_renderWalls()` method draws 8-bit textured thin walls
- `Pickaxe.js`, `TNT.js`, `GameEngine.js`: All wall boundaries updated to use `WALL_THICKNESS`

### 2. Web3 Wallet Login (RainbowKit + Sepolia)
- **Dependencies**: react, react-dom, @rainbow-me/rainbowkit, wagmi, viem, @tanstack/react-query, ethers
- **Vite bundler**: `wallet-src/WalletProvider.jsx` → `public/js/wallet-bundle.js` (IIFE bundle, ~6MB)
- **RainbowKit config**: Sepolia chain, compact modal, auto-detected locale (Korean/English)
- **window.WalletAPI** global bridge:
  - `connect()` — opens RainbowKit modal
  - `disconnect()` — disconnects wallet
  - `getAddress()` / `getShortAddress()` — returns full/shortened address
  - `signMessage(msg)` — signs message for auth
  - `isConnected()` — connection status
- **Login flow**:
  - Connect Wallet button on login screen
  - Sign message → server verifies with `ethers.verifyMessage()`
  - Nickname = shortened wallet address (0x1234...abcd)
  - Wallet disconnect = game logout (socket disconnect + reconnect)
- **Wallet guard**: Shop, MyPage, Quest panels auto-trigger wallet connect if not logged in
- **Server**: `joinWithWallet` socket event with signature verification
- **Player.walletAddress**: stored for quest transaction verification

### 3. Quest System (On-Chain Completion)

#### Smart Contract
- `contracts/PikitQuest.sol` — Solidity ^0.8.19
- `completeQuest(uint256 questId)` — records completion on-chain
- `questCompleted` mapping: `address → questId → bool`
- `QuestCompleted` event emitted on completion
- ABI in `public/js/quest-abi.js`
- **Deployment**: Update `CONTRACT_ADDRESS` in quest-abi.js after deploying to Sepolia

#### Server Tracking
- `Player.questProgress`: tracks blocksDestroyed (total + by type), pickaxesPurchased (total + by type), tntPurchased, loginDays
- `Player.completedQuests`: Set of completed quest IDs
- `Player.getQuestStatus()`: returns all 10 quests with current/target/completed
- `GameEngine.js`: calls `player.trackBlockDestroyed(type)`, `trackPickaxePurchase(type)`, `trackTNTPurchase()` on relevant events
- Socket events: `getQuests` → `questStatus`, `verifyQuestCompletion` → `questVerified`
- Server verifies tx receipt on Sepolia RPC + checks sender matches player wallet

#### Quest UI
- **Quest button** added to bottom bar (Shop / Quest / Rank)
- **Quest panel** (slide-out from right) with card-based quest list
- Progress bars with percentage, "Complete On-Chain" button when target met
- Completed quests: ✅ checkmark + reduced opacity
- On-chain flow: `eth_sendTransaction` → `completeQuest(questId)` → server verification

#### 10 Quests
| # | Name | Target |
|---|------|--------|
| 1 | First Steps | Destroy 10 blocks |
| 2 | Block Breaker | Destroy 100 blocks |
| 3 | Copper Hunter | Destroy 20 Copper blocks |
| 4 | Gold Rush | Destroy 5 Gold blocks |
| 5 | Diamond Hands | Destroy 1 Diamond block |
| 6 | Shopping Spree | Buy 10 pickaxes |
| 7 | Power User | Buy 5 Power Pickaxes |
| 8 | Explosive Expert | Buy 3 TNTs |
| 9 | Daily Check-in | Log in for 1 day |
| 10 | High Roller | Earn 50,000 credits total |

### Files Modified
- `server/game/constants.js` — CHUNK_WIDTH, WALL_THICKNESS
- `server/game/Block.js` — x-coordinate offset
- `server/game/Chunk.js` — removed bedrock generation
- `server/game/Pickaxe.js` — wall boundaries
- `server/game/TNT.js` — wall boundaries
- `server/game/GameEngine.js` — TNT spawn, quest tracking calls
- `server/game/Player.js` — questProgress, tracking methods, getQuestStatus
- `server/index.js` — joinWithWallet, getQuests, verifyQuestCompletion
- `public/index.html` — wallet mount, quest panel, script tags
- `public/js/renderer.js` — _renderWalls()
- `public/js/socket.js` — joinWithWallet, getQuests, verifyQuestCompletion
- `public/js/ui.js` — quest UI, wallet guard, logout disconnect
- `public/js/main.js` — wallet login flow, quest event handlers
- `public/js/hud.js` — unchanged (W=1080 still valid)
- `public/css/style.css` — quest CSS styles

### Files Added
- `wallet-src/WalletProvider.jsx` — RainbowKit React component
- `wallet-src/wallet-entry.js` — wallet bundle entry point
- `vite.config.js` — Vite build config for wallet bundle
- `public/js/wallet-bundle.js` — compiled wallet bundle
- `public/js/pikit.css` — RainbowKit styles
- `public/js/quest-abi.js` — PikitQuest contract ABI
- `contracts/PikitQuest.sol` — quest smart contract

### Remaining TODOs
1. Deploy PikitQuest.sol to Sepolia → update CONTRACT_ADDRESS
2. Register production domain on cloud.reown.com (WalletConnect)
3. Replace demo WalletConnect projectId for production

---

## v4.1.0 — Dual Field & Quality of Life Update

### 1. System Pickaxe Changes
- **Infinite lifetime**: System pickaxe `lifetime: Infinity` (never expires)
- **Pickaxe.js**: Skip expiry check for Infinity lifetime; serialize as `-1` for JSON safety
- **Count reduced**: `SYSTEM_PICKAXE_TARGET` 3 → 1 (1 system pickaxe per field)

### 2. Daily Check-in (UTC 00:00 Reset)
- `Player.trackLogin()` uses `toISOString()` (always UTC) for date comparison
- `trackLogin()` called automatically on field selection (`selectField` handler)
- Login date resets at UTC 00:00

### 3. Dual Field System (Normal + Hardcore 10x)
#### Architecture
- `GameEngine` constructor: `(io, fieldId, rewardMultiplier)` parameters
- `this.roomName = 'field:${fieldId}'` — Socket.IO room-based isolation
- All `io.emit()` → `io.to(this.roomName).emit()` (4 broadcast points)
- Two instances: `normalEngine(1x)` + `hardcoreEngine(10x)`

#### Server (`server/index.js`)
- `selectField` socket event: handles room join/leave, player transfer
- `joinWithWallet`/`join` store `_pendingPlayer` — player picks field before entering engine
- All game handlers route via `getPlayerEngine(socket)`
- Chat messages scoped to field room
- Player join/leave broadcasts scoped to field

#### Price & Reward Scaling
- `buyPickaxe()`: `effectivePrice = def.price * rewardMultiplier`
- `buyTNT()`: `effectivePrice = def.price * rewardMultiplier`
- Pickaxe collision rewards: `reward * comboMult * rewardMultiplier`
- TNT explosion rewards: `totalReward * rewardMultiplier`

#### Client Flow
- Login → Field Selection Screen → Game Screen
- `onJoined`: shows field-select-screen
- `onFieldSelected`: shows game-screen, sets theme, renders shop with multiplied prices

#### Field Selection UI
- Two cards: Normal (⛏️ 1x) and Hardcore (🔥 10x)
- `#field-select-screen` between login and game screens
- CSS styles with hover effects and hardcore red glow

#### Hardcore Visual Theme
- **Background**: Dark red/crimson gradient (`#1a0505`, `#220808`)
- **Walls**: Lava-red tones (`#3a1515`, `#5a2020`, `#200a0a`)
- **Starfield**: Red-tinted particles + ember effects
- **HUD badge**: `#field-indicator` with pulsing red animation

### 4. Block Hover Tooltip (Mouse)
- `Renderer.screenToCanvas(clientX, clientY)`: CSS mouse position → internal 1080x1920 coords
- `Renderer.updateHoverPosition()`: called from `mousemove` event
- `Renderer._renderHoverTooltip()`: finds block under cursor, draws tooltip with name + reward
- `Block.serialize()`: now includes `name`, `reward`, `rewardType`, `color` fields
- Tooltip: semi-transparent dark background, block-colored name, gold reward text

### 5. Rare Block Spawn Alerts
- `Chunk.js`: `RARE_ALERT_TYPES = Set(['diamond_block', 'gold_block', 'emerald_block'])`
- On block generation, if rare type detected → `gameEngine._onRareBlockSpawned(type, def)`
- `GameEngine._onRareBlockSpawned()`: emits `rareBlockSpawned` to field room
  - Only fires when `this.running === true` (skip initial chunk generation spam)
- Client: `rareBlockSpawned` socket event → `UI.showRareBlockSpawnAlert()`
- Alert UI: colored banner (diamond=cyan, gold=yellow, emerald=green), auto-dismiss 5s
- CSS: `.rare-spawn-alert` with themed borders and text-shadow

### Files Modified
- `server/game/constants.js` — system pickaxe lifetime → Infinity
- `server/game/GameEngine.js` — fieldId/rewardMultiplier params, room-based broadcast, SYSTEM_PICKAXE_TARGET 1, rare spawn alert
- `server/game/Pickaxe.js` — Infinity lifetime handling, safe serialization
- `server/game/Block.js` — serialize() includes name/reward/rewardType/color
- `server/game/Chunk.js` — RARE_ALERT_TYPES detection on block generation
- `server/game/Player.js` — trackLogin() unchanged (already UTC)
- `server/index.js` — dual engine instances, selectField event, field-scoped routing
- `public/index.html` — field selection screen, field indicator HUD element
- `public/js/socket.js` — selectField, fieldSelected, rareBlockSpawned events
- `public/js/main.js` — field selection flow, mousemove hover, rare spawn handler
- `public/js/renderer.js` — fieldTheme, hardcore visuals, hover tooltip rendering
- `public/js/ui.js` — updateFieldIndicator, renderShop multiplier, showRareBlockSpawnAlert
- `public/css/style.css` — field selection, field indicator, rare spawn alert styles

### Remaining TODOs
1. Deploy PikitQuest.sol to Sepolia → update CONTRACT_ADDRESS in quest-abi.js
2. Write deploy.js script (hardhat or ethers.js based)
