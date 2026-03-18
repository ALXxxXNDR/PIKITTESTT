const { INITIAL_BALANCE } = require('./constants');

// ========== Quest Chain Definitions ==========
// Each chain: { id, name, metric, tiers: [{ target, reward }] }
// Quest IDs: chainId * 100 + tier (e.g., chain 1 tier 3 = 103)
// Rewards are in-game credits (non-withdrawable)
//
// Balance principle: quest reward < expected cost to complete
// Cost per block ≈ 217cr (basic pickaxe 3400cr / ~15.7 blocks)
// House edge 55% → net cost per block ≈ 119cr
// Quest reward = ~5-15% of expected spending (house still wins)
const QUEST_CHAINS = [
  {
    id: 1, name: 'Block Breaker', icon: '⛏️',
    desc: 'Destroy {target} blocks total',
    metric: 'blocksDestroyed',
    tiers: [
      { target: 200,     reward: 3000 },
      { target: 2000,    reward: 15000 },
      { target: 10000,   reward: 50000 },
      { target: 30000,   reward: 100000 },
      { target: 100000,  reward: 250000 },
      { target: 300000,  reward: 500000 },
      { target: 1000000, reward: 1000000 },
    ],
  },
  {
    id: 2, name: 'Stone Mason', icon: '🪨',
    desc: 'Destroy {target} Stone blocks',
    metric: 'blocksByType.stone',
    tiers: [
      { target: 100,     reward: 2000 },
      { target: 1000,    reward: 10000 },
      { target: 5000,    reward: 30000 },
      { target: 20000,   reward: 80000 },
      { target: 50000,   reward: 150000 },
      { target: 200000,  reward: 400000 },
      { target: 1000000, reward: 800000 },
    ],
  },
  {
    id: 3, name: 'Dirt Digger', icon: '🟫',
    desc: 'Destroy {target} Dirt blocks',
    metric: 'blocksByType.dirt',
    tiers: [
      { target: 100,     reward: 2000 },
      { target: 1000,    reward: 10000 },
      { target: 5000,    reward: 30000 },
      { target: 20000,   reward: 80000 },
      { target: 50000,   reward: 150000 },
      { target: 200000,  reward: 400000 },
      { target: 1000000, reward: 800000 },
    ],
  },
  {
    id: 4, name: 'Clay Crusher', icon: '🧱',
    desc: 'Destroy {target} Clay blocks',
    metric: 'blocksByType.clay',
    tiers: [
      { target: 50,      reward: 1500 },
      { target: 500,     reward: 8000 },
      { target: 2000,    reward: 25000 },
      { target: 10000,   reward: 60000 },
      { target: 30000,   reward: 120000 },
      { target: 100000,  reward: 300000 },
      { target: 500000,  reward: 600000 },
    ],
  },
  {
    id: 5, name: 'Gravel Grinder', icon: '⬛',
    desc: 'Destroy {target} Gravel blocks',
    metric: 'blocksByType.gravel',
    tiers: [
      { target: 50,      reward: 1500 },
      { target: 500,     reward: 8000 },
      { target: 2000,    reward: 25000 },
      { target: 10000,   reward: 60000 },
      { target: 30000,   reward: 120000 },
      { target: 100000,  reward: 300000 },
      { target: 500000,  reward: 600000 },
    ],
  },
  {
    id: 6, name: 'Copper Hunter', icon: '🟤',
    desc: 'Destroy {target} Copper blocks',
    metric: 'blocksByType.copper_block',
    tiers: [
      { target: 50,      reward: 2000 },
      { target: 500,     reward: 12000 },
      { target: 2000,    reward: 35000 },
      { target: 10000,   reward: 80000 },
      { target: 30000,   reward: 150000 },
      { target: 100000,  reward: 350000 },
      { target: 500000,  reward: 700000 },
    ],
  },
  {
    id: 7, name: 'Iron Forger', icon: '⚙️',
    desc: 'Destroy {target} Iron blocks',
    metric: 'blocksByType.iron_block',
    tiers: [
      { target: 20,      reward: 2500 },
      { target: 200,     reward: 15000 },
      { target: 1000,    reward: 40000 },
      { target: 5000,    reward: 100000 },
      { target: 20000,   reward: 250000 },
      { target: 50000,   reward: 400000 },
      { target: 200000,  reward: 800000 },
    ],
  },
  {
    id: 8, name: 'Emerald Seeker', icon: '💚',
    desc: 'Destroy {target} Emerald blocks',
    metric: 'blocksByType.emerald_block',
    tiers: [
      { target: 10,      reward: 3000 },
      { target: 100,     reward: 20000 },
      { target: 500,     reward: 60000 },
      { target: 2000,    reward: 150000 },
      { target: 10000,   reward: 400000 },
      { target: 30000,   reward: 700000 },
      { target: 100000,  reward: 1500000 },
    ],
  },
  {
    id: 9, name: 'Gold Rush', icon: '🥇',
    desc: 'Destroy {target} Gold blocks',
    metric: 'blocksByType.gold_block',
    tiers: [
      { target: 5,       reward: 5000 },
      { target: 50,      reward: 30000 },
      { target: 200,     reward: 80000 },
      { target: 1000,    reward: 250000 },
      { target: 5000,    reward: 600000 },
      { target: 20000,   reward: 1200000 },
      { target: 100000,  reward: 3000000 },
    ],
  },
  {
    id: 10, name: 'Diamond Hands', icon: '💎',
    desc: 'Destroy {target} Diamond blocks',
    metric: 'blocksByType.diamond_block',
    tiers: [
      { target: 1,       reward: 5000 },
      { target: 10,      reward: 40000 },
      { target: 50,      reward: 120000 },
      { target: 200,     reward: 350000 },
      { target: 1000,    reward: 800000 },
      { target: 5000,    reward: 2000000 },
      { target: 30000,   reward: 5000000 },
    ],
  },
  {
    id: 11, name: 'Shopping Spree', icon: '🛒',
    desc: 'Buy {target} pickaxes',
    metric: 'pickaxesPurchased',
    tiers: [
      { target: 10,      reward: 2000 },
      { target: 100,     reward: 12000 },
      { target: 500,     reward: 40000 },
      { target: 2000,    reward: 100000 },
      { target: 10000,   reward: 300000 },
      { target: 50000,   reward: 700000 },
      { target: 200000,  reward: 1500000 },
    ],
  },
  {
    id: 12, name: 'Explosive Expert', icon: '💣',
    desc: 'Buy {target} TNTs',
    metric: 'tntPurchased',
    tiers: [
      { target: 5,       reward: 3000 },
      { target: 50,      reward: 20000 },
      { target: 200,     reward: 60000 },
      { target: 1000,    reward: 200000 },
      { target: 5000,    reward: 500000 },
      { target: 20000,   reward: 1000000 },
      { target: 100000,  reward: 3000000 },
    ],
  },
  {
    id: 13, name: 'High Roller', icon: '💰',
    desc: 'Earn {target} credits total',
    metric: 'totalEarned',
    tiers: [
      { target: 50000,      reward: 5000 },
      { target: 500000,     reward: 30000 },
      { target: 5000000,    reward: 150000 },
      { target: 50000000,   reward: 500000 },
      { target: 500000000,  reward: 2000000 },
    ],
  },
  {
    id: 14, name: 'Daily Player', icon: '📅',
    desc: 'Log in for {target} days',
    metric: 'loginDays',
    tiers: [
      { target: 1,   reward: 1000 },
      { target: 7,   reward: 5000 },
      { target: 30,  reward: 20000 },
      { target: 100, reward: 80000 },
      { target: 365, reward: 300000 },
    ],
  },
];

class Player {
  constructor(socketId, name) {
    this.id = socketId;
    this.name = name;

    // Credit system: split into charged (withdrawable) and in-game (non-withdrawable)
    this.chargedCredits = INITIAL_BALANCE;  // From deposits + initial (withdrawable)
    this.inGameCredits = 0;                 // From quest rewards (non-withdrawable)

    this.totalSpent = 0;
    this.totalEarned = 0;
    this.activePickaxes = []; // Currently active pickaxe IDs
    this.history = [];        // Purchase/reward history
    this.connectedAt = Date.now();
    this.walletAddress = null; // Set on wallet login

    // Quest tracking
    this.questProgress = {
      blocksDestroyed: 0,           // Total blocks destroyed
      blocksByType: {},             // { copper_block: 5, gold_block: 2, ... }
      pickaxesPurchased: 0,         // Total pickaxes bought
      pickaxesByType: {},           // { basic: 3, power: 2, ... }
      tntPurchased: 0,              // Total TNT bought
      loginDays: 1,                 // Days logged in (starts at 1)
      lastLoginDate: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    };
    this.completedQuests = new Set(); // Quest IDs completed on-chain
  }

  // Total balance (charged + in-game)
  get balance() {
    return this.chargedCredits + this.inGameCredits;
  }

  // For backward compatibility — setting balance adjusts chargedCredits
  set balance(val) {
    const diff = val - this.balance;
    this.chargedCredits += diff;
  }

  canAfford(price) {
    return this.balance >= price;
  }

  // Spend credits: deduct from inGameCredits first, then chargedCredits
  spend(price, itemName) {
    if (this.inGameCredits >= price) {
      this.inGameCredits -= price;
    } else {
      const remaining = price - this.inGameCredits;
      this.inGameCredits = 0;
      this.chargedCredits -= remaining;
    }
    this.totalSpent += price;
    this._addHistory({ type: 'purchase', item: itemName, amount: -price, time: Date.now() });
  }

  // Earn credits from gameplay (goes to chargedCredits — withdrawable)
  earn(amount, source) {
    this.chargedCredits += amount;
    this.totalEarned += amount;
    this._addHistory({ type: 'reward', item: source, amount: amount, time: Date.now() });
  }

  // Earn in-game credits from quest rewards (non-withdrawable)
  earnInGameCredits(amount, source) {
    this.inGameCredits += amount;
    this._addHistory({ type: 'quest_reward', item: source, amount: amount, time: Date.now() });
  }

  // Quest progress tracking
  trackBlockDestroyed(blockType) {
    this.questProgress.blocksDestroyed++;
    this.questProgress.blocksByType[blockType] = (this.questProgress.blocksByType[blockType] || 0) + 1;
  }

  trackPickaxePurchase(pickaxeType) {
    this.questProgress.pickaxesPurchased++;
    this.questProgress.pickaxesByType[pickaxeType] = (this.questProgress.pickaxesByType[pickaxeType] || 0) + 1;
  }

  trackTNTPurchase() {
    this.questProgress.tntPurchased++;
  }

  trackLogin() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.questProgress.lastLoginDate !== today) {
      this.questProgress.loginDays++;
      this.questProgress.lastLoginDate = today;
    }
  }

  // Get metric value from quest progress (supports dot notation like 'blocksByType.stone')
  _getMetric(metric) {
    if (metric === 'totalEarned') return Math.round(this.totalEarned);
    const parts = metric.split('.');
    let val = this.questProgress;
    for (const p of parts) {
      val = val?.[p];
      if (val === undefined) return 0;
    }
    return val || 0;
  }

  // Get quest status — returns only active quests (current tier per chain)
  // Completed quests at previous tiers are marked as completed
  getQuestStatus() {
    const result = [];

    for (const chain of QUEST_CHAINS) {
      const currentVal = this._getMetric(chain.metric);
      let activeTierFound = false;

      for (let t = 0; t < chain.tiers.length; t++) {
        const tier = chain.tiers[t];
        const questId = chain.id * 100 + (t + 1);
        const isCompleted = this.completedQuests.has(questId);
        const isMet = currentVal >= tier.target;

        if (isCompleted) {
          // Show completed quests
          result.push({
            id: questId,
            chainId: chain.id,
            tier: t + 1,
            maxTier: chain.tiers.length,
            name: `${chain.icon} ${chain.name} ${this._tierLabel(t + 1)}`,
            desc: chain.desc.replace('{target}', tier.target.toLocaleString()),
            target: tier.target,
            current: Math.min(currentVal, tier.target),
            completed: true,
            reward: tier.reward,
          });
          continue;
        }

        if (!activeTierFound) {
          // This is the current active tier for this chain
          activeTierFound = true;
          result.push({
            id: questId,
            chainId: chain.id,
            tier: t + 1,
            maxTier: chain.tiers.length,
            name: `${chain.icon} ${chain.name} ${this._tierLabel(t + 1)}`,
            desc: chain.desc.replace('{target}', tier.target.toLocaleString()),
            target: tier.target,
            current: currentVal,
            completed: false,
            reward: tier.reward,
          });
        }
        // Future tiers (not yet unlocked) are hidden — break
        break;
      }
    }

    return result;
  }

  // Get reward for a quest (returns 0 if not found or already claimed)
  getQuestReward(questId) {
    const chainId = Math.floor(questId / 100);
    const tier = questId % 100;
    const chain = QUEST_CHAINS.find(c => c.id === chainId);
    if (!chain || tier < 1 || tier > chain.tiers.length) return 0;
    return chain.tiers[tier - 1].reward;
  }

  // Check if quest target is met
  isQuestTargetMet(questId) {
    const chainId = Math.floor(questId / 100);
    const tier = questId % 100;
    const chain = QUEST_CHAINS.find(c => c.id === chainId);
    if (!chain || tier < 1 || tier > chain.tiers.length) return false;

    // Check that all previous tiers in this chain are completed
    for (let t = 1; t < tier; t++) {
      if (!this.completedQuests.has(chainId * 100 + t)) return false;
    }

    const target = chain.tiers[tier - 1].target;
    const current = this._getMetric(chain.metric);
    return current >= target;
  }

  _tierLabel(tier) {
    const labels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    return labels[tier - 1] || `T${tier}`;
  }

  _addHistory(entry) {
    this.history.push(entry);
    // Cap history to prevent memory leak
    if (this.history.length > 100) {
      this.history = this.history.slice(-50);
    }
  }

  serialize() {
    return {
      id: this.id,
      name: this.name,
      balance: Math.round(this.balance),
      chargedCredits: Math.round(this.chargedCredits),
      inGameCredits: Math.round(this.inGameCredits),
      totalSpent: Math.round(this.totalSpent),
      totalEarned: Math.round(this.totalEarned),
      activePickaxes: this.activePickaxes.length,
      profit: Math.round(this.totalEarned - this.totalSpent),
    };
  }

  serializeFull() {
    return {
      ...this.serialize(),
      history: this.history.slice(-50), // Last 50 entries
    };
  }
}

// Export quest chains for use in server/index.js
Player.QUEST_CHAINS = QUEST_CHAINS;

module.exports = Player;
