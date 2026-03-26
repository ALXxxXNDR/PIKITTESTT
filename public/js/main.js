// ============================================
// Main Client Entry Point
// ============================================

(function () {
  'use strict';

  let latestState = null;
  let lastJackpotTime = 0;
  let renderLoopStarted = false;

  // ===== Socket Event Binding =====
  GameSocket.onConfigReady = (data) => {
    // Store config
    GameSocket._cachedConfig = data;

    // Immediately init renderer and start render loop (spectator mode)
    if (!renderLoopStarted) {
      Renderer.init('game-canvas');
      Renderer.myPlayerId = GameSocket.socket.id;
      Renderer.setFieldTheme('normal');
      Renderer.resize();
      startRenderLoop();
      renderLoopStarted = true;
    }

    // Init UI bindings
    UI.init();

    // Render shop & block guide with default normal multiplier
    UI.renderShop(data.pickaxeTypes, data.tntTypes, 1);
    if (data.blockTypes) {
      UI.renderBlockGuide(data.blockTypes);
    }
  };

  GameSocket.onJoined = (player) => {
    // Wallet login succeeded — just update player info
    UI.updatePlayerInfo(player);
    UI.showToast('Connected!', 'success');
  };

  GameSocket.onFieldSelected = (data) => {
    // Field switch confirmed — update visuals
    Renderer.setFieldTheme(data.fieldId);
    UI.updateFieldToggle(data.fieldId);

    // Clear chat on field switch
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) chatMessages.innerHTML = '';

    // Re-render shop with new multiplied prices
    const config = GameSocket._cachedConfig;
    if (config) {
      UI.renderShop(config.pickaxeTypes, config.tntTypes, data.multiplier);
    }

    if (GameSocket.player) {
      UI.updatePlayerInfo(GameSocket.player);
    }
  };

  // Chat history (on field join/switch)
  GameSocket.onChatHistory = (messages) => {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = '';
      messages.forEach(msg => UI.addChatMessage(msg.name, msg.message));
    }
  };

  // Track my pickaxes' blocksDestroyed for hit SFX
  let _myPickaxeBlocks = {};

  GameSocket.onStateUpdate = (state) => {
    latestState = state;
    Camera.targetY = state.cameraY;

    // UI update
    UI.updateGameInfo(state);
    UI.updateLeaderboard(state.leaderboard);

    if (GameSocket.player) {
      UI.updatePlayerInfo(GameSocket.player);

      // Detect block hit: compare blocksDestroyed count for my pickaxes
      if (state.pickaxes) {
        const myId = GameSocket.player.id;
        const currentBlocks = {};
        for (const p of state.pickaxes) {
          if (p.ownerId === myId) {
            currentBlocks[p.id] = p.blocksDestroyed || 0;
            const prev = _myPickaxeBlocks[p.id] || 0;
            if (currentBlocks[p.id] > prev) {
              UI.playSFX('hit');
            }
          }
        }
        _myPickaxeBlocks = currentBlocks;
      }
    }

    // Jackpot notification + high-value reward feed
    if (state.jackpots) {
      state.jackpots.forEach(jp => {
        if (jp.time > lastJackpotTime) {
          lastJackpotTime = jp.time;
          UI.showJackpot(jp);
          Camera.shake(15, 0.5);
          // Add to reward feed
          addRewardFeedItem(jp.playerName, jp.reward, jp.blockName);
        }
      });
    }

    // Camera shake on explosion
    if (state.explosions) {
      state.explosions.forEach(e => {
        const age = Date.now() - e.time;
        if (age < 100) {
          Camera.shake(15, 0.5);
        }
      });
    }
  };

  GameSocket.onPurchaseSuccess = (result) => {
    UI.showToast('Purchase complete!', 'success');
    UI.playSFX('spawn');
    UI.updatePlayerInfo(GameSocket.player);
    // Shop stays open for continuous purchasing
  };

  GameSocket.onPurchaseError = (message) => {
    UI.showToast(message, 'error');
  };

  GameSocket.onBalanceUpdate = (data) => {
    if (GameSocket.player) {
      GameSocket.player.balance = data.balance;
      if (data.chargedCredits !== undefined) GameSocket.player.chargedCredits = data.chargedCredits;
      if (data.inGameCredits !== undefined) GameSocket.player.inGameCredits = data.inGameCredits;
      UI.updatePlayerInfo(GameSocket.player);
    }
  };

  GameSocket.onPickaxeExpired = (data) => {
    const msg = data.totalReward > 0
      ? `Pickaxe expired! Earned ${data.totalReward.toLocaleString()} (${data.blocksDestroyed} blocks)`
      : `Pickaxe expired! (no earnings)`;
    UI.showToast(msg, data.totalReward > 0 ? 'success' : 'info');
    if (data.totalReward > 0) UI.playSFX('reward');
    GameSocket.getMyInfo();
  };

  GameSocket.onMyInfo = (data) => {
    UI.updatePlayerInfo(data);
  };

  GameSocket.onChatMessage = (data) => {
    UI.addChatMessage(data);
  };

  GameSocket.onPlayerJoined = (data) => {
    UI.addSystemMessage(`${data.name} joined the game`);
  };

  GameSocket.onPlayerLeft = (data) => {
    UI.addSystemMessage(`${data.name} left the game`);
  };

  GameSocket.onRareBlockSpawned = (data) => {
    UI.showRareBlockSpawnAlert(data);
  };

  GameSocket.onRareBlockDestroyed = (data) => {
    Renderer.triggerRareBlockEffect(data);
    UI.showRareBlockNotification(data);
    // Play reward SFX if this is our own pickaxe's reward
    if (GameSocket.player && data.playerName === GameSocket.player.name) {
      UI.playSFX('reward');
    }
  };

  GameSocket.onJackpotBlockSpawned = (data) => {
    UI.showToast('JACKPOT BLOCK has appeared in the mine!', 'info');
    Camera.shake(20, 1.0);
  };

  GameSocket.onJackpotBlockDestroyed = (data) => {
    Renderer.triggerRareBlockEffect(data);
    UI.showRareBlockNotification(data);
  };

  GameSocket.onQuestStatus = (quests) => {
    UI.renderQuests(quests);
  };

  GameSocket.onQuestVerified = (data) => {
    if (data.success) {
      const rewardText = data.reward ? `+${data.reward.toLocaleString()} in-game credits` : '';
      UI.showToast(`Quest completed! ${rewardText}`, 'success');
      // Update credit split if provided
      if (GameSocket.player && data.inGameCredits !== undefined) {
        GameSocket.player.inGameCredits = data.inGameCredits;
        UI.updatePlayerInfo(GameSocket.player);
      }
      GameSocket.getQuests();
    } else {
      UI.showToast(data.message || 'Quest verification failed', 'error');
      GameSocket.getQuests();
    }
  };

  GameSocket.onDepositConfirmed = (data) => {
    const credits = data.creditsAdded ? data.creditsAdded.toLocaleString() : '';
    UI.showToast(`Deposit confirmed! ${credits ? credits + ' credits added' : ''}`, 'success');
  };

  GameSocket.onDepositFailed = (data) => {
    UI.showToast(`Deposit sync failed: ${data.message || 'Unknown error'}`, 'error');
  };

  GameSocket.onWithdrawConfirmed = (data) => {
    const credits = data.creditsDeducted ? data.creditsDeducted.toLocaleString() : '';
    UI.showToast(`Withdraw confirmed! ${credits ? credits + ' credits deducted' : ''}`, 'success');
  };

  GameSocket.onWithdrawFailed = (data) => {
    UI.showToast(`Withdraw sync failed: ${data.message || 'Unknown error'}`, 'error');
  };

  GameSocket.onDisconnect = (reason) => {
    UI.showToast('Disconnected. Reconnecting...', 'error');
  };

  // ===== Render Loop =====
  let lastFrameTime = 0;

  function startRenderLoop() {
    function frame(timestamp) {
      const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
      lastFrameTime = timestamp;

      Camera.update(dt);
      Renderer.render(latestState);
      HUD.render(Renderer.ctx, latestState, GameSocket.player);

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ===== Wallet Integration =====
  let walletLoginPending = false;

  // Handle explicit login request (from _requireWallet when wallet is connected but not game-logged-in)
  window.addEventListener('walletLoginRequested', () => {
    if (!walletLoginPending && !GameSocket.player && window.WalletAPI && window.WalletAPI.isConnected()) {
      walletLoginPending = true;
      const address = window.WalletAPI.getAddress();
      const shortAddress = window.WalletAPI.getShortAddress();
      doWalletLogin(address, shortAddress);
    }
  });

  // Handle wallet state changes (from RainbowKit)
  window.addEventListener('walletStateChanged', (e) => {
    const { isConnected, address, shortAddress } = e.detail;

    if (isConnected && address && !walletLoginPending && !GameSocket.player) {
      walletLoginPending = true;
      doWalletLogin(address, shortAddress);
    }

    if (!isConnected && GameSocket.player) {
      // Wallet disconnected — reset to spectator
      walletLoginPending = false;
      GameSocket.player = null;

      // Close all open panels
      UI.closeShop();
      UI.closeMenu();
      UI.closeMyInfo();
      UI.closeLeaderboard();
      UI.closeQuest();
      UI.closeChat();

      // Switch back to normal field
      GameSocket.selectField('normal');
      UI.updateFieldToggle('normal');

      if (GameSocket.socket) {
        GameSocket.socket.disconnect();
        GameSocket.socket.connect();
      }
      UI.showToast('Wallet disconnected', 'info');
    }
  });

  async function doWalletLogin(address, shortAddress) {
    try {
      const message = `PIKIT Login: ${address} at ${Date.now()}`;
      const signature = await window.WalletAPI.signMessage(message);
      GameSocket.joinWithWallet(address, shortAddress, message, signature);
    } catch (err) {
      console.error('[Wallet] Sign failed:', err);
      walletLoginPending = false;
      UI.showToast('Wallet sign cancelled', 'error');
    }
  }

  // ===== Event Listeners =====

  // Block hover tooltip — track mouse position over canvas
  document.addEventListener('mousemove', (e) => {
    if (Renderer.canvas) {
      Renderer.updateHoverPosition(e.clientX, e.clientY);
    }
  });
  document.addEventListener('mouseleave', () => {
    Renderer.updateHoverPosition(0, 0);
  });

  // Window resize
  window.addEventListener('resize', () => {
    if (Renderer.canvas) {
      Renderer.resize();
    }
  });

  // ===== Initialization =====
  GameSocket.connect();
})();

// ===== High-Value Reward Feed =====
function addRewardFeedItem(playerName, reward, blockName) {
  const feed = document.getElementById('reward-feed');
  if (!feed) return;
  const item = document.createElement('div');
  item.className = 'reward-feed-item';
  item.textContent = `${playerName} found ${reward.toLocaleString()}cr from ${blockName}!`;
  feed.appendChild(item);
  // Max 5 items
  while (feed.children.length > 5) feed.removeChild(feed.firstChild);
  // Auto-remove after 4 seconds
  setTimeout(() => {
    item.classList.add('fade-out');
    setTimeout(() => { if (item.parentNode) item.parentNode.removeChild(item); }, 500);
  }, 4000);
}
