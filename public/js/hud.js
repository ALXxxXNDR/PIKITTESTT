// ============================================
// HUD Rendering (Canvas overlay) — 8-bit Retro Style
// Only renders canvas-exclusive elements (DOM HUD handles depth/balance/PNL)
// ============================================

const HUD = {
  render(ctx, state, player) {
    if (!state) return;

    const W = 1080;
    const font = '"Courier New", monospace';

    // Jackpot notifications on canvas (not in DOM HUD)
    if (state.jackpots && state.jackpots.length > 0) {
      const now = Date.now();
      const recentJackpots = state.jackpots.filter(j => now - j.time < 5000);

      ctx.textAlign = 'center';
      recentJackpots.forEach((jp, i) => {
        const age = now - jp.time;
        const alpha = Math.max(0, 1 - age / 5000);
        const y = 120 + i * 40;

        ctx.globalAlpha = alpha;
        ctx.font = `bold 20px ${font}`;
        ctx.fillStyle = '#000';
        ctx.fillText(
          `* ${jp.playerName} > ${jp.reward.toLocaleString()} ${jp.blockName}! *`,
          W / 2 + 2, y + 2
        );
        ctx.fillStyle = '#FFD700';
        ctx.fillText(
          `* ${jp.playerName} > ${jp.reward.toLocaleString()} ${jp.blockName}! *`,
          W / 2, y
        );
        ctx.globalAlpha = 1;
      });
    }
  },
};
