// ============================================
// Canvas Rendering Engine — 8-bit Retro Pixel Art Style
// All blocks and pickaxes drawn procedurally
// ============================================

const Renderer = {
  canvas: null,
  ctx: null,
  textures: {},
  textureLoadPromises: [],
  ready: false,
  myPlayerId: null,
  pixelBlockCache: {},   // Pre-rendered block canvases
  pixelPickaxeCache: {}, // Pre-rendered pickaxe canvases

  // Rare block cinematic effect state
  rareBlockEffects: [],
  jackpotBlockActive: false,

  // Field theme ('normal' or 'hardcore')
  fieldTheme: 'normal',

  // Block hover tooltip state
  _hoverBlock: null,     // { name, reward, rewardType, screenX, screenY }
  _hoverMouseX: 0,
  _hoverMouseY: 0,

  // Cached background gradient
  _bgGradient: null,

  // 8-bit pixel font
  _pixelFont: '"Press Start 2P", "Courier New", monospace',

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = 1080;
    this.canvas.height = 1920;
    this.ctx.imageSmoothingEnabled = false;

    this._generatePixelBlocks();
    this._generatePixelPickaxes();
    this._generateDestroyStages();
    this.ready = true;
    console.log('[Renderer] 8-bit pixel art initialized');
  },

  setFieldTheme(fieldId) {
    this.fieldTheme = fieldId || 'normal';
    this._bgGradient = null; // Force re-create gradient
    console.log('[Renderer] Theme set:', this.fieldTheme);
  },

  // ========== 8-BIT BLOCK GENERATION ==========
  _generatePixelBlocks() {
    const S = 120; // block size
    const P = 8;   // pixel size (120/8 = 15 "pixels" per block... let's use 10px = 12 pixels)
    const G = 10;  // grid size per block

    // Block designs: 12x12 pixel grids with color indices
    const blockDesigns = {
      stone: {
        base: '#7a7a7a', light: '#919191', dark: '#5c5c5c', accent: '#686868',
        pattern: 'stone'
      },
      dirt: {
        base: '#8B5E3C', light: '#a07048', dark: '#6b4526', accent: '#9a6840',
        pattern: 'dirt'
      },
      gravel: {
        base: '#6e6e6e', light: '#888888', dark: '#505050', accent: '#7a7a7a',
        pattern: 'gravel'
      },
      clay: {
        base: '#9a8875', light: '#b09e8a', dark: '#7a6a58', accent: '#8f8068',
        pattern: 'clay'
      },
      copper_block: {
        base: '#B87333', light: '#d4944a', dark: '#8a5522', accent: '#c98040',
        pattern: 'ore', oreColor: '#e8a050', oreGlow: '#f0c070'
      },
      iron_block: {
        base: '#7a7a7a', light: '#919191', dark: '#5c5c5c', accent: '#686868',
        pattern: 'ore', oreColor: '#d4b89a', oreGlow: '#eedcc8'
      },
      emerald_block: {
        base: '#7a7a7a', light: '#919191', dark: '#5c5c5c', accent: '#686868',
        pattern: 'ore', oreColor: '#2ecc71', oreGlow: '#55efc4'
      },
      gold_block: {
        base: '#7a7a7a', light: '#919191', dark: '#5c5c5c', accent: '#686868',
        pattern: 'ore', oreColor: '#f1c40f', oreGlow: '#f9e547'
      },
      diamond_block: {
        base: '#7a7a7a', light: '#919191', dark: '#5c5c5c', accent: '#686868',
        pattern: 'ore', oreColor: '#00CED1', oreGlow: '#7fffd4'
      },
      netherite_block: {
        base: '#4A3728', light: '#6B5344', dark: '#2D2018', accent: '#C8A882',
        pattern: 'netherite',
      },
      bedrock: {
        base: '#2a2a2a', light: '#3d3d3d', dark: '#1a1a1a', accent: '#333333',
        pattern: 'bedrock'
      },
    };

    for (const [type, design] of Object.entries(blockDesigns)) {
      this.pixelBlockCache[type] = this._renderPixelBlock(S, G, design);
    }

    // Jackpot block — simple gradient for block guide icon
    const jpCanvas = document.createElement('canvas');
    jpCanvas.width = S; jpCanvas.height = S;
    const jpCtx = jpCanvas.getContext('2d');
    const jpGrad = jpCtx.createLinearGradient(0, 0, S, S);
    jpGrad.addColorStop(0, '#FF00FF');
    jpGrad.addColorStop(0.5, '#FFD700');
    jpGrad.addColorStop(1, '#00FFFF');
    jpCtx.fillStyle = jpGrad;
    jpCtx.fillRect(0, 0, S, S);
    jpCtx.fillStyle = 'rgba(255,255,255,0.2)';
    jpCtx.fillRect(0, 0, S, S / G);
    jpCtx.fillRect(0, 0, S / G, S);
    jpCtx.fillStyle = 'rgba(0,0,0,0.25)';
    jpCtx.fillRect(0, S - S / G, S, S / G);
    jpCtx.fillRect(S - S / G, 0, S / G, S);
    this.pixelBlockCache['jackpot'] = jpCanvas;
  },

  _renderPixelBlock(size, grid, design) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const px = size / grid;

    // Fill base
    ctx.fillStyle = design.base;
    ctx.fillRect(0, 0, size, size);

    // Pattern-specific drawing
    switch (design.pattern) {
      case 'stone':
        this._drawStonePattern(ctx, grid, px, design);
        break;
      case 'dirt':
        this._drawDirtPattern(ctx, grid, px, design);
        break;
      case 'gravel':
        this._drawGravelPattern(ctx, grid, px, design);
        break;
      case 'clay':
        this._drawClayPattern(ctx, grid, px, design);
        break;
      case 'ore':
        this._drawStonePattern(ctx, grid, px, { ...design, base: design.base, light: design.light, dark: design.dark });
        this._drawOrePattern(ctx, grid, px, design);
        break;
      case 'netherite':
        this._drawNetheritePattern(ctx, grid, px, design);
        break;
      case 'bedrock':
        this._drawBedrockPattern(ctx, grid, px, design);
        break;
    }

    // 8-bit border (3D bevel effect)
    // Top + Left = lighter
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(0, 0, size, px);          // top edge
    ctx.fillRect(0, 0, px, size);          // left edge
    // Bottom + Right = darker
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, size - px, size, px);  // bottom edge
    ctx.fillRect(size - px, 0, px, size);  // right edge

    return canvas;
  },

  _drawStonePattern(ctx, grid, px, design) {
    // Random-ish cracks and texture
    const seed = this._hashStr(design.base);
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const r = this._pseudoRandom(x * 7 + y * 13 + seed);
        if (r < 0.15) {
          ctx.fillStyle = design.dark;
          ctx.fillRect(x * px, y * px, px, px);
        } else if (r < 0.3) {
          ctx.fillStyle = design.light;
          ctx.fillRect(x * px, y * px, px, px);
        }
      }
    }
    // Horizontal crack lines
    ctx.fillStyle = design.dark;
    ctx.fillRect(1 * px, 3 * px, 4 * px, px);
    ctx.fillRect(6 * px, 7 * px, 3 * px, px);
  },

  _drawDirtPattern(ctx, grid, px, design) {
    const seed = 42;
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const r = this._pseudoRandom(x * 11 + y * 17 + seed);
        if (r < 0.2) {
          ctx.fillStyle = design.dark;
          ctx.fillRect(x * px, y * px, px, px);
        } else if (r < 0.35) {
          ctx.fillStyle = design.light;
          ctx.fillRect(x * px, y * px, px, px);
        }
      }
    }
    // Small pebbles
    ctx.fillStyle = design.accent;
    ctx.fillRect(2 * px, 2 * px, px, px);
    ctx.fillRect(7 * px, 5 * px, px, px);
    ctx.fillRect(4 * px, 8 * px, px, px);
  },

  _drawGravelPattern(ctx, grid, px, design) {
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const r = this._pseudoRandom(x * 5 + y * 9 + 99);
        if (r < 0.25) {
          ctx.fillStyle = design.dark;
          ctx.fillRect(x * px, y * px, px, px);
        } else if (r < 0.45) {
          ctx.fillStyle = design.light;
          ctx.fillRect(x * px, y * px, px, px);
        }
      }
    }
  },

  _drawClayPattern(ctx, grid, px, design) {
    // Horizontal stripes
    for (let y = 0; y < grid; y++) {
      if (y % 3 === 0) {
        ctx.fillStyle = design.dark;
        ctx.fillRect(0, y * px, grid * px, px);
      }
      for (let x = 0; x < grid; x++) {
        const r = this._pseudoRandom(x * 3 + y * 7 + 77);
        if (r < 0.12) {
          ctx.fillStyle = design.light;
          ctx.fillRect(x * px, y * px, px, px);
        }
      }
    }
  },

  _drawOrePattern(ctx, grid, px, design) {
    // Ore clusters (2-4 bright pixels in a cluster shape)
    const clusters = [
      [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }],
      [{ x: 7, y: 6 }, { x: 8, y: 6 }, { x: 7, y: 7 }],
      [{ x: 4, y: 7 }, { x: 5, y: 8 }, { x: 5, y: 7 }],
    ];
    for (const cluster of clusters) {
      for (const p of cluster) {
        // Ore pixel
        ctx.fillStyle = design.oreColor;
        ctx.fillRect(p.x * px, p.y * px, px, px);
      }
      // Glow pixel (first in cluster)
      if (cluster[0]) {
        ctx.fillStyle = design.oreGlow;
        ctx.fillRect(cluster[0].x * px, cluster[0].y * px, px, px);
      }
    }
  },

  _drawNetheritePattern(ctx, grid, px, design) {
    // Scattered dark patches
    const seed = 55;
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const r = this._pseudoRandom(x * 9 + y * 11 + seed);
        if (r < 0.2) {
          ctx.fillStyle = design.dark;
          ctx.fillRect(x * px, y * px, px, px);
        } else if (r < 0.35) {
          ctx.fillStyle = design.light;
          ctx.fillRect(x * px, y * px, px, px);
        }
      }
    }
    // Gold accent specks (signature netherite look)
    ctx.fillStyle = design.accent;
    const accentPositions = [
      [2,2], [5,3], [7,6], [3,7], [6,1], [1,5], [8,4], [4,8]
    ];
    for (const [gx, gy] of accentPositions) {
      ctx.fillRect(gx * px, gy * px, px, px);
    }
    // Horizontal vein-like cracks
    ctx.fillStyle = design.dark;
    ctx.fillRect(1 * px, 4 * px, 3 * px, px);
    ctx.fillRect(6 * px, 8 * px, 2 * px, px);
  },

  _drawBedrockPattern(ctx, grid, px, design) {
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const r = this._pseudoRandom(x * 13 + y * 7 + 31);
        if (r < 0.3) {
          ctx.fillStyle = design.light;
          ctx.fillRect(x * px, y * px, px, px);
        } else if (r < 0.5) {
          ctx.fillStyle = design.dark;
          ctx.fillRect(x * px, y * px, px, px);
        }
      }
    }
  },

  // ========== DESTROY STAGE OVERLAYS ==========
  _generateDestroyStages() {
    const S = 120;
    const px = 12; // pixel size
    const grid = S / px;
    for (let stage = 0; stage < 10; stage++) {
      const canvas = document.createElement('canvas');
      canvas.width = S;
      canvas.height = S;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      const crackDensity = (stage + 1) / 10;
      ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + crackDensity * 0.4})`;

      for (let y = 0; y < grid; y++) {
        for (let x = 0; x < grid; x++) {
          const r = this._pseudoRandom(x * 17 + y * 23 + stage * 7);
          if (r < crackDensity * 0.6) {
            ctx.fillRect(x * px, y * px, px, px);
          }
        }
      }

      this.pixelBlockCache[`destroy_stage_${stage}`] = canvas;
    }
  },

  // ========== 8-BIT PICKAXE GENERATION ==========
  _generatePixelPickaxes() {
    const types = {
      'wooden_pickaxe': { handle: '#8B5E3C', head: '#a07048', accent: '#6b4526' },
      'diamond_pickaxe': { handle: '#8B5E3C', head: '#00CED1', accent: '#7FFFD4' },
      'golden_pickaxe': { handle: '#8B5E3C', head: '#FFD700', accent: '#FFEC8B' },
      'iron_pickaxe': { handle: '#8B5E3C', head: '#C0C0C0', accent: '#E8E8E8' },
      'elite_pickaxe': { handle: '#8B5E3C', head: '#9B59B6', accent: '#D2A5E8' },
    };

    for (const [name, colors] of Object.entries(types)) {
      this.pixelPickaxeCache[name] = this._renderPixelPickaxe(120, colors);
    }

    // System pickaxe — premium netherite-style design
    this.pixelPickaxeCache['system_pickaxe'] = this._renderSystemPickaxe(120);
  },

  _renderSystemPickaxe(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const px = size / 16;

    ctx.clearRect(0, 0, size, size);

    // Premium netherite/admin pickaxe — wider head, glowing accents
    const pixels = [
      // Head top row (wide)
      { x: 1, y: 1, c: '#cc00cc' }, { x: 2, y: 1, c: '#dd22dd' },
      { x: 3, y: 1, c: '#ff44ff' }, { x: 4, y: 1, c: '#ff66ff' },
      { x: 5, y: 1, c: '#ff44ff' }, { x: 6, y: 1, c: '#dd22dd' },
      // Head second row
      { x: 1, y: 2, c: '#aa00aa' }, { x: 2, y: 2, c: '#ff00ff' },
      { x: 3, y: 2, c: '#ff55ff' }, { x: 4, y: 2, c: '#ff88ff' },
      { x: 5, y: 2, c: '#ff55ff' }, { x: 6, y: 2, c: '#ff00ff' },
      { x: 7, y: 2, c: '#cc00cc' },
      // Head third row (wider)
      { x: 2, y: 3, c: '#dd00dd' }, { x: 3, y: 3, c: '#ff00ff' },
      { x: 4, y: 3, c: '#ff77ff' }, { x: 5, y: 3, c: '#ff00ff' },
      { x: 6, y: 3, c: '#ff00ff' }, { x: 7, y: 3, c: '#dd00dd' },
      { x: 8, y: 3, c: '#bb00bb' }, { x: 9, y: 3, c: '#cc00cc' },
      // Head extended right
      { x: 8, y: 2, c: '#dd00dd' }, { x: 9, y: 2, c: '#cc00cc' },
      { x: 10, y: 2, c: '#aa00aa' },
      { x: 9, y: 4, c: '#dd00dd' }, { x: 10, y: 4, c: '#cc00cc' },
      { x: 11, y: 4, c: '#aa00aa' }, { x: 11, y: 3, c: '#990099' },
      // Head-handle junction
      { x: 4, y: 4, c: '#dd00dd' }, { x: 5, y: 4, c: '#ff00ff' },
      { x: 6, y: 4, c: '#ff00ff' }, { x: 7, y: 4, c: '#dd00dd' },
      { x: 8, y: 4, c: '#cc00cc' },
      // Handle (dark purple, diagonal)
      { x: 5, y: 5, c: '#440044' }, { x: 6, y: 5, c: '#550055' },
      { x: 6, y: 6, c: '#440044' }, { x: 7, y: 6, c: '#550055' },
      { x: 7, y: 7, c: '#440044' }, { x: 8, y: 7, c: '#550055' },
      { x: 8, y: 8, c: '#440044' }, { x: 9, y: 8, c: '#550055' },
      { x: 9, y: 9, c: '#440044' }, { x: 10, y: 9, c: '#550055' },
      { x: 10, y: 10, c: '#440044' }, { x: 11, y: 10, c: '#550055' },
      { x: 11, y: 11, c: '#440044' }, { x: 12, y: 11, c: '#550055' },
      { x: 12, y: 12, c: '#440044' }, { x: 13, y: 12, c: '#550055' },
      { x: 13, y: 13, c: '#440044' },
    ];

    // Black outline
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    for (const p of pixels) {
      ctx.fillRect((p.x - 0.5) * px, (p.y - 0.5) * px, px * 2, px * 2);
    }

    // Colored pixels
    for (const p of pixels) {
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x * px, p.y * px, px, px);
    }

    // Glowing highlights on head
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(3 * px, 1 * px, px, px);
    ctx.fillRect(4 * px, 1 * px, px, px);
    ctx.fillStyle = 'rgba(255,200,255,0.4)';
    ctx.fillRect(4 * px, 2 * px, px, px);

    // Handle glow accents
    ctx.fillStyle = 'rgba(255,0,255,0.3)';
    ctx.fillRect(6 * px, 5 * px, px, px);
    ctx.fillRect(8 * px, 7 * px, px, px);
    ctx.fillRect(10 * px, 9 * px, px, px);
    ctx.fillRect(12 * px, 11 * px, px, px);

    return canvas;
  },

  _renderPixelPickaxe(size, colors) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const px = size / 16; // 16x16 pixel grid

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Pickaxe shape (16x16 grid)
    // Head spans top area, handle goes diagonal
    const pixels = [
      // Head (top-left area) - the blade
      { x: 2, y: 2, c: colors.accent },
      { x: 3, y: 1, c: colors.accent },
      { x: 4, y: 1, c: colors.head },
      { x: 5, y: 1, c: colors.head },
      { x: 6, y: 2, c: colors.head },
      { x: 3, y: 2, c: colors.head },
      { x: 4, y: 2, c: colors.head },
      { x: 5, y: 2, c: colors.head },
      { x: 3, y: 3, c: colors.head },
      { x: 4, y: 3, c: colors.accent },
      { x: 5, y: 3, c: colors.head },
      { x: 6, y: 3, c: colors.head },
      { x: 7, y: 3, c: colors.accent },

      // Head right side
      { x: 7, y: 2, c: colors.head },
      { x: 8, y: 2, c: colors.head },
      { x: 9, y: 2, c: colors.accent },
      { x: 8, y: 3, c: colors.head },
      { x: 9, y: 3, c: colors.head },
      { x: 10, y: 3, c: colors.accent },
      { x: 10, y: 4, c: colors.head },
      { x: 11, y: 4, c: colors.accent },
      { x: 9, y: 4, c: colors.head },

      // Head connection to handle
      { x: 6, y: 4, c: colors.head },
      { x: 7, y: 4, c: colors.head },
      { x: 8, y: 4, c: colors.head },
      { x: 5, y: 4, c: colors.accent },

      // Handle (diagonal)
      { x: 5, y: 5, c: colors.handle },
      { x: 6, y: 5, c: colors.handle },
      { x: 6, y: 6, c: colors.handle },
      { x: 7, y: 6, c: colors.handle },
      { x: 7, y: 7, c: colors.handle },
      { x: 8, y: 7, c: colors.handle },
      { x: 8, y: 8, c: colors.handle },
      { x: 9, y: 8, c: colors.handle },
      { x: 9, y: 9, c: colors.handle },
      { x: 10, y: 9, c: colors.handle },
      { x: 10, y: 10, c: colors.handle },
      { x: 11, y: 10, c: colors.handle },
      { x: 11, y: 11, c: colors.handle },
      { x: 12, y: 11, c: colors.handle },
      { x: 12, y: 12, c: colors.handle },
      { x: 13, y: 12, c: colors.handle },
      { x: 13, y: 13, c: colors.handle },

      // Handle highlight (lighter pixels along handle)
      { x: 5, y: 4, c: 'rgba(255,255,255,0.15)' },
      { x: 7, y: 5, c: 'rgba(255,255,255,0.1)' },
      { x: 9, y: 7, c: 'rgba(255,255,255,0.1)' },
    ];

    // Draw black outline first (1px border around each pixel)
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    for (const p of pixels) {
      ctx.fillRect((p.x - 0.5) * px, (p.y - 0.5) * px, px * 2, px * 2);
    }

    // Draw colored pixels
    for (const p of pixels) {
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x * px, p.y * px, px, px);
    }

    // Head shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(4 * px, 1 * px, px, px);
    ctx.fillRect(5 * px, 1 * px, px, px);

    return canvas;
  },

  // ========== UTILITY ==========
  _pseudoRandom(seed) {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  },

  _hashStr(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  },

  // ===== Trigger Rare Block Cinematic =====
  triggerRareBlockEffect(data) {
    const isJackpot = data.blockType === 'jackpot';
    this.rareBlockEffects.push({
      x: data.x,
      y: data.y,
      blockType: data.blockType,
      blockName: data.blockName,
      playerName: data.playerName,
      reward: data.reward,
      time: this._now || Date.now(),
      particles: this._createCinematicParticles(data.blockType),
    });
    Camera.shake(isJackpot ? 20 : 10, isJackpot ? 1.0 : 0.5);
  },

  _createCinematicParticles(blockType) {
    const particles = [];
    const colorSets = {
      jackpot: ['#FF00FF', '#FFD700', '#00FFFF', '#FF6B35', '#fff', '#7FFF00'],
      diamond_block: ['#00CED1', '#00FFFF', '#7FFFD4', '#E0FFFF', '#FFD700', '#fff'],
      gold_block: ['#FFD700', '#FFA500', '#DAA520', '#FFEC8B', '#fff', '#FFE4B5'],
    };
    const colors = colorSets[blockType] || colorSets.gold_block;
    const count = blockType === 'jackpot' ? 30 : 15;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 80 + Math.random() * 200;
      particles.push({
        x: 0, y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5, // smaller square particles for 8-bit feel
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.3 + Math.random() * 0.4,
        rotation: 0, // no rotation for pixel particles
        rotSpeed: 0,
      });
    }
    return particles;
  },

  // ===== Main Render Loop =====
  render(state) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    this._now = Date.now(); // Single timestamp per frame

    // Background — deep cave gradient (cached), themed per field
    if (!this._bgGradient) {
      this._bgGradient = ctx.createLinearGradient(0, 0, 0, H);
      if (this.fieldTheme === 'hardcore') {
        this._bgGradient.addColorStop(0, '#1a0505');
        this._bgGradient.addColorStop(0.5, '#220808');
        this._bgGradient.addColorStop(1, '#180404');
      } else {
        this._bgGradient.addColorStop(0, '#0a0a1a');
        this._bgGradient.addColorStop(0.5, '#0d0d22');
        this._bgGradient.addColorStop(1, '#080818');
      }
    }
    ctx.fillStyle = this._bgGradient;
    ctx.fillRect(0, 0, W, H);

    // Parallax stars (8-bit)
    this._renderStarfield(ctx, W, H);

    if (!state) return;

    this._renderWalls(ctx, H);
    this._renderBlocks(ctx, state.blocks, H, W);
    this._renderTNTs(ctx, state.tnts, H);
    this._renderExplosions(ctx, state.explosions, H);
    this._renderPickaxes(ctx, state.pickaxes, H);
    this._renderRareBlockEffects(ctx, H, W);

    // Block hover tooltip (drawn last, on top of everything)
    this._renderHoverTooltip(ctx, state.blocks, H, W);
  },

  _renderStarfield(ctx, W, H) {
    const offsetY = (Camera.y * 0.05) % 200;
    const isHardcore = this.fieldTheme === 'hardcore';
    ctx.fillStyle = isHardcore ? 'rgba(255,80,40,0.15)' : 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 30; i++) {
      const sx = this._pseudoRandom(i * 7.1) * W;
      const sy = (this._pseudoRandom(i * 13.3) * H + offsetY) % H;
      const ss = 2 + this._pseudoRandom(i * 3.7) * 3;
      ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.floor(ss), Math.floor(ss));
    }
    // Hardcore: additional ember particles
    if (isHardcore) {
      const now = this._now || Date.now();
      ctx.fillStyle = 'rgba(255,60,20,0.25)';
      for (let i = 0; i < 8; i++) {
        const ex = this._pseudoRandom(i * 11.3 + Math.floor(now / 400)) * W;
        const ey = (this._pseudoRandom(i * 17.1) * H + (now * 0.03 * (i + 1)) % H) % H;
        const es = 3 + this._pseudoRandom(i * 5.3) * 4;
        ctx.fillRect(Math.floor(ex), Math.floor(ey), Math.floor(es), Math.floor(es));
      }
    }
  },

  // ===== THIN WALL RENDERING =====
  _renderWalls(ctx, canvasH) {
    const wallW = 60; // WALL_THICKNESS — matches server constant
    const isHardcore = this.fieldTheme === 'hardcore';
    const wallColor = isHardcore ? '#3a1515' : '#2a2a2a';
    const wallLight = isHardcore ? '#5a2020' : '#3d3d3d';
    const wallDark = isHardcore ? '#200a0a' : '#1a1a1a';
    const px = 10; // pixel size for texture

    // Left wall (full height, scrolls with camera)
    ctx.fillStyle = wallColor;
    ctx.fillRect(0, 0, wallW, canvasH);
    // Right wall
    ctx.fillRect(1080 - wallW, 0, wallW, canvasH);

    // 8-bit texture on walls (static pattern)
    for (let y = 0; y < canvasH; y += px) {
      for (let x = 0; x < wallW; x += px) {
        const r = this._pseudoRandom(x * 13 + y * 7 + 31);
        if (r < 0.25) {
          ctx.fillStyle = wallLight;
          ctx.fillRect(x, y, px, px);
          ctx.fillRect(1080 - wallW + x, y, px, px);
        } else if (r < 0.45) {
          ctx.fillStyle = wallDark;
          ctx.fillRect(x, y, px, px);
          ctx.fillRect(1080 - wallW + x, y, px, px);
        }
      }
    }

    // Inner edge bevel (3D feel)
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(wallW - 2, 0, 2, canvasH); // Left wall inner shadow
    ctx.fillRect(1080 - wallW, 0, 2, canvasH); // Right wall inner shadow
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, 2, canvasH); // Left wall outer highlight
    ctx.fillRect(1080 - 2, 0, 2, canvasH); // Right wall outer highlight
  },

  // ===== BLOCK RENDERING (8-bit) =====
  _renderBlocks(ctx, blocks, canvasH, canvasW) {
    if (!blocks) return;
    const blockSize = 120;

    for (const block of blocks) {
      const pos = Camera.worldToScreen(block.x, block.y, canvasH);
      const margin = 60; // accounts for camera shake (up to 50px)
      if (pos.y + blockSize < -margin || pos.y > canvasH + margin) continue;
      if (pos.x + blockSize < -margin || pos.x > canvasW + margin) continue;

      // Jackpot block special rendering
      if (block.type === 'jackpot') {
        this._renderJackpotBlock(ctx, pos, blockSize, this._now);
        continue;
      }

      // Draw cached pixel block
      const cached = this.pixelBlockCache[block.type];
      if (cached) {
        ctx.drawImage(cached, Math.floor(pos.x), Math.floor(pos.y), blockSize, blockSize);
      } else {
        // Fallback: solid color with pixel border
        ctx.fillStyle = this._getBlockColor(block.type);
        ctx.fillRect(pos.x, pos.y, blockSize, blockSize);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(pos.x, pos.y, blockSize, 4);
        ctx.fillRect(pos.x, pos.y, 4, blockSize);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(pos.x, pos.y + blockSize - 4, blockSize, 4);
        ctx.fillRect(pos.x + blockSize - 4, pos.y, 4, blockSize);
      }

      // Rare block animated overlay effects
      if (block.type === 'diamond_block' || block.type === 'gold_block' || block.type === 'emerald_block') {
        this._renderRareBlockEffect(ctx, block.type, pos, blockSize, this._now);
      }

      // Destroy stage overlay
      if (block.stage > 0 && block.stage < 10) {
        const destroyCanvas = this.pixelBlockCache[`destroy_stage_${block.stage}`];
        if (destroyCanvas) {
          ctx.drawImage(destroyCanvas, Math.floor(pos.x), Math.floor(pos.y), blockSize, blockSize);
        }
      }
    }
  },

  // Animated shimmer/glow/sparkle overlay for rare blocks (diamond, gold, emerald)
  _renderRareBlockEffect(ctx, blockType, pos, blockSize, now) {
    // px matches the block's internal pixel grid unit (blockSize=120, grid=12 => px=10)
    const px = blockSize / 12;

    if (blockType === 'diamond_block') {
      // --- Pulsing outer cyan glow ---
      const pulse = Math.sin(now * 0.003) * 0.4 + 0.6;
      ctx.save();
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 14 * pulse;
      ctx.globalAlpha = 0.14 * pulse;
      ctx.fillStyle = '#00CED1';
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillRect(pos.x, pos.y, blockSize, blockSize);
      ctx.restore();

      // --- Sparkle pixels (4 white pixels cycling every ~250ms) ---
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const dSparklePhase = Math.floor(now / 250);
      for (let i = 0; i < 4; i++) {
        const visible = this._pseudoRandom(dSparklePhase + i * 17) > 0.4;
        if (!visible) continue;
        const sx = Math.floor(this._pseudoRandom(dSparklePhase * 3 + i * 7) * 10) * px + pos.x + px;
        const sy = Math.floor(this._pseudoRandom(dSparklePhase * 5 + i * 11) * 10) * px + pos.y + px;
        ctx.globalAlpha = 0.6 + pulse * 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.floor(sx), Math.floor(sy), px, px);
      }
      ctx.restore();

      // --- Diagonal light sweep (every 2.5s) ---
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22;
      const dSweepT = (now % 2500) / 2500;
      const dSweepX = pos.x + dSweepT * blockSize * 1.5 - blockSize * 0.25;
      ctx.beginPath();
      ctx.moveTo(dSweepX, pos.y);
      ctx.lineTo(dSweepX + px * 2, pos.y);
      ctx.lineTo(dSweepX - blockSize * 0.3 + px * 2, pos.y + blockSize);
      ctx.lineTo(dSweepX - blockSize * 0.3, pos.y + blockSize);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pos.x, pos.y, blockSize, blockSize);
      ctx.restore();

    } else if (blockType === 'gold_block') {
      // --- Pulsing golden outer glow ---
      const pulse = Math.sin(now * 0.004) * 0.3 + 0.7;
      ctx.save();
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 12 * pulse;
      ctx.globalAlpha = 0.12 * pulse;
      ctx.fillStyle = '#FFD700';
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillRect(pos.x, pos.y, blockSize, blockSize);
      ctx.restore();

      // --- Warm shimmer overlay ---
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.06 * (Math.sin(now * 0.002) * 0.5 + 0.5);
      ctx.fillStyle = '#FFA500';
      ctx.fillRect(pos.x, pos.y, blockSize, blockSize);
      ctx.restore();

      // --- Golden sparkle pixels (3 pixels cycling every ~350ms) ---
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gSparklePhase = Math.floor(now / 350);
      for (let i = 0; i < 3; i++) {
        const visible = this._pseudoRandom(gSparklePhase + i * 13) > 0.45;
        if (!visible) continue;
        const sx = Math.floor(this._pseudoRandom(gSparklePhase * 3 + i * 9) * 10) * px + pos.x + px;
        const sy = Math.floor(this._pseudoRandom(gSparklePhase * 7 + i * 5) * 10) * px + pos.y + px;
        ctx.globalAlpha = 0.5 + pulse * 0.5;
        ctx.fillStyle = '#FFEC8B';
        ctx.fillRect(Math.floor(sx), Math.floor(sy), px, px);
      }
      ctx.restore();

    } else if (blockType === 'emerald_block') {
      // --- Pulsing green outer glow ---
      const pulse = Math.sin(now * 0.0035) * 0.35 + 0.65;
      ctx.save();
      ctx.shadowColor = '#2ecc71';
      ctx.shadowBlur = 10 * pulse;
      ctx.globalAlpha = 0.10 * pulse;
      ctx.fillStyle = '#50C878';
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillRect(pos.x, pos.y, blockSize, blockSize);
      ctx.restore();

      // --- Crystal refraction pixels (2 pixels that drift sinusoidally) ---
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const eRefractPhase = now * 0.001;
      for (let i = 0; i < 2; i++) {
        const rx = Math.floor((Math.sin(eRefractPhase + i * 2.5) * 0.35 + 0.5) * 10) * px + pos.x + px;
        const ry = Math.floor((Math.cos(eRefractPhase * 0.8 + i * 1.8) * 0.35 + 0.5) * 10) * px + pos.y + px;
        ctx.globalAlpha = 0.6 * pulse;
        ctx.fillStyle = '#55efc4';
        ctx.fillRect(Math.floor(rx), Math.floor(ry), px, px);
      }
      ctx.restore();

      // --- Brightness pulse overlay ---
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.04 * (Math.sin(now * 0.003) * 0.5 + 0.5);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(pos.x, pos.y, blockSize, blockSize);
      ctx.restore();
    }
  },

  // Rainbow-glowing Jackpot block (8-bit style)
  _renderJackpotBlock(ctx, pos, blockSize, now) {
    const pulse = Math.sin(now * 0.004) * 0.3 + 0.7;
    const hue = (now * 0.15) % 360;
    const px = blockSize / 12;

    ctx.save();

    // Outer glow
    ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
    ctx.shadowBlur = 25 * pulse;

    // Base block with rainbow gradient
    const gradient = ctx.createLinearGradient(pos.x, pos.y, pos.x + blockSize, pos.y + blockSize);
    gradient.addColorStop(0, `hsl(${hue}, 100%, 50%)`);
    gradient.addColorStop(0.5, `hsl(${(hue + 120) % 360}, 100%, 50%)`);
    gradient.addColorStop(1, `hsl(${(hue + 240) % 360}, 100%, 50%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(pos.x, pos.y, blockSize, blockSize);

    // 8-bit bevel
    ctx.fillStyle = `rgba(255,255,255,${0.4 * pulse})`;
    ctx.fillRect(pos.x, pos.y, blockSize, px);
    ctx.fillRect(pos.x, pos.y, px, blockSize);
    ctx.fillStyle = `rgba(0,0,0,${0.3 * pulse})`;
    ctx.fillRect(pos.x, pos.y + blockSize - px, blockSize, px);
    ctx.fillRect(pos.x + blockSize - px, pos.y, px, blockSize);

    // Pixel shimmer
    for (let i = 0; i < 6; i++) {
      const sx = pos.x + this._pseudoRandom(i * 3 + Math.floor(now / 200)) * blockSize;
      const sy = pos.y + this._pseudoRandom(i * 7 + Math.floor(now / 300)) * blockSize;
      ctx.fillStyle = `rgba(255,255,255,${0.5 * pulse})`;
      ctx.fillRect(Math.floor(sx / px) * px, Math.floor(sy / px) * px, px, px);
    }

    ctx.shadowBlur = 0;
    ctx.restore();

    // "JP" text (pixel style)
    ctx.save();
    ctx.font = `bold ${Math.floor(blockSize * 0.22)}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
    ctx.shadowBlur = 10;
    ctx.fillText('JP', pos.x + blockSize / 2, pos.y + blockSize / 2);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Floating square particles
    const particleCount = 4;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i / particleCount) + now * 0.002;
      const dist = blockSize * 0.5 + Math.sin(now * 0.005 + i) * 8;
      const ppx = pos.x + blockSize / 2 + Math.cos(angle) * dist;
      const ppy = pos.y + blockSize / 2 + Math.sin(angle) * dist;
      ctx.fillStyle = `hsl(${(hue + i * 90) % 360}, 100%, 70%)`;
      ctx.fillRect(Math.floor(ppx), Math.floor(ppy), 6, 6);
    }
  },

  // ===== PICKAXE RENDERING (8-bit) =====
  _renderPickaxes(ctx, pickaxes, canvasH) {
    if (!pickaxes) return;
    const now = this._now;

    for (const p of pickaxes) {
      const pos = Camera.worldToScreen(p.x, p.y, canvasH);
      const size = p.width || (p.scale || 1.7) * 120;
      const isMine = this.myPlayerId && p.ownerId === this.myPlayerId;

      const texName = p.texture.replace('.png', '');
      const cached = this.pixelPickaxeCache[texName];

      ctx.save();
      ctx.translate(Math.floor(pos.x + size / 2), Math.floor(pos.y + size / 2));
      ctx.rotate(p.rotation);

      const isSystem = p.ownerId === '__system__';

      // Glow effects
      if (isSystem) {
        // System pickaxe: pulsing magenta aura
        const pulse = Math.sin(now * 0.004) * 0.4 + 0.6;
        ctx.shadowColor = '#FF00FF';
        ctx.shadowBlur = 20 * pulse;
      } else if (isMine) {
        const pulse = Math.sin(now * 0.005) * 0.3 + 0.7;
        ctx.shadowColor = p.color || '#00FFFF';
        ctx.shadowBlur = 14 * pulse;
      }

      if (cached) {
        ctx.drawImage(cached, -size / 2, -size / 2, size, size);
      } else {
        ctx.fillStyle = p.color || '#FFD700';
        const hs = size / 2;
        ctx.fillRect(-hs * 0.8, -hs * 0.6, size * 0.7, size * 0.2);
        ctx.fillRect(-size * 0.05, -hs * 0.3, size * 0.1, size * 0.7);
      }

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // System pickaxe: trailing particles
      if (isSystem) {
        const trailCount = 6;
        for (let i = 0; i < trailCount; i++) {
          const age = ((now * 0.003 + i * 1.2) % 1);
          const tx = (Math.sin(now * 0.002 + i * 2.5)) * size * 0.3;
          const ty = -size * 0.2 + age * size * 0.8;
          const tAlpha = (1 - age) * 0.7;
          const tSize = (1 - age) * 8 + 2;
          ctx.globalAlpha = tAlpha;
          ctx.fillStyle = i % 2 === 0 ? '#FF00FF' : '#FFD700';
          ctx.fillRect(Math.floor(tx - tSize / 2), Math.floor(ty - tSize / 2), Math.floor(tSize), Math.floor(tSize));
        }
        ctx.globalAlpha = 1;
      }

      // Mine indicator border (pixel style)
      if (isMine) {
        const pulse = Math.sin(now * 0.006) * 0.4 + 0.6;
        ctx.strokeStyle = `rgba(0, 255, 255, ${pulse})`;
        ctx.lineWidth = 4;
        // Dashed pixel border
        const bx = -size / 2 - 4;
        const by = -size / 2 - 4;
        const bw = size + 8;
        const bh = size + 8;
        const dashLen = 8;
        ctx.setLineDash([dashLen, dashLen]);
        ctx.lineDashOffset = -(now * 0.02) % (dashLen * 2);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);
      }

      ctx.restore();

      // Name label (pixel style)
      const fontSize = Math.max(14, Math.round(size * 0.09));
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.textAlign = 'center';

      if (isSystem) {
        // System pickaxe: glowing magenta name
        const hue = (now * 0.1) % 360;
        ctx.save();
        ctx.shadowColor = '#FF00FF';
        ctx.shadowBlur = 8;
        ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
        ctx.fillText('PIKIT', pos.x + size / 2, pos.y - 16);
        ctx.shadowBlur = 0;
        ctx.restore();
      } else if (isMine) {
        ctx.fillStyle = '#000';
        ctx.fillText(p.ownerName, pos.x + size / 2 + 1, pos.y - 14 + 1);
        ctx.fillStyle = '#00FFFF';
        ctx.fillText(p.ownerName, pos.x + size / 2, pos.y - 14);
      } else {
        ctx.fillStyle = '#000';
        ctx.fillText(p.ownerName, pos.x + size / 2 + 1, pos.y - 14 + 1);
        ctx.fillStyle = p.color || '#fff';
        ctx.fillText(p.ownerName, pos.x + size / 2, pos.y - 14);
      }

      // Time remaining bar (pixel style)
      if (p.timeLeft > 0) {
        const lifetime = p.lifetime || 30000;
        const barW = Math.max(60, size * 0.5);
        const barH = 6;
        const barX = Math.floor(pos.x + size / 2 - barW / 2);
        const barY = Math.floor(pos.y - 6);
        const ratio = p.timeLeft / lifetime;

        // Background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(barX, barY, barW, barH);
        // Border
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, 1);
        ctx.fillRect(barX, barY + barH - 1, barW, 1);
        ctx.fillRect(barX, barY, 1, barH);
        ctx.fillRect(barX + barW - 1, barY, 1, barH);
        // Fill
        const fillColor = isMine
          ? (ratio > 0.3 ? '#00FFFF' : '#FF00FF')
          : (ratio > 0.3 ? '#4CAF50' : '#f44336');
        ctx.fillStyle = fillColor;
        ctx.fillRect(barX + 1, barY + 1, (barW - 2) * ratio, barH - 2);
      }

      // Reward display
      if (p.totalReward > 0) {
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.fillStyle = '#000';
        ctx.fillText(`+${p.totalReward.toLocaleString()}`, pos.x + size / 2 + 1, pos.y - 28 + 1);
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`+${p.totalReward.toLocaleString()}`, pos.x + size / 2, pos.y - 28);
      }
    }
  },

  // ===== TNT RENDERING (8-bit) =====
  _renderTNTs(ctx, tnts, canvasH) {
    if (!tnts) return;

    for (const t of tnts) {
      const pos = Camera.worldToScreen(t.x, t.y, canvasH);
      if (pos.y + t.height < 0 || pos.y > canvasH) continue;

      const x = Math.floor(pos.x);
      const y = Math.floor(pos.y);
      const w = t.width;
      const h = t.height;
      const pulse = Math.sin(t.pulsePhase) * 0.5 + 0.5;
      const px = w / 10;

      // TNT body (red)
      ctx.fillStyle = '#cc2222';
      ctx.fillRect(x, y, w, h);

      // 8-bit bevel
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x, y, w, px);
      ctx.fillRect(x, y, px, h);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x, y + h - px, w, px);
      ctx.fillRect(x + w - px, y, px, h);

      // White band
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(x + px, y + 3 * px, w - 2 * px, 4 * px);

      // "TNT" text
      ctx.font = `bold ${Math.floor(w * 0.22)}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#cc2222';
      ctx.fillText('TNT', x + w / 2, y + h / 2);

      // Pulse glow
      if (pulse > 0.5) {
        ctx.globalAlpha = (pulse - 0.5) * 0.6;
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
      }

      // Name label
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000';
      ctx.fillText(t.ownerName, x + w / 2 + 1, y - 7);
      ctx.fillStyle = '#fff';
      ctx.fillText(t.ownerName, x + w / 2, y - 8);
    }
  },

  // ===== EXPLOSION RENDERING (8-bit) =====
  _renderExplosions(ctx, explosions, canvasH) {
    if (!explosions) return;
    const now = this._now;

    for (const e of explosions) {
      const age = now - e.time;
      if (age > 1000) continue;

      const pos = Camera.worldToScreen(e.x, e.y, canvasH);
      const progress = age / 1000;
      const radius = e.radius * (0.5 + progress * 0.5);
      const alpha = 1 - progress;

      // Pixel explosion: expanding colored squares
      const layers = 5;
      for (let i = layers; i >= 0; i--) {
        const layerR = radius * (i / layers);
        const layerAlpha = alpha * (1 - i / layers * 0.4);
        const colors = ['#fff', '#FFD700', '#FF8C00', '#FF4500', '#8B0000', '#2a0000'];
        ctx.globalAlpha = layerAlpha;
        ctx.fillStyle = colors[i] || '#FF4500';

        // Draw as square (pixel style)
        const half = layerR;
        ctx.fillRect(
          Math.floor(pos.x - half),
          Math.floor(pos.y - half),
          Math.floor(half * 2),
          Math.floor(half * 2)
        );
      }
      ctx.globalAlpha = 1;

      // Pixel debris particles
      if (progress < 0.5) {
        const debrisCount = 8;
        for (let i = 0; i < debrisCount; i++) {
          const angle = (Math.PI * 2 * i) / debrisCount;
          const dist = radius * progress * 2;
          const dx = pos.x + Math.cos(angle) * dist;
          const dy = pos.y + Math.sin(angle) * dist;
          ctx.fillStyle = i % 2 === 0 ? '#FFD700' : '#FF4500';
          ctx.globalAlpha = alpha;
          ctx.fillRect(Math.floor(dx) - 4, Math.floor(dy) - 4, 8, 8);
        }
        ctx.globalAlpha = 1;
      }
    }
  },

  // Rare Block Cinematic Effects (8-bit enhanced)
  _renderRareBlockEffects(ctx, canvasH, canvasW) {
    const now = this._now;

    this.rareBlockEffects = this.rareBlockEffects.filter(effect => {
      const age = (now - effect.time) / 1000;
      const duration = effect.blockType === 'jackpot' ? 5.0 : 3.0;
      if (age > duration) return false;

      const pos = Camera.worldToScreen(effect.x, effect.y, canvasH);
      const isJackpot = effect.blockType === 'jackpot';

      const primaryColor = isJackpot ? '#FFD700' :
        effect.blockType === 'diamond_block' ? '#00CED1' : '#FFD700';
      const secondaryColor = isJackpot ? '#FF00FF' :
        effect.blockType === 'diamond_block' ? '#00FFFF' : '#FFA500';

      // Pixel shockwave rings (square rings for 8-bit)
      const ringCount = isJackpot ? 2 : 1;
      for (let ring = 0; ring < ringCount; ring++) {
        const ringDelay = ring * 0.12;
        const ringAge = age - ringDelay;
        if (ringAge < 0 || ringAge > 2.0) continue;

        const ringProgress = ringAge / 2.0;
        const radius = ringProgress * (isJackpot ? 300 : 200);
        const alpha = (1 - ringProgress) * 0.6;
        const lineWidth = Math.floor((1 - ringProgress) * 8 + 2);

        ctx.strokeStyle = ring % 2 === 0 ? primaryColor : secondaryColor;
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = alpha;
        // Square ring instead of circle for pixel feel
        ctx.strokeRect(
          Math.floor(pos.x - radius),
          Math.floor(pos.y - radius),
          Math.floor(radius * 2),
          Math.floor(radius * 2)
        );
        ctx.globalAlpha = 1;
      }

      // Square particles (8-bit)
      const dt = 1 / 60;
      for (const particle of effect.particles) {
        if (particle.life <= 0) continue;

        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 200 * dt;
        particle.vx *= 0.98;
        particle.life -= particle.decay * dt;

        if (particle.life <= 0) continue;

        const px = pos.x + particle.x;
        const py = pos.y + particle.y;

        ctx.globalAlpha = Math.max(0, particle.life);
        ctx.fillStyle = particle.color;
        const s = Math.floor(particle.size * particle.life);
        ctx.fillRect(Math.floor(px - s / 2), Math.floor(py - s / 2), s, s);
        ctx.globalAlpha = 1;
      }

      // Reward text (pixel font style)
      if (age > 0.3) {
        const textAge = age - 0.3;
        const textAlpha = Math.min(1, textAge * 3) * Math.max(0, 1 - (textAge - 1.5) / 1.2);
        const textY = pos.y - 80 - textAge * 40;

        ctx.save();
        ctx.globalAlpha = Math.max(0, textAlpha);
        ctx.textAlign = 'center';

        const blockFontSize = isJackpot ? 24 : 18;
        ctx.font = `bold ${blockFontSize}px "Courier New", monospace`;

        // Shadow
        ctx.fillStyle = '#000';
        ctx.fillText(effect.blockName, pos.x + 2, textY + 2);
        ctx.fillStyle = primaryColor;
        ctx.fillText(effect.blockName, pos.x, textY);

        const rewardFontSize = isJackpot ? 20 : 16;
        ctx.font = `bold ${rewardFontSize}px "Courier New", monospace`;
        ctx.fillStyle = '#000';
        ctx.fillText(`+${effect.reward.toLocaleString()}`, pos.x + 2, textY + 52);
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`+${effect.reward.toLocaleString()}`, pos.x, textY + 50);

        ctx.globalAlpha = 1;
        ctx.restore();
      }

      return true;
    });
  },

  _getBlockColor(type) {
    const colors = {
      jackpot: '#FF00FF',
      diamond_block: '#00CED1',
      gold_block: '#FFD700',
      emerald_block: '#50C878',
      iron_block: '#BC8F8F',
      copper_block: '#B87333',
      stone: '#808080',
      dirt: '#8B5E3C',
      gravel: '#696969',
      clay: '#A09070',
      bedrock: '#333',
    };
    return colors[type] || '#808080';
  },

  // ===== BLOCK HOVER TOOLTIP =====
  // Convert CSS mouse position to internal canvas coordinates
  screenToCanvas(clientX, clientY) {
    if (!this.canvas) return null;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = 1080 / rect.width;
    const scaleY = 1920 / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  },

  // Update mouse position for hover (called from main.js mousemove)
  updateHoverPosition(clientX, clientY) {
    this._hoverMouseX = clientX;
    this._hoverMouseY = clientY;
  },

  // Render tooltip for hovered block
  _renderHoverTooltip(ctx, blocks, canvasH, canvasW) {
    if (!blocks || !this._hoverMouseX) return;

    const canvasPos = this.screenToCanvas(this._hoverMouseX, this._hoverMouseY);
    if (!canvasPos) return;

    const blockSize = 120;
    let hoveredBlock = null;

    // Find block under cursor
    for (const block of blocks) {
      if (block.type === 'bedrock') continue;
      const pos = Camera.worldToScreen(block.x, block.y, canvasH);
      if (canvasPos.x >= pos.x && canvasPos.x <= pos.x + blockSize &&
          canvasPos.y >= pos.y && canvasPos.y <= pos.y + blockSize) {
        hoveredBlock = block;
        break;
      }
    }

    if (!hoveredBlock) return;

    // Calculate expected reward text
    const rewardText = hoveredBlock.rewardType === 'random'
      ? '1~5'
      : (hoveredBlock.reward || 0).toLocaleString();
    const blockName = hoveredBlock.name || hoveredBlock.type;

    // Position tooltip near cursor (offset to avoid covering block)
    const tx = Math.min(canvasPos.x + 20, canvasW - 340);
    const ty = Math.max(canvasPos.y - 100, 10);

    // Tooltip text
    const textName = blockName;
    const textReward = `+${rewardText} credits`;
    const textHp = `HP: ${hoveredBlock.hp}/${hoveredBlock.maxHp}`;

    ctx.save();
    ctx.font = 'bold 28px "Courier New", monospace';
    const nameW = ctx.measureText(textName).width;
    ctx.font = '24px "Courier New", monospace';
    const rewardW = ctx.measureText(textReward).width;
    const hpW = ctx.measureText(textHp).width;
    const boxW = Math.max(nameW, rewardW, hpW) + 32;
    const boxH = 100;
    const cornerR = 8;

    // Rounded semi-transparent background
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.roundRect(Math.floor(tx), Math.floor(ty), boxW, boxH, cornerR);
    ctx.fill();
    // Border
    ctx.strokeStyle = hoveredBlock.color || '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(Math.floor(tx), Math.floor(ty), boxW, boxH, cornerR);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Block name
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = hoveredBlock.color || '#fff';
    ctx.fillText(textName, tx + 16, ty + 32);

    // Reward
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(textReward, tx + 16, ty + 62);

    // HP
    ctx.font = '20px "Courier New", monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(textHp, tx + 16, ty + 88);

    ctx.restore();
  },

  resize() {
    const container = this.canvas.parentElement;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const ratio = 1080 / 1920;
    let displayW, displayH;

    if (cw / ch > ratio) {
      displayH = ch;
      displayW = ch * ratio;
    } else {
      displayW = cw;
      displayH = cw / ratio;
    }

    this.canvas.style.width = displayW + 'px';
    this.canvas.style.height = displayH + 'px';
  },
};
