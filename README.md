# The Relic Vault

**A decentralized marketplace for minting, listing, and trading High Fantasy digital game cards as NFTs on Sepolia.**

### The Relic Vault
![Marketplace screenshot](./screenshots/marketplace.png)

## 1. Overview

The Relic Vault is an end-to-end demo of an NFT trading-card game on Ethereum's **Sepolia** testnet. Heroes, beasts, artifacts, and spells are minted as unique ERC-721 tokens whose art and attributes live on IPFS, then listed and traded through an on-chain marketplace with atomic ownership + payment transfers.

It was built as a club recruitment / portfolio project: everything runs on a testnet with faucet ETH, so anyone can connect a wallet and go from mint to market without spending real money. The codebase is a monorepo — `contracts/` holds the Solidity + Hardhat tooling and `frontend/` holds the Vite + React web app.

## 2. Features

- **Unique card minting** — every card gets a sequential, unique token ID and its own on-chain `tokenURI`.
- **IPFS-stored metadata** — card art and JSON metadata (name, description, rarity, stats) are pinned to IPFS via Pinata before minting.
- **Listing & buying flow** — sellers list an owned card at a price in test ETH; buyers purchase it; ownership and funds swap atomically and the listing is cleared.
- **Wallet connect** — MetaMask connection with connected/disconnected states, Sepolia network check, and one-click network switch.
- **Marketplace gallery** — live grid of listed cards pulled from the contracts (image, name, rarity badge, price, Buy action).
- **Owned-cards view ("My Cards")** — everything the connected wallet owns, with List-for-sale and Delist actions.

The marketplace keeps a 2% protocol fee, routed to a configurable fee recipient.

## IPFS Implementation

### What is stored on IPFS

Every card in The Relic Vault has two things pinned to IPFS before it can be minted or listed:

- **Card art** — an SVG (uploaded by the user or auto-generated placeholder art) is pinned as a file and returned as an `ipfs://<cid>` URI.
- **Card metadata (JSON)** — a JSON document containing the card's name, description, rarity, stats (attack / defense / special / element), and a reference to the on-IPFS image is pinned separately and returned as its own `ipfs://<cid>` URI.

The art and metadata are pinned independently, so each card's final `tokenURI` points at the metadata JSON, and that JSON in turn points at the art image — the standard ERC-721 / metadata pattern.

### Which IPFS service and gateway

The project uses **Pinata** for pinning:

- **Uploads** — the `uploadMetadata.ts` seed script and the in-app mint flow both use the Pinata SDK (`@pinata/sdk` on the contract side; Pinata's HTTP pinning API called from the frontend via `src/lib/pinata.ts`) to pin files (`pinFileToIPFS`) and JSON (`pinJSONToIPFS`).
- **Gateway** — Pinata's public gateway (`gateway.pinata.cloud`) is used to resolve `ipfs://<cid>` URIs into ordinary HTTPS URLs the browser can `fetch()`. The gateway is configurable via `VITE_PINATA_GATEWAY` in `frontend/.env`, defaulting to `gateway.pinata.cloud` in `frontend/src/lib/utils.ts`.

### URI / CID format used

All IPFS references use the `ipfs://<cid>` scheme. For example:

```
ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbz6y
```

- On mint, the card contract stores that `ipfs://<cid>` string as the card's `tokenURI`.
- At display time, the frontend converts it to `https://<gateway>/ipfs/<cid>` before fetching the metadata JSON and the card image.

The seed-metadata script (`contracts/scripts/uploadMetadata.ts`) exercises the full flow: it pins placeholder SVG art and a matching metadata JSON for each archetype card, then prints the `ipfs://<cid>` URIs to stdout so they can be used during development.

### Security note

The Pinata JWT is required in `frontend/.env` (`VITE_PINATA_JWT`) because in-app card uploads happen from the browser. Since that JWT ends up in the client bundle, a narrow-scoped JWT should be used (see Pinata's API keys page).

## 4. Tech Stack

| Layer | Choice |
|---|---|
| Smart contracts | Solidity `0.8.24` (OpenZeppelin ERC-721 v5), Hardhat `2.22.x` with the Hardhat Toolbox |
| Frontend | React `19` + Vite `5`, TypeScript `5.6` |
| Web3 | ethers `v6` (`window.ethereum` / MetaMask) |
| Styling | Tailwind CSS `3.4` + Cinzel / Crimson Text (Google Fonts) |
| IPFS | Pinata (file + JSON pinning, public gateway) |
| Testnet | Sepolia (`chainId 11155111`) |
| Testing | Hardhat + Mocha/Chai, Vitest + Testing Library |
| 3D background | three.js |

## Screenshots

### Marketplace
![Marketplace screenshot](./screenshots/marketplace.png)
### Mint page
![Mint page screenshot](./screenshots/mint.png)
### Minting card
![mint-card2 screenshot](./screenshots/mint-card2.png)
### Unlock card
![new-card screenshot](./screenshots/new-card.png)
### My Cards
![My Cards screenshot](./screenshots/my-cards.png)
### Profile
![Profile screenshot](./screenshots/profile.png)



## 5. Getting Started

### Prerequisites

- **Node.js 20.19+ (or 22 LTS)** and **npm 10+** — the repo is an npm-workspaces monorepo.
- **MetaMask** (or another wallet that injects `window.ethereum`).
- A bit of **Sepolia ETH** from a faucet for transactions.

### 1. Clone and install

```bash
git clone <your-repo-url> the-relic-vault
cd the-relic-vault
npm install
```

### 2. Configure environment variables

Copy the example files and fill them in. **Never commit real keys.**

`contracts/.env` — used by deployment, verification, and the metadata upload script:

```bash
# contracts/.env
SEPOLIA_RPC_URL=https://sepolia.example-rpc.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HEX
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
FEE_RECIPIENT=0xYOUR_FEE_RECIPIENT_ADDRESS
PINATA_JWT=your_pinata_jwt
PINATA_GATEWAY=gateway.pinata.cloud
```

`frontend/.env` — used by the browser-side mint flow (Vite exposes only `VITE_`-prefixed vars):

```bash
# frontend/.env
VITE_PINATA_JWT=your_pinata_jwt
VITE_PINATA_GATEWAY=gateway.pinata.cloud
```

> The Pinata JWT ships in the client bundle, so generate one with the narrowest scope you need: https://app.pinata.cloud/developers/api-keys

### 3. Deploy the contracts to Sepolia

```bash
npm run contracts:compile
npm --workspace contracts run deploy:sepolia   # = cd contracts && npx hardhat run scripts/deploy.ts --network sepolia
```

The deploy script prints the `RelicVaultCard` and `RelicVaultMarketplace` addresses. Optionally verify them on Etherscan:

```bash
cd contracts
npx hardhat verify --network sepolia <CARD_ADDRESS>
npx hardhat verify --network sepolia <MARKETPLACE_ADDRESS> <CARD_ADDRESS> <FEE_RECIPIENT>
```

Then point the frontend at your deployment by editing the addresses in `frontend/src/contracts/addresses.ts`.

### 4. Run the frontend

```bash
npm run frontend:dev              # = cd frontend && npm run dev
```

Open the printed URL (default http://localhost:5173), connect your wallet, switch to Sepolia when prompted, and start minting.

### Uploading seed metadata (optional)

`contracts/scripts/uploadMetadata.ts` pins a set of archetype card SVGs + JSON to Pinata and prints IPFS-ready URIs:

```bash
cd contracts
npx ts-node scripts/uploadMetadata.ts
```

Requires `PINATA_JWT` and `PINATA_GATEWAY` in `contracts/.env`.

## 6. Running Tests

Smart contracts (Hardhat):

```bash
npm run contracts:test            # = cd contracts && npx hardhat test
```

Contract coverage (optional):

```bash
npm --workspace contracts run coverage
```

Frontend (Vitest):

```bash
cd frontend
npm test
```

Production build / typecheck of the frontend:

```bash
npm run frontend:build            # tsc -b && vite build
```

## 7. Rarity Tiers

| Tier | Frame | Flavor |
|---|---|---|
| **Common** | Bronze | Everyday creatures and simple trinkets — every adventurer owns a few. |
| **Uncommon** | Emerald | Seasoned sellswords, forest spirits, and enchanted tools with a touch of magic. |
| **Rare** | Sapphire | Renowned champions and relics of old kingdoms, sought after by collectors. |
| **Epic** | Arcane violet | Near-legendary heroes and artifacts that bend the rules of the world. |
| **Legendary** | Gold | Figures of myth and weapons forged by gods — the centerpieces of any vault. |
| **Mythic** | Radiant gold | Primordial beings and world-shaping treasures; the rarest mints the forge produces. |

Rarity lives in each card's on-chain metadata (`attributes[].trait_type = "Rarity"`) and drives the frame and badge treatment in the UI.

## 8. Contract Addresses (Sepolia)

After running the deploy script, record the addresses below and paste them into `frontend/src/contracts/addresses.ts`:

| Contract | Address |
|---|---|
| RelicVaultCard (ERC-721, name `The Relic Vault`, symbol `RELIC`) | `<CARD_ADDRESS>` |
| RelicVaultMarketplace | `<MARKETPLACE_ADDRESS>` |

Explorer links follow the standard format:

```
https://sepolia.etherscan.io/address/<CONTRACT_ADDRESS>
```

Example: `https://sepolia.etherscan.io/address/0x7146F59993E86BfAEFDe4C175051F325ADAAD26a`

## 9. Contributing

Contributions are welcome — this is a demo project, so small, focused improvements land best.

1. Fork the repo and create a feature branch.
2. Keep changes scoped: contract changes go with their tests in `contracts/test/`; UI changes stay consistent with the High Fantasy theme.
3. Run the suites before opening a PR:
   ```bash
   npm run contracts:test
   cd frontend && npm test && npm run build
   ```
4. Open a pull request describing what changed and why.

## 11. Deployed link

Live hosted app: [https://the-relic-vault.vercel.app/](https://the-relic-vault.vercel.app/)

Connect a Web3 wallet (MetaMask), switch to Sepolia, and you can mint, list, and trade cards directly from the deployed frontend. Contract deployments are kept up to date with the addresses in `frontend/src/contracts/addresses.ts` — if the app ever shows a "contract not found" state, check that file against the latest Sepolia deployment.


## 10. License & Credits

**License:** No license has been chosen yet — the project is intended for demonstration and recruitment purposes. Please ask the maintainers before reusing the code elsewhere.

**Credits:** Built on Hardhat and OpenZeppelin Contracts v5 (ERC-721), ethers.js, React + Vite + Tailwind CSS, Pinata for IPFS pinning, three.js for the arcane background, and the Sepolia testnet. This project exists thanks to the free tools and faucets of the Ethereum testnet ecosystem.

