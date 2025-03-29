"use client";

import {
  useMiniKit,
  useAddFrame,
} from "@coinbase/onchainkit/minikit";
import { Name, Identity, Badge } from "@coinbase/onchainkit/identity";
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet";
import { useCallback, useEffect, useMemo, useState } from "react";
import SlotMachineContainer from "./components/SlotMachineContainer";
import CasinoBackground from "./components/CasinoBackground";
import { useAccount } from "wagmi";
import Check from "./svg/Check";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);

  const addFrame = useAddFrame();
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame, setFrameAdded]);

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
        <button
          type="button"
          onClick={handleAddFrame}
          className="cursor-pointer bg-transparent font-semibold text-sm pixel-button"
        >
          + SAVE FRAME
        </button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-semibold animate-fade-out">
          <Check />
          <span>SAVED</span>
        </div>
      );
    }

    return null;
  }, [context, handleAddFrame, frameAdded]);

  return (
    <div className="flex flex-col min-h-screen sm:min-h-[820px] font-['Press_Start_2P'] bg-black text-white items-center relative">
      <CasinoBackground />
      <div className="w-full max-w-[520px] mx-auto z-10">
        <header className="mt-4 mb-4 flex justify-between items-center px-4">
          <div className="justify-start">
            {address ? (
              <Identity
                address={address}
                className="!bg-inherit p-0 [&>div]:space-x-2"
              >
                <Name className="text-inherit" />
              </Identity>
            ) : (
              <div className="text-gray-500 text-xs">
                {isConnected ? "CONNECTING..." : "NOT CONNECTED"}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div>{saveFrameButton}</div>
            <Wallet>
              <ConnectWallet />
              <WalletDropdown>
                <Identity 
                  address={address}
                  className="px-4 pt-3 pb-2" 
                  hasCopyAddressOnClick
                >
                  <Name />
                  <Badge />
                </Identity>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>
        </header>

        <main className="px-4">
          <div className="text-center mb-6 casino-border p-4">
            <h1 className="text-3xl font-bold mb-2 glow-text">MINIBET</h1>
            <p className="text-yellow-400 text-xs mt-3">TRY YOUR LUCK WITH 0.001 ETH PER SPIN!</p>
          </div>
          <SlotMachineContainer />
        </main>
      </div>
    </div>
  );
}
