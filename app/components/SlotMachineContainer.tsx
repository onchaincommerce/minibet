"use client";

import { useState, useEffect } from "react";
import SlotMachine from "./SlotMachine";
import WinHistory from "./WinHistory";
import AdminPanel from "./AdminPanel";
import { useAccount } from "wagmi";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "wagmi/chains";

// Deployed contract address
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3C4883E9eE3FAa7A014e6c656138e7dDc049E754";

// Create a public client using a public RPC endpoint
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

// Contract ABI for owner check
const ownerAbi = [
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  }
];

export default function SlotMachineContainer() {
  const { isConnected, address } = useAccount();
  const [activeTab, setActiveTab] = useState<'slot' | 'history' | 'admin'>('slot');
  const [isOwner, setIsOwner] = useState(false);
  
  // Check if the connected wallet is the owner
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
          abi: ownerAbi,
          functionName: 'owner',
        });
        
        // Check if the connected address is the owner
        const isContractOwner = address.toLowerCase() === (ownerAddress as string).toLowerCase();
        setIsOwner(isContractOwner);
        
        // If active tab is admin but not owner, switch to slot
        if (activeTab === 'admin' && !isContractOwner) {
          setActiveTab('slot');
        }
      } catch (error) {
        console.error("Error checking ownership:", error);
        setIsOwner(false);
      }
    }
    
    checkOwnership();
  }, [address, isConnected, activeTab]);

  return (
    <div className="flex flex-col items-center">
      {/* Tab navigation */}
      <div className="flex w-full mb-4">
        <button
          className={`flex-1 py-2 text-xs font-bold text-center border-b-4 transition-colors ${
            activeTab === 'slot' 
              ? 'border-yellow-400 text-yellow-400' 
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('slot')}
        >
          SLOT MACHINE
        </button>
        <button
          className={`flex-1 py-2 text-xs font-bold text-center border-b-4 transition-colors ${
            activeTab === 'history' 
              ? 'border-blue-400 text-blue-400' 
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('history')}
          disabled={!isConnected}
        >
          {isConnected ? 'WIN HISTORY' : 'CONNECT WALLET'}
        </button>
        {isOwner && (
          <button
            className={`flex-1 py-2 text-xs font-bold text-center border-b-4 transition-colors ${
              activeTab === 'admin' 
                ? 'border-green-400 text-green-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('admin')}
          >
            ADMIN
          </button>
        )}
      </div>

      {/* Content based on active tab */}
      <div className="w-full">
        {activeTab === 'slot' ? (
          <SlotMachine />
        ) : activeTab === 'history' ? (
          <div className="pixel-card w-full max-w-[520px] mx-auto">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-blue-300">YOUR WIN HISTORY</h2>
              <p className="text-xs text-gray-400 mt-1">All your winning spins in one place</p>
            </div>
            <WinHistory />
          </div>
        ) : (
          <AdminPanel />
        )}
      </div>
    </div>
  );
} 