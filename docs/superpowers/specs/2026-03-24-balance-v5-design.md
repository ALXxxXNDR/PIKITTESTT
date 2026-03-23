# PIKIT v5.0 Balance Rebalance Design

## Overview

기존 인원수 기반 곡괭이 개수 조절 밸런싱을 폐기하고, 블록 확률/보상 기반 하우스 엣지 시스템으로 전환.

### Core Principles
- **환수율 90%**: 유저가 100 쓰면 평균 90 회수. 하우스는 매출의 10% 구조적 확보.
- **곡괭이 1개 제한**: 플레이어당 활성 곡괭이 최대 1개
- **시스템 곡괭이 1개 고정**: 게임 진행 + 변수 창출용 (adaptive scaling 제거)
- **블록 10종**: Netherite Block 신규 추가 (다이아몬드 아래 티어)

---

## 1. Block System (10 types + bedrock + jackpot)

### Parameters
- HP 증폭계수: x1.80
- 보상 증폭계수: x2.51
- 감쇠계수: x1.20
- 최고효율: x20.00

### Block Definitions

| Tier | Name | HP | Reward | Weight (%) | Color |
|------|------|-----|--------|------------|-------|
| 1 | Dirt | 10 | 10 | 19.88 | #8B5E3C |
| 2 | Clay | 18 | 25 | 16.56 | #A09070 |
| 3 | Gravel | 32 | 63 | 13.80 | #696969 |
| 4 | Stone | 58 | 159 | 11.50 | #808080 |
| 5 | Copper Block | 105 | 399 | 9.59 | #B87333 |
| 6 | Iron Block | 190 | 1,003 | 7.99 | #BC8F8F |
| 7 | Emerald Block | 342 | 2,520 | 6.66 | #50C878 |
| 8 | Gold Block | 616 | 6,333 | 5.55 | #FFD700 |
| 9 | Netherite Block (NEW) | 1,110 | 15,916 | 4.62 | #4A3728 |
| 10 | Diamond Block | 2,000 | 40,000 | 3.85 | #00CED1 |

Total weight: 100.00%
Average reward per damage point (Emap): x4.29

### Weight Conversion for Code
Weights are percentages that sum to 100. For the code's integer weight system:
- dirt: 1988, clay: 1656, gravel: 1380, stone: 1150
- copper: 959, iron: 799, emerald: 666, gold: 555
- netherite: 462, diamond: 385

### tntResist
- Tiers 7-10 (emerald, gold, netherite, diamond): tntResist = true
- Tiers 1-6: tntResist = false

---

## 2. Pickaxe System (5 user types + 1 system)

### User Pickaxes

| Tier | Name | Price | Damage | Target Avg Hits | Total Expected Dmg | Expected Return (90%) |
|------|------|-------|--------|-----------------|--------------------|-----------------------|
| 1 | Basic Pickaxe | 1,000 | 14 | 15 | 210 | 900 |
| 2 | Power Pickaxe | 2,000 | 30 | 14 | 420 | 1,800 |
| 3 | Light Pickaxe | 3,000 | 48 | 13 | 624 | 2,700 |
| 4 | Swift Pickaxe | 4,000 | 70 | 12 | 840 | 3,600 |
| 5 | Elite Pickaxe (NEW) | 5,000 | 95 | 11 | 1,045 | 4,500 |

### Physics Tuning Strategy
각 곡괭이의 gravity, speed, scale, lifetime을 조정하여 목표 평균 타격 횟수를 달성.
- 비싼 곡괭이일수록 타격 횟수가 적지만 (15→11), 한방 데미지가 높음
- 물리 파라미터로 타격 빈도 제어:
  - **gravity**: 높을수록 빠르게 낙하 → 블록 접촉 빈도 증가
  - **scale**: 클수록 충돌 면적 증가 → 타격 확률 증가
  - **speedMult**: 높을수록 횡이동 활발 → 다양한 블록 접촉
  - **lifetime**: 길수록 총 타격 기회 증가

### Proposed Physics Parameters

| Pickaxe | scale | gravityMult | speedMult | lifetime(ms) |
|---------|-------|-------------|-----------|-------------|
| basic | 0.8 | 1.0 | 1.0 | 30000 |
| power | 1.0 | 1.0 | 1.0 | 30000 |
| light | 0.7 | 0.5 | 1.0 | 35000 |
| swift | 0.75 | 1.0 | 1.6 | 25000 |
| elite | 0.9 | 0.8 | 1.3 | 28000 |

Note: 물리 파라미터는 시뮬레이션/플레이테스트로 미세 조정 필요

### System Pickaxe (PIKIT)

| Property | Value |
|----------|-------|
| damage | 8 |
| scale | 1.2 |
| gravityMult | 0.8 (빠른 낙하) |
| speedMult | 0.6 (넓은 튕김) |
| lifetime | Infinity |

역할: 빠른 게임 진행, 변수 창출. 1개 고정 (adaptive scaling 제거).

---

## 3. Removed Systems

- **DYNAMIC_SYSTEM_RATIO_THRESHOLDS**: 제거 (시스템 곡괭이 1개 고정)
- **system_weak 모드**: 제거
- **WEAK_MODE_THRESHOLD**: 제거
- **MAX_SYSTEM_PICKAXES**: 제거 (항상 1개)
- **MAX_PICKAXES_PER_PLAYER**: 3 → 1
- **동적 시스템 곡괭이 스폰**: 제거 (_spawnDynamicSystemPickaxe 등)

---

## 4. Constants Changes Summary

### HOUSE_EDGE
- 0.52 → 0.10 (하우스는 매출의 10% 확보, 환수율 90%)

### GAME constants
- GRAVITY, TERMINAL_VELOCITY: 변경 없음 (곡괭이별 gravityMult로 제어)

### Jackpot System
- 변경 없음 (기존 pool-based 시스템 유지)

---

## 5. New Asset: Netherite Block

Netherite Block은 기존 블록 테마와 일관된 8-bit 레트로 픽셀아트 스타일로 renderer.js에 프로시저럴 캔버스 캐시로 구현.
- 색상: #4A3728 (다크 브라운/블랙 계열)
- 디자인: 마인크래프트 네더라이트 블록 참고, 어두운 갈색 베이스 + 금색 하이라이트 패턴

---

## 6. Verification

### Mathematical Verification
- Pickaxe 1: 14 dmg × 15 hits × 4.29 Emap = 900.9 ≈ 1000 × 0.90 ✓
- Pickaxe 2: 30 dmg × 14 hits × 4.29 Emap = 1801.8 ≈ 2000 × 0.90 ✓
- Pickaxe 3: 48 dmg × 13 hits × 4.29 Emap = 2677.4 ≈ 3000 × 0.90 ✓
- Pickaxe 4: 70 dmg × 12 hits × 4.29 Emap = 3603.6 ≈ 4000 × 0.90 ✓
- Pickaxe 5: 95 dmg × 11 hits × 4.29 Emap = 4483.1 ≈ 5000 × 0.90 ✓

### Block Weight Sum
19.88 + 16.56 + 13.80 + 11.50 + 9.59 + 7.99 + 6.66 + 5.55 + 4.62 + 3.85 = 100.00% ✓
