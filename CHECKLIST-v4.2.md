# PIKIT v4.2 Checklist

## 1. Spawn Alert Refinement ✅
- [x] RARE_ALERT_TYPES: diamond_block + jackpot only (remove gold, emerald)
- [x] Spawn alert positioned at absolute top (#spawn-alert-overlay, z-index:300)
- [x] Alert auto-disappears after 4s with fade-out animation
- [x] Jackpot block also triggers spawn alert (added to Chunk.js)

## 2. On-Chain Quest Deployment ✅
- [x] Deploy PikitQuest.sol to Sepolia → `0x226E2df68C41f61C781E5e2E426BEB0b0a56beD6`
- [x] Update quest-abi.js with deployed contract address
- [x] Quest completion flow: client tx → server on-chain verification

## 3. Credit Deposit/Withdraw System ✅
- [x] PikitVault.sol (1 USDC = 10,000 credits / 10,500 credits = 1 USDC)
- [x] MockUSDC.sol for testnet
- [x] Deploy all contracts to Sepolia
  - MockUSDC → `0x683cAB1d43f19E5c553f94Dd32376f0E4d8F9c57`
  - PikitVault → `0x9f0c3c8d87531Ae343f06223FcaA507E6Efb1Fb9`
- [x] vault-abi.js with USDC_ADDRESS alias
- [x] vault-abi.js loaded in index.html
- [x] Server: syncDeposit/syncWithdraw handlers with on-chain verification
- [x] MyPage UI: 3-tab interface (Overview / Deposit / Withdraw)
- [x] Frontend: deposit flow (approve → wait receipt → deposit → confirm)
- [x] Frontend: withdraw flow with client-side balance check

## 4. Code Review & Bug Fixes ✅
- [x] **CRITICAL:** Server now actually credits/debits player balance (was missing)
- [x] **CRITICAL:** Transaction replay attack prevention (processedTxHashes Set)
- [x] **CRITICAL:** Deposit approval awaited with receipt polling (was 3s setTimeout)
- [x] **CRITICAL:** Null socket data crash prevention
- [x] **MODERATE:** Chat message double-escaping removed
- [x] **MODERATE:** Deposit/withdraw server errors now surface to user as toasts
- [x] **MODERATE:** Client-side balance check before withdraw
- [x] **MODERATE:** txHash format validation (regex)
- [x] Function selectors verified correct (approve, deposit, withdraw, completeQuest)
- [x] BigInt usage correct for USDC 6 decimals
- [x] All HTML element IDs consistent with JS references
- [x] No XSS vulnerabilities in deposit/withdraw UI

## 5. Documentation ✅
- [x] CHECKLIST-v4.2.md (this file)
- [x] CHANGELOG-v4.2.md
- [x] ARCHITECTURE.md (full architecture, mechanisms, socket events, deploy guide)

## 6. Server Verification ✅
- [x] All JS files syntax check passed (7/7)
- [x] Server starts without errors
- [x] Both game engines running (Normal 1x + Hardcore 10x)

## Known Technical Debt
- processedTxHashes Set is in-memory (needs DB for production)
- No rate limiting on syncDeposit/syncWithdraw
- Server should also verify tx.to matches vault contract address
