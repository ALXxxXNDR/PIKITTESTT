const { BLOCK_TYPES, GAME } = require('./constants');

let blockIdCounter = 0;

class Block {
  constructor(type, gridX, gridY) {
    this.id = ++blockIdCounter;
    this.type = type;
    const def = BLOCK_TYPES[type];
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.baseReward = def.reward;
    this.rewardType = def.rewardType || 'fixed';
    this.color = def.color;
    this.texture = def.texture;
    this.name = def.name;
    this.tntResist = def.tntResist || false;

    // Grid coordinates
    this.gridX = gridX;
    this.gridY = gridY;

    // Pixel coordinates (offset by wall thickness)
    this.x = GAME.WALL_THICKNESS + gridX * GAME.BLOCK_SIZE;
    this.y = gridY * GAME.BLOCK_SIZE;
    this.width = GAME.BLOCK_SIZE;
    this.height = GAME.BLOCK_SIZE;

    this.destroyed = false;
    this.lastHitTime = 0;
  }

  // Compute reward (random or fixed)
  getReward() {
    if (this.rewardType === 'random') {
      return Math.floor(Math.random() * 5) + 1; // 1~5
    }
    return this.baseReward;
  }

  // Apply damage - returns reward on destruction, null otherwise
  takeDamage(damage, currentTime) {
    if (this.destroyed || this.type === 'bedrock') return null;

    this.hp -= damage;
    this.lastHitTime = currentTime;

    if (this.hp <= 0) {
      this.hp = 0;
      this.destroyed = true;
      return this.getReward();
    }
    return null;
  }

  // Destroy stage (0-9) - for client rendering
  getDestroyStage() {
    if (this.destroyed) return 9;
    const ratio = 1 - (this.hp / this.maxHp);
    return Math.min(9, Math.floor(ratio * 10));
  }

  // Serialize (for client transmission)
  serialize() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      reward: this.baseReward,
      rewardType: this.rewardType,
      color: this.color,
      x: this.x,
      y: this.y,
      hp: this.hp,
      maxHp: this.maxHp,
      stage: this.getDestroyStage(),
      destroyed: this.destroyed,
    };
  }
}

module.exports = Block;
