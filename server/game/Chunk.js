const Block = require('./Block');
const { BLOCK_TYPES, GAME, JACKPOT_CONFIG, JACKPOT_POOL_CONFIG } = require('./constants');

// Rare block types that trigger spawn alerts (top tier only)
// diamond=3.85%, netherite=4.62%, jackpot=conditional
const RARE_ALERT_TYPES = new Set(['diamond_block', 'netherite_block', 'jackpot']);

// Cache block pool + totalWeight (same every time, no need to rebuild per chunk)
let _cachedBlockPool = null;
let _cachedTotalWeight = 0;

class Chunk {
  constructor(chunkIndex, gameEngine) {
    this.chunkIndex = chunkIndex;
    this.gameEngine = gameEngine; // Reference for jackpot state
    this.blocks = [];
    this.generate();
  }

  generate() {
    const startY = this.chunkIndex * GAME.CHUNK_HEIGHT;

    // Use cached block pool
    const blockPool = this._getBlockPool();

    for (let gy = 0; gy < GAME.CHUNK_HEIGHT; gy++) {
      for (let gx = 0; gx < GAME.CHUNK_WIDTH; gx++) {
        const worldY = startY + gy;

        // First chunk top: dirt layer
        if (this.chunkIndex === 0 && gy < 3) {
          this.blocks.push(new Block('dirt', gx, worldY));
          continue;
        }

        // Jackpot block check: conditional spawn
        if (this._trySpawnJackpot()) {
          this.blocks.push(new Block('jackpot', gx, worldY));
          // Notify engine that jackpot spawned (state tracking + spawn alert)
          if (this.gameEngine) {
            this.gameEngine._onJackpotBlockSpawned();
            this.gameEngine._onRareBlockSpawned('jackpot', BLOCK_TYPES['jackpot']);
          }
          continue;
        }

        // Normal block selection
        const type = this._pickRandomBlock(blockPool);
        this.blocks.push(new Block(type, gx, worldY));

        // Rare block spawn alert (diamond only)
        if (RARE_ALERT_TYPES.has(type) && this.gameEngine) {
          this.gameEngine._onRareBlockSpawned(type, BLOCK_TYPES[type]);
        }
      }
    }
  }

  _getBlockPool() {
    if (!_cachedBlockPool) {
      _cachedBlockPool = [];
      _cachedTotalWeight = 0;
      for (const [type, def] of Object.entries(BLOCK_TYPES)) {
        if (def.weight > 0) {
          _cachedBlockPool.push({ type, weight: def.weight });
          _cachedTotalWeight += def.weight;
        }
      }
    }
    return _cachedBlockPool;
  }

  _pickRandomBlock(pool) {
    let rand = Math.random() * _cachedTotalWeight;
    for (const entry of pool) {
      rand -= entry.weight;
      if (rand <= 0) return entry.type;
    }
    return 'stone';
  }

  // Try to spawn a Jackpot block (conditional, only 1 at a time)
  // v4.8: pool-based spawn condition — jackpotPool must reach MIN_POOL_TO_SPAWN
  _trySpawnJackpot() {
    if (!this.gameEngine) return false;

    // Only one jackpot block can exist at a time
    if (this.gameEngine.jackpotBlockExists) return false;

    // Pool must be large enough to warrant a jackpot block
    const pool = this.gameEngine.jackpotPool || 0;
    if (pool < JACKPOT_POOL_CONFIG.MIN_POOL_TO_SPAWN) return false;

    // Use standard spawn chance or re-spawn chance depending on history
    const chance = this.gameEngine._jackpotNeedsRespawn
      ? JACKPOT_CONFIG.RESPAWN_CHANCE   // 0.001% — rare re-spawn after escape
      : JACKPOT_CONFIG.SPAWN_CHANCE;    // 0.01%  — standard first spawn

    return Math.random() < chance;
  }

  // Find alive block at position
  getBlockAt(gx, gy) {
    return this.blocks.find(b => b.gridX === gx && b.gridY === gy && !b.destroyed);
  }

  // Serialize
  serialize() {
    return this.blocks
      .filter(b => !b.destroyed)
      .map(b => b.serialize());
  }
}

module.exports = Chunk;
