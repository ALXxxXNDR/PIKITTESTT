# Settings Panel & Keyboard Shortcuts Design

## Overview

PIKIT 게임에 설정 패널과 키보드 단축키 구매 기능을 추가한다.

## Components

### 1. Settings Gear Button
- **위치**: `#hud-right` 내부, `#myinfo-btn` 왼쪽
- **크기**: 36x36px 정사각형 (`hud-btn` 클래스 재사용)
- **아이콘**: Lucide `settings` SVG (톱니바퀴)
- **동작**: 클릭 시 Settings 패널 토글

### 2. Settings Slide Panel
- **구조**: 기존 `slide-panel` 패턴 재사용 (오른쪽 슬라이드)
- **ID**: `#settings-panel`
- **헤더**: SVG 톱니바퀴 + "Settings" + close 버튼

#### 설정 항목

| 섹션 | 항목 | 타입 | 기본값 | 저장 |
|------|------|------|--------|------|
| Notifications | Spawn Alert | toggle | ON | localStorage |
| Notifications | Reward Alert | toggle | ON | localStorage |
| Sound | Dimming System | toggle | OFF | localStorage |
| Gameplay | Shortcut Protection | toggle | ON | localStorage |

- **Keyboard Shortcuts 가이드**: 패널 하단에 키-아이템 매핑 표시
- **알림 토글 연동**: 설정 패널의 Spawn/Reward 토글은 기존 `#notif-toggle-panel`의 토글과 양방향 동기화

### 3. Keyboard Shortcuts System
- **키 매핑**:
  - `1` → Basic Pickaxe (1,000cr)
  - `2` → Power Pickaxe (2,000cr)
  - `3` → Light Pickaxe (3,000cr)
  - `4` → Swift Pickaxe (4,000cr)
  - `5` → Elite Pickaxe (5,000cr)
  - `T` / `t` → TNT (6,000cr)
- **조건**: 로그인 상태 + 채팅 입력창 비활성 시에만 동작
- **구매 로직**: 기존 `GameSocket.buyPickaxe(type)` / `GameSocket.buyTNT()` 재사용

### 4. Shortcut Protection (확인 팝업)
- **Shortcut Protection ON (기본)**:
  1. 최초 키 입력 → 확인 팝업 표시
  2. 팝업에서 같은 키를 다시 누르거나 "Purchase" 클릭 → 구매 실행
  3. "Don't ask me again" 체크 + 구매 → 해당 키에 대해 이후 즉시 구매
  4. Cancel 클릭 또는 다른 키 입력 → 팝업 닫힘
- **Shortcut Protection OFF**: 키 입력 즉시 구매 (확인 팝업 없음)
- **저장**: localStorage `pikit_shortcut_skip_{key}` 키별 독립 저장

#### 팝업 디자인
- 기존 `confirm-modal` 스타일 재사용
- 제목: "Shortcut Alert"
- 본문: "Press {key} again to purchase {item name}."
- 체크박스: "Don't ask me again"
- 버튼: Cancel / Purchase
- TNT는 빨간색 변형 (destructive 액센트)

## UI State 확장

```javascript
// UI 객체에 추가
settingsOpen: false,
shortcutPending: null,  // { key, type, itemName } - 확인 대기 중인 단축키
```

## File Changes

| 파일 | 변경 내용 |
|------|----------|
| `public/index.html` | Settings 버튼, Settings 패널, Shortcut 확인 모달 HTML 추가 |
| `public/css/style.css` | Settings 패널, 토글 스타일, 확인 모달 CSS 추가 |
| `public/js/ui.js` | `toggleSettings()`, 단축키 핸들러, 확인 팝업 로직 추가 |

## localStorage Keys

| Key | Type | Default | 용도 |
|-----|------|---------|------|
| `pikit_spawn_alert` | boolean | true | Spawn 알림 on/off |
| `pikit_reward_alert` | boolean | true | Reward 알림 on/off |
| `pikit_sound_dimming` | boolean | false | 사운드 디밍 on/off |
| `pikit_shortcut_protection` | boolean | true | 단축키 보호 on/off |
| `pikit_shortcut_skip_1` | boolean | false | 1번 키 확인 건너뛰기 |
| `pikit_shortcut_skip_2` | boolean | false | 2번 키 확인 건너뛰기 |
| `pikit_shortcut_skip_3` | boolean | false | 3번 키 확인 건너뛰기 |
| `pikit_shortcut_skip_4` | boolean | false | 4번 키 확인 건너뛰기 |
| `pikit_shortcut_skip_5` | boolean | false | 5번 키 확인 건너뛰기 |
| `pikit_shortcut_skip_t` | boolean | false | T 키 확인 건너뛰기 |

## Edge Cases

- 채팅 입력 중 단축키 무시 (기존 `chatOpen` 체크)
- 패널/팝업 열려있을 때 단축키 무시 (shopOpen, questOpen 등)
- 비로그인 시 단축키 → 기존 로그인 안내 플로우 트리거
- 확인 팝업 열려있을 때 같은 키 → 즉시 구매, 다른 키 → 팝업 닫고 새 팝업
- 500ms 구매 쿨다운은 기존 서버 로직 그대로 적용
