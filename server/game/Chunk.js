const Block = require('./Block');
const { BLOCK_TYPES, GAME, JACKPOT_CONFIG } = require('./constants');

// Rare block types that trigger spawn alerts (top tier only)
// diamond=1%, jackpot=conditional — highest rarity only
const RARE_ALERT_TYPES = new Set(['diamond_block', 'jackpot']);

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
  _trySpawnJackpot() {
    if (!this.gameEngine) return false;

    // Only one jackpot block can exist at a time
    if (this.gameEngine.jackpotBlockExists) return false;

    // Minimum players required for jackpot spawn
    if (this.gameEngine.players.size < JACKPOT_CONFIG.MIN_PLAYERS) return false;

    // Check if enough credits have been spent since last jackpot
    const creditsSinceLastJackpot = this.gameEngine.creditsSinceLastJackpot || 0;
    if (creditsSinceLastJackpot < JACKPOT_CONFIG.SPAWN_THRESHOLD) return false;

    // Roll 0.05% chance per eligible block position
    return Math.random() < JACKPOT_CONFIG.SPAWN_CHANCE;
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
