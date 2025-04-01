"use client";

import { useEffect, useState, useCallback } from "react";
import { createPublicClient, http, formatEther } from "viem";
import { base } from "wagmi/chains";
import { useAccount } from "wagmi";

// Deployed contract address
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x79931DEa9E94F1fe240DCD7Cbf93f853B681bC7C";

// Create a public client using a public RPC endpoint
const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
});

// Contract ABI for user stats
const userStatsAbi = [
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserStats",
    outputs: [
      { internalType: "uint256", name: "spins", type: "uint256" },
      { internalType: "uint256", name: "winnings", type: "uint256" },
      { internalType: "uint256", name: "spent", type: "uint256" },
      { internalType: "int256", name: "netProfit", type: "int256" }
    ],
    stateMutability: "view",
    type: "function"
  }
];

// Types for win history
type WinRecord = {
  spinId: number;
  result: number;
  payout: string;
  tier: number;
  timestamp: string;
  txHash: string;
};

type UserStats = {
  spins: bigint;
  winnings: bigint;
  spent: bigint;
  netProfit: bigint;
};

type SpinResultArgs = {
  spinId: bigint;
  player: string;
  result: bigint;
  payout: bigint;
  tier: number;
};

export default function WinHistory() {
  const { address, isConnected } = useAccount();
  const [winHistory, setWinHistory] = useState<WinRecord[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'wins' | 'all'>('wins');

  // Function to fetch user stats
  const fetchUserStats = useCallback(async () => {
    if (!address || !isConnected) return;
    
    try {
      const stats = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: userStatsAbi,
        functionName: 'getUserStats',
        args: [address]
      }) as [bigint, bigint, bigint, bigint];
      
      setUserStats({
        spins: stats[0],
        winnings: stats[1],
        spent: stats[2],
        netProfit: stats[3]
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  }, [address, isConnected]);

  // Function to fetch win history, wrapped in useCallback
  const fetchWinHistory = useCallback(async () => {
    if (!address) return;
    
    try {
      console.log("Fetching win history for address:", address);
      
      // Get current block number
      const currentBlock = await publicClient.getBlockNumber();
      // Start from 10000 blocks ago to get more history
      const fromBlock = currentBlock - BigInt(10000);
      
      console.log("Fetching logs from block:", fromBlock.toString());
      
      const logs = await publicClient.getLogs({
        address: contractAddress as `0x${string}`,
        event: {
          inputs: [
            { indexed: true, name: 'spinId', type: 'uint256' },
            { indexed: true, name: 'player', type: 'address' },
            { indexed: false, name: 'result', type: 'uint256' },
            { indexed: false, name: 'payout', type: 'uint256' },
            { indexed: false, name: 'tier', type: 'uint8' }
          ],
          name: 'SpinResult',
          type: 'event'
        },
        args: {
          player: address
        },
        fromBlock,
        toBlock: 'latest'
      });
      
      console.log("Found logs:", logs);
      
      // Process logs into history
      const history = await Promise.all(logs.map(async log => {
        const args = log.args as SpinResultArgs;
        const block = await publicClient.getBlock({ blockHash: log.blockHash });
        return {
          spinId: Number(args.spinId),
          result: Number(args.result),
          payout: formatEther(args.payout),
          tier: args.tier,
          timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
          txHash: log.transactionHash
        } as WinRecord;
      }));
      
      // Sort by spinId in descending order (newest first)
      history.sort((a, b) => b.spinId - a.spinId);
      
      setWinHistory(history);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching history:", error);
      setError("Failed to load history. Please try again later.");
      setIsLoading(false);
    }
  }, [address]);

  // Fetch data when address changes
  useEffect(() => {
    fetchUserStats();
    fetchWinHistory();
  }, [fetchUserStats, fetchWinHistory]);

  if (!isConnected) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-center text-gray-400 press-start">
        Connect your wallet to view win history
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-center press-start">
        <div className="animate-pulse">Loading stats...</div>
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
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Check if a win is recent (within the last hour)
  const isRecentWin = (timestamp: string) => {
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;
    const date = new Date(timestamp);
    const timestampSeconds = Math.floor(date.getTime() / 1000);
    return timestampSeconds > oneHourAgo;
  };

  // Filter history based on viewMode
  const filteredHistory = winHistory.filter(record => 
    viewMode === 'all' ? true : record.tier < 4
  );

  return (
    <div className="w-full press-start">
      {error && (
        <div className="mb-4 text-red-400 text-sm">
          {error}
        </div>
      )}
      
      {/* Stats Section */}
      {userStats && (
        <div className="mb-6 p-4 bg-slate-900/70 rounded-lg border border-blue-700/50">
          <h3 className="text-lg font-bold text-blue-300 mb-4">Your Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-400">Total Spins</div>
              <div className="text-lg font-bold text-yellow-400">{userStats.spins.toString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Total Winnings</div>
              <div className="text-lg font-bold text-green-400">{formatEther(userStats.winnings)} ETH</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Total Spent</div>
              <div className="text-lg font-bold text-red-400">{formatEther(userStats.spent)} ETH</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Net Profit/Loss</div>
              <div className={`text-lg font-bold ${userStats.netProfit >= BigInt(0) ? 'text-green-400' : 'text-red-400'}`}>
                {formatEther(userStats.netProfit >= BigInt(0) ? userStats.netProfit : -userStats.netProfit)} ETH
                {userStats.netProfit < BigInt(0) ? ' (Loss)' : ' (Profit)'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Section Header with Filter */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-blue-300">History</h3>
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('wins')}
              className={`px-3 py-1 text-xs rounded-md transition-colors press-start ${
                viewMode === 'wins'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Wins Only
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 text-xs rounded-md transition-colors press-start ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Spins
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            fetchUserStats();
            fetchWinHistory();
          }}
          disabled={isLoading}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 border border-blue-700/30 rounded-md press-start"
        >
          {isLoading ? (
            <span className="animate-pulse">Refreshing...</span>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="w-full h-48 flex items-center justify-center text-center text-yellow-400 press-start">
          {viewMode === 'wins' 
            ? "No wins found yet. Keep spinning!"
            : "No spins found yet. Start playing!"}
        </div>
      ) : (
        <div className="h-[450px] overflow-y-auto pr-2 scrollbar-slim">
          <div className="space-y-3">
            {filteredHistory.map((record, index) => (
              <div key={index} className="w-full bg-slate-900/70 p-3 rounded-lg border border-blue-700/50">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-bold text-yellow-400 flex items-center gap-2">
                    {record.tier < 4 ? getTierDescription(record.tier) : "No Win"}
                    {isRecentWin(record.timestamp) && (
                      <span className="text-xs bg-green-900/70 text-green-400 px-1.5 py-0.5 rounded-sm animate-pulse press-start">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(record.timestamp)}
                  </div>
                </div>
                
                <div className="mt-2 text-sm">
                  <div className={`font-mono ${record.tier < 4 ? 'text-green-400' : 'text-gray-400'}`}>
                    {record.payout} ETH
                  </div>
                  <div className="mt-1 text-xs text-blue-300">
                    Result: {record.result.toString().padStart(3, '0')}
                  </div>
                </div>
                
                <div className="mt-2 text-xs">
                  <a 
                    href={`https://basescan.org/tx/${record.txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline text-xs press-start"
                  >
                    View TX
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 