# MythForge Contracts

This package contains the Solidity smart contracts and Hardhat tooling for the MythForge NFT marketplace on Sepolia.

## Features

- ERC-721 card minting with sequential token IDs and per-token URI storage
- Marketplace contract with listing, delisting, price updates, and ETH purchase flow
- Marketplace fee routing to a configurable fee recipient
- Hardhat test suite and Solidity coverage reporting

## Setup

1. Copy `.env.example` to `.env`.
2. Set the required values:
   - `SEPOLIA_RPC_URL`
   - `PRIVATE_KEY`
   - `ETHERSCAN_API_KEY`
   - `FEE_RECIPIENT`
3. Install dependencies:
   ```bash
   npm install
   ```

## Compile

```bash
npx hardhat compile
```

## Test

```bash
npx hardhat test
```

## Coverage

```bash
npx hardhat coverage
```

## Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

The deploy script prints the card and marketplace contract addresses and accepts configuration through the env variables defined above.

## Verify on Etherscan

After deployment, verify each contract with:

```bash
npx hardhat verify --network sepolia <CARD_ADDRESS>

npx hardhat verify --network sepolia <MARKETPLACE_ADDRESS> <CARD_ADDRESS> <FEE_RECIPIENT>
```

## Notes

- The marketplace expects the NFT contract to be approved before listing a token.
- Payment is in ETH, and a 2% marketplace fee is forwarded to the configured fee recipient.
