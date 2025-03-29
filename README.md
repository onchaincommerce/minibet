# Minibet

A lightweight onchain slot machine dApp built on the Base network using MiniKit.

## Overview

Minibet is a simple slot machine game where users can spin for 0.001 ETH and win prizes based on randomized outcomes, all fully onchain.

### Payout Tiers

| Tier | Description | Payout   | Probability |
|------|-------------|----------|-------------|
| 1    | Jackpot     | 0.1 ETH  | 0.1%        |
| 2    | Big Win     | 0.01 ETH | 2%          |
| 3    | Small Win   | 0.002 ETH| 10%         |
| 4    | No Win      | 0 ETH    | 87.9%       |

## Live Demo

The application is deployed on Base Sepolia testnet. You can interact with the verified contract directly on BaseScan:

[0x3C4883E9eE3FAa7A014e6c656138e7dDc049E754](https://sepolia.basescan.org/address/0x3C4883E9eE3FAa7A014e6c656138e7dDc049E754)

## Tech Stack

- **Smart Contract**: Solidity with Hardhat, deployed on Base Sepolia (testnet)
- **Frontend**: Next.js with MiniKit, OnchainKit, Wagmi, and Viem
- **Wallet Connection**: OnchainKit Wallet components
- **Randomness**: Pseudo-random using block data (block.timestamp, block.prevrandao, etc.)

## Getting Started

### Prerequisites

- Node.js and npm
- Base Sepolia testnet ETH (for testing)

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/minibet.git
cd minibet
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env.local` file with the following variables:

```
NEXT_PUBLIC_CONTRACT_ADDRESS="0x3C4883E9eE3FAa7A014e6c656138e7dDc049E754"
NEXT_PUBLIC_ONCHAINKIT_API_KEY="your_onchainkit_api_key"
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME="Minibet"
NEXT_PUBLIC_ICON_URL="/icon.png"
NEXT_PUBLIC_URL="http://localhost:3001"
NEXT_PUBLIC_SPLASH_IMAGE_URL="/icon.png"
NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR="000000"
```

4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Smart Contract Deployment

### Deploying to Base Sepolia (testnet)

1. Make sure you have Base Sepolia ETH in your wallet
2. Add your private key to the `.env` file:

```
PRIVATE_KEY="your_wallet_private_key"
```

3. Deploy the contract:

```bash
npx hardhat run scripts/deploy.js --network baseSepolia
```

4. Update the `NEXT_PUBLIC_CONTRACT_ADDRESS` in your `.env.local` file with the deployed contract address

### Verifying the contract

First, make sure your Hardhat config includes the BaseScan API key:

```js
// In hardhat.config.js
module.exports = {
  // ... other config
  etherscan: {
    apiKey: {
      // Use your BaseScan API key
      baseSepolia: "YOUR_BASESCAN_API_KEY"
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  }
};
```

Then run the verification command:

```bash
npx hardhat verify --network baseSepolia YOUR_CONTRACT_ADDRESS
```

## Troubleshooting

### Transaction Issues

If you encounter issues with transactions not updating the UI:
1. Check the transaction on BaseScan to confirm it was successful
2. Make sure your wallet is connected to the Base Sepolia network
3. The contract emits a `SpinResult` event which the frontend listens for

### Testing the Contract

You can test the slot machine contract using the provided script:

```bash
npx hardhat run scripts/test-spin.js --network baseSepolia
```

## Learn More

To learn more about OnchainKit and MiniKit, see the [documentation](https://onchainkit.xyz/getting-started).

To learn more about Next.js, see the [Next.js documentation](https://nextjs.org/docs).

## License

MIT
