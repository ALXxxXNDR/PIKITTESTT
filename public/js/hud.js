// ============================================
// HUD Rendering (Canvas overlay) — 8-bit Retro Style
// ============================================

const HUD = {
  render(ctx, state, player) {
    if (!state) return;

    const W = 1080;
    const font = '"Courier New", monospace';

    // Depth display (pixel style)
    ctx.font = `bold 26px ${font}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#000';
    ctx.fillText(`DEPTH: ${state.depth}m`, 22, 42);
    ctx.fillStyle = '#fff';
    ctx.fillText(`DEPTH: ${state.depth}m`, 20, 40);

    // Online count
    ctx.font = `18px ${font}`;
    ctx.fillStyle = '#000';
    ctx.fillText(`ONLINE: ${state.playerCount}  PICKS: ${state.activePickaxes}`, 22, 72);
    ctx.fillStyle = '#aaa';
    ctx.fillText(`ONLINE: ${state.playerCount}  PICKS: ${state.activePickaxes}`, 20, 70);

    // Balance (top-right)
    if (player) {
      ctx.textAlign = 'right';
      ctx.font = `bold 22px ${font}`;
      ctx.fillStyle = '#000';
      ctx.fillText(`${Math.round(player.balance).toLocaleString()} CR`, W - 18, 42);
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`${Math.round(player.balance).toLocaleString()} CR`, W - 20, 40);

      // Profit
      const profit = (player.totalEarned || 0) - (player.totalSpent || 0);
      const profitColor = profit >= 0 ? '#4CAF50' : '#f44336';
      const profitSign = profit >= 0 ? '+' : '';
      ctx.font = `16px ${font}`;
      ctx.fillStyle = profitColor;
      ctx.fillText(`PNL ${profitSign}${Math.round(profit).toLocaleString()}`, W - 20, 66);
    }

    // Jackpot notifications on canvas
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
        // Shadow
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
