# PIKIT Architecture & Development Specification

## 1. System Overview

PIKIT은 떨어지는 곡괭이 멀티플레이어 베팅 게임입니다.
플레이어는 Web3 지갑을 연결하고, USDC를 예치하여 크레딧을 얻고, 곡괭이를 구매하여 블록을 파괴하고 보상을 받습니다.

```
[Browser Client]
    ├── HTML5 Canvas (1080×1920 내부 해상도)
    ├── Socket.IO WebSocket
    ├── RainbowKit (React, Vite 빌드 → wallet-bundle.js)
    └── Vanilla JS (main.js, ui.js, renderer.js, socket.js)
         │
         ▼
[Node.js Server (Express 5 + Socket.IO 4.8)]
    ├── GameEngine × 2 (Normal 1x, Hardcore 10x)
    ├── Player / Pickaxe / Block / Chunk / TNT
    └── Ethers.js v6 (on-chain verification)
         │
         ▼
[Sepolia Testnet (EVM)]
    ├── PikitQuest (quest completion tracker)
    ├── PikitVault (USDC deposit/withdraw vault)
    └── MockUSDC (test USDC token)
```

---

## 2. File Structure

```
PIKIT/
├── server/
│   ├── index.js              # Express + Socket.IO 서버, 소켓 이벤트 핸들러
│   └── game/
│       ├── constants.js       # 모든 밸런스 값 (가격, 보상, 물리, 블록 타입)
│       ├── GameEngine.js      # 메인 게임 루프, 충돌, 카메라, 시스템 곡괭이
│       ├── Block.js           # 블록 객체 (HP, 파괴 단계, 보상)
│       ├── Chunk.js           # 청크 생성 (블록 배치, 레어 스폰 알림)
│       ├── Pickaxe.js         # 곡괭이 물리 (중력, 좌우 이동, 충돌)
│       ├── TNT.js             # TNT 폭발 처리
│       └── Player.js          # 플레이어 데이터 (밸런스, 퀘스트, 로그인 추적)
├── public/
│   ├── index.html             # 메인 HTML (단일 페이지, game-screen 기본 활성)
│   ├── css/style.css          # 전체 CSS (shadcn/ui 기반 다크 테마)
│   └── js/
│       ├── main.js            # 클라이언트 진입점, 소켓 이벤트 바인딩
│       ├── ui.js              # UI 패널 관리, 지갑 가드, deposit/withdraw
│       ├── socket.js          # GameSocket 객체, 서버 통신
│       ├── renderer.js        # HTML5 Canvas 렌더러 (8-bit 프로시저럴)
│       ├── camera.js          # 카메라 보간, 화면 흔들림
│       ├── hud.js             # Canvas 위 HUD 오버레이
│       ├── quest-abi.js       # PikitQuest 컨트랙트 ABI + 주소
│       ├── vault-abi.js       # PikitVault 컨트랙트 ABI + 주소
│       └── wallet-bundle.js   # RainbowKit React 번들 (Vite 빌드)
├── wallet-src/
│   ├── wallet-entry.js        # React 마운트 엔트리포인트
│   └── WalletProvider.jsx     # RainbowKit 프로바이더, window.WalletAPI 브릿지
├── contracts/
│   ├── PikitQuest.sol         # 온체인 퀘스트 완료 트래커
│   ├── PikitVault.sol         # USDC 입출금 볼트
│   └── MockUSDC.sol           # 테스트넷 USDC 토큰
├── scripts/
│   └── deploy.js              # 컨트랙트 배포 스크립트 (ethers v6 + solc)
└── .env                       # DEPLOYER_PRIVATE_KEY, SEPOLIA_RPC_URL
```

---

## 3. Core Mechanisms

### 3.1 Dual Field System
- **Normal (1x):** 기본 필드. 가격/보상 그대로.
- **Hardcore (10x):** 모든 가격과 보상 × 10. 빨간 테마, 용암 벽, 불씨 파티클.
- Socket.IO Room 기반 격리: `field:normal`, `field:hardcore`
- 각 필드에 독립 `GameEngine` 인스턴스

### 3.2 Game Loop
```
Server (60fps tick):
  1. 시스템 곡괭이 자동 생성 (TARGET=1, 5초마다)
  2. 모든 곡괭이 물리 업데이트 (중력, 좌우 이동, 벽 반사)
  3. 14포인트 히트박스 충돌 감지 → 블록 HP 감소
  4. 블록 파괴 시 보상 계산 (콤보 × 필드 배율)
  5. TNT 폭발 처리
  6. 카메라 Y 추적 (가장 깊은 곡괭이)

Broadcast (20fps):
  gameState → 해당 field room의 모든 클라이언트
```

### 3.3 Spectator-First Flow
```
1. 페이지 로드 → game-screen 즉시 활성 (관전자 모드)
2. 서버 자동 연결 → field:normal room 가입
3. gameState 수신 → 렌더러 즉시 시작
4. 아무 버튼 클릭 → _requireWallet() → RainbowKit 모달 열림
5. 지갑 연결 + 서명 → joinWithWallet → 플레이어 등록
```

### 3.4 Block System
| Block Type | Reward | Rarity | Spawn Alert |
|-----------|--------|--------|-------------|
| Stone | 1~5 (random) | 50% | No |
| Copper | 15 | 20% | No |
| Iron | 30 | 15% | No |
| Gold | 100 | 3% | No |
| Emerald | 250 | 8% | No |
| Diamond | 500 | 1% | ✅ Yes |
| Jackpot | 5000 | 0.1% | ✅ Yes |

### 3.5 Pickaxe Types
| Type | Price | DMG | Lifetime | Special |
|------|-------|-----|----------|---------|
| Basic | 1,000 | 4 | 30s | - |
| Power | 3,000 | 8 | 25s | Fast fall |
| Golden | 8,000 | 12 | 40s | Slow, wide |
| System | FREE | 2 | ∞ | Auto-spawn, no rewards |

---

## 4. Smart Contract Architecture

### 4.1 PikitQuest (`0x226E...beD6`)
```solidity
// 퀘스트 완료 기록
mapping(address => mapping(uint256 => bool)) questCompleted;

completeQuest(uint256 questId)  // 1~10
isCompleted(address, uint256)   // 단일 퀘스트 조회
getCompletedQuests(address)     // 전체 조회 bool[10]
```

### 4.2 PikitVault (`0x9f0c...1Fb9`)
```solidity
IERC20 usdc;  // MockUSDC address
DEPOSIT_RATE = 10000;   // 1 USDC = 10,000 credits
WITHDRAW_RATE = 10500;  // 10,500 credits = 1 USDC

deposit(uint256 usdcAmount)     // USDC → credits
withdraw(uint256 creditAmount)  // credits → USDC
getCredits(address)             // on-chain credit balance
```

### 4.3 MockUSDC (`0x683c...9c57`)
```solidity
decimals = 6;
mint(address to, uint256 amount)  // 무제한 민팅 (테스트넷)
approve/transfer/transferFrom     // ERC20 표준
```

### 4.4 Deposit/Withdraw Flow
```
[Deposit]
User → approve(vault, amount) on USDC → deposit(amount) on Vault
     → Server verifies tx receipt → credits game balance

[Withdraw]
User → withdraw(credits) on Vault → USDC transferred
     → Server verifies tx receipt → deducts game balance
```

---

## 5. Socket Events Reference

### Client → Server
| Event | Data | Description |
|-------|------|-------------|
| `joinWithWallet` | address, signature | 지갑 로그인 |
| `selectField` | fieldId | 필드 전환 |
| `buyPickaxe` | type | 곡괭이 구매 |
| `buyTNT` | type | TNT 구매 |
| `sendChat` | message | 채팅 (필드 스코프) |
| `getMyInfo` | - | 내 정보 요청 |
| `getQuests` | - | 퀘스트 상태 요청 |
| `verifyQuestCompletion` | questId, txHash | 퀘스트 완료 검증 |
| `syncDeposit` | txHash | 입금 트랜잭션 확인 |
| `syncWithdraw` | txHash | 출금 트랜잭션 확인 |
| `addBalance` | amount | 무료 크레딧 추가 (테스트) |

### Server → Client
| Event | Data | Description |
|-------|------|-------------|
| `config` | pickaxeTypes, tntTypes, blockTypes | 초기 설정 |
| `joined` | player | 로그인 성공 |
| `fieldSelected` | fieldId, multiplier | 필드 전환 확인 |
| `gameState` | blocks, pickaxes, camera, stats | 게임 상태 (20fps) |
| `purchaseSuccess` | result | 구매 성공 |
| `purchaseError` | message | 구매 실패 |
| `balanceUpdate` | balance | 잔액 변경 |
| `rareBlockSpawned` | blockType, name, reward | 레어 블록 출현 |
| `rareBlockDestroyed` | blockType, player, reward | 레어 블록 파괴 |
| `questStatus` | quests[] | 퀘스트 목록 |
| `questVerified` | success, questId | 퀘스트 검증 결과 |
| `depositConfirmed` | txHash, success | 입금 확인 |
| `withdrawConfirmed` | txHash, success | 출금 확인 |

---

## 6. Deployment Guide

### Prerequisites
- Node.js 18+
- Sepolia ETH (deployer wallet)
- `.env` with `DEPLOYER_PRIVATE_KEY` and `SEPOLIA_RPC_URL`

### Deploy Contracts
```bash
npm install solc  # if not installed
node scripts/deploy.js
# → Auto-updates quest-abi.js and vault-abi.js
```

### Rebuild Wallet Bundle (if WalletProvider.jsx changed)
```bash
npx vite build --config vite.config.js
```

### Start Server
```bash
node server/index.js
# → http://localhost:3000
```

---

## 7. Configuration Reference

### server/game/constants.js
- `GAME.TICK_RATE` (60): Server tick rate
- `GAME.BROADCAST_RATE` (20): State broadcast frequency
- `GAME.BLOCK_SIZE` (120): Block pixel size
- `GAME.GRAVITY` (400): Gravity px/s²
- `SYSTEM_PICKAXE_TARGET` (1): Number of system pickaxes per field
- `systemPickaxeInterval` (5000): System pickaxe spawn interval ms

### Key Balance Values
- Pickaxe prices: 1,000 / 3,000 / 8,000
- TNT prices: 2,000 / 5,000
- Hardcore multiplier: 10x (all prices and rewards)
- Deposit rate: 1 USDC = 10,000 credits
- Withdraw rate: 10,500 credits = 1 USDC (5% house edge)
