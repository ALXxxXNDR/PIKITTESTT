# PIKIT 프로젝트 규칙

## Source of Truth
- **Notion이 최종 기준 문서.** 로컬 스펙 파일보다 Notion 우선.
- 메인 기획서: https://www.notion.so/PIKIT-325ed4562dd480508249f1742a10baf2

## ISSUE TRACKER 칸반보드 등록 규칙
- 데이터베이스 data_source: `collection://7ceed456-2dd4-83f4-918c-07e31656070e`
- Epic → 이슈유형: `Epic`
- Story → 이슈유형: `Story`, 상위 항목: 해당 Epic의 페이지 URL
- 상위 항목 ↔ 하위 항목은 자동 연결 (관계형 필드)
- **우선순위 / 시작일·마감일 / 작업상태 / 담당자 / 스프린트는 건드리지 않음**
- Notion 원본 Epic 페이지에서 STORY 제목을 그대로 사용
- 등록 절차: Epic 생성 → Story 일괄 생성 (상위 항목에 Epic URL 연결)

## Epic 문서 템플릿
- 표준 형식: 목적/배경 → User Story(토글) → 정책/데이터 → 의존 영역 → Sign-off
- 템플릿 원본: https://www.notion.so/32eed4562dd48016b7abc43f81d924b8

## 크레딧 시스템
- 충전 크레딧 (출금 가능): USDC 입금 + 블록 채굴 보상
- 인게임 크레딧 (출금 불가): 퀘스트 보상만
- 구매 시 차감 순서: 인게임 크레딧 우선, 부족분은 충전 크레딧
- 채굴 보상은 항상 충전 크레딧 (구매에 사용한 크레딧 종류와 무관)
