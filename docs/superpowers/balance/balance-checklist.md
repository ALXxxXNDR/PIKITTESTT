# PIKIT 밸런스 조정 체크리스트

## 1. 조정 전 준비

- [ ] 현재 버전 확인 (constants.js 가격, GameEngine.js 파라미터)
- [ ] 현재 시뮬레이터 결과 기록 (node tools/balance-v48-sim.js 실행 후 balance-history.md에 기록)
- [ ] 조정 이유 명확히 기술

## 2. 조정 대상 파라미터

- **곡괭이 가격** (constants.js): basic, power, light, swift
- **시스템 곡괭이** (GameEngine.js): DYNAMIC_SYSTEM_RATIO_THRESHOLDS, WEAK_MODE_THRESHOLD, SYS_FULL/SYS_WEAK speedMult/gravityMult
- **잭팟** (constants.js + Chunk.js): JACKPOT_CONFIG.HP, JACKPOT_POOL_CONFIG.MILESTONE/ALLOCATION
- **블록 보상** (constants.js): BLOCK_TYPES reward values

## 3. 검증 기준

- [ ] HE @ 솔로(P1): ≤55%, ≥51.5%
- [ ] HE @ P2~P30: 목표 51.5~53.5%
- [ ] HE @ P50+: ≥49% (구조적 한계 허용)
- [ ] P10 basic 회수율 ≥20%
- [ ] P50 basic 회수율 35~55%
- [ ] P95 basic 회수율 ≥100% (수익 케이스 존재)
- [ ] 잭팟 풀: 20명 기준 ~1시간 내 50,000cr 달성

## 4. 시뮬레이터 실행

- [ ] node tools/balance-v48-sim.js 실행
- [ ] 결과 캡처 후 balance-history.md에 기록
- [ ] 검증 기준 모두 충족 확인
- [ ] 미충족 시 파라미터 재조정 후 반복

## 5. 코드 반영

- [ ] constants.js 업데이트
- [ ] GameEngine.js 업데이트 (thresholds 변경 시)
- [ ] tools/balance-v48-sim.js 업데이트 (prices, thresholds 동기화)
- [ ] 두 파일이 완전히 동기화되었는지 확인

## 6. 커밋

- [ ] git add + git commit
- [ ] balance-history.md에 커밋 해시 기록
- [ ] 관련 Notion Epic 스펙 업데이트 (가격 변동 시 Epic 5, 6)
