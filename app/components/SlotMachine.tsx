"use client";

import { useState, useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { parseEther, createPublicClient, http } from "viem";
import { useNotification } from "@coinbase/onchainkit/minikit";
import { baseSepolia } from "wagmi/chains";
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

  // Manually check transaction status
  const checkTransactionStatus = async () => {
    if (!txHash) {
      setError("No transaction to check");
      return;
    }
    
    setIsSpinning(true);
    setError(null);
    
    try {
      console.log("Manually checking transaction status:", txHash);
      
      // Use backup client for more reliable direct connection
      const receipt = await backupPublicClient.getTransactionReceipt({ 
        hash: txHash as `0x${string}` 
      });
      
      if (receipt) {
        console.log("Got receipt in manual check:", receipt);
        processReceipt(receipt);
      } else {
        setError("Transaction still pending. Please try checking again later or view on BaseScan.");
      }
    } catch (error) {
      console.error("Error in manual check:", error);
      setError("Couldn't verify transaction. Try viewing on BaseScan.");
    } finally {
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
    const symbols = ['🎰', '7️⃣', '💎', '🍒', '🎲', '🔔'];
    return (
      <div className={`slot-spin-content ${isSpinning ? 'spinning' : ''}`}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="slot-icon">
            {symbols[Math.floor(Math.random() * symbols.length)]}
          </div>
        ))}
      </div>
    );
  };

  const createCoins = () => {
    if (tier !== 1 && tier !== 2) return null;
    
    return Array.from({ length: tier === 1 ? 20 : 10 }).map((_, i: number) => (
      <div 
        key={i}
        className="coin absolute text-2xl"
        style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 0.5}s`,
          animationDuration: `${1 + Math.random()}s`
        }}
      >
        {Math.random() > 0.5 ? '💰' : '🪙'}
      </div>
    ));
  };

  return (
    <>
      <div className={`flex flex-col items-center justify-center p-6 pixel-card w-full max-w-[520px] mx-auto ${winClass}`}>
        
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 w-full h-48 flex flex-col items-center justify-center rounded-lg mb-6 relative border-4 border-yellow-600 overflow-hidden casino-border">
          {isSpinning ? (
            <div className="flex justify-center items-center gap-4 z-10">
              <div className="slot-spin text-4xl">
                {renderSlotSymbols()}
              </div>
              <div className="slot-spin text-4xl">
                {renderSlotSymbols()}
              </div>
              <div className="slot-spin text-4xl">
                {renderSlotSymbols()}
              </div>
            </div>
          ) : (
            <>
              <div className="text-xl font-bold text-white z-20">
                {getResultText()}
              </div>
              
              {result !== null && (
                <div className="text-xl mt-2 text-yellow-400 font-mono">
                  {result.toString().padStart(3, '0')}
                </div>
              )}
              
              {createCoins()}
            </>
          )}
          
          {getPayoutText() && txHash && (
            <div className="absolute bottom-2 font-semibold text-lg">
              <a 
                href={`https://sepolia.basescan.org/tx/${txHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-400 hover:text-yellow-300 transition-colors flex items-center justify-center gap-1 border-b border-green-400/50 hover:border-yellow-300/70 pb-0.5"
              >
                {getPayoutText()} <span className="inline-block">🔗</span>
              </a>
            </div>
          )}
        </div>
        
        {txPending && txHash ? (
          <button
            onClick={checkTransactionStatus}
            disabled={isSpinning}
            className={`px-8 py-4 font-bold pixel-button
              ${isSpinning 
                ? "opacity-50 cursor-not-allowed" 
                : ""
              }`}
          >
            {isSpinning ? "Checking..." : "Check Result"}
          </button>
        ) : (
          <button
            onClick={handleSpin}
            disabled={!isConnected || isSpinning || !isRightNetwork || !walletClient}
            className="px-8 py-4 font-bold transform pixel-button"
          >
            {isSpinning ? "Spinning..." : "Spin (0.001 ETH)"}
          </button>
        )}
        
        {isConnected && (
          <div className="mt-6 text-sm pixel-card w-full">
            <p className="text-center font-medium mb-2 text-blue-300 uppercase">Winning Combinations</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-right">Jackpot (0.1%):</div>
              <div className="font-bold text-yellow-400">0.1 ETH</div>
              <div className="text-right">Big Win (2%):</div>
              <div className="font-bold text-green-400">0.01 ETH</div>
              <div className="text-right">Small Win (10%):</div>
              <div className="font-bold text-blue-400">0.002 ETH</div>
            </div>
          </div>
        )}

        <div className="mt-6 text-xs text-blue-300">
          <p className="text-center">
            Connected to contract on Base Sepolia<br/>
            Contract: {contractAddress.slice(0,6)}...{contractAddress.slice(-4)}
          </p>
        </div>
        
        {/* Simple transaction link for all cases */}
        {txHash && (!tier || tier >= 4) && (
          <div className="mt-2 text-xs">
            <a 
              href={`https://sepolia.basescan.org/tx/${txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-yellow-400 hover:text-yellow-300 underline"
            >
              View Transaction on BaseScan
            </a>
          </div>
        )}
      </div>
      
      <JackpotCelebration isVisible={showJackpot} />
    </>
  );
} 