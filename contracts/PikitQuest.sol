// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title PikitQuest - On-chain quest completion tracker
/// @notice Players call completeQuest() to record quest completion on Sepolia
contract PikitQuest {
    // Quest completion: address => questId => completed
    mapping(address => mapping(uint256 => bool)) public questCompleted;

    // Total completions per quest (for leaderboard/stats)
    mapping(uint256 => uint256) public totalCompletions;

    // Events
    event QuestCompleted(address indexed player, uint256 indexed questId, uint256 timestamp);

    // Valid quest IDs: 1-10
    uint256 public constant MAX_QUEST_ID = 10;

    /// @notice Complete a quest (records on-chain)
    /// @param questId The quest ID (1-10)
    function completeQuest(uint256 questId) external {
        require(questId >= 1 && questId <= MAX_QUEST_ID, "Invalid quest ID");
        require(!questCompleted[msg.sender][questId], "Quest already completed");

        questCompleted[msg.sender][questId] = true;
        totalCompletions[questId]++;

        emit QuestCompleted(msg.sender, questId, block.timestamp);
    }

    /// @notice Check if a player has completed a specific quest
    function isCompleted(address player, uint256 questId) external view returns (bool) {
        return questCompleted[player][questId];
    }

    /// @notice Get all completed quest IDs for a player
    function getCompletedQuests(address player) external view returns (bool[10] memory) {
        bool[10] memory results;
        for (uint256 i = 0; i < 10; i++) {
            results[i] = questCompleted[player][i + 1];
        }
        return results;
    }
}
