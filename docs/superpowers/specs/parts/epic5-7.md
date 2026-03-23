# PIKIT 기능 명세서 — EPIC 5~7

> 기준 버전: v4.7 | 작성일: 2026-03-18

---

## ✦ [EPIC 5] 곡괭이 구매 및 채굴 서비스

### ❖ 1. 목적 및 배경

- 배경: PIKIT의 핵심 플레이 루프는 "크레딧을 지불하고 곡괭이를 구매 → 곡괭이가 자동으로 낙하하며 블록을 파괴 → 파괴한 블록의 보상을 수령"하는 사이클이다. 유저는 곡괭이를 구매하는 것 외에 조작할 수 없으며, 이후 진행은 완전히 서버 물리 시뮬레이션에 의존한다.
- 목적: 유저가 숍 UI를 통해 4종 곡괭이를 구매하고, 해당 곡괭이가 필드에서 낙하·채굴·수명 만료 사이클을 완수할 수 있도록 한다. 멀티플레이 환경에서 최대 3개까지 동시 운용할 수 있어야 한다.

---

### ❖ 2. User Story & 상세 플로우

#### [STORY 5-1] 유저는 숍 패널을 열어 구매 가능한 곡괭이 목록을 확인할 수 있어야 한다.

1. 유저가 화면 하단 HUD의 **[SHOP]** 버튼을 탭/클릭한다.
2. `UI.toggleShop()` 호출 → 먼저 `_requireWallet()` 검사를 수행한다.
   - 로그인되어 있으면 3단계로 진행한다.
   - 로그인이 안 되어 있으면 [STORY 5-8]로 분기한다.
3. 이미 열린 다른 패널(메뉴 등)이 있으면 자동으로 닫힌다.
4. `#shop-panel` 엘리먼트에 `open` 클래스가 추가되어 숍 패널이 슬라이드 인 된다.
5. `#panel-backdrop`에 `show` 클래스가 추가되어 반투명 배경이 표시된다.
6. 숍 패널 내부에 `UI.renderShop()` 결과가 렌더링되어 있다:
   - 상단: **Active Pickaxes: N/3** (현재 보유 곡괭이 수 표시; 3개이면 빨간색으로 표시)
   - 곡괭이 목록: Basic / Light / Swift / Power 각각 카드 형태로 표시
   - 각 카드: 픽셀아트 아이콘, 이름, 가격(현재 필드 배율 적용), 설명 텍스트
   - TNT 목록: TNT 카드 (아이콘, 이름, 가격, "Explodes on contact | 30dmg")
   - 내 정보: 닉네임, 잔액, 총 획득, 수익

---

#### [STORY 5-2] 유저는 숍 패널을 닫을 수 있어야 한다 — X 버튼으로 닫기

1. 유저가 숍 패널 상단의 **[×]** 버튼을 클릭한다.
2. `UI.closeShop()` 호출 → `#shop-panel`에서 `open` 클래스가 제거된다.
3. 다른 패널(메뉴 등)이 열려 있지 않으면 `#panel-backdrop`에서 `show` 클래스도 제거된다.
4. 패널이 슬라이드 아웃 되어 사라진다.

---

#### [STORY 5-3] 유저는 백드롭 클릭으로 숍 패널을 닫을 수 있어야 한다.

1. 숍 패널이 열린 상태에서 유저가 패널 외부의 반투명 백드롭 영역을 클릭한다.
2. `panel-backdrop` click 핸들러가 `UI.closeShop()` 및 `UI.closeMenu()` 등을 동시에 호출한다.
3. 모든 오버레이 패널이 닫힌다.
4. 배경 백드롭도 사라진다.

---

#### [STORY 5-4] 유저는 각 곡괭이의 상세 스펙을 숍 패널에서 확인할 수 있어야 한다.

4종 곡괭이의 숍 카드에 표시되는 정보는 다음과 같다:

| 곡괭이 | 표시 이름 | Normal 가격 | Hardcore 가격 | 설명 텍스트 |
|--------|-----------|-------------|---------------|-------------|
| Basic Pickaxe | Basic Pickaxe | 3,400cr | 34,000cr | DMG 3 \| 30s \| Standard gravity & speed. A reliable all-rounder for beginners. |
| Power Pickaxe | Power Pickaxe | 8,800cr | 88,000cr | DMG 5 \| 30s \| Oversized head deals heavy damage. Best block-per-second ratio. |
| Light Pickaxe | Light Pickaxe | 3,900cr | 39,000cr | DMG 4 \| 35s \| 0.5x gravity — floats slowly. Longest lifetime, stays airborne longer. |
| Swift Pickaxe | Swift Pickaxe | 3,600cr | 36,000cr | DMG 3 \| 25s \| 1.6x speed — hits many more blocks. Lower damage but higher total output. |

아이콘은 Renderer가 캐싱한 8-bit 픽셀아트 캔버스 이미지(36×36px)가 사용된다. 캐시가 없을 경우 해당 곡괭이 색상의 색상 박스로 대체된다.

---

#### [STORY 5-5] 유저는 Normal 필드에서 곡괭이를 정상 구매할 수 있어야 한다.

1. 숍 패널에서 원하는 곡괭이 카드를 클릭한다.
2. `GameSocket.buyPickaxe(type)` 소켓 이벤트 `buyPickaxe`가 서버로 전송된다.
3. 서버 `GameEngine.buyPickaxe()` 실행:
   - a. 유효하지 않은 타입이면 즉시 에러 반환
   - b. 현재 필드에서 해당 유저의 만료되지 않은 곡괭이 수 확인 → 3개 이상이면 에러 반환
   - c. `effectivePrice = def.price × rewardMultiplier(1.0)` 계산
   - d. 유저 잔액이 부족하면 에러 반환
   - e. `player.spend(price)` → 잔액 차감, 지출 기록
   - f. 잭팟 추적용 `trackCreditSpent(price)` 호출
   - g. `Pickaxe` 인스턴스 생성: 카메라 위 `-화면높이/2` y좌표, 빈 열(empty column) X 좌표로 스폰
   - h. `pickaxes` Map에 등록, `player.activePickaxes`에 ID 추가
4. 서버가 `buyResult` 이벤트로 `{ success: true, pickaxe: {...} }` 반환
5. 클라이언트 잔액 UI가 즉시 갱신된다.
6. 캔버스 상단 외부 영역에서 곡괭이가 등장하여 아래로 낙하하기 시작한다 (20fps 브로드캐스트 스트림에 포함)

---

#### [STORY 5-6] 유저는 Hardcore 필드에서 곡괭이를 구매할 수 있어야 한다 (가격 10배).

1. 유저가 필드 토글을 Hardcore로 전환한 상태에서 숍을 열어 곡괭이를 구매한다.
2. `rewardMultiplier = 10` 이므로 `effectivePrice = def.price × 10`:
   - Basic: 34,000cr / Power: 88,000cr / Light: 39,000cr / Swift: 36,000cr
3. 숍 카드에도 배율이 적용된 가격이 표시된다 (`effectivePrice.toLocaleString() + ' credits'`)
4. 구매 성공 시 블록 파괴 보상도 10배 적용된다 (`finalReward = reward × comboMult × 10`)
5. 나머지 플로우는 [STORY 5-5]와 동일하다.

---

#### [STORY 5-7] 유저는 잔액 부족으로 구매에 실패할 수 있다.

1. 유저가 잔액보다 비싼 곡괭이 카드를 클릭한다.
2. 서버에서 `player.canAfford(effectivePrice)` 검사 실패 → `{ error: 'Insufficient balance' }` 반환
3. 클라이언트가 `buyResult` 이벤트에서 에러를 수신한다.
4. 토스트 알림이 표시된다: **"Insufficient balance"** (error 타입, 3초 후 자동 소멸)
5. 잔액 변동 없음. 숍 패널은 그대로 열려 있다.

---

#### [STORY 5-8] 유저는 미로그인 상태에서 숍 오픈을 시도할 경우 지갑 연결 안내를 받아야 한다.

1. 로그인하지 않은 상태에서 **[SHOP]** 버튼을 클릭한다.
2. `_requireWallet()` 검사 실패 (GameSocket.player가 null)
3. 지갑 API 상태에 따라 분기:
   - 지갑이 연결되어 있으나 게임 로그인이 안 된 경우: `walletLoginRequested` 이벤트 발행, 토스트 "Logging in..."
   - 지갑 자체가 미연결: `WalletAPI.connect()` 호출 → RainbowKit 연결 모달 팝업
   - 지갑 API 미로드: 토스트 "Wallet loading... please try again"
4. 숍 패널은 열리지 않는다.

---

#### [STORY 5-9] 유저는 3개 한도 초과로 구매에 실패할 수 있다.

1. 현재 필드에서 이미 만료되지 않은 곡괭이가 3개 운용 중인 상태에서 추가 구매를 시도한다.
2. 서버 검사: `activeCount >= 3` → `{ error: 'Max 3 pickaxes per field! Wait for one to expire.' }` 반환
3. 클라이언트 토스트: **"Max 3 pickaxes per field! Wait for one to expire."** (error 타입)
4. 숍 카드 상단의 **"Active Pickaxes: 3/3"** 표시가 빨간색으로 강조되어 있다.
5. 잔액 변동 없음.

---

#### [STORY 5-10] 유저는 구매한 곡괭이가 필드에서 낙하 시작하는 것을 화면에서 확인할 수 있어야 한다.

1. 구매 성공 직후 서버 GameEngine이 카메라Y - 화면높이/2 위치에 곡괭이를 생성한다.
2. X 위치는 빈 열(empty column)을 우선 선택, 없으면 랜덤 좌표로 배치된다.
3. 초기 속도: `vx = (random - 0.5) × 300 × speedMult`, `vy = (50 + random×100) × speedMult`
4. 서버 60fps 틱에서 중력(`400px/s² × gravityMult`)이 매 프레임 누적된다.
5. 20fps 브로드캐스트로 클라이언트에 곡괭이 상태(`x, y, rotation, timeLeft`)가 전달된다.
6. 캔버스에서 유저 소유 곡괭이가 회전하며 하강하는 모습이 실시간으로 표시된다.
7. 타임바(timeLeft / lifetime %)가 곡괭이 카드에 시각적으로 표시된다.

---

#### [STORY 5-11] 유저는 곡괭이가 블록에 충돌하여 튕기는 동작을 화면에서 확인할 수 있어야 한다.

1. 서버 tick에서 `pickaxe.collidesWith(block)` → 14포인트 회전 히트박스 검사 수행
2. 충돌이 감지되면:
   - a. `block.takeDamage(pickaxe.damage, now)` 호출
   - b. `pickaxe.bounceOff(block)` 호출: 충돌 방향(상/하/좌/우)에 따라 속도 반전 + `bounceEnergy` 기반 랜덤 편향 적용
   - c. 충돌 후 `angularVelocity` 변경으로 스핀 효과 부여
3. 블록이 파괴된 경우: 보상 계산 후 `player.earn()` ([STORY 5-12] 참조)
4. 블록이 파괴되지 않은 경우(잔여 HP > 0): 블록의 파괴 단계(0-9)만 업데이트 (크랙 비주얼)
5. 한 틱에 하나의 블록만 처리 (`break` 로직으로 다중 충돌 방지)
6. 20fps 브로드캐스트에 갱신된 곡괭이 좌표, 회전값, 블록 HP가 포함된다.

---

#### [STORY 5-12] 유저는 블록 파괴 시 크레딧 보상을 실시간으로 수령해야 한다.

1. 블록 HP가 0 이하가 되어 `block.destroyed = true` 설정, `getReward()` 반환
2. 시스템 곡괭이 소유가 아닌 경우에 한해:
   - 콤보 배율 계산: 마지막 히트 후 2,000ms 이내이면 콤보 카운터 증가
     - 콤보 단계: [0, 3, 6, 10, 15, 25]번째 블록 → 배율 [1x, 1.05x, 1.1x, 1.2x, 1.35x, 1.5x]
   - `finalReward = round(reward × comboMult × rewardMultiplier)`
   - `player.earn(finalReward, blockName)` 호출 → 총 획득 크레딧 누적
   - `pickaxe.addReward(finalReward)` → 해당 곡괭이의 누적 보상 및 파괴 블록 수 기록
3. 클라이언트 HUD 잔액(`#my-balance`)이 즉시 갱신된다.
4. 보상이 >= 1,000cr인 경우 잭팟 피드에 항목 추가 (화면 우측 스크롤 리스트)
5. 파괴된 블록은 다음 브로드캐스트에서 `destroyed: true`로 전달되어 캔버스에서 사라진다.

---

#### [STORY 5-13] 유저는 곡괭이 수명 만료 시 결과 알림을 수신해야 한다.

1. 서버 tick에서 `Date.now() - pickaxe.createdAt > pickaxe.lifetime` 조건 충족 → `pickaxe.expired = true`
2. `_expirePickaxe(pickaxe)` 실행:
   - `player.activePickaxes` 배열에서 해당 ID 제거
   - 소유자 소켓에 `pickaxeExpired` 이벤트 전송: `{ pickaxeId, type, totalReward, blocksDestroyed }`
3. `pickaxes` Map에서 삭제됨 → 다음 브로드캐스트부터 해당 곡괭이 미전송
4. 클라이언트에서 `pickaxeExpired` 이벤트 수신:
   - 토스트 또는 알림 UI에 결과 표시: 곡괭이 타입, 총 획득 크레딧, 파괴한 블록 수
5. 숍 패널의 **Active Pickaxes: N/3** 카운터가 감소한다.
6. 수명 특이사항:
   - Basic / Power: 30,000ms (30초)
   - Light: 35,000ms (35초)
   - Swift: 25,000ms (25초)
   - System (PIKIT): `Infinity` — 수명 없음, 절대 만료되지 않음

---

#### [STORY 5-14] 유저는 여러 곡괭이를 동시에 운용할 수 있어야 한다 (최대 3개).

1. 유저가 첫 번째 곡괭이 구매 후 숍을 다시 열면 **Active Pickaxes: 1/3** 표시 확인
2. 두 번째 곡괭이를 구매 → 화면에 2개 곡괭이가 동시에 낙하
3. 세 번째 곡괭이를 구매 → **Active Pickaxes: 3/3** (빨간색)
4. 세 곡괭이 모두 독립적으로 물리 시뮬레이션됨: 각각의 충돌, 반동, 콤보 타이머 분리
5. 세 번째 구매 후 추가 구매 시도 → [STORY 5-9] 에러 분기
6. 하나가 만료되면 즉시 카운터 감소 → 다시 구매 가능

---

#### [STORY 5-15] Swift 곡괭이의 빠른 이동 특성이 게임 내에서 확인되어야 한다.

1. 유저가 Swift Pickaxe(3,600cr)를 구매한다.
2. `speedMult = 1.6` 적용:
   - 초기 속도: `vx = (random - 0.5) × 300 × 1.6`, `vy = (50 + random×100) × 1.6`
   - 최소 반동 속도: `minBounceSpeed = 150 × 1.6 = 240px/s`
   - 반동 에너지: `bounceEnergy = 200 × 1.6 = 320`
3. 중력 배율은 1.0(표준)이나 속도 배율이 높아 더 활발하게 좌우로 이동한다.
4. 25초(25,000ms) 수명 내에 일반 곡괭이보다 더 많은 블록과 접촉한다.
5. 숍 카드에 설명: "DMG 3 | 25s | 1.6x speed — hits many more blocks. Lower damage but higher total output."

---

#### [STORY 5-16] Light 곡괭이의 낮은 중력 특성이 게임 내에서 확인되어야 한다.

1. 유저가 Light Pickaxe(3,900cr)를 구매한다.
2. `gravityMult = 0.5` 적용:
   - 매 틱 중력 누적: `vy += 400 × 0.5 × dt = 200 × dt` (표준의 절반)
   - 단말 속도: `450 × 0.7 = 315px/s` (gravityMult < 1이면 70% 적용)
3. 화면에서 다른 곡괭이보다 훨씬 느리게 낙하하여 "부유하는" 듯한 움직임 확인
4. 35초(35,000ms) 수명으로 4종 중 가장 오래 활동한다.
5. 숍 카드에 설명: "DMG 4 | 35s | 0.5x gravity — floats slowly. Longest lifetime, stays airborne longer."

---

#### [STORY 5-17] Power 곡괭이로 고HP 블록을 공략할 수 있어야 한다.

1. 유저가 Power Pickaxe(8,800cr)를 구매한다.
2. `damage = 5` 적용: Diamond Block(HP 180)을 36타, Gold Block(HP 90)을 18타, Iron Block(HP 20)을 4타에 파괴 가능
3. 일반 블록(HP 2-3)은 1타로 즉시 파괴 (HP <= damage → 즉시 파괴)
4. 스케일 1.0 (96px × 96px) — 4종 유저 곡괭이 중 가장 크다
5. 숍 카드에 설명: "DMG 5 | 30s | Oversized head deals heavy damage. Best block-per-second ratio."
6. 고HP 블록(Diamond/Gold)에 여러 번 히트 시 블록의 크랙 단계(0-9)가 점진적으로 증가하는 비주얼 확인

---

### ❖ 3. 정책 및 데이터 정의

#### 곡괭이 스펙 (v4.7 기준)

| 타입 | 이름 | Normal 가격 | HC 가격 | DMG | 스케일 | 중력 배율 | 속도 배율 | 수명 |
|------|------|------------|---------|-----|--------|----------|----------|------|
| basic | Basic Pickaxe | 3,400cr | 34,000cr | 3 | 0.8 (96px) | 1.0x | 1.0x | 30s |
| power | Power Pickaxe | 8,800cr | 88,000cr | 5 | 1.0 (120px) | 1.0x | 1.0x | 30s |
| light | Light Pickaxe | 3,900cr | 39,000cr | 4 | 0.7 (84px) | 0.5x | 1.0x | 35s |
| swift | Swift Pickaxe | 3,600cr | 36,000cr | 3 | 0.75 (90px) | 1.0x | 1.6x | 25s |
| system | PIKIT | 0 (자동) | — | 5 | 1.5 (180px) | 0.3x | 0.1x | Infinity |

#### 핵심 정책

- 필드당 최대 3개 곡괭이 동시 운용 (시스템 곡괭이 제외)
- Hardcore 필드: 구매 가격 10배, 블록 보상 10배 (동일한 `rewardMultiplier` 변수 적용)
- 시스템 곡괭이(PIKIT)는 5초마다 자동 생성(SYSTEM_PICKAXE_TARGET=1 유지), 숍에 노출 안 됨
- 초기 잔액: 10,000cr
- 곡괭이 스폰 위치: `cameraY - INTERNAL_HEIGHT/2` (카메라 위 960px)
- 물리 상수: GRAVITY=400px/s², TERMINAL_VELOCITY=450px/s, BLOCK_SIZE=120px
- 충돌 히트박스: 14포인트 곡괭이 형태 (헤드 7포인트 + 손잡이 5포인트 + 접합부 2포인트), 회전 반영

#### 예외/에러 상황

| 상황 | 에러 메시지 | 처리 방식 |
|------|------------|----------|
| 잔액 부족 | "Insufficient balance" | 토스트 error, 구매 취소 |
| 3개 한도 초과 | "Max 3 pickaxes per field! Wait for one to expire." | 토스트 error, 구매 취소 |
| 미로그인 | (지갑 연결 요청) | 지갑 모달 or 토스트 info |
| 잘못된 타입 | "Invalid pickaxe type" | 토스트 error |
| 'system' 타입 직접 구매 시도 | "Invalid pickaxe type" | 토스트 error |

---

### ❖ 4. 의존 영역 및 영향도

- `server/game/constants.js` — PICKAXE_TYPES (가격, DMG, 물리 배율, 수명)
- `server/game/Pickaxe.js` — 물리 시뮬레이션, 충돌 히트박스, 수명 추적
- `server/game/GameEngine.js` — buyPickaxe(), _expirePickaxe(), _checkPickaxeCollisions(), 콤보 시스템
- `server/game/Player.js` — spend(), earn(), canAfford(), activePickaxes
- `public/js/ui.js` — toggleShop(), renderShop(), showToast(), _requireWallet()
- `public/js/main.js` — pickaxeExpired 이벤트 수신
- 영향 범위: 잔액 변동 → HUD 갱신, 숍 카운터, 잭팟 피드, 리더보드 수익 집계

---
---

## ✦ [EPIC 6] TNT 구매 및 폭발 서비스

### ❖ 1. 목적 및 배경

- 배경: TNT는 범위 폭발로 여러 블록을 동시에 파괴하는 고가의 유틸리티 아이템이다. 단일 블록 채굴과 달리 광역 피해를 주지만 기대 ROI는 약 3%로 매우 낮다. 전략적 상황(고HP 블록 밀집 지역, 다이아몬드 블록 근처)에서 활용도가 높다.
- 목적: 유저가 숍 UI에서 TNT를 구매하고, 해당 TNT가 필드에서 낙하 후 블록에 닿는 즉시 폭발하여 범위 내 블록에 피해를 주고 보상을 수령하는 흐름을 완수할 수 있도록 한다.

---

### ❖ 2. User Story & 상세 플로우

#### [STORY 6-1] 유저는 숍 패널에서 TNT의 가격, 공격력, 폭발 범위를 확인할 수 있어야 한다.

1. 숍 패널 하단 TNT 섹션에 TNT 카드가 렌더링된다.
2. 카드 표시 내용:
   - 36×36px TNT 픽셀 아이콘 (빨간 박스 + "TNT" 텍스트)
   - 이름: **TNT**
   - 가격: **8,000 credits** (Normal) / **80,000 credits** (Hardcore)
   - 설명: **"Explodes on contact | 30dmg"**
3. 폭발 범위 상세 (숍에 직접 표시되지 않지만 블록 가이드/메뉴에서 확인 가능):
   - 가로: 중심 ±2블록 = 5블록 너비
   - 세로: 위 2블록 + 아래 3블록 = 총 6블록 높이 (비대칭)

---

#### [STORY 6-2] 유저는 Normal 필드에서 TNT를 정상 구매할 수 있어야 한다.

1. 숍 패널에서 TNT 카드를 클릭한다.
2. `GameSocket.buyTNT('tnt')` 소켓 이벤트 전송
3. 서버 `GameEngine.buyTNT()` 실행:
   - a. 타입 유효성 검사
   - b. `effectivePrice = 8000 × 1.0 = 8,000cr`
   - c. 잔액 검사: 부족하면 에러 ([STORY 6-4] 분기)
   - d. `player.spend(8000)` → 잔액 차감
   - e. `trackCreditSpent(8000)` → 잭팟 카운터 누적
   - f. 랜덤 X(벽 두께 경계 내), `y = cameraY - INTERNAL_HEIGHT/2` 위치에 TNT 생성
   - g. `tnts` Map에 등록
4. `buyResult` 이벤트로 성공 반환
5. 클라이언트 잔액 갱신, 캔버스 상단에서 TNT가 낙하 시작 (중력 400px/s², 터미널 450px/s)
6. TNT는 낙하 중 박동(pulse) 애니메이션이 표시된다.

---

#### [STORY 6-3] 유저는 Hardcore 필드에서 TNT를 구매할 수 있어야 한다 (80,000cr).

1. Hardcore 필드에서 TNT 카드를 클릭한다.
2. `effectivePrice = 8000 × 10 = 80,000cr`
3. 숍 카드 가격 표시: **"80,000 credits"**
4. 구매 성공 시 TNT 폭발 보상도 10배 적용 (`totalReward × rewardMultiplier`)
5. 나머지 플로우는 [STORY 6-2]와 동일하다.

---

#### [STORY 6-4] 유저는 잔액 부족으로 TNT 구매에 실패할 수 있다.

1. 잔액이 8,000cr(Normal) 또는 80,000cr(Hardcore) 미만인 상태에서 TNT를 구매 시도한다.
2. 서버: `canAfford()` 실패 → `{ error: 'Insufficient balance' }` 반환
3. 클라이언트 토스트: **"Insufficient balance"** (error 타입, 3초)
4. 잔액 변동 없음.

---

#### [STORY 6-5] TNT가 필드에서 낙하하여 블록에 충돌하면 즉시 폭발해야 한다.

1. 서버 tick에서 TNT가 낙하 중 (`tnt.landed = false, tnt.exploded = false`) → `_checkTNTCollisions()` 수행
2. AABB 충돌 감지: `tnt.collidesWith(block)` → 충돌 시 `tnt.stopOn(block)`:
   - `tnt.y = block.y - tnt.height`
   - `tnt.vy = 0`
   - `tnt.landed = true`
3. 다음 tick `tnt.update()` 실행 시 `landed = true` → `tnt.exploded = true`
4. `_handleExplosion(tnt, now)` 호출:
   - 폭발 효과(`explosion`) 이펙트 큐에 추가
   - 반경 내 모든 블록에 피해 적용
5. `tnt.explodedAt = now` 기록, 500ms 후 `tnts` Map에서 제거
6. 클라이언트에 `explosions` 배열로 폭발 비주얼 전달

---

#### [STORY 6-6] TNT 폭발 범위 내 일반 블록이 파괴되고 보상이 지급되어야 한다.

1. `_handleExplosion()` 내부에서 주변 청크(±2) 내 모든 블록 순회
2. `tnt.isInExplosionRange(block)` 검사:
   - 가로 거리: `|centerX - blockCenterX| <= radiusX(2) × 120 = 240px` (±2블록)
   - 아래 거리: `blockCenterY - centerY <= radiusDown(3) × 120 = 360px`
   - 위 거리: `centerY - blockCenterY <= radiusX(2) × 120 = 240px`
3. 범위 내 블록에 `effectiveDamage = 30` 적용 (TNT 저항 없는 블록)
4. Common 블록(HP 2-3): DMG 30 → 즉시 파괴, 보상 22-28cr 누적
5. `totalReward` 합산 후 `Math.round(totalReward × rewardMultiplier)` 적용
6. `player.earn(totalReward)` 호출
7. 폭발 총 보상이 5,000cr 이상이면 잭팟 피드에 항목 추가

---

#### [STORY 6-7] TNT 저항 블록(Diamond/Gold/Emerald)은 40% 피해만 적용되어야 한다.

1. 폭발 범위 내 `block.tntResist = true`인 블록(Diamond, Gold, Emerald) 감지
2. `effectiveDamage = Math.floor(30 × 0.4) = 12` 로 감소 적용
3. Diamond Block (HP 180): 12 피해 → HP 168로 감소, 미파괴
4. Gold Block (HP 90): 12 피해 → HP 78로 감소, 미파괴
5. Emerald Block (HP 55): 12 피해 → HP 43으로 감소, 미파괴
6. Iron Block (HP 20): `tntResist = false` → DMG 30 적용, HP <= 0 → 즉시 파괴, 보상 100cr
7. 저항 블록 파괴 시 추가 TNT나 곡괭이가 필요하다는 사실이 블록 가이드에서 확인 가능

---

#### [STORY 6-8] TNT로 잭팟 블록을 공격할 경우 HP 감소만 적용되고 즉시 파괴는 불가해야 한다.

1. Jackpot Block은 `tntResist = true` (HP 300)
2. TNT 폭발 시 `effectiveDamage = Math.floor(30 × 0.4) = 12` 적용 → HP 288로 감소
3. 잭팟 블록은 미파괴 상태로 유지된다 (HP > 0)
4. 여러 TNT를 연속 사용해도 최소 25회 폭발(+직접 타격 조합)이 필요
5. 클라이언트에서 잭팟 블록의 파괴 단계(stage)가 점진적으로 업데이트된다.

---

#### [STORY 6-9] TNT 폭발 총 보상이 5,000cr 이상일 경우 잭팟 피드에 노출되어야 한다.

1. `_handleExplosion()` 내부에서 `totalReward >= 5000` 조건 충족 시:
2. `jackpots` 배열에 항목 추가: `{ playerName, blockName: 'TNT Explosion', reward: totalReward, time }`
3. 다음 `broadcast()`에서 `jackpots.slice(-5)`가 클라이언트로 전송
4. 클라이언트 잭팟 피드(화면 우측)에 항목이 스크롤되어 표시된다.
5. 잭팟 피드는 최근 5개만 표시, 총 20개 초과 시 오래된 항목 정리

---

#### [STORY 6-10] 유저는 여러 TNT를 연속으로 구매할 수 있어야 한다.

1. TNT 구매에는 수량 제한이 없다 (곡괭이처럼 3개 한도 없음)
2. 유저가 TNT 카드를 연속으로 클릭하면 매번 새 TNT가 생성된다.
3. 각 TNT는 독립적인 랜덤 X 좌표에서 낙하 시작한다.
4. 여러 TNT가 동시에 캔버스에 표시될 수 있다.
5. 서버의 `tnts` Map이 폭발 후 500ms 내에 정리된다 (`tnt.removed = true`).

---

#### [STORY 6-11] 유저가 접속 해제 시 소유 중인 TNT가 서버에서 정리되어야 한다.

1. 유저 소켓이 끊기면 `GameEngine.removePlayer(socketId)` 호출
2. `tnts` Map을 순회하여 `tnt.ownerId === socketId`인 항목 모두 삭제
3. 미폭발 TNT도 즉시 제거 (잔여 폭발 없음)
4. 보상 지급 없음 (플레이어가 이미 접속 해제 상태)

---

### ❖ 3. 정책 및 데이터 정의

#### TNT 스펙 (v4.7 기준)

| 항목 | 값 |
|------|-----|
| 가격 (Normal) | 8,000cr |
| 가격 (Hardcore) | 80,000cr |
| 공격력 | 30 |
| TNT 저항 블록 피해 배율 | 40% (effectiveDamage = 12) |
| 폭발 가로 반경 | ±2블록 (총 5블록 너비) |
| 폭발 위 반경 | 2블록 |
| 폭발 아래 반경 | 3블록 |
| 총 폭발 영역 | 5블록 너비 × 최대 6블록 높이 (비대칭) |
| 폭발 트리거 | 블록 접촉 즉시 (퓨즈 타이머 없음) |
| 폭발 후 제거 | explodedAt 기준 500ms 후 |
| 구매 제한 | 없음 |
| 기대 ROI | ~3% |

#### TNT 저항 블록

| 블록 | tntResist | TNT 피해 | 결과 |
|------|-----------|---------|------|
| Jackpot Block | true | 12 | HP 감소만 (300-12=288) |
| Diamond Block | true | 12 | HP 감소만 (180-12=168) |
| Gold Block | true | 12 | HP 감소만 (90-12=78) |
| Emerald Block | false | 30 | HP 55-30=25 (미파괴) |
| Iron Block | false | 30 | 즉시 파괴 (HP 20) |
| Copper Block | false | 30 | 즉시 파괴 (HP 15) |
| Stone/Dirt/Gravel/Clay | false | 30 | 즉시 파괴 (HP 2-3) |

*주의: Emerald Block은 코드상 `tntResist` 없음 (false). TNT DMG 30 > HP 55 이므로 파괴됨. 블록 가이드와 동기화 필요.*

#### 예외/에러 상황

| 상황 | 처리 방식 |
|------|----------|
| 잔액 부족 | 토스트 error "Insufficient balance" |
| 미로그인 | 지갑 연결 요청 |
| 유저 접속 해제 | 미폭발 TNT 즉시 제거, 보상 없음 |
| 폭발 이펙트 큐 50개 초과 | 새 이펙트 추가 안 함 (hard cap) |

---

### ❖ 4. 의존 영역 및 영향도

- `server/game/constants.js` — TNT_TYPES (가격, 공격력, 범위)
- `server/game/TNT.js` — 낙하 물리, 충돌, 폭발 범위 검사
- `server/game/GameEngine.js` — buyTNT(), _checkTNTCollisions(), _handleExplosion()
- `server/game/Block.js` — takeDamage(), tntResist 속성
- `server/game/Player.js` — spend(), earn()
- `public/js/ui.js` — renderShop() TNT 섹션, showToast()
- 영향 범위: 잔액 차감, 블록 파괴(HP 변동), 잭팟 피드, `creditsSinceLastJackpot` 추적

---
---

## ✦ [EPIC 7] 블록 보상 및 알림 서비스

### ❖ 1. 목적 및 배경

- 배경: PIKIT 필드에는 10종의 블록(+ Bedrock 벽)이 가중치에 따라 랜덤하게 배치된다. 블록마다 HP, 보상, TNT 저항이 다르며 일부 희귀 블록(Diamond/Gold)은 등장 시 전체 유저에게 배너 알림을 표시한다. v4.7에서 일반 블록의 HP를 2-3으로 낮추고 보상을 22-28cr 고정값으로 올려 "일관된 보상(Consistent Rewards)" 시스템을 도입했다.
- 목적: 유저가 블록 가이드를 통해 각 블록의 스펙을 확인하고, 블록 파괴 시 즉각적인 보상을 받으며, 희귀 블록 등장/파괴 알림을 통해 필드 상황을 인지할 수 있도록 한다.

---

### ❖ 2. User Story & 상세 플로우

#### [STORY 7-1] 유저는 메뉴 패널을 열어 블록 가이드를 확인할 수 있어야 한다.

1. 유저가 HUD의 **[MENU]** 버튼을 클릭한다.
2. `UI.toggleMenu()` 실행 → 열린 숍/퀘스트 패널 자동 닫힘
3. `#menu-panel`에 `open` 클래스 추가 → 패널 슬라이드 인
4. 패널 내부에 블록 가이드(`#block-guide`) 섹션이 포함된다.
5. `UI.renderBlockGuide(blockTypes)` 결과:
   - Bedrock 제외 10종 블록 목록
   - 정렬 순서: 고정 보상(fixed) 블록 먼저, 높은 보상 순
   - 각 항목: 24×24px 픽셀아트 블록 아이콘, 블록 이름, 보상(cr), 등장 확률(%)

---

#### [STORY 7-2] 유저는 메뉴 패널을 닫을 수 있어야 한다.

1. **[×]** 버튼 클릭 → `UI.closeMenu()` → `#menu-panel`에서 `open` 클래스 제거
2. 숍 패널이 열려 있지 않으면 백드롭도 제거된다.
3. 백드롭 클릭으로도 닫힌다 ([STORY 5-3] 동일 플로우)

---

#### [STORY 7-3] 일반 블록(Stone/Dirt/Gravel/Clay) 파괴 시 1타로 보상이 수령되어야 한다.

4종 일반 블록은 v4.7에서 DMG 3 이상의 모든 곡괭이로 1타에 파괴된다:

| 블록 | HP | DMG 3으로 충돌 시 | 보상 |
|------|-----|-----------------|------|
| Stone | 3 | HP 3-3=0 → 즉시 파괴 | 28cr |
| Dirt | 2 | HP 2-3=-1 → 즉시 파괴 | 22cr |
| Gravel | 3 | HP 3-3=0 → 즉시 파괴 | 25cr |
| Clay | 2 | HP 2-3=-1 → 즉시 파괴 | 24cr |

1. 곡괭이가 블록에 충돌 → `block.takeDamage(3)` → `hp <= 0` → `destroyed = true`
2. `getReward()` → `rewardType: 'fixed'` → 고정 보상 반환
3. 콤보 배율, 필드 배율 적용 후 유저 잔액에 반영
4. 블록이 다음 브로드캐스트에서 캔버스에서 제거된다.
5. 유저는 매 파괴마다 즉각적인 잔액 증가를 HUD에서 확인한다.

---

#### [STORY 7-4] Iron Block은 여러 타가 필요하며 올바른 보상이 지급되어야 한다.

1. Iron Block (HP 20): DMG 3 곡괭이로 7타 필요 (3×6=18, 7타에 HP <= 0)
2. DMG 4(Light)로 5타, DMG 5(Power)로 4타에 파괴 가능
3. 각 타격마다 `getDestroyStage()` → 크랙 단계 0-9가 점진적으로 증가하여 시각적으로 표시된다.
4. 최종 파괴 시 보상 **100cr** 지급 (콤보/필드 배율 적용)
5. 중간 타격에는 보상 없음 (`takeDamage()` 반환값 null)

---

#### [STORY 7-5] Copper Block이 파괴될 때 올바른 보상이 지급되어야 한다.

1. Copper Block (HP 15): DMG 3 곡괭이로 5타, DMG 5로 3타 필요
2. 파괴 시 보상 **50cr** 지급
3. TNT로도 즉시 파괴 가능 (DMG 30 > HP 15, tntResist 없음)

---

#### [STORY 7-6] Emerald Block이 파괴될 때 올바른 보상이 지급되어야 한다.

1. Emerald Block (HP 55, weight 5%): DMG 3 곡괭이로 19타 필요
2. 파괴 시 보상 **540cr** 지급
3. `tntResist` 없음 → TNT 폭발(DMG 30) 시 HP 25로 감소 (미파괴, 이후 추가 타격 필요)

---

#### [STORY 7-7] Diamond Block 파괴 시 고보상이 지급되고 전체 알림 배너가 표시되어야 한다.

1. Diamond Block (HP 180, weight 1%): DMG 3 곡괭이로 60타, DMG 5로 36타 필요
2. 파괴 시 보상 **4,500cr** 지급 (v4.7 기준, v4.6에서 5,000cr에서 -10%)
3. `block.type === 'diamond_block'` → GameEngine이 `rareBlockDestroyed` 이벤트 전송:
   - `{ playerName, blockType: 'diamond_block', blockName, reward, x, y, time }`
4. 모든 접속 유저에게 전체 배너 알림 표시: `UI.showRareBlockNotification(data)`
   - 배너 스타일: `rare-block-banner diamond` (다이아몬드 색상)
   - 내용: "{playerName} mined Diamond Block! +4,500"
   - 10초 후 fade-out 및 제거
5. 해당 보상(4,500cr)은 잭팟 피드에도 항목 추가 (`reward >= 1000`)

---

#### [STORY 7-8] Diamond Block 등장 시 전체 유저에게 스폰 알림 배너가 표시되어야 한다.

1. 새 청크가 생성될 때 `Chunk.js`가 Diamond Block 생성 → `engine._onRareBlockSpawned('diamond_block', def)` 콜백
2. 서버가 `rareBlockSpawned` 이벤트 전송: `{ blockType, blockName, reward, color, time }`
3. 모든 접속 유저 클라이언트: `UI.showRareBlockSpawnAlert(data)` 실행
   - 배너 스타일: `rare-spawn-alert diamond`
   - 내용: "💎 Diamond Block appeared! (4,500 credits) 💎"
   - 4초 후 fade-out 및 제거 (4,000ms timeout)
4. 유저는 다이아몬드 블록을 향해 곡괭이를 집중 투입하는 전략을 취할 수 있다.
5. 게임 시작 직후 초기 청크 생성 시에는 알림이 전송되지 않는다 (`this.running` 체크)

---

#### [STORY 7-9] Gold Block 등장 시 전체 유저에게 스폰 알림 배너가 표시되어야 한다.

1. Gold Block 생성 → `_onRareBlockSpawned('gold_block', def)` 콜백
2. `rareBlockSpawned` 이벤트: `{ blockType: 'gold_block', blockName: 'Gold Block', reward: 1800 }`
3. 클라이언트: `UI.showRareBlockSpawnAlert(data)` 실행
   - 배너 스타일: `rare-spawn-alert diamond` (Diamond 등장과 동일 클래스 사용)
   - 내용: "💎 Gold Block appeared! (1,800 credits) 💎"
   - 4초 후 자동 사라짐
4. Gold Block 파괴 시 전체 알림: `rareBlockDestroyed` → `showRareBlockNotification` (10초 표시)

---

#### [STORY 7-10] 스폰 알림 배너는 4초 후 자동으로 사라져야 한다.

1. `UI.showRareBlockSpawnAlert()` 내부: `setTimeout(() => { alertEl.classList.add('fade-out'); setTimeout(() => alertEl.remove(), 500); }, 4000)`
2. 4,000ms 경과 후 `fade-out` 클래스 추가 → CSS 트랜지션으로 투명도 감소
3. 500ms 후 DOM에서 완전 제거
4. 여러 알림이 연속으로 발생할 경우 각각 독립 타이머로 처리된다.

---

#### [STORY 7-11] 유저는 누군가 Diamond/Gold Block을 파괴한 경우 전체 배너 알림을 받아야 한다.

1. Diamond 또는 Gold Block 파괴 시 → GameEngine이 필드 내 모든 소켓에 `rareBlockDestroyed` 이벤트 전송
2. 각 클라이언트에서 `UI.showRareBlockNotification(data)` 실행:
   - Diamond: 배너 색상 `diamond`, 이모지 💎, **10초** 표시
   - Gold: 배너 색상 `gold`, 이모지 ✨, **10초** 표시
3. 배너 내용: "{playerName} mined {blockName}! +{reward}"
4. 파괴한 플레이어 자신에게도 동일 알림이 표시된다.

---

#### [STORY 7-12] 유저는 잭팟 피드에서 고가 보상 이벤트를 실시간으로 확인할 수 있어야 한다.

1. 잭팟 피드 트리거 조건:
   - 보상 >= 1,000cr인 블록 파괴 (Diamond 4,500cr / Gold 1,800cr / Jackpot 250,000cr)
   - TNT 폭발 총 보상 >= 5,000cr
   - Jackpot Block 파괴 (별도 `jackpotBlockDestroyed` 이벤트)
2. `jackpots` 배열에 항목 추가: `{ playerName, blockName, reward, time }`
3. 브로드캐스트 시 `jackpots.slice(-5)` 전송 → 최근 5개만 클라이언트로 전달
4. 클라이언트에서 `UI.showJackpot(data)`:
   - 화면 측면 오버레이(`#jackpot-overlay`)에 항목 추가
   - 내용: "{playerName} found {reward}cr from {blockName}!"
   - 4,000ms 후 자동 제거
5. `jackpots` 배열이 20개 초과 시 서버에서 최근 10개로 정리

---

#### [STORY 7-13] 잭팟 블록 등장 시 전체 알림이 표시되어야 한다.

1. 잭팟 블록 스폰 조건:
   - `creditsSinceLastJackpot >= 1,500,000cr` (누적 소비 1.5M 이상)
   - 현재 필드 활성 플레이어 >= 10명
   - 랜덤 확률 0.05% (`SPAWN_CHANCE = 0.0005`)
2. 스폰 시 `_onJackpotBlockSpawned()` → 필드 내 전체 소켓에 `jackpotBlockSpawned` 이벤트
3. 클라이언트: `showRareBlockSpawnAlert({ blockType: 'jackpot', blockName: 'Jackpot Block', reward: 250000 })`
   - 배너 스타일: `rare-spawn-alert jackpot`, 이모지 🏆
   - 내용: "🏆 Jackpot Block appeared! (250,000 credits) 🏆"
   - 4초 표시
4. 잭팟 블록 파괴 시 250,000cr 지급 + `jackpotBlockDestroyed` 전체 이벤트

---

### ❖ 3. 정책 및 데이터 정의

#### v4.7 전체 블록 스펙 표

| 블록명 | 타입 | HP | 보상(cr) | 등장 확률 | TNT 저항 | 보상 방식 |
|--------|------|-----|---------|----------|---------|---------|
| Jackpot Block | jackpot | 300 | 250,000 | 특수 조건부 | O (40% 피해) | fixed |
| Diamond Block | diamond_block | 180 | 4,500 | 1% | O (40% 피해) | fixed |
| Gold Block | gold_block | 90 | 1,800 | 2% | O (40% 피해) | fixed |
| Emerald Block | emerald_block | 55 | 540 | 5% | X | fixed |
| Iron Block | iron_block | 20 | 100 | 12% | X | fixed |
| Copper Block | copper_block | 15 | 50 | 20% | X | fixed |
| Stone | stone | 3 | 28 | 20% | X | fixed |
| Dirt | dirt | 2 | 22 | 18% | X | fixed |
| Gravel | gravel | 3 | 25 | 12% | X | fixed |
| Clay | clay | 2 | 24 | 10% | X | fixed |
| Bedrock | bedrock | 999,999 | 0 | 벽 전용 | — | fixed |

*등장 확률 = weight / 총 weight (100). Jackpot Block은 weight=0으로 일반 스폰 풀 제외.*

#### 밸런스 설계 철학: "일관된 보상(Consistent Rewards)"

v4.7의 핵심 변경은 일반 블록(Stone/Dirt/Gravel/Clay, 합산 60% 등장)의 HP를 2-3으로 낮추고 보상을 22-28cr 고정값으로 올린 것이다.

**변경 이유:**
- v4.6에서 60%의 블록이 1-5cr만 지급 → 10K 소비 시 최하위 10% 세션(P10)이 2,002cr에 불과
- 플레이어가 "무가치한 블록만 파괴"한 세션에서 극단적인 패배감을 경험
- "로또" 방식에서 "꾸준한 수익 + 가끔 대박" 방식으로 전환

**구현 원칙:**
1. HP 2-3: DMG 3인 기본 곡괭이 1타에 파괴 → 즉각적인 피드백
2. 보상 22-28cr 고정: 모든 일반 블록 파괴가 의미 있는 수익
3. 10개 연속 파괴 = ~250cr — 체감 가능한 진전
4. 희귀 블록(Diamond/Gold)은 여전히 "잭팟 순간"으로 남음

**가격 조정 이유:**
- 공통 블록 보상 대폭 증가로 곡괭이 1회 사용 시 총 획득 크레딧 급증
- 가격 조정 없으면 하우스 엣지 40% 미만으로 하락 → 운영 지속 불가
- ~60% 가격 인상으로 목표 하우스 엣지(55% @5p) 유지

#### v4.6 → v4.7 블록 변경 비교 표

| 블록 | v4.6 HP | v4.7 HP | 변화 | v4.6 보상 | v4.7 보상 | 변화 |
|------|---------|---------|------|----------|----------|------|
| Stone | 10 | 3 | -70% | 1-5 (랜덤) | 28 (고정) | +460%+ |
| Dirt | 7 | 2 | -71% | 1-5 (랜덤) | 22 (고정) | +340%+ |
| Gravel | 9 | 3 | -67% | 1-5 (랜덤) | 25 (고정) | +400%+ |
| Clay | 8 | 2 | -75% | 1-5 (랜덤) | 24 (고정) | +380%+ |
| Iron | 32 | 20 | -38% | 150 | 100 | -33% |
| Copper | 20 | 15 | -25% | 50 | 50 | 불변 |
| Diamond | 180 | 180 | 불변 | 5,000 | 4,500 | -10% |
| Gold | 90 | 90 | 불변 | 2,000 | 1,800 | -10% |
| Emerald | 55 | 55 | 불변 | 540 | 540 | 불변 |

#### Hardcore 필드에서 보상 10배 적용 방식

- `GameEngine` 인스턴스는 `rewardMultiplier` 파라미터를 받는다:
  - Normal 필드: `rewardMultiplier = 1`
  - Hardcore 필드: `rewardMultiplier = 10`
- 적용 지점:
  1. 구매 가격: `effectivePrice = def.price × rewardMultiplier`
  2. 블록 파괴 보상: `finalReward = Math.round(reward × comboMult × rewardMultiplier)`
  3. TNT 폭발 보상: `totalReward = Math.round(totalReward × rewardMultiplier)`
- 콤보 배율(최대 1.5x)과 필드 배율은 곱셈으로 중첩 적용된다
- Hardcore에서 콤보 1.5x 발동 시: 기본 보상 × 1.5 × 10 = 15배

#### 세션 분포 비교 (10K 소비, 5인 기준)

| 백분위 | v4.6 수령 | v4.7 수령 | 변화 |
|--------|----------|----------|------|
| P10 (최악 세션) | 2,002cr | 3,123cr | +56% |
| P25 | 3,403cr | 3,947cr | +16% |
| P50 (중앙값) | 5,014cr | 5,132cr | +2% |
| P90 (행운 세션) | 9,172cr | 8,225cr | -10% |
| Max (잭팟 세션) | 21,987cr | 15,379cr | -30% |

분산 압축: v4.6 범위 19,985 → v4.7 범위 12,256 (39% 감소). 최악 세션이 크게 개선되는 대신 최대 수익이 감소하는 트레이드오프.

#### 예외/에러 상황

| 상황 | 처리 방식 |
|------|----------|
| 블록이 이미 파괴된 상태에서 재타격 | `takeDamage()`에서 `this.destroyed` 체크 후 null 반환, 무시 |
| Bedrock 타격 | `block.type === 'bedrock'` 조건으로 무시 |
| 시스템 곡괭이가 파괴한 블록 | `isSystem = true` → 보상 지급 없음 |
| 청크 뷰포트 위로 스크롤 | `_clearBlocksAboveViewport()`로 강제 destroyed=true, 보상 없음 |
| 잭팟 블록 조건 미충족 스폰 시도 | Chunk.js가 조건 검사 후 일반 블록으로 대체 |

---

### ❖ 4. 의존 영역 및 영향도

- `server/game/constants.js` — BLOCK_TYPES (HP, 보상, 가중치, tntResist), JACKPOT_CONFIG
- `server/game/Block.js` — takeDamage(), getReward(), getDestroyStage()
- `server/game/Chunk.js` — 블록 스폰 풀 (가중치 기반 랜덤), 희귀 블록 콜백
- `server/game/GameEngine.js` — 충돌 처리, 보상 지급, rareBlockDestroyed/rareBlockSpawned 이벤트
- `public/js/ui.js` — renderBlockGuide(), showRareBlockSpawnAlert(), showRareBlockNotification(), showJackpot()
- `public/js/renderer.js` — 블록 파괴 단계 비주얼(크랙), 픽셀아트 캐시(`pixelBlockCache`)
- 영향 범위: 유저 잔액, 잭팟 피드, 리더보드 수익, `creditsSinceLastJackpot` 추적 (잭팟 스폰 조건)
