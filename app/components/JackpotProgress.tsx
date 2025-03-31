"use client";

import { useState, useEffect } from "react";
import { createPublicClient, http, formatEther } from "viem";
import { base } from "wagmi/chains";

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x79931DEa9E94F1fe240DCD7Cbf93f853B681bC7C";

// Create a public client using a public RPC endpoint
const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
});

// Contract ABI for jackpot status
const contractAbi = [
  {
    inputs: [],
    name: "getJackpotStatus",
    outputs: [
      { name: "isUnlocked", type: "bool" },
      { name: "currentSpins", type: "uint256" },
      { name: "spinsNeeded", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getContractBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

type JackpotStatus = {
  isUnlocked: boolean;
  currentSpins: number;
  spinsNeeded: number;
  contractBalance: bigint;
};

export default function JackpotProgress() {
  const [jackpotStatus, setJackpotStatus] = useState<JackpotStatus>({
    isUnlocked: false,
    currentSpins: 0,
    spinsNeeded: 200,
    contractBalance: BigInt(0)
  });

  // Function to update jackpot status
  const updateJackpotStatus = async () => {
    try {
      const [status, balance] = await Promise.all([
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: contractAbi,
          functionName: 'getJackpotStatus'
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: contractAbi,
          functionName: 'getContractBalance'
        })
      ]);

      setJackpotStatus({
        isUnlocked: status[0],
        currentSpins: Number(status[1]),
        spinsNeeded: Number(status[2]),
        contractBalance: balance as bigint
      });
    } catch (error) {
      console.error("Error fetching jackpot status:", error);
    }
  };

  // Update status every 10 seconds and on mount
  useEffect(() => {
    updateJackpotStatus();
    const interval = setInterval(updateJackpotStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const progressPercentage = (jackpotStatus.currentSpins / 200) * 100;

  return (
    <div className="pixel-card w-full max-w-[520px] mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">🎰 JACKPOT STATUS</h2>
        <p className="text-sm text-gray-400">
          {jackpotStatus.isUnlocked 
            ? "🎉 JACKPOT IS UNLOCKED! 🎉" 
            : `${jackpotStatus.spinsNeeded} more spins until jackpot unlocks`}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-6 mb-4 overflow-hidden">
        <div 
          className="h-full bg-yellow-400 transition-all duration-500"
          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-center mb-4">
        <div className="pixel-card bg-gray-800 p-3">
          <p className="text-sm text-gray-400">Total Spins</p>
          <p className="text-xl font-bold text-white">{jackpotStatus.currentSpins}</p>
        </div>
        <div className="pixel-card bg-gray-800 p-3">
          <p className="text-sm text-gray-400">Contract Balance</p>
          <p className="text-xl font-bold text-white">
            {formatEther(jackpotStatus.contractBalance).slice(0, 6)} ETH
          </p>
        </div>
      </div>

      <div className="text-center mt-6">
        <div className="pixel-card bg-yellow-900/30 p-4 rounded-lg">
          <h3 className="text-lg font-bold text-yellow-400 mb-2">💰 Jackpot Prize</h3>
          <p className="text-2xl font-bold text-white">0.1 ETH</p>
          <p className="text-xs text-gray-400 mt-2">
            Unlocks after 200 total spins
          </p>
        </div>
      </div>
    </div>
  );
} 