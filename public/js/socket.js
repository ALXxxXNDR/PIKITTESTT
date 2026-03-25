// ============================================
// Socket.IO Communication Module
// ============================================

const GameSocket = {
  socket: null,
  gameConfig: null,
  pickaxeTypes: null,
  tntTypes: null,
  blockTypes: null,
  fields: null,
  currentField: null,
  currentMultiplier: 1,
  player: null,
  onStateUpdate: null,

  _reconnectAttempts: 0,
  _maxReconnectAttempts: 3,
  _connectErrorTimer: null,
  _initialConnected: false,

  connect() {
    this.socket = io({ reconnectionAttempts: this._maxReconnectAttempts });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
      this._reconnectAttempts = 0;
      this._initialConnected = true;
      // Hide overlays
      const ro = document.getElementById('reconnect-overlay');
      const ce = document.getElementById('connect-error-screen');
      if (ro) ro.style.display = 'none';
      if (ce) ce.style.display = 'none';
      if (this._connectErrorTimer) { clearInterval(this._connectErrorTimer); this._connectErrorTimer = null; }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this._reconnectAttempts = 0;
      // Show reconnection overlay
      const ro = document.getElementById('reconnect-overlay');
      const msg = document.getElementById('reconnect-message');
      const att = document.getElementById('reconnect-attempts');
      const btn = document.getElementById('reconnect-refresh-btn');
      if (ro) { ro.style.display = 'block'; if (msg) msg.textContent = '연결 끊김 - 재연결 중...'; if (btn) btn.style.display = 'none'; if (att) att.textContent = ''; }
      if (this.onDisconnect) this.onDisconnect(reason);
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      this._reconnectAttempts = attempt;
      const att = document.getElementById('reconnect-attempts');
      if (att) att.textContent = `재연결 시도 ${attempt}/${this._maxReconnectAttempts}`;
    });

    this.socket.io.on('reconnect_failed', () => {
      const msg = document.getElementById('reconnect-message');
      const btn = document.getElementById('reconnect-refresh-btn');
      if (msg) msg.textContent = '서버와의 연결이 끊겼습니다. 새로고침 해주세요.';
      if (btn) { btn.style.display = 'inline-block'; btn.onclick = () => location.reload(); }
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      if (!this._initialConnected) {
        // Initial connection failure screen with countdown
        const ce = document.getElementById('connect-error-screen');
        if (ce && ce.style.display !== 'block') {
          ce.style.display = 'block';
          let countdown = 5;
          const cd = document.getElementById('connect-error-countdown');
          if (this._connectErrorTimer) clearInterval(this._connectErrorTimer);
          this._connectErrorTimer = setInterval(() => {
            countdown--;
            if (cd) cd.textContent = `${countdown}초 후 재시도...`;
            if (countdown <= 0) { countdown = 5; if (cd) cd.textContent = '재시도 중...'; }
          }, 1000);
        }
      }
    });

    // Session evicted by another login
    this.socket.on('sessionEvicted', (data) => {
      alert(data.message || '다른 기기에서 로그인되어 현재 세션이 종료되었습니다.');
      location.reload();
    });

    // Chat history on field join/switch
    this.socket.on('chatHistory', (messages) => {
      if (this.onChatHistory) this.onChatHistory(messages);
    });

    // Receive initial config (including blockTypes)
    this.socket.on('init', (data) => {
      this.gameConfig = data.gameConfig;
      this.pickaxeTypes = data.pickaxeTypes;
      this.tntTypes = data.tntTypes;
      this.blockTypes = data.blockTypes;
      this.fields = data.fields || [];
      console.log('[Socket] Config received');
      if (this.onConfigReady) this.onConfigReady(data);
    });

    // Join confirmation
    this.socket.on('joined', (data) => {
      this.player = data;
      console.log('[Socket] Joined as:', data.name);
      if (this.onJoined) this.onJoined(data);
    });

    // Game state update
    this.socket.on('gameState', (state) => {
      if (this.onStateUpdate) this.onStateUpdate(state);
    });

    // Purchase result
    this.socket.on('purchaseResult', (result) => {
      if (result.success) {
        this.player = { ...this.player, ...result.player };
        if (this.onPurchaseSuccess) this.onPurchaseSuccess(result);
      } else {
        if (this.onPurchaseError) this.onPurchaseError(result.message);
      }
    });

    // Balance update (now includes chargedCredits / inGameCredits split)
    this.socket.on('balanceUpdated', (data) => {
      if (this.player) {
        this.player.balance = data.balance;
        if (data.chargedCredits !== undefined) this.player.chargedCredits = data.chargedCredits;
        if (data.inGameCredits !== undefined) this.player.inGameCredits = data.inGameCredits;
      }
      if (this.onBalanceUpdate) this.onBalanceUpdate(data);
    });

    // Pickaxe expired
    this.socket.on('pickaxeExpired', (data) => {
      if (this.onPickaxeExpired) this.onPickaxeExpired(data);
    });

    // My info
    this.socket.on('myInfo', (data) => {
      this.player = data;
      if (this.onMyInfo) this.onMyInfo(data);
    });

    // Chat message
    this.socket.on('chatMessage', (data) => {
      if (this.onChatMessage) this.onChatMessage(data);
    });

    // Player joined
    this.socket.on('playerJoined', (data) => {
      if (this.onPlayerJoined) this.onPlayerJoined(data);
    });

    // Player left
    this.socket.on('playerLeft', (data) => {
      if (this.onPlayerLeft) this.onPlayerLeft(data);
    });

    // Rare block destroyed (cinematic)
    this.socket.on('rareBlockDestroyed', (data) => {
      if (this.onRareBlockDestroyed) this.onRareBlockDestroyed(data);
    });

    // Rare block spawned in field (diamond, gold, emerald)
    this.socket.on('rareBlockSpawned', (data) => {
      if (this.onRareBlockSpawned) this.onRareBlockSpawned(data);
    });

    // Jackpot block spawned (global alert)
    this.socket.on('jackpotBlockSpawned', (data) => {
      if (this.onJackpotBlockSpawned) this.onJackpotBlockSpawned(data);
    });

    // Jackpot block destroyed (mega celebration)
    this.socket.on('jackpotBlockDestroyed', (data) => {
      if (this.onJackpotBlockDestroyed) this.onJackpotBlockDestroyed(data);
    });

    // Quest status
    this.socket.on('questStatus', (data) => {
      if (this.onQuestStatus) this.onQuestStatus(data);
    });

    // Quest verification result
    this.socket.on('questVerified', (data) => {
      if (this.onQuestVerified) this.onQuestVerified(data);
    });

    // Field selected confirmation
    this.socket.on('fieldSelected', (data) => {
      this.currentField = data.fieldId;
      this.currentMultiplier = data.multiplier;
      console.log('[Socket] Field selected:', data.fieldId, data.multiplier + 'x');
      if (this.onFieldSelected) this.onFieldSelected(data);
    });

    // Deposit confirmation from server
    this.socket.on('depositConfirmed', (data) => {
      if (data.success) {
        console.log('[Socket] Deposit confirmed:', data.txHash);
        if (this.onDepositConfirmed) this.onDepositConfirmed(data);
      } else {
        console.warn('[Socket] Deposit failed:', data.message);
        if (this.onDepositFailed) this.onDepositFailed(data);
      }
    });

    // Withdraw confirmation from server
    this.socket.on('withdrawConfirmed', (data) => {
      if (data.success) {
        console.log('[Socket] Withdraw confirmed:', data.txHash);
        if (this.onWithdrawConfirmed) this.onWithdrawConfirmed(data);
      } else {
        console.warn('[Socket] Withdraw failed:', data.message);
        if (this.onWithdrawFailed) this.onWithdrawFailed(data);
      }
    });

    // Error
    this.socket.on('error', (data) => {
      console.error('[Socket] Error:', data.message);
    });
  },

  _lastPurchase: 0,
  _purchaseCooldown: 500, // 500ms between purchases

  join(name) { this.socket.emit('join', { name }); },
  joinWithWallet(address, shortAddress, message, signature) {
    this.socket.emit('joinWithWallet', { address, shortAddress, message, signature });
  },
  buyPickaxe(type) {
    const now = Date.now();
    if (now - this._lastPurchase < this._purchaseCooldown) return;
    this._lastPurchase = now;
    this.socket.emit('buyPickaxe', { type });
  },
  buyTNT(type) {
    const now = Date.now();
    if (now - this._lastPurchase < this._purchaseCooldown) return;
    this._lastPurchase = now;
    this.socket.emit('buyTNT', { type });
  },
  selectField(fieldId) { this.socket.emit('selectField', { fieldId }); },
  addBalance() { this.socket.emit('addBalance', {}); },
  getMyInfo() { this.socket.emit('getMyInfo'); },
  getQuests() { this.socket.emit('getQuests'); },
  verifyQuestCompletion(questId, txHash) { this.socket.emit('verifyQuestCompletion', { questId, txHash }); },
  sendChat(message) { this.socket.emit('chatMessage', { message }); },
  syncDeposit(txHash) { this.socket.emit('syncDeposit', { txHash }); },
  syncWithdraw(txHash) { this.socket.emit('syncWithdraw', { txHash }); },
  devSpawnPickaxe(type) { this.socket.emit('devSpawnPickaxe', { type }); },
};
