// ============================================
// UI Panel Management (Overlay-based, mobile-first)
// ============================================

const UI = {
  initialized: false,
  shopOpen: false,
  menuOpen: false,
  chatOpen: false,
  lbOpen: false,
  myinfoOpen: false,
  questOpen: false,
  spawnAlertsEnabled: true,
  rewardAlertsEnabled: true,
  _questData: null, // Cached quest data

  // HTML escape to prevent XSS
  _esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Add balance button
    document.getElementById('add-balance-btn').addEventListener('click', () => {
      GameSocket.addBalance(10000);
      this.showToast('10,000 credits added!', 'success');
    });

    // Chat input handlers
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    chatSendBtn.addEventListener('click', () => this._sendChatMessage());
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._sendChatMessage();
      if (e.key === 'Escape') this.closeChat();
    });

    // Shop panel toggle
    document.getElementById('shop-btn').addEventListener('click', () => this.toggleShop());
    document.getElementById('shop-close-btn').addEventListener('click', () => this.closeShop());

    // Menu panel toggle
    document.getElementById('menu-btn').addEventListener('click', () => this.toggleMenu());
    document.getElementById('menu-close-btn').addEventListener('click', () => this.closeMenu());

    // Notification toggles (spawn / reward)
    const spawnBtn = document.getElementById('notif-spawn-btn');
    const rewardBtn = document.getElementById('notif-reward-btn');
    if (spawnBtn) {
      spawnBtn.addEventListener('click', () => {
        this.spawnAlertsEnabled = !this.spawnAlertsEnabled;
        spawnBtn.className = 'notif-toggle-btn ' + (this.spawnAlertsEnabled ? 'on' : 'off');
        spawnBtn.title = 'Spawn alerts ' + (this.spawnAlertsEnabled ? 'ON' : 'OFF');
      });
    }
    if (rewardBtn) {
      rewardBtn.addEventListener('click', () => {
        this.rewardAlertsEnabled = !this.rewardAlertsEnabled;
        rewardBtn.className = 'notif-toggle-btn ' + (this.rewardAlertsEnabled ? 'on' : 'off');
        rewardBtn.title = 'Reward alerts ' + (this.rewardAlertsEnabled ? 'ON' : 'OFF');
      });
    }

    // Chat toggle
    document.getElementById('chat-toggle-btn').addEventListener('click', () => this.toggleChat());

    // Quest panel toggle
    document.getElementById('quest-btn').addEventListener('click', () => this.toggleQuest());
    document.getElementById('quest-close-btn').addEventListener('click', () => this.closeQuest());

    // Leaderboard modal (close on backdrop click)
    document.getElementById('lb-btn').addEventListener('click', () => this.toggleLeaderboard());
    document.getElementById('lb-close-btn').addEventListener('click', () => this.closeLeaderboard());
    document.getElementById('lb-modal').addEventListener('click', (e) => {
      if (e.target.id === 'lb-modal') this.closeLeaderboard();
    });

    // My Info popup
    document.getElementById('myinfo-btn').addEventListener('click', () => this.toggleMyInfo());
    document.getElementById('myinfo-close-btn').addEventListener('click', () => this.closeMyInfo());
    document.getElementById('myinfo-add-balance').addEventListener('click', () => {
      GameSocket.addBalance(10000);
      this.showToast('10,000 credits added!', 'success');
    });
    document.getElementById('myinfo-logout').addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        // Disconnect wallet first (triggers walletStateChanged → game logout)
        if (window.WalletAPI && window.WalletAPI.isConnected()) {
          window.WalletAPI.disconnect();
        } else {
          window.location.reload();
        }
      }
    });

    // Tab switching in myinfo
    document.querySelectorAll('.myinfo-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.myinfo-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.myinfo-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      });
    });

    // Deposit amount preview (integer USDC only)
    const depositInput = document.getElementById('deposit-amount');
    depositInput.addEventListener('input', () => {
      // Force integer
      depositInput.value = depositInput.value.replace(/[^0-9]/g, '');
      const usdc = parseInt(depositInput.value) || 0;
      const credits = usdc * 10000;
      document.getElementById('deposit-preview').innerHTML =
        `You will receive: <strong>${credits.toLocaleString()}</strong> credits`;
    });
    document.getElementById('deposit-minus').addEventListener('click', () => {
      const cur = parseInt(depositInput.value) || 0;
      if (cur > 1) { depositInput.value = cur - 1; depositInput.dispatchEvent(new Event('input')); }
    });
    document.getElementById('deposit-plus').addEventListener('click', () => {
      const cur = parseInt(depositInput.value) || 0;
      depositInput.value = cur + 1;
      depositInput.dispatchEvent(new Event('input'));
    });

    // Withdraw amount preview (integer USDC, shows credit cost)
    const withdrawInput = document.getElementById('withdraw-amount');
    withdrawInput.addEventListener('input', () => {
      // Force integer
      withdrawInput.value = withdrawInput.value.replace(/[^0-9]/g, '');
      const usdc = parseInt(withdrawInput.value) || 0;
      const creditsNeeded = usdc * 10500;
      document.getElementById('withdraw-preview').innerHTML =
        `Will consume: <strong>${creditsNeeded.toLocaleString()}</strong> credits`;
    });
    document.getElementById('withdraw-minus').addEventListener('click', () => {
      const cur = parseInt(withdrawInput.value) || 0;
      if (cur > 1) { withdrawInput.value = cur - 1; withdrawInput.dispatchEvent(new Event('input')); }
    });
    document.getElementById('withdraw-plus').addEventListener('click', () => {
      const cur = parseInt(withdrawInput.value) || 0;
      withdrawInput.value = cur + 1;
      withdrawInput.dispatchEvent(new Event('input'));
    });

    // Deposit button
    document.getElementById('deposit-btn').addEventListener('click', () => this._handleDeposit());

    // Withdraw button
    document.getElementById('withdraw-btn').addEventListener('click', () => this._handleWithdraw());

    // Field toggle (Normal / Hardcore)
    this._initFieldToggle();

    // Hardcore confirmation modal
    document.getElementById('hardcore-ok-btn').addEventListener('click', () => this._onHardcoreConfirm());
    document.getElementById('hardcore-cancel-btn').addEventListener('click', () => this._onHardcoreCancel());

    // Backdrop for panels (click to close)
    this._createBackdrop();
  },

  _createBackdrop() {
    const backdrop = document.createElement('div');
    backdrop.className = 'panel-backdrop';
    backdrop.id = 'panel-backdrop';
    backdrop.addEventListener('click', () => {
      this.closeShop();
      this.closeMenu();
      this.closeMyInfo();
      this.closeQuest();
    });
    document.getElementById('canvas-container').appendChild(backdrop);
  },

  _sendChatMessage() {
    if (!this._requireWallet()) return;
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;
    GameSocket.sendChat(message);
    input.value = '';
  },

  // ===== Wallet Guard — auto-connect if not logged in =====
  _requireWallet() {
    if (GameSocket.player) return true; // Already logged in

    // Dev mode: localhost — allow nickname login without wallet
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      const name = prompt('Dev Login — Enter nickname:') || 'Tester';
      GameSocket.join(name.substring(0, 12));
      this.showToast('Dev login...', 'info');
      return false; // Will proceed after 'joined' event
    }

    if (window.WalletAPI) {
      if (window.WalletAPI.isConnected()) {
        // Wallet connected but game login not done — trigger login flow
        window.dispatchEvent(new CustomEvent('walletLoginRequested'));
        this.showToast('Logging in...', 'info');
      } else {
        // Not connected — open RainbowKit connect modal
        window.WalletAPI.connect();
      }
    } else {
      this.showToast('Wallet loading... please try again', 'info');
    }
    return false;
  },

  // ===== Panel Toggles =====
  toggleShop() {
    if (!this._requireWallet()) return;
    if (this.shopOpen) {
      this.closeShop();
    } else {
      this.closeMenu(); // Close other panels
      this.shopOpen = true;
      document.getElementById('shop-panel').classList.add('open');
      document.getElementById('panel-backdrop').classList.add('show');
    }
  },

  closeShop() {
    this.shopOpen = false;
    document.getElementById('shop-panel').classList.remove('open');
    if (!this.menuOpen) {
      document.getElementById('panel-backdrop').classList.remove('show');
    }
  },

  toggleMenu() {
    if (this.menuOpen) {
      this.closeMenu();
    } else {
      this.closeShop(); // Close other panels
      this.menuOpen = true;
      document.getElementById('menu-panel').classList.add('open');
      document.getElementById('panel-backdrop').classList.add('show');
    }
  },

  closeMenu() {
    this.menuOpen = false;
    document.getElementById('menu-panel').classList.remove('open');
    if (!this.shopOpen) {
      document.getElementById('panel-backdrop').classList.remove('show');
    }
  },

  toggleMyInfo() {
    if (!this._requireWallet()) return;
    this.myinfoOpen = !this.myinfoOpen;
    document.getElementById('myinfo-popup').classList.toggle('open', this.myinfoOpen);
  },

  closeMyInfo() {
    this.myinfoOpen = false;
    document.getElementById('myinfo-popup').classList.remove('open');
  },

  toggleChat() {
    this.chatOpen = !this.chatOpen;
    document.getElementById('chat-overlay').classList.toggle('input-open', this.chatOpen);
    if (this.chatOpen) {
      document.getElementById('chat-input').focus();
    }
  },

  closeChat() {
    this.chatOpen = false;
    document.getElementById('chat-overlay').classList.remove('input-open');
  },

  toggleLeaderboard() {
    if (!this._requireWallet()) return;
    this.lbOpen = !this.lbOpen;
    document.getElementById('lb-modal').classList.toggle('open', this.lbOpen);
  },

  closeLeaderboard() {
    this.lbOpen = false;
    document.getElementById('lb-modal').classList.remove('open');
  },

  toggleQuest() {
    if (!this._requireWallet()) return;
    if (this.questOpen) {
      this.closeQuest();
    } else {
      this.closeShop();
      this.closeMenu();
      this.questOpen = true;
      document.getElementById('quest-panel').classList.add('open');
      document.getElementById('panel-backdrop').classList.add('show');
      // Request latest quest data
      GameSocket.getQuests();
    }
  },

  closeQuest() {
    this.questOpen = false;
    document.getElementById('quest-panel').classList.remove('open');
    if (!this.shopOpen && !this.menuOpen) {
      document.getElementById('panel-backdrop').classList.remove('show');
    }
  },

  _toRoman(num) {
    const romans = [['VII',7],['VI',6],['V',5],['IV',4],['III',3],['II',2],['I',1]];
    for (const [r, v] of romans) { if (num === v) return r; }
    return String(num);
  },

  renderQuests(quests) {
    this._questData = quests;
    const container = document.getElementById('quest-list');
    if (!container) return;
    container.innerHTML = '';

    // Sort: active (uncompleted) first, completed at bottom
    const sorted = [...quests].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.id || 0) - (b.id || 0);
    });

    for (const quest of sorted) {
      const progress = Math.min(quest.current / quest.target, 1);
      const pct = Math.round(progress * 100);
      const canComplete = quest.current >= quest.target && !quest.completed;

      // Tier indicator text
      const tierText = quest.maxTier
        ? `${this._toRoman(quest.tier || 1)}/${this._toRoman(quest.maxTier)}`
        : '';

      // Reward text
      const rewardText = quest.reward
        ? `+${quest.reward.toLocaleString()} credits`
        : '';

      const item = document.createElement('div');
      item.className = `quest-item${quest.completed ? ' completed' : ''}`;
      item.innerHTML = `
        <div class="quest-header">
          <span class="quest-name">${this._esc(quest.name)}${tierText ? `<span class="quest-tier">${tierText}</span>` : ''}</span>
          ${quest.completed
            ? '<span class="quest-completed-badge">&#x2714; Completed</span>'
            : ''}
        </div>
        <div class="quest-desc">${this._esc(quest.desc)}</div>
        ${rewardText ? `<div class="quest-reward">${rewardText}</div>` : ''}
        <div class="quest-progress-bar">
          <div class="quest-progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="quest-progress-text">${quest.current.toLocaleString()} / ${quest.target.toLocaleString()} (${pct}%)</div>
      `;

      if (canComplete) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary btn-sm quest-complete-btn';
        btn.textContent = 'Complete On-Chain';
        btn.addEventListener('click', () => this._completeQuestOnChain(quest.id, btn));
        item.appendChild(btn);
      }

      container.appendChild(item);
    }
  },

  async _completeQuestOnChain(questId, btn) {
    if (!window.WalletAPI || !window.WalletAPI.isConnected()) {
      this.showToast('Connect wallet first', 'error');
      return;
    }

    const questContract = window.PIKIT_QUEST;
    if (!questContract || questContract.CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      this.showToast('Quest contract not deployed yet', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Checking...';

    try {
      const address = window.WalletAPI.getAddress();
      if (!address) throw new Error('No wallet address');

      // Pre-check: is this quest already completed on-chain?
      const questIdHex = questId.toString(16).padStart(64, '0');
      const addressPadded = address.slice(2).toLowerCase().padStart(64, '0');
      // isCompleted(address,uint256) selector: keccak256("isCompleted(address,uint256)") = 0x195f58e9
      const isCompletedData = '0x195f58e9' + addressPadded + questIdHex;

      const isCompletedResult = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: questContract.CONTRACT_ADDRESS,
          data: isCompletedData,
        }, 'latest'],
      });

      // Result is a bool — 0x...01 = true, 0x...00 = false
      if (isCompletedResult && isCompletedResult.endsWith('1')) {
        btn.textContent = 'Already Completed';
        this.showToast('Quest already completed on-chain!', 'info');
        // Tell server to sync the on-chain state
        GameSocket.verifyQuestCompletion(questId, 'already_completed');
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = 'Complete On-Chain';
        }, 2000);
        return;
      }

      btn.textContent = 'Sending tx...';

      // Encode completeQuest(uint256) — selector: keccak256("completeQuest(uint256)") = 0x528be0a9
      const data = '0x528be0a9' + questIdHex;

      // Estimate gas first to catch reverts early
      try {
        await window.ethereum.request({
          method: 'eth_estimateGas',
          params: [{
            from: address,
            to: questContract.CONTRACT_ADDRESS,
            data: data,
          }],
        });
      } catch (gasErr) {
        throw new Error('Transaction would fail. Check: correct network (Sepolia)? Quest not already completed?');
      }

      // Send transaction (no chainId field — wallet handles chain)
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: questContract.CONTRACT_ADDRESS,
          data: data,
        }],
      });

      btn.textContent = 'Verifying...';
      this.showToast('Transaction sent! Waiting for confirmation...', 'info');

      // Send tx hash to server for verification
      GameSocket.verifyQuestCompletion(questId, txHash);
    } catch (err) {
      console.error('[Quest] Transaction error:', err);
      btn.disabled = false;
      btn.textContent = 'Complete On-Chain';
      this.showToast(err.message || 'Transaction failed', 'error');
    }
  },

  // ===== Field Toggle =====
  _initFieldToggle() {
    const checkbox = document.getElementById('field-toggle-checkbox');
    if (!checkbox) return;

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        // Switching to hardcore — check if we need confirmation
        const skipWarn = localStorage.getItem('pikit_skip_hardcore_warn') === '1';
        if (skipWarn) {
          this._switchToHardcore();
        } else {
          // Revert checkbox until user confirms
          checkbox.checked = false;
          this._showHardcoreModal();
        }
      } else {
        // Switching back to normal
        this._switchToNormal();
      }
    });
  },

  _showHardcoreModal() {
    const modal = document.getElementById('hardcore-confirm-modal');
    document.getElementById('hardcore-dont-ask').checked = false;
    modal.classList.add('open');
  },

  _hideHardcoreModal() {
    document.getElementById('hardcore-confirm-modal').classList.remove('open');
  },

  _onHardcoreConfirm() {
    // Save "don't ask again" preference
    if (document.getElementById('hardcore-dont-ask').checked) {
      localStorage.setItem('pikit_skip_hardcore_warn', '1');
    }
    this._hideHardcoreModal();
    // Now actually toggle the checkbox and switch
    document.getElementById('field-toggle-checkbox').checked = true;
    this._switchToHardcore();
  },

  _onHardcoreCancel() {
    this._hideHardcoreModal();
    // Checkbox stays unchecked (already reverted)
  },

  _switchToHardcore() {
    document.getElementById('field-toggle').classList.add('active');
    GameSocket.selectField('hardcore');
  },

  _switchToNormal() {
    document.getElementById('field-toggle').classList.remove('active');
    GameSocket.selectField('normal');
  },

  // Called from main.js when fieldSelected event arrives
  updateFieldToggle(fieldId) {
    const checkbox = document.getElementById('field-toggle-checkbox');
    const toggle = document.getElementById('field-toggle');
    if (!checkbox || !toggle) return;

    if (fieldId === 'hardcore') {
      checkbox.checked = true;
      toggle.classList.add('active');
    } else {
      checkbox.checked = false;
      toggle.classList.remove('active');
    }
  },

  // ===== Shop Rendering =====
  renderShop(pickaxeTypes, tntTypes, multiplier) {
    const mult = multiplier || 1;
    const pickaxeGrid = document.getElementById('pickaxe-items');
    const tntGrid = document.getElementById('tnt-items');

    // Pickaxe shop — use cached pixel art instead of missing image files
    pickaxeGrid.innerHTML = '';

    // Active pickaxe count indicator
    const activeCount = (GameSocket.player && GameSocket.player.activePickaxes)
      ? GameSocket.player.activePickaxes.length
      : 0;
    const countIndicator = document.createElement('div');
    countIndicator.style.cssText = [
      `color: ${activeCount >= 3 ? '#ef4444' : '#94a3b8'}`,
      'font-size: 12px',
      'text-align: center',
      'margin-bottom: 8px',
    ].join('; ');
    countIndicator.textContent = `Active Pickaxes: ${activeCount}/1`;
    pickaxeGrid.appendChild(countIndicator);

    for (const [type, def] of Object.entries(pickaxeTypes)) {
      const effectivePrice = def.price * mult;
      const item = document.createElement('div');
      item.className = 'shop-item';

      // Use Renderer's cached pickaxe canvas
      const texName = (def.texture || '').replace('.png', '');
      const cachedPickaxe = Renderer.pixelPickaxeCache[texName];
      if (cachedPickaxe) {
        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = 36;
        miniCanvas.height = 36;
        miniCanvas.className = 'shop-item-icon';
        miniCanvas.style.imageRendering = 'pixelated';
        const mCtx = miniCanvas.getContext('2d');
        mCtx.imageSmoothingEnabled = false;
        mCtx.drawImage(cachedPickaxe, 0, 0, 36, 36);
        item.appendChild(miniCanvas);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'shop-item-icon';
        placeholder.style.background = def.color || '#888';
        item.appendChild(placeholder);
      }

      const info = document.createElement('div');
      info.className = 'shop-item-info';
      info.innerHTML = `
        <div class="shop-item-name">${this._esc(def.name)}</div>
        <div class="shop-item-price">${effectivePrice.toLocaleString()} credits</div>
        <div class="shop-item-stat">${this._esc(def.description || `DMG: ${def.damage}`)}</div>
      `;
      item.appendChild(info);
      item.addEventListener('click', () => GameSocket.buyPickaxe(type));
      pickaxeGrid.appendChild(item);
    }

    // TNT shop — use canvas icon
    tntGrid.innerHTML = '';
    for (const [type, def] of Object.entries(tntTypes)) {
      const effectivePrice = def.price * mult;
      const item = document.createElement('div');
      item.className = 'shop-item';

      // Render a mini TNT icon
      const miniCanvas = document.createElement('canvas');
      miniCanvas.width = 36;
      miniCanvas.height = 36;
      miniCanvas.className = 'shop-item-icon';
      const mCtx = miniCanvas.getContext('2d');
      mCtx.imageSmoothingEnabled = false;
      mCtx.fillStyle = '#cc2222';
      mCtx.fillRect(2, 2, 32, 32);
      mCtx.fillStyle = '#f0f0f0';
      mCtx.fillRect(6, 12, 24, 12);
      mCtx.fillStyle = '#cc2222';
      mCtx.font = 'bold 10px "Courier New", monospace';
      mCtx.textAlign = 'center';
      mCtx.textBaseline = 'middle';
      mCtx.fillText('TNT', 18, 18);
      item.appendChild(miniCanvas);

      const info = document.createElement('div');
      info.className = 'shop-item-info';
      info.innerHTML = `
        <div class="shop-item-name">${this._esc(def.name)}</div>
        <div class="shop-item-price">${effectivePrice.toLocaleString()} credits</div>
        <div class="shop-item-stat">Explodes on contact | ${def.damage}dmg</div>
      `;
      item.appendChild(info);
      item.addEventListener('click', () => GameSocket.buyTNT(type));
      tntGrid.appendChild(item);
    }

    // Dev spawn panel (localhost only)
    const devPanel = document.getElementById('dev-spawn-panel');
    if (devPanel && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      devPanel.style.display = '';
      const devGrid = document.getElementById('dev-spawn-items');
      devGrid.innerHTML = '';
      for (const [type, def] of Object.entries(pickaxeTypes)) {
        const btn = document.createElement('div');
        btn.className = 'shop-item';
        btn.style.cursor = 'pointer';
        const texName = (def.texture || '').replace('.png', '');
        const cachedPickaxe = Renderer.pixelPickaxeCache[texName];
        if (cachedPickaxe) {
          const mc = document.createElement('canvas');
          mc.width = 36; mc.height = 36;
          mc.className = 'shop-item-icon';
          mc.style.imageRendering = 'pixelated';
          const ctx = mc.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(cachedPickaxe, 0, 0, 36, 36);
          btn.appendChild(mc);
        }
        const info = document.createElement('div');
        info.className = 'shop-item-info';
        info.innerHTML = `<div class="shop-item-name">${this._esc(def.name)}</div><div class="shop-item-price" style="color:#22c55e">FREE (test)</div>`;
        btn.appendChild(info);
        btn.addEventListener('click', () => GameSocket.devSpawnPickaxe(type));
        devGrid.appendChild(btn);
      }
    }
  },

  // ===== Block Guide (in menu panel) — uses actual 8-bit block art =====
  renderBlockGuide(blockTypes) {
    const container = document.getElementById('block-guide');
    if (!container) return;

    container.innerHTML = '';
    const totalWeight = Object.values(blockTypes)
      .reduce((sum, def) => sum + (def.weight || 0), 0);

    // Sort: highest reward first (credit blocks), then random blocks
    const sorted = Object.entries(blockTypes)
      .filter(([type]) => type !== 'bedrock')
      .sort((a, b) => {
        const aFixed = a[1].rewardType === 'fixed' ? 1 : 0;
        const bFixed = b[1].rewardType === 'fixed' ? 1 : 0;
        if (aFixed !== bFixed) return bFixed - aFixed;
        return b[1].reward - a[1].reward;
      });

    for (const [type, def] of sorted) {
      const spawnPct = def.weight > 0
        ? ((def.weight / totalWeight) * 100).toFixed(1)
        : 'Special';

      const rewardText = def.rewardType === 'random'
        ? '1~5'
        : def.reward.toLocaleString();

      const item = document.createElement('div');
      item.className = 'block-guide-item';

      // Use actual cached pixel block from Renderer
      const blockCanvas = Renderer.pixelBlockCache[type];
      if (blockCanvas) {
        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = 24;
        miniCanvas.height = 24;
        miniCanvas.className = 'block-guide-icon';
        const mCtx = miniCanvas.getContext('2d');
        mCtx.imageSmoothingEnabled = false;
        mCtx.drawImage(blockCanvas, 0, 0, 24, 24);
        item.appendChild(miniCanvas);
      } else {
        // Fallback color square
        const colorDiv = document.createElement('div');
        colorDiv.className = 'block-guide-color';
        colorDiv.style.background = def.color;
        item.appendChild(colorDiv);
      }

      // Use DOM API instead of innerHTML += (which destroys existing canvas children)
      const nameSpan = document.createElement('span');
      nameSpan.className = 'block-guide-name';
      nameSpan.textContent = def.name;
      item.appendChild(nameSpan);

      const rewardSpan = document.createElement('span');
      rewardSpan.className = 'block-guide-reward';
      rewardSpan.textContent = rewardText;
      item.appendChild(rewardSpan);

      const spawnSpan = document.createElement('span');
      spawnSpan.className = 'block-guide-spawn';
      spawnSpan.textContent = `${spawnPct}%`;
      item.appendChild(spawnSpan);

      container.appendChild(item);
    }
  },

  // ===== Player Info =====
  updatePlayerInfo(player) {
    if (!player) return;

    const balance = Math.round(player.balance).toLocaleString();
    const earned = Math.round(player.totalEarned || 0).toLocaleString();
    const spent = Math.round(player.totalSpent || 0).toLocaleString();
    const profit = Math.round((player.totalEarned || 0) - (player.totalSpent || 0));
    const profitText = `${profit >= 0 ? '+' : ''}${profit.toLocaleString()}`;
    const profitColor = profit >= 0 ? 'var(--green)' : 'var(--red)';

    // Credit split values
    const charged = Math.round(player.chargedCredits || 0);
    const inGame = Math.round(player.inGameCredits || 0);

    // HUD balance button
    document.getElementById('my-balance').textContent = balance;

    // Credit tooltip (hover popup)
    const chargedEl = document.getElementById('credit-charged');
    const ingameEl = document.getElementById('credit-ingame');
    if (chargedEl) chargedEl.textContent = charged.toLocaleString();
    if (ingameEl) ingameEl.textContent = inGame.toLocaleString();

    // Shop panel
    document.getElementById('my-name').textContent = player.name;
    document.getElementById('my-balance-panel').textContent = balance;
    document.getElementById('my-earned').textContent = earned;
    const profitPanelEl = document.getElementById('my-profit-panel');
    profitPanelEl.textContent = profitText;
    profitPanelEl.style.color = profitColor;

    // My Info popup — compact row
    document.getElementById('myinfo-name').textContent = player.name;
    document.getElementById('myinfo-balance').textContent = balance;
    const pnlEl = document.getElementById('myinfo-pnl');
    pnlEl.textContent = profitText;
    pnlEl.style.color = profitColor;

    // My Info popup — Overview tab
    document.getElementById('myinfo-earned').textContent = earned;
    document.getElementById('myinfo-spent').textContent = spent;
    const balOverview = document.getElementById('myinfo-balance-overview');
    if (balOverview) balOverview.textContent = balance;
    const pnlOverview = document.getElementById('myinfo-pnl-overview');
    if (pnlOverview) {
      pnlOverview.textContent = profitText;
      pnlOverview.style.color = profitColor;
    }

    // My Info popup — Credit breakdown in Overview
    const chargedOverview = document.getElementById('myinfo-charged-overview');
    const ingameOverview = document.getElementById('myinfo-ingame-overview');
    if (chargedOverview) chargedOverview.textContent = charged.toLocaleString();
    if (ingameOverview) ingameOverview.textContent = inGame.toLocaleString();
  },

  // ===== Leaderboard =====
  updateLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboard');
    if (!leaderboard || leaderboard.length === 0) {
      container.innerHTML = '<div style="color:var(--muted-foreground);font-size:13px;text-align:center;padding:16px">No players yet</div>';
      return;
    }

    container.innerHTML = leaderboard.map((entry, i) => {
      const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      const profitClass = entry.profit >= 0 ? 'positive' : 'negative';
      const profitSign = entry.profit >= 0 ? '+' : '';
      return `
        <div class="lb-row">
          <span class="lb-rank ${rankClass}">${i + 1}</span>
          <span class="lb-name">${this._esc(entry.name)}</span>
          <span class="lb-profit ${profitClass}">${profitSign}${entry.profit.toLocaleString()}</span>
        </div>
      `;
    }).join('');
  },

  // ===== Game Info =====
  updateGameInfo(state) {
    document.getElementById('player-count').textContent = state.playerCount;
    document.getElementById('active-pickaxes').textContent = state.activePickaxes;
    document.getElementById('depth').textContent = `${state.depth}m`;
  },

  // ===== Chat =====
  addChatMessage(data) {
    const container = document.getElementById('chat-messages');
    const msg = document.createElement('div');
    msg.className = 'chat-msg';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'chat-name';
    nameSpan.textContent = data.name;

    const textSpan = document.createElement('span');
    textSpan.className = 'chat-text';
    textSpan.textContent = data.message;

    msg.appendChild(nameSpan);
    msg.appendChild(textSpan);
    container.appendChild(msg);

    while (container.children.length > 100) container.removeChild(container.firstChild);
    container.scrollTop = container.scrollHeight;
  },

  addSystemMessage(text) {
    const container = document.getElementById('chat-messages');
    const msg = document.createElement('div');
    msg.className = 'chat-msg system';
    msg.textContent = text;
    container.appendChild(msg);

    while (container.children.length > 100) container.removeChild(container.firstChild);
    container.scrollTop = container.scrollHeight;
  },

  // ===== Toast =====
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 3000);
  },

  // ===== Jackpot Notification =====
  showJackpot(data) {
    if (!this.rewardAlertsEnabled) return;
    const overlay = document.getElementById('jackpot-overlay');
    const alert = document.createElement('div');
    alert.className = 'jackpot-alert';
    alert.textContent = `\u{1F389} ${data.playerName} found ${data.reward.toLocaleString()} from ${data.blockName}!`;
    overlay.appendChild(alert);

    setTimeout(() => { if (alert.parentElement) alert.remove(); }, 2500);
  },

  // ===== Rare Block Spawn Alert (block appeared in field) =====
  showRareBlockSpawnAlert(data) {
    if (!this.spawnAlertsEnabled) return;
    let emoji = '💎';
    let colorClass = 'diamond';

    if (data.blockType === 'jackpot') {
      emoji = '🏆';
      colorClass = 'jackpot';
    }

    const rewardText = (data.reward || 0).toLocaleString();
    const alertEl = document.createElement('div');
    alertEl.className = `rare-spawn-alert ${colorClass}`;
    alertEl.innerHTML = `
      <span class="rare-spawn-emoji">${emoji}</span>
      <span class="rare-spawn-text">${this._esc(data.blockName)} appeared! (${rewardText} credits)</span>
      <span class="rare-spawn-emoji">${emoji}</span>
    `;

    const overlay = document.getElementById('spawn-alert-overlay');
    overlay.appendChild(alertEl);

    setTimeout(() => {
      if (alertEl.parentElement) {
        alertEl.classList.add('fade-out');
        setTimeout(() => alertEl.remove(), 500);
      }
    }, 2500);
  },

  // ===== Wait for tx receipt (polling via eth_getTransactionReceipt) =====
  async _waitForReceipt(txHash, maxAttempts = 60, intervalMs = 2000) {
    for (let i = 0; i < maxAttempts; i++) {
      const receipt = await window.ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });
      if (receipt) {
        if (receipt.status === '0x0') {
          throw new Error('Transaction reverted on-chain');
        }
        return receipt;
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
    throw new Error('Transaction confirmation timed out');
  },

  // ===== Deposit / Withdraw =====
  async _handleDeposit() {
    const amountInput = document.getElementById('deposit-amount');
    const usdcAmount = parseInt(amountInput.value);
    if (!usdcAmount || usdcAmount <= 0 || !Number.isInteger(usdcAmount)) {
      this.showToast('Enter a valid amount', 'error');
      return;
    }

    if (!window.WalletAPI || !window.WalletAPI.isConnected()) {
      this.showToast('Connect wallet first', 'error');
      return;
    }

    const vault = window.PIKIT_VAULT;
    if (!vault || vault.CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      this.showToast('Vault not deployed yet', 'error');
      return;
    }

    const btn = document.getElementById('deposit-btn');
    btn.disabled = true;
    btn.textContent = 'Approving...';

    try {
      const address = window.WalletAPI.getAddress();
      // USDC has 6 decimals
      const usdcRaw = BigInt(Math.floor(usdcAmount * 1e6));
      const usdcHex = usdcRaw.toString(16).padStart(64, '0');

      // Step 1: Approve USDC spending
      const approveData = '0x095ea7b3' +
        vault.CONTRACT_ADDRESS.slice(2).padStart(64, '0') +
        usdcHex;

      const approveTxHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: vault.USDC_ADDRESS,
          data: approveData,
        }],
      });

      btn.textContent = 'Waiting for approval...';
      // Poll for approval receipt instead of arbitrary delay
      await this._waitForReceipt(approveTxHash);
      btn.textContent = 'Depositing...';

      // Step 2: Call deposit(uint256)
      const depositData = '0xb6b55f25' + usdcHex;

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: vault.CONTRACT_ADDRESS,
          data: depositData,
        }],
      });

      btn.textContent = 'Confirming...';
      this.showToast(
        `Deposit tx sent! ${usdcAmount} USDC → ${(usdcAmount * 10000).toLocaleString()} credits`,
        'success'
      );

      // Tell server to sync credits from chain
      GameSocket.syncDeposit(txHash);
      amountInput.value = '';
      document.getElementById('deposit-preview').innerHTML =
        'You will receive: <strong>0</strong> credits';

    } catch (err) {
      console.error('[Deposit]', err);
      this.showToast(err.message || 'Deposit failed', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Deposit';
    }
  },

  async _handleWithdraw() {
    const amountInput = document.getElementById('withdraw-amount');
    const usdcAmount = parseInt(amountInput.value);
    if (!usdcAmount || usdcAmount <= 0 || !Number.isInteger(usdcAmount)) {
      this.showToast('Enter a valid USDC amount (integer)', 'error');
      return;
    }

    const creditAmount = usdcAmount * 10500;

    if (!window.WalletAPI || !window.WalletAPI.isConnected()) {
      this.showToast('Connect wallet first', 'error');
      return;
    }

    const vault = window.PIKIT_VAULT;
    if (!vault || vault.CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      this.showToast('Vault not deployed yet', 'error');
      return;
    }

    // Check if player has enough credits
    if (GameSocket.player && GameSocket.player.balance < creditAmount) {
      this.showToast(`Not enough credits. Need ${creditAmount.toLocaleString()}`, 'error');
      return;
    }

    const btn = document.getElementById('withdraw-btn');
    btn.disabled = true;
    btn.textContent = 'Withdrawing...';

    try {
      const address = window.WalletAPI.getAddress();
      const creditHex = BigInt(creditAmount).toString(16).padStart(64, '0');

      // Call withdraw(uint256) with credit amount
      const withdrawData = '0x2e1a7d4d' + creditHex;

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: vault.CONTRACT_ADDRESS,
          data: withdrawData,
        }],
      });

      this.showToast(
        `Withdraw tx sent! ${creditAmount.toLocaleString()} credits → ${usdcAmount} USDC`,
        'success'
      );

      // Tell server to sync
      GameSocket.syncWithdraw(txHash);
      amountInput.value = '';
      document.getElementById('withdraw-preview').innerHTML =
        'Will consume: <strong>0</strong> credits';

    } catch (err) {
      console.error('[Withdraw]', err);
      this.showToast(err.message || 'Withdraw failed', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Withdraw';
    }
  },

  // ===== Rare Block Notification (block destroyed by player) =====
  showRareBlockNotification(data) {
    if (!this.rewardAlertsEnabled) return;
    let colorClass = 'gold';
    let emoji = '💎';

    if (data.blockType === 'jackpot') {
      colorClass = 'jackpot';
      emoji = '🏆';
    } else if (data.blockType === 'diamond_block') {
      colorClass = 'diamond';
      emoji = '💎';
    } else if (data.blockType === 'gold_block') {
      colorClass = 'gold';
      emoji = '✨';
    } else if (data.blockType === 'netherite_block') {
      colorClass = 'netherite';
      emoji = '⚔️';
    }

    const banner = document.createElement('div');
    banner.className = `rare-block-banner ${colorClass}`;
    banner.innerHTML = `
      <div class="rare-banner-emoji">${emoji}</div>
      <div class="rare-banner-text">
        <span class="rare-banner-player">${this._esc(data.playerName)}</span>
        mined <span class="rare-banner-block">${this._esc(data.blockName)}</span>!
        <span class="rare-banner-reward">+${data.reward.toLocaleString()}</span>
      </div>
      <div class="rare-banner-emoji">${emoji}</div>
    `;

    const overlay = document.getElementById('jackpot-overlay');
    overlay.appendChild(banner);

    const duration = data.blockType === 'jackpot' ? 5000 : 3000;
    setTimeout(() => {
      if (banner.parentElement) {
        banner.classList.add('fade-out');
        setTimeout(() => banner.remove(), 500);
      }
    }, duration);
  },

};
