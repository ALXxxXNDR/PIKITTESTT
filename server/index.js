const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const GameEngine = require('./game/GameEngine');
const Player = require('./game/Player');
const { PICKAXE_TYPES, TNT_TYPES, INITIAL_BALANCE, GAME, BLOCK_TYPES } = require('./game/constants');
const { verifyMessage } = require('ethers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? false  // Same origin only in production
      : '*',   // Allow all in development
  },
  pingTimeout: 20000,
  pingInterval: 10000,
});

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));
// No REST routes — skip JSON body parsing overhead

// Initialize dual-field game engines
const normalEngine = new GameEngine(io, 'normal', 1);
const hardcoreEngine = new GameEngine(io, 'hardcore', 10);
normalEngine.start();
hardcoreEngine.start();

const engines = { normal: normalEngine, hardcore: hardcoreEngine };

// Field definitions sent to client
const FIELD_DEFS = [
  { id: 'normal', name: 'Normal', multiplier: 1, description: 'Standard rewards' },
  { id: 'hardcore', name: 'Hardcore 10x', multiplier: 10, description: '10x cost, 10x rewards!' },
];

// Helper: get the engine a socket is currently in
function getPlayerEngine(socket) {
  const fieldId = socket._currentField;
  return fieldId ? engines[fieldId] : null;
}

// Helper: find player across all engines
function findPlayer(socketId) {
  for (const engine of Object.values(engines)) {
    const player = engine.players.get(socketId);
    if (player) return player;
  }
  return null;
}

// ========== Chat rate limiting ==========
const chatCooldowns = new Map(); // socketId -> lastMessageTime

// ========== Transaction replay protection ==========
// TODO: In production, replace with a persistent store (DB). This Set grows unbounded in memory.
const processedTxHashes = new Set(); // Prevents same tx hash from being credited/debited twice

// ========== Socket.IO Events ==========
io.on('connection', (socket) => {
  console.log(`[Connect] ${socket.id}`);

  // Auto-join normal field room as spectator (receive gameState broadcasts immediately)
  socket._currentField = 'normal';
  socket.join('field:normal');

  // Send initial data (filter out system pickaxe from client)
  const clientPickaxeTypes = Object.fromEntries(
    Object.entries(PICKAXE_TYPES).filter(([key]) => key !== 'system')
  );
  socket.emit('init', {
    gameConfig: GAME,
    pickaxeTypes: clientPickaxeTypes,
    tntTypes: TNT_TYPES,
    blockTypes: BLOCK_TYPES,
    initialBalance: INITIAL_BALANCE,
    fields: FIELD_DEFS,
  });

  // Legacy login (nickname-based) — kept for backward compatibility
  socket.on('join', (data) => {
    if (findPlayer(socket.id)) {
      return socket.emit('error', { message: 'Already joined' });
    }
    const rawName = String(data.name || 'Player').replace(/[<>&"'/]/g, '').trim();
    const name = (rawName || 'Player').substring(0, 12);
    const player = new Player(socket.id, name);

    // Auto-add player to current field engine
    const currentField = socket._currentField || 'normal';
    const engine = engines[currentField];
    if (engine && !engine.players.has(socket.id)) {
      engine.addPlayer(player);
      player.trackLogin();
      io.to(`field:${currentField}`).emit('playerJoined', { name, time: Date.now() });
    } else {
      socket._pendingPlayer = player;
    }

    socket.emit('joined', player.serializeFull());
    console.log(`[Join] ${name} -> ${currentField} (${socket.id})`);
  });

  // Web3 wallet login — verify signature, use wallet address as name
  socket.on('joinWithWallet', (data) => {
    if (findPlayer(socket.id)) {
      return socket.emit('error', { message: 'Already joined' });
    }

    // Validate required fields
    if (!data || !data.address || !data.message || !data.signature) {
      return socket.emit('error', { message: 'Invalid wallet data' });
    }

    try {
      // Verify the signature matches the claimed address
      const recoveredAddress = verifyMessage(data.message, data.signature);
      if (recoveredAddress.toLowerCase() !== data.address.toLowerCase()) {
        return socket.emit('error', { message: 'Signature verification failed' });
      }

      // Use shortened address as name (0x1234...abcd)
      const shortAddr = data.shortAddress || `${data.address.slice(0, 6)}...${data.address.slice(-4)}`;
      const name = shortAddr.substring(0, 13); // Safety cap

      const player = new Player(socket.id, name);
      player.walletAddress = data.address.toLowerCase(); // Store full address

      // Auto-add player to current field engine (spectator is already in a room)
      const currentField = socket._currentField || 'normal';
      const engine = engines[currentField];
      if (engine && !engine.players.has(socket.id)) {
        engine.addPlayer(player);
        player.trackLogin();
        io.to(`field:${currentField}`).emit('playerJoined', { name, time: Date.now() });
      } else {
        socket._pendingPlayer = player;
      }

      socket.emit('joined', player.serializeFull());
      console.log(`[WalletJoin] ${name} -> ${currentField} (${data.address}) (${socket.id})`);
    } catch (err) {
      console.error('[WalletJoin] Verification error:', err.message);
      socket.emit('error', { message: 'Wallet verification failed' });
    }
  });

  // ===== Field Selection (works for both spectators and players) =====
  socket.on('selectField', (data) => {
    const fieldId = (data && data.fieldId === 'hardcore') ? 'hardcore' : 'normal';
    const engine = engines[fieldId];
    const oldFieldId = socket._currentField;

    // Already on this field? Just confirm
    if (oldFieldId === fieldId) {
      // If player exists but not in engine (e.g. just logged in), add them
      const player = socket._pendingPlayer || findPlayer(socket.id);
      if (player && !engine.players.has(socket.id)) {
        engine.addPlayer(player);
        socket._pendingPlayer = null;
        player.trackLogin();
        io.to(`field:${fieldId}`).emit('playerJoined', { name: player.name, time: Date.now() });
        console.log(`[SelectField] ${player.name} joined ${fieldId} (${socket.id})`);
      }
      socket.emit('fieldSelected', { fieldId, multiplier: engine.rewardMultiplier });
      return;
    }

    // Leave old field room
    if (oldFieldId) {
      socket.leave(`field:${oldFieldId}`);
      const oldEngine = engines[oldFieldId];
      if (oldEngine) {
        const existingPlayer = oldEngine.players.get(socket.id);
        if (existingPlayer) {
          socket._pendingPlayer = existingPlayer;
          oldEngine.removePlayer(socket.id);
          io.to(`field:${oldFieldId}`).emit('playerLeft', { name: existingPlayer.name, time: Date.now() });
        }
      }
    }

    // Join new field room
    socket._currentField = fieldId;
    socket.join(`field:${fieldId}`);

    // If we have a player (logged in), add to engine
    const player = socket._pendingPlayer || findPlayer(socket.id);
    if (player && !engine.players.has(socket.id)) {
      engine.addPlayer(player);
      socket._pendingPlayer = null;
      player.trackLogin();
      io.to(`field:${fieldId}`).emit('playerJoined', { name: player.name, time: Date.now() });
      console.log(`[SelectField] ${player.name} -> ${fieldId} (${socket.id})`);
    } else {
      console.log(`[SelectField] spectator -> ${fieldId} (${socket.id})`);
    }

    socket.emit('fieldSelected', { fieldId, multiplier: engine.rewardMultiplier });
  });

  // Chat message
  socket.on('chatMessage', (data) => {
    const engine = getPlayerEngine(socket);
    if (!engine) return socket.emit('error', { message: 'Please join a field first' });
    const player = engine.players.get(socket.id);
    if (!player) return socket.emit('error', { message: 'Please join first' });

    // Rate limit: 1 message per second
    const now = Date.now();
    const lastMsg = chatCooldowns.get(socket.id) || 0;
    if (now - lastMsg < 1000) return;
    chatCooldowns.set(socket.id, now);

    // Validate & truncate message (client uses textContent for rendering, so no HTML escaping needed)
    const message = String(data.message || '').trim().substring(0, 200);
    if (!message) return;

    // Send chat only to the same field
    io.to(engine.roomName).emit('chatMessage', {
      name: player.name,
      message,
      time: now,
    });
  });

  // Buy pickaxe (max 5 active pickaxes per player)
  socket.on('buyPickaxe', (data) => {
    const engine = getPlayerEngine(socket);
    if (!engine) return socket.emit('error', { message: 'Please join a field first' });
    const player = engine.players.get(socket.id);
    if (!player) return socket.emit('error', { message: 'Please join first' });
    if (!data || typeof data.type !== 'string') return;

    if (player.activePickaxes.length >= 5) {
      return socket.emit('purchaseResult', { success: false, message: 'Max 5 active pickaxes' });
    }

    const result = engine.buyPickaxe(player, data.type);
    if (result.error) {
      socket.emit('purchaseResult', { success: false, message: result.error });
    } else {
      socket.emit('purchaseResult', { success: true, item: result.pickaxe, player: player.serialize() });
    }
  });

  // Buy TNT
  socket.on('buyTNT', (data) => {
    const engine = getPlayerEngine(socket);
    if (!engine) return socket.emit('error', { message: 'Please join a field first' });
    const player = engine.players.get(socket.id);
    if (!player) return socket.emit('error', { message: 'Please join first' });
    if (!data || typeof data.type !== 'string') return;

    const result = engine.buyTNT(player, data.type);
    if (result.error) {
      socket.emit('purchaseResult', { success: false, message: result.error });
    } else {
      socket.emit('purchaseResult', { success: true, item: result.tnt, player: player.serialize() });
    }
  });

  // Add balance (rate-limited: max 5 times per 30 seconds, fixed 10K)
  socket.on('addBalance', () => {
    const player = findPlayer(socket.id) || (socket._pendingPlayer);
    if (!player) return;

    const now = Date.now();
    if (!player._addBalanceHistory) player._addBalanceHistory = [];
    // Remove entries older than 30 seconds
    player._addBalanceHistory = player._addBalanceHistory.filter(t => now - t < 30000);
    if (player._addBalanceHistory.length >= 5) return; // Rate limited

    player._addBalanceHistory.push(now);
    const amount = 10000;
    player.chargedCredits += amount;
    socket.emit('balanceUpdated', {
      balance: player.balance,
      chargedCredits: player.chargedCredits,
      inGameCredits: player.inGameCredits,
    });
  });

  // ===== Quest System =====
  socket.on('getQuests', () => {
    const player = findPlayer(socket.id);
    if (!player) return;
    socket.emit('questStatus', player.getQuestStatus());
  });

  // Verify on-chain quest completion + give in-game credit reward
  socket.on('verifyQuestCompletion', async (data) => {
    const player = findPlayer(socket.id);
    if (!player) return;
    if (!data || typeof data.questId !== 'number' || typeof data.txHash !== 'string') return;

    const questId = data.questId;
    if (questId < 1 || questId > 9999) return;
    if (player.completedQuests.has(questId)) {
      return socket.emit('questVerified', { questId, success: false, message: 'Already completed' });
    }

    // Check if quest target is met (uses new tiered system)
    if (!player.isQuestTargetMet(questId)) {
      return socket.emit('questVerified', { questId, success: false, message: 'Quest target not reached' });
    }

    try {
      // Verify the transaction on Sepolia
      const { ethers } = require('ethers');
      const provider = new ethers.JsonRpcProvider('https://rpc.sepolia.org');
      const receipt = await provider.getTransactionReceipt(data.txHash);

      if (!receipt || receipt.status !== 1) {
        return socket.emit('questVerified', { questId, success: false, message: 'Transaction failed or not found' });
      }

      // Verify the transaction was sent by the player's wallet
      if (player.walletAddress) {
        const tx = await provider.getTransaction(data.txHash);
        if (tx && tx.from.toLowerCase() !== player.walletAddress.toLowerCase()) {
          return socket.emit('questVerified', { questId, success: false, message: 'Transaction sender mismatch' });
        }
      }

      // Mark quest as completed + give in-game credit reward
      player.completedQuests.add(questId);
      const reward = player.getQuestReward(questId);
      if (reward > 0) {
        player.earnInGameCredits(reward, `Quest #${questId} reward`);
        console.log(`[Quest] ${player.name} completed quest #${questId} → +${reward.toLocaleString()} in-game credits (tx: ${data.txHash})`);
      }

      socket.emit('questVerified', {
        questId,
        success: true,
        reward,
        inGameCredits: player.inGameCredits,
        balance: player.balance,
        chargedCredits: player.chargedCredits,
      });
      socket.emit('questStatus', player.getQuestStatus());
    } catch (err) {
      console.error('[Quest] Verification error:', err.message);
      socket.emit('questVerified', { questId, success: false, message: 'Verification error' });
    }
  });

  // Request my info
  socket.on('getMyInfo', () => {
    const player = findPlayer(socket.id);
    if (player) {
      socket.emit('myInfo', player.serializeFull());
    }
  });

  // Sync deposit: verify on-chain transaction and credit the player
  socket.on('syncDeposit', async (data) => {
    const player = findPlayer(socket.id);
    if (!player) return;
    const txHash = data && data.txHash;
    if (!txHash || typeof txHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) return;

    // Prevent replay: same tx hash processed twice
    if (processedTxHashes.has(txHash)) {
      return socket.emit('depositConfirmed', { txHash, success: false, message: 'Transaction already processed' });
    }

    try {
      const { ethers } = require('ethers');
      const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      const receipt = await provider.waitForTransaction(txHash, 1, 30000);

      if (!receipt || receipt.status !== 1) {
        return socket.emit('depositConfirmed', { txHash, success: false, message: 'Transaction failed or not found' });
      }

      // Verify the sender matches the player's wallet address
      if (player.walletAddress) {
        const tx = await provider.getTransaction(txHash);
        if (!tx || tx.from.toLowerCase() !== player.walletAddress.toLowerCase()) {
          return socket.emit('depositConfirmed', { txHash, success: false, message: 'Transaction sender mismatch' });
        }
      } else {
        return socket.emit('depositConfirmed', { txHash, success: false, message: 'No wallet address linked' });
      }

      // Parse Deposited event from receipt to get actual credited amount
      // Deposited(address indexed player, uint256 usdcAmount, uint256 creditsReceived)
      const DEPOSITED_TOPIC = ethers.id('Deposited(address,uint256,uint256)');
      let creditsToAdd = 0;
      for (const log of receipt.logs) {
        if (log.topics[0] === DEPOSITED_TOPIC) {
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256', 'uint256'], log.data);
          creditsToAdd = Number(decoded[1]); // creditsReceived
          break;
        }
      }

      if (creditsToAdd <= 0) {
        return socket.emit('depositConfirmed', { txHash, success: false, message: 'Could not parse deposit amount from tx logs' });
      }

      // Mark tx as processed to prevent replay
      processedTxHashes.add(txHash);

      // Credit the player's charged credits (withdrawable)
      player.chargedCredits += creditsToAdd;

      socket.emit('depositConfirmed', { txHash, success: true, creditsAdded: creditsToAdd });
      socket.emit('balanceUpdated', { balance: player.balance, chargedCredits: player.chargedCredits, inGameCredits: player.inGameCredits });
      console.log(`[Deposit] ${player.name} deposited ${creditsToAdd} credits (tx: ${txHash})`);
    } catch (err) {
      console.error('[Deposit] Sync error:', err.message);
      socket.emit('depositConfirmed', { txHash, success: false, message: err.message });
    }
  });

  // Sync withdraw: verify on-chain transaction and deduct credits
  socket.on('syncWithdraw', async (data) => {
    const player = findPlayer(socket.id);
    if (!player) return;
    const txHash = data && data.txHash;
    if (!txHash || typeof txHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) return;

    // Prevent replay: same tx hash processed twice
    if (processedTxHashes.has(txHash)) {
      return socket.emit('withdrawConfirmed', { txHash, success: false, message: 'Transaction already processed' });
    }

    try {
      const { ethers } = require('ethers');
      const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      const receipt = await provider.waitForTransaction(txHash, 1, 30000);

      if (!receipt || receipt.status !== 1) {
        return socket.emit('withdrawConfirmed', { txHash, success: false, message: 'Transaction failed or not found' });
      }

      // Verify the sender matches the player's wallet address
      if (player.walletAddress) {
        const tx = await provider.getTransaction(txHash);
        if (!tx || tx.from.toLowerCase() !== player.walletAddress.toLowerCase()) {
          return socket.emit('withdrawConfirmed', { txHash, success: false, message: 'Transaction sender mismatch' });
        }
      } else {
        return socket.emit('withdrawConfirmed', { txHash, success: false, message: 'No wallet address linked' });
      }

      // Parse Withdrawn event from receipt to get actual debited amount
      // Withdrawn(address indexed player, uint256 creditsBurned, uint256 usdcReceived)
      const WITHDRAWN_TOPIC = ethers.id('Withdrawn(address,uint256,uint256)');
      let creditsToDeduct = 0;
      for (const log of receipt.logs) {
        if (log.topics[0] === WITHDRAWN_TOPIC) {
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256', 'uint256'], log.data);
          creditsToDeduct = Number(decoded[0]); // creditsBurned
          break;
        }
      }

      if (creditsToDeduct <= 0) {
        return socket.emit('withdrawConfirmed', { txHash, success: false, message: 'Could not parse withdraw amount from tx logs' });
      }

      // Mark tx as processed to prevent replay
      processedTxHashes.add(txHash);

      // Deduct from player's charged credits only (in-game credits not withdrawable)
      player.chargedCredits = Math.max(0, player.chargedCredits - creditsToDeduct);

      socket.emit('withdrawConfirmed', { txHash, success: true, creditsDeducted: creditsToDeduct });
      socket.emit('balanceUpdated', { balance: player.balance, chargedCredits: player.chargedCredits, inGameCredits: player.inGameCredits });
      console.log(`[Withdraw] ${player.name} withdrew ${creditsToDeduct} credits (tx: ${txHash})`);
    } catch (err) {
      console.error('[Withdraw] Sync error:', err.message);
      socket.emit('withdrawConfirmed', { txHash, success: false, message: err.message });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const player = findPlayer(socket.id);
    if (player) {
      // Broadcast player left to current field
      if (socket._currentField) {
        io.to(`field:${socket._currentField}`).emit('playerLeft', { name: player.name, time: Date.now() });
      }
      console.log(`[Disconnect] ${player.name} (${socket.id})`);
    }
    // Remove from whichever engine they're in
    for (const engine of Object.values(engines)) {
      engine.removePlayer(socket.id);
    }
    chatCooldowns.delete(socket.id);
  });
});

// ========== Start Server ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  PIKIT Server Running (Dual Field)`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Normal (1x) + Hardcore (10x)`);
  console.log(`========================================\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  normalEngine.stop();
  hardcoreEngine.stop();
  io.close();
  server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason);
});
