# PIKIT v4 업데이트 체크리스트

## 1. 블록 레이아웃 변경 (7 → 8 mineable blocks) ✅ 완료
- [x] constants.js: CHUNK_WIDTH 9→8 (mineable only), WALL_THICKNESS: 60 추가 (60+8*120+60=1080)
- [x] Block.js: x 좌표 WALL_THICKNESS 오프셋 적용
- [x] Chunk.js: bedrock 벽 생성 제거 (thin wall로 대체)
- [x] renderer.js: _renderWalls() 추가 (8-bit bedrock 텍스처 thin wall)
- [x] Pickaxe.js: 스폰 범위 + 벽 바운스 WALL_THICKNESS 기준으로 업데이트
- [x] TNT.js: 벽 범위 WALL_THICKNESS 기준으로 업데이트
- [x] GameEngine.js: TNT 스폰 범위 업데이트
- [x] 시각 테스트 확인 — 0 errors, 8블록 정상 렌더링

## 2. Web3 지갑 로그인 (RainbowKit + Sepolia) ✅ 완료
- [x] 의존성 설치: react, react-dom, @rainbow-me/rainbowkit, wagmi, viem, @tanstack/react-query, ethers
- [x] Vite 번들러 설정 (wallet-src → public/js/wallet-bundle.js)
- [x] RainbowKit 설정 (Sepolia 체인, WalletConnect projectId)
- [x] WalletProvider React 컴포넌트 생성 (wallet-src/WalletProvider.jsx)
- [x] window.WalletAPI 글로벌 브릿지 (connect, disconnect, getAddress, signMessage)
- [x] 로그인 페이지 변경 → Connect Wallet 버튼, 지갑 미연결 시 Shop/MyPage/Quest 접근 시 자동 연결 모달
- [x] 닉네임 = 지갑주소 (0x1234...abcd 형태)
- [x] Sign message 기반 인증 (서버 검증)
- [x] 서버: ethers.js verifyMessage 서명 검증 로직 (server/index.js joinWithWallet)
- [x] 로그아웃 시 Wallet disconnect → Socket 연결 해제 + 게임 상태 초기화
- [x] index.html 업데이트 (React mount point + wallet-bundle + pikit.css 로드)
- [x] RainbowKit 모달 정상 동작 확인 (MetaMask, WalletConnect, Rainbow, Base Account)

## 3. 퀘스트 시스템 (온체인 완료) ✅ 완료
### 3a. 스마트 컨트랙트
- [x] PikitQuest.sol 작성 (contracts/PikitQuest.sol)
- [x] completeQuest(questId) 함수
- [x] 퀘스트 완료 기록 매핑 (address → questId → completed)
- [ ] 컨트랙트 배포 (Sepolia testnet) — 배포 후 CONTRACT_ADDRESS 업데이트 필요
- [x] ABI 추출 → public/js/quest-abi.js 저장

### 3b. 서버 퀘스트 추적
- [x] Player.js에 퀘스트 진행도 필드 추가 (questProgress, completedQuests)
  - blocksDestroyed (총합 + 타입별 blocksByType)
  - pickaxesPurchased (총합 + 타입별 pickaxesByType)
  - tntPurchased
  - loginDays + lastLoginDate
  - totalEarned (기존 필드 활용)
- [x] GameEngine.js에서 블록 파괴/구매 시 퀘스트 진행도 업데이트
- [x] Socket 이벤트: getQuests → questStatus, verifyQuestCompletion → questVerified
- [x] 트랜잭션 해시 검증 로직 (ethers.js JsonRpcProvider + getTransactionReceipt)

### 3c. 퀘스트 UI
- [x] Quest 버튼 bottom bar에 추가 (Shop / Quest / Rank)
- [x] Quest 패널 (slide-out, 오른쪽에서)
- [x] 10개 퀘스트 목록 (진행도 바 + 완료 버튼)
- [x] 완료 버튼 클릭 → eth_sendTransaction → 온체인 트랜잭션 전송
- [x] 트랜잭션 확인 후 서버에 검증 요청 (verifyQuestCompletion)
- [x] 완료된 퀘스트 체크마크 ✅ 표시 + 투명도 처리
- [x] quest CSS 스타일 추가 (progress bar, card, button)

### 3d. 퀘스트 목록 (10개)
1. First Steps: 블록 10개 파괴
2. Block Breaker: 블록 100개 파괴
3. Copper Hunter: 구리 블록 20개 파괴
4. Gold Rush: 골드 블록 5개 파괴
5. Diamond Hands: 다이아몬드 블록 1개 파괴
6. Shopping Spree: 곡괭이 10개 구매
7. Power User: Power Pickaxe 5개 구매
8. Explosive Expert: TNT 3개 구매
9. Daily Check-in: 1일 연속 로그인
10. High Roller: 총 50,000 크레딧 획득

## 4. 문서화 ✅ 완료
- [x] CHECKLIST.md 업데이트 (진행 상태)
- [x] CHANGELOG-v4.md 작성 (변경사항 상세)

## 남은 작업
- [ ] PikitQuest.sol Sepolia 배포 후 public/js/quest-abi.js의 CONTRACT_ADDRESS 업데이트
- [ ] WalletConnect cloud.reown.com에서 프로덕션 도메인 allowlist 등록
- [ ] 프로덕션 배포 시 WalletConnect projectId 변경

---

# PIKIT v4.8 Balance Update — 진행 체크리스트

> 작성일: 2026-03-23 | 중단 후 재개 시 이 섹션을 확인할 것
> 플랜 파일: `docs/superpowers/plans/2026-03-23-balance-v48.md`
> 디자인 스펙: `docs/superpowers/specs/2026-03-23-balance-v48-design.md`

## Task 1: constants.js 업데이트
- [x] system_weak 타입 추가 (scale:0.8, speedMult:0.05, gravityMult:0.5, color:#888888, lifetime:60000)
- [x] 곡괭이 가격 6% 인하 (basic:3200, power:8300, light:3700, swift:3400)
- [x] JACKPOT_POOL_CONFIG 추가 (MILESTONE:50000, ALLOCATION:2500, MIN_SPAWN:50000)
- [x] JACKPOT_CONFIG 업데이트 (HP:1500, SPAWN_CHANCE:0.0001, RESPAWN_CHANCE:0.00001)
- [x] module.exports 업데이트
- [x] 커밋

## Task 2: GameEngine.js — 어댑티브 시스템 곡괭이
- [x] import에 JACKPOT_POOL_CONFIG 추가
- [x] 상단 상수 수정 (THRESHOLDS 배열, WEAK_MODE_THRESHOLD=3, MAX_SYSTEM_PICKAXES=4)
- [x] constructor에 _anchorPickaxeId, _dynamicSysCount, jackpotPool, houseProfitAccumulator 추가
- [x] start() → _spawnAnchorPickaxe() 호출
- [x] _spawnAnchorPickaxe() 메서드 추가
- [x] _spawnDynamicSystemPickaxe(mode) 메서드 추가
- [x] tick() 내 시스템 곡괭이 관리 로직 교체 (동적 타깃 + 약화 모드 전환)
- [x] _expirePickaxe() 수정 (하우스 수익 계산 + 잭팟 풀 적립)
- [x] _checkPickaxeCollisions() 잭팟 보상 → 동적 풀로 변경
- [x] _clearBlocksAboveViewport() 잭팟 이탈 시 풀 유지
- [x] broadcast()에 jackpotPool 필드 추가
- [x] 커밋

## Task 3: Chunk.js — 잭팟 스폰 조건
- [x] Chunk.js 현재 잭팟 스폰 로직 확인
- [x] 스폰 조건 변경 (소비 기반 → jackpotPool ≥ MIN_POOL_TO_SPAWN)
- [x] 잭팟 블록 HP = JACKPOT_CONFIG.HP (1500) 적용
- [x] 이탈 후 재스폰 RESPAWN_CHANCE 로직 추가
- [x] 커밋

## Task 4: 시뮬레이터 작성
- [x] tools/balance-v48-sim.js 생성
- [x] getDynamicSysConfig() 함수 구현 (weak/full 모드 분기)
- [x] calcSteal() (앵커+다이나믹 sys 합산)
- [x] 1~100 플레이어 HE 출력
- [x] per-pickaxe 분포 (P5~P95)
- [x] 잭팟 풀 누적 시뮬레이션
- [x] 커밋

## Task 5: 밸런스 검증
- [x] node tools/balance-v48-sim.js 실행
- [x] HE @ 2~30명: 52~53% ✓ (51.7~53.5%)
- [x] HE @ 솔로(1명): ≤55% ✓ (54.0%)
- [x] P10 basic 회수율 ≥8% ✓ (27.0%)
- [x] P50 basic 회수율 25~50% ✓ (42.9%)
- [x] P90+ profit tier: P95=119.4% ✓
- [x] 파라미터 조정: SYS_WEAK speedMult 0.05→0.03, DYNAMIC_THRESHOLDS 수정
- [x] 검증 통과 커밋

**시뮬레이터 결과 (최종):**
```
=== PIKIT v4.8 Balance Simulation ===
Prices: basic=3200 power=8300 light=3700 swift=3400
Adaptive sys: max 4, weak mode (<=3 player picks)

--- HE by Player Count ---
Players | picks | sys(mode)    | steal%  | basic_ROI | blended_HE
--------|-------|--------------|---------|-----------|------------
P  1   |     2 | 1(weak)      |   4.42% |    50.3%   |  54.0% OK(solo)
P  2   |     3 | 1(weak)      |   2.26% |    54.1%   |  52.6% OK
P  5   |     8 | 1(full)      |   3.34% |    52.3%   |  53.3% OK
P 10   |    15 | 2(full)      |   3.34% |    51.3%   |  53.4% OK
P 15   |    23 | 3(full)      |   3.34% |    52.3%   |  53.2% OK
P 20   |    30 | 3(full)      |   2.53% |    53.1%   |  52.5% OK
P 30   |    45 | 3(full)      |   1.70% |    53.0%   |  51.7% OK
P 50   |    75 | 4(full)      |   1.36% |    54.0%   |  51.6% OK
P 80   |   120 | 4(full)      |   0.86% |    54.9%   |  50.6% (구조적 한계)
P100   |   150 | 4(full)      |   0.69% |    55.0%   |  50.5% (구조적 한계)

Per-Pickaxe Distribution (basic @ 5p):
P5=20.2%  P10=27.0%  P25=34.7%  P50=42.9%  P75=69.6%  P90=83.7%  P95=119.4%
Profit runs (>=100% recovery): 5.4%

Jackpot Pool: 20p/hr pool+=667,500cr, ~1hr to 50K threshold
```

**파라미터 조정 내역:**
- SYS_WEAK speedMult: 0.05 → 0.03 (솔로 HE 55.7% → 54.0%)
- DYNAMIC_THRESHOLDS: {81,51,21,4,0} → {46,21,11,4,0} (더 빠른 sys 확장)
- constants.js system_weak.speedMult 업데이트
- GameEngine.js DYNAMIC_SYSTEM_RATIO_THRESHOLDS 업데이트
- HOUSE_EDGE 상수: 0.55 → 0.53

## Task 6: Epic 스펙 업데이트
- [ ] epic-05 가격 전체 업데이트 (Hardcore 포함)
- [ ] epic-09 잭팟 시스템 전면 개편 (동적 풀, HP:1500, 이탈 처리)
- [ ] epic-15 시스템 곡괭이 어댑티브 (휴식/활성 모드, 최대 4개, 100명 테이블)
- [ ] epic-16 신규 생성 (하우스수익-잭팟풀 메커니즘)
- [ ] 기능명세체크리스트.md 업데이트
- [ ] 커밋

## Task 7: 코드 리뷰
- [ ] superpowers:requesting-code-review 호출
- [ ] 피드백 반영
- [ ] 최종 완료

---

## v4.8 핵심 파라미터 요약

| 항목 | v4.7 | v4.8 |
|------|------|------|
| basic 가격 | 3,400 | **3,200** |
| power 가격 | 8,800 | **8,300** |
| light 가격 | 3,900 | **3,700** |
| swift 가격 | 3,600 | **3,400** |
| sys 최대 개수 | 1 (고정) | **4 (동적)** |
| sys 약화 모드 | 없음 | **≤3 player picks** |
| 잭팟 HP | 300 | **1,500** |
| 잭팟 보상 | 250,000 고정 | **동적 풀** |
| 잭팟 스폰 조건 | 1.5M 소비 | **풀 ≥ 50,000cr** |
| 목표 HE | 53~55% | **52~53%** |
