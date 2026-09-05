import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatEther } from 'ethers';
import { ArrowUpDown, Filter, Loader2, RefreshCw, Sparkles, Wallet } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { fetchCardMetadata, type ParsedCardMetadata } from '../lib/pinata';
import { getExplorerTxUrl, getTxErrorMessage, rarityStyles, truncateAddress } from '../lib/utils';
import { toast } from 'react-hot-toast';

const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

type ListedCard = {
  tokenId: number;
  seller: string;
  price: bigint;
  metadata: ParsedCardMetadata | null;
  metadataFailed: boolean;
};

export function MarketplaceGallery() {
  const { account, isConnected, isWrongNetwork, connectWallet, switchToSepolia, cardContract, marketplaceContract } = useWeb3();

  const [cards, setCards] = useState<ListedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buyingTokenId, setBuyingTokenId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [rarityFilter, setRarityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [maxPrice, setMaxPrice] = useState(5);

  const markMetadataFailed = useCallback((tokenId: number) => {
    setCards((prev) => prev.map((c) => (c.tokenId === tokenId ? { ...c, metadataFailed: true } : c)));
  }, []);

  const loadListings = useCallback(async () => {
    setError(null);
    if (!isConnected || !account || !cardContract || !marketplaceContract) {
      setCards([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setCards([]);
    try {
      const total: bigint = await cardContract.totalSupply();
      const resolved: ListedCard[] = [];

      for (let tokenId = 0; tokenId < Number(total); tokenId++) {
        const listing = await marketplaceContract.getListing(tokenId);
        if (!listing.active) continue;
        resolved.push({ tokenId, seller: listing.seller, price: listing.price, metadata: null, metadataFailed: false });
      }

      setCards(resolved);

      // Fetch metadata for each listing progressively so the grid renders fast.
      for (const card of resolved) {
        const uri: string = await cardContract.tokenURI(card.tokenId).catch(() => '');
        if (!uri) {
          markMetadataFailed(card.tokenId);
          continue;
        }
        fetchCardMetadata(uri)
          .then((metadata) => {
            setCards((prev) => prev.map((c) => (c.tokenId === card.tokenId ? { ...c, metadata } : c)));
          })
          .catch(() => markMetadataFailed(card.tokenId));
      }
    } catch (err) {
      console.error('Failed to load listings:', err);
      setError('Could not load listings from the marketplace. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [isConnected, account, cardContract, marketplaceContract, markMetadataFailed]);

  useEffect(() => {
    void loadListings();
  }, [loadListings, refreshKey]);

  const handleBuy = async (card: ListedCard) => {
    if (!marketplaceContract || !isConnected) return;
    setBuyingTokenId(card.tokenId);
    const toastId = `buy-${card.tokenId}`;
    try {
      const tx = await marketplaceContract.purchaseCard(card.tokenId, { value: card.price });
      toast.loading('Purchase pending — waiting for confirmation...', { id: toastId });
      await tx.wait();
      toast.success('Card purchased!', { id: toastId, duration: 8000 });
      toast(`Confirmed — view on Etherscan: ${getExplorerTxUrl(tx.hash)}`, { id: `${toastId}-link`, duration: 10000 });
      await loadListings();
    } catch (err) {
      toast.error(`Purchase failed: ${getTxErrorMessage(err)}`, { id: toastId });
    } finally {
      setBuyingTokenId(null);
    }
  };

  const visibleCards = useMemo(() => {
    const filtered = cards.filter((card) => {
      const rarityMatch = rarityFilter === 'All' || card.metadata?.rarity === rarityFilter;
      const priceMatch = Number(formatEther(card.price)) <= maxPrice;
      return rarityMatch && priceMatch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'price-asc') return Number(formatEther(a.price)) - Number(formatEther(b.price));
      if (sortBy === 'price-desc') return Number(formatEther(b.price)) - Number(formatEther(a.price));
      if (sortBy === 'rarity') {
        const ar = RARITY_ORDER.indexOf(a.metadata?.rarity ?? 'Common');
        const br = RARITY_ORDER.indexOf(b.metadata?.rarity ?? 'Common');
        return br - ar;
      }
      return b.tokenId - a.tokenId;
    });
  }, [cards, rarityFilter, sortBy, maxPrice]);

  if (!isConnected) {
    return (
      <div className="myth-frame flex flex-col items-center justify-center gap-4 rounded-[28px] px-6 py-20 text-center">
        <Wallet className="h-10 w-10 text-amber-300" />
        <h1 className="font-display text-3xl font-black text-amber-50">The market awaits an adventurer</h1>
        <p className="max-w-md text-stone-300">
          Connect your wallet to browse the live MythForge marketplace and claim legendary cards.
        </p>
        <button
          type="button"
          onClick={connectWallet}
          className="rounded-full border border-amber-400 bg-amber-500/15 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-amber-100 shadow-ember transition hover:bg-amber-500/25"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-amber-700/30 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 p-8 shadow-glow">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-amber-300">MythForge Market</p>
            <h1 className="font-display text-4xl font-black tracking-tight text-amber-50 md:text-6xl">Heroes, beasts, and relics of legend.</h1>
          </div>

          <div className="rounded-xl border border-amber-400/40 bg-stone-950/60 px-4 py-3 text-right text-amber-100">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-300">Live Sepolia</p>
            <p className="mt-2 text-2xl font-bold">{visibleCards.length} listed</p>
          </div>
        </div>
      </section>

      {isWrongNetwork && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-yellow-600/40 bg-yellow-600/10 px-5 py-4 text-yellow-100 md:flex-row">
          <p className="text-sm">You are on the wrong network — MythForge lives on Sepolia.</p>
          <button
            type="button"
            onClick={switchToSepolia}
            className="rounded-full border border-yellow-400/70 bg-yellow-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-yellow-200"
          >
            Switch to Sepolia
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-700/40 bg-red-700/10 px-5 py-4 text-red-200">
          <p className="text-sm">{error}</p>
          <button type="button" onClick={() => setRefreshKey((k) => k + 1)} className="rounded-full border border-red-500/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em]">
            Retry
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-stone-700/60 bg-stone-900/60 p-4 backdrop-blur-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-stone-200">
            <Filter className="h-4 w-4 text-amber-300" />
            <span className="text-sm uppercase tracking-[0.2em]">Filters</span>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="ml-3 inline-flex items-center gap-1 rounded-full border border-stone-600 px-3 py-1 text-xs uppercase tracking-[0.15em] text-stone-200 transition hover:border-amber-500/50"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={rarityFilter}
              onChange={(event) => setRarityFilter(event.target.value)}
              className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
            >
              <option value="All">All rarities</option>
              {RARITY_ORDER.map((rarity) => (
                <option key={rarity} value={rarity}>{rarity}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm text-stone-200">
              <span>Max ETH</span>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={maxPrice}
                onChange={(event) => setMaxPrice(Number(event.target.value))}
              />
              <span className="font-mono text-amber-300">{maxPrice.toFixed(1)}</span>
            </label>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-amber-300" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rarity">Rarity</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {loading && visibleCards.length === 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="myth-frame h-96 animate-pulse rounded-[24px]" />
          ))}
        </div>
      ) : visibleCards.length === 0 ? (
        <div className="myth-frame flex flex-col items-center gap-3 rounded-[24px] px-6 py-16 text-center">
          <p className="font-display text-2xl font-bold text-amber-50">No legends are currently listed</p>
          <p className="max-w-md text-stone-300">Cards are listed by their owners in the "My Cards" section — mint one and put it on the market.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {visibleCards.map((card) => {
            const isOwnListing = card.seller.toLowerCase() === account?.toLowerCase();
            return (
              <div key={card.tokenId} className="myth-frame group flex flex-col overflow-hidden rounded-[24px] transition hover:-translate-y-1 hover:border-amber-500/60">
                <Link to={`/card/${card.tokenId}`} className="block">
                  <div className="relative overflow-hidden">
                    {card.metadata?.image ? (
                      <img src={card.metadata.image} alt={card.metadata.name} className="h-64 w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-64 w-full items-center justify-center bg-gradient-to-br from-stone-800 to-stone-950 text-xs uppercase tracking-[0.2em] text-stone-500">
                        {card.metadataFailed ? 'Metadata unavailable' : 'Loading runes...'}
                      </div>
                    )}
                    {card.metadata && (
                      <div className={`absolute left-3 top-3 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${rarityStyles(card.metadata.rarity)}`}>
                        {card.metadata.rarity}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-display text-xl font-bold text-amber-50">{card.metadata?.name ?? `Token #${card.tokenId}`}</h2>
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-mono text-xs text-amber-200">
                        {formatEther(card.price)} ETH
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-stone-300">
                      <div className="flex items-center justify-between"><span>Seller</span><span>{truncateAddress(card.seller)}</span></div>
                      {card.metadata && (
                        <>
                          <div className="flex items-center justify-between"><span>Attack</span><span>{card.metadata.attack}</span></div>
                          <div className="flex items-center justify-between"><span>Defense</span><span>{card.metadata.defense}</span></div>
                        </>
                      )}
                    </div>

                    {card.metadata && (
                      <div className="flex items-center justify-between border-t border-amber-900/40 pt-3 text-xs uppercase tracking-[0.2em] text-stone-400">
                        <span>{card.metadata.element}</span>
                        <span className="inline-flex items-center gap-1 text-amber-300">
                          <Sparkles className="h-3 w-3" />
                          {card.metadata.special}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="px-4 pb-4">
                  {isOwnListing ? (
                    <span className="block rounded-full border border-stone-600 px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-stone-300">
                      Your listing
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleBuy(card)}
                      disabled={buyingTokenId === card.tokenId || isWrongNetwork}
                      className="w-full rounded-full border border-amber-500 bg-amber-500/15 px-4 py-2 text-sm font-bold uppercase tracking-[0.2em] text-amber-100 shadow-ember transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {buyingTokenId === card.tokenId ? (
                        <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Purchasing...</span>
                      ) : (
                        'Buy card'
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}