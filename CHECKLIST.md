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
