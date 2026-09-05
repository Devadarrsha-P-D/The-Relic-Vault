import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatEther } from 'ethers';
import { ArrowLeft, Loader2, Shield, Sparkles, Swords, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import { fetchCardMetadata, type ParsedCardMetadata } from '../lib/pinata';
import { getExplorerTxUrl, getTxErrorMessage, rarityStyles, truncateAddress } from '../lib/utils';
import { mockCards } from '../lib/mockData';

type LiveCard = {
  tokenId: number;
  owner: string;
  metadata: ParsedCardMetadata;
  listed: boolean;
  price: bigint | null;
  seller: string | null;
};

export function CardDetail() {
  const { tokenId } = useParams();
  const tokenNumber = Number(tokenId);

  const { account, isConnected, isWrongNetwork, connectWallet, cardContract, marketplaceContract } = useWeb3();

  const [live, setLive] = useState<LiveCard | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [buying, setBuying] = useState(false);

  const mockCard = useMemo(() => mockCards.find((item) => item.tokenId === tokenNumber) ?? mockCards[0], [tokenNumber]);

  const loadLiveCard = useCallback(async () => {
    if (!isConnected || !cardContract || !marketplaceContract || !Number.isInteger(tokenNumber)) {
      setLive(null);
      setLoadingLive(false);
      return;
    }
    setLoadingLive(true);
    setNotFound(false);
    try {
      const owner: string = await cardContract.ownerOf(tokenNumber).catch(() => '');
      if (!owner) {
        setNotFound(true);
        setLive(null);
        return;
      }
      const listing = await marketplaceContract.getListing(tokenNumber);
      const uri: string = await cardContract.tokenURI(tokenNumber).catch(() => '');
      const metadata = uri
        ? await fetchCardMetadata(uri).catch(() => null)
        : null;
      if (!metadata) {
        setNotFound(true);
        setLive(null);
        return;
      }
      setLive({
        tokenId: tokenNumber,
        owner,
        metadata,
        listed: listing.active,
        price: listing.active ? listing.price : null,
        seller: listing.active ? listing.seller : null,
      });
    } catch (err) {
      console.error('Failed to load card:', err);
      setNotFound(true);
      setLive(null);
    } finally {
      setLoadingLive(false);
    }
  }, [isConnected, cardContract, marketplaceContract, tokenNumber]);

  useEffect(() => {
    void loadLiveCard();
  }, [loadLiveCard]);

  const handleBuy = async () => {
    if (!marketplaceContract || !live?.listed || live.price === null) return;
    setBuying(true);
    const toastId = `buy-${live.tokenId}`;
    try {
      const tx = await marketplaceContract.purchaseCard(live.tokenId, { value: live.price });
      toast.loading('Purchase pending — waiting for confirmation...', { id: toastId });
      await tx.wait();
      toast.success('Card purchased!', { id: toastId, duration: 8000 });
      toast(`Confirmed — view on Etherscan: ${getExplorerTxUrl(tx.hash)}`, { id: `${toastId}-link`, duration: 10000 });
      await loadLiveCard();
    } catch (err) {
      toast.error(`Purchase failed: ${getTxErrorMessage(err)}`, { id: toastId });
    } finally {
      setBuying(false);
    }
  };

  const name = live?.metadata.name ?? mockCard.name;
  const description = live?.metadata.description ?? mockCard.description;
  const image = live?.metadata.image ?? mockCard.image;
  const rarity = live?.metadata.rarity ?? mockCard.rarity;
  const attack = live?.metadata.attack ?? mockCard.attack;
  const defense = live?.metadata.defense ?? mockCard.defense;
  const special = live?.metadata.special ?? mockCard.special;
  const element = live?.metadata.element ?? mockCard.element;
  const price = live?.listed && live.price !== null ? formatEther(live.price) : (mockCard.price ?? '0.00');
  const owner = live?.owner ?? mockCard.owner;
  const relatedCards = mockCards.filter((item) => item.rarity === rarity && item.tokenId !== tokenNumber).slice(0, 3);

  return (
    <div className="space-y-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-amber-300 transition hover:text-amber-200">
        <ArrowLeft className="h-4 w-4" />
        Back to gallery
      </Link>

      {loadingLive ? (
        <div className="myth-frame flex h-[480px] items-center justify-center rounded-[28px]">
          <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
        </div>
      ) : isConnected && notFound ? (
        <div className="myth-frame flex flex-col items-center gap-3 rounded-[28px] px-6 py-20 text-center">
          <p className="font-display text-3xl font-black text-amber-50">This card does not exist</p>
          <p className="text-stone-300">Token #{tokenNumber} could not be found on The Relic Vault contracts.</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="myth-frame overflow-hidden rounded-[28px] p-3">
            <div className="relative">
              <img src={image} alt={name} className="h-[720px] w-full rounded-[20px] object-cover" />
              <div className={`absolute left-5 top-5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${rarityStyles(rarity)}`}>
                {rarity}
              </div>
            </div>
          </div>

          <div className="myth-frame space-y-6 rounded-[28px] p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Token #{tokenNumber}</p>
                <h1 className="font-display mt-3 text-4xl font-black text-amber-50">{name}</h1>
              </div>
              <div className="rounded-xl border border-amber-400/60 bg-amber-500/10 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.2em] text-stone-300">Price</p>
                <p className="font-mono text-2xl text-amber-200">{price} ETH</p>
              </div>
            </div>

            <p className="text-stone-300">{description}</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-stone-700 bg-stone-950/60 p-3">
                <div className="mb-2 flex items-center gap-2 text-amber-300"><Swords className="h-4 w-4" /> Attack</div>
                <div className="text-2xl font-bold text-amber-50">{attack}</div>
              </div>
              <div className="rounded-2xl border border-stone-700 bg-stone-950/60 p-3">
                <div className="mb-2 flex items-center gap-2 text-emerald-300"><Shield className="h-4 w-4" /> Defense</div>
                <div className="text-2xl font-bold text-amber-50">{defense}</div>
              </div>
              <div className="rounded-2xl border border-stone-700 bg-stone-950/60 p-3">
                <div className="mb-2 flex items-center gap-2 text-yellow-300"><Sparkles className="h-4 w-4" /> Special</div>
                <div className="text-sm font-bold text-amber-50">{special}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-4 text-sm text-stone-300">
              <div className="flex items-center justify-between py-2">
                <span>Owned by</span>
                <span className="font-mono text-amber-200">{truncateAddress(owner)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Element</span>
                <span className="text-amber-50">{element}</span>
              </div>
              {live?.listed && live.seller && (
                <div className="flex items-center justify-between py-2">
                  <span>Seller</span>
                  <span className="font-mono text-amber-200">{truncateAddress(live.seller)}</span>
                </div>
              )}
            </div>

            {!isConnected ? (
              <button
                type="button"
                onClick={connectWallet}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-500 bg-amber-500/15 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-amber-100 shadow-ember transition hover:bg-amber-500/25"
              >
                <Wallet className="h-4 w-4" /> Connect wallet to buy
              </button>
            ) : isWrongNetwork ? (
              <p className="rounded-full border border-yellow-600/40 bg-yellow-600/10 px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.2em] text-yellow-200">
                Switch to Sepolia to buy
              </p>
            ) : live?.listed ? (
              <button
                type="button"
                onClick={() => void handleBuy()}
                disabled={buying || live.seller?.toLowerCase() === account?.toLowerCase()}
                className="w-full rounded-full border border-amber-500 bg-amber-500/15 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-amber-100 shadow-ember transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {buying ? (
                  <span className="inline-flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Purchasing...</span>
                ) : live.seller?.toLowerCase() === account?.toLowerCase() ? (
                  'You listed this card'
                ) : (
                  'Buy card'
                )}
              </button>
            ) : (
              <p className="rounded-full border border-stone-600 px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.2em] text-stone-300">
                Not currently listed
              </p>
            )}
          </div>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-black text-amber-50">Related {rarity} cards</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {relatedCards.map((item) => (
            <Link key={item.id} to={`/card/${item.tokenId}`} className="myth-frame rounded-2xl p-3 transition hover:border-amber-500/60">
              <img src={item.image} alt={item.name} className="h-48 w-full rounded-xl object-cover" />
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-amber-50">{item.name}</h3>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{item.rarity}</p>
                </div>
                <span className="font-mono text-amber-200">{item.price ?? '0.00'} ETH</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}