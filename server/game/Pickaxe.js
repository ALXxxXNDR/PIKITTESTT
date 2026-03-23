const { PICKAXE_TYPES, GAME } = require('./constants');

let pickaxeIdCounter = 0;

class Pickaxe {
  constructor(type, ownerId, ownerName) {
    this.id = ++pickaxeIdCounter;
    this.type = type;
    this.ownerId = ownerId;
    this.ownerName = ownerName;

    const def = PICKAXE_TYPES[type];
    this.damage = def.damage;
    this.color = def.color;
    this.texture = def.texture;
    this.name = def.name;
    this.price = def.price;
    this.scale = def.scale || 1.7;

    // Per-type physics multipliers
    this.gravityMult = def.gravityMult || 1.0;
    this.speedMult = def.speedMult || 1.0;

    // Physics - size scales with pickaxe tier
    this.width = GAME.BLOCK_SIZE * this.scale;
    this.height = GAME.BLOCK_SIZE * this.scale;

    // Random X position (inside thin walls)
    const minX = GAME.WALL_THICKNESS;
    const maxX = GAME.WALL_THICKNESS + GAME.BLOCK_SIZE * GAME.CHUNK_WIDTH - this.width;
    this.x = minX + Math.random() * (maxX - minX);
    this.y = 0; // Set later by GameEngine

    // Velocity - initial kick scaled by speedMult
    this.vx = (Math.random() - 0.5) * 300 * this.speedMult;
    this.vy = (50 + Math.random() * 100) * this.speedMult;

    // Rotation
    this.rotation = Math.random() * Math.PI * 2;
    this.angularVelocity = (Math.random() - 0.5) * 8;

    // Game-feel physics constants (tunable, scaled by type)
    this.restitution = 0.75;
    this.friction = 0.15;
    this.airResistance = 0.995;
    this.bounceEnergy = 200 * this.speedMult; // Swift bounces harder

    // Lifetime (per-type)
    this.createdAt = Date.now();
    this.lifetime = def.lifetime || 30000;
    this.expired = false;

    // Stats
    this.totalReward = 0;
    this.blocksDestroyed = 0;
  }

  update(dt) {
    // Apply gravity (scaled by gravityMult — Light pickaxe floats)
    this.vy += GAME.GRAVITY * this.gravityMult * dt;
    const terminalVelocity = GAME.TERMINAL_VELOCITY * (this.gravityMult < 1 ? 0.7 : 1);
    if (this.vy > terminalVelocity) {
      this.vy = terminalVelocity;
    }

    // Apply velocity
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Gentle air resistance on horizontal (keeps momentum longer)
    this.vx *= this.airResistance;

    // Rotation follows movement naturally
    this.angularVelocity *= 0.995;
    this.rotation += this.angularVelocity * dt;

    // Wall bouncing with energy preservation (thin walls)
    const wallLeft = GAME.WALL_THICKNESS;
    const wallRight = GAME.WALL_THICKNESS + GAME.BLOCK_SIZE * GAME.CHUNK_WIDTH - this.width;

    if (this.x < wallLeft) {
      this.x = wallLeft;
      this.vx = Math.abs(this.vx) * this.restitution + this.bounceEnergy * 0.3;
      this.vy -= 50 + Math.random() * 80;
      this.angularVelocity += 5;
    } else if (this.x > wallRight) {
      this.x = wallRight;
      this.vx = -(Math.abs(this.vx) * this.restitution + this.bounceEnergy * 0.3);
      this.vy -= 50 + Math.random() * 80;
      this.angularVelocity -= 5;
    }

    // Check lifetime (Infinity = never expires, e.g. system pickaxe)
    if (this.lifetime !== Infinity && Date.now() - this.createdAt > this.lifetime) {
      this.expired = true;
    }
  }

  // Pickaxe-shaped collision using rotated sample points
  // The pickaxe shape is defined as: head (horizontal bar at top) + handle (vertical bar)
  collidesWith(block) {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);

    // Define pickaxe shape points (relative to center, normalized -1 to 1)
    // Head: horizontal bar across the top ~30% of the sprite
    // Handle: vertical bar down the center ~60% of the sprite
    const shapePoints = [
      // Head (top horizontal bar)
      { x: -0.45, y: -0.45 }, { x: -0.25, y: -0.45 },
      { x: 0.0, y: -0.45 },   { x: 0.25, y: -0.45 }, { x: 0.45, y: -0.45 },
      { x: -0.45, y: -0.3 },  { x: 0.45, y: -0.3 },
      // Handle (center vertical bar)
      { x: 0.0, y: -0.15 }, { x: 0.0, y: 0.0 },
      { x: 0.0, y: 0.15 },  { x: 0.0, y: 0.3 }, { x: 0.0, y: 0.45 },
      // Head-handle junction
      { x: -0.15, y: -0.3 }, { x: 0.15, y: -0.3 },
    ];

    for (const pt of shapePoints) {
      // Scale to actual size
      const lx = pt.x * halfW;
      const ly = pt.y * halfH;
      // Rotate around center
      const wx = cx + lx * cos - ly * sin;
      const wy = cy + lx * sin + ly * cos;
      // Check if this point is inside the block
      if (wx >= block.x && wx <= block.x + block.width &&
          wy >= block.y && wy <= block.y + block.height) {
        return true;
      }
    }
    return false;
  }

  // Game-feel bounce: energetic, multi-directional, fun
  bounceOff(block) {
    const pickCenterX = this.x + this.width / 2;
    const pickCenterY = this.y + this.height / 2;
    const blockCenterX = block.x + block.width / 2;
    const blockCenterY = block.y + block.height / 2;

    // Collision side detection
    const overlapLeft = (this.x + this.width) - block.x;
    const overlapRight = (block.x + block.width) - this.x;
    const overlapTop = (this.y + this.height) - block.y;
    const overlapBottom = (block.y + block.height) - this.y;
    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);

    // Where on the block surface did we hit? (-1 to 1)
    const offsetX = (pickCenterX - blockCenterX) / (block.width / 2);
    const offsetY = (pickCenterY - blockCenterY) / (block.height / 2);

    // Current speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const minBounceSpeed = 150 * this.speedMult;

    if (minOverlapY < minOverlapX) {
      // --- Vertical collision ---
      if (pickCenterY < blockCenterY) {
        // HIT FROM ABOVE (falling onto block)
        this.y = block.y - this.height;

        const bounceVy = Math.max(Math.abs(this.vy) * this.restitution, minBounceSpeed);
        this.vy = -bounceVy;

        const deflectStrength = this.bounceEnergy * (0.5 + Math.abs(offsetX) * 1.5);
        this.vx += offsetX * deflectStrength;
        this.vx += (Math.random() - 0.5) * this.bounceEnergy * 0.4;

      } else {
        // HIT FROM BELOW
        this.y = block.y + block.height;
        this.vy = Math.abs(this.vy) * this.restitution * 0.6;
        this.vx += offsetX * this.bounceEnergy * 0.8;
        this.vx += (Math.random() - 0.5) * this.bounceEnergy * 0.3;
      }
    } else {
      // --- Horizontal collision (side of block) ---
      if (pickCenterX < blockCenterX) {
        this.x = block.x - this.width;
        const bounceVx = Math.max(Math.abs(this.vx) * this.restitution, minBounceSpeed * 0.8);
        this.vx = -bounceVx;
      } else {
        this.x = block.x + block.width;
        const bounceVx = Math.max(Math.abs(this.vx) * this.restitution, minBounceSpeed * 0.8);
        this.vx = bounceVx;
      }

      this.vy -= this.bounceEnergy * (0.3 + Math.random() * 0.5);
      this.vy += offsetY * this.bounceEnergy * 0.3;
    }

    // Spin from impact
    this.angularVelocity += offsetX * 6 + (Math.random() - 0.5) * 4;

    // Clamp velocities
    const maxVx = GAME.TERMINAL_VELOCITY * 1.2 * this.speedMult;
    this.vx = Math.max(-maxVx, Math.min(maxVx, this.vx));
    const maxVyUp = -GAME.TERMINAL_VELOCITY * 0.8;
    if (this.vy < maxVyUp) this.vy = maxVyUp;

    // Wall bounds (thin walls)
    const wallLeft = GAME.WALL_THICKNESS;
    const wallRight = GAME.WALL_THICKNESS + GAME.BLOCK_SIZE * GAME.CHUNK_WIDTH - this.width;
    this.x = Math.max(wallLeft, Math.min(wallRight, this.x));
  }

  addReward(amount) {
    this.totalReward += amount;
    this.blocksDestroyed++;
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      ownerId: this.ownerId,
      ownerName: this.ownerName,
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      width: this.width,
      height: this.height,
      scale: this.scale,
      texture: this.texture,
      color: this.color,
      totalReward: this.totalReward,
      blocksDestroyed: this.blocksDestroyed,
      timeLeft: this.lifetime === Infinity ? -1 : Math.max(0, this.lifetime - (Date.now() - this.createdAt)),
      lifetime: this.lifetime === Infinity ? -1 : this.lifetime,
      expired: this.expired,
    };
  }
}

module.exports = Pickaxe;
