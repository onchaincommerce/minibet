## 📍 Minibet PRD – MVP v1

### Overview
Minibet is a lightweight onchain slot machine dApp built on the Base network. Users send a fixed amount of ETH (0.001 ETH) to a smart contract to "spin" and receive a randomized payout based on predefined probability tiers. It will initially launch on **Base Sepolia** for testing, then move to **Base mainnet** once stable.

The MVP uses **pseudo-randomness** to determine outcomes and is built using the [Base Minikit](https://docs.base.org/builderkits/minikit/overview), which includes OnchainKit, Wagmi, and Viem for a minimal and modern dApp stack.

---

### 🌟 Goals
- Let users spin for 0.001 ETH per play.
- Return ETH to users based on randomized outcomes and tiered rewards.
- Keep the app fully onchain and transparent.
- Prioritize simplicity and low gas costs.
- Use pseudo-randomness for MVP (auditable, fair enough for testnet).
- Launch fast on Base Sepolia using Minikit.

---

### 🧩 Core Components

#### 1. Smart Contract: `MinibetSlotMachine.sol`
- Accepts **exactly 0.001 ETH** per spin.
- Rejects any other value.
- Generates pseudo-random outcome using block variables (e.g., `block.timestamp`, `block.prevrandao`, `msg.sender`).
- Emits an event for each spin (include spin ID, address, result, amount won).
- Defines fixed payout tiers:

| Tier | Description | Payout   | Probability |
|------|-------------|----------|-------------|
| 1    | Jackpot     | 0.1 ETH  | 0.1%        |
| 2    | Big Win     | 0.01 ETH | 2%          |
| 3    | Small Win   | 0.002 ETH| 10%         |
| 4    | No Win      | 0 ETH    | 87.9%       |

- Transfers reward (if any) back to user.
- Accumulates ETH from losing spins in contract balance.
- `withdraw()` function for owner to claim earnings.
- `pause()` / `unpause()` modifier for emergency shutdown.

#### 2. Frontend (Next.js + Minikit + Wagmi + Viem)
- Wallet connection handled via **OnchainKit** (Minikit).
- "Spin" button triggers smart contract call.
- Show transaction status and result (win/loss, amount won).
- Keep UI minimal: slot animation optional (placeholder win/loss display is fine for MVP).
- Display recent spins or personal history (bonus, optional).

#### 3. Randomness (MVP)
- Pseudo-random logic in contract:
  ```solidity
  uint256 rand = uint256(keccak256(abi.encodePacked(
    block.timestamp,
    block.prevrandao,
    msg.sender,
    nonce
  ))) % 1000;
  ```
  - Compare `rand` to fixed tier ranges (e.g., `if rand < 1` = jackpot).
  - Maintain `nonce` per user or global for added entropy.

#### 4. Deployment
- Initial launch on **Base Sepolia** testnet.
- Once stable + reviewed → deploy on **Base mainnet**.

---

### 🏗 Tech Stack

| Layer   | Stack                              |
|---------|------------------------------------|
| Contract | Solidity (Foundry or Hardhat)     |
| Frontend | Next.js (w/ Minikit, Wagmi, Viem) |
| Wallet   | OnchainKit (no RainbowKit)        |
| Chain    | Base Sepolia → Base Mainnet      |
| Randomness | Pseudo-random using block data   |

---

### 🧪 Milestones

| Milestone        | Deliverable                    | ETA  |
|------------------|-------------------------------|------|
| PRD Finalized    | ✅ Shared with Cursor         | ✅   |
| Contract MVP     | Core logic + tests             | TBD  |
| Frontend MVP     | Wallet connect + basic UI      | TBD  |
| Pseudo-Random Logic | Integrated + tested          | TBD  |
| Testnet Launch   | On Base Sepolia                | TBD  |
| Feedback Round   | Internal testing + edge cases  | TBD  |
| Mainnet Prep     | Audit + cleanup                | TBD  |
| Mainnet Launch   | On Base                        | TBD  |

---

### 🔒 Security & Risk Considerations
- Ensure `msg.value == 0.001 ETH` strictly enforced.
- Prevent re-entrancy on reward payouts.
- Avoid predictable randomness (clearly disclose pseudo-random nature).
- Ensure safe fail if reward transfer fails.
- Rate limit or cooldown to prevent miner-based manipulation (optional).
- Owner functions protected with `onlyOwner`.

---

### 📈 Success Metrics
- 👨‍💻 Unique users
- ♻️ Total spins
- 💵 ETH volume in/out
- ⚖️ Reward distribution aligns with expected odds
- 🚫 Error/revert rates
