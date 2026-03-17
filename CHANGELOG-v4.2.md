# PIKIT v4.2 Changelog

## Release Date: 2026-03-18

---

### 1. Spawn Alert Refinement

**Before:** Diamond, Gold, Emerald blocks all triggered spawn alerts (too frequent, noisy)
**After:** Only **Jackpot** and **Diamond** blocks trigger spawn alerts

- `RARE_ALERT_TYPES` in `Chunk.js` → `['diamond_block', 'jackpot']`
- Jackpot blocks now also trigger `_onRareBlockSpawned()` (previously only had their own event)
- New `#spawn-alert-overlay` div — positioned at **absolute top center** (`position: fixed; top: 0; z-index: 300`)
- Separated from `#jackpot-overlay` to prevent overlap with other notifications
- Auto-disappears after **4 seconds** (was 5s) with slide-up fade-out animation
- Larger, more prominent styling (15px text, 18px emoji, 8px border-radius)

### 2. On-Chain Quest System (Live on Sepolia)

**PikitQuest Contract:** `0x226E2df68C41f61C781E5e2E426BEB0b0a56beD6`
- 10 quests tracked on-chain
- `completeQuest(uint256)` → records completion with timestamp
- `getCompletedQuests(address)` → returns bool[10] of completion status
- Server verifies transactions on-chain before crediting

### 3. Credit Deposit/Withdraw System (USDC Vault)

**PikitVault Contract:** `0x9f0c3c8d87531Ae343f06223FcaA507E6Efb1Fb9`
**MockUSDC Contract:** `0x683cAB1d43f19E5c553f94Dd32376f0E4d8F9c57`

#### Rates
| Action | Rate | Example |
|--------|------|---------|
| Deposit | 1 USDC = 10,000 Credits | 5 USDC → 50,000 credits |
| Withdraw | 10,500 Credits = 1 USDC | 52,500 credits → 5 USDC |

#### Flow
1. **Deposit:** User approves USDC → calls `vault.deposit(amount)` → server verifies tx → credits added
2. **Withdraw:** User calls `vault.withdraw(creditAmount)` → server verifies tx → credits deducted

#### MyPage UI Overhaul
- **3-tab interface:** Overview / Deposit / Withdraw
- Compact stats bar (Balance + P&L) always visible
- Live preview: shows credit/USDC conversion as you type
- Popup width expanded 240px → 300px

### 4. Smart Contract Deployment Infrastructure

- `contracts/PikitQuest.sol` — Quest tracker
- `contracts/PikitVault.sol` — USDC deposit/withdraw vault
- `contracts/MockUSDC.sol` — Test USDC token (mintable)
- `scripts/deploy.js` — Automated deployment script (ethers v6 + solc)
- Auto-generates `quest-abi.js` and `vault-abi.js` with deployed addresses

### 5. Files Changed

| File | Change |
|------|--------|
| `server/game/Chunk.js` | RARE_ALERT_TYPES reduced to diamond+jackpot |
| `public/index.html` | spawn-alert-overlay, vault-abi.js script, myinfo tabs |
| `public/css/style.css` | spawn-alert styles, myinfo tab styles, deposit/withdraw styles |
| `public/js/ui.js` | spawn alert update, tab switching, deposit/withdraw handlers |
| `public/js/socket.js` | syncDeposit, syncWithdraw methods + listeners |
| `public/js/quest-abi.js` | Updated with deployed address |
| `public/js/vault-abi.js` | **NEW** — Vault ABI + addresses |
| `server/index.js` | syncDeposit, syncWithdraw socket handlers |
| `contracts/PikitVault.sol` | **NEW** — Vault contract |
| `contracts/MockUSDC.sol` | **NEW** — Test USDC |
| `scripts/deploy.js` | **NEW** — Deploy script |
