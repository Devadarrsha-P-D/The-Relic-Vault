import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "./context/Web3Context";
import { NEONFORGE_MARKETPLACE_ADDRESS } from "./contracts/addresses";

interface CardInfo {
  tokenId: number;
  tokenURI: string;
  owner: string;
}

interface ListingInfo {
  tokenId: number;
  seller: string;
  price: bigint;
  tokenURI: string;
}

function App() {
  const {
    address,
    connect,
    isCorrectNetwork,
    cardContract,
    marketplaceContract,
  } = useWeb3();

  const [myCards, setMyCards] = useState<CardInfo[]>([]);
  const [listings, setListings] = useState<ListingInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [mintURI, setMintURI] = useState("");
  const [minting, setMinting] = useState(false);
  const [listPrices, setListPrices] = useState<Record<number, string>>({});
  const [busyTokenId, setBusyTokenId] = useState<number | null>(null);

  const switchNetwork = async () => {
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });
    } catch (err: any) {
      if (err.code === 4902) {
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0xaa36a7",
              chainName: "Sepolia",
              nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      } else {
        console.error(err);
      }
    }
  };

  const loadData = useCallback(async () => {
    if (!cardContract || !marketplaceContract || !address) return;
    setLoading(true);
    try {
      const totalSupply: bigint = await cardContract.totalSupply();
      const total = Number(totalSupply);

      const mine: CardInfo[] = [];
      const active: ListingInfo[] = [];

      for (let tokenId = 0; tokenId < total; tokenId++) {
        const listing = await marketplaceContract.getListing(tokenId);

        if (listing.active) {
          const uri = await cardContract.tokenURI(tokenId).catch(() => "");
          active.push({
            tokenId,
            seller: listing.seller,
            price: listing.price,
            tokenURI: uri,
          });
        } else {
          const owner = await cardContract.ownerOf(tokenId).catch(() => null);
          if (owner && owner.toLowerCase() === address.toLowerCase()) {
            const uri = await cardContract.tokenURI(tokenId).catch(() => "");
            mine.push({ tokenId, tokenURI: uri, owner });
          }
        }
      }

      setMyCards(mine);
      setListings(active);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, [cardContract, marketplaceContract, address]);

  useEffect(() => {
    if (isCorrectNetwork) {
      loadData();
    }
  }, [isCorrectNetwork, loadData]);

  const handleMint = async () => {
    if (!cardContract || !address || !mintURI) return;
    setMinting(true);
    try {
      const tx = await cardContract.mintCard(address, mintURI);
      await tx.wait();
      setMintURI("");
      await loadData();
    } catch (err) {
      console.error("Mint failed:", err);
      alert("Mint failed — check console for details.");
    } finally {
      setMinting(false);
    }
  };

  const handleList = async (tokenId: number) => {
    if (!cardContract || !marketplaceContract) return;
    const priceStr = listPrices[tokenId];
    if (!priceStr || Number(priceStr) <= 0) {
      alert("Enter a valid price in ETH first.");
      return;
    }
    setBusyTokenId(tokenId);
    try {
      const isApproved = await cardContract.isApprovedForAll(
        address,
        NEONFORGE_MARKETPLACE_ADDRESS
      );
      if (!isApproved) {
        const approveTx = await cardContract.setApprovalForAll(
          NEONFORGE_MARKETPLACE_ADDRESS,
          true
        );
        await approveTx.wait();
      }

      const priceWei = ethers.parseEther(priceStr);
      const listTx = await marketplaceContract.listCard(tokenId, priceWei);
      await listTx.wait();

      await loadData();
    } catch (err) {
      console.error("Listing failed:", err);
      alert("Listing failed — check console for details.");
    } finally {
      setBusyTokenId(null);
    }
  };

  const handleBuy = async (tokenId: number, price: bigint) => {
    if (!marketplaceContract) return;
    setBusyTokenId(tokenId);
    try {
      const tx = await marketplaceContract.purchaseCard(tokenId, { value: price });
      await tx.wait();
      await loadData();
    } catch (err) {
      console.error("Purchase failed:", err);
      alert("Purchase failed — check console for details.");
    } finally {
      setBusyTokenId(null);
    }
  };

  const handleDelist = async (tokenId: number) => {
    if (!marketplaceContract) return;
    setBusyTokenId(tokenId);
    try {
      const tx = await marketplaceContract.delistCard(tokenId);
      await tx.wait();
      await loadData();
    } catch (err) {
      console.error("Delist failed:", err);
      alert("Delist failed — check console for details.");
    } finally {
      setBusyTokenId(null);
    }
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
        <h1 className="text-4xl font-bold text-cyan-400 tracking-wider">NEONFORGE</h1>
        <button
          onClick={connect}
          className="px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg font-semibold shadow-[0_0_15px_rgba(217,70,239,0.6)] transition"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
        <h1 className="text-4xl font-bold text-cyan-400 tracking-wider">NEONFORGE</h1>
        <p className="text-red-400">Wrong network — switch to Sepolia.</p>
        <button
          onClick={switchNetwork}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold shadow-[0_0_15px_rgba(6,182,212,0.6)] transition"
        >
          Switch to Sepolia
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <header className="flex justify-between items-center mb-10 border-b border-fuchsia-800/50 pb-4">
        <h1 className="text-3xl font-bold text-cyan-400 tracking-wider">NEONFORGE</h1>
        <span className="text-sm text-gray-400 font-mono">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </header>

      {/* Mint section */}
      <section className="mb-12 bg-gray-900/60 border border-cyan-800/40 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-fuchsia-400 mb-4">Mint a Card</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Metadata URI (e.g. ipfs://...)"
            value={mintURI}
            onChange={(e) => setMintURI(e.target.value)}
            className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleMint}
            disabled={minting || !mintURI}
            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 rounded-lg font-semibold transition"
          >
            {minting ? "Minting..." : "Mint"}
          </button>
        </div>
      </section>

      {/* My Cards */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-fuchsia-400 mb-4">
          My Cards {loading && <span className="text-sm text-gray-500">(loading...)</span>}
        </h2>
        {myCards.length === 0 ? (
          <p className="text-gray-500">No unlisted cards owned right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {myCards.map((card) => (
              <div
                key={card.tokenId}
                className="bg-gray-900/60 border border-gray-700 rounded-xl p-4"
              >
                <p className="text-sm text-gray-400 mb-1">Token #{card.tokenId}</p>
                <p className="text-xs text-gray-500 truncate mb-3">{card.tokenURI}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Price ETH"
                    value={listPrices[card.tokenId] || ""}
                    onChange={(e) =>
                      setListPrices({ ...listPrices, [card.tokenId]: e.target.value })
                    }
                    className="flex-1 bg-black border border-gray-700 rounded-lg px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => handleList(card.tokenId)}
                    disabled={busyTokenId === card.tokenId}
                    className="px-3 py-1 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 rounded-lg text-sm font-semibold transition"
                  >
                    {busyTokenId === card.tokenId ? "..." : "List"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Marketplace */}
      <section>
        <h2 className="text-xl font-semibold text-fuchsia-400 mb-4">Marketplace</h2>
        {listings.length === 0 ? (
          <p className="text-gray-500">No active listings.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {listings.map((listing) => {
              const isMine = listing.seller.toLowerCase() === address.toLowerCase();
              return (
                <div
                  key={listing.tokenId}
                  className="bg-gray-900/60 border border-cyan-800/40 rounded-xl p-4"
                >
                  <p className="text-sm text-gray-400 mb-1">Token #{listing.tokenId}</p>
                  <p className="text-xs text-gray-500 truncate mb-2">{listing.tokenURI}</p>
                  <p className="text-cyan-400 font-semibold mb-3">
                    {ethers.formatEther(listing.price)} ETH
                  </p>
                  {isMine ? (
                    <button
                      onClick={() => handleDelist(listing.tokenId)}
                      disabled={busyTokenId === listing.tokenId}
                      className="w-full px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg text-sm font-semibold transition"
                    >
                      {busyTokenId === listing.tokenId ? "..." : "Delist"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuy(listing.tokenId, listing.price)}
                      disabled={busyTokenId === listing.tokenId}
                      className="w-full px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 rounded-lg text-sm font-semibold transition"
                    >
                      {busyTokenId === listing.tokenId ? "..." : "Buy"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;

