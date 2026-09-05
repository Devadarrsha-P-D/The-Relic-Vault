# MythForge Frontend

High fantasy UI for the MythForge NFT marketplace — a Vite + React + TypeScript app styled with Tailwind CSS and the Cinzel / Crimson Text typefaces.

## Scripts

```bash
npm install
npm run dev        # start the dev server
npm run build      # typecheck (tsc -b) and production build
npm test           # run the Vitest suite
npm run lint       # run Oxlint
npm run preview    # preview the production build
```

## Structure

- `src/pages/` — Marketplace gallery, mint, card detail, and "My Cards" screens, all wired to the live contracts and IPFS metadata.
- `src/components/` — `Header` (wallet + nav) and `Hero3DBackground` (3D arcane-rune backdrop).
- `src/contexts/Web3Context.tsx` — wallet connection, network handling, and contract wiring (MetaMask via `window.ethereum` + ethers v6).
- `src/contracts/` — deployed MythForge contract ABIs and Sepolia addresses.
- `src/lib/` — Pinata/IPFS helpers (`pinata.ts`), metadata fetching, and formatting/rarity utilities (`utils.ts`). Mock card data is only used as demo fallback on the card detail page when no wallet is connected.

## Configuration

Contract addresses live in `src/contracts/addresses.ts` and are consumed by `Web3Context`. The app targets the Sepolia testnet — connect a wallet, switch to Sepolia if prompted, and the header will surface the wallet state.

## IPFS uploads (mint page)

Minting uploads card art + JSON metadata to Pinata directly from the browser before calling `mintCard`. Copy `.env.example` to `.env` and set:

- `VITE_PINATA_JWT` — Pinata API key JWT (https://app.pinata.cloud/developers/api-keys). It is bundled into the client, so scope it appropriately.
- `VITE_PINATA_GATEWAY` — public gateway used to load IPFS content (defaults to `gateway.pinata.cloud`).