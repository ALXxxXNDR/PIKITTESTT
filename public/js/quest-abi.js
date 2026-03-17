// PikitQuest Contract ABI — Sepolia testnet
// Deploy the contract from contracts/PikitQuest.sol and update CONTRACT_ADDRESS
window.PIKIT_QUEST = {
  // UPDATE THIS after deploying to Sepolia
  CONTRACT_ADDRESS: '0x226E2df68C41f61C781E5e2E426BEB0b0a56beD6',
  CHAIN_ID: 11155111, // Sepolia

  ABI: [
    {
      "inputs": [{"internalType": "uint256", "name": "questId", "type": "uint256"}],
      "name": "completeQuest",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "address", "name": "player", "type": "address"},
        {"internalType": "uint256", "name": "questId", "type": "uint256"}
      ],
      "name": "isCompleted",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "player", "type": "address"}],
      "name": "getCompletedQuests",
      "outputs": [{"internalType": "bool[10]", "name": "", "type": "bool[10]"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "address", "name": "player", "type": "address"},
        {"indexed": true, "internalType": "uint256", "name": "questId", "type": "uint256"},
        {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
      ],
      "name": "QuestCompleted",
      "type": "event"
    }
  ]
};
