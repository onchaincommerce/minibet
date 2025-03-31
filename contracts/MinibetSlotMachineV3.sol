// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title MinibetSlotMachineV3
 * @dev A slot machine contract with a 200-spin threshold for jackpot activation
 */
contract MinibetSlotMachineV3 is Ownable, Pausable, ReentrancyGuard {
    // Constants
    uint256 public constant SPIN_PRICE = 0.001 ether;
    uint256 public constant JACKPOT_UNLOCK_THRESHOLD = 200;
    
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
    
    event JackpotUnlocked(uint256 spinCount);
    event WithdrawalMade(address indexed owner, uint256 amount);
    event UserStatsUpdated(
        address indexed user,
        uint256 spins,
        uint256 winnings,
        uint256 spent
    );
    
    // State variables
    uint256 private nonce = 0;
    uint256 public totalSpins = 0;
    bool public jackpotUnlocked = false;
    mapping(address => uint256) public userNonce;
    
    // Tracking variables
    mapping(address => uint256) public userTotalSpins;
    mapping(address => uint256) public userTotalWinnings;
    mapping(address => uint256) public userTotalSpent;
    
    constructor() {}
    
    receive() external payable {}
    
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
        
        userNonce[msg.sender]++;
        nonce++;
        
        return randomNumber;
    }
    
    function _calculatePayout(uint256 result) private view returns (uint256, uint8) {
        // Check for jackpot first
        if (result < JACKPOT_THRESHOLD) {
            // If jackpot isn't unlocked yet, treat as big win
            if (!jackpotUnlocked) {
                return (BIG_WIN_PAYOUT, 2);
            }
            return (JACKPOT_PAYOUT, 1);
        } else if (result < BIG_WIN_THRESHOLD) {
            return (BIG_WIN_PAYOUT, 2);
        } else if (result < SMALL_WIN_THRESHOLD) {
            return (SMALL_WIN_PAYOUT, 3);
        } else {
            return (0, 4);
        }
    }
    
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
    
    function spin() external payable whenNotPaused nonReentrant returns (uint256, uint256) {
        require(msg.value == SPIN_PRICE, "Exactly 0.001 ETH required");
        
        // Increment total spins
        totalSpins++;
        
        // Check if we just hit the jackpot unlock threshold
        if (totalSpins == JACKPOT_UNLOCK_THRESHOLD) {
            jackpotUnlocked = true;
            emit JackpotUnlocked(totalSpins);
        }
        
        uint256 result = _generateRandomNumber();
        (uint256 payout, uint8 tier) = _calculatePayout(result);
        
        emit SpinResult(totalSpins - 1, msg.sender, result, payout, tier);
        
        if (payout > 0) {
            require(address(this).balance >= payout, "Insufficient contract balance");
            (bool success, ) = payable(msg.sender).call{value: payout}("");
            require(success, "Payout transfer failed");
        }
        
        _updateUserStats(msg.sender, payout);
        
        return (result, payout);
    }
    
    function getJackpotStatus() public view returns (
        bool isUnlocked,
        uint256 currentSpins,
        uint256 spinsNeeded
    ) {
        return (
            jackpotUnlocked,
            totalSpins,
            jackpotUnlocked ? 0 : JACKPOT_UNLOCK_THRESHOLD - totalSpins
        );
    }
    
    function getUserStats(address user) public view returns (
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
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
} 