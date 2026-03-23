# PIKIT 기능 명세서 — EPIC 1~4

> 작성 기준: v4.7 코드베이스 (constants.js, index.js, ui.js, index.html)
> 작성일: 2026-03-18

---

## ✦ [EPIC 1] 게임 접속 및 관전 서비스

### ❖ 1. 목적 및 배경

- **배경**: PIKIT은 실시간 멀티플레이어 채굴 게임이다. 로그인하지 않은 방문자도 게임 화면을 즉시 볼 수 있어야 하며, 이를 통해 게임에 대한 흥미를 유발하고 자연스러운 회원 유입을 도모한다.
- **목적**: 비로그인 상태에서도 실시간 게임 화면(캔버스)을 관전할 수 있도록 하여 진입 장벽을 낮추고, 잭팟·희귀 블록 등 이벤트 알림을 통해 유저의 참여 동기를 높인다.

---

### ❖ 2. User Story & 상세 플로우

---

#### [STORY 1-1] 유저는 처음 URL에 접속했을 때 로그인 없이 게임 화면을 즉시 볼 수 있어야 한다.

1. 유저가 브라우저에서 PIKIT URL(예: `http://localhost:3000`)에 접속한다.
2. 서버는 즉시 HTML 페이지를 응답하고, 화면에 게임 캔버스(`#game-canvas`)가 표시된다.
3. 클라이언트는 WebSocket(Socket.IO) 서버에 자동으로 연결된다.
4. 서버는 연결된 소켓을 `field:normal` 방에 자동으로 입장시킨다(관전자 상태).
5. 서버는 `init` 이벤트를 통해 게임 설정(해상도, 블록 정보, 곡괭이 종류, 필드 정보)을 클라이언트에 전송한다.
6. 클라이언트는 `normal` 필드의 실시간 게임 상태(`gameState`)를 20fps로 수신해 캔버스에 렌더링한다.
7. 유저는 로그인 없이 현재 게임(곡괭이 낙하, 블록 파괴, 다른 플레이어의 활동)을 실시간으로 관전한다.
8. 상단 HUD에는 현재 깊이(Depth), 필드 토글(Normal/10x), 크레딧 잔액(0)이 표시된다.
9. 하단 액션바에는 Shop, Quest, Rank 버튼이 표시된다.

---

#### [STORY 1-2] 유저는 화면 상단 HUD에서 현재 게임의 실시간 정보를 한눈에 확인할 수 있어야 한다.

1. 유저가 게임 화면을 보고 있을 때 상단 HUD가 항상 노출된다.
2. **깊이(Depth)**: `#depth` 요소에 현재 카메라의 채굴 깊이가 `Xm` 형태로 표시된다. 서버 상태 업데이트마다 실시간으로 갱신된다.
3. **플레이어 수**: 메뉴 패널(`#menu-panel`)을 열면 `#player-count`에서 현재 필드의 온라인 플레이어 수를 확인할 수 있다.
4. **활성 곡괭이 수**: 같은 메뉴 패널의 `#active-pickaxes`에서 현재 필드에서 낙하 중인 곡괭이 총 개수를 확인할 수 있다.
5. **크레딧 잔액**: 상단 우측 `#my-balance`에 현재 잔액이 숫자로 표시된다. 비로그인 시에는 `0`으로 표시된다.
6. 모든 수치는 게임 서버가 20fps로 브로드캐스트하는 `gameState` 이벤트에 의해 갱신된다.

---

#### [STORY 1-3] 유저는 메뉴 패널을 열어 게임 정보와 블록 가이드를 확인할 수 있어야 한다.

1. 유저가 상단 좌측의 햄버거 메뉴 버튼(`#menu-btn`)을 클릭한다.
2. 좌측에서 슬라이드인 방식으로 메뉴 패널(`#menu-panel`)이 열린다. 동시에 반투명 배경(backdrop)이 활성화된다.
3. 패널에는 두 가지 섹션이 표시된다:
   - **Game Info**: 플레이어 수(`Players Online`), 활성 곡괭이 수(`Active Pickaxes`)
   - **Block Guide**: 모든 블록 종류, 보상 크레딧, 스폰 확률(%) 목록
4. Block Guide는 보상이 높은 블록 순서로 정렬된다 (Jackpot → Diamond → Gold → Emerald → Iron → Copper → Stone → Gravel → Clay → Dirt).
5. 각 블록 항목에는 8-bit 픽셀아트 아이콘, 블록 이름, 보상(크레딧), 스폰 확률이 표시된다.
6. 유저가 패널 외부의 배경(backdrop)을 클릭하거나 X 버튼(`#menu-close-btn`)을 클릭하면 패널이 닫힌다.

---

#### [STORY 1-4] 유저는 희귀 블록이 필드에 등장했을 때 즉각적인 알림을 볼 수 있어야 한다.

1. 서버에서 Diamond Block 또는 Jackpot Block 등 희귀 블록이 생성될 때 해당 필드 전체에 `rareBlockSpawned` 이벤트를 브로드캐스트한다.
2. 클라이언트는 이 이벤트를 수신하면 화면 최상단 `#spawn-alert-overlay`에 알림 배너를 표시한다.
3. **Diamond Block 등장 시**: 배너에 "💎" 이모지와 "Diamond Block appeared! (4,500 credits)" 텍스트가 표시된다.
4. **Jackpot Block 등장 시**: 배너에 "🏆" 이모지와 "Jackpot Block appeared! (250,000 credits)" 텍스트가 표시된다. 배너 색상이 특별한 jackpot 스타일로 변경된다.
5. 알림 배너는 4초 후 페이드아웃 애니메이션과 함께 사라진다.
6. 현재 필드에 있는 모든 유저(관전자 포함)가 동시에 알림을 볼 수 있다.

---

#### [STORY 1-5] 유저는 다른 플레이어가 희귀 블록을 채굴했을 때 전체 알림 배너를 볼 수 있어야 한다.

1. 다른 플레이어의 곡괭이가 Diamond Block, Gold Block, 또는 Jackpot Block을 파괴하면 서버가 해당 필드 전체에 이벤트를 브로드캐스트한다.
2. 클라이언트는 화면 우측 하단 방향 `#jackpot-overlay` 영역에 희귀 블록 배너(`rare-block-banner`)를 표시한다.
3. **Gold Block 채굴 시**: "✨ {플레이어명} mined Gold Block! +1,800" 형식의 배너가 10초 동안 표시된다.
4. **Diamond Block 채굴 시**: "💎 {플레이어명} mined Diamond Block! +4,500" 형식의 배너가 10초 동안 표시된다.
5. **Jackpot Block 채굴 시**: "🏆 {플레이어명} mined Jackpot Block! +250,000" 형식의 배너가 15초 동안 표시된다.
6. 배너는 자동으로 페이드아웃 후 제거된다. 현재 필드 전체 유저에게 표시된다.

---

#### [STORY 1-6] 유저는 잭팟 이벤트 알림을 별도 팝업으로 볼 수 있어야 한다.

1. 어떤 플레이어가 Jackpot Block을 파괴하거나 잭팟 조건이 충족되면 서버가 `jackpot` 이벤트를 브로드캐스트한다.
2. 클라이언트는 `#jackpot-overlay`에 별도 알림(`jackpot-alert`)을 생성해 표시한다.
3. 알림 텍스트는 "🎉 {플레이어명} found {보상} from {블록명}!" 형식으로 표시된다.
4. 알림은 4초 후 자동 제거된다.
5. **잭팟 블록 활성화 조건**: 서버에서 1,500,000 크레딧 이상이 소비된 후, 10명 이상의 플레이어가 활성 상태일 때 블록 포지션당 0.05% 확률로 등장한다.

---

#### [STORY 1-7] 유저는 다른 플레이어가 곡괭이를 구매했을 때 해당 곡괭이가 게임 화면에 나타나는 것을 즉시 볼 수 있어야 한다.

1. 다른 플레이어가 곡괭이를 구매하면 서버의 게임 엔진에 곡괭이가 추가된다.
2. 다음 `gameState` 브로드캐스트(최대 50ms 이내, 20fps 기준)에 새 곡괭이가 포함된다.
3. 관전 중인 유저의 화면 캔버스에 새 곡괭이가 필드 상단에서 낙하를 시작하는 모습이 렌더링된다.
4. 곡괭이는 8-bit 픽셀아트로 렌더링되며, 종류에 따라 외형이 다르다 (Basic: 갈색, Power: 청록색, Light: 금색, Swift: 은색).
5. PIKIT 시스템 곡괭이는 서버가 클라이언트에 전송할 때 필터링되어 숨겨진다 — 단, 게임 화면에는 렌더링되지만 상점 목록에는 노출되지 않는다.

---

#### [STORY 1-8] 유저는 모바일 기기에서 접속했을 때도 게임 화면이 정상적으로 표시되어야 한다.

1. 유저가 스마트폰 브라우저(iOS Safari, Android Chrome 등)로 PIKIT URL에 접속한다.
2. `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">` 설정으로 페이지 확대/축소가 방지된다.
3. 게임 캔버스는 내부 해상도 1080x1920을 유지하면서 화면 크기에 맞게 CSS 스케일링된다.
4. 상단 HUD, 하단 액션바, 팝업, 패널 등 모든 UI 요소가 터치 인터페이스에 적합하게 표시된다.
5. 슬라이드 패널(Shop, Menu 등)은 좌우 스와이프 대신 버튼 탭으로 열고 닫는다.

---

#### [STORY 1-9] 유저는 채팅창을 통해 다른 플레이어들의 대화를 관전할 수 있어야 한다.

1. 게임 화면 하단에 플로팅 채팅 영역(`#chat-overlay`)이 항상 표시된다.
2. 채팅 메시지 목록(`#chat-messages`)에 현재 필드 플레이어들의 대화가 실시간으로 표시된다.
3. 시스템 메시지(플레이어 입장/퇴장)도 채팅 영역에 별도 스타일로 표시된다.
4. 채팅창에는 최대 100개의 메시지가 유지되며, 이를 초과하면 오래된 메시지부터 제거된다.
5. 채팅 토글 버튼(`#chat-toggle-btn`)을 클릭하면 채팅 입력창이 나타난다. 단, **채팅 전송은 로그인이 필요**하다.
6. 비로그인 유저가 채팅 전송을 시도하면 지갑 연결 플로우가 자동으로 시작된다.

---

#### [STORY 1-10] 서버 연결이 끊어졌을 때 유저는 화면이 정지되는 상황을 경험한다.

1. 유저가 게임을 관전 중 네트워크 연결이 끊어진다.
2. Socket.IO가 재연결을 자동으로 시도한다 (pingTimeout: 20초, pingInterval: 10초).
3. 재연결 시도 중 게임 캔버스는 마지막으로 수신한 상태로 정지되어 표시된다.
4. 재연결에 성공하면 서버 상태를 다시 수신해 게임 화면이 정상적으로 갱신된다.
5. 재연결 실패 시 Socket.IO의 기본 연결 오류 동작이 적용된다.

---

### ❖ 3. 정책 및 데이터 정의

**기본 정책**
- 비로그인 유저도 페이지 접속 즉시 관전자 상태로 `field:normal` 방에 입장한다.
- 관전자는 게임 상태(`gameState`) 브로드캐스트를 실시간 수신한다 (20fps, 50ms 간격).
- 잭팟 블록 활성화 조건: 누적 소비 1,500,000 크레딧 이상 + 활성 플레이어 10명 이상 + 블록당 0.05% 확률.
- 희귀 블록 배너 노출 시간: Diamond 계열 10초, Jackpot 15초, Spawn Alert 4초.
- 게임 캔버스 내부 해상도: 1080x1920 px.

**표시 정보 (HUD)**

| 요소 | ID | 설명 |
|---|---|---|
| 깊이 | `#depth` | 현재 채굴 깊이 (예: 42m) |
| 크레딧 잔액 | `#my-balance` | 현재 보유 크레딧 (비로그인 시 0) |
| 플레이어 수 | `#player-count` | 현재 필드 온라인 플레이어 수 |
| 활성 곡괭이 | `#active-pickaxes` | 현재 필드 낙하 중인 곡괭이 수 |

**블록 보상 참고표 (v4.7)**

| 블록 | HP | 보상 | 스폰 확률 |
|---|---|---|---|
| Jackpot Block | 300 | 250,000 cr | 특수 조건 |
| Diamond Block | 180 | 4,500 cr | 1% |
| Gold Block | 90 | 1,800 cr | 2% |
| Emerald Block | 55 | 540 cr | 5% |
| Iron Block | 20 | 100 cr | 12% |
| Copper Block | 15 | 50 cr | 20% |
| Stone | 3 | 28 cr | 20% |
| Gravel | 3 | 25 cr | 12% |
| Clay | 2 | 24 cr | 10% |
| Dirt | 2 | 22 cr | 18% |

**예외/에러 상황**
- 서버 연결 실패 시: 캔버스 렌더링 없음, Socket.IO 재연결 자동 시도.
- 게임 상태 수신 지연: 마지막 수신 상태로 화면 유지 (정지 화면).

---

### ❖ 4. 의존 영역 및 영향도

- `server/index.js`: 소켓 연결 시 `field:normal` 자동 입장, `init` 이벤트 전송, `gameState` 브로드캐스트 (20fps).
- `server/game/GameEngine.js`: 게임 루프, 블록 생성, 잭팟/희귀 블록 이벤트 브로드캐스트.
- `public/js/renderer.js`: Canvas 렌더링, 8-bit 픽셀아트 블록/곡괭이 프로시저럴 생성.
- `public/js/ui.js`: `showJackpot()`, `showRareBlockSpawnAlert()`, `showRareBlockNotification()`, `updateGameInfo()`.

---

---

## ✦ [EPIC 2] 로그인 서비스

### ❖ 1. 목적 및 배경

- **배경**: PIKIT은 두 가지 로그인 방식을 지원한다: (1) 닉네임 기반 간편 로그인, (2) Web3 지갑(MetaMask/RainbowKit) 연결. 지갑 로그인은 온체인 입출금 및 퀘스트 기능의 전제 조건이다.
- **목적**: 유저가 빠르고 안전하게 게임에 참여할 수 있도록 하며, 지갑 연결을 통해 블록체인 기능(입금, 출금, 퀘스트 온체인 등록)과의 연동을 가능하게 한다.

---

### ❖ 2. User Story & 상세 플로우

---

#### [STORY 2-1] 유저는 닉네임을 입력해 간편하게 게임에 참여할 수 있어야 한다.

1. 관전자 상태의 유저가 Shop, Quest, Rank, 채팅 전송 등 로그인이 필요한 기능을 시도한다.
2. `_requireWallet()` 함수가 호출되어 지갑 연결 플로우가 시작된다. (현재 구현: 지갑 미연결 시 RainbowKit 연결 모달 자동 오픈)
3. 별도의 닉네임 전용 입력 UI가 없는 경우, 서버 `join` 이벤트를 직접 통해 닉네임을 전달한다.
4. 서버는 닉네임에서 `<`, `>`, `&`, `"`, `'`, `/` 특수문자를 제거하고, 빈 문자열이면 `"Player"`로 대체하며, 최대 12자로 자른다.
5. 플레이어 객체가 생성되고 초기 크레딧 10,000이 부여된다.
6. 서버는 `joined` 이벤트로 플레이어 전체 정보(잔액, 닉네임 등)를 응답한다.
7. 클라이언트는 `joined` 이벤트를 수신해 `GameSocket.player`에 플레이어 정보를 저장한다.
8. 상단 HUD의 크레딧 잔액이 `10,000`으로 갱신된다.
9. 채팅 영역에 "{닉네임} joined the game." 시스템 메시지가 해당 필드 전체에 표시된다.

---

#### [STORY 2-2] 유저가 닉네임에 허용되지 않는 특수문자를 입력했을 때 서버가 자동으로 정제해야 한다.

1. 유저가 닉네임으로 `<script>alert(1)</script>` 또는 `"hack'/` 같은 문자열을 입력한다.
2. 서버의 `join` 이벤트 핸들러가 `String(data.name || 'Player').replace(/[<>&"'/]/g, '').trim()`을 수행한다.
3. `<script>alert(1)</script>` → `scriptalert(1)/script` → 최대 12자 → `scriptalert(` 로 처리된다.
4. `"hack'/` → `hack` 으로 처리된다.
5. 정제된 닉네임으로 플레이어가 정상 생성되며 `joined` 이벤트로 결과가 반환된다.
6. 유저는 정제된 닉네임으로 게임에 참여한 것을 확인한다.

---

#### [STORY 2-3] 유저가 닉네임을 12자 초과로 입력했을 때 자동으로 잘려야 한다.

1. 유저가 13자 이상의 닉네임을 입력하려 한다.
2. 서버는 `substring(0, 12)`를 적용해 앞 12자만 사용한다.
3. 결과 닉네임이 빈 문자열이 아닌 경우 정상 처리된다.
4. `joined` 이벤트로 반환된 플레이어 정보에 12자로 잘린 닉네임이 담긴다.

---

#### [STORY 2-4] 유저가 공백만 입력하거나 빈 닉네임으로 시도했을 때 기본 닉네임이 부여되어야 한다.

1. 유저가 닉네임으로 `"   "` (공백만)를 입력하거나 아무것도 입력하지 않는다.
2. 서버는 `trim()` 후 빈 문자열이면 `"Player"`를 닉네임으로 사용한다.
3. 플레이어 닉네임이 `"Player"`로 설정되어 정상 참여된다.

---

#### [STORY 2-5] 유저는 MetaMask 지갑을 연결해 로그인할 수 있어야 한다.

1. 유저가 로그인이 필요한 기능(Shop 버튼 등)을 클릭한다.
2. `_requireWallet()` 함수가 호출된다. 지갑이 미연결 상태이면 `window.WalletAPI.connect()`를 호출해 RainbowKit 연결 모달이 열린다.
3. 유저가 모달에서 MetaMask를 선택하고 지갑 연결을 승인한다.
4. 지갑 연결 완료 후 `walletStateChanged` 또는 `walletLoginRequested` 이벤트가 발생한다.
5. 클라이언트는 서버에 서명 요청 메시지를 생성하고, MetaMask를 통해 유저에게 서명을 요청한다.
6. 유저가 MetaMask 팝업에서 서명에 동의한다.
7. 클라이언트는 서버에 `joinWithWallet` 이벤트를 전송한다. 데이터: `{ address, message, signature, shortAddress }`.
8. 서버는 `ethers.verifyMessage(message, signature)`로 서명을 검증한다.
9. 서명이 클레임된 주소와 일치하면 플레이어 객체를 생성한다. 닉네임은 지갑 주소 축약형(`0x1234...abcd`)으로 설정된다 (최대 13자).
10. 서버는 `joined` 이벤트로 플레이어 정보를 응답한다.
11. 클라이언트 HUD가 갱신되고, 채팅에 입장 메시지가 표시된다.
12. 토스트 알림 없음 (지갑 연결 성공은 HUD 갱신으로 확인).

---

#### [STORY 2-6] 유저가 MetaMask 서명 요청을 거부했을 때 로그인이 중단되어야 한다.

1. `_requireWallet()` → RainbowKit 모달 → MetaMask 지갑 연결까지는 성공한다.
2. MetaMask가 서명 요청을 표시할 때 유저가 "거부(Reject)"를 클릭한다.
3. 서명 취소로 인해 `joinWithWallet` 이벤트가 서버로 전송되지 않는다.
4. 유저는 여전히 관전자 상태로 남는다. HUD 잔액은 0으로 유지된다.
5. 에러 토스트 또는 안내 메시지를 통해 "서명이 거부되었습니다" 안내가 표시될 수 있다.

---

#### [STORY 2-7] 유저가 지갑 연결 팝업(RainbowKit 모달)을 닫았을 때 로그인이 중단되어야 한다.

1. 유저가 Shop 버튼을 클릭해 RainbowKit 연결 모달이 열린다.
2. 유저가 모달의 X 버튼을 눌러 닫는다.
3. 지갑 연결 없이 모달이 닫히고, 유저는 관전자 상태로 유지된다.
4. Shop 패널은 열리지 않는다. 특별한 에러 메시지 없이 원래 화면으로 돌아온다.

---

#### [STORY 2-8] 이미 로그인된 상태에서 동일 소켓으로 재로그인을 시도했을 때 에러를 반환해야 한다.

1. 유저가 이미 닉네임 또는 지갑으로 로그인되어 있는 상태이다.
2. 동일 소켓에서 `join` 또는 `joinWithWallet` 이벤트를 다시 전송한다 (비정상적인 경우).
3. 서버의 `findPlayer(socket.id)` 호출 결과가 존재하면, `socket.emit('error', { message: 'Already joined' })`를 반환한다.
4. 두 번째 로그인 시도는 무시되고, 기존 플레이어 상태가 유지된다.

---

#### [STORY 2-9] 유저는 My Info 팝업에서 로그아웃 버튼을 눌러 게임에서 나갈 수 있어야 한다.

1. 로그인된 유저가 상단 우측 프로필 버튼(`#myinfo-btn`)을 클릭한다.
2. My Info 팝업(`#myinfo-popup`)이 열린다.
3. 유저가 "Logout" 버튼(`#myinfo-logout`)을 클릭한다.
4. 브라우저의 기본 확인 다이얼로그가 표시된다: "Are you sure you want to logout?"
5. 유저가 **확인(OK)**을 클릭한다.
6. 지갑이 연결된 상태라면 `window.WalletAPI.disconnect()`가 호출된다. 이는 `walletStateChanged` 이벤트를 트리거하여 게임 로그아웃을 처리한다.
7. 지갑이 없는 닉네임 로그인인 경우 `window.location.reload()`가 호출되어 페이지가 새로고침된다.
8. 새로고침 후 유저는 다시 비로그인 관전자 상태로 접속한다.

---

#### [STORY 2-10] 유저가 로그아웃 확인 다이얼로그에서 취소를 클릭했을 때 로그아웃이 취소되어야 한다.

1. My Info 팝업에서 "Logout" 버튼을 클릭해 확인 다이얼로그가 표시된다.
2. 유저가 **취소(Cancel)**를 클릭한다.
3. 아무런 동작도 발생하지 않는다. 기존 로그인 상태가 유지된다.
4. My Info 팝업은 열린 채로 유지된다.

---

#### [STORY 2-11] 유저가 브라우저를 새로고침하면 세션이 종료되어야 한다.

1. 로그인 중인 유저가 브라우저의 새로고침(F5 또는 Ctrl+R)을 누른다.
2. 기존 WebSocket 연결이 끊어진다. 서버의 `disconnect` 이벤트 핸들러가 호출된다.
3. 서버는 해당 플레이어를 게임 엔진에서 제거하고, 해당 필드 전체에 `playerLeft` 이벤트를 브로드캐스트한다.
4. 채팅에 "{닉네임} left the game." 시스템 메시지가 표시된다.
5. **서버는 플레이어 진행 데이터를 영구 저장하지 않는다.** 새로고침 후 다시 로그인하면 초기 크레딧 10,000으로 초기화된 새 세션이 시작된다.
6. 페이지 재로드 후 유저는 비로그인 관전자 상태로 접속한다.

---

#### [STORY 2-12] 지갑은 연결되어 있지만 게임 서명(로그인)을 하지 않은 상태에서 곡괭이 구매를 시도했을 때 로그인 플로우가 시작되어야 한다.

1. 유저의 지갑은 RainbowKit을 통해 연결되어 있지만, 게임 서명(`joinWithWallet`)은 아직 완료되지 않은 상태이다.
2. 유저가 Shop 버튼을 클릭한다.
3. `_requireWallet()` 함수에서 `GameSocket.player`가 null이고, `window.WalletAPI.isConnected()`가 true인 경우를 감지한다.
4. `window.dispatchEvent(new CustomEvent('walletLoginRequested'))`를 발생시켜 게임 서명 플로우를 재시작한다.
5. 토스트 알림 "Logging in..."이 표시된다.
6. 서명 완료 후 정상 로그인된다.

---

#### [STORY 2-13] 서버가 지갑 서명 검증에 실패했을 때 에러 응답을 반환해야 한다.

1. 클라이언트가 서버로 `joinWithWallet` 이벤트를 전송한다.
2. 서버에서 `verifyMessage(message, signature)`가 복원한 주소가 전달된 주소와 다르다.
3. 서버는 `socket.emit('error', { message: 'Signature verification failed' })`를 반환한다.
4. 또는 검증 중 예외 발생 시 `socket.emit('error', { message: 'Wallet verification failed' })`를 반환한다.
5. 클라이언트는 에러 메시지를 수신해 유저에게 알림을 표시한다. 유저는 관전자 상태로 유지된다.

---

### ❖ 3. 정책 및 데이터 정의

**기본 정책**
- 로그인 방식 1 — 닉네임: `join` 소켓 이벤트. 특수문자 자동 제거, 최대 12자, 공백 시 "Player".
- 로그인 방식 2 — 지갑: `joinWithWallet` 소켓 이벤트. 서버에서 `ethers.verifyMessage`로 서명 검증. 닉네임은 `0xABCD...1234` 형식, 최대 13자.
- 로그인 성공 시 초기 크레딧: **10,000 크레딧**.
- 세션은 WebSocket 연결 기반이며 서버 재시작 또는 소켓 연결 종료 시 초기화된다. **영구 저장 없음**.
- 중복 로그인(동일 소켓) 방지: 서버에서 `Already joined` 에러 반환.

**닉네임 처리 규칙**
- 허용 안 되는 문자: `<`, `>`, `&`, `"`, `'`, `/`
- 최대 길이: 12자 (닉네임), 13자 (지갑 축약 주소)
- 기본값: 빈 문자열 또는 공백 → `"Player"`

**유저 데이터 정의 (로그인 시 생성되는 Player 객체)**

| 필드 | 설명 | 초기값 |
|---|---|---|
| `name` | 표시 닉네임 | 입력값 또는 `"Player"` |
| `balance` | 현재 총 크레딧 잔액 | 10,000 |
| `chargedCredits` | 입금(충전) 크레딧 | 10,000 (초기 지급 포함) |
| `inGameCredits` | 게임 내 획득 크레딧 | 0 |
| `totalEarned` | 누적 획득 크레딧 | 0 |
| `totalSpent` | 누적 지출 크레딧 | 0 |
| `walletAddress` | 지갑 전체 주소 (지갑 로그인 시만) | null |
| `activePickaxes` | 현재 활성 곡괭이 목록 | [] |

**예외/에러 상황**
- 이미 가입 상태에서 재가입 시도: `"Already joined"` 에러.
- 서명 주소 불일치: `"Signature verification failed"` 에러.
- 지갑 데이터 누락: `"Invalid wallet data"` 에러.

---

### ❖ 4. 의존 영역 및 영향도

- `server/index.js`: `join`, `joinWithWallet` 이벤트 핸들러, `Player` 객체 생성, 엔진 입장.
- `server/game/Player.js`: 플레이어 데이터 모델.
- `public/js/ui.js`: `_requireWallet()`, `myinfo-logout` 클릭 핸들러.
- `public/js/main.js` (추정): `joined` 이벤트 수신, `GameSocket.player` 설정.
- `public/js/wallet-bundle.js`: RainbowKit 지갑 연결 UI.

---

---

## ✦ [EPIC 3] 크레딧 서비스

### ❖ 1. 목적 및 배경

- **배경**: PIKIT의 모든 게임 내 거래(곡괭이 구매, TNT 구매, 보상 수령)는 크레딧 단위로 이루어진다. 크레딧은 두 가지 종류로 구분된다: **충전 크레딧**(입금을 통해 획득, 출금 가능)과 **인게임 크레딧**(게임 보상 및 퀘스트로 획득, 출금 불가).
- **목적**: 유저가 크레딧을 직관적으로 관리하고, 무료 충전 및 잔액 확인을 통해 게임 경험을 원활하게 유지할 수 있도록 한다.

---

### ❖ 2. User Story & 상세 플로우

---

#### [STORY 3-1] 유저는 로그인 시 초기 크레딧 10,000을 자동으로 수령해야 한다.

1. 유저가 닉네임 또는 지갑으로 로그인에 성공한다.
2. 서버는 새로운 Player 객체 생성 시 `chargedCredits = INITIAL_BALANCE = 10,000`을 설정한다.
3. 서버의 `joined` 이벤트 응답에 크레딧 잔액이 포함된다.
4. 클라이언트는 `joined` 이벤트를 수신해 HUD의 `#my-balance`를 `10,000`으로 갱신한다.
5. 유저는 별도의 행동 없이 즉시 10,000 크레딧을 보유한 상태로 게임을 시작할 수 있다.

---

#### [STORY 3-2] 유저는 무료 크레딧 충전 버튼을 눌러 추가 크레딧을 받을 수 있어야 한다.

1. 유저가 Shop 패널을 열면 상단 My Info 카드에 "+ 10,000 Credits" 버튼(`#add-balance-btn`)이 표시된다.
2. 또는 My Info 팝업 Overview 탭에서 "+ 10,000 Credits (Free)" 버튼(`#myinfo-add-balance`)을 클릭한다.
3. 클라이언트가 서버에 `addBalance` 소켓 이벤트를 전송한다.
4. 서버는 해당 플레이어의 `_addBalanceHistory`를 확인하여 최근 30초 내 충전 횟수를 검사한다.
5. 횟수 제한(30초 내 최대 5회) 미만인 경우: `player.chargedCredits += 10000`을 처리한다.
6. 서버는 `balanceUpdated` 이벤트로 갱신된 잔액 정보를 응답한다.
7. 클라이언트는 HUD의 크레딧 잔액을 갱신한다.
8. 화면에 토스트 알림 "10,000 credits added!"가 성공(success) 스타일로 3초간 표시된다.

---

#### [STORY 3-3] 유저가 무료 크레딧 충전을 30초 내 5회 초과 시도했을 때 충전이 거부되어야 한다.

1. 유저가 30초 내에 "+ 10,000 Credits" 버튼을 6번 이상 클릭한다.
2. 서버는 6번째 요청에서 `player._addBalanceHistory.length >= 5` 조건을 확인하고 요청을 무시(`return`)한다.
3. `balanceUpdated` 이벤트가 전송되지 않아 잔액 변화가 없다.
4. 클라이언트에서는 버튼 클릭 시 토스트 알림 "10,000 credits added!"가 표시되지만 (클라이언트 측 toast는 서버 응답 전에 표시됨), 실제 잔액이 갱신되지 않아 유저가 차이를 인식할 수 있다.
   - 참고: `ui.js`의 버튼 클릭 핸들러는 `showToast`를 `addBalance()` 호출과 동시에 실행한다. 서버가 거부해도 토스트는 표시될 수 있다. 개선 필요 사항.
5. 30초가 경과하면 다시 5회 충전이 가능하다.

---

#### [STORY 3-4] 유저는 게임 화면 상단 HUD에서 크레딧 잔액을 실시간으로 확인할 수 있어야 한다.

1. 로그인 후 상단 우측 프로필 버튼 영역의 `#my-balance`에 현재 크레딧 잔액이 숫자 형태로 항상 표시된다.
2. 잔액은 블록 파괴 보상, 곡괭이 구매, 충전 등 변화가 발생할 때마다 서버의 `balanceUpdated` 또는 `purchaseResult` 이벤트에 의해 갱신된다.
3. 프로필 버튼에 커서를 올리면(또는 탭 시) 크레딧 툴팁(`#credit-tooltip`)이 나타나며 **충전 크레딧(chargedCredits)**과 **인게임 크레딧(inGameCredits)**을 구분해 표시한다.
4. My Info 팝업의 Overview 탭에서도 상세 크레딧 내역 확인이 가능하다:
   - Balance (총 잔액)
   - 충전 Credit (입금으로 획득한 크레딧)
   - In-game Credit (게임 보상으로 획득한 크레딧)
   - Total Earned, Total Spent, Profit/Loss

---

#### [STORY 3-5] 유저는 곡괭이 구매 후 잔액이 즉시 차감되는 것을 확인할 수 있어야 한다.

1. 유저가 Shop 패널에서 Basic Pickaxe(3,400 크레딧)를 클릭한다.
2. Normal 필드 기준: 3,400 크레딧 차감. Hardcore 필드 기준: 34,000 크레딧 차감 (10x).
3. 서버가 구매를 처리하고 `purchaseResult: { success: true, player: {...} }`를 응답한다.
4. 클라이언트는 응답받은 플레이어 데이터로 HUD의 잔액을 갱신한다.
5. 구매한 곡괭이가 게임 필드에 즉시 낙하를 시작하는 모습이 렌더링된다.

---

#### [STORY 3-6] 유저는 블록 파괴 보상을 수령할 때 잔액이 자동으로 증가하는 것을 확인할 수 있어야 한다.

1. 유저의 곡괭이가 블록을 파괴하면 서버가 보상 크레딧을 플레이어에게 지급한다.
2. **콤보 보너스**: 2초 내 연속 파괴 횟수에 따라 보상 배율이 증가한다. (3회: 1.05x, 6회: 1.1x, 10회: 1.2x, 15회: 1.35x, 25회 이상: 1.5x)
3. 서버는 `balanceUpdated` 이벤트 또는 `gameState`에 포함된 플레이어 업데이트를 통해 클라이언트에 갱신된 잔액을 전달한다.
4. HUD의 `#my-balance`가 실시간으로 갱신된다.
5. 희귀 블록 파괴 시 화면에 배너 알림이 추가로 표시된다 (EPIC 1 참고).

---

#### [STORY 3-7] 유저의 크레딧이 0이 되었을 때 곡괭이 구매가 불가능해야 한다.

1. 유저의 크레딧 잔액이 0 또는 구매하려는 곡괭이 가격 미만이 된다.
2. 유저가 Shop에서 곡괭이를 클릭한다.
3. 서버는 `buyPickaxe` 이벤트를 처리하면서 잔액 부족 여부를 확인한다.
4. 잔액 부족 시 `purchaseResult: { success: false, message: '...' }` 에러를 반환한다.
5. 클라이언트는 에러 메시지를 표시한다.
6. 유저는 "+ 10,000 Credits" 버튼을 눌러 무료 크레딧을 충전하거나, 입금(Deposit)을 통해 크레딧을 추가할 수 있다.

---

#### [STORY 3-8] 유저는 My Info 팝업에서 크레딧 손익(Profit/Loss)을 확인할 수 있어야 한다.

1. 유저가 `#myinfo-btn`을 클릭해 My Info 팝업을 연다.
2. Overview 탭에서 다음 정보를 확인한다:
   - **Total Earned**: 지금까지 채굴 보상 + 퀘스트 등으로 획득한 총 크레딧.
   - **Total Spent**: 지금까지 곡괭이 및 TNT 구매에 사용한 총 크레딧.
   - **Profit/Loss**: `Total Earned - Total Spent`. 양수면 초록색, 음수면 빨간색으로 표시된다.
3. 모든 수치는 `balanceUpdated` 또는 `gameState` 수신 시 자동 갱신된다.

---

#### [STORY 3-9] 유저는 USDC 입금을 통해 충전 크레딧을 추가할 수 있어야 한다. (지갑 로그인 전용)

1. 유저가 My Info 팝업의 "Deposit" 탭을 클릭한다.
2. USDC 금액을 입력한다 (정수만 허용). 입력할 때마다 "You will receive: {크레딧수} credits" 미리보기가 갱신된다. (1 USDC = 10,000 크레딧)
3. +/- 버튼으로 금액을 조절할 수 있다.
4. "Deposit" 버튼을 클릭한다.
5. MetaMask가 USDC 사용 승인 트랜잭션을 요청한다. 유저가 승인한다.
6. 승인 트랜잭션 확인 후 실제 입금 트랜잭션이 전송된다.
7. 토스트 알림 "Deposit tx sent! X USDC → Y credits"가 표시된다.
8. 클라이언트가 서버에 `syncDeposit { txHash }` 이벤트를 전송한다.
9. 서버가 온체인 트랜잭션을 검증하고 크레딧을 지급한다.
10. `depositConfirmed` 및 `balanceUpdated` 이벤트로 잔액이 갱신된다.

---

#### [STORY 3-10] 유저는 충전 크레딧을 USDC로 출금할 수 있어야 한다. (지갑 로그인 전용)

1. 유저가 My Info 팝업의 "Withdraw" 탭을 클릭한다.
2. 출금할 USDC 금액을 입력한다. "Will consume: {크레딧} credits" 미리보기가 갱신된다. (1 USDC 출금 시 10,500 크레딧 소모 — 5% 수수료)
3. "Withdraw" 버튼을 클릭한다.
4. 잔액 부족 시 클라이언트에서 토스트 알림 "Not enough credits. Need {크레딧수}"가 표시되고 트랜잭션 전송이 중단된다.
5. 잔액 충분 시 MetaMask에서 출금 트랜잭션 서명을 요청한다. 유저가 승인한다.
6. 토스트 알림 "Withdraw tx sent! {크레딧} credits → {USDC} USDC"가 표시된다.
7. 서버가 온체인 트랜잭션을 검증하고 크레딧을 차감한다.
8. `withdrawConfirmed` 및 `balanceUpdated` 이벤트로 잔액이 갱신된다.
9. 인게임 크레딧(게임 내 채굴 획득분)은 출금 대상이 아니다.

---

### ❖ 3. 정책 및 데이터 정의

**기본 정책**
- 초기 크레딧: **10,000 (chargedCredits)**, 로그인 시 자동 지급.
- 무료 충전: 1회당 10,000 크레딧, 30초 내 최대 5회.
- 입금 환율: 1 USDC = 10,000 크레딧.
- 출금 환율: 10,500 크레딧 = 1 USDC (5% 수수료).
- 크레딧 종류:
  - **충전 크레딧**: 입금, 초기 지급, 무료 충전으로 획득. 출금 가능.
  - **인게임 크레딧**: 블록 파괴 보상, 퀘스트 보상으로 획득. 출금 불가.
  - **총 잔액(balance)** = 충전 크레딧 + 인게임 크레딧.

**콤보 보너스 시스템 (v4.7)**

| 연속 파괴 횟수 | 보상 배율 |
|---|---|
| 0~2회 | 1.0x |
| 3~5회 | 1.05x |
| 6~9회 | 1.1x |
| 10~14회 | 1.2x |
| 15~24회 | 1.35x |
| 25회 이상 | 1.5x (최대) |
| 콤보 타임아웃 | 2초 (마지막 파괴 후) |

**예외/에러 상황**
- 잔액 부족으로 구매 실패: 서버에서 `purchaseResult: { success: false }` 반환.
- 무료 충전 한도 초과: 서버에서 요청 무시 (응답 없음).
- 트랜잭션 중복 처리 방지: 동일 txHash는 서버가 `processedTxHashes` Set으로 중복 검사.
- 입출금 트랜잭션 실패: 서버가 `depositConfirmed` 또는 `withdrawConfirmed` 이벤트에 `success: false` 포함.

---

### ❖ 4. 의존 영역 및 영향도

- `server/index.js`: `addBalance`, `syncDeposit`, `syncWithdraw` 이벤트 핸들러.
- `server/game/constants.js`: `INITIAL_BALANCE = 10000`, `COMBO` 설정.
- `server/game/Player.js`: `chargedCredits`, `inGameCredits`, `totalEarned`, `totalSpent` 필드.
- `public/js/ui.js`: `updatePlayerInfo()`, 크레딧 툴팁, `_handleDeposit()`, `_handleWithdraw()`.

---

---

## ✦ [EPIC 4] 필드 선택 서비스

### ❖ 1. 목적 및 배경

- **배경**: PIKIT은 두 가지 게임 필드를 제공한다: **Normal (1x)** — 일반 비용과 보상, **Hardcore (10x)** — 모든 비용과 보상이 10배. 유저는 언제든지 필드를 전환할 수 있다.
- **목적**: 유저에게 적절한 난이도와 리스크 수준을 선택할 수 있는 자유를 제공하고, Hardcore 전환 시 명확한 경고를 통해 의도치 않은 크레딧 손실을 방지한다.

---

### ❖ 2. User Story & 상세 플로우

---

#### [STORY 4-1] 유저는 Normal 필드에서 Hardcore 필드로 처음 전환 시 경고 팝업을 보아야 한다.

1. 유저가 Normal 필드에서 게임 중이다 (또는 관전 중이다).
2. 상단 HUD의 필드 토글 스위치(`#field-toggle`)를 오른쪽으로 슬라이드하거나 클릭해 Hardcore(10x) 방향으로 전환을 시도한다.
3. `localStorage`에서 `pikit_skip_hardcore_warn` 값을 확인한다. 값이 없거나 `'1'`이 아닌 경우 경고 모달을 표시한다.
4. 체크박스가 원래 상태(unchecked)로 즉시 되돌려진다 (유저가 확인하기 전까지 전환되지 않음).
5. Hardcore 확인 모달(`#hardcore-confirm-modal`)이 화면 중앙에 오버레이로 표시된다.
6. 모달 내용:
   - 아이콘: 🔥
   - 제목: "Hardcore Mode"
   - 내용: "You are entering Hardcore 10x mode. All costs and rewards are multiplied by 10x. Please proceed with caution."
   - "Don't ask me again" 체크박스 (기본: 미체크)
   - "Cancel" 버튼 (아웃라인 스타일)
   - "OK" 버튼 (Hardcore 강조 스타일)

---

#### [STORY 4-2] 유저가 Hardcore 전환 팝업에서 OK를 클릭했을 때 Hardcore 필드로 전환되어야 한다.

1. Hardcore 확인 모달이 표시된 상태에서 유저가 "OK" 버튼(`#hardcore-ok-btn`)을 클릭한다.
2. "Don't ask me again" 체크박스가 체크된 경우: `localStorage.setItem('pikit_skip_hardcore_warn', '1')`이 저장된다.
3. 모달이 닫힌다.
4. 필드 토글 체크박스(`#field-toggle-checkbox`)가 checked 상태로 변경된다.
5. `#field-toggle` 요소에 `active` 클래스가 추가되어 UI가 Hardcore 상태를 반영한다.
6. 서버에 `selectField { fieldId: 'hardcore' }` 이벤트가 전송된다.
7. 서버 처리:
   a. 기존 `field:normal` 방에서 소켓이 퇴장한다.
   b. 플레이어가 normal 엔진에서 제거된다. `playerLeft` 이벤트가 normal 필드에 브로드캐스트된다.
   c. 소켓이 `field:hardcore` 방에 입장한다.
   d. 플레이어가 hardcore 엔진에 추가된다. `playerJoined` 이벤트가 hardcore 필드에 브로드캐스트된다.
8. 서버는 `fieldSelected { fieldId: 'hardcore', multiplier: 10 }` 이벤트를 응답한다.
9. 클라이언트는 Shop 패널의 곡괭이/TNT 가격 표시를 10배로 갱신한다. (Basic: 34,000, Power: 88,000, Light: 39,000, Swift: 36,000, TNT: 80,000)
10. 게임 캔버스가 Hardcore 필드의 실시간 상태로 전환된다.

---

#### [STORY 4-3] 유저가 Hardcore 전환 팝업에서 취소를 클릭했을 때 Normal 필드를 유지해야 한다.

1. Hardcore 확인 모달이 표시된 상태에서 유저가 "Cancel" 버튼(`#hardcore-cancel-btn`)을 클릭한다.
2. `_onHardcoreCancel()` 함수가 호출되어 모달이 닫힌다.
3. 필드 토글 체크박스는 unchecked 상태로 유지된다 (이미 모달 표시 전에 되돌려짐).
4. `selectField` 이벤트가 서버로 전송되지 않는다.
5. 유저는 계속 Normal 필드에 머문다. 곡괭이 가격도 1x 그대로 유지된다.

---

#### [STORY 4-4] '다시 묻지 않기'를 체크하고 OK를 클릭한 후 두 번째 Hardcore 전환 시 팝업이 표시되지 않아야 한다.

1. 유저가 Hardcore 전환 팝업에서 "Don't ask me again" 체크박스를 체크하고 "OK"를 클릭한다.
2. `localStorage.setItem('pikit_skip_hardcore_warn', '1')`이 저장된다.
3. 유저가 Normal로 다시 전환 후, 이후 다시 Hardcore 토글을 시도한다.
4. `_initFieldToggle()` 핸들러에서 `localStorage.getItem('pikit_skip_hardcore_warn') === '1'`임을 확인한다.
5. 경고 모달 표시 없이 즉시 `_switchToHardcore()`가 호출된다.
6. 서버로 `selectField { fieldId: 'hardcore' }` 이벤트가 바로 전송된다.
7. 체크박스와 토글 UI가 Hardcore 상태로 즉시 반영된다.

---

#### [STORY 4-5] '다시 묻지 않기' 저장 후 브라우저를 재시작해도 팝업이 다시 나타나지 않아야 한다.

1. `localStorage`에 `pikit_skip_hardcore_warn: '1'`이 저장된 상태에서 유저가 브라우저를 닫고 다시 접속한다.
2. `localStorage`는 브라우저 세션을 초월해 유지된다.
3. Hardcore 토글 시 경고 팝업 없이 즉시 전환된다.

---

#### [STORY 4-6] 유저가 이미 Hardcore 필드에 있는 상태에서 Normal 필드로 전환할 수 있어야 한다.

1. 유저가 Hardcore 필드에서 게임 중이다.
2. 필드 토글 스위치를 클릭해 Normal 방향으로 전환한다.
3. Hardcore → Normal 전환에는 확인 팝업이 없다. 즉시 `_switchToNormal()`이 호출된다.
4. `#field-toggle`에서 `active` 클래스가 제거되고, 체크박스가 unchecked 상태가 된다.
5. 서버에 `selectField { fieldId: 'normal' }` 이벤트가 전송된다.
6. 서버 처리:
   a. `field:hardcore` 방에서 퇴장, hardcore 엔진에서 플레이어 제거, `playerLeft` 브로드캐스트.
   b. `field:normal` 방에 입장, normal 엔진에 플레이어 추가, `playerJoined` 브로드캐스트.
7. 서버가 `fieldSelected { fieldId: 'normal', multiplier: 1 }` 이벤트를 응답한다.
8. Shop 패널의 가격이 1x 기준으로 갱신된다.
9. 게임 캔버스가 Normal 필드 상태로 전환된다.

---

#### [STORY 4-7] 필드 전환 시 이전 필드에서 활성화된 곡괭이들이 제거되는 시나리오를 유저가 인지해야 한다.

1. 유저가 Normal 필드에서 곡괭이를 구매해 낙하 중인 상태이다.
2. 유저가 Hardcore 필드로 전환한다.
3. 서버는 기존 Normal 엔진에서 해당 플레이어를 제거(`removePlayer`)한다.
4. `removePlayer` 과정에서 해당 플레이어 소유의 활성 곡괭이가 Normal 필드에서 제거된다.
5. 유저는 Normal 필드에 더 이상 활성 곡괭이가 없으며, 해당 곡괭이로 채굴한 보상도 더 이상 수신되지 않는다.
6. 유저가 Hardcore 필드에서 새로 곡괭이를 구매해야 채굴을 재개할 수 있다.
7. **현재 UX 주의점**: 필드 전환 시 곡괭이 소멸에 대한 별도 경고는 표시되지 않는다. (개선 고려 사항)

---

#### [STORY 4-8] 로그인하지 않은 상태에서 필드 전환을 시도했을 때 관전 필드가 전환되어야 한다.

1. 비로그인 관전자가 필드 토글을 클릭해 Hardcore로 전환을 시도한다.
2. Hardcore 확인 팝업이 표시된다 (관전자도 동일하게 경고 표시).
3. OK 클릭 후 서버에 `selectField { fieldId: 'hardcore' }` 이벤트가 전송된다.
4. 서버는 소켓을 `field:hardcore` 방으로 이동한다 (플레이어 객체 없음, 관전자로서만 이동).
5. `fieldSelected` 이벤트가 응답된다. 클라이언트는 Hardcore 필드의 게임 상태를 수신해 캔버스에 렌더링한다.
6. 관전자는 Hardcore 필드를 구경할 수 있다. 단, 곡괭이 구매 시도 시 로그인이 요구된다.

---

#### [STORY 4-9] 이미 현재 필드와 동일한 필드를 선택했을 때 서버가 정상 응답을 반환해야 한다.

1. 유저가 이미 Hardcore 필드에 있는 상태에서 `selectField { fieldId: 'hardcore' }`를 전송한다 (UI 버그 또는 직접 요청).
2. 서버는 `oldFieldId === fieldId` 조건을 확인하고 필드 이동 없이 즉시 `fieldSelected` 이벤트를 응답한다.
3. 필요한 경우 `_pendingPlayer`가 있으면 엔진에 추가한다.
4. 유저 상태에 변화 없음. UI에 아무런 변화가 없다.

---

### ❖ 3. 정책 및 데이터 정의

**기본 정책**
- 접속 시 기본 필드: **Normal (1x)**.
- 필드 종류:
  - `normal`: 배율 1x, 표준 비용/보상.
  - `hardcore`: 배율 10x, 모든 곡괭이·TNT 가격 10배, 블록 보상 10배.
- Hardcore 전환 경고: `localStorage('pikit_skip_hardcore_warn')`이 `'1'`이 아닌 경우 항상 표시.
- Normal로의 전환: 경고 없이 즉시 처리.
- 필드 전환 시 이전 필드의 플레이어 상태가 제거되고 활성 곡괭이가 사라진다.

**필드별 가격표 (v4.7)**

| 아이템 | Normal (1x) | Hardcore (10x) |
|---|---|---|
| Basic Pickaxe | 3,400 | 34,000 |
| Power Pickaxe | 8,800 | 88,000 |
| Light Pickaxe | 3,900 | 39,000 |
| Swift Pickaxe | 3,600 | 36,000 |
| TNT | 8,000 | 80,000 |

**로컬스토리지 키**

| 키 | 값 | 설명 |
|---|---|---|
| `pikit_skip_hardcore_warn` | `'1'` | Hardcore 전환 경고 건너뛰기 설정 |

**예외/에러 상황**
- 이미 현재 필드와 동일한 필드 선택 시: 에러 없이 `fieldSelected` 이벤트만 재응답.
- 존재하지 않는 필드 ID 전달 시: 서버가 `fieldId`를 `'normal'`로 강제 처리 (`(data && data.fieldId === 'hardcore') ? 'hardcore' : 'normal'`).

---

### ❖ 4. 의존 영역 및 영향도

- `server/index.js`: `selectField` 이벤트 핸들러, `engines` 맵(normalEngine, hardcoreEngine), 소켓 방 관리.
- `server/game/GameEngine.js`: `addPlayer()`, `removePlayer()` — 플레이어 및 소유 곡괭이 관리.
- `server/game/constants.js`: `FIELD_DEFS`, `PICKAXE_TYPES.price`, `TNT_TYPES.price`.
- `public/js/ui.js`: `_initFieldToggle()`, `_showHardcoreModal()`, `_onHardcoreConfirm()`, `_onHardcoreCancel()`, `updateFieldToggle()`.
- `public/index.html`: `#field-toggle`, `#field-toggle-checkbox`, `#hardcore-confirm-modal`, `#hardcore-dont-ask`.
- `public/js/ui.js` → `renderShop()`: 필드 배율(`multiplier`)을 받아 상점 가격을 재계산해 표시.
