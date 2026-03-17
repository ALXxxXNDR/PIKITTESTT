// ============================================
// Camera System
// Modify: Camera tracking speed, shake intensity
// ============================================

const Camera = {
  x: 0,
  y: 0,
  targetY: 0,
  shakeX: 0,
  shakeY: 0,
  shakeIntensity: 0,
  shakeDuration: 0,
  shakeTime: 0,
  smoothing: 0.08,

  update(dt) {
    // Smooth Y tracking (frame-rate independent)
    const factor = 1 - Math.pow(1 - this.smoothing, dt * 60);
    this.y += (this.targetY - this.y) * factor;

    // Shake decay
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const progress = this.shakeTime / this.shakeDuration;
      const intensity = this.shakeIntensity * progress;
      this.shakeX = (Math.random() - 0.5) * intensity * 2;
      this.shakeY = (Math.random() - 0.5) * intensity * 2;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  },

  shake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTime = duration;
  },

  // World coordinates -> Screen coordinates
  worldToScreen(worldX, worldY, canvasHeight) {
    return {
      x: worldX + this.shakeX,
      y: worldY - this.y + canvasHeight * 0.35 + this.shakeY,
    };
  },
};
