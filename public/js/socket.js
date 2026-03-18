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

  connect() {
    this.socket = io();

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      if (this.onDisconnect) this.onDisconnect(reason);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
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
};
