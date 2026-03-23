# PIKIT 밸런스 히스토리

## v4.7 (기준선)

- 가격: basic 3400 / power 8800 / light 3900 / swift 3600
- sys: 1개 고정
- 잭팟 HP: 300, 보상: 250,000 고정
- 목표 HE: 53~55%

---

## v4.8 (2026-03-23)

- 가격: basic 3100 / power 8100 / light 3600 / swift 3300
- sys: 최대 4개 동적, weak mode ≤3 player picks
- SYS_WEAK speedMult: 0.03, DYNAMIC_THRESHOLDS: {46,21,11,4,0}
- 잭팟 HP: 1500, 보상: 동적 풀, 스폰 조건: pool ≥ 50,000cr
- 콤보 시스템 포함 (오류 - v4.9에서 제거)
- 결과: HE 51.7~53.5% (P2~P30)
- 커밋: 8645d03

---

## v4.9 (2026-03-23) — 현재

- 가격: basic 3050 / power 7950 / light 3500 / swift 3250
- 콤보 시스템 완전 제거 (코드+시뮬레이터)
- DYNAMIC_SYSTEM_RATIO_THRESHOLDS 버그 수정: sysCnt=dynamic count (anchor 제외)
  - 수정 전: {46→4, 21→3, 11→2, 4→1, 0→0} (total count 해석 오류로 sys 과잉 생성)
  - 수정 후: {46→3, 21→2, 11→1, 4→0, 0→0} (dynamic count 정확)
- HE 하한선: 51.5% (절대값)
- 결과:
  ```
  P1 solo: 53.5% OK | P2: 51.8% OK | P5: 52.7% OK
  P10: 52.6% OK | P15: 52.7% OK | P20: 51.8% OK
  P30+: 50~51% (구조적 한계)
  Per-pickaxe: P10=27.4% P50=43.4% P95=127.2%
  ```
- 커밋: c0ff2a6

---

## 다음 조정 예정

- 모든 Epic/Story 정리 완료 후 진행
- HE 하한선 51.5% 엄수
