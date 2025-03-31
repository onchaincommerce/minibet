// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title MinibetSlotMachineV2
 * @dev A simple slot machine contract where users can spin for 0.001 ETH and win prizes
 * based on a pseudo-random outcome. Includes tracking of spins, wins, and losses.
 */
contract MinibetSlotMachineV2 is Ownable, Pausable, ReentrancyGuard {
    // Constants
    uint256 public constant SPIN_PRICE = 0.001 ether;
    
    // Payout tiers
    uint256 public constant JACKPOT_THRESHOLD = 1;     // 0.1% chance (1/1000)
    uint256 public constant BIG_WIN_THRESHOLD = 21;    // 2% chance (20/1000)
    uint256 public constant SMALL_WIN_THRESHOLD = 121; // 10% chance (100/1000)
    
    // Payouts
    uint256 public constant JACKPOT_PAYOUT = 0.1 ether;
    uint256 public constant BIG_WIN_PAYOUT = 0.01 ether;
    uint256 public constant SMALL_WIN_PAYOUT = 0.002 ether;
    
    // Events
    event SpinResult(
        uint256 indexed spinId,
        address indexed player,
        uint256 result,
        uint256 payout,
        uint8 tier
    );
    
    event WithdrawalMade(address indexed owner, uint256 amount);
    event UserStatsUpdated(
        address indexed user,
        uint256 spins,
        uint256 winnings,
        uint256 spent
    );

    // New events for balance logging
    event PayoutAttempted(
        address indexed player,
        uint256 amount,
        uint256 contractBalance,
        bool success
    );
    
    event InsufficientBalance(
        address indexed player,
        uint256 requiredPayout,
        uint256 contractBalance
    );
    
    // State variables
    uint256 private nonce = 0;
    uint256 private totalSpins = 0;
    mapping(address => uint256) public userNonce;
    
    // Tracking variables
    mapping(address => uint256) public userTotalSpins;
    mapping(address => uint256) public userTotalWinnings;  // in wei
    mapping(address => uint256) public userTotalSpent;     // in wei
    
    constructor() {}
    
    /**
     * @dev Receive function to allow contract to receive ETH
     */
    receive() external payable {}
    
    /**
     * @dev Generates a pseudo-random number based on block variables, user address, and nonce
     * @return A pseudo-random number between 0 and 999
     */
    function _generateRandomNumber() private returns (uint256) {
        uint256 randomNumber = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    userNonce[msg.sender],
                    nonce
                )
            )
        ) % 1000;
        
        // Increment nonces for added entropy
        userNonce[msg.sender]++;
        nonce++;
        
        return randomNumber;
    }
    
    /**
     * @dev Calculate the payout based on the random result
     * @param result The random number result
     * @return Payout amount and tier
     */
    function _calculatePayout(uint256 result) private pure returns (uint256, uint8) {
        if (result < JACKPOT_THRESHOLD) {
            return (JACKPOT_PAYOUT, 1); // Jackpot (Tier 1)
        } else if (result < BIG_WIN_THRESHOLD) {
            return (BIG_WIN_PAYOUT, 2); // Big Win (Tier 2)
        } else if (result < SMALL_WIN_THRESHOLD) {
            return (SMALL_WIN_PAYOUT, 3); // Small Win (Tier 3)
        } else {
            return (0, 4); // No Win (Tier 4)
        }
    }
    
    /**
     * @dev Updates user statistics after a spin
     * @param user The user address
     * @param payout The payout amount
     */
    function _updateUserStats(address user, uint256 payout) private {
        userTotalSpins[user]++;
        userTotalSpent[user] += SPIN_PRICE;
        if (payout > 0) {
            userTotalWinnings[user] += payout;
        }
        
        emit UserStatsUpdated(
            user,
            userTotalSpins[user],
            userTotalWinnings[user],
            userTotalSpent[user]
        );
    }
    
    /**
     * @dev Allows users to spin the slot machine by sending exactly 0.001 ETH
     * @return The spin result (random number) and payout amount
     */
    function spin() external payable whenNotPaused nonReentrant returns (uint256, uint256) {
        require(msg.value == SPIN_PRICE, "Exactly 0.001 ETH required");
        
        uint256 spinId = totalSpins++;
        uint256 result = _generateRandomNumber();
        (uint256 payout, uint8 tier) = _calculatePayout(result);
        
        emit SpinResult(spinId, msg.sender, result, payout, tier);
        
        if (payout > 0) {
            // Check contract balance before attempting payout
            uint256 contractBalance = address(this).balance;
            if (contractBalance < payout) {
                emit InsufficientBalance(msg.sender, payout, contractBalance);
                revert("Insufficient contract balance for payout");
            }
            
            (bool success, ) = payable(msg.sender).call{value: payout}("");
            emit PayoutAttempted(msg.sender, payout, contractBalance, success);
            require(success, "Payout transfer failed");
        }
        
        _updateUserStats(msg.sender, payout);
        
        return (result, payout);
    }
    
    /**
     * @dev Get user statistics
     * @param user The user address
     * @return spins Total number of spins
     * @return winnings Total ETH won
     * @return spent Total ETH spent
     * @return netProfit Net profit/loss in ETH
     */
    function getUserStats(address user) external view returns (
        uint256 spins,
        uint256 winnings,
        uint256 spent,
        int256 netProfit
    ) {
        spins = userTotalSpins[user];
        winnings = userTotalWinnings[user];
        spent = userTotalSpent[user];
        netProfit = int256(winnings) - int256(spent);
    }
    
    /**
     * @dev Allows the owner to withdraw accumulated ETH from the contract
     * @param amount The amount to withdraw (0 for all)
     */
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        uint256 withdrawAmount = amount;
        if (withdrawAmount == 0) {
            withdrawAmount = address(this).balance;
        }
        
        require(withdrawAmount <= address(this).balance, "Insufficient balance");
        
        (bool success, ) = payable(owner()).call{value: withdrawAmount}("");
        require(success, "Withdrawal transfer failed");
        
        emit WithdrawalMade(owner(), withdrawAmount);
    }
    
    /**
     * @dev Pauses the contract, preventing new spins
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpauses the contract, allowing spins again
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Returns contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
} 