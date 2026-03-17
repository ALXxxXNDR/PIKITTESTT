# PIKIT v4.1 업데이트 체크리스트

## 0. 컨트랙트 배포
- [x] .env 파일에 DEPLOYER_PRIVATE_KEY 설정
- [ ] deploy.js 스크립트 작성
- [ ] Sepolia에 PikitQuest.sol 배포
- [ ] quest-abi.js CONTRACT_ADDRESS 업데이트

## 1. Daily Check-in UTC 00시 기준 초기화 ✅ 완료
- [x] Player.js: loginDays를 UTC 날짜 기준으로 계산 (toISOString = UTC)
- [x] 서버 접속 시 자동으로 trackLogin() 호출 (selectField에서 호출)
- [x] UTC 00:00 기준으로 날짜 변경 감지

## 2. PIKIT 시스템 곡괭이 무한 지속 ✅ 완료
- [x] constants.js: system pickaxe lifetime → Infinity
- [x] Pickaxe.js: Infinity lifetime 처리 (만료 체크 스킵)
- [x] Pickaxe.js: serialize()에서 Infinity → -1로 JSON 안전 변환
- [x] 시스템 곡괭이 만료 안되도록 보장

## 3. 시스템 곡괭이 3개 → 1개 ✅ 완료
- [x] GameEngine.js: SYSTEM_PICKAXE_TARGET 3→1
- [x] 관련 스폰 로직 확인 (start()에서 초기 1개 스폰)

## 4. 듀얼 필드 시스템 (일반 + 10x 하드코어) ✅ 완료
- [x] GameEngine: fieldId, rewardMultiplier, roomName 파라미터 추가
- [x] GameEngine: 모든 io.emit → io.to(roomName).emit 변경 (4곳)
- [x] GameEngine: buyPickaxe/buyTNT에 effectivePrice = price * multiplier 적용
- [x] GameEngine: 보상에 rewardMultiplier 적용 (pickaxe 충돌 + TNT 폭발)
- [x] server/index.js: normalEngine(1x) + hardcoreEngine(10x) 두 인스턴스
- [x] server/index.js: selectField 소켓 이벤트 + 필드 전환 로직
- [x] server/index.js: 모든 게임 이벤트를 getPlayerEngine() 기반으로 라우팅
- [x] server/index.js: 채팅 필드별 격리 (io.to(roomName).emit)
- [x] 필드 선택 UI (로그인 → 필드 선택 → 게임 화면 흐름)
- [x] 10x 필드: 지옥/하드코어 시각 테마 (빨간 배경, 용암 벽, 불씨 파티클)
- [x] 필드 표시 HUD 뱃지 (#field-indicator)
- [x] Shop 가격 multiplier 적용 표시

## 5. 블록 호버 정보 (마우스) ✅ 완료
- [x] renderer.js: screenToCanvas() CSS→내부 좌표 변환
- [x] renderer.js: updateHoverPosition() + _renderHoverTooltip()
- [x] main.js: mousemove 이벤트로 hover 위치 추적
- [x] 블록 위에 마우스 올리면 이름 + 기대 보상 크레딧 표시
- [x] Block.js: serialize()에 name, reward, rewardType, color 추가

## 6. 희귀 블록 출현 알림 (상위 3개) ✅ 완료
- [x] Chunk.js: RARE_ALERT_TYPES (diamond, gold, emerald) 감지
- [x] GameEngine.js: _onRareBlockSpawned() → 필드별 rareBlockSpawned 이벤트
- [x] 초기 청크 생성 시 알림 스팸 방지 (running 체크)
- [x] socket.js: rareBlockSpawned 이벤트 핸들러
- [x] main.js: onRareBlockSpawned → UI.showRareBlockSpawnAlert()
- [x] ui.js: showRareBlockSpawnAlert() 구현 (다이아/골드/에메랄드 각각 스타일)
- [x] style.css: .rare-spawn-alert 스타일 추가

## 7. 문서화 ✅ 완료
- [x] CHECKLIST-v4.1.md 업데이트 (진행 상태)
- [x] CHANGELOG-v4.md 업데이트 (v4.1 변경사항)

## 남은 작업
- [ ] deploy.js 작성 + PikitQuest.sol Sepolia 배포 (사용자 프라이빗 키 필요)
- [ ] quest-abi.js의 CONTRACT_ADDRESS 업데이트
