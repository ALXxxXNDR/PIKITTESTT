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

    /// @notice Complete a quest (records on-chain)
    /// @param questId The quest ID (1-9999)
    function completeQuest(uint256 questId) external {
        require(questId >= 1 && questId <= 9999, "Invalid quest ID");
        require(!questCompleted[msg.sender][questId], "Quest already completed");

        questCompleted[msg.sender][questId] = true;
        totalCompletions[questId]++;

        emit QuestCompleted(msg.sender, questId, block.timestamp);
    }

    /// @notice Check if a player has completed a specific quest
    function isCompleted(address player, uint256 questId) external view returns (bool) {
        return questCompleted[player][questId];
    }

    /// @notice Batch check: returns completion status for multiple quest IDs
    function batchIsCompleted(address player, uint256[] calldata questIds) external view returns (bool[] memory) {
        bool[] memory results = new bool[](questIds.length);
        for (uint256 i = 0; i < questIds.length; i++) {
            results[i] = questCompleted[player][questIds[i]];
        }
        return results;
    }
}
