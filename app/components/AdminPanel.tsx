"use client";

import { useState, useEffect } from "react";
import { createPublicClient, http, formatEther, parseEther } from "viem";
import { baseSepolia } from "wagmi/chains";
import { useAccount, useWalletClient } from "wagmi";

// Deployed contract address
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3C4883E9eE3FAa7A014e6c656138e7dDc049E754";

// Create a public client using a public RPC endpoint
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

// Contract ABI for admin functions
const adminAbi = [
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getContractBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

export default function AdminPanel() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const [isOwner, setIsOwner] = useState(false);
  const [contractBalance, setContractBalance] = useState<bigint>(BigInt(0));
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if the connected address is the owner
  useEffect(() => {
    async function checkOwnership() {
      if (!address || !isConnected) {
        setIsOwner(false);
        return;
      }
      
      try {
        // Call the owner() function from the contract
        const ownerAddress = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: adminAbi,
          functionName: 'owner',
        });
        
        // Check if the connected address is the owner
        setIsOwner(address.toLowerCase() === (ownerAddress as string).toLowerCase());
        
        if (address.toLowerCase() === (ownerAddress as string).toLowerCase()) {
          // Fetch contract balance and paused status
          fetchContractData();
        }
      } catch (error) {
        console.error("Error checking ownership:", error);
        setIsOwner(false);
      }
    }
    
    checkOwnership();
  }, [address, isConnected]);

  // Fetch contract balance and paused status
  const fetchContractData = async () => {
    setIsLoading(true);
    try {
      // Get contract balance
      const balance = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: adminAbi,
        functionName: 'getContractBalance',
      });
      
      setContractBalance(balance as bigint);
    } catch (error) {
      console.error("Error fetching contract data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle withdrawal
  const handleWithdraw = async () => {
    if (!isOwner || !walletClient) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setTxHash(null);
    
    try {
      // Determine amount to withdraw
      const amount = withdrawAmount === "" || withdrawAmount === "0" 
        ? BigInt(0) // Withdraw all funds (0 means all)
        : parseEther(withdrawAmount);
      
      // Call withdraw function
      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: adminAbi,
        functionName: 'withdraw',
        args: [amount]
      });
      
      console.log("Withdrawal transaction submitted:", hash);
      setTxHash(hash);
      
      // Wait for the transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash,
        timeout: 60_000 // 1 minute
      });
      
      console.log("Withdrawal completed:", receipt);
      
      // Refresh contract data
      await fetchContractData();
      
      // Reset form
      setWithdrawAmount("");
    } catch (error) {
      console.error("Error in withdrawal:", error);
      setError("Withdrawal failed. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh the contract data
  const refreshData = () => {
    fetchContractData();
  };

  if (!isConnected) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-center text-gray-400">
        Connect your wallet to access admin panel
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-center text-yellow-400">
        Admin access restricted to contract owner
      </div>
    );
  }

  return (
    <div className="pixel-card w-full max-w-[520px] mx-auto relative">
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-green-400">CONTRACT ADMIN</h2>
        <div className="mt-3 bg-slate-900/60 py-2 px-4 rounded-lg inline-block">
          <div className="flex items-center gap-3">
            <p className="text-xl font-mono text-yellow-400">{formatEther(contractBalance)} ETH</p>
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 border border-blue-700/30 rounded-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Withdrawal Panel */}
      <div className="bg-slate-900/70 p-6 rounded-lg border border-green-700/30 mb-4">
        <h3 className="text-sm font-bold text-green-400 mb-4 text-center">Withdraw Funds</h3>
        
        <div className="flex items-center gap-2 mb-5">
          <div className="relative flex-1">
            <input
              type="text"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Amount in ETH"
              className="w-full px-3 py-3 bg-slate-800 text-white border border-green-700/30 rounded-md text-sm font-mono"
            />
            <button
              onClick={() => setWithdrawAmount(formatEther(contractBalance))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-green-800 hover:bg-green-700 px-2 py-1 rounded text-white"
            >
              MAX
            </button>
          </div>
          <button
            onClick={handleWithdraw}
            disabled={isLoading}
            className="px-4 py-3 bg-green-800 hover:bg-green-700 text-white rounded-md text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Processing..." : "Withdraw"}
          </button>
        </div>
        
        <div className="text-xs text-center text-gray-400">
          Enter amount to withdraw or use MAX to withdraw all funds
        </div>
      </div>
      
      {error && (
        <div className="mb-4 text-red-400 text-sm">
          Error: {error}
        </div>
      )}
      
      {txHash && (
        <div className="mb-4 text-xs">
          <a 
            href={`https://sepolia.basescan.org/tx/${txHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            View Transaction on BaseScan
          </a>
        </div>
      )}
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full mb-2"></div>
            <p className="text-yellow-400 text-sm">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
} 