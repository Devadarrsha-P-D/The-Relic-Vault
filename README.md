# NeonForge

NeonForge is a cyberpunk-themed NFT marketplace for AI construct game cards, deployed to the Sepolia testnet. The repository is organized as a monorepo with a Solidity Hardhat project in `contracts` and a Vite + React + Tailwind frontend in `frontend`.

## Architecture overview

- `contracts/`: Hardhat + Solidity smart contracts, deployment scripts, metadata upload utility, and test suite.
- `contracts/contracts/NeonForgeCard.sol`: ERC-721 contract with sequential minting and per-token URI storage.
- `contracts/contracts/NeonForgeMarketplace.sol`: marketplace logic for listing, delisting, price updates, and ETH purchases with a 2% marketplace fee.
- `frontend/`: React app featuring the cyberpunk UI, wallet connection flow, NFT gallery, mint page, dashboard, and profile screens.

## Required environment variables

The contracts and metadata tooling use the following env vars:

- `SEPOLIA_RPC_URL`
- `PRIVATE_KEY`
- `ETHERSCAN_API_KEY`
- `FEE_RECIPIENT`
- `PINATA_JWT`
- `PINATA_GATEWAY`

Copy `.env.example` in the contracts package and populate the values before deployment or metadata upload operations.

## Smart contract commands

From the `contracts` folder:

```bash
npm install
npx hardhat compile
npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy.ts --network sepolia
```

## Etherscan verification

After a Sepolia deployment, verify the contracts with:

```bash
npx hardhat verify --network sepolia <CARD_ADDRESS>

npx hardhat verify --network sepolia <MARKETPLACE_ADDRESS> <CARD_ADDRESS> <FEE_RECIPIENT>
```

## Frontend commands

From the `frontend` folder:

```bash
npm install
npm run dev
npm run build
npm test -- --run
```

## Metadata and IPFS upload

The metadata uploader script is located at `contracts/scripts/uploadMetadata.ts` and can be run with:

```bash
npx ts-node scripts/uploadMetadata.ts
```

It uploads placeholder SVG frames and synthetic metadata, then prints IPFS-ready URIs to use during minting or for future card metadata sources.

## Known limitations

- Sepolia faucet dependency for test ETH.
- IPFS pinning latency and external upload dependency.
- No order-book or auction system yet.
- Gas costs and final transaction times remain dependent on network conditions.
- Wallet connectivity and contract addresses will need actual deployed values for a live end-to-end demo.

## Next steps for production usage

1. Replace the placeholder mock marketplace data with live contract-backed reads.
2. Deploy contracts to Sepolia and populate the deployed addresses in the frontend config.
3. Add actual metadata generation and user-upload flows for real custom card art.
4. Expand the dashboard/profile screens with full on-chain transaction history and collection analytics.
