"use client";

import { useState, useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { parseEther, createPublicClient, http } from "viem";
import { useNotification } from "@coinbase/onchainkit/minikit";
import { baseSepolia } from "wagmi/chains";
import Image from "next/image";
import JackpotCelebration from "./JackpotCelebration";

// This is the deployed contract address
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3C4883E9eE3FAa7A014e6c656138e7dDc049E754";

// Create a backup public client using a public RPC endpoint
const backupPublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

// Contract ABI with expanded event details
const contractAbi = [
  {
    inputs: [],
    name: "spin",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    stateMutability: "payable",
    type: "function"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "spinId", type: "uint256" },
      { indexed: true, internalType: "address", name: "player", type: "address" },
      { indexed: false, internalType: "uint256", name: "result", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "payout", type: "uint256" },
      { indexed: false, internalType: "uint8", name: "tier", type: "uint8" }
    ],
    name: "SpinResult",
    type: "event"
  }
];

// Alternative event signatures to try (Solidity compilers might generate different signatures)
const EVENT_SIGNATURES = [
  "0x8b2f242d32371a41f80f3dcf16124d8271bbedc9ded98b620290046aac8a1d8c", // Actual observed signature from contract logs
  "0x5c4a8f396d7cd416a8bd3a08e0b15ee3a667a30511f11458789b5440c3c97b39", // Standard keccak256 calculation
  "0xe74057471b97cf835463160e8c3dc1c10607f253359874c66f3691ab3df705ee"  // Alternative format
];

// Define a more specific type for the receipt
type TransactionReceipt = {
  logs?: Array<{
    address: string;
    topics?: string[];
    data?: string;
    blockNumber?: number | bigint;
    blockHash?: string;
    transactionHash: string;
  }>;
  [key: string]: unknown;
};

export default function SlotMachine() {
  const { isConnected, address, chainId } = useAccount();
  const [result, setResult] = useState<number | null>(null);
  const [payout, setPayout] = useState<string>("0");
  const [tier, setTier] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isTxSuccess, setIsTxSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txPending, setTxPending] = useState(false);
  const sendNotification = useNotification();
  const [winClass, setWinClass] = useState<string>("");
  const [showJackpot, setShowJackpot] = useState(false);
  const [showShareButton, setShowShareButton] = useState(false);
  
  // Get wallet client to sign transactions
  const { data: walletClient } = useWalletClient();
  
  // Check if user is on the right network (Base Sepolia)
  const isRightNetwork = chainId === baseSepolia.id;

  // Reset state when connecting/disconnecting
  useEffect(() => {
    if (!isConnected) {
      setResult(null);
      setPayout("0");
      setTier(null);
      setIsTxSuccess(false);
      setError(null);
      setTxHash(null);
      setTxPending(false);
      setWinClass("");
      setShowJackpot(false);
      setShowShareButton(false);
    }
  }, [isConnected]);

  // Auto-hide jackpot celebration after some time
  useEffect(() => {
    if (showJackpot) {
      const timer = setTimeout(() => {
        setShowJackpot(false);
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [showJackpot]);

  // Show share button after a win
  useEffect(() => {
    if (tier !== null && tier < 4) {
      setShowShareButton(true);
    } else {
      setShowShareButton(false);
    }
  }, [tier]);

  // Process transaction receipt to extract SpinResult event
  const processReceipt = (receipt: TransactionReceipt) => {
    if (!receipt) {
      console.error("No receipt provided");
      return false;
    }
    
    if (!receipt.logs || receipt.logs.length === 0) {
      console.error("No logs found in receipt");
      setError("Transaction confirmed but no event logs found. View on BaseScan for details.");
      return false;
    }
    
    console.log(`Processing receipt with ${receipt.logs.length} logs`);
    
    for (const log of receipt.logs) {
      console.log("Examining log:", {
        address: log.address,
        topics: log.topics,
        data: log.data
      });
      
      // Skip logs not from our contract
      if (log.address.toLowerCase() !== contractAddress.toLowerCase()) {
        console.log("Skipping log - wrong contract address");
        continue;
      }
      
      // Check if this log matches any of our possible event signatures
      const matchesEvent = log.topics?.[0] && EVENT_SIGNATURES.includes(log.topics[0]);
      if (!matchesEvent) {
        console.log("Skipping log - wrong event signature", log.topics?.[0]);
        continue;
      }
      
      console.log("Found matching SpinResult event!");
      
      try {
        // The data layout in the log depends on which parameters are indexed
        // For SpinResult(uint256 indexed spinId, address indexed player, uint256 result, uint256 payout, uint8 tier)
        // - topics[0] = event signature hash
        // - topics[1] = spinId (indexed)
        // - topics[2] = player address (indexed)
        // - data = concatenated non-indexed params: result (32 bytes) + payout (32 bytes) + tier (32 bytes but only using 1 byte)
        
        // Make sure we have data
        if (!log.data || log.data === '0x') {
          console.error("Log data is empty");
          continue;
        }
        
        // Remove the '0x' prefix from the data
        const data = log.data.startsWith('0x') ? log.data.slice(2) : log.data;
        
        console.log("Log data length:", data.length);
        
        // Extract result value (first 32 bytes / 64 hex chars)
        const resultHex = data.substring(0, 64);
        const result = parseInt(resultHex, 16);
        
        // Extract payout value (next 32 bytes / 64 hex chars)
        const payoutHex = data.substring(64, 128);
        const payoutWei = BigInt("0x" + payoutHex);
        const payoutEth = Number(payoutWei) / 1e18;
        
        // Extract tier value (last 32 bytes / 64 hex chars, but only using the last byte)
        // It's uint8 but padded to 32 bytes in the ABI encoding
        const tierHex = data.substring(128);
        const tier = parseInt(tierHex.slice(-2), 16); // take just the last byte
        
        console.log("Parsed data:", {
          resultHex,
          payoutHex,
          tierHex,
          result,
          payoutWei: payoutWei.toString(),
          payoutEth,
          tier
        });
        
        // Update UI
        setResult(result);
        setPayout(payoutEth.toString());
        setTier(tier);
        setIsTxSuccess(true);
        setTxPending(false);
        
        // Set win animation class
        if (tier === 1) {
          setWinClass("jackpot");
          setShowJackpot(true);
        } else if (tier === 2 || tier === 3) {
          setWinClass("win-flash");
        }
        
        // Trigger notification for wins
        if (tier < 4 && address) {
          sendNotification({
            title: tier === 1 ? "JACKPOT!" : tier === 2 ? "Big Win!" : "Small Win!",
            body: `You won ${payoutEth} ETH! TX: ${txHash ? txHash.slice(0, 6) + '...' + txHash.slice(-4) : ''}`
          });
        }
        
        return true;
      } catch (error) {
        console.error("Error processing log data:", error);
      }
    }
    
    // If we get here, we couldn't parse any SpinResult events
    // Try one last approach - check if we have a log from our contract and just try to extract data
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === contractAddress.toLowerCase()) {
        console.log("Last resort: Found a log from our contract");
        
        try {
          // Print detailed log information for debugging
          console.log("Full log:");
          // Handle BigInt serialization for console logging
          const safeLog = {
            address: log.address,
            topics: log.topics ? [...log.topics] : [],
            data: log.data,
            blockNumber: log.blockNumber ? log.blockNumber.toString() : null,
            blockHash: log.blockHash,
            transactionHash: log.transactionHash
          };
          console.log(JSON.stringify(safeLog, null, 2));
          
          // If we have topics and data fields, make a best effort to extract spin data
          if (log.data && log.data.length >= 2) { // Must have at least '0x'
            console.log("Data available, attempting to parse");
            
            // Different potential data formats
            const dataWithoutPrefix = log.data.startsWith('0x') ? log.data.slice(2) : log.data;
            
            // Try to find an embedded numeric value that might be the result
            let result = 0;
            let payout = "0";
            let tierValue = 4; // default to no win
            
            // Try to extract based on common patterns
            if (dataWithoutPrefix.length >= 64) { // At least one 32-byte value
              // Try different offset positions (every 64 chars = 32 bytes)
              for (let i = 0; i < Math.min(dataWithoutPrefix.length, 192); i += 64) {
                if (i + 64 <= dataWithoutPrefix.length) {
                  const value = parseInt(dataWithoutPrefix.substring(i, i + 64), 16);
                  console.log(`Data chunk at offset ${i}:`, value);
                  
                  // Look for a value between 0-999 which is likely the result
                  if (value >= 0 && value < 1000) {
                    result = value;
                    console.log("Found potential result:", result);
                    
                    // Calculate tier based on contract thresholds
                    if (result < 1) {
                      tierValue = 1; // Jackpot
                      payout = "0.1";
                    } else if (result < 21) {
                      tierValue = 2; // Big Win
                      payout = "0.01";
                    } else if (result < 121) {
                      tierValue = 3; // Small Win
                      payout = "0.002";
                    } else {
                      tierValue = 4; // No win
                      payout = "0";
                    }
                    
                    // Update UI with best-effort data
                    setResult(result);
                    setPayout(payout);
                    setTier(tierValue);
                    setIsTxSuccess(true);
                    setTxPending(false);
                    setError(null);
                    
                    console.log("Used best-effort data extraction, success!");
                    return true;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("Error in last-resort parsing:", e);
        }
      }
    }
    
    // If we reach here, we've tried everything
    setError("Couldn't find spin result in transaction logs. View on BaseScan for details.");
    return false;
  };

  // Handle the spin function
  const handleSpin = async () => {
    if (!isConnected || isSpinning || !walletClient) return;
    
    // Check if on the right network
    if (!isRightNetwork) {
      setError(`Please switch to Base Sepolia testnet`);
      return;
    }
    
    setIsSpinning(true);
    setIsTxSuccess(false);
    setError(null);
    setTxHash(null);
    setResult(null);
    setPayout("0");
    setTier(null);
    setTxPending(false);
    setWinClass("");
    setShowJackpot(false);
    
    try {
      console.log("Starting spin transaction");
      
      // Directly use the walletClient to send the transaction
      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: contractAbi,
        functionName: 'spin',
        value: parseEther('0.001')
      });
      
      console.log("Transaction submitted:", hash);
      setTxHash(hash);
      setTxPending(true);
      
      // Wait for transaction receipt with timeout
      try {
        // First try using the backup client (more reliable direct connection)
        console.log("Waiting for receipt with backup client...");
        const receipt = await backupPublicClient.waitForTransactionReceipt({ 
          hash,
          timeout: 60_000 // Wait up to 1 minute
        });
        
        console.log("Transaction receipt received:", receipt);
        processReceipt(receipt);
      } catch (receiptError) {
        console.error("Error getting receipt:", receiptError);
        
        // Don't try to simulate - set an error message and let the user check manually
        setError("Transaction submitted but waiting for confirmation. Check BaseScan for status.");
      }
    } catch (error: unknown) {
      console.error("Error spinning:", error);
      // Handle user rejection separately
      if (error instanceof Error && error.message && error.message.includes('rejected')) {
        setError("Transaction rejected. Please try again.");
        setTxPending(false);
      } else {
        setError(`Transaction failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    } finally {
      // Always ensure we exit the spinning state
      console.log("Exiting spinning state");
      setIsSpinning(false);
    }
  };

  const getResultText = () => {
    if (!isConnected) return "Connect wallet to play";
    if (!isRightNetwork) return "Switch to Base Sepolia to play";
    if (isSpinning) return "Spinning...";
    if (error) return error;
    if (txPending) return "Transaction pending. Check BaseScan for status.";
    
    if (tier === null) return "Spin to play!";

    switch(tier) {
      case 1: return "🎉 JACKPOT! 🎉";
      case 2: return "🎊 Big Win! 🎊";
      case 3: return "👍 Small Win!";
      case 4: return "😞 No Win. Try again!";
      default: return "Spin to play!";
    }
  };

  const getPayoutText = () => {
    if (tier === null || !isTxSuccess) return "";
    return `You won ${payout} ETH`;
  };

  const renderSlotSymbols = () => {
    // Display winning fairy combination for any win
    if (isConnected && isTxSuccess && tier !== null && tier < 4) {
      return (
        <div className="flex justify-center items-center">
          <div className="grid grid-cols-3 gap-4 items-center justify-items-center">
            <div className="slot-symbol">
              <Image src="/fairy.png" alt="Fairy" width={64} height={64} className="w-full h-full object-contain p-1" />
            </div>
            <div className="slot-symbol">
              <Image src="/fairy.png" alt="Fairy" width={64} height={64} className="w-full h-full object-contain p-1" />
            </div>
            <div className="slot-symbol">
              <Image src="/fairy.png" alt="Fairy" width={64} height={64} className="w-full h-full object-contain p-1" />
            </div>
          </div>
        </div>
      );
    } 
    
    // Display default symbols when not spinning and no win
    return (
      <div className="flex justify-center items-center">
        <div className="grid grid-cols-3 gap-2 items-center justify-items-center">
          {isConnected && isTxSuccess && result !== null ? (
            <>
              <div className="slot-symbol">
                <Image src="/mario_8bit.png" alt="Mario" width={64} height={64} className="w-full h-full object-contain p-1" />
              </div>
              <div className="slot-symbol">
                <Image src="/base-logo-8bit.png" alt="Base" width={64} height={64} className="w-full h-full object-contain p-1" />
              </div>
              <div className="slot-symbol">
                <Image src="/mario_8bit.png" alt="Mario" width={64} height={64} className="w-full h-full object-contain p-1" />
              </div>
            </>
          ) : (
            <>
              <div className="slot-symbol">
                <Image src="/base-logo-8bit.png" alt="Base" width={64} height={64} className="w-full h-full object-contain p-1" />
              </div>
              <div className="slot-symbol">
                <Image src="/base-logo-8bit.png" alt="Base" width={64} height={64} className="w-full h-full object-contain p-1" />
              </div>
              <div className="slot-symbol">
                <Image src="/base-logo-8bit.png" alt="Base" width={64} height={64} className="w-full h-full object-contain p-1" />
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Generate share text based on win tier
  const getShareText = () => {
    const baseUrl = "https://minibet.vercel.app";
    let text = "";
    
    if (tier === 1) {
      text = `🎰 JACKPOT! 🎰 I just won 0.1 ETH playing Minibet on @base! Try your luck at ${baseUrl}`;
    } else if (tier === 2) {
      text = `🎰 Big Win! 🎰 I just won 0.01 ETH playing Minibet on @base! Try your luck at ${baseUrl}`;
    } else if (tier === 3) {
      text = `🎰 I just won on Minibet, the slot machine on @base! Try your luck at ${baseUrl}`;
    }
    
    return encodeURIComponent(text);
  };
  
  // Share win on X (formerly Twitter)
  const handleShare = () => {
    const shareUrl = `https://twitter.com/intent/tweet?text=${getShareText()}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="pixel-card relative overflow-hidden">
      {/* Show jackpot celebration */}
      <JackpotCelebration 
        isVisible={showJackpot} 
        payoutAmount={payout}
        tier={tier}
      />
      
      <div className={`relative z-10 flex flex-col items-center p-4 ${winClass}`}>
        <div className="mb-6 w-full text-center">
          {/* Display result/payout */}
          {isConnected && isTxSuccess && result !== null && (
            <>
              <div className="text-xl font-bold mb-2">
                {getResultText()}
              </div>
              {tier !== null && tier < 4 && (
                <div className="text-2xl font-bold text-yellow-400">
                  {getPayoutText()}
                </div>
              )}
              
              {/* Share button - Updated styling */}
              {showShareButton && (
                <button
                  onClick={handleShare}
                  className="mt-4 bg-black hover:bg-zinc-800 text-white font-bold py-2 px-6 rounded pixel-button-alt flex items-center justify-center transition-all duration-200 transform hover:scale-105"
                >
                  <span className="mr-2">Share Win</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z"/>
                  </svg>
                </button>
              )}
            </>
          )}
          
          {/* Error message */}
          {error && (
            <div className="text-red-500 text-sm mt-2">{error}</div>
          )}
        </div>
        
        {/* Slot machine display */}
        <div className="w-full mb-6">
          <div className="bg-gray-900 border-4 border-yellow-500 rounded-lg p-4 flex justify-center items-center relative overflow-hidden h-40">
            {renderSlotSymbols()}
            
            {/* Enhanced spinning animation with pixel art */}
            {isSpinning && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="flex justify-center items-center gap-4">
                  <div className="slot-machine-reel">
                    <div className="slot-machine-symbols">
                      <div className="slot-symbol-container">
                        <Image src="/mario_8bit.png" alt="Mario" width={64} height={64} className="slot-symbol-img" />
                      </div>
                      <div className="slot-symbol-container">
                        <Image src="/fairy.png" alt="Fairy" width={64} height={64} className="slot-symbol-img" />
                      </div>
                      <div className="slot-symbol-container">
                        <Image src="/base-logo-8bit.png" alt="Base" width={64} height={64} className="slot-symbol-img" />
                      </div>
                      <div className="slot-symbol-container">
                        <Image src="/mario_8bit.png" alt="Mario" width={64} height={64} className="slot-symbol-img" />
                      </div>
                      <div className="slot-symbol-container">
                        <Image src="/fairy.png" alt="Fairy" width={64} height={64} className="slot-symbol-img" />
                      </div>
                    </div>
                  </div>
                  <div className="slot-machine-reel delay-100">
                    <div className="slot-machine-symbols">
                      <div className="slot-symbol-container">
                        <Image src="/fairy.png" alt="Fairy" width={64} height={64} className="slot-symbol-img" />
                      </div>
                      <div className="slot-symbol-container">
                        <Image src="/base-logo-8bit.png" alt="Base" width={64} height={64} className="slot-symbol-img" />
                      </div>
                      <div className="slot-symbol-container">
                        <Image src="/mario_8bit.png" alt="Mario" width={64} height={64} className="slot-symbol-img" />
                      </div>
                      <div className="slot-symbol-container">
                        <Image src="/fairy.png" alt="Fairy" width={64} height={64} className="slot-symbol-img" />
                      </div>
                      <div className="slot-symbol-container">
                        <Image src="/base-logo-8bit.png" alt="Base" width={64} height={64} className="slot-symbol-img" />
                      </div>
                    </div>
                  </div>
                  <div className="slot-machine-reel delay-200">
                    <div className="slot-machine-symbols">
                      <div className="slot-symbol-container">
                        <Image src="/base-logo-8bit.png" alt="Base" width={64} height={64} className="slot-symbol-img" />
                      </div>
                      <div className="slot-symbol-container">
                        <Image src="/mario_8bit.png" alt="Mario" width={64} height={64} className="slot-symbol-img" />
                      </div>
                      <div className="slot-symbol-container">
                        <Image src="/fairy.png" alt="Fairy" width={64} height={64} className="slot-symbol-img" />
                      </div>
                      <div className="slot-symbol-container">
                        <Image src="/base-logo-8bit.png" alt="Base" width={64} height={64} className="slot-symbol-img" />
                      </div>
                      <div className="slot-symbol-container">
                        <Image src="/mario_8bit.png" alt="Mario" width={64} height={64} className="slot-symbol-img" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Transaction pending overlay */}
            {txPending && !isSpinning && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-lg text-white">
                  <div className="animate-spin mb-2 mx-auto h-8 w-8 border-t-2 border-b-2 border-white rounded-full"></div>
                  <div>Transaction Pending</div>
                  {txHash && (
                    <a 
                      href={`https://sepolia.basescan.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 text-sm underline"
                    >
                      View on BaseScan
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Spin button */}
        <button
          className={`pixel-button w-full py-3 text-lg font-bold ${
            !isConnected || !isRightNetwork || isSpinning || txPending
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-opacity-90"
          }`}
          onClick={handleSpin}
          disabled={!isConnected || !isRightNetwork || isSpinning || txPending}
        >
          {!isConnected ? (
            "Connect Wallet to Play"
          ) : !isRightNetwork ? (
            "Switch to Base Sepolia"
          ) : isSpinning || txPending ? (
            "Please wait..."
          ) : (
            "SPIN (0.001 ETH)"
          )}
        </button>
        
        {/* Network info */}
        {isConnected && !isRightNetwork && (
          <div className="text-yellow-400 text-xs mt-2">
            Please switch to Base Sepolia testnet to play
          </div>
        )}
      </div>
    </div>
  );
} 