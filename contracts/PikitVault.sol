// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

contract PikitVault {
    IERC20 public usdc;
    address public owner;

    // Rates
    uint256 public constant DEPOSIT_RATE = 10000;  // 1 USDC = 10,000 credits
    uint256 public constant WITHDRAW_RATE = 10500; // 10,500 credits = 1 USDC
    uint256 public constant USDC_DECIMALS = 6;

    // Credit balances (tracked on-chain for transparency)
    mapping(address => uint256) public creditBalance;

    // Events
    event Deposited(address indexed player, uint256 usdcAmount, uint256 creditsReceived);
    event Withdrawn(address indexed player, uint256 creditsBurned, uint256 usdcReceived);
    event OwnerWithdraw(address indexed owner, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
        owner = msg.sender;
    }

    /// @notice Deposit USDC to get credits (1 USDC = 10,000 credits)
    /// @param usdcAmount Amount of USDC in smallest unit (6 decimals)
    function deposit(uint256 usdcAmount) external {
        require(usdcAmount > 0, "Amount must be > 0");
        require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "Transfer failed");

        uint256 credits = (usdcAmount * DEPOSIT_RATE) / (10 ** USDC_DECIMALS);
        creditBalance[msg.sender] += credits;

        emit Deposited(msg.sender, usdcAmount, credits);
    }

    /// @notice Withdraw credits to get USDC (10,500 credits = 1 USDC)
    /// @param creditAmount Amount of credits to burn
    function withdraw(uint256 creditAmount) external {
        require(creditAmount >= WITHDRAW_RATE, "Minimum 10500 credits");
        require(creditBalance[msg.sender] >= creditAmount, "Insufficient credits");

        uint256 usdcAmount = (creditAmount * (10 ** USDC_DECIMALS)) / WITHDRAW_RATE;
        require(usdc.balanceOf(address(this)) >= usdcAmount, "Vault insufficient USDC");

        creditBalance[msg.sender] -= creditAmount;
        require(usdc.transfer(msg.sender, usdcAmount), "Transfer failed");

        emit Withdrawn(msg.sender, creditAmount, usdcAmount);
    }

    /// @notice Get credit balance for a player
    function getCredits(address player) external view returns (uint256) {
        return creditBalance[player];
    }

    /// @notice Owner can withdraw excess USDC
    function ownerWithdraw(uint256 amount) external onlyOwner {
        require(usdc.transfer(owner, amount), "Transfer failed");
        emit OwnerWithdraw(owner, amount);
    }
}
