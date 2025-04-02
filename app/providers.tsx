"use client";

import { type ReactNode } from "react";
import { base } from "wagmi/chains";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { WagmiProvider, createConfig, http } from "wagmi";
import { coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterFrame as miniAppConnector } from '@farcaster/frame-wagmi-connector';

// Create a QueryClient for data fetching
const queryClient = new QueryClient();

// Function to check if we're in a Farcaster client
const isInFarcasterClient = () => {
  if (typeof window === 'undefined') return false;
  return window.location.href.includes('warpcast.com') || 
         window.location.href.includes('farcaster.xyz') ||
         window.location.href.includes('farcaster.com');
};

// Create wagmi config for wallet connection
const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    // Use Farcaster Frame connector if in a Farcaster client
    ...(isInFarcasterClient() ? [miniAppConnector()] : []),
    // Always include Coinbase Wallet for non-Farcaster contexts
    coinbaseWallet({
      appName: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "MiniBet",
      chainId: base.id,
    }),
  ],
  ssr: true,
  transports: {
    [base.id]: http('https://mainnet.base.org'),
  },
});

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MiniKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
          config={{
            appearance: {
              mode: "auto",
              theme: "snake",
              name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
              logo: process.env.NEXT_PUBLIC_ICON_URL,
            },
          }}
        >
          {props.children}
        </MiniKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
