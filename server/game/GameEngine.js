const Chunk = require('./Chunk');
const Pickaxe = require('./Pickaxe');
const TNT = require('./TNT');
const { GAME, PICKAXE_TYPES, TNT_TYPES, BLOCK_TYPES, JACKPOT_CONFIG, JACKPOT_POOL_CONFIG, SYSTEM_PICKAXE_COUNT } = require('./constants');

const MAX_PICKAXES_PER_PLAYER = 5;

class GameEngine {
  constructor(io, fieldId = 'normal', rewardMultiplier = 1) {
    this.io = io;
    this.fieldId = fieldId;
    this.rewardMultiplier = rewardMultiplier;
    this.roomName = `field:${fieldId}`;
    this.chunks = new Map();      // chunkIndex -> Chunk
    this.pickaxes = new Map();    // pickaxeId -> Pickaxe
    this.tnts = new Map();        // tntId -> TNT
    this.explosions = [];         // Explosion effect queue
    this.jackpots = [];           // Jackpot notification queue
    this.players = new Map();     // socketId -> Player

    // Global state
    this.lowestY = 0;             // Deepest Y reached
    this.cameraY = 0;             // Camera Y

    this.running = false;
    this.lastTick = Date.now();
    this.tickCount = 0;
    this.broadcastCount = 0;

    // System pickaxe auto-spawn timer
    this.lastSystemPickaxe = 0;
    this.systemPickaxeInterval = 5000; // 5 seconds

    // Jackpot tracking
    this.creditsSinceLastJackpot = 0;  // Total credits spent since last jackpot spawn
    this.jackpotBlockExists = false;   // Is there a live jackpot block on the field?

    // Leaderboard cache (updated every 2 seconds instead of every broadcast)
    this._leaderboardCache = { pnl: [], spent: [] };
    this._leaderboardLastUpdate = 0;

    // Per-field chat history (max 100 messages)
    this.chatHistory = [];

    // System pickaxe counter (avoid iterating all pickaxes every tick)
    this._systemPickaxeCount = 0;

    // System account balance (rewards earned by system pickaxes)
    this.systemAccountBalance = 0;

    // Jackpot pool (v4.8) — accumulates from house profit milestones
    this.jackpotPool = 0;
    this.houseProfitAccumulator = 0;

    // Respawn flag: jackpot escaped the viewport but pool is still intact
    this._jackpotNeedsRespawn = false;

    // Initial chunk generation
    for (let i = 0; i < 5; i++) {
      this.getOrCreateChunk(i);
    }
  }

  start() {
    this.running = true;
    this.lastTick = Date.now();
    this.tickInterval = setInterval(() => this.tick(), 1000 / GAME.TICK_RATE);
    this.broadcastInterval = setInterval(() => this.broadcast(), 1000 / GAME.BROADCAST_RATE);
    console.log(`[GameEngine:${this.fieldId}] Started (${GAME.TICK_RATE}fps tick, ${GAME.BROADCAST_RATE}fps broadcast, ${this.rewardMultiplier}x)`);

    // Spawn initial system pickaxes (Infinity lifetime, always present)
    this._systemPickaxeCount = 0;
    for (let i = 0; i < SYSTEM_PICKAXE_COUNT; i++) {
      this._spawnSystemPickaxe();
    }
  }

  stop() {
    this.running = false;
    clearInterval(this.tickInterval);
    clearInterval(this.broadcastInterval);
  }

  // ========== Jackpot Block Callbacks ==========
  _onJackpotBlockSpawned() {
    this.jackpotBlockExists = true;
    this.creditsSinceLastJackpot = 0; // Reset counter
    console.log('[GameEngine] JACKPOT BLOCK SPAWNED!');

    // Notify all clients in this field
    this.io.to(this.roomName).emit('jackpotBlockSpawned', { time: Date.now() });
  }

  // Rare block spawn alert (diamond, netherite, gold, emerald)
  // Only emit alerts when game is running (skip initial chunk generation spam)
  _onRareBlockSpawned(blockType, blockDef) {
    if (!blockDef || !this.running) return;
    this.io.to(this.roomName).emit('rareBlockSpawned', {
      blockType,
      blockName: blockDef.name,
      reward: blockDef.reward,
      color: blockDef.color,
      time: Date.now(),
    });
  }

  // Track credits spent (called from Player.spend via server/index.js)
  trackCreditSpent(amount) {
    this.creditsSinceLastJackpot += amount;
  }

  // ========== Game Tick ==========
  tick() {
    const now = Date.now();
    const dt = Math.min((now - this.lastTick) / 1000, 0.05); // cap at 50ms
    this.lastTick = now;
    this.tickCount++;

    // Update pickaxes
    for (const [id, pickaxe] of this.pickaxes) {
      pickaxe.update(dt);

      // Remove expired
      if (pickaxe.expired) {
        this._expirePickaxe(pickaxe);
        this.pickaxes.delete(id);
        continue;
      }

      // Block collision check
      this._checkPickaxeCollisions(pickaxe, now);
    }

    // Update TNTs
    for (const [id, tnt] of this.tnts) {
      if (tnt.removed || (tnt.explodedAt && now - tnt.explodedAt > 500)) {
        tnt.removed = true;
        this.tnts.delete(id);
        continue;
      }

      const wasExploded = tnt.exploded;

      // Check block collision BEFORE update (so TNT lands on blocks)
      if (!tnt.exploded && !tnt.landed) {
        this._checkTNTCollisions(tnt);
      }

      tnt.update(dt);

      // Handle explosion (TNT explodes when it touches a block)
      if (tnt.exploded && !wasExploded) {
        this._handleExplosion(tnt, now);
      }
    }

    // System pickaxe recovery (maintain SYSTEM_PICKAXE_COUNT alive)
    if (now - this.lastSystemPickaxe > this.systemPickaxeInterval) {
      if (this._systemPickaxeCount < SYSTEM_PICKAXE_COUNT) {
        this._spawnSystemPickaxe();
        this.lastSystemPickaxe = now;
      }
    }

    // Camera tracking (lowest active pickaxe)
    this._updateCamera();

    // Chunk management
    this._manageChunks();

    // Clear blocks that have scrolled above the visible viewport
    this._clearBlocksAboveViewport();
  }

  // ========== Collision Handling ==========
  _checkPickaxeCollisions(pickaxe, now) {
    const chunkIndex = Math.floor(pickaxe.y / (GAME.CHUNK_HEIGHT * GAME.BLOCK_SIZE));

    // Check current and adjacent chunks
    for (let ci = chunkIndex - 1; ci <= chunkIndex + 1; ci++) {
      const chunk = this.chunks.get(ci);
      if (!chunk) continue;

      for (const block of chunk.blocks) {
        if (block.destroyed || block.type === 'bedrock') continue;

        if (pickaxe.collidesWith(block)) {
          const reward = block.takeDamage(pickaxe.damage, now);

          if (reward !== null) {
            // Block destroyed - give reward
            const isSystem = pickaxe.ownerId === '__system__';
            const player = isSystem ? null : this.players.get(pickaxe.ownerId);

            // System pickaxe: add reward to system account balance
            if (isSystem) {
              const sysReward = Math.round(reward * this.rewardMultiplier);
              this.systemAccountBalance += sysReward;
            }

            if (player) {
              // Jackpot block destroyed! — pay out the entire pool directly (reward=0 from constants)
              if (block.type === 'jackpot') {
                this.jackpotBlockExists = false;
                this._jackpotNeedsRespawn = false;
                const jackpotReward = this.jackpotPool;
                this.jackpotPool = 0;

                player.earn(jackpotReward, block.name);
                player.trackBlockDestroyed(block.type); // Quest tracking
                pickaxe.addReward(jackpotReward);

                this.io.to(this.roomName).emit('jackpotBlockDestroyed', {
                  playerName: pickaxe.ownerName,
                  blockName: block.name,
                  reward: jackpotReward,
                  x: block.x + block.width / 2,
                  y: block.y + block.height / 2,
                  time: now,
                });
                // Also push to jackpots for HUD display
                this.jackpots.push({
                  playerName: pickaxe.ownerName,
                  blockName: block.name,
                  reward: jackpotReward,
                  time: now,
                });

                // Jackpot handled — skip normal reward processing
                pickaxe.bounceOff(block);
                break;
              }

              const finalReward = Math.round(reward * this.rewardMultiplier);

              player.earn(finalReward, block.name);
              player.trackBlockDestroyed(block.type); // Quest tracking
              pickaxe.addReward(finalReward);

              // High-value block notification (reward >= 2000, tier 7+)
              if (reward >= 2000) {
                this.jackpots.push({
                  playerName: pickaxe.ownerName,
                  blockName: block.name,
                  reward: finalReward,
                  time: now,
                });

                // Rare block cinematic (diamond, gold, netherite)
                if (block.type === 'diamond_block' || block.type === 'gold_block' || block.type === 'netherite_block') {
                  this.io.to(this.roomName).emit('rareBlockDestroyed', {
                    playerName: pickaxe.ownerName,
                    blockType: block.type,
                    blockName: block.name,
                    reward: finalReward,
                    x: block.x + block.width / 2,
                    y: block.y + block.height / 2,
                    time: now,
                  });
                }
              }
            }
          }

          // Bounce
          pickaxe.bounceOff(block);
          break; // Only one block at a time
        }
      }
    }
  }

  _checkTNTCollisions(tnt) {
    const chunkIndex = Math.floor(tnt.y / (GAME.CHUNK_HEIGHT * GAME.BLOCK_SIZE));

    for (let ci = chunkIndex - 1; ci <= chunkIndex + 1; ci++) {
      const chunk = this.chunks.get(ci);
      if (!chunk) continue;

      for (const block of chunk.blocks) {
        if (block.destroyed) continue;

        if (tnt.collidesWith(block)) {
          tnt.stopOn(block);
          return;
        }
      }
    }
  }

  _handleExplosion(tnt, now) {
    const chunkIndex = Math.floor(tnt.y / (GAME.CHUNK_HEIGHT * GAME.BLOCK_SIZE));
    let totalReward = 0;

    // Damage blocks in surrounding chunks (±1 chunk is sufficient for 3×3 blast)
    for (let ci = chunkIndex - 1; ci <= chunkIndex + 1; ci++) {
      const chunk = this.chunks.get(ci);
      if (!chunk) continue;

      for (const block of chunk.blocks) {
        if (block.destroyed || block.type === 'bedrock') continue;

        if (tnt.isInExplosionRange(block)) {
          // TNT-resistant blocks take reduced damage
          const effectiveDamage = block.tntResist
            ? Math.floor(tnt.damage * 0.4)  // 40% damage to resistant blocks
            : tnt.damage;

          const reward = block.takeDamage(effectiveDamage, now);
          if (reward !== null) {
            totalReward += reward;
            // Track TNT-destroyed blocks for quest progress
            const tntOwner = this.players.get(tnt.ownerId);
            if (tntOwner) tntOwner.trackBlockDestroyed(block.type);
          }
        }
      }
    }

    // Give reward (apply field multiplier)
    totalReward = Math.round(totalReward * this.rewardMultiplier);
    const player = this.players.get(tnt.ownerId);
    if (player && totalReward > 0) {
      player.earn(totalReward, `${tnt.name} Explosion`);

      if (totalReward >= 5000) {
        this.jackpots.push({
          playerName: tnt.ownerName,
          blockName: `${tnt.name} Explosion`,
          reward: totalReward,
          time: now,
        });
      }
    }

    // Explosion effect — use larger radius for visual (hard cap at 50)
    if (this.explosions.length < 50) {
      const visualRadius = Math.max(tnt.radiusX, tnt.radiusDown);
      this.explosions.push({
        x: tnt.x + tnt.width / 2,
        y: tnt.y + tnt.height / 2,
        radius: visualRadius * GAME.BLOCK_SIZE,
        time: now,
        type: tnt.type,
      });
    }

    // Mark explosion time for tick-based removal (avoid stale setTimeout)
    tnt.explodedAt = now;
  }

  // ========== Camera ==========
  _updateCamera() {
    let targetY = this.lowestY;

    // Lowest position among active pickaxes
    for (const [, pickaxe] of this.pickaxes) {
      if (pickaxe.y > targetY) {
        targetY = pickaxe.y;
      }
    }

    // Also consider active TNT positions
    for (const [, tnt] of this.tnts) {
      if (!tnt.removed && tnt.y > targetY) {
        targetY = tnt.y;
      }
    }

    if (targetY > this.lowestY) {
      this.lowestY = targetY;
    }

    // Smooth camera tracking
    this.cameraY += (targetY - this.cameraY) * 0.1;
  }

  // ========== Chunk Management ==========
  getOrCreateChunk(index) {
    if (!this.chunks.has(index)) {
      this.chunks.set(index, new Chunk(index, this)); // Pass this engine for jackpot tracking
    }
    return this.chunks.get(index);
  }

  _manageChunks() {
    const currentChunk = Math.floor(this.cameraY / (GAME.CHUNK_HEIGHT * GAME.BLOCK_SIZE));

    // Pre-generate 5 chunks ahead
    for (let i = currentChunk; i <= currentChunk + 5; i++) {
      this.getOrCreateChunk(i);
    }

    // Remove chunks too far above (memory)
    for (const [index, chunk] of this.chunks) {
      if (index < currentChunk - 2) {
        // Reset jackpot flag if chunk contained an undestroyed jackpot block
        if (this.jackpotBlockExists) {
          for (const block of chunk.blocks) {
            if (block.type === 'jackpot' && !block.destroyed) {
              this.jackpotBlockExists = false;
              // Pool is preserved — mark for potential re-spawn via RESPAWN_CHANCE
              this._jackpotNeedsRespawn = true;
              break;
            }
          }
        }
        this.chunks.delete(index);
      }
    }
  }

  // Clear all non-bedrock blocks that have scrolled above the visible viewport.
  // This prevents pickaxes spawned above the camera from colliding with
  // invisible leftover blocks and wasting their lifetime off-screen.
  _clearBlocksAboveViewport() {
    const viewportTop = this.cameraY - GAME.INTERNAL_HEIGHT * 0.6;

    for (const [index, chunk] of this.chunks) {
      const chunkBottomY = (index + 1) * GAME.CHUNK_HEIGHT * GAME.BLOCK_SIZE;
      // Skip chunks that are partially or fully visible
      if (chunkBottomY > viewportTop) continue;

      for (const block of chunk.blocks) {
        if (!block.destroyed && block.type !== 'bedrock') {
          const blockBottomY = block.y + block.height;
          if (blockBottomY < viewportTop) {
            block.destroyed = true;
            // Reset jackpot tracking flag if necessary
            if (block.type === 'jackpot') {
              this.jackpotBlockExists = false;
              // Pool is preserved — mark for potential re-spawn via RESPAWN_CHANCE
              this._jackpotNeedsRespawn = true;
            }
          }
        }
      }
    }
  }

  // ========== Pickaxe Expiry ==========
  _expirePickaxe(pickaxe) {
    // System pickaxe: update counter only
    if (pickaxe.ownerId === '__system__') {
      this._systemPickaxeCount--;
      return;
    }

    // Player pickaxe: compute house profit and feed jackpot pool
    const profit = (pickaxe.price || 0) - (pickaxe.totalReward || 0);
    if (profit > 0) {
      this.houseProfitAccumulator += profit;
      while (this.houseProfitAccumulator >= JACKPOT_POOL_CONFIG.HOUSE_PROFIT_MILESTONE) {
        this.jackpotPool += JACKPOT_POOL_CONFIG.POOL_ALLOCATION;
        this.houseProfitAccumulator -= JACKPOT_POOL_CONFIG.HOUSE_PROFIT_MILESTONE;
      }
    }

    // Expiry notification
    const player = this.players.get(pickaxe.ownerId);
    if (player) {
      player.activePickaxes = player.activePickaxes.filter(id => id !== pickaxe.id);
      const socket = this.io.sockets.sockets.get(pickaxe.ownerId);
      if (socket) {
        socket.emit('pickaxeExpired', {
          pickaxeId: pickaxe.id,
          type: pickaxe.type,
          totalReward: pickaxe.totalReward,
          blocksDestroyed: pickaxe.blocksDestroyed,
        });
      }
    }
  }

  // Find an X position where no undestroyed blocks sit directly below the
  // spawn point (within 3 block heights). Returns a random empty-column X,
  // or a fully random X as a fallback when every column is occupied.
  _findEmptySpawnX(spawnY) {
    const minX = GAME.WALL_THICKNESS;
    const maxX = GAME.WALL_THICKNESS + GAME.BLOCK_SIZE * GAME.CHUNK_WIDTH;
    const cols = GAME.CHUNK_WIDTH;
    const candidates = [];

    for (let col = 0; col < cols; col++) {
      const colX = GAME.WALL_THICKNESS + col * GAME.BLOCK_SIZE;
      let blocked = false;

      // Scan 3 block-heights below the spawn point
      const checkDepth = spawnY + GAME.BLOCK_SIZE * 3;
      const chunkStart = Math.floor(spawnY / (GAME.CHUNK_HEIGHT * GAME.BLOCK_SIZE));
      const chunkEnd = Math.floor(checkDepth / (GAME.CHUNK_HEIGHT * GAME.BLOCK_SIZE));

      for (let ci = chunkStart; ci <= chunkEnd; ci++) {
        const chunk = this.chunks.get(ci);
        if (!chunk) continue;
        for (const block of chunk.blocks) {
          if (block.destroyed || block.type === 'bedrock') continue;
          if (
            block.x >= colX && block.x < colX + GAME.BLOCK_SIZE &&
            block.y >= spawnY && block.y < checkDepth
          ) {
            blocked = true;
            break;
          }
        }
        if (blocked) break;
      }

      if (!blocked) {
        candidates.push(colX);
      }
    }

    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Fallback: all columns occupied — pick a random legal X
    return minX + Math.random() * (maxX - GAME.BLOCK_SIZE - minX);
  }

  // ========== System Pickaxes ==========

  _spawnSystemPickaxe() {
    const pickaxe = new Pickaxe('system', '__system__', 'PIKIT');
    pickaxe.y = this.cameraY - GAME.INTERNAL_HEIGHT / 2;
    pickaxe.x = this._findEmptySpawnX(pickaxe.y);
    this.pickaxes.set(pickaxe.id, pickaxe);
    this._systemPickaxeCount++;
  }

  // ========== Item Purchase ==========
  buyPickaxe(player, type) {
    const def = PICKAXE_TYPES[type];
    if (!def) return { error: 'Invalid pickaxe type' };
    if (type === 'system') return { error: 'Invalid pickaxe type' };

    // Max 5 pickaxes per player per field
    const activeCount = Array.from(this.pickaxes.values())
      .filter(p => p.ownerId === player.id && !p.expired).length;
    if (activeCount >= MAX_PICKAXES_PER_PLAYER) return { error: `Max ${MAX_PICKAXES_PER_PLAYER} pickaxes per field!` };

    const effectivePrice = def.price * this.rewardMultiplier;
    if (!player.canAfford(effectivePrice)) return { error: 'Insufficient balance' };

    player.spend(effectivePrice, def.name);
    player.trackPickaxePurchase(type); // Quest tracking
    this.trackCreditSpent(effectivePrice); // Track for jackpot

    const pickaxe = new Pickaxe(type, player.id, player.name);
    // Start above camera, in an empty column so it falls into open space
    pickaxe.y = this.cameraY - GAME.INTERNAL_HEIGHT / 2;
    pickaxe.x = this._findEmptySpawnX(pickaxe.y);
    this.pickaxes.set(pickaxe.id, pickaxe);
    player.activePickaxes.push(pickaxe.id);

    return { success: true, pickaxe: pickaxe.serialize() };
  }

  buyTNT(player, type) {
    const def = TNT_TYPES[type];
    if (!def) return { error: 'Invalid TNT type' };
    const effectivePrice = def.price * this.rewardMultiplier;
    if (!player.canAfford(effectivePrice)) return { error: 'Insufficient balance' };

    player.spend(effectivePrice, def.name);
    player.trackTNTPurchase(); // Quest tracking
    this.trackCreditSpent(effectivePrice); // Track for jackpot

    // Random position, spawned in active mining zone
    const minX = GAME.WALL_THICKNESS;
    const maxX = GAME.WALL_THICKNESS + GAME.BLOCK_SIZE * GAME.CHUNK_WIDTH - GAME.BLOCK_SIZE;
    const x = minX + Math.random() * (maxX - minX);

    // Calculate active mining zone from pickaxe positions
    let spawnY = this.cameraY - GAME.INTERNAL_HEIGHT / 2; // fallback
    const playerPickaxeYs = [];
    for (const [, p] of this.pickaxes) {
      if (p.ownerId !== '__system__') playerPickaxeYs.push(p.y);
    }
    if (playerPickaxeYs.length > 0) {
      const minPY = Math.min(...playerPickaxeYs);
      spawnY = minPY - GAME.BLOCK_SIZE * 2; // Spawn above active zone
    }
    const y = spawnY;

    const tnt = new TNT(type, player.id, player.name, x, y);
    this.tnts.set(tnt.id, tnt);

    return { success: true, tnt: tnt.serialize() };
  }

  // ========== State Broadcast ==========
  broadcast() {
    const currentChunk = Math.floor(this.cameraY / (GAME.CHUNK_HEIGHT * GAME.BLOCK_SIZE));

    // Send only visible blocks
    const visibleBlocks = [];
    for (let ci = currentChunk - 1; ci <= currentChunk + 3; ci++) {
      const chunk = this.chunks.get(ci);
      if (chunk) {
        for (const block of chunk.blocks) {
          if (!block.destroyed) {
            visibleBlocks.push(block.serialize());
          }
        }
      }
    }

    const state = {
      cameraY: this.cameraY,
      depth: Math.round(this.cameraY / GAME.BLOCK_SIZE),
      blocks: visibleBlocks,
      pickaxes: Array.from(this.pickaxes.values()).map(p => p.serialize()),
      tnts: Array.from(this.tnts.values()).filter(t => !t.removed).map(t => t.serialize()),
      explosions: this.explosions.filter(e => Date.now() - e.time < 1000),
      jackpots: this.jackpots.slice(-5),
      leaderboard: this._getLeaderboard(),
      playerCount: this.players.size,
      activePickaxes: this.pickaxes.size,
      jackpotPool: this.jackpotPool,
      systemAccountBalance: this.systemAccountBalance,
    };

    this.io.to(this.roomName).emit('gameState', state);

    // Clean up old explosions/jackpots
    this.explosions = this.explosions.filter(e => Date.now() - e.time < 2000);
    if (this.jackpots.length > 20) {
      this.jackpots = this.jackpots.slice(-10);
    }
  }

  _getLeaderboard() {
    const now = Date.now();
    // Cache leaderboard for 2 seconds to avoid sorting every broadcast
    if (now - this._leaderboardLastUpdate > 2000) {
      const playerArr = Array.from(this.players.values());

      // PNL leaderboard (chargedEarned - chargedSpent, excludes quest/ingame credits)
      const pnl = playerArr
        .map(p => ({
          name: p.name,
          profit: Math.round(p.chargedEarned - p.chargedSpent),
          earned: Math.round(p.chargedEarned),
        }))
        .sort((a, b) => {
          if (b.profit !== a.profit) return b.profit - a.profit;
          const pa = playerArr.find(p => p.name === a.name);
          const pb = playerArr.find(p => p.name === b.name);
          return (pa?.lastProfitChangeAt || 0) - (pb?.lastProfitChangeAt || 0);
        })
        .slice(0, 10);

      // Total spent leaderboard (all-time)
      const spent = playerArr
        .map(p => ({
          name: p.name,
          totalSpent: Math.round(p.totalSpent),
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      this._leaderboardCache = { pnl, spent };
      this._leaderboardLastUpdate = now;
    }
    return this._leaderboardCache;
  }

  // Chat history management
  addChatMessage(msg) {
    this.chatHistory.push(msg);
    if (this.chatHistory.length > 100) {
      this.chatHistory = this.chatHistory.slice(-100);
    }
  }

  getChatHistory(count = 50) {
    return this.chatHistory.slice(-count);
  }

  // ========== Player Management ==========
  addPlayer(player) {
    player.resetSession(); // Reset session counters on field join
    this.players.set(player.id, player);
  }

  removePlayer(socketId) {
    // Collect pickaxe IDs first to avoid deleting during iteration
    const pickaxesToRemove = [];
    for (const [id, pickaxe] of this.pickaxes) {
      if (pickaxe.ownerId === socketId) {
        pickaxesToRemove.push(id);
      }
    }
    for (const id of pickaxesToRemove) {
      const p = this.pickaxes.get(id);
      if (p && p.ownerId === '__system__') this._systemPickaxeCount--;
      this.pickaxes.delete(id);
    }

    // Also clean up TNTs owned by this player
    const tntsToRemove = [];
    for (const [id, tnt] of this.tnts) {
      if (tnt.ownerId === socketId) {
        tntsToRemove.push(id);
      }
    }
    for (const id of tntsToRemove) {
      this.tnts.delete(id);
    }

    this.players.delete(socketId);
  }
}

module.exports = GameEngine;
