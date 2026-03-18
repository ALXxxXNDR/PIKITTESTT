# PIKIT v4.7 Quest System Overhaul Checklist

## 목표
- [x] 퀘스트 완료 시 완료 상태 UI (색상 변경)
- [x] 완료된 퀘스트는 맨 밑으로 정렬
- [x] 온체인 인덱서로 퀘스트 완료 확인
- [x] 크레딧 분리: 충전 credit + in-game credit
- [x] 마이페이지 크레딧 호버 팝업 (충전 xxx + 인게임 xxx)
- [x] 퀘스트 보상: in-game credit으로 지급
- [x] 심화 퀘스트 체인 (단계별 진행)
- [x] 하우스 엣지 유지하는 보상 밸런스

## Phase 1: 스마트 컨트랙트 ✅
- [x] PikitQuest.sol 업데이트 (questId 1~9999)
- [x] Sepolia 재배포 → `0x739d4559406f21f048F92269e9622C210cb47d55`
- [x] quest-abi.js 업데이트 (batchIsCompleted ABI 포함)

## Phase 2: 서버 — 크레딧 시스템 분리 ✅
- [x] Player.js: inGameCredits 필드 추가
- [x] Player.js: earnInGameCredits(amount) 메서드
- [x] Player.js: spend()에서 inGameCredits 먼저 차감
- [x] Player.js: getBalance() = charged + inGame
- [x] server/index.js: 입출금은 chargedCredits만
- [x] server/index.js: 플레이어 정보에 크레딧 분리 전송

## Phase 3: 서버 — 퀘스트 체인 시스템 ✅
- [x] Player.js: 퀘스트 체인 정의 (14체인 × 7단계 = 94 퀘스트)
- [x] Player.js: 각 체인별 현재 단계 추적
- [x] Player.js: 퀘스트 완료 시 다음 단계 활성화
- [x] Player.js: 보상 in-game credit 지급
- [x] server/index.js: 퀘스트 검증 + 보상 지급

## Phase 4: 클라이언트 — UI 변경 ✅
- [x] 크레딧 호버 팝업 (충전 xxx + 인게임 xxx)
- [x] 퀘스트 패널: 완료 상태 UI (색상 변경 — 녹색 테두리 + 투명도)
- [x] 퀘스트 패널: 완료된 퀘스트 맨 밑 정렬
- [x] 퀘스트 패널: 보상 표시 (골드 색상)
- [x] 퀘스트 패널: 진행률 바

## Phase 5: 문서 ✅
- [x] CHECKLIST 업데이트
- [ ] CHANGELOG 작성

## 퀘스트 체인 설계

### 보상 밸런스 원칙
- v4.7 기준 블록 1개 파괴 비용 ≈ 217 credits (basic pickaxe)
- 플레이어 평균 ROI = 45% (HE 55%)
- 퀘스트 보상 = 소비액의 5~15% (하우스 여전히 이김)
- 초기 단계: 관대 (온보딩), 후반 단계: 보수적

### 퀘스트 체인 목록 (14체인 × 7단계)

1. **전체 블록**: 200→2K→10K→30K→100K→300K→1M
2. **Stone**: 100→1K→5K→20K→50K→200K→1M
3. **Dirt**: 100→1K→5K→20K→50K→200K→1M
4. **Clay**: 50→500→2K→10K→30K→100K→500K
5. **Gravel**: 50→500→2K→10K→30K→100K→500K
6. **Copper**: 50→500→2K→10K→30K→100K→500K
7. **Iron**: 20→200→1K→5K→20K→50K→200K
8. **Emerald**: 10→100→500→2K→10K→30K→100K
9. **Gold**: 5→50→200→1K→5K→20K→100K
10. **Diamond**: 1→10→50→200→1K→5K→30K
11. **곡괭이 구매**: 10→100→500→2K→10K→50K→200K
12. **TNT 구매**: 5→50→200→1K→5K→20K→100K
13. **크레딧 획득**: 50K→500K→5M→50M→500M
14. **로그인 일수**: 1→7→30→100→365

## 통합 테스트 결과
```
✅ All server modules loaded OK
✅ Credit split: balance=10000 charged=10000 inGame=0
✅ Quest chains: 14
✅ Total quests: 94
✅ Chain 1 after completing T1: 101(✓), 102(→)
✅ In-game credits after reward: 3000
✅ After spend 2000: charged=10000 inGame=1000
```
