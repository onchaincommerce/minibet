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
  transport: http('https://api.developer.coinbase.com/rpc/v1/base/h4AxrANvkjw0WX4vP3eYuBR1AvrVawAj')
});

// BaseScan API configuration
const BASESCAN_API_KEY = 'VKV5XTXM4F672R217V452JRJCKUYT6J3QW';
const BASESCAN_API_URL = 'https://api.basescan.org/api';
const BASESCAN_TX_URL = 'https://basescan.org/tx';

// Event signature for SpinResult (from actual contract events)
const SPIN_RESULT_SIGNATURE = '0x8b2f242d32371a41f80f3dcf16124d8271bbedc9ded98b620290046aac8a1d8c';

// Function to pad address to 32 bytes
const padAddress = (address: string) => {
  return '0x' + '0'.repeat(24) + address.slice(2).toLowerCase();
};

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

type BaseScanEvent = {
  data: string;
  topics: string[];
  timeStamp: string;
  hash: string;
  transactionHash: string;
};

export default function WinHistory() {
  const { address, isConnected } = useAccount();
  const [winHistory, setWinHistory] = useState<WinRecord[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'wins' | 'all'>('wins');
  const [page, setPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

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
  const fetchWinHistory = useCallback(async (pageNum: number = 1) => {
    if (!address) return;
    
    try {
      setIsLoading(true);
      console.log("Fetching win history for address:", address);
      
      // Use BaseScan API to get contract events
      const apiUrl = `${BASESCAN_API_URL}?module=logs&action=getLogs&address=${contractAddress}&fromBlock=0&topic0=${SPIN_RESULT_SIGNATURE}&topic2=${padAddress(address)}&page=${pageNum}&offset=1000&sort=desc&apikey=${BASESCAN_API_KEY}`;
      
      console.log("Fetching from URL:", apiUrl);
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      console.log("API Response:", data);
      
      if (data.status === '0' && data.message === 'No records found') {
        // No records is a valid state, not an error
        console.log("No records found from API");
        setWinHistory([]);
        setHasMoreHistory(false);
        setIsLoading(false);
        return;
      }
      
      if (data.status !== '1') {
        throw new Error(data.message || 'Failed to fetch history');
      }

      const events = Array.isArray(data.result) ? data.result : [];
      console.log("Found events:", events);
      
      // Process events into history
      const history = events.map((event: BaseScanEvent) => {
        try {
          // Get spinId from topic1 (second topic)
          const spinId = parseInt(event.topics[1], 16);
          
          // Decode the data field (contains result, payout, and tier)
          const dataHex = event.data.slice(2); // Remove '0x' prefix
          const result = parseInt(dataHex.slice(0, 64), 16);
          const payout = BigInt('0x' + dataHex.slice(64, 128));
          const tier = parseInt(dataHex.slice(128), 16);
          
          console.log("Processed event:", {
            spinId,
            result,
            payout: formatEther(payout),
            tier,
            timestamp: event.timeStamp,
            hash: event.transactionHash
          });
          
          return {
            spinId,
            result,
            payout: formatEther(payout),
            tier,
            timestamp: new Date(Number(event.timeStamp) * 1000).toISOString(),
            txHash: event.transactionHash
          } as WinRecord;
        } catch (err) {
          console.error("Error processing event:", err, event);
          return null;
        }
      }).filter((record: WinRecord | null): record is WinRecord => record !== null);
      
      // Sort by spinId in descending order (newest first)
      history.sort((a: WinRecord, b: WinRecord) => b.spinId - a.spinId);
      
      console.log("Processed history:", history);
      
      // Update pagination state
      setPage(pageNum + 1);
      setHasMoreHistory(events.length === 1000); // If we got 1000 events, there might be more
      
      // If this is the first load, replace the history
      // If this is loading more, append to existing history
      setWinHistory(prev => pageNum === 1 ? history : [...prev, ...history]);
      
    } catch (error) {
      console.error("Error fetching history:", error);
      setError("Failed to load history. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Load more history
  const loadMoreHistory = () => {
    if (hasMoreHistory) {
      fetchWinHistory(page);
    }
  };

  // Fetch data when address changes
  useEffect(() => {
    fetchUserStats();
    fetchWinHistory(1);
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
      
      {/* Rewards Info Section */}
      <div className="mb-6 p-4 bg-slate-900/70 rounded-lg border border-yellow-700/50">
        <h3 className="text-lg font-bold text-yellow-400 mb-4">Rewards</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 p-3 rounded-lg border border-yellow-600/30">
            <div className="text-yellow-300 text-sm mb-1">🎉 JACKPOT</div>
            <div className="text-lg font-bold text-green-400">0.1 ETH</div>
            <div className="text-xs text-gray-400 mt-1">0.1% Chance</div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-lg border border-yellow-600/30">
            <div className="text-yellow-300 text-sm mb-1">🎊 Big Win</div>
            <div className="text-lg font-bold text-green-400">0.01 ETH</div>
            <div className="text-xs text-gray-400 mt-1">2% Chance</div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-lg border border-yellow-600/30">
            <div className="text-yellow-300 text-sm mb-1">👍 Small Win</div>
            <div className="text-lg font-bold text-green-400">0.002 ETH</div>
            <div className="text-xs text-gray-400 mt-1">10% Chance</div>
          </div>
        </div>
      </div>
      
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
      </div>

      {filteredHistory.length === 0 ? (
        <div className="w-full h-48 flex items-center justify-center text-center text-yellow-400 press-start">
          {viewMode === 'wins' 
            ? "No wins found yet. Keep spinning!"
            : "No spins found yet. Start playing!"}
        </div>
      ) : (
        <div className="max-h-[60vh] md:max-h-[450px] overflow-y-auto pr-2 scrollbar-slim">
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
                    href={`${BASESCAN_TX_URL}/${record.txHash}`} 
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
          
          {/* Load More Button */}
          {hasMoreHistory && (
            <div className="mt-4 text-center">
              <button
                onClick={loadMoreHistory}
                disabled={isLoading}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mx-auto disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 border border-blue-700/30 rounded-md press-start"
              >
                {isLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Load More History
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 