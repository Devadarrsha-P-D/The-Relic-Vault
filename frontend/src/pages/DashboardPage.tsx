import { useCallback, useEffect, useState } from 'react';
import { formatEther, parseEther, type TransactionResponse } from 'ethers';
import { CheckCircle2, Loader2, PackageOpen, RefreshCw, Tag, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import { fetchCardMetadata, type ParsedCardMetadata } from '../lib/pinata';
import { getExplorerTxUrl, getTxErrorMessage, rarityStyles, truncateAddress } from '../lib/utils';

type OwnedCard = {
  tokenId: number;
  metadata: ParsedCardMetadata | null;
  metadataFailed: boolean;
  listed: boolean;
  listingPrice: bigint | null;
};

export function DashboardPage() {
  const {
    account,
    isConnected,
    isWrongNetwork,
    connectWallet,
    switchToSepolia,
    cardContract,
    marketplaceContract,
  } = useWeb3();

  const [cards, setCards] = useState<OwnedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listPrices, setListPrices] = useState<Record<number, string>>({});
  const [busyTokenId, setBusyTokenId] = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState<'list' | 'delist' | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const markMetadataFailed = useCallback((tokenId: number) => {
    setCards((prev) => prev.map((c) => (c.tokenId === tokenId ? { ...c, metadataFailed: true } : c)));
  }, []);

  const loadOwnedCards = useCallback(async () => {
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
      const mine: OwnedCard[] = [];

      for (let tokenId = 0; tokenId < Number(total); tokenId++) {
        const owner: string = await cardContract.ownerOf(tokenId).catch(() => '');
        if (!owner || owner.toLowerCase() !== account.toLowerCase()) continue;

        const listing = await marketplaceContract.getListing(tokenId);
        mine.push({
          tokenId,
          metadata: null,
          metadataFailed: false,
          listed: listing.active,
          listingPrice: listing.active ? listing.price : null,
        });
      }

      setCards(mine);

      for (const card of mine) {
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
      console.error('Failed to load owned cards:', err);
      setError('Could not load your cards. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [isConnected, account, cardContract, marketplaceContract, markMetadataFailed]);

  useEffect(() => {
    void loadOwnedCards();
  }, [loadOwnedCards, refreshKey]);

  const sendTx = async (action: () => Promise<TransactionResponse>, label: string, successMessage: string) => {
    const toastId = `${label}-${Date.now()}`;
    toast.loading(`${label} pending — waiting for confirmation...`, { id: toastId });
    try {
      const tx = await action();
      await tx.wait();
      toast.success(`${successMessage} — view on Etherscan: ${getExplorerTxUrl(tx.hash)}`, { id: toastId, duration: 10000 });
      await loadOwnedCards();
    } catch (err) {
      toast.error(`${label} failed: ${getTxErrorMessage(err)}`, { id: toastId });
    }
  };

  const handleList = async (tokenId: number) => {
    if (!cardContract || !marketplaceContract || !account) return;
    const priceStr = listPrices[tokenId];
    if (!priceStr || Number(priceStr) <= 0) {
      toast.error('Enter a valid price in ETH first.');
      return;
    }
    setBusyTokenId(tokenId);
    setBusyAction('list');
    try {
      const marketplaceAddress: string = await marketplaceContract.getAddress();
      const isApproved: boolean = await cardContract.isApprovedForAll(account, marketplaceAddress);
      if (!isApproved) {
        await sendTx(
          () => cardContract.setApprovalForAll(marketplaceAddress, true),
          'Approving marketplace',
          'Marketplace approved',
        );
      }
      await sendTx(
        () => marketplaceContract.listCard(tokenId, parseEther(priceStr)),
        'Listing card',
        'Card listed',
      );
      setListPrices((prev) => ({ ...prev, [tokenId]: '' }));
    } finally {
      setBusyTokenId(null);
      setBusyAction(null);
    }
  };

  const handleDelist = async (tokenId: number) => {
    if (!marketplaceContract) return;
    setBusyTokenId(tokenId);
    setBusyAction('delist');
    try {
      await sendTx(
        () => marketplaceContract.delistCard(tokenId),
        'Delisting card',
        'Card delisted',
      );
    } finally {
      setBusyTokenId(null);
      setBusyAction(null);
    }
  };

  const totalValue = cards.reduce((sum, card) => sum + (card.listingPrice ? Number(formatEther(card.listingPrice)) : 0), 0);

  if (!isConnected) {
    return (
      <div className="myth-frame flex flex-col items-center justify-center gap-4 rounded-[28px] px-6 py-20 text-center">
        <Wallet className="h-10 w-10 text-amber-300" />
        <h1 className="font-display text-3xl font-black text-amber-50">Your vault is sealed</h1>
        <p className="max-w-md text-stone-300">Connect your wallet to see the cards you own and manage your listings.</p>
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
    <div className="space-y-6">
      <div className="rounded-[28px] border border-amber-700/30 bg-gradient-to-r from-amber-500/10 via-stone-900 to-emerald-500/10 p-6 shadow-glow">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Collection overview</p>
            <h1 className="font-display mt-2 text-4xl font-black text-amber-50">My Cards</h1>
            <p className="mt-2 text-sm text-stone-300">{cards.length} card{cards.length === 1 ? '' : 's'} owned · {truncateAddress(account)}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-amber-400/50 bg-stone-950/70 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Listed value</p>
              <p className="mt-2 font-mono text-2xl text-amber-200">{totalValue.toFixed(3)} ETH</p>
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-2 rounded-full border border-stone-600 px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] text-stone-100 transition hover:border-amber-500/50"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {isWrongNetwork && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-yellow-600/40 bg-yellow-600/10 px-5 py-4 text-yellow-100 md:flex-row">
          <p className="text-sm">Wrong network — The Relic Vault lives on Sepolia.</p>
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

      {loading && cards.length === 0 ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="myth-frame h-36 animate-pulse rounded-[24px]" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="myth-frame flex flex-col items-center gap-3 rounded-[24px] px-6 py-16 text-center">
          <PackageOpen className="h-10 w-10 text-amber-300" />
          <p className="font-display text-2xl font-bold text-amber-50">No cards in your vault yet</p>
          <p className="max-w-md text-stone-300">Head to the Mint page to forge a new card, then come back to list it on the market.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => {
            const busy = busyTokenId === card.tokenId;
            return (
              <div key={card.tokenId} className="myth-frame flex flex-col gap-4 rounded-[24px] p-4 md:flex-row md:items-center">
                {card.metadata?.image ? (
                  <img src={card.metadata.image} alt={card.metadata.name} className="h-32 w-32 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-stone-800 to-stone-950 text-xs uppercase tracking-[0.2em] text-stone-500">
                    {card.metadataFailed ? 'Metadata unavailable' : 'Loading...'}
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-2xl font-bold text-amber-50">{card.metadata?.name ?? `Token #${card.tokenId}`}</h2>
                    {card.metadata && (
                      <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${rarityStyles(card.metadata.rarity)}`}>{card.metadata.rarity}</span>
                    )}
                    {card.listed ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                        <CheckCircle2 className="h-4 w-4" /> Listed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-stone-600 bg-stone-700/40 px-2 py-1 text-stone-200">
                        Not listed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-400">Token #{card.tokenId}</p>
                  {card.metadata && (
                    <p className="text-sm text-stone-300">
                      {card.metadata.element} · Attack {card.metadata.attack} · Defense {card.metadata.defense} · {card.metadata.special}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 md:items-end">
                  {card.listed && card.listingPrice !== null ? (
                    <span className="font-mono text-lg text-amber-200">{formatEther(card.listingPrice)} ETH</span>
                  ) : null}

                  {card.listed ? (
                    <button
                      type="button"
                      onClick={() => void handleDelist(card.tokenId)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-full border border-stone-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-stone-100 transition hover:border-red-500/60 disabled:opacity-50"
                    >
                      {busy && busyAction === 'delist' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Delist
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        placeholder="Price ETH"
                        value={listPrices[card.tokenId] ?? ''}
                        onChange={(event) => setListPrices((prev) => ({ ...prev, [card.tokenId]: event.target.value }))}
                        className="w-32 rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void handleList(card.tokenId)}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-full border border-amber-400/60 bg-amber-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        {busy && busyAction === 'list' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                        List
                      </button>
                    </div>
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