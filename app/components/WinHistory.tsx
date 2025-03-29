"use client";

import { useEffect, useState, useCallback } from "react";
import { createPublicClient, http, formatEther } from "viem";
import { baseSepolia } from "wagmi/chains";
import { useAccount } from "wagmi";

// Deployed contract address
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3C4883E9eE3FAa7A014e6c656138e7dDc049E754";

// Create a backup public client using a public RPC endpoint
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

// Types for win history
type WinRecord = {
  txHash: string;
  spinId: bigint;
  result: number;
  payout: string;
  tier: number;
  timestamp: number;
};

export default function WinHistory() {
  const { address, isConnected } = useAccount();
  const [winHistory, setWinHistory] = useState<WinRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Function to fetch win history, wrapped in useCallback
  const fetchWinHistory = useCallback(async () => {
    if (!address || !isConnected) {
      setWinHistory([]);
      return;
    }
    
    setIsLoading(true);
    try {
      console.log("Fetching win history for address:", address);
      
      // Get logs for SpinResult events where the user (address) was the player
      // and the payout was greater than 0 (a win)
      const logs = await publicClient.getLogs({
        address: contractAddress as `0x${string}`,
        event: {
          anonymous: false,
          inputs: [
            { indexed: true, name: 'spinId', type: 'uint256' },
            { indexed: true, name: 'player', type: 'address' },
            { indexed: false, name: 'result', type: 'uint256' },
            { indexed: false, name: 'payout', type: 'uint256' },
            { indexed: false, name: 'tier', type: 'uint8' }
          ],
          name: 'SpinResult',
          type: 'event',
        },
        args: {
          player: address as `0x${string}`
        },
        fromBlock: 'earliest',
        toBlock: 'latest'
      });
      
      console.log(`Found ${logs.length} logs for user ${address}`);
      
      // Process logs and filter for wins (payout > 0)
      const winLogs = await Promise.all(logs.map(async (log) => {
        // Extract data from the log
        try {
          // The data layout in the log depends on which parameters are indexed
          // For SpinResult(uint256 indexed spinId, address indexed player, uint256 result, uint256 payout, uint8 tier)
          // - topics[0] = event signature hash
          // - topics[1] = spinId (indexed)
          // - topics[2] = player address (indexed)
          // - data = concatenated non-indexed params: result (32 bytes) + payout (32 bytes) + tier (32 bytes but only using 1 byte)
          
          if (!log.data || log.data === '0x') {
            console.error("Log data is empty");
            return null;
          }
          
          // Get transaction details to get timestamp
          const txReceipt = await publicClient.getTransactionReceipt({
            hash: log.transactionHash,
          });
          
          const block = await publicClient.getBlock({
            blockHash: txReceipt.blockHash,
          });
          
          // Remove the '0x' prefix from the data
          const data = log.data.startsWith('0x') ? log.data.slice(2) : log.data;
          
          // Extract result value (first 32 bytes / 64 hex chars)
          const resultHex = data.substring(0, 64);
          const result = parseInt(resultHex, 16);
          
          // Extract payout value (next 32 bytes / 64 hex chars)
          const payoutHex = data.substring(64, 128);
          const payoutWei = BigInt("0x" + payoutHex);
          const payoutEth = formatEther(payoutWei);
          
          // Extract tier value (last 32 bytes / 64 hex chars, but only using the last byte)
          // It's uint8 but padded to 32 bytes in the ABI encoding
          const tierHex = data.substring(128);
          const tier = parseInt(tierHex.slice(-2), 16);
          
          // Only include wins (tier < 4)
          if (tier >= 4 || payoutWei === BigInt(0)) {
            return null;
          }
          
          return {
            txHash: log.transactionHash,
            spinId: log.topics[1] ? BigInt(log.topics[1]) : BigInt(0),
            result,
            payout: payoutEth,
            tier,
            timestamp: Number(block.timestamp)
          };
        } catch (error) {
          console.error("Error processing log:", error);
          return null;
        }
      }));
      
      // Filter out null values and sort by timestamp (newest first)
      const validWins = winLogs.filter(Boolean) as WinRecord[];
      validWins.sort((a, b) => b.timestamp - a.timestamp);
      
      setWinHistory(validWins);
    } catch (error) {
      console.error("Error fetching win history:", error);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  // Fetch win history when address changes
  useEffect(() => {
    fetchWinHistory();
  }, [fetchWinHistory]);

  if (!isConnected) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-center text-gray-400">
        Connect your wallet to view win history
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-center">
        <div className="animate-pulse">Loading wins...</div>
      </div>
    );
  }

  if (winHistory.length === 0) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-center text-yellow-400">
        No wins found yet. Keep spinning!
      </div>
    );
  }

  // Helper function to get Win tier description
  const getTierDescription = (tier: number) => {
    switch(tier) {
      case 1: return "🎉 JACKPOT";
      case 2: return "🎊 Big Win";
      case 3: return "👍 Small Win";
      default: return "";
    }
  };

  // Format date from unix timestamp
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Check if a win is recent (within the last hour)
  const isRecentWin = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600; // 1 hour in seconds
    return timestamp > oneHourAgo;
  };

  return (
    <div className="w-full">
      <div className="flex justify-end mb-3">
        <button
          onClick={fetchWinHistory}
          disabled={isLoading}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 border border-blue-700/30 rounded-md"
        >
          {isLoading ? (
            <span className="animate-pulse">Refreshing...</span>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh History
            </>
          )}
        </button>
      </div>
      <div className="h-[450px] overflow-y-auto pr-2 scrollbar-slim">
        <div className="space-y-3">
          {winHistory.map((win, index) => (
            <div key={index} className="w-full bg-slate-900/70 p-3 rounded-lg border border-blue-700/50">
              <div className="flex justify-between items-center">
                <div className="text-sm font-bold text-yellow-400 flex items-center gap-2">
                  {getTierDescription(win.tier)}
                  {isRecentWin(win.timestamp) && (
                    <span className="text-xs bg-green-900/70 text-green-400 px-1.5 py-0.5 rounded-sm animate-pulse">
                      NEW
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {formatDate(win.timestamp)}
                </div>
              </div>
              
              <div className="mt-2 text-sm">
                <div className="font-mono text-green-400">
                  {win.payout} ETH
                </div>
                <div className="mt-1 text-xs text-blue-300">
                  Result: {win.result.toString().padStart(3, '0')}
                </div>
              </div>
              
              <div className="mt-2 text-xs">
                <a 
                  href={`https://sepolia.basescan.org/tx/${win.txHash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline text-xs"
                >
                  View TX
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 