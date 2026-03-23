const Chunk = require('./Chunk');
const Pickaxe = require('./Pickaxe');
const TNT = require('./TNT');
const { GAME, PICKAXE_TYPES, TNT_TYPES, COMBO, BLOCK_TYPES, JACKPOT_CONFIG, JACKPOT_POOL_CONFIG } = require('./constants');

// Target number of system pickaxes to keep active at all times (anchor)
const SYSTEM_PICKAXE_TARGET = 1;
const MAX_PICKAXES_PER_PLAYER = 3;

// Adaptive system pickaxe scaling thresholds (v4.8)
// Sorted descending by minPicks — first matching entry wins
const DYNAMIC_SYSTEM_RATIO_THRESHOLDS = [
  { minPicks: 46, sysCnt: 4 },  // v4.8 sim-verified
  { minPicks: 21, sysCnt: 3 },
  { minPicks: 11, sysCnt: 2 },
  { minPicks: 4,  sysCnt: 1 },
  { minPicks: 0,  sysCnt: 0 },  // solo (≤3 player picks): anchor only (weak mode)
];
const WEAK_MODE_THRESHOLD = 3;   // player pickaxe count ≤ this → anchor enters weak mode
const MAX_SYSTEM_PICKAXES = 4;   // anchor (1) + dynamic (3) max

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
    this._leaderboardCache = [];
    this._leaderboardLastUpdate = 0;

    // System pickaxe counter (avoid iterating all pickaxes every tick)
    this._systemPickaxeCount = 0;

    // Adaptive system pickaxe tracking (v4.8)
    this._anchorPickaxeId = null;      // ID of the permanent anchor pickaxe
    this._dynamicSysCount = 0;         // Count of temporary dynamic system pickaxes

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

    // Spawn the anchor system pickaxe (Infinity lifetime, always present)
    this._systemPickaxeCount = 0;
    this._spawnAnchorPickaxe();
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

  // Rare block spawn alert (diamond, gold, emerald)
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

    // Adaptive system pickaxe management (v4.8)
    if (now - this.lastSystemPickaxe > this.systemPickaxeInterval) {
      const playerPickaxeCount = this.pickaxes.size - this._systemPickaxeCount;

      // Anchor recovery — normally never expires (Infinity lifetime) but defend anyway
      if (!this.pickaxes.has(this._anchorPickaxeId)) {
        this._anchorPickaxeId = null;
        this._systemPickaxeCount = Math.max(0, this._systemPickaxeCount - 1);
        this._spawnAnchorPickaxe();
        this.lastSystemPickaxe = now;
        return;
      }

      // Switch anchor between weak and active mode based on player activity
      const anchorPickaxe = this.pickaxes.get(this._anchorPickaxeId);
      if (anchorPickaxe) {
        const shouldBeWeak = playerPickaxeCount <= WEAK_MODE_THRESHOLD;
        if (shouldBeWeak && anchorPickaxe.type !== 'system_weak') {
          const weakDef = PICKAXE_TYPES['system_weak'];
          anchorPickaxe.type = 'system_weak';
          anchorPickaxe.color = weakDef.color;
          anchorPickaxe.speedMult = weakDef.speedMult;
          anchorPickaxe.scale = weakDef.scale;
          anchorPickaxe.gravityMult = weakDef.gravityMult;
          anchorPickaxe.width = GAME.BLOCK_SIZE * weakDef.scale;
          anchorPickaxe.height = GAME.BLOCK_SIZE * weakDef.scale;
          anchorPickaxe.bounceEnergy = 200 * weakDef.speedMult;
        } else if (!shouldBeWeak && anchorPickaxe.type === 'system_weak') {
          const fullDef = PICKAXE_TYPES['system'];
          anchorPickaxe.type = 'system';
          anchorPickaxe.color = fullDef.color;
          anchorPickaxe.speedMult = fullDef.speedMult;
          anchorPickaxe.scale = fullDef.scale;
          anchorPickaxe.gravityMult = fullDef.gravityMult;
          anchorPickaxe.width = GAME.BLOCK_SIZE * fullDef.scale;
          anchorPickaxe.height = GAME.BLOCK_SIZE * fullDef.scale;
          anchorPickaxe.bounceEnergy = 200 * fullDef.speedMult;
        }
      }

      // Calculate dynamic system pickaxe target (excluding anchor)
      let dynamicTarget = 0;
      for (const t of DYNAMIC_SYSTEM_RATIO_THRESHOLDS) {
        if (playerPickaxeCount >= t.minPicks) {
          dynamicTarget = t.sysCnt;
          break;
        }
      }
      dynamicTarget = Math.min(dynamicTarget, MAX_SYSTEM_PICKAXES - 1); // reserve 1 slot for anchor

      if (this._dynamicSysCount < dynamicTarget) {
        this._spawnDynamicSystemPickaxe('system');
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
            // Block destroyed - give reward (skip for system pickaxes)
            const isSystem = pickaxe.ownerId === '__system__';
            const player = isSystem ? null : this.players.get(pickaxe.ownerId);
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

              // Combo calculation (non-jackpot blocks)
              const comboMult = this._getComboMultiplier(pickaxe, now);
              const finalReward = Math.round(reward * comboMult * this.rewardMultiplier);

              player.earn(finalReward, block.name);
              player.trackBlockDestroyed(block.type); // Quest tracking
              pickaxe.addReward(finalReward);

              // High-value block notification (reward >= 1000)
              if (reward >= 1000) {
                this.jackpots.push({
                  playerName: pickaxe.ownerName,
                  blockName: block.name,
                  reward: finalReward,
                  time: now,
                });

                // Rare block cinematic (diamond_block or gold_block)
                if (block.type === 'diamond_block' || block.type === 'gold_block') {
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

    // Damage blocks in surrounding chunks
    for (let ci = chunkIndex - 2; ci <= chunkIndex + 2; ci++) {
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

  // ========== Combo System ==========
  _getComboMultiplier(pickaxe, now) {
    if (now - pickaxe.lastHitTime < COMBO.TIMEOUT) {
      pickaxe.combo++;
    } else {
      pickaxe.combo = 1;
    }
    pickaxe.lastHitTime = now;

    // Determine combo stage
    let mult = COMBO.MULTIPLIERS[0];
    for (let i = COMBO.THRESHOLDS.length - 1; i >= 0; i--) {
      if (pickaxe.combo >= COMBO.THRESHOLDS[i]) {
        mult = COMBO.MULTIPLIERS[i];
        break;
      }
    }
    return mult;
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
    // System pickaxe: update counters, no reward processing
    if (pickaxe.ownerId === '__system__') {
      this._systemPickaxeCount--;
      if (pickaxe.id !== this._anchorPickaxeId) {
        // Dynamic pickaxe expired normally
        this._dynamicSysCount = Math.max(0, this._dynamicSysCount - 1);
      } else {
        // Anchor expired — abnormal, clear anchor ID (tick loop will re-spawn)
        this._anchorPickaxeId = null;
      }
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

  // Spawn the permanent anchor system pickaxe (Infinity lifetime)
  _spawnAnchorPickaxe() {
    const pickaxe = new Pickaxe('system', '__system__', 'PIKIT');
    pickaxe.y = this.cameraY - GAME.INTERNAL_HEIGHT / 2;
    pickaxe.x = this._findEmptySpawnX(pickaxe.y);
    this.pickaxes.set(pickaxe.id, pickaxe);
    this._anchorPickaxeId = pickaxe.id;
    this._systemPickaxeCount++;
  }

  // Spawn a temporary dynamic system pickaxe (60s lifetime)
  // mode: 'system' (full strength) or 'system_weak' (reduced activity)
  _spawnDynamicSystemPickaxe(mode = 'system') {
    const pickaxe = new Pickaxe(mode, '__system__', 'PIKIT');
    pickaxe.y = this.cameraY - GAME.INTERNAL_HEIGHT / 2;
    pickaxe.x = this._findEmptySpawnX(pickaxe.y);
    this.pickaxes.set(pickaxe.id, pickaxe);
    this._systemPickaxeCount++;
    this._dynamicSysCount++;
  }

  // Legacy method kept for safety (no longer called, replaced by _spawnAnchorPickaxe)
  _spawnSystemPickaxe() {
    this._spawnAnchorPickaxe();
  }

  // ========== Item Purchase ==========
  buyPickaxe(player, type) {
    const def = PICKAXE_TYPES[type];
    if (!def) return { error: 'Invalid pickaxe type' };
    if (type === 'system' || type === 'system_weak') return { error: 'Invalid pickaxe type' };

    // Max 3 pickaxes per player per field
    const activeCount = Array.from(this.pickaxes.values())
      .filter(p => p.ownerId === player.id && !p.expired).length;
    if (activeCount >= MAX_PICKAXES_PER_PLAYER) return { error: 'Max 3 pickaxes per field! Wait for one to expire.' };

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

    // Random position, spawned above camera (inside thin walls)
    const minX = GAME.WALL_THICKNESS;
    const maxX = GAME.WALL_THICKNESS + GAME.BLOCK_SIZE * GAME.CHUNK_WIDTH - GAME.BLOCK_SIZE;
    const x = minX + Math.random() * (maxX - minX);
    const y = this.cameraY - GAME.INTERNAL_HEIGHT / 2;

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
      this._leaderboardCache = Array.from(this.players.values())
        .map(p => ({
          name: p.name,
          profit: Math.round(p.totalEarned - p.totalSpent),
          earned: Math.round(p.totalEarned),
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10);
      this._leaderboardLastUpdate = now;
    }
    return this._leaderboardCache;
  }

  // ========== Player Management ==========
  addPlayer(player) {
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
