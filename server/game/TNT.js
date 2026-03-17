const { TNT_TYPES, GAME } = require('./constants');

let tntIdCounter = 0;

class TNT {
  constructor(type, ownerId, ownerName, x, y) {
    this.id = ++tntIdCounter;
    this.type = type;
    this.ownerId = ownerId;
    this.ownerName = ownerName;

    const def = TNT_TYPES[type];
    this.damage = def.damage;
    this.radiusX = def.radiusX;       // Horizontal radius in blocks
    this.radiusDown = def.radiusDown; // Downward radius in blocks
    this.texture = def.texture;
    this.name = def.name;
    this.price = def.price;

    // Position & physics
    this.width = GAME.BLOCK_SIZE;
    this.height = GAME.BLOCK_SIZE;
    this.x = x;
    this.y = y;
    this.vy = 0;

    // State
    this.landed = false;   // Has touched a block
    this.exploded = false;
    this.removed = false;

    // Animation
    this.pulsePhase = 0;
    this.createdAt = Date.now();
  }

  update(dt) {
    if (this.exploded) return;

    // If landed on block, explode immediately
    if (this.landed) {
      this.exploded = true;
      return;
    }

    // Gravity - keep falling until block contact
    this.vy += GAME.GRAVITY * dt;
    if (this.vy > GAME.TERMINAL_VELOCITY) {
      this.vy = GAME.TERMINAL_VELOCITY;
    }
    this.y += this.vy * dt;

    // Pulse animation
    this.pulsePhase += dt * 8;

    // Wall bounds (thin walls)
    const minX = GAME.WALL_THICKNESS;
    const maxX = GAME.WALL_THICKNESS + GAME.BLOCK_SIZE * GAME.CHUNK_WIDTH - this.width;
    this.x = Math.max(minX, Math.min(maxX, this.x));
  }

  // Stop on block collision - triggers immediate explosion
  collidesWith(block) {
    return (
      this.x < block.x + block.width &&
      this.x + this.width > block.x &&
      this.y < block.y + block.height &&
      this.y + this.height > block.y
    );
  }

  stopOn(block) {
    this.y = block.y - this.height;
    this.vy = 0;
    this.landed = true; // This will trigger explosion on next update
  }

  // Check if block is in explosion range
  // Rectangular area: ±radiusX blocks horizontally, radiusX up + radiusDown blocks down
  isInExplosionRange(block) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const blockCenterX = block.x + block.width / 2;
    const blockCenterY = block.y + block.height / 2;

    const dx = Math.abs(centerX - blockCenterX);
    const dy = blockCenterY - centerY; // Positive = below TNT

    const maxDx = this.radiusX * GAME.BLOCK_SIZE;
    // Asymmetric: radiusX blocks up, radiusDown blocks down
    const maxDyUp = this.radiusX * GAME.BLOCK_SIZE;
    const maxDyDown = this.radiusDown * GAME.BLOCK_SIZE;

    if (dx > maxDx) return false;
    if (dy > 0 && dy > maxDyDown) return false;  // Below TNT
    if (dy < 0 && Math.abs(dy) > maxDyUp) return false; // Above TNT

    return true;
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      ownerId: this.ownerId,
      ownerName: this.ownerName,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      texture: this.texture,
      pulsePhase: this.pulsePhase,
      landed: this.landed,
      exploded: this.exploded,
    };
  }
}

module.exports = TNT;
