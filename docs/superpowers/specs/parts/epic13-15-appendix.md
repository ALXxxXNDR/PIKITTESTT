# PIKIT 기능 명세서 — EPIC 12~14 + 부록

**문서 버전**: v4.7
**작성일**: 2026-03-18
**대상 독자**: PM, 기획자, 개발자

---

## ✦ [EPIC 12] 내 정보 서비스

### ❖ 1. 목적 및 배경

로그인한 플레이어가 자신의 잔액, 수익/손실(PnL), 크레딧 내역을 한눈에 확인하고, 로그아웃 또는 무료 크레딧 충전을 수행할 수 있는 개인 정보 팝업 서비스다. 지갑 연결 여부에 따라 입출금 탭의 활성화 여부가 달라진다.

---

### ❖ 2. User Story & 상세 플로우

---

**[STORY 12-1]** 유저는 내 정보를 보기 위해 화면 상단의 '내 정보' 버튼을 클릭할 수 있어야 한다.

1. 유저가 HUD 영역의 `#myinfo-btn` 버튼을 클릭한다.
2. 시스템은 로그인 여부(`GameSocket.player`)를 확인한다.
3. 로그인 상태이면 `#myinfo-popup` 팝업에 `.open` 클래스를 추가하여 팝업을 표시한다.
4. 팝업 상단에 플레이어 이름(`#myinfo-name`)과 현재 잔액(`#myinfo-balance`), PnL(`#myinfo-pnl`)이 표시된다.
5. 기본 탭은 'Overview' 탭이 활성화된 상태다.

---

**[STORY 12-2]** 유저는 팝업 내 X 버튼을 클릭하여 내 정보 팝업을 닫을 수 있어야 한다.

1. 유저가 `#myinfo-close-btn`(X 버튼)을 클릭한다.
2. 시스템은 `#myinfo-popup`에서 `.open` 클래스를 제거하여 팝업을 닫는다.
3. 팝업이 닫히고 게임 화면이 정상적으로 표시된다.

---

**[STORY 12-3]** 유저는 팝업 외부 영역(백드롭)을 클릭하여 내 정보 팝업을 닫을 수 있어야 한다.

1. 유저가 `#myinfo-popup` 바깥의 `#panel-backdrop` 영역을 클릭한다.
2. 시스템은 `closeMyInfo()` 함수를 호출하여 팝업을 닫는다.
3. 팝업이 닫힌다.

---

**[STORY 12-4]** 미로그인 상태에서 '내 정보' 버튼을 클릭할 경우 시스템이 지갑 연결을 유도해야 한다.

1. 비로그인 유저가 `#myinfo-btn`을 클릭한다.
2. 시스템은 `_requireWallet()` 가드를 실행한다.
3. (분기 A) 지갑이 미연결 상태인 경우: RainbowKit 지갑 연결 모달을 열고, 내 정보 팝업은 열리지 않는다.
4. (분기 B) 지갑이 연결되어 있으나 게임 로그인이 미완료인 경우: `walletLoginRequested` 이벤트를 발생시키고 'Logging in...' 토스트를 표시한다. 내 정보 팝업은 열리지 않는다.
5. (분기 C) WalletAPI 자체가 로드되지 않은 경우: 'Wallet loading... please try again' info 토스트를 표시한다.

---

**[STORY 12-5]** 유저는 Overview 탭에서 잔액, 총 획득, 총 소비, PnL을 확인할 수 있어야 한다.

1. 팝업이 열리면 Overview 탭(`tab-overview`)이 기본 활성화된다.
2. 탭 내에 다음 수치가 표시된다:
   - `#myinfo-balance-overview`: 현재 잔액 (총 크레딧)
   - `#myinfo-earned`: 총 획득 크레딧 (totalEarned)
   - `#myinfo-spent`: 총 소비 크레딧 (totalSpent)
   - `#myinfo-pnl-overview`: PnL = totalEarned - totalSpent
   - `#myinfo-charged-overview`: 충전 크레딧 (USDC 입금으로 충전된 크레딧)
   - `#myinfo-ingame-overview`: 인게임 크레딧 (블록 파괴·퀘스트로 획득한 크레딧)
3. 모든 수치는 서버의 `balanceUpdated` 이벤트 또는 `myInfo` 이벤트 수신 시 실시간 갱신된다.

---

**[STORY 12-6]** PnL이 양수(수익)일 때 녹색으로 표시되어야 한다.

1. 서버로부터 플레이어 데이터가 수신된다.
2. PnL 계산: `profit = totalEarned - totalSpent`
3. `profit >= 0` 조건이 참이면 `#myinfo-pnl` 및 `#myinfo-pnl-overview` 요소의 `color` 스타일을 `var(--green)`으로 설정한다.
4. 텍스트 앞에 '+' 기호가 붙는다 (예: "+1,200").

---

**[STORY 12-7]** PnL이 음수(손실)일 때 빨간색으로 표시되어야 한다.

1. `profit < 0` 조건이 참이면 `#myinfo-pnl` 및 `#myinfo-pnl-overview` 요소의 `color` 스타일을 `var(--red)`로 설정한다.
2. 텍스트에 '-' 기호가 붙는다 (예: "-3,400").

---

**[STORY 12-8]** 유저는 내 정보 팝업 내 '무료 크레딧 충전' 버튼을 클릭하여 크레딧을 충전할 수 있어야 한다.

1. 유저가 `#myinfo-add-balance` 버튼을 클릭한다.
2. 시스템은 `GameSocket.addBalance(10000)` 소켓 이벤트를 서버에 전송한다.
3. 서버는 레이트 제한(30초 내 최대 5회)을 확인한다.
4. (성공) 서버가 `balanceUpdated` 이벤트를 반환하고, UI는 '10,000 credits added!' success 토스트를 표시하며 잔액이 갱신된다.
5. (실패: 레이트 리밋 초과) 서버는 이벤트를 무시하며 잔액이 변하지 않는다 (토스트 없음).

---

**[STORY 12-9]** 유저는 내 정보 팝업 내 '로그아웃' 버튼을 클릭하면 확인 팝업을 볼 수 있어야 한다.

1. 유저가 `#myinfo-logout` 버튼을 클릭한다.
2. 시스템이 브라우저 기본 `confirm('Are you sure you want to logout?')` 다이얼로그를 표시한다.

---

**[STORY 12-10]** 유저가 로그아웃 확인 다이얼로그에서 '확인'을 클릭하면 로그아웃이 완료되어야 한다.

1. 유저가 confirm 다이얼로그에서 '확인(OK)'을 클릭한다.
2. (분기 A) 지갑이 연결된 상태(`WalletAPI.isConnected() === true`)이면: `WalletAPI.disconnect()`를 호출한다. 이 호출이 `walletStateChanged` 이벤트를 발생시켜 게임 로그아웃 흐름이 진행된다.
3. (분기 B) 닉네임 로그인 상태(지갑 미연결)이면: `window.location.reload()`를 호출하여 페이지를 새로고침한다.
4. 두 경우 모두 게임 세션이 종료된다.

---

**[STORY 12-11]** 유저가 로그아웃 확인 다이얼로그에서 '취소'를 클릭하면 로그아웃이 취소되어야 한다.

1. 유저가 confirm 다이얼로그에서 '취소(Cancel)'를 클릭한다.
2. 다이얼로그가 닫히고 아무런 동작도 발생하지 않는다.
3. 팝업 상태와 플레이어 세션이 그대로 유지된다.

---

**[STORY 12-12]** 유저는 내 정보 팝업 내 탭을 클릭하여 'Overview' / '지갑 연결(Deposit/Withdraw)' 탭을 전환할 수 있어야 한다.

1. 유저가 `.myinfo-tab` 요소를 클릭한다.
2. 모든 `.myinfo-tab`에서 `.active` 클래스를 제거한다.
3. 모든 `.myinfo-tab-content`에서 `.active` 클래스를 제거한다.
4. 클릭된 탭에 `.active`를 추가하고, 해당 탭의 `data-tab` 속성값에 대응하는 `#tab-{name}` 콘텐츠에 `.active`를 추가하여 탭 내용을 표시한다.

---

**[STORY 12-13]** 닉네임 로그인 유저는 입출금 탭(Deposit/Withdraw)을 이용할 수 없어야 한다.

1. 닉네임으로 로그인한 유저가 Deposit 또는 Withdraw 탭을 열려고 한다.
2. 해당 탭 내에는 지갑 연결 안내 메시지가 표시된다. (지갑 연결 없이는 Vault 컨트랙트와 상호작용 불가)
3. 입금/출금 버튼은 지갑 미연결 시 클릭해도 'Connect wallet first' 오류 토스트를 표시하며 트랜잭션을 진행하지 않는다.

---

### ❖ 3. 정책 및 데이터 정의

| 항목 | 정책 |
|------|------|
| 팝업 ID | `#myinfo-popup` |
| 팝업 열기 조건 | 로그인 완료 상태(`GameSocket.player` 존재) |
| 팝업 닫기 방식 | X 버튼 클릭 또는 백드롭 클릭 |
| 잔액 = | `chargedCredits + inGameCredits` |
| PnL = | `totalEarned - totalSpent` |
| PnL 양수 색상 | `var(--green)` |
| PnL 음수 색상 | `var(--red)` |
| 무료 충전 단위 | 10,000 크레딧 |
| 무료 충전 레이트 제한 | 30초 내 최대 5회 |
| 로그아웃 방식 (지갑) | `WalletAPI.disconnect()` → `walletStateChanged` 이벤트 |
| 로그아웃 방식 (닉네임) | `window.location.reload()` |

---

### ❖ 4. 의존 영역 및 영향도

| 영역 | 내용 |
|------|------|
| `public/js/ui.js` | `toggleMyInfo()`, `closeMyInfo()`, `updatePlayerInfo()`, `_requireWallet()` |
| `public/index.html` | `#myinfo-popup`, `#myinfo-btn`, `#myinfo-close-btn`, `#myinfo-logout`, `#myinfo-add-balance`, 탭 구조 |
| `server/index.js` | `getMyInfo` 소켓 이벤트 → `myInfo` 응답, `addBalance` 이벤트 |
| `server/game/Player.js` | `serializeFull()`, `totalEarned`, `totalSpent`, `chargedCredits`, `inGameCredits` |
| WalletAPI | `isConnected()`, `disconnect()`, `getAddress()` |

---

---

## ✦ [EPIC 13] USDC 입출금 서비스

### ❖ 1. 목적 및 배경

지갑을 연결한 플레이어가 USDC를 게임 크레딧으로 입금하거나, 크레딧을 USDC로 출금할 수 있는 서비스다. 입금(Deposit)은 ERC-20 Approve → Vault Deposit 2단계 트랜잭션으로 구성되며, 출금(Withdraw)은 단일 트랜잭션으로 이루어진다. 서버는 온체인 이벤트 로그를 파싱하여 크레딧을 정산한다.

**환율 정책**:
- 입금: 1 USDC → 10,000 크레딧 (크레딧 수령)
- 출금: 1 USDC 수령 시 10,500 크레딧 차감 (5% 출금 수수료)

**네트워크**: Ethereum Sepolia 테스트넷
**USDC 소수점**: 6자리 (ERC-20 표준, 1 USDC = 1,000,000 wei)

---

### ❖ 2. User Story & 상세 플로우

---

**[STORY 13-1]** 유저는 Deposit 탭을 열어 입금 UI를 확인할 수 있어야 한다.

1. 유저가 내 정보 팝업에서 'Deposit' 탭을 클릭한다.
2. Deposit 탭 콘텐츠(`#tab-deposit`)가 표시된다.
3. 탭 내에는 다음 요소가 포함된다:
   - 금액 입력 필드(`#deposit-amount`, 정수 USDC)
   - 감소 버튼(`#deposit-minus`), 증가 버튼(`#deposit-plus`)
   - 예상 크레딧 표시 영역(`#deposit-preview`: "You will receive: 0 credits")
   - 입금 버튼(`#deposit-btn`)

---

**[STORY 13-2]** 유저는 입금 금액을 직접 입력할 수 있어야 한다.

1. 유저가 `#deposit-amount` 필드에 숫자를 입력한다.
2. 시스템은 숫자 이외의 문자를 즉시 제거한다 (`/[^0-9]/g` 필터링).
3. 소수점을 포함한 입력도 제거되어 정수만 남는다.

---

**[STORY 13-3]** 금액 입력 시 예상 수령 크레딧이 실시간으로 표시되어야 한다.

1. 유저가 `#deposit-amount` 필드에 숫자를 입력할 때마다 `input` 이벤트가 발생한다.
2. 시스템은 `credits = usdc * 10000`으로 계산한다.
3. `#deposit-preview`에 "You will receive: **{credits.toLocaleString()}** credits" 형식으로 갱신된다.
4. 예시: 5 USDC 입력 시 → "You will receive: **50,000** credits"

---

**[STORY 13-4]** 유저는 + / - 버튼으로 입금 금액을 1 USDC 단위로 조정할 수 있어야 한다.

1. `#deposit-plus` 클릭 시: 현재 값에 1을 더한다 (최솟값 없음, 0+1=1부터 시작).
2. `#deposit-minus` 클릭 시: 현재 값이 1 초과일 때만 1을 뺀다 (1 미만으로 내려가지 않음).
3. 버튼 클릭 후 `input` 이벤트가 자동으로 발생하여 예상 크레딧이 갱신된다.

---

**[STORY 13-5]** 유저가 입금 버튼을 클릭하면 1단계 USDC Approve 트랜잭션이 요청되어야 한다.

1. 유저가 `#deposit-btn`을 클릭한다.
2. 시스템은 다음을 검증한다:
   - 입력값이 양의 정수인지 확인. 아닐 경우 'Enter a valid amount' error 토스트를 표시하고 중단.
   - `WalletAPI.isConnected()`가 true인지 확인. 아닐 경우 'Connect wallet first' error 토스트를 표시하고 중단.
   - `PIKIT_VAULT.CONTRACT_ADDRESS`가 `0x000...000`이 아닌지 확인. 아닐 경우 'Vault not deployed yet' error 토스트를 표시하고 중단.
3. 버튼 텍스트를 'Approving...'으로 변경하고 버튼을 비활성화(`disabled = true`)한다.
4. USDC 금액을 6자리 소수점으로 변환 (`usdcRaw = BigInt(usdcAmount * 1e6)`).
5. `eth_sendTransaction`으로 USDC 컨트랙트에 Approve 트랜잭션을 전송한다. (함수 셀렉터: `0x095ea7b3`, 대상: Vault 컨트랙트 주소, 금액: usdcRaw)

---

**[STORY 13-6]** Approve 트랜잭션 서명 후 '승인 중...' 상태가 표시되어야 한다.

1. 유저가 지갑 팝업에서 Approve 트랜잭션에 서명한다.
2. 서명이 완료되면 버튼 텍스트가 'Waiting for approval...'로 변경된다.
3. 시스템은 `_waitForReceipt(approveTxHash)`를 호출하여 2초 간격으로 `eth_getTransactionReceipt`를 폴링한다 (최대 60회 시도 = 약 2분).

---

**[STORY 13-7]** Approve 온체인 확인이 완료되면 2단계 Deposit 트랜잭션이 요청되어야 한다.

1. Approve 트랜잭션의 receipt가 반환되고 `status !== '0x0'` 조건이 충족된다.
2. 버튼 텍스트가 'Depositing...'으로 변경된다.
3. `eth_sendTransaction`으로 Vault 컨트랙트에 Deposit 트랜잭션을 전송한다. (함수 셀렉터: `0xb6b55f25` = `deposit(uint256)`, 금액: usdcRaw)

---

**[STORY 13-8]** Deposit 트랜잭션 서명 후 '입금 중...' 상태가 표시되어야 한다.

1. 유저가 지갑 팝업에서 Deposit 트랜잭션에 서명한다.
2. 버튼 텍스트가 'Confirming...'으로 변경된다.
3. 'Deposit tx sent! N USDC → N credits' success 토스트가 표시된다 (예: "Deposit tx sent! 5 USDC → 50,000 credits").
4. 시스템은 `GameSocket.syncDeposit(txHash)` 소켓 이벤트를 서버로 전송한다.

---

**[STORY 13-9]** 서버가 온체인 Deposit 이벤트를 확인하면 크레딧이 지급되어야 한다.

1. 서버는 `syncDeposit` 이벤트를 수신한다.
2. txHash 형식 검증 (`/^0x[0-9a-fA-F]{64}$/`). 형식 불일치 시 무시.
3. `processedTxHashes` Set에 동일한 txHash가 있는지 확인한다. 중복이면 'Transaction already processed' 실패 응답.
4. `provider.waitForTransaction(txHash, 1, 30000)`으로 1 컨펌 대기 (타임아웃 30초).
5. receipt의 status가 1인지 확인. 실패 트랜잭션이면 오류 응답.
6. tx의 `from` 주소가 `player.walletAddress`와 일치하는지 확인. 불일치 시 'Transaction sender mismatch' 실패 응답.
7. receipt logs에서 `Deposited(address,uint256,uint256)` 이벤트를 파싱하여 `creditsReceived` 값을 추출한다.
8. creditsToAdd ≤ 0이면 'Could not parse deposit amount from tx logs' 실패 응답.
9. `processedTxHashes`에 txHash를 등록 (리플레이 방지).
10. `player.chargedCredits += creditsToAdd`로 충전 크레딧을 증가시킨다.
11. 클라이언트에 `depositConfirmed { success: true, creditsAdded }` 및 `balanceUpdated` 이벤트를 전송한다.
12. 클라이언트는 잔액 UI를 갱신한다.

---

**[STORY 13-10]** 입금 완료 후 잔액이 즉시 갱신되어야 한다.

1. 서버의 `depositConfirmed` 이벤트가 도착한다.
2. 클라이언트는 `balanceUpdated` 이벤트 수신 시 `updatePlayerInfo(player)`를 호출한다.
3. HUD 잔액(`#my-balance`)과 Overview 탭의 `#myinfo-balance-overview`, `#myinfo-charged-overview` 등이 갱신된다.
4. 입금 금액 입력 필드(`#deposit-amount`)가 초기화되고 preview가 "You will receive: **0** credits"로 리셋된다.

---

**[STORY 13-11]** Approve 단계에서 서명을 거부하면 오류 메시지가 표시되어야 한다.

1. 유저가 지갑 팝업에서 Approve 트랜잭션을 거부(Reject)한다.
2. `window.ethereum.request` 호출이 오류를 throw한다.
3. `catch(err)` 블록이 실행되어 `err.message` 또는 'Deposit failed' error 토스트가 표시된다.
4. `finally` 블록에서 버튼이 활성화(`disabled = false`)되고 텍스트가 'Deposit'으로 복원된다.
5. 크레딧에는 아무런 변화가 없다.

---

**[STORY 13-12]** Deposit 단계에서 서명을 거부하면 오류 메시지가 표시되어야 한다.

1. Approve는 완료되었으나 유저가 Deposit 트랜잭션을 거부한다.
2. `window.ethereum.request` 호출이 오류를 throw한다.
3. `catch(err)` 블록에서 오류 토스트가 표시된다.
4. `finally` 블록에서 버튼이 복원된다.
5. Approve는 이미 온체인에서 완료되었으나 Deposit이 진행되지 않았으므로 크레딧은 지급되지 않는다.

---

**[STORY 13-13]** 입출금 진행 중 버튼이 비활성화되어야 한다.

1. `#deposit-btn` 또는 `#withdraw-btn` 클릭 직후 `disabled = true`로 설정된다.
2. 트랜잭션이 완료되거나 오류가 발생한 경우(`finally` 블록)에만 `disabled = false`로 복원된다.
3. 진행 중 중복 클릭으로 인한 다중 트랜잭션 발생을 방지한다.

---

**[STORY 13-14]** 유저는 Withdraw 탭을 열어 출금 UI를 확인할 수 있어야 한다.

1. 유저가 내 정보 팝업에서 'Withdraw' 탭을 클릭한다.
2. Withdraw 탭 콘텐츠(`#tab-withdraw`)가 표시된다.
3. 탭 내에는 다음 요소가 포함된다:
   - 금액 입력 필드(`#withdraw-amount`, 정수 USDC)
   - 감소 버튼(`#withdraw-minus`), 증가 버튼(`#withdraw-plus`)
   - 차감 크레딧 표시 영역(`#withdraw-preview`: "Will consume: 0 credits")
   - 출금 버튼(`#withdraw-btn`)

---

**[STORY 13-15]** 유저는 출금 금액을 직접 입력할 수 있어야 한다.

1. 유저가 `#withdraw-amount` 필드에 숫자를 입력한다.
2. 시스템은 숫자 이외의 문자를 즉시 제거한다 (`/[^0-9]/g` 필터링).
3. 소수점 입력은 제거되어 정수만 유지된다.

---

**[STORY 13-16]** 금액 입력 시 차감될 크레딧이 실시간으로 표시되어야 한다.

1. 유저가 `#withdraw-amount` 필드에 숫자를 입력할 때마다 `input` 이벤트가 발생한다.
2. 시스템은 `creditsNeeded = usdc * 10500`으로 계산한다 (출금 수수료 5% 포함).
3. `#withdraw-preview`에 "Will consume: **{creditsNeeded.toLocaleString()}** credits" 형식으로 갱신된다.
4. 예시: 1 USDC 출금 입력 시 → "Will consume: **10,500** credits"

---

**[STORY 13-17]** 유저는 + / - 버튼으로 출금 금액을 1 USDC 단위로 조정할 수 있어야 한다.

1. `#withdraw-plus` 클릭 시: 현재 값에 1을 더한다.
2. `#withdraw-minus` 클릭 시: 현재 값이 1 초과일 때만 1을 뺀다.
3. 버튼 클릭 후 `input` 이벤트가 자동으로 발생하여 차감 크레딧이 갱신된다.

---

**[STORY 13-18]** 유저가 출금 버튼을 클릭하면 Vault Withdraw 트랜잭션이 요청되어야 한다.

1. 유저가 `#withdraw-btn`을 클릭한다.
2. 시스템은 다음을 검증한다:
   - 입력값이 양의 정수인지 확인. 아닐 경우 'Enter a valid USDC amount (integer)' error 토스트를 표시하고 중단.
   - `WalletAPI.isConnected()`가 true인지 확인. 아닐 경우 'Connect wallet first' error 토스트를 표시하고 중단.
   - `PIKIT_VAULT.CONTRACT_ADDRESS`가 유효한지 확인. 아닐 경우 'Vault not deployed yet' error 토스트를 표시하고 중단.
   - `player.balance >= creditAmount` 조건 확인. 잔액 부족 시 'Not enough credits. Need {creditAmount}' error 토스트를 표시하고 중단.
3. 버튼 텍스트를 'Withdrawing...'으로 변경하고 비활성화한다.
4. `creditAmount = usdcAmount * 10500`을 계산한다.
5. `eth_sendTransaction`으로 Vault 컨트랙트에 Withdraw 트랜잭션을 전송한다. (함수 셀렉터: `0x2e1a7d4d` = `withdraw(uint256)`, 인자: creditAmount)

---

**[STORY 13-19]** 출금 트랜잭션 서명 후 '출금 중...' 상태가 표시되어야 한다.

1. 유저가 지갑 팝업에서 Withdraw 트랜잭션에 서명한다.
2. 'Withdraw tx sent! {creditAmount} credits → {usdcAmount} USDC' success 토스트가 표시된다 (예: "Withdraw tx sent! 10,500 credits → 1 USDC").
3. 시스템은 `GameSocket.syncWithdraw(txHash)` 소켓 이벤트를 서버로 전송한다.

---

**[STORY 13-20]** 서버가 온체인 Withdraw 이벤트를 확인하면 크레딧이 차감되어야 한다.

1. 서버는 `syncWithdraw` 이벤트를 수신한다.
2. txHash 형식 검증. 형식 불일치 시 무시.
3. `processedTxHashes` Set에서 중복 여부 확인. 중복이면 'Transaction already processed' 실패 응답.
4. `provider.waitForTransaction(txHash, 1, 30000)`으로 1 컨펌 대기.
5. receipt status 확인 및 발신자 주소 일치 검증.
6. receipt logs에서 `Withdrawn(address,uint256,uint256)` 이벤트를 파싱하여 `creditsBurned` 값을 추출한다.
7. creditsToDeduct ≤ 0이면 오류 응답.
8. `processedTxHashes`에 txHash를 등록.
9. `player.chargedCredits = Math.max(0, player.chargedCredits - creditsToDeduct)`로 크레딧을 차감한다.
10. 클라이언트에 `withdrawConfirmed { success: true, creditsDeducted }` 및 `balanceUpdated` 이벤트를 전송한다.
11. 출금 금액 입력 필드가 초기화되고 preview가 리셋된다.

---

**[STORY 13-21]** 출금 완료 후 크레딧이 즉시 차감 반영되어야 한다.

1. `balanceUpdated` 이벤트 수신 시 HUD 잔액 및 Overview 탭 수치가 갱신된다.
2. `#myinfo-charged-overview`에 차감 후 충전 크레딧 잔액이 표시된다.

---

**[STORY 13-22]** 잔액이 부족할 경우 출금 버튼 클릭 시 오류 메시지가 표시되어야 한다.

1. 유저가 보유한 크레딧보다 많은 금액의 출금을 시도한다 (`player.balance < creditAmount`).
2. 'Not enough credits. Need {creditAmount.toLocaleString()}' error 토스트가 표시된다.
3. 트랜잭션은 전송되지 않는다.

---

**[STORY 13-23]** 출금 트랜잭션 거부 시 오류 메시지가 표시되고 크레딧은 차감되지 않아야 한다.

1. 유저가 지갑 팝업에서 Withdraw 트랜잭션을 거부한다.
2. `catch(err)` 블록에서 오류 토스트가 표시된다.
3. `finally` 블록에서 버튼이 복원된다.
4. 서버는 `syncWithdraw` 이벤트를 수신하지 않으므로 크레딧은 차감되지 않는다.

---

**[STORY 13-24]** 지갑 미연결 상태에서 입출금을 시도할 경우 오류 메시지가 표시되어야 한다.

1. 유저가 지갑 미연결 상태에서 `#deposit-btn` 또는 `#withdraw-btn`을 클릭한다.
2. `WalletAPI.isConnected()` 검사 실패 시 'Connect wallet first' error 토스트를 표시한다.
3. 트랜잭션은 전송되지 않는다.

---

**[STORY 13-25]** Vault 컨트랙트가 미배포 상태일 경우 오류 메시지가 표시되어야 한다.

1. `PIKIT_VAULT.CONTRACT_ADDRESS`가 `0x0000000000000000000000000000000000000000`인 경우.
2. 입금 또는 출금 시도 시 'Vault not deployed yet' error 토스트를 표시한다.
3. 트랜잭션은 전송되지 않는다.

---

**[STORY 13-26]** 소수점 금액 입력은 자동으로 정수로 강제 변환되어야 한다.

1. 유저가 입력 필드에 소수점을 포함한 값(예: "1.5")을 입력한다.
2. `input` 이벤트 핸들러에서 `/[^0-9]/g` 정규식으로 소수점 및 비숫자 문자를 모두 제거한다.
3. 남은 값이 정수로만 구성되며, `parseInt()`로 처리된다.
4. 유효하지 않은 값(0 또는 빈 값)의 경우 입금/출금 버튼 클릭 시 오류 토스트가 표시된다.

---

**[STORY 13-27]** 동일한 트랜잭션 해시를 재사용하여 크레딧을 중복으로 획득/차감할 수 없어야 한다.

1. 서버가 `syncDeposit` 또는 `syncWithdraw` 이벤트를 수신한다.
2. 서버는 메모리 내 `processedTxHashes` Set에서 txHash 중복 여부를 확인한다.
3. 동일한 txHash가 이미 존재하면 'Transaction already processed' 실패 응답을 반환하고 크레딧을 변경하지 않는다.
4. 처리가 완료된 txHash는 즉시 Set에 등록하여 이후 재사용을 차단한다.

> **주의**: 현재 `processedTxHashes`는 인메모리 Set으로 관리되어 서버 재시작 시 초기화된다. 프로덕션 환경에서는 영구 저장소(DB)로 교체가 필요하다. (`server/index.js` 라인 59 TODO 주석 참조)

---

### ❖ 3. 정책 및 데이터 정의

| 항목 | 값 |
|------|-----|
| 입금 환율 | 1 USDC = 10,000 크레딧 |
| 출금 환율 | 1 USDC 수령 시 10,500 크레딧 차감 |
| 출금 수수료 | 5% (10,500 / 10,000 - 1) |
| USDC 소수점 | 6자리 (1 USDC = 1,000,000 = 1e6) |
| 네트워크 | Ethereum Sepolia 테스트넷 |
| 입금 최소 단위 | 1 USDC (정수만 허용) |
| 출금 최소 단위 | 1 USDC (정수만 허용) |
| Approve 함수 셀렉터 | `0x095ea7b3` (`approve(address,uint256)`) |
| Deposit 함수 셀렉터 | `0xb6b55f25` (`deposit(uint256)`) |
| Withdraw 함수 셀렉터 | `0x2e1a7d4d` (`withdraw(uint256)`) |
| Deposited 이벤트 토픽 | `Deposited(address,uint256,uint256)` |
| Withdrawn 이벤트 토픽 | `Withdrawn(address,uint256,uint256)` |
| 트랜잭션 컨펌 대기 | 1 컨펌, 타임아웃 30초 |
| 리플레이 방지 | `processedTxHashes` Set (현재 인메모리) |
| 출금 차감 대상 | `chargedCredits`만 차감 (인게임 크레딧은 출금 불가) |
| 출금 잔액 부족 | 클라이언트에서 사전 차단 (트랜잭션 불전송) |

---

### ❖ 4. 의존 영역 및 영향도

| 영역 | 내용 |
|------|------|
| `public/js/ui.js` | `_handleDeposit()`, `_handleWithdraw()`, `_waitForReceipt()` |
| `server/index.js` | `syncDeposit`, `syncWithdraw` 소켓 이벤트, `processedTxHashes` Set |
| `server/game/Player.js` | `chargedCredits`, `inGameCredits`, `balance` 프로퍼티 |
| `window.PIKIT_VAULT` | Vault 컨트랙트 주소 및 USDC 주소 (클라이언트 전역) |
| `window.WalletAPI` | `isConnected()`, `getAddress()` |
| `window.ethereum` | MetaMask/RainbowKit 프로바이더 (`eth_sendTransaction`, `eth_getTransactionReceipt`) |
| Ethers.js (서버) | `JsonRpcProvider`, `waitForTransaction`, 이벤트 ABI 디코딩 |

---

---

## ✦ [EPIC 14] 시스템(하우스) 곡괭이 서비스

### ❖ 1. 목적 및 배경

PIKIT 하우스 곡괭이(시스템 곡괭이)는 플레이어 없이도 게임 필드에서 블록을 파괴하는 자동화된 하우스 에이전트다. 이를 통해 하우스가 총 블록 보상의 일부를 수취하는 구조(하우스 엣지)를 구현한다. 시스템 곡괭이는 마젠타 색상의 거대하고 느린 곡괭이로, 플레이어 숍에는 노출되지 않는다.

---

### ❖ 2. User Story & 상세 플로우

---

**[STORY 14-1]** 게임 시작 시 PIKIT 곡괭이가 자동으로 필드에 배치되어야 한다.

1. 게임 엔진(`GameEngine.js`)이 시작되면 시스템 곡괭이 1개가 필드에 스폰된다.
2. 시스템 곡괭이는 `PICKAXE_TYPES.system` 스펙을 따른다: scale 1.5, damage 5, gravityMult 0.3, speedMult 0.1, lifetime Infinity.
3. 플레이어 접속 여부와 무관하게 항상 1개가 유지된다.
4. 시스템 곡괭이가 만료되거나 제거되면 5초 이내에 자동 재생성된다.

---

**[STORY 14-2]** PIKIT 곡괭이가 블록에 접촉하면 블록을 파괴하고 보상을 수취해야 한다.

1. 시스템 곡괭이가 블록과 충돌 감지된다.
2. 블록의 HP에서 damage(5)만큼 차감된다.
3. HP가 0 이하가 되면 블록이 파괴된다.
4. 파괴된 블록의 보상은 플레이어에게 분배되지 않는다 (하우스가 수취).
5. 해당 보상은 크레딧 경제에서 제거(burn)되어 하우스 엣지를 형성한다.

---

**[STORY 14-3]** PIKIT 곡괭이는 숍에 표시되지 않아야 한다.

1. 서버는 클라이언트에 `init` 이벤트를 전송할 때 `PICKAXE_TYPES` 오브젝트에서 `system` 키를 필터링한다.
   ```javascript
   Object.entries(PICKAXE_TYPES).filter(([key]) => key !== 'system')
   ```
2. 클라이언트가 수신한 `pickaxeTypes`에는 `system` 타입이 포함되지 않는다.
3. 숍 UI에는 basic, power, light, swift 4종만 표시된다.
4. 플레이어는 시스템 곡괭이를 구매하거나 조작할 수 없다.

---

**[STORY 14-4]** PIKIT 곡괭이는 플레이어 곡괭이와 시각적으로 구별되어야 한다.

1. 시스템 곡괭이의 색상은 `#FF00FF` (마젠타/핑크).
2. 크기는 scale 1.5로, 블록 크기(120px)의 1.5배인 180px 폭으로 렌더링된다.
3. 유저 곡괭이의 최대 크기(Power Pickaxe, scale 1.0)보다 50% 크다.
4. 매우 느린 이동 속도(speedMult 0.1)와 부유하는 듯한 낙하(gravityMult 0.3)로 움직인다.
5. 클라이언트 게임 상태(`gameState`)에 시스템 곡괭이가 포함되어 렌더링된다.

---

**[STORY 14-5]** PIKIT 곡괭이가 필드에서 제거된 후 5초 이내에 재생성되어야 한다.

1. 시스템 곡괭이가 필드를 벗어나거나 수명이 종료된다. (lifetime은 Infinity이므로 실제로는 필드 이탈 시만 해당)
2. GameEngine은 시스템 곡괭이의 부재를 감지한다.
3. 5초 이내에 시스템 곡괭이가 필드 상단에서 새로 스폰된다.
4. 시스템 곡괭이는 항상 1개만 존재하며, 수동으로 제거할 수 없다.

---

**[STORY 14-6]** 플레이어 수가 증가할수록 PIKIT 곡괭이가 블록을 가져가는 비율(스틸 레이트)이 감소해야 한다.

1. 시스템 곡괭이의 블록 조우 빈도는 약 0.65회/초로 고정된다 (scale, speed, gravity 파라미터에 의해 결정).
2. 플레이어가 많을수록 전체 조우 빈도에서 시스템 비중이 희석된다.
3. 스틸 레이트 = `0.652 / (0.652 + 플레이어 수 × 4.5)`:

| 동시 접속자 수 | PIKIT 스틸 레이트 |
|---------------|------------------|
| 3인 | 4.6% |
| 5인 | 2.8% |
| 10인 | 1.4% |
| 20인 | 0.7% |
| 40인 | 0.4% |

---

### ❖ 3. 정책 및 데이터 정의

| 파라미터 | 값 | 설명 |
|----------|-----|------|
| `scale` | 1.5 | 블록 크기(120px)의 1.5배 = 180px 폭 |
| `damage` | 5 | 1회 충돌 시 블록 HP 5 차감 |
| `gravityMult` | 0.3 | 표준 중력의 30% (매우 느린 낙하) |
| `speedMult` | 0.1 | 표준 속도의 10% (거의 수평 이동 없음) |
| `lifetime` | Infinity | 수명 무제한 (만료 없음) |
| `color` | `#FF00FF` | 마젠타 |
| `price` | 0 | 구매 불가 |
| 블록 조우 빈도 | ~0.652회/초 | 수식: `2.5 × (1.5/0.8) × 0.1^0.7 × 0.3^0.3` |
| 재생성 대기 | 5초 이내 | 필드에서 이탈 후 자동 재스폰 |
| 숍 노출 | 없음 | 서버에서 클라이언트 전송 시 필터링 |
| 보상 귀속 | 하우스 수취 (크레딧 burn) | 플레이어에게 분배 안 됨 |

---

### ❖ 4. 의존 영역 및 영향도

| 영역 | 내용 |
|------|------|
| `server/game/constants.js` | `PICKAXE_TYPES.system` 스펙 정의 |
| `server/game/GameEngine.js` | 시스템 곡괭이 스폰/재스폰 로직, 충돌 처리 |
| `server/game/Pickaxe.js` | 곡괭이 물리 및 히트박스 처리 |
| `server/index.js` | `init` 이벤트 전송 시 `system` 키 필터링 (라인 71-73) |
| `public/js/renderer.js` | 마젠타 색상 곡괭이 렌더링 |
| 경제 시스템 | 스틸 레이트가 하우스 엣지의 핵심 구성 요소 |

---

---

## ✦ 부록 A: 게임 경제 및 하우스 엣지 설계 철학

### ❖ A.1 하우스 엣지(House Edge) 개념

**하우스 엣지란?** 플레이어가 투입한 크레딧 중 하우스(운영자)가 수익으로 보유하는 비율이다.

예시:
> 플레이어가 10,000 크레딧을 소비했을 때, 평균적으로 4,700 크레딧을 돌려받는다면 하우스 엣지는 53%다.

**왜 필요한가?**
- 서버 운영 비용, 개발 비용을 충당하려면 플레이어 지출보다 수익이 많아야 한다.
- 하우스 엣지가 너무 낮으면 운영 지속이 불가능하다.
- 하우스 엣지가 너무 높으면 플레이어 이탈이 빠르다.
- PIKIT의 목표: **5인 기준 55%, 10인 기준 54%**.

**어떻게 작동하는가?**

PIKIT의 하우스 엣지는 두 가지 메커니즘으로 형성된다:
1. **곡괭이 가격 구조**: 곡괭이 구매 비용보다 블록 파괴로 얻는 기대 수익이 낮다.
2. **시스템 곡괭이 스틸**: PIKIT 곡괭이가 일부 블록을 선점하여 플레이어의 파괴 기회를 빼앗는다.

---

### ❖ A.2 목표 하우스 엣지: 5인 55%, 10인 54%

PIKIT은 초기 사용자 수가 적은 환경을 가정한다. 이 때문에 5인과 10인을 기준 플레이어 수로 설정하여 해당 구간에서 운영 지속 가능성을 보장한다.

| 동시 접속자 | 하우스 엣지 | 비고 |
|------------|------------|------|
| 3인 | ~56.8% | 소수 플레이어 — 시스템 비중 높음 |
| **5인** | **~55.3%** | **주요 운영 기준** |
| **10인** | **~53.9%** | **보조 기준** |
| 20인 | ~53.2% | 플레이어 증가로 하우스 비중 감소 |
| 40인 | ~52.8% | 안정적 운영 구간 |
| 80인 | ~52.5% | 대규모 서비스 구간 |

플레이어가 많아질수록 하우스 엣지가 소폭 감소하는 것은 설계상 자연스러운 현상이다. 시스템 곡괭이의 스틸 비율이 희석되기 때문이다.

---

### ❖ A.3 하우스 엣지 구성 요소

#### (1) 시스템 곡괭이 스틸 레이트

시스템 곡괭이는 약 0.652회/초의 빈도로 블록에 조우하여 블록 보상을 수취한다. 이 보상은 플레이어에게 귀속되지 않으므로 하우스가 수익을 얻는다.

스틸 레이트는 동시 접속자 수에 반비례한다:
```
스틸 레이트 = 0.652 / (0.652 + 플레이어 수 × 4.5)

5인:  0.652 / 23.15 = 2.8%
10인: 0.652 / 45.65 = 1.4%
```

즉, 5인 게임에서 전체 블록 보상의 2.8%가 하우스로 귀속된다.

#### (2) 블록 보상 구조 (총 투자 대비 총 보상)

곡괭이 가격 대비 블록 파괴로 기대되는 수익이 항상 낮도록 설계되었다.

**5인 기준 곡괭이별 ROI (v4.7)**:
| 곡괭이 | 가격 | 기대 수익(ROI) | 손실률 |
|--------|------|---------------|--------|
| Basic | 3,400cr | ~49.4% | ~50.6% |
| Light | 3,900cr | ~47.1% | ~52.9% |
| Swift | 3,600cr | ~51.8% | ~48.2% |
| Power | 8,800cr | ~44.9% | ~55.1% |

**가중 평균 ROI(블렌디드)**: ~44.7% → **하우스 엣지 55.3%**

이 수치는 구매 비율 가정(basic 35%, power 15%, light 20%, swift 25%, TNT 5%)과 시스템 곡괭이 스틸을 합산한 몬테카를로 시뮬레이션(60,000회 이상 반복)으로 검증되었다.

---

### ❖ A.4 세션 수익 분포 (v4.7, 10,000cr 투자 기준, 5인 게임)

| 퍼센타일 | 반환 크레딧 | ROI | 해석 |
|---------|-----------|-----|------|
| P5 | 2,510cr | 25.1% | 매우 불운한 세션 |
| **P10** | **3,123cr** | **31.2%** | **최악 보장선 (목표 ≥ 3,000)** |
| P25 | 3,947cr | 39.5% | 평균 이하 |
| **P50** | **5,132cr** | **51.3%** | **중간값 (일반 세션)** |
| P75 | 6,480cr | 64.8% | 평균 이상 |
| P90 | 8,225cr | 82.3% | 운이 좋은 세션 |
| P95 | 10,890cr | 108.9% | 수익 발생 세션 |
| Max | 15,379cr | 153.8% | 잭팟 세션 |

**해석**: 10명 중 9명은 손실로 게임을 마치지만, P10 기준 최소 3,123cr을 돌려받는다. 운이 좋은 10% 중에서는 수익이 발생한다.

---

### ❖ A.5 "일관된 보상(Consistent Rewards)" 철학 — v4.6 → v4.7

#### v4.6의 문제점
v4.6에서 일반 블록(stone, dirt, gravel, clay — 전체 필드의 60%)의 보상은 **1~5cr 랜덤**이었다. 이는 사실상 '0에 가까운 보상'이었으며, 다음 문제를 야기했다:

- 10,000cr을 소비했을 때 일반 블록만 만나면 200~300cr 수준의 수익만 발생
- P10 세션 반환액: **2,002cr** — 투입의 20% 수준
- "왜 곡괭이를 사면 아무것도 못 얻나" 는 불만 발생
- 플레이어가 '완전히 운에 달린 복권' 처럼 느낌 → 이탈 가속

#### v4.7의 해결책: "Consistent Rewards"
핵심 변경사항:
1. **일반 블록 HP를 2-3으로 낮춤** (기존 7-10) → DMG 3 이상 곡괭이로 1타에 파괴 가능
2. **일반 블록 보상을 22-28cr 고정으로 인상** (기존 1-5cr 랜덤)
3. **곡괭이 가격 ~60% 인상** → 높아진 블록 보상을 상쇄하여 하우스 엣지 유지
4. **레어 블록 보상 10% 소폭 하향** → 보상 분포 압축

#### 개선 효과
| 지표 | v4.6 | v4.7 | 변화 |
|------|------|------|------|
| P10 최악 세션 | 2,002cr | **3,123cr** | **+56%** |
| P50 중간 세션 | 5,014cr | 5,132cr | +2% |
| P90 행운 세션 | 9,172cr | 8,225cr | -10% |
| Max 잭팟 세션 | 21,987cr | 15,379cr | -30% |
| 하우스 엣지 @5p | 55.2% | 55.3% | 동일 |

#### 왜 이 방향이 옳은가
보상 분포의 "범위"가 v4.6의 19,985cr에서 v4.7의 12,256cr로 39% 압축되었다. 이것은 의도적인 설계다:

- **최악 세션 개선**: 플레이어가 '아무것도 못 얻었다'는 좌절감을 느끼지 않는다.
- **이탈 방지**: P10 플레이어(10번 중 1번 이하의 운)도 투입의 31%를 돌려받으므로 재도전 의지가 유지된다.
- **중간값 유지**: P50 수치가 거의 변하지 않아 일반 플레이어 경험은 동일하다.
- **잭팟의 꿈 유지**: P95 이상에서는 여전히 수익이 발생하므로 '대박'에 대한 기대감이 남아 있다.

---

### ❖ A.6 곡괭이별 ROI 상세 (v4.7)

#### 5인 기준
| 곡괭이 | 가격 | DMG | 수명 | ROI | 특성 |
|--------|------|-----|------|-----|------|
| Basic | 3,400cr | 3 | 30s | **49.4%** | 밸런스형, 입문용 |
| Light | 3,900cr | 4 | 35s | **47.1%** | 저중력(0.5x), 가장 긴 수명 |
| Swift | 3,600cr | 3 | 25s | **51.8%** | 1.6x 속도, 짧은 수명이나 높은 블록 조우율 |
| Power | 8,800cr | 5 | 30s | **44.9%** | 고데미지, 가장 낮은 ROI지만 블록당 파괴 효율 최고 |

#### 10인 기준 (스틸 감소로 전반적 ROI 상승)
| 곡괭이 | ROI |
|--------|-----|
| Basic | ~50.5% |
| Light | ~48.4% |
| Swift | ~52.9% |
| Power | ~46.2% |

**ROI 격차**: 최대 ~7% 이내로, 모든 곡괭이가 실용적으로 사용 가능한 수준이다.

---

### ❖ A.7 버전별 밸런스 변화 이력 (v4.3 → v4.7)

| 버전 | 날짜 | 하우스 엣지 목표 | 시스템 scale | 주요 변경 |
|------|------|-----------------|-------------|---------|
| v4.3 | — | 55% @20인 | 2.0 | 초기 밸런스 대대적 재설계 |
| v4.4 | — | 55% @20인 | 1.8 | 곡괭이 간 밸런스 균등화 |
| v4.5 | 2026-03-18 | 55% @5인 | 0.5 | 소수 플레이어 환경 최적화, 시스템 스케일 대폭 축소 |
| v4.6 | 2026-03-18 | 55% @5인 | **1.5** | "거대 PIKIT" 컨셉 — 느리지만 큰 곡괭이 (시각적 요구사항 반영) |
| **v4.7** | **2026-03-18** | **55% @5인** | **1.5** | **"일관된 보상" — 일반 블록 HP/보상 전면 개편** |

**v4.5 → v4.6 핵심 변화**: 시스템 곡괭이 scale을 0.5에서 1.5로 복원하면서, 조우율을 낮추기 위해 gravityMult를 0.7→0.3, speedMult를 0.55→0.1로 대폭 감소시켰다. 결과적으로 "거대하지만 매우 느리게 떠다니는 장애물"이라는 게임플레이 감각이 완성되었다.

---

### ❖ A.8 밸런스 조정 가이드

모든 밸런스 값은 `server/game/constants.js` 파일 하나에서 관리된다. 서버 재시작 시 반드시 Chunk.js 블록 풀 캐시가 초기화되므로 **서버 전체 재시작이 필요하다**.

#### 곡괭이 가격 조정
| 조정 방향 | 효과 |
|----------|------|
| 곡괭이 가격 인상 | 플레이어 비용 증가 → 하우스 엣지 상승 |
| 곡괭이 가격 인하 | 플레이어 비용 감소 → 하우스 엣지 하락 |

수정 위치: `PICKAXE_TYPES.{type}.price`

#### 시스템 곡괭이 파라미터 조정
| 파라미터 | 인상 시 효과 | 인하 시 효과 |
|---------|-----------|-----------|
| `speedMult` | 조우율 증가 → 스틸 증가 → HE 상승 | 조우율 감소 → 스틸 감소 → HE 하락 |
| `gravityMult` | 조우율 증가 | 조우율 감소 |
| `scale` | 조우율 증가 (히트박스 확대) | 조우율 감소 |
| `damage` | 블록 파괴 속도 증가 (간접 HE 상승) | 블록 파괴 속도 감소 |

수정 위치: `PICKAXE_TYPES.system.{parameter}`

> **주의**: `speedMult`와 `gravityMult`는 조우율 공식 `2.5 × (scale/0.8) × speedMult^0.7 × gravMult^0.3`에 비선형적으로 작용한다. 작은 조정도 스틸 레이트에 큰 영향을 미친다.

#### 블록 보상 조정
| 조정 방향 | 효과 |
|----------|------|
| 블록 보상 인상 | 플레이어 수익 증가 → 하우스 엣지 하락 |
| 블록 보상 인하 | 플레이어 수익 감소 → 하우스 엣지 상승 |

수정 위치: `BLOCK_TYPES.{type}.reward`

#### 블록 HP 조정
| 조정 방향 | 효과 |
|----------|------|
| HP 인하 | 블록 파괴 속도 증가 → 단위 시간당 보상 증가 → HE 하락 |
| HP 인상 | 블록 파괴 속도 감소 → 단위 시간당 보상 감소 → HE 상승 |

수정 위치: `BLOCK_TYPES.{type}.hp`

#### 검증 방법
밸런스 조정 후 반드시 몬테카를로 시뮬레이션으로 검증한다:
- `tools/balance-v47-sim.js`: 파라미터 스윕 (300+ 조합)
- `tools/balance-v47-final.js`: 최종 검증 (60,000회 이상)

---

---

## ✦ 부록 B: 기술 스택 및 아키텍처 개요 (PM용)

### ❖ B.1 전체 구성

| 레이어 | 기술 | 역할 |
|--------|------|------|
| 서버 | Node.js + Express 5 | HTTP 서버, 정적 파일 서빙 |
| 실시간 통신 | Socket.IO 4.8 (WebSocket) | 게임 상태 브로드캐스트, 구매/채팅 처리 |
| 클라이언트 | Vanilla JavaScript + HTML5 Canvas | 게임 렌더링, UI 인터랙션 |
| 블록체인 | Ethereum Sepolia + Ethers.js | USDC 입출금, 퀘스트 온체인 검증 |

### ❖ B.2 게임 루프 구조

- **서버 틱**: 60fps (16.67ms 간격)로 물리 연산, 충돌 감지, 게임 상태 갱신
- **클라이언트 브로드캐스트**: 20fps (50ms 간격)로 전체 게임 상태를 해당 필드 룸에 전송
- **클라이언트 렌더링**: 브라우저 requestAnimationFrame으로 최대 60fps 렌더링

### ❖ B.3 필드 격리 구조

- Normal 필드와 Hardcore 필드는 각각 독립된 `GameEngine` 인스턴스를 사용한다.
- Normal: 보상 배수 1x / Hardcore: 보상 배수 10x (비용도 10배)
- 각 필드는 별도의 Socket.IO 룸(`field:normal`, `field:hardcore`)으로 브로드캐스트가 격리된다.

### ❖ B.4 내부 해상도

게임 캔버스는 **1080×1920px** 내부 해상도로 동작하며, 실제 화면 크기에 맞게 CSS 스케일링된다. 블록 크기는 120px이며, 필드는 8열 × 16행 구성이다.

---

---

## ✦ 부록 C: 전체 크레딧 경제 요약표

### ❖ C.1 크레딧 획득 경로

| 획득 방법 | 금액 | 조건 |
|----------|------|------|
| 초기 지급 (신규 가입) | 10,000cr | 최초 1회 |
| 무료 충전 버튼 | 10,000cr | 30초 내 최대 5회 |
| USDC 입금 | 1 USDC당 10,000cr | 지갑 연결 필요 |
| 블록 파괴 보상 | 22~250,000cr | 블록 종류에 따라 다름 |
| 퀘스트 완료 보상 | 퀘스트별 상이 | 온체인 검증 필요 |
| 콤보 보너스 | 기본 보상 × 최대 1.5배 | 연속 파괴 시 |

### ❖ C.2 크레딧 소비 경로

| 소비 방법 | 금액 |
|----------|------|
| Basic Pickaxe | 3,400cr |
| Light Pickaxe | 3,900cr |
| Swift Pickaxe | 3,600cr |
| Power Pickaxe | 8,800cr |
| TNT | 8,000cr |
| USDC 출금 | 1 USDC당 10,500cr 차감 |

### ❖ C.3 USDC 환율 정책

| 방향 | 비율 | 비고 |
|------|------|------|
| 입금 | 1 USDC = 10,000cr 수령 | 수수료 없음 |
| 출금 | 1 USDC = 10,500cr 차감 | 5% 수수료 적용 |

### ❖ C.4 블록 보상 전체 요약표

| 블록 | 스폰 확률 | HP | 보상 |
|------|---------|-----|------|
| Jackpot Block | 특수 조건 | 300 | 250,000cr |
| Diamond Block | 1% | 180 | 4,500cr |
| Gold Block | 2% | 90 | 1,800cr |
| Emerald Block | 5% | 55 | 540cr |
| Iron Block | 12% | 20 | 100cr |
| Copper Block | 20% | 15 | 50cr |
| Stone | 20% | 3 | 28cr |
| Gravel | 12% | 3 | 25cr |
| Clay | 10% | 2 | 24cr |
| Dirt | 18% | 2 | 22cr |

> Jackpot Block 스폰 조건: 1,500,000cr 이상 누적 소비 + 10인 이상 접속 + 위치당 0.05% 확률

### ❖ C.5 크레딧 종류 분류

| 크레딧 종류 | 설명 | USDC 출금 가능 여부 |
|-----------|------|------------------|
| `chargedCredits` | USDC 입금 또는 무료 충전으로 획득한 크레딧 | 가능 |
| `inGameCredits` | 블록 파괴·퀘스트로 획득한 크레딧 | 불가 |
| `balance` | `chargedCredits + inGameCredits` 합산 | — |

> `inGameCredits`는 게임 내에서만 사용 가능하며, USDC로 출금할 수 없다. 출금 시 `chargedCredits`에서만 차감된다.
