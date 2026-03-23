# PIKIT 기능 명세서 — EPIC 8~11

> 작성 기준: v4.7 코드베이스 (server/game/constants.js, GameEngine.js, Player.js, server/index.js, public/js/ui.js)
> 작성일: 2026-03-18

---

## ✦ [EPIC 8] 잭팟 시스템 서비스

### ❖ 1. 목적 및 배경

전체 플레이어가 공동으로 특수 블록(잭팟 블록)을 공략하여 대형 보상(250,000cr)을 획득하는 이벤트성 시스템이다. 일정 조건(활성 플레이어 수, 누적 소비 크레딧)이 충족될 때만 등장 기회가 주어지며, 등장 시 전체 필드에 알림이 방송된다. TNT에 대한 저항력이 있어 곡괭이로 집중 공략해야 파괴 가능하다. 잭팟 블록이 화면 밖으로 스크롤 아웃되거나 파괴되면 카운터가 리셋된다.

---

### ❖ 2. User Story & 상세 플로우

- **[STORY 8-1]** 유저는 잭팟 조건 미충족 상태에서 일반 플레이를 할 때 잭팟 블록이 등장하지 않아야 한다.
  1. 현재 필드에 활성 플레이어가 10명 미만이거나, 마지막 잭팟 이후 누적 소비가 1,500,000cr 미만이다.
  2. 청크 생성 시 잭팟 블록 스폰 조건을 확인한다.
  3. 조건 미충족 → 잭팟 블록 스폰 시도 자체가 이루어지지 않는다.
  4. 일반 블록만 생성되어 게임이 정상 진행된다.

- **[STORY 8-2]** 유저는 잭팟 등장 조건 3가지가 모두 충족된 순간 0.05% 확률로 잭팟 블록이 등장할 수 있어야 한다.
  1. 조건 A: 현재 필드 활성 플레이어 수 >= 10명.
  2. 조건 B: 마지막 잭팟 이후 누적 소비 크레딧 >= 1,500,000cr.
  3. 조건 C: 현재 잭팟 블록이 필드에 없음 (`jackpotBlockExists === false`).
  4. 새 청크가 생성될 때 각 블록 슬롯마다 `Math.random() < 0.0005` 를 체크한다.
  5. 0.05% 확률 충족 시 잭팟 블록이 해당 위치에 스폰된다.
  6. `creditsSinceLastJackpot` 카운터가 0으로 초기화된다.
  7. `jackpotBlockExists`가 `true`로 설정된다.
  8. `jackpotBlockSpawned` 이벤트가 해당 필드 전체에 브로드캐스트된다.

- **[STORY 8-3]** 유저는 잭팟 블록이 등장했을 때 전체 알림을 확인할 수 있어야 한다.
  1. 서버가 `jackpotBlockSpawned` 이벤트를 필드 룸 전체에 송신한다.
  2. 클라이언트가 이벤트를 수신한다.
  3. 화면에 잭팟 등장 알림 배너가 표시된다 (황금/핑크 색상의 spawn-alert-overlay).
  4. 알림에는 "Jackpot Block appeared! (250,000 credits)" 형태의 텍스트가 포함된다.
  5. 배너는 약 4초 후 자동으로 사라진다.

- **[STORY 8-4]** 유저는 잭팟 블록을 곡괭이로 공략하여 피해를 줄 수 있어야 한다.
  1. 플레이어가 곡괭이를 구매하여 잭팟 블록 근처에 배치한다.
  2. 곡괭이가 잭팟 블록에 충돌한다.
  3. 곡괭이의 `damage` 값만큼 잭팟 블록의 HP가 감소한다 (기본 HP: 300, 예: Power Pickaxe DMG 5 → 295 남음).
  4. 여러 곡괭이가 동시에 공격 가능하며, 여러 플레이어가 합산하여 파괴할 수 있다.
  5. 잭팟 블록이 파괴되지 않은 경우 게임이 계속 진행된다.

- **[STORY 8-5]** 유저는 TNT로 잭팟 블록을 공략할 수 있으나 40% 피해만 적용되어야 한다.
  1. 플레이어가 TNT를 구매하여 투하한다.
  2. TNT가 잭팟 블록 범위 내에서 폭발한다.
  3. 잭팟 블록은 `tntResist: true` 속성을 가지므로, 폭발 피해가 `floor(30 × 0.4) = 12` 로 감소한다.
  4. 잭팟 블록 HP가 12만큼만 감소한다 (300 HP 기준, TNT 1발로는 절대 파괴 불가).
  5. 일반 블록(저항 없음)은 같은 TNT에 의해 30 피해를 받는다.

- **[STORY 8-6]** 유저는 잭팟 블록의 HP를 0 이하로 만들어 최종 파괴에 성공하면 250,000cr을 수령해야 한다.
  1. 플레이어의 곡괭이가 잭팟 블록에 마지막 타격을 가한다.
  2. 블록 HP가 0 이하가 된다 → `block.destroyed = true`.
  3. 보상 계산: 250,000cr × 콤보 배율 × 필드 배율.
  4. 파괴한 곡괭이 소유 플레이어(`pickaxe.ownerName`)가 전액 수령한다.
  5. 플레이어의 `chargedCredits`(출금 가능 크레딧)에 보상이 즉시 적립된다.
  6. 서버가 `jackpotBlockDestroyed` 이벤트를 필드 룸에 브로드캐스트한다 (파괴자 이름, 보상 금액 포함).

- **[STORY 8-7]** 유저는 잭팟 블록 파괴 시 누가 파괴했는지 포함된 전체 알림을 확인할 수 있어야 한다.
  1. 서버가 `jackpotBlockDestroyed` 이벤트를 송신한다.
  2. 클라이언트가 이벤트 수신 후 jackpot-overlay에 배너 표시.
  3. 배너 텍스트: "[플레이어명] mined Jackpot Block! +250,000" 형태.
  4. 배너는 15초간 유지된 뒤 사라진다.
  5. jackpots 큐에도 추가되어 게임 HUD의 최근 이벤트 목록에 표시된다.

- **[STORY 8-8]** 유저가 잭팟 블록을 파괴하지 못한 채 카메라가 블록 위치를 벗어나면 잭팟 블록이 소멸되어야 한다.
  1. 잭팟 블록이 있는 청크가 카메라 뷰포트보다 2개 이상 위로 올라간다.
  2. `_manageChunks` 또는 `_clearBlocksAboveViewport` 처리 시 해당 블록이 파괴 처리된다.
  3. `jackpotBlockExists`가 `false`로 리셋된다.
  4. (별도의 소멸 알림은 없음. 잭팟 등장 기회가 상실된다.)
  5. `creditsSinceLastJackpot`은 리셋되지 않고 유지되어, 다음 잭팟 등장 조건 충족을 위해 계속 누적된다.

- **[STORY 8-9]** 유저는 잭팟이 파괴된 직후 누적 소비 카운터가 초기화되어 다음 잭팟까지 다시 1,500,000cr을 소비해야 함을 알아야 한다.
  1. 잭팟 블록이 파괴된다.
  2. `_onJackpotBlockSpawned` 콜백(스폰 시점)에서 `creditsSinceLastJackpot = 0` 초기화.
  3. 이후 플레이어들의 모든 곡괭이/TNT 구매 금액이 다시 카운터에 누적된다.
  4. 카운터가 1,500,000cr에 재도달하고 플레이어 수 10명+ 조건도 충족되면 다음 잭팟 기회가 다시 발생한다.

---

### ❖ 3. 정책 및 데이터 정의

**JACKPOT_CONFIG 상수 (server/game/constants.js)**

| 항목 | 값 | 설명 |
|------|-----|------|
| `MIN_PLAYERS` | 10명 | 잭팟 스폰 가능한 최소 활성 플레이어 수 |
| `SPAWN_THRESHOLD` | 1,500,000cr | 마지막 잭팟 이후 소비되어야 하는 누적 크레딧 |
| `SPAWN_CHANCE` | 0.0005 (0.05%) | 조건 충족 시 청크 블록 슬롯별 스폰 확률 |
| `REWARD` | 250,000cr | 잭팟 블록 파괴 보상 |

**잭팟 블록 스펙 (server/game/constants.js BLOCK_TYPES.jackpot)**

| 항목 | 값 |
|------|-----|
| HP | 300 |
| 보상 | 250,000cr (고정) |
| TNT 저항 | 있음 (TNT 피해 40%만 적용, 실질 피해 = floor(30 × 0.4) = 12) |
| 일반 스폰 | 없음 (weight: 0, 조건부 특수 스폰만 가능) |
| 색상 | #FF00FF (마젠타) |

**잭팟 블록 존재 상태 관리**

- `jackpotBlockExists: boolean` — GameEngine 인스턴스 단위 관리 (Normal, Hardcore 별도)
- `creditsSinceLastJackpot: number` — 누적 소비 추적 (모든 곡괭이/TNT 구매 시 `trackCreditSpent(price)` 호출)
- 두 필드(Normal, Hardcore)는 독립된 잭팟 카운터를 가짐

---

### ❖ 4. 의존 영역 및 영향도

- **Chunk.js**: 잭팟 블록 스폰 로직 (조건 검사 후 blockTypes.jackpot 배치)
- **GameEngine.js**: `_onJackpotBlockSpawned`, `jackpotBlockExists`, `creditsSinceLastJackpot` 관리
- **GameEngine.js `_handleExplosion`**: TNT 피해 시 `tntResist` 체크 → 40% 피해 계산
- **GameEngine.js `_manageChunks`, `_clearBlocksAboveViewport`**: 잭팟 블록 소멸 시 플래그 리셋
- **server/index.js `buyPickaxe`, `buyTNT`**: 구매 시 `trackCreditSpent` 호출

---

## ✦ [EPIC 9] 퀘스트 서비스

### ❖ 1. 목적 및 배경

플레이어가 게임 내 활동(블록 파괴, 곡괭이/TNT 구매, 로그인)을 통해 장기 목표를 달성하고, 온체인(Sepolia 테스트넷) 트랜잭션으로 완료를 기록하면 인게임 크레딧(비출금 가능) 보상을 받는 시스템이다. 각 퀘스트는 복수 티어(I~VII)로 구성되며, 이전 티어 온체인 완료 후 다음 티어로 진행된다. 보상은 `inGameCredits`(비출금)로 지급되어 구매에는 사용 가능하나 출금은 불가하다.

---

### ❖ 2. User Story & 상세 플로우

- **[STORY 9-1]** 유저는 퀘스트 패널을 열어 현재 진행 중인 퀘스트 목록을 볼 수 있어야 한다.
  1. 화면 하단 또는 사이드바의 "Quest" 버튼을 클릭한다.
  2. `UI.toggleQuest()` 호출 → 지갑/로그인 여부 확인 (`_requireWallet()`).
  3. 로그인 상태인 경우: quest-panel에 `open` 클래스가 추가된다 (슬라이드 인).
  4. panel-backdrop이 표시된다.
  5. 서버에 `getQuests` 소켓 이벤트가 전송된다.
  6. 서버가 `questStatus` 이벤트로 퀘스트 목록을 응답한다.
  7. `UI.renderQuests(quests)`가 호출되어 패널 내용이 렌더링된다.

- **[STORY 9-2]** 유저는 퀘스트 패널을 닫을 수 있어야 한다.
  1. 방법 A: 퀘스트 패널 우측 상단의 X 버튼 클릭.
  2. 방법 B: 패널 외부 백드롭 영역 클릭.
  3. `UI.closeQuest()` 호출 → quest-panel에서 `open` 클래스 제거.
  4. 다른 패널(Shop, Menu)이 열려 있지 않으면 panel-backdrop도 숨겨진다.

- **[STORY 9-3]** 미로그인 상태의 유저가 퀘스트 버튼을 클릭하면 로그인 유도가 표시되어야 한다.
  1. 유저가 로그인하지 않은 상태에서 Quest 버튼을 클릭한다.
  2. `_requireWallet()` 실행 → `GameSocket.player` 없음 확인.
  3. 지갑이 연결된 경우: "Logging in..." 토스트 표시 후 walletLoginRequested 이벤트 발생.
  4. 지갑 미연결인 경우: RainbowKit 지갑 연결 모달이 열린다.
  5. 퀘스트 패널은 열리지 않는다.

- **[STORY 9-4]** 유저는 퀘스트 목록에서 각 퀘스트의 진행률 바를 확인할 수 있어야 한다.
  1. 퀘스트 패널이 열린다.
  2. 각 퀘스트 항목에 이름, 설명, 목표값, 현재값, 진행률 바(0~100%), 보상 크레딧이 표시된다.
  3. 진행률 바 너비는 `min(current/target, 1) × 100%`로 계산된다.
  4. 달성된 퀘스트는 "Completed" 배지와 함께 목록 하단으로 정렬된다.
  5. 활성(미완료) 퀘스트가 목록 상단에 표시된다.

- **[STORY 9-5]** 유저가 블록을 파괴하면 관련 퀘스트의 진행 카운터가 증가해야 한다.
  1. 플레이어의 곡괭이가 블록을 파괴한다.
  2. `player.trackBlockDestroyed(block.type)` 호출:
     - `questProgress.blocksDestroyed` 1 증가.
     - `questProgress.blocksByType[block.type]` 1 증가.
  3. 다음 번 퀘스트 패널을 열거나 `getQuests` 요청 시 업데이트된 진행값이 반영된다.

- **[STORY 9-6]** 유저가 퀘스트 목표를 달성하면 온체인 완료 버튼이 활성화되어야 한다.
  1. 퀘스트의 `current >= target` 조건이 충족된다.
  2. 퀘스트가 아직 완료(`completed: false`)되지 않은 상태다.
  3. 퀘스트 항목 하단에 "Complete On-Chain" 버튼이 표시된다.
  4. 버튼 클릭 전까지는 완료 처리가 되지 않는다.

- **[STORY 9-7]** 유저는 "Complete On-Chain" 버튼을 클릭하여 지갑 서명 요청을 받아야 한다.
  1. 유저가 "Complete On-Chain" 버튼을 클릭한다.
  2. `_completeQuestOnChain(questId, btn)` 호출.
  3. 지갑 연결 여부 및 Quest 컨트랙트 주소 배포 여부 확인.
  4. 온체인 사전 확인: `isCompleted(address, questId)` eth_call 수행.
  5. 이미 온체인 완료된 경우: "Already Completed" 텍스트 표시 후 서버에 동기화 요청.
  6. 미완료인 경우: `eth_estimateGas`로 트랜잭션 가능 여부 사전 확인.
  7. 문제 없으면 메타마스크(또는 연결된 지갑)에 서명 요청 팝업이 표시된다.
  8. 버튼 상태가 "Sending tx..."로 변경된다.

- **[STORY 9-8]** 유저가 트랜잭션에 서명하면 서버가 검증 중 상태가 되어야 한다.
  1. 유저가 지갑에서 트랜잭션을 승인(서명)한다.
  2. `eth_sendTransaction`이 tx hash를 반환한다.
  3. 버튼 상태가 "Verifying..."으로 변경된다.
  4. 토스트: "Transaction sent! Waiting for confirmation..." 표시.
  5. `GameSocket.verifyQuestCompletion(questId, txHash)` 호출 → 서버에 `verifyQuestCompletion` 소켓 이벤트 전송.
  6. 서버는 Sepolia 노드(`https://rpc.sepolia.org`)에 `getTransactionReceipt`를 호출하여 트랜잭션 확인을 기다린다.

- **[STORY 9-9]** 트랜잭션이 온체인에서 확인되면 퀘스트가 완료 처리되고 보상이 지급되어야 한다.
  1. 서버가 Sepolia에서 트랜잭션 receipt 수령 (`receipt.status === 1`).
  2. 발신자 주소 일치 확인: `tx.from.toLowerCase() === player.walletAddress.toLowerCase()`.
  3. 퀘스트 목표 달성 여부 재확인: `player.isQuestTargetMet(questId)`.
  4. 모든 확인 통과 시:
     - `player.completedQuests.add(questId)` — 완료 목록에 추가.
     - `player.earnInGameCredits(reward, ...)` — 인게임 크레딧(비출금) 지급.
  5. 서버가 `questVerified { success: true, reward, inGameCredits, balance }` 이벤트 송신.
  6. 서버가 `questStatus` 이벤트도 함께 송신하여 클라이언트 퀘스트 목록 갱신.
  7. 클라이언트: 퀘스트 항목에 "✔ Completed" 배지가 표시된다.

- **[STORY 9-10]** 유저가 지갑에서 트랜잭션을 거부하면 오류 처리가 되어야 한다.
  1. 유저가 지갑 팝업에서 "Reject" 또는 "Cancel"을 클릭한다.
  2. `eth_sendTransaction` Promise가 reject된다.
  3. catch 블록 실행 → 버튼이 다시 "Complete On-Chain"으로 복원된다.
  4. 토스트: 지갑 에러 메시지 (예: "User rejected the request") 가 표시된다.
  5. 퀘스트 완료 처리가 이루어지지 않는다.

- **[STORY 9-11]** 유저가 지갑 미연결 상태에서 온체인 완료 버튼을 클릭하면 연결 유도가 표시되어야 한다.
  1. 유저가 "Complete On-Chain" 버튼을 클릭한다.
  2. `window.WalletAPI.isConnected()` → false.
  3. 토스트: "Connect wallet first" 오류 메시지 표시.
  4. 버튼 상태 변화 없이 함수가 종료된다.

- **[STORY 9-12]** 이미 완료된 퀘스트를 재완료하려 하면 서버가 거부해야 한다.
  1. 유저가 이미 완료(`completedQuests`에 포함)된 퀘스트의 완료를 재요청한다.
  2. 서버: `player.completedQuests.has(questId)` → true.
  3. 서버가 `questVerified { success: false, message: 'Already completed' }` 응답.
  4. 클라이언트에 토스트로 오류 메시지가 표시된다.

- **[STORY 9-13]** 유저가 잘못된 네트워크(Sepolia 외)에서 트랜잭션을 보내면 실패 처리가 되어야 한다.
  1. 유저가 메인넷 또는 다른 테스트넷에서 트랜잭션을 시도한다.
  2. `eth_estimateGas` 단계에서 "wrong network" 관련 오류가 발생할 수 있다.
  3. 또는 트랜잭션이 전송되어도 Sepolia에서 receipt를 찾을 수 없다.
  4. 서버: `receipt` 없음 → `questVerified { success: false, message: 'Transaction failed or not found' }`.
  5. 클라이언트에 오류 토스트가 표시되고 버튼이 복원된다.

- **[STORY 9-14]** 유저는 Daily Player 퀘스트(매일 로그인)를 통해 로그인 일수에 따른 보상을 받을 수 있어야 한다.
  1. 유저가 게임에 로그인(join 또는 joinWithWallet)한다.
  2. `player.trackLogin()` 호출 → 오늘 날짜(`YYYY-MM-DD`)와 `lastLoginDate` 비교.
  3. 날짜가 다른 경우: `questProgress.loginDays` 1 증가, `lastLoginDate` 갱신.
  4. 같은 날 재접속 시: loginDays 증가 없음.
  5. Daily Player I (1일) 달성 시 온체인 완료 후 1,000cr 인게임 보상.
  6. Daily Player II (7일) 달성 시 5,000cr, III (30일) 20,000cr, IV (100일) 80,000cr, V (365일) 300,000cr.

- **[STORY 9-15]** 유저는 High Roller 퀘스트(총 획득 50,000cr)를 달성하여 보상을 받을 수 있어야 한다.
  1. 플레이어의 `totalEarned`가 50,000cr 이상이 되면 High Roller I 조건 충족.
  2. 퀘스트 패널에서 진행률 바가 100%로 채워진다.
  3. "Complete On-Chain" 버튼이 활성화된다.
  4. 온체인 완료 처리 후 5,000cr 인게임 보상 지급.

---

### ❖ 3. 정책 및 데이터 정의

**퀘스트 체인 전체 목록 (Player.js QUEST_CHAINS)**

각 체인은 7개 티어(Daily Player는 5개 티어)를 가진다. 아래는 티어 I의 달성 조건과 보상을 기준으로 정리한다.

| Chain ID | 퀘스트명 | 달성 조건 (Tier I 기준) | 목표값 (Tier I) | 보상 (Tier I) |
|----------|---------|----------------------|--------------|-------------|
| 1 | Block Breaker | 총 블록 파괴 수 | 200 | 3,000cr |
| 2 | Stone Mason | Stone 블록 파괴 수 | 100 | 2,000cr |
| 3 | Dirt Digger | Dirt 블록 파괴 수 | 100 | 2,000cr |
| 4 | Clay Crusher | Clay 블록 파괴 수 | 50 | 1,500cr |
| 5 | Gravel Grinder | Gravel 블록 파괴 수 | 50 | 1,500cr |
| 6 | Copper Hunter | Copper 블록 파괴 수 | 50 | 2,000cr |
| 7 | Iron Forger | Iron 블록 파괴 수 | 20 | 2,500cr |
| 8 | Emerald Seeker | Emerald 블록 파괴 수 | 10 | 3,000cr |
| 9 | Gold Rush | Gold 블록 파괴 수 | 5 | 5,000cr |
| 10 | Diamond Hands | Diamond 블록 파괴 수 | 1 | 5,000cr |
| 11 | Shopping Spree | 곡괭이 구매 수 | 10 | 2,000cr |
| 12 | Explosive Expert | TNT 구매 수 | 5 | 3,000cr |
| 13 | High Roller | 총 획득 크레딧 | 50,000cr | 5,000cr |
| 14 | Daily Player | 로그인 일수 | 1일 | 1,000cr |

**퀘스트 ID 체계**: `chainId * 100 + tier` (예: Chain 1 Tier 3 = 103)

**온체인 완료 검증 방식**
1. 네트워크: Sepolia 테스트넷 (`https://rpc.sepolia.org`)
2. 컨트랙트: `window.PIKIT_QUEST.CONTRACT_ADDRESS` (퀘스트 스마트 컨트랙트)
3. 함수 셀렉터: `completeQuest(uint256)` = `0x528be0a9`
4. 서버 검증 항목:
   - `receipt.status === 1` (트랜잭션 성공 여부)
   - `tx.from.toLowerCase() === player.walletAddress.toLowerCase()` (발신자 일치)
   - `player.isQuestTargetMet(questId)` (게임 내 목표 달성 여부)
   - `!player.completedQuests.has(questId)` (중복 완료 방지)
5. 보상 크레딧 종류: `inGameCredits` (비출금 가능, 게임 내 구매만 사용 가능)

---

### ❖ 4. 의존 영역 및 영향도

- **Player.js**: `questProgress`, `completedQuests`, `trackBlockDestroyed/trackPickaxePurchase/trackTNTPurchase/trackLogin`, `getQuestStatus/isQuestTargetMet/getQuestReward`, `earnInGameCredits`
- **server/index.js**: `getQuests`, `verifyQuestCompletion` 소켓 이벤트 핸들러; ethers.js Sepolia 검증
- **public/js/ui.js**: `toggleQuest/closeQuest`, `renderQuests`, `_completeQuestOnChain`
- **크레딧 체계**: 보상은 `inGameCredits`(비출금)로 지급. 지출 시 `inGameCredits` 우선 차감 후 `chargedCredits` 차감

---

## ✦ [EPIC 10] 리더보드 서비스

### ❖ 1. 목적 및 배경

현재 필드에서 활동 중인 플레이어의 순이익(총 획득 - 총 지출)을 기준으로 실시간 순위를 표시하는 서비스다. 모달 형태로 제공되며, 2초마다 자동 갱신된다. Normal과 Hardcore 필드는 각각 독립된 리더보드를 가진다. 상위 3위는 금/은/동으로 시각적으로 구분된다.

---

### ❖ 2. User Story & 상세 플로우

- **[STORY 10-1]** 유저는 리더보드 버튼을 클릭하여 순위 모달을 열 수 있어야 한다.
  1. 화면의 "Leaderboard" 버튼(#lb-btn)을 클릭한다.
  2. `UI.toggleLeaderboard()` 호출 → `_requireWallet()` 확인.
  3. 로그인 상태인 경우: lb-modal에 `open` 클래스 추가 → 모달 표시.
  4. 모달에는 현재 필드 플레이어 Top 10 순위가 순이익 기준으로 정렬 표시된다.

- **[STORY 10-2]** 유저는 모달 우측 상단 X 버튼으로 리더보드를 닫을 수 있어야 한다.
  1. X 버튼(#lb-close-btn)을 클릭한다.
  2. `UI.closeLeaderboard()` 호출 → lb-modal에서 `open` 클래스 제거.
  3. 모달이 사라진다.

- **[STORY 10-3]** 유저는 리더보드 모달 외부(백드롭)를 클릭하여 닫을 수 있어야 한다.
  1. lb-modal의 배경(모달 컨테이너 자체) 영역을 클릭한다.
  2. 이벤트 target이 `lb-modal` 자신인 경우: `UI.closeLeaderboard()` 호출.
  3. 모달 내부 콘텐츠 영역 클릭 시에는 닫히지 않는다.

- **[STORY 10-4]** 미로그인 상태의 유저가 리더보드를 클릭하면 로그인 유도가 표시되어야 한다.
  1. 로그인하지 않은 유저가 Leaderboard 버튼을 클릭한다.
  2. `_requireWallet()` → 로그인 미완료 확인.
  3. 지갑 연결 여부에 따라 "Logging in..." 토스트 또는 지갑 연결 모달 표시.
  4. 리더보드 모달은 열리지 않는다.

- **[STORY 10-5]** 유저는 리더보드에서 Top 10 플레이어의 순이익을 확인할 수 있어야 한다.
  1. 리더보드 모달이 열린다.
  2. 각 행: 순위 번호, 플레이어 이름, 순이익(totalEarned - totalSpent) 표시.
  3. 순이익이 높은 순으로 정렬 (1위가 최상단).
  4. 최대 10명까지 표시.

- **[STORY 10-6]** 유저는 1위/2위/3위에 금색/은색/동색 강조가 적용된 것을 확인할 수 있어야 한다.
  1. 1위 행: lb-rank 요소에 `gold` 클래스 적용 → 금색 텍스트.
  2. 2위 행: `silver` 클래스 → 은색 텍스트.
  3. 3위 행: `bronze` 클래스 → 동색 텍스트.
  4. 4위 이하: 일반 색상.

- **[STORY 10-7]** 유저는 순이익이 양수이면 녹색, 음수이면 빨간색으로 표시되는 것을 확인할 수 있어야 한다.
  1. `entry.profit >= 0` → lb-profit 요소에 `positive` 클래스 적용 → 녹색, 앞에 `+` 부호 표시.
  2. `entry.profit < 0` → `negative` 클래스 적용 → 빨간색, `-` 부호 자동 포함.

- **[STORY 10-8]** 유저가 리더보드 모달을 열어두면 2초마다 자동으로 순위가 갱신되어야 한다.
  1. 서버의 `_getLeaderboard()`는 2초 캐시를 사용한다 (`_leaderboardLastUpdate` 기준).
  2. 서버는 20fps로 `gameState` 브로드캐스트 시 `leaderboard` 데이터를 함께 전송한다.
  3. 클라이언트가 `gameState` 이벤트를 수신할 때마다 `UI.updateLeaderboard(state.leaderboard)` 호출.
  4. 리더보드 모달이 열려 있으면 즉시 갱신된 순위가 반영된다.
  5. 실질 갱신 주기: 최대 2초 (서버 캐시 주기에 종속).

- **[STORY 10-9]** 현재 필드에 플레이어가 없을 때 리더보드는 "No players yet" 메시지를 표시해야 한다.
  1. `leaderboard` 배열이 빈 배열이거나 null인 경우.
  2. `UI.updateLeaderboard(leaderboard)`에서 빈 배열 감지.
  3. 컨테이너에 "No players yet" 텍스트가 표시된다 (회색, 중앙 정렬).

- **[STORY 10-10]** 유저가 Hardcore 필드로 이동하면 리더보드가 Hardcore 필드 플레이어만 표시해야 한다.
  1. 유저가 Hardcore 필드로 전환한다.
  2. 클라이언트가 `field:hardcore` 룸의 `gameState` 이벤트를 수신하기 시작한다.
  3. Hardcore 필드의 `hardcoreEngine`은 Normal 필드와 완전히 독립된 `players` Map을 가진다.
  4. 리더보드에는 Hardcore 필드에 있는 플레이어만 표시된다.
  5. Normal 필드 플레이어는 표시되지 않는다.

---

### ❖ 3. 정책 및 데이터 정의

**리더보드 산출 방식**

```
순이익 = round(totalEarned) - round(totalSpent)
```

- `totalEarned`: 블록 파괴 보상으로 획득한 누적 크레딧
- `totalSpent`: 곡괭이/TNT 구매에 지출한 누적 크레딧
- 퀘스트 보상(`inGameCredits`)은 `totalEarned`에 포함되지 않음

**갱신 정책**

| 항목 | 값 |
|------|-----|
| 서버 정렬 캐시 주기 | 2,000ms |
| 클라이언트 수신 주기 | 50ms (20fps gameState 브로드캐스트) |
| 표시 최대 인원 | 10명 |
| 정렬 기준 | 순이익 내림차순 |

**필드 격리**
- Normal 리더보드: `normalEngine.players` 기반
- Hardcore 리더보드: `hardcoreEngine.players` 기반
- 두 필드 간 상호 참조 없음

---

### ❖ 4. 의존 영역 및 영향도

- **GameEngine.js `_getLeaderboard`**: 2초 캐시 정렬 및 top 10 슬라이싱
- **GameEngine.js `broadcast`**: gameState에 `leaderboard` 포함 전송
- **public/js/ui.js `updateLeaderboard`**: DOM 렌더링, 색상 클래스 적용
- **Player.js `serialize`**: `profit: round(totalEarned - totalSpent)` 필드 포함

---

## ✦ [EPIC 11] 채팅 서비스

### ❖ 1. 목적 및 배경

같은 필드에 있는 플레이어들이 실시간으로 텍스트 메시지를 교환할 수 있는 서비스다. 채팅은 필드 단위로 격리되어 Normal 필드 메시지는 Hardcore 필드에 표시되지 않는다. 서버 측에서 1초 쿨다운 및 200자 최대 길이 제한을 적용하며, 채팅창에는 최대 100개의 메시지만 유지된다. 플레이어 입퇴장 알림도 시스템 메시지 형태로 동일한 채팅창에 표시된다.

---

### ❖ 2. User Story & 상세 플로우

- **[STORY 11-1]** 유저는 채팅 버튼을 클릭하여 입력창을 열 수 있어야 한다.
  1. 화면의 채팅 토글 버튼(#chat-toggle-btn)을 클릭한다.
  2. `UI.toggleChat()` 호출 → `chatOpen` 토글.
  3. chat-overlay에 `input-open` 클래스가 추가된다.
  4. 채팅 입력창(#chat-input)에 자동으로 포커스가 이동한다.
  5. 기존 채팅 메시지 내역이 표시된다.

- **[STORY 11-2]** 유저는 메시지 입력 후 Enter 키로 메시지를 전송할 수 있어야 한다.
  1. 유저가 채팅 입력창에 텍스트를 입력한다.
  2. Enter 키를 누른다.
  3. `_sendChatMessage()` 호출 → `_requireWallet()` 확인.
  4. 로그인 상태인 경우: `GameSocket.sendChat(message)` 호출 → `chatMessage` 소켓 이벤트 전송.
  5. 입력창이 비워진다.

- **[STORY 11-3]** 유저는 메시지 입력 후 전송 버튼 클릭으로 메시지를 전송할 수 있어야 한다.
  1. 유저가 채팅 입력창에 텍스트를 입력한다.
  2. 전송 버튼(#chat-send-btn)을 클릭한다.
  3. `_sendChatMessage()` 동일 플로우 실행.
  4. 입력창이 비워진다.

- **[STORY 11-4]** 유저는 Escape 키로 채팅 입력창을 닫을 수 있어야 한다.
  1. 채팅 입력창이 열려 있는 상태에서 Escape 키를 누른다.
  2. 채팅 입력창의 keydown 이벤트 핸들러에서 `e.key === 'Escape'` 감지.
  3. `UI.closeChat()` 호출 → chat-overlay에서 `input-open` 클래스 제거.
  4. 입력 중이던 텍스트는 유지된다 (전송되지 않음).

- **[STORY 11-5]** 유저는 채팅 버튼을 다시 클릭하여 채팅 입력창을 닫을 수 있어야 한다.
  1. 채팅 입력창이 열린 상태에서 채팅 토글 버튼을 다시 클릭한다.
  2. `UI.toggleChat()` → `chatOpen`이 이미 `true` → `false`로 전환.
  3. chat-overlay에서 `input-open` 클래스 제거.

- **[STORY 11-6]** 미로그인 상태의 유저가 채팅 전송을 시도하면 로그인 유도가 표시되어야 한다.
  1. 미로그인 상태에서 Enter 또는 전송 버튼을 클릭한다.
  2. `_requireWallet()` → `GameSocket.player` 없음.
  3. 지갑 연결 상태에 따라 "Logging in..." 토스트 또는 지갑 연결 모달 표시.
  4. 메시지가 전송되지 않는다.
  5. (참고: 채팅창 토글 자체는 로그인 없이 가능. 이전 메시지 내역을 볼 수 있다.)

- **[STORY 11-7]** 유저가 200자를 초과하는 메시지를 입력하면 서버에서 200자로 잘려야 한다.
  1. 유저가 200자를 초과하는 긴 텍스트를 입력 후 전송한다.
  2. 서버 `chatMessage` 핸들러에서 `String(data.message || '').trim().substring(0, 200)` 처리.
  3. 200자까지만 수신자에게 전달된다.
  4. 201번째 문자 이후는 무시된다.

- **[STORY 11-8]** 유저가 1초 쿨다운 내에 연속으로 전송을 시도하면 두 번째 메시지는 무시되어야 한다.
  1. 유저가 첫 번째 메시지를 전송한다. `chatCooldowns.set(socket.id, now)` 기록.
  2. 1,000ms 이내에 두 번째 메시지를 전송 시도한다.
  3. 서버: `now - lastMsg < 1000` → 이벤트 핸들러가 즉시 반환된다 (메시지 무시).
  4. 별도 에러 응답 없음. 클라이언트 입력창은 정상적으로 비워진다.

- **[STORY 11-9]** 유저는 같은 필드의 다른 플레이어가 보낸 메시지를 수신하여 채팅창에 표시되는 것을 확인할 수 있어야 한다.
  1. 다른 플레이어가 같은 필드에서 메시지를 전송한다.
  2. 서버가 `io.to(engine.roomName).emit('chatMessage', { name, message, time })` 전송.
  3. 클라이언트가 `chatMessage` 이벤트 수신.
  4. `UI.addChatMessage(data)` 호출 → chat-messages 컨테이너에 새 메시지 요소 추가.
  5. 메시지는 "[플레이어명] [메시지 내용]" 형태로 표시된다.
  6. 채팅창이 최신 메시지로 자동 스크롤된다.

- **[STORY 11-10]** 유저는 플레이어가 현재 필드에 입장했을 때 시스템 메시지를 확인할 수 있어야 한다.
  1. 다른 플레이어가 필드에 입장(join 또는 joinWithWallet 처리 완료)한다.
  2. 서버: `io.to('field:fieldId').emit('playerJoined', { name, time })` 브로드캐스트.
  3. 클라이언트가 `playerJoined` 이벤트 수신.
  4. `UI.addSystemMessage('[name] joined')` 호출 → chat-messages에 system 클래스 메시지 추가.
  5. 시스템 메시지는 일반 메시지와 다른 색상(회색/이탤릭)으로 구분된다.

- **[STORY 11-11]** 유저는 플레이어가 필드를 나갔을 때 시스템 메시지를 확인할 수 있어야 한다.
  1. 다른 플레이어가 접속을 끊거나 필드를 전환한다.
  2. 서버: `io.to('field:fieldId').emit('playerLeft', { name, time })` 브로드캐스트.
  3. 클라이언트가 `playerLeft` 이벤트 수신.
  4. `UI.addSystemMessage('[name] left')` 호출 → system 메시지 추가.

- **[STORY 11-12]** 채팅 메시지가 100개를 초과하면 가장 오래된 메시지가 자동으로 삭제되어야 한다.
  1. chat-messages 컨테이너의 자식 수가 100개를 초과할 때마다:
  2. `while (container.children.length > 100) container.removeChild(container.firstChild)`.
  3. 가장 오래된 메시지(최상단)부터 순서대로 제거된다.
  4. 메모리 및 DOM 과부하를 방지한다.

- **[STORY 11-13]** Normal 필드의 채팅 메시지는 Hardcore 필드 플레이어에게 표시되지 않아야 한다.
  1. Normal 필드 플레이어 A가 메시지를 전송한다.
  2. 서버: `io.to('field:normal').emit('chatMessage', ...)` — Normal 룸에만 전송.
  3. Hardcore 필드에 있는 플레이어 B는 `field:hardcore` 룸에만 구독되어 있다.
  4. 플레이어 B에게는 해당 메시지가 전달되지 않는다.
  5. 반대 방향도 동일: Hardcore 채팅은 Normal 플레이어에게 표시되지 않는다.

---

### ❖ 3. 정책 및 데이터 정의

**채팅 정책**

| 항목 | 값 |
|------|-----|
| 최대 메시지 길이 | 200자 (서버에서 `substring(0, 200)` 처리) |
| 전송 쿨다운 | 1,000ms (서버 `chatCooldowns` Map 기반) |
| 클라이언트 보관 메시지 수 | 최대 100개 (초과 시 FIFO 삭제) |
| 메시지 필드 격리 | 필드 룸(`field:normal`, `field:hardcore`) 단위 격리 |

**메시지 유형**

| 유형 | CSS 클래스 | 내용 |
|------|-----------|------|
| 일반 메시지 | `chat-msg` | 플레이어명 + 내용 |
| 시스템 메시지 | `chat-msg system` | "[플레이어명] joined/left" 등 |

**쿨다운 정책**
- 서버에서 소켓 ID별 마지막 전송 시각을 `chatCooldowns` Map으로 관리
- 연결 종료 시 `chatCooldowns.delete(socket.id)` 정리
- 클라이언트 측 쿨다운 없음 (서버 단일 제어)

---

### ❖ 4. 의존 영역 및 영향도

- **server/index.js**: `chatMessage` 소켓 이벤트 핸들러, `chatCooldowns` Map, `playerJoined`/`playerLeft` 브로드캐스트
- **public/js/ui.js**: `toggleChat/closeChat`, `_sendChatMessage`, `addChatMessage`, `addSystemMessage`
- **소켓 룸 격리**: `field:normal`, `field:hardcore` 룸 구조에 의존 (selectField 이벤트에서 join/leave 처리)
- **XSS 방지**: `addChatMessage`에서 `nameSpan.textContent = data.name`, `textSpan.textContent = data.message` 로 DOM 직접 조작 (innerHTML 미사용)
