const { INITIAL_BALANCE } = require('./constants');

class Player {
  constructor(socketId, name) {
    this.id = socketId;
    this.name = name;
    this.balance = INITIAL_BALANCE;
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

  canAfford(price) {
    return this.balance >= price;
  }

  spend(price, itemName) {
    this.balance -= price;
    this.totalSpent += price;
    this._addHistory({ type: 'purchase', item: itemName, amount: -price, time: Date.now() });
  }

  earn(amount, source) {
    this.balance += amount;
    this.totalEarned += amount;
    this._addHistory({ type: 'reward', item: source, amount: amount, time: Date.now() });
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

  // Get quest status for all 10 quests
  getQuestStatus() {
    const q = this.questProgress;
    return [
      { id: 1, name: 'First Steps', desc: 'Destroy 10 blocks', target: 10, current: q.blocksDestroyed, completed: this.completedQuests.has(1) },
      { id: 2, name: 'Block Breaker', desc: 'Destroy 100 blocks', target: 100, current: q.blocksDestroyed, completed: this.completedQuests.has(2) },
      { id: 3, name: 'Copper Hunter', desc: 'Destroy 20 Copper blocks', target: 20, current: q.blocksByType['copper_block'] || 0, completed: this.completedQuests.has(3) },
      { id: 4, name: 'Gold Rush', desc: 'Destroy 5 Gold blocks', target: 5, current: q.blocksByType['gold_block'] || 0, completed: this.completedQuests.has(4) },
      { id: 5, name: 'Diamond Hands', desc: 'Destroy 1 Diamond block', target: 1, current: q.blocksByType['diamond_block'] || 0, completed: this.completedQuests.has(5) },
      { id: 6, name: 'Shopping Spree', desc: 'Buy 10 pickaxes', target: 10, current: q.pickaxesPurchased, completed: this.completedQuests.has(6) },
      { id: 7, name: 'Power User', desc: 'Buy 5 Power Pickaxes', target: 5, current: q.pickaxesByType['power'] || 0, completed: this.completedQuests.has(7) },
      { id: 8, name: 'Explosive Expert', desc: 'Buy 3 TNTs', target: 3, current: q.tntPurchased, completed: this.completedQuests.has(8) },
      { id: 9, name: 'Daily Check-in', desc: 'Log in for 1 day', target: 1, current: q.loginDays, completed: this.completedQuests.has(9) },
      { id: 10, name: 'High Roller', desc: 'Earn 50,000 credits total', target: 50000, current: Math.round(this.totalEarned), completed: this.completedQuests.has(10) },
    ];
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

module.exports = Player;
