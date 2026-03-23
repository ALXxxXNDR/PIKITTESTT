# PIKIT 기능명세서 작성 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PIKIT 게임의 전체 기능명세서를 유저 플로우 관점에서 Epic/Story 형식으로 작성한다.

**Architecture:** 기존 `docs/superpowers/specs/parts/` 폴더의 개발자 관점 명세를 유저 플로우 관점으로 완전히 재작성한다. Epic별로 독립 MD 파일을 생성하고, 진행 상황을 `기능명세체크리스트.md`에서 추적한다. 총 15개 Epic을 5개 그룹으로 나눠 병렬 처리한다.

**Tech Stack:** Markdown 문서 작성 전용 (코드 없음)

---

## 작성 원칙

모든 명세는 다음 원칙을 따른다:

1. **비개발자 관점**: DOM ID(`#myinfo-popup`), 소켓 이벤트(`joinWithWallet`), 함수명(`_requireWallet()`) 등 기술 용어 절대 금지
2. **유저 행동 단위**: "유저가 X를 하면 Y가 된다" 형식
3. **완전한 시나리오**: 모든 버튼의 클릭 결과, 모든 모달의 열고/닫기, 모든 에러 상황 포함
4. **서식**:
   - Epic: `## ✦ [EPIC N] {이름}`
   - Story: `### [STORY N-M] 유저는 ~ 할 수 있어야 한다.`
   - 각 Story는 번호가 매겨진 단계별 플로우로 구성

---

## 파일 구조

| 파일 경로 | 내용 |
|---------|------|
| `docs/superpowers/specs/기능명세체크리스트.md` | 전체 진행 현황 추적 |
| `docs/superpowers/specs/epic-01-게임접속-관전.md` | Epic 1 |
| `docs/superpowers/specs/epic-02-로그인.md` | Epic 2 |
| `docs/superpowers/specs/epic-03-크레딧관리.md` | Epic 3 |
| `docs/superpowers/specs/epic-04-필드선택.md` | Epic 4 |
| `docs/superpowers/specs/epic-05-곡괭이구매-채굴.md` | Epic 5 |
| `docs/superpowers/specs/epic-06-TNT구매-폭발.md` | Epic 6 |
| `docs/superpowers/specs/epic-07-블록보상-알림.md` | Epic 7 |
| `docs/superpowers/specs/epic-08-콤보시스템.md` | Epic 8 |
| `docs/superpowers/specs/epic-09-잭팟시스템.md` | Epic 9 |
| `docs/superpowers/specs/epic-10-퀘스트.md` | Epic 10 |
| `docs/superpowers/specs/epic-11-리더보드.md` | Epic 11 |
| `docs/superpowers/specs/epic-12-채팅.md` | Epic 12 |
| `docs/superpowers/specs/epic-13-내정보팝업.md` | Epic 13 |
| `docs/superpowers/specs/epic-14-USDC입출금.md` | Epic 14 |
| `docs/superpowers/specs/epic-15-시스템곡괭이.md` | Epic 15 |

---

## Task 1: 체크리스트 파일 생성

**Files:**
- Create: `docs/superpowers/specs/기능명세체크리스트.md`

- [ ] **Step 1: 체크리스트 파일 생성**

다음 내용으로 `docs/superpowers/specs/기능명세체크리스트.md`를 생성한다:

```markdown
# PIKIT 기능명세서 작성 체크리스트

작성 기준: v4.7 코드베이스
작성일: 2026-03-19
목적: 유저 플로우 관점의 기능명세서 (비개발자용)

## 진행 현황

| Epic | 파일 | 상태 |
|------|------|------|
| Epic 1 - 게임 접속 및 관전 | epic-01-게임접속-관전.md | ⬜ 미완료 |
| Epic 2 - 로그인 | epic-02-로그인.md | ⬜ 미완료 |
| Epic 3 - 크레딧 관리 | epic-03-크레딧관리.md | ⬜ 미완료 |
| Epic 4 - 필드 선택 | epic-04-필드선택.md | ⬜ 미완료 |
| Epic 5 - 곡괭이 구매 및 채굴 | epic-05-곡괭이구매-채굴.md | ⬜ 미완료 |
| Epic 6 - TNT 구매 및 폭발 | epic-06-TNT구매-폭발.md | ⬜ 미완료 |
| Epic 7 - 블록 보상 및 알림 | epic-07-블록보상-알림.md | ⬜ 미완료 |
| Epic 8 - 콤보 시스템 | epic-08-콤보시스템.md | ⬜ 미완료 |
| Epic 9 - 잭팟 시스템 | epic-09-잭팟시스템.md | ⬜ 미완료 |
| Epic 10 - 퀘스트 | epic-10-퀘스트.md | ⬜ 미완료 |
| Epic 11 - 리더보드 | epic-11-리더보드.md | ⬜ 미완료 |
| Epic 12 - 채팅 | epic-12-채팅.md | ⬜ 미완료 |
| Epic 13 - 내 정보 팝업 | epic-13-내정보팝업.md | ⬜ 미완료 |
| Epic 14 - USDC 입출금 | epic-14-USDC입출금.md | ⬜ 미완료 |
| Epic 15 - 시스템 곡괭이 | epic-15-시스템곡괭이.md | ⬜ 미완료 |

## 작성 완료 기준

- [ ] 모든 15개 Epic 파일 생성 완료
- [ ] 각 파일에 기술 용어(소켓 이벤트명, 함수명, DOM ID 등) 없음
- [ ] 모든 모달의 열기/닫기 시나리오 포함
- [ ] 모든 에러/실패 시나리오 포함
- [ ] 유저 행동 단위로 분해된 Step-by-Step 플로우 작성
```

- [ ] **Step 2: 커밋**

```bash
git add docs/superpowers/specs/기능명세체크리스트.md
git commit -m "docs: add functional spec checklist"
```

---

## Task 2: Epic 1~3 작성 (그룹 A)

**Files:**
- Create: `docs/superpowers/specs/epic-01-게임접속-관전.md`
- Create: `docs/superpowers/specs/epic-02-로그인.md`
- Create: `docs/superpowers/specs/epic-03-크레딧관리.md`

**참고 소스 (읽기 전용):** `docs/superpowers/specs/parts/epic1-4.md` 의 Epic 1~3

### Epic 1 - 게임 접속 및 관전 포함 내용:

Story 목록:
- [STORY 1-1] 유저는 처음 웹사이트에 접속하면 로그인 없이 게임 화면을 즉시 볼 수 있어야 한다.
- [STORY 1-2] 유저는 화면 상단에서 게임의 실시간 정보를 확인할 수 있어야 한다.
- [STORY 1-3] 유저는 메뉴 버튼을 클릭해 게임 정보 패널을 열 수 있어야 한다.
  - 메뉴 패널 열기
  - 게임 정보(플레이어 수, 활성 곡괭이 수) 확인
  - 블록 가이드(블록 종류, 보상, 확률) 확인
  - X 버튼으로 닫기
  - 패널 외부 클릭으로 닫기
- [STORY 1-4] 유저는 희귀 블록이 등장했을 때 알림 배너를 볼 수 있어야 한다.
  - 다이아몬드 블록 등장 배너
  - 잭팟 블록 등장 배너
  - 4초 후 자동 사라짐
- [STORY 1-5] 유저는 다른 플레이어가 희귀 블록을 채굴했을 때 배너 알림을 볼 수 있어야 한다.
  - Gold Block 채굴 배너 (10초)
  - Diamond Block 채굴 배너 (10초)
  - Jackpot Block 채굴 배너 (15초)
- [STORY 1-6] 유저는 잭팟 이벤트 알림을 볼 수 있어야 한다.
- [STORY 1-7] 유저는 다른 플레이어가 곡괭이를 구매하면 그 곡괭이가 화면에 나타나는 것을 볼 수 있어야 한다.
- [STORY 1-8] 유저는 모바일 기기에서 접속해도 게임 화면이 정상적으로 표시되어야 한다.
- [STORY 1-9] 유저는 채팅창에서 다른 플레이어의 대화를 볼 수 있어야 한다.
  - 채팅창 항상 표시
  - 비로그인 시 채팅 전송 불가 안내
- [STORY 1-10] 서버 연결이 끊겼을 때 화면이 멈추는 상황을 유저가 경험할 수 있다.

### Epic 2 - 로그인 포함 내용:

Story 목록:
- [STORY 2-1] 유저는 닉네임을 입력해 게임에 참여할 수 있어야 한다.
  - 참여 성공 시 10,000 크레딧 지급
  - 채팅에 입장 메시지 표시
- [STORY 2-2] 유저가 허용되지 않는 특수문자를 입력하면 자동으로 제거되어야 한다.
- [STORY 2-3] 유저가 닉네임을 12자 초과로 입력하면 자동으로 잘려야 한다.
- [STORY 2-4] 유저가 공백만 입력하면 기본 닉네임이 부여되어야 한다.
- [STORY 2-5] 유저는 MetaMask 지갑을 연결해 로그인할 수 있어야 한다.
  - Shop/Quest/Rank 버튼 클릭 시 지갑 연결 안내
  - RainbowKit 모달 열림
  - MetaMask 선택 및 승인
  - 서명 요청 팝업
  - 로그인 완료 후 HUD 갱신
- [STORY 2-6] 유저가 MetaMask 서명 요청을 거부하면 로그인이 중단되어야 한다.
- [STORY 2-7] 유저가 지갑 연결 팝업을 닫으면 로그인이 중단되어야 한다.
- [STORY 2-8] 이미 로그인된 상태에서 재로그인을 시도하면 차단되어야 한다.
- [STORY 2-9] 유저는 내 정보 팝업에서 로그아웃 버튼을 눌러 게임을 나갈 수 있어야 한다.
  - 확인 다이얼로그 표시
  - 확인 클릭 시 로그아웃
  - 취소 클릭 시 취소
- [STORY 2-10] 유저가 로그아웃 확인에서 취소를 클릭하면 로그아웃이 취소되어야 한다.
- [STORY 2-11] 유저가 브라우저를 새로고침하면 세션이 종료되어야 한다.

### Epic 3 - 크레딧 관리 포함 내용:

Story 목록:
- [STORY 3-1] 유저는 로그인 시 초기 크레딧 10,000을 자동으로 받아야 한다.
- [STORY 3-2] 유저는 무료 크레딧 충전 버튼으로 크레딧을 받을 수 있어야 한다.
  - Shop 패널의 충전 버튼
  - 내 정보 팝업의 충전 버튼
  - 충전 성공 토스트 표시
- [STORY 3-3] 유저가 무료 크레딧을 30초 내 5회 초과 충전 시도하면 충전이 거부되어야 한다.
- [STORY 3-4] 유저는 화면 상단에서 크레딧 잔액을 실시간으로 확인할 수 있어야 한다.
  - 잔액 숫자 표시
  - 커서를 올리면 충전 크레딧/인게임 크레딧 구분 표시
- [STORY 3-5] 유저는 곡괭이 구매 후 잔액이 즉시 차감되는 것을 확인할 수 있어야 한다.
- [STORY 3-6] 유저는 블록 파괴 보상을 받을 때 잔액이 자동으로 증가하는 것을 확인할 수 있어야 한다.
- [STORY 3-7] 유저의 크레딧이 부족하면 곡괭이 구매가 불가능해야 한다.
- [STORY 3-8] 유저는 내 정보 팝업에서 손익(수익/손실)을 확인할 수 있어야 한다.
- [STORY 3-9] 유저는 USDC 입금을 통해 크레딧을 추가할 수 있어야 한다. (지갑 로그인 전용)
- [STORY 3-10] 유저는 크레딧을 USDC로 출금할 수 있어야 한다. (지갑 로그인 전용)

- [ ] **Step 1: Epic 1 파일 작성**

파일: `docs/superpowers/specs/epic-01-게임접속-관전.md`

작성 지침:
- 유저 플로우 관점으로만 작성
- 기술 용어 금지 (소켓, ID, 함수명 등)
- 모든 UI 요소를 "버튼", "배너", "팝업", "화면 상단" 등 일반 용어로 표현
- 예시: ~~`socket.emit('join', ...)`~~ → "유저가 게임 참여 버튼을 클릭한다"

파일 헤더 형식:
```markdown
# PIKIT 기능명세서 — Epic 1: 게임 접속 및 관전

> 작성 기준: v4.7 | 작성일: 2026-03-19
> 관점: 유저 플로우 (비개발자용)

---

## ✦ [EPIC 1] 게임 접속 및 관전 서비스

### 목적
PIKIT 게임에 접속한 유저가 로그인 없이도 게임 화면을 바로 볼 수 있어야 한다.
게임에서 일어나는 모든 이벤트(희귀 블록 등장, 잭팟 등)를 실시간으로 확인할 수 있어야 한다.

---
```

- [ ] **Step 2: Epic 2 파일 작성**

파일: `docs/superpowers/specs/epic-02-로그인.md`

- [ ] **Step 3: Epic 3 파일 작성**

파일: `docs/superpowers/specs/epic-03-크레딧관리.md`

- [ ] **Step 4: 체크리스트 업데이트**

`기능명세체크리스트.md`에서 Epic 1~3 상태를 `✅ 완료`로 변경한다.

- [ ] **Step 5: 커밋**

```bash
git add docs/superpowers/specs/epic-01-게임접속-관전.md \
        docs/superpowers/specs/epic-02-로그인.md \
        docs/superpowers/specs/epic-03-크레딧관리.md \
        docs/superpowers/specs/기능명세체크리스트.md
git commit -m "docs: add user-flow spec for epics 1-3 (access, login, credits)"
```

---

## Task 3: Epic 4~6 작성 (그룹 B)

**Files:**
- Create: `docs/superpowers/specs/epic-04-필드선택.md`
- Create: `docs/superpowers/specs/epic-05-곡괭이구매-채굴.md`
- Create: `docs/superpowers/specs/epic-06-TNT구매-폭발.md`

**참고 소스:** `docs/superpowers/specs/parts/epic1-4.md` (Epic 4), `docs/superpowers/specs/parts/epic5-7.md` (Epic 5~6)

### Epic 4 - 필드 선택 포함 내용:

Story 목록:
- [STORY 4-1] 유저는 Normal 필드에서 Hardcore 필드로 처음 전환 시 경고 팝업을 보아야 한다.
  - 화면 상단의 필드 전환 스위치 클릭
  - 경고 팝업 표시: 아이콘, 제목, 내용
  - "다시 묻지 않기" 체크박스
  - "취소" 버튼
  - "확인" 버튼
- [STORY 4-2] 유저가 Hardcore 전환 팝업에서 확인을 클릭하면 Hardcore 필드로 전환되어야 한다.
  - 팝업 닫힘
  - 필드 전환 완료
  - 상점 가격이 10배로 표시 변경
  - 게임 화면이 Hardcore 필드로 전환
- [STORY 4-3] 유저가 Hardcore 전환 팝업에서 취소를 클릭하면 Normal 필드를 유지해야 한다.
- [STORY 4-4] '다시 묻지 않기'를 체크하고 확인 후 두 번째 Hardcore 전환 시 팝업이 표시되지 않아야 한다.
- [STORY 4-5] '다시 묻지 않기' 저장 후 브라우저 재시작해도 팝업이 다시 나타나지 않아야 한다.
- [STORY 4-6] 유저가 Hardcore 필드에서 Normal 필드로 전환할 수 있어야 한다. (팝업 없음)
- [STORY 4-7] 유저는 필드 전환 시 이전 필드의 곡괭이가 사라짐을 인지해야 한다.
- [STORY 4-8] 비로그인 상태에서 필드 전환 시 관전 화면만 전환되어야 한다.

### Epic 5 - 곡괭이 구매 및 채굴 포함 내용:

Story 목록:
- [STORY 5-1] 유저는 상점 버튼을 클릭해 구매 가능한 곡괭이 목록을 볼 수 있어야 한다.
  - "현재 활성 곡괭이: N/3" 표시
  - 4종 곡괭이 카드 (이름, 가격, 설명)
  - TNT 카드
  - 패널 열기 애니메이션
- [STORY 5-2] 유저는 상점 패널의 X 버튼으로 패널을 닫을 수 있어야 한다.
- [STORY 5-3] 유저는 패널 외부 영역을 클릭해 상점 패널을 닫을 수 있어야 한다.
- [STORY 5-4] 유저는 각 곡괭이의 상세 스펙을 상점에서 확인할 수 있어야 한다.
  - Basic: 설명, 가격
  - Power: 설명, 가격
  - Light: 설명, 가격
  - Swift: 설명, 가격
- [STORY 5-5] 유저는 Normal 필드에서 곡괭이를 구매할 수 있어야 한다.
  - 카드 클릭 → 구매 완료
  - 잔액 즉시 차감
  - 게임 화면 상단에서 곡괭이 등장
- [STORY 5-6] 유저는 Hardcore 필드에서 10배 가격으로 곡괭이를 구매할 수 있어야 한다.
- [STORY 5-7] 유저는 잔액 부족으로 구매에 실패할 수 있다.
  - 오류 메시지 토스트 표시
  - 잔액 변동 없음
- [STORY 5-8] 비로그인 유저가 상점을 열려 하면 로그인 안내를 받아야 한다.
- [STORY 5-9] 유저는 3개 한도 초과로 구매에 실패할 수 있다.
  - 오류 토스트 표시
  - "Active Pickaxes: 3/3" 빨간색 표시
- [STORY 5-10] 유저는 구매한 곡괭이가 게임 화면에서 낙하 시작하는 것을 볼 수 있어야 한다.
- [STORY 5-11] 유저는 곡괭이가 블록에 충돌하며 튕기는 것을 볼 수 있어야 한다.
- [STORY 5-12] 유저는 블록 파괴 시 크레딧 보상을 실시간으로 받아야 한다.
- [STORY 5-13] 유저는 곡괭이 수명 만료 시 결과 알림을 받아야 한다.
  - 획득 크레딧, 파괴 블록 수 포함
- [STORY 5-14] 유저는 여러 곡괭이를 동시에 운용할 수 있어야 한다 (최대 3개).
- [STORY 5-15~17] 각 곡괭이 타입의 특성 (Swift 빠름, Light 부유, Power 고데미지)

### Epic 6 - TNT 구매 및 폭발 포함 내용:

Story 목록:
- [STORY 6-1] 유저는 상점에서 TNT의 가격과 폭발 설명을 확인할 수 있어야 한다.
- [STORY 6-2] 유저는 Normal 필드에서 TNT를 구매할 수 있어야 한다.
  - 카드 클릭 → 구매
  - 게임 화면에서 TNT 낙하 시작
- [STORY 6-3] 유저는 Hardcore 필드에서 TNT를 구매할 수 있어야 한다 (80,000 크레딧).
- [STORY 6-4] 유저는 잔액 부족으로 TNT 구매에 실패할 수 있다.
- [STORY 6-5] TNT가 블록에 닿으면 즉시 폭발해야 한다.
  - 폭발 애니메이션 표시
  - 주변 블록들 파괴
- [STORY 6-6] TNT 폭발 범위 내 일반 블록이 파괴되고 보상이 지급되어야 한다.
- [STORY 6-7] 희귀 블록(Diamond/Gold/Emerald)은 TNT에 더 강한 내성을 가진다.
  - 폭발해도 즉시 파괴되지 않음
  - HP만 일부 감소
- [STORY 6-8] TNT로 잭팟 블록을 공격해도 즉시 파괴는 불가해야 한다.
- [STORY 6-9] TNT 폭발 보상이 큰 경우 화면 측면 피드에 표시되어야 한다.
- [STORY 6-10] 유저는 여러 TNT를 연속으로 구매할 수 있어야 한다.
- [STORY 6-11] 유저가 게임을 나가면 구매했던 TNT가 사라져야 한다.

- [ ] **Step 1: Epic 4 파일 작성**

파일: `docs/superpowers/specs/epic-04-필드선택.md`

- [ ] **Step 2: Epic 5 파일 작성**

파일: `docs/superpowers/specs/epic-05-곡괭이구매-채굴.md`

- [ ] **Step 3: Epic 6 파일 작성**

파일: `docs/superpowers/specs/epic-06-TNT구매-폭발.md`

- [ ] **Step 4: 체크리스트 업데이트 및 커밋**

---

## Task 4: Epic 7~9 작성 (그룹 C)

**Files:**
- Create: `docs/superpowers/specs/epic-07-블록보상-알림.md`
- Create: `docs/superpowers/specs/epic-08-콤보시스템.md`
- Create: `docs/superpowers/specs/epic-09-잭팟시스템.md`

**참고 소스:** `docs/superpowers/specs/parts/epic5-7.md` (Epic 7), `docs/superpowers/specs/parts/epic8-12.md` (Epic 8~9)

### Epic 7 - 블록 보상 및 알림 포함 내용:

Story 목록:
- [STORY 7-1] 유저는 메뉴 패널에서 블록 가이드를 확인할 수 있어야 한다.
  - 메뉴 버튼 클릭 → 패널 열기
  - 블록 목록 (이름, 보상, 등장 확률) 표시
  - X 버튼으로 닫기
- [STORY 7-2] 유저는 메뉴 패널을 닫을 수 있어야 한다.
- [STORY 7-3] 일반 블록(돌/흙/자갈/점토) 파괴 시 즉시 보상이 지급되어야 한다.
- [STORY 7-4] Iron Block은 여러 번 공격해야 파괴되며 파괴 시 보상이 지급되어야 한다.
  - 공격 횟수에 따라 블록에 균열 이미지 변화
- [STORY 7-5~6] Copper Block, Emerald Block 파괴 보상
- [STORY 7-7] Diamond Block 파괴 시 높은 보상과 전체 알림 배너가 표시되어야 한다.
- [STORY 7-8] Diamond Block 등장 시 전체 유저에게 스폰 알림 배너가 표시되어야 한다.
- [STORY 7-9] Gold Block 등장 시 전체 유저에게 스폰 알림 배너가 표시되어야 한다.
- [STORY 7-10] 스폰 알림 배너는 4초 후 자동으로 사라져야 한다.
- [STORY 7-11] Diamond/Gold Block 파괴 시 전체 배너 알림을 모든 유저가 받아야 한다.
- [STORY 7-12] 유저는 화면 측면에서 고가 보상 이벤트 피드를 실시간으로 확인할 수 있어야 한다.
- [STORY 7-13] 잭팟 블록 등장 시 전체 알림이 표시되어야 한다.

### Epic 8 - 콤보 시스템 포함 내용:

Story 목록:
- [STORY 8-1] 유저는 첫 블록 파괴 시 기본 보상(배율 없음)을 받아야 한다.
- [STORY 8-2~6] 연속 타격 3/6/10/15/25회 달성 시 각각 보상 배율 증가 (1.05x~1.5x)
- [STORY 8-7] 2초 이내 연속 파괴 시 콤보가 유지되어야 한다.
- [STORY 8-8] 2초 초과 시 콤보가 초기화되어야 한다.
- [STORY 8-9] 여러 곡괭이를 동시 운용 시 각 곡괭이의 콤보는 독립적이어야 한다.
- [STORY 8-10] Hardcore 필드에서 콤보 배율과 필드 배율이 중첩 적용되어야 한다.

### Epic 9 - 잭팟 시스템 포함 내용:

Story 목록:
- [STORY 9-1] 잭팟 조건 미충족 시 잭팟 블록이 등장하지 않아야 한다.
- [STORY 9-2] 잭팟 등장 조건(활성 플레이어 10명+, 누적 소비 1.5M+)이 충족되면 등장 가능해야 한다.
- [STORY 9-3] 잭팟 블록 등장 시 전체 알림을 확인할 수 있어야 한다.
- [STORY 9-4] 유저는 곡괭이로 잭팟 블록을 공략할 수 있어야 한다.
- [STORY 9-5] TNT로 잭팟 블록 공략 시 40% 피해만 적용되어야 한다.
- [STORY 9-6] 잭팟 블록 파괴 시 250,000 크레딧을 수령해야 한다.
- [STORY 9-7] 잭팟 블록 파괴 시 파괴자 포함 전체 알림이 표시되어야 한다.
- [STORY 9-8] 카메라가 잭팟 블록 위치를 벗어나면 잭팟 블록이 소멸되어야 한다.
- [STORY 9-9] 잭팟 파괴 후 누적 소비 카운터가 초기화되어야 한다.

- [ ] **Step 1: Epic 7 파일 작성** → `docs/superpowers/specs/epic-07-블록보상-알림.md`
- [ ] **Step 2: Epic 8 파일 작성** → `docs/superpowers/specs/epic-08-콤보시스템.md`
- [ ] **Step 3: Epic 9 파일 작성** → `docs/superpowers/specs/epic-09-잭팟시스템.md`
- [ ] **Step 4: 체크리스트 업데이트 및 커밋**

---

## Task 5: Epic 10~12 작성 (그룹 D)

**Files:**
- Create: `docs/superpowers/specs/epic-10-퀘스트.md`
- Create: `docs/superpowers/specs/epic-11-리더보드.md`
- Create: `docs/superpowers/specs/epic-12-채팅.md`

**참고 소스:** `docs/superpowers/specs/parts/epic8-12.md` (Epic 10~12)

### Epic 10 - 퀘스트 포함 내용:

Story 목록:
- [STORY 10-1] 유저는 퀘스트 버튼을 클릭해 퀘스트 패널을 열 수 있어야 한다.
  - 패널 열기 (로그인 필요)
  - 퀘스트 목록 표시
- [STORY 10-2] 유저는 퀘스트 패널을 닫을 수 있어야 한다.
  - X 버튼으로 닫기
  - 외부 클릭으로 닫기
- [STORY 10-3] 비로그인 유저가 퀘스트 버튼을 클릭하면 로그인 안내가 표시되어야 한다.
- [STORY 10-4] 유저는 각 퀘스트의 진행률 바를 확인할 수 있어야 한다.
  - 이름, 설명, 목표값, 현재값, 진행률 바
  - 완료된 퀘스트는 하단에 배치
- [STORY 10-5] 유저가 블록을 파괴하면 관련 퀘스트 진행 카운터가 증가해야 한다.
- [STORY 10-6] 유저가 퀘스트 목표를 달성하면 온체인 완료 버튼이 활성화되어야 한다.
- [STORY 10-7] 유저는 "완료 등록" 버튼을 클릭해 지갑 서명 요청을 받아야 한다.
  - 버튼 클릭 → 지갑 서명 요청 팝업
  - 버튼이 "전송 중..." 상태로 변경
- [STORY 10-8] 유저가 트랜잭션에 서명하면 검증 중 상태가 표시되어야 한다.
  - 버튼이 "확인 중..." 상태로 변경
  - 토스트 알림 표시
- [STORY 10-9] 트랜잭션 확인 완료 시 퀘스트가 완료 처리되고 보상이 지급되어야 한다.
  - "완료" 배지 표시
  - 인게임 크레딧 지급
- [STORY 10-10] 유저가 트랜잭션을 거부하면 오류 처리가 되어야 한다.
  - 버튼 복원
  - 오류 메시지 표시
- [STORY 10-11] 지갑 미연결 상태에서 완료 버튼을 클릭하면 연결 안내가 표시되어야 한다.
- [STORY 10-12] 이미 완료된 퀘스트를 재완료하려 하면 거부되어야 한다.
- [STORY 10-14] 유저는 매일 로그인으로 일일 퀘스트를 진행할 수 있어야 한다.
- [STORY 10-15] 유저는 특정 블록 파괴 퀘스트를 달성해 보상을 받을 수 있어야 한다.

퀘스트 체인 목록 (유저 플로우로):
- 블록 파괴자 (총 블록 파괴)
- 돌 채굴자, 흙 채굴자, 점토 채굴자, 자갈 채굴자
- 구리 사냥꾼, 철 단조사, 에메랄드 탐색자, 황금 러시, 다이아몬드 핸즈
- 쇼핑 왕 (곡괭이 구매), 폭발 전문가 (TNT 구매)
- 하이 롤러 (총 획득 크레딧), 일일 플레이어 (로그인 일수)

### Epic 11 - 리더보드 포함 내용:

Story 목록:
- [STORY 11-1] 유저는 리더보드 버튼을 클릭해 순위 팝업을 열 수 있어야 한다.
  - 로그인 필요
  - Top 10 표시
- [STORY 11-2] 유저는 팝업의 X 버튼으로 리더보드를 닫을 수 있어야 한다.
- [STORY 11-3] 유저는 팝업 외부 클릭으로 리더보드를 닫을 수 있어야 한다.
- [STORY 11-4] 비로그인 유저가 리더보드 클릭 시 로그인 안내가 표시되어야 한다.
- [STORY 11-5] 유저는 리더보드에서 Top 10 플레이어의 순이익을 확인할 수 있어야 한다.
- [STORY 11-6] 1위/2위/3위에 금/은/동 강조가 적용되어야 한다.
- [STORY 11-7] 순이익 양수 시 녹색, 음수 시 빨간색으로 표시되어야 한다.
- [STORY 11-8] 리더보드가 열려 있으면 약 2초마다 자동 갱신되어야 한다.
- [STORY 11-9] 플레이어가 없을 때 "플레이어 없음" 메시지가 표시되어야 한다.
- [STORY 11-10] Hardcore 필드로 이동하면 리더보드가 Hardcore 필드 플레이어만 표시해야 한다.

### Epic 12 - 채팅 포함 내용:

Story 목록:
- [STORY 12-1] 유저는 채팅 버튼을 클릭해 입력창을 열 수 있어야 한다.
- [STORY 12-2] 유저는 메시지 입력 후 Enter 키로 전송할 수 있어야 한다.
- [STORY 12-3] 유저는 전송 버튼 클릭으로 메시지를 전송할 수 있어야 한다.
- [STORY 12-4] 유저는 Escape 키로 채팅 입력창을 닫을 수 있어야 한다.
- [STORY 12-5] 유저는 채팅 버튼을 다시 클릭해 입력창을 닫을 수 있어야 한다.
- [STORY 12-6] 비로그인 유저가 채팅 전송 시도 시 로그인 안내가 표시되어야 한다.
- [STORY 12-7] 유저가 200자 초과 메시지를 입력하면 자동으로 잘려야 한다.
- [STORY 12-8] 유저가 1초 내 연속 전송 시도 시 두 번째 메시지가 무시되어야 한다.
- [STORY 12-9] 유저는 같은 필드 다른 플레이어의 메시지를 실시간으로 볼 수 있어야 한다.
- [STORY 12-10] 유저는 다른 플레이어 입장 시 시스템 메시지를 확인할 수 있어야 한다.
- [STORY 12-11] 유저는 다른 플레이어 퇴장 시 시스템 메시지를 확인할 수 있어야 한다.
- [STORY 12-12] 채팅 메시지가 100개를 초과하면 오래된 메시지가 자동 삭제되어야 한다.
- [STORY 12-13] Normal 필드 채팅은 Hardcore 필드 유저에게 표시되지 않아야 한다.

- [ ] **Step 1: Epic 10 파일 작성** → `docs/superpowers/specs/epic-10-퀘스트.md`
- [ ] **Step 2: Epic 11 파일 작성** → `docs/superpowers/specs/epic-11-리더보드.md`
- [ ] **Step 3: Epic 12 파일 작성** → `docs/superpowers/specs/epic-12-채팅.md`
- [ ] **Step 4: 체크리스트 업데이트 및 커밋**

---

## Task 6: Epic 13~15 작성 (그룹 E)

**Files:**
- Create: `docs/superpowers/specs/epic-13-내정보팝업.md`
- Create: `docs/superpowers/specs/epic-14-USDC입출금.md`
- Create: `docs/superpowers/specs/epic-15-시스템곡괭이.md`

**참고 소스:** `docs/superpowers/specs/parts/epic13-15-appendix.md`

### Epic 13 - 내 정보 팝업 포함 내용:

Story 목록:
- [STORY 13-1] 유저는 화면 상단의 '내 정보' 버튼을 클릭해 팝업을 열 수 있어야 한다.
  - 이름, 잔액, 손익 표시
  - 기본 탭: 개요(Overview)
- [STORY 13-2] 유저는 팝업 내 X 버튼으로 팝업을 닫을 수 있어야 한다.
- [STORY 13-3] 유저는 팝업 외부 영역을 클릭해 팝업을 닫을 수 있어야 한다.
- [STORY 13-4] 비로그인 유저가 '내 정보' 버튼 클릭 시 지갑 연결 안내가 표시되어야 한다.
- [STORY 13-5] 유저는 개요 탭에서 잔액, 총 획득, 총 소비, 손익을 확인할 수 있어야 한다.
- [STORY 13-6] 손익이 양수일 때 녹색으로 표시되어야 한다.
- [STORY 13-7] 손익이 음수일 때 빨간색으로 표시되어야 한다.
- [STORY 13-8] 유저는 팝업 내 '무료 크레딧 충전' 버튼으로 크레딧을 충전할 수 있어야 한다.
- [STORY 13-9] 유저는 '로그아웃' 버튼 클릭 시 확인 팝업을 볼 수 있어야 한다.
- [STORY 13-10] 확인 다이얼로그에서 '확인' 클릭 시 로그아웃이 완료되어야 한다.
- [STORY 13-11] 확인 다이얼로그에서 '취소' 클릭 시 로그아웃이 취소되어야 한다.
- [STORY 13-12] 유저는 팝업 내 탭을 클릭해 개요/입금/출금 탭을 전환할 수 있어야 한다.
- [STORY 13-13] 닉네임 로그인 유저는 입출금 탭을 이용할 수 없어야 한다.

### Epic 14 - USDC 입출금 포함 내용:

Story 목록:
**입금(Deposit):**
- [STORY 14-1] 유저는 입금 탭을 열어 입금 화면을 확인할 수 있어야 한다.
  - 금액 입력 필드
  - +/- 조절 버튼
  - 예상 수령 크레딧 미리보기
  - 입금 버튼
- [STORY 14-2] 유저는 입금 금액을 직접 입력할 수 있어야 한다.
- [STORY 14-3] 금액 입력 시 예상 수령 크레딧이 실시간으로 표시되어야 한다. (1 USDC = 10,000 크레딧)
- [STORY 14-4] 유저는 +/- 버튼으로 1 USDC 단위로 금액을 조정할 수 있어야 한다.
- [STORY 14-5~8] 입금 버튼 클릭 → 승인 요청 → 서명 → 입금 처리 → 완료
  - 각 단계별 버튼 상태 변화 (승인 중, 대기 중, 입금 중, 확인 중)
  - 토스트 알림
- [STORY 14-9] 서버 확인 완료 시 크레딧이 지급되어야 한다.
- [STORY 14-10] 입금 완료 후 잔액이 즉시 갱신되어야 한다.
- [STORY 14-11~12] 서명 거부 시 오류 처리
- [STORY 14-13] 진행 중 버튼이 비활성화되어야 한다.

**출금(Withdraw):**
- [STORY 14-14] 유저는 출금 탭을 열어 출금 화면을 확인할 수 있어야 한다.
  - 금액 입력 필드
  - +/- 조절 버튼
  - 차감될 크레딧 미리보기 (수수료 5% 포함)
  - 출금 버튼
- [STORY 14-15~17] 금액 입력 및 조절
- [STORY 14-18~21] 출금 버튼 클릭 → 트랜잭션 서명 → 처리 → 완료
- [STORY 14-22] 잔액 부족 시 출금 버튼 클릭 시 오류 메시지가 표시되어야 한다.
- [STORY 14-23] 출금 트랜잭션 거부 시 크레딧은 차감되지 않아야 한다.
- [STORY 14-24] 지갑 미연결 시 입출금 시도 시 오류 메시지가 표시되어야 한다.
- [STORY 14-25] 서비스 미준비 시 오류 메시지가 표시되어야 한다.
- [STORY 14-26] 소수점 금액 입력은 자동으로 정수로 변환되어야 한다.
- [STORY 14-27] 동일한 트랜잭션으로 크레딧을 중복 획득할 수 없어야 한다.

### Epic 15 - 시스템 곡괭이 포함 내용:

Story 목록:
- [STORY 15-1] 게임 시작 시 PIKIT 곡괭이(분홍색)가 자동으로 필드에 등장해야 한다.
- [STORY 15-2] PIKIT 곡괭이가 블록에 접촉하면 블록을 파괴해야 한다.
  - 파괴 보상은 플레이어에게 가지 않음
- [STORY 15-3] PIKIT 곡괭이는 상점에 표시되지 않아야 한다.
- [STORY 15-4] PIKIT 곡괭이는 일반 곡괭이와 시각적으로 구별되어야 한다.
  - 분홍색, 큰 크기, 매우 느린 이동
- [STORY 15-5] PIKIT 곡괭이가 제거된 후 5초 이내에 자동으로 다시 등장해야 한다.
- [STORY 15-6] 게임에 많은 플레이어가 참여할수록 PIKIT 곡괭이의 영향력이 줄어든다.

- [ ] **Step 1: Epic 13 파일 작성** → `docs/superpowers/specs/epic-13-내정보팝업.md`
- [ ] **Step 2: Epic 14 파일 작성** → `docs/superpowers/specs/epic-14-USDC입출금.md`
- [ ] **Step 3: Epic 15 파일 작성** → `docs/superpowers/specs/epic-15-시스템곡괭이.md`
- [ ] **Step 4: 최종 체크리스트 업데이트 및 커밋**

---

## 실행 전략

각 Task를 독립적인 서브에이전트로 병렬 처리한다:
- **Task 1** (체크리스트): 즉시 실행
- **Task 2~6** (그룹 A~E): Task 1 완료 후 모두 병렬 실행

각 서브에이전트는 반드시:
1. `docs/superpowers/specs/parts/` 의 기존 파일들을 읽어 내용 파악
2. 유저 플로우 관점으로만 재작성
3. 기술 용어 제거 검증 후 파일 저장
4. 체크리스트 업데이트

---

*계획 완료 — 총 15개 Epic, 약 150+ Story 항목*
