import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Contract,
  JsonRpcProvider,
  formatEther,
  type AbstractProvider,
  type ContractEventName,
  type ContractEventPayload,
  type EventLog,
} from 'ethers';
import { Activity, Loader2, RefreshCw, Wallet } from 'lucide-react';
import { CARD_ABI, MARKETPLACE_ABI, useWeb3 } from '../contexts/Web3Context';
import { RELIC_VAULT_CARD_ADDRESS, RELIC_VAULT_MARKETPLACE_ADDRESS } from '../contracts/addresses';
import { fetchCardMetadata } from '../lib/pinata';
import { truncateAddress } from '../lib/utils';

type ActivityType = 'minted' | 'listed' | 'purchased';

type ActivityEntry = {
  id: string;
  type: ActivityType;
  tokenId: number;
  blockNumber: number;
  logIndex: number;
  price: bigint | null;
  buyer: string | null;
};

const MAX_ACTIVITY_ITEMS = 10;
const RECENT_BLOCKS = 10_000;
// Some wallet-backed RPCs (e.g. MetaMask/Infura) cap eth_getLogs block ranges,
// so queries are sliced into chunks that stay safely under the limit.
const CHUNK_BLOCKS = 5_000;

// Read-only fallback for event queries when the wallet provider's RPC fails
// or rejects the eth_getLogs calls.
const FALLBACK_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const FALLBACK_PROVIDER = new JsonRpcProvider(FALLBACK_RPC);

function mintToEntry(log: EventLog): ActivityEntry {
  const args = log.args as unknown as { tokenId: bigint };
  return {
    id: `${log.blockNumber}-${log.index}`,
    type: 'minted',
    tokenId: Number(args.tokenId),
    blockNumber: log.blockNumber,
    logIndex: log.index,
    price: null,
    buyer: null,
  };
}

function listToEntry(log: EventLog): ActivityEntry {
  const args = log.args as unknown as { tokenId: bigint; price: bigint };
  return {
    id: `${log.blockNumber}-${log.index}`,
    type: 'listed',
    tokenId: Number(args.tokenId),
    blockNumber: log.blockNumber,
    logIndex: log.index,
    price: args.price,
    buyer: null,
  };
}

function purchaseToEntry(log: EventLog): ActivityEntry {
  const args = log.args as unknown as { tokenId: bigint; price: bigint; buyer: string };
  return {
    id: `${log.blockNumber}-${log.index}`,
    type: 'purchased',
    tokenId: Number(args.tokenId),
    blockNumber: log.blockNumber,
    logIndex: log.index,
    price: args.price,
    buyer: args.buyer,
  };
}

async function queryInChunks(
  contract: Contract,
  filter: ContractEventName,
  fromBlock: number,
  toBlock: number,
): Promise<EventLog[]> {
  const logs: EventLog[] = [];
  for (let start = fromBlock; start <= toBlock; start += CHUNK_BLOCKS) {
    const end = Math.min(start + CHUNK_BLOCKS - 1, toBlock);
    const chunk = (await contract.queryFilter(filter, start, end)) as EventLog[];
    logs.push(...chunk);
  }
  return logs;
}

async function fetchActivityEntries(provider: AbstractProvider, account: string): Promise<ActivityEntry[]> {
  const card = new Contract(RELIC_VAULT_CARD_ADDRESS, CARD_ABI, provider);
  const market = new Contract(RELIC_VAULT_MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

  const latestBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, latestBlock - RECENT_BLOCKS);

  const results = await Promise.allSettled([
    queryInChunks(card, card.filters.CardMinted(account, null), fromBlock, latestBlock),
    queryInChunks(market, market.filters.CardListed(account, null), fromBlock, latestBlock),
    queryInChunks(market, market.filters.CardPurchased(account, null, null), fromBlock, latestBlock),
    queryInChunks(market, market.filters.CardPurchased(null, account, null), fromBlock, latestBlock),
  ]);

  const entries: ActivityEntry[] = [];
  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    const mapper = index === 0 ? mintToEntry : index === 1 ? listToEntry : purchaseToEntry;
    entries.push(...result.value.map(mapper));
  });

  // Only treat it as a failure if every query failed — otherwise keep partial data.
  if (results.every((result) => result.status === 'rejected')) {
    throw new Error('All activity log queries failed.');
  }

  return entries.sort((a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex);
}

export function ProfilePage() {
  const { account, chainId, isConnected, isWrongNetwork, provider, cardContract, marketplaceContract } = useWeb3();

  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [cardNames, setCardNames] = useState<Record<number, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const accountRef = useRef(account);

  useEffect(() => {
    accountRef.current = account;
  }, [account]);

  useEffect(() => {
    let cancelled = false;
    if (!account || !provider) {
      setBalance(null);
      return;
    }
    setBalanceLoading(true);
    provider
      .getBalance(account)
      .then((value) => {
        if (!cancelled) setBalance(formatEther(value));
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      })
      .finally(() => {
        if (!cancelled) setBalanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [account, provider]);

  const prependActivity = useCallback((entry: ActivityEntry) => {
    setActivity((prev) => {
      if (prev.some((existing) => existing.id === entry.id)) return prev;
      return [entry, ...prev].slice(0, MAX_ACTIVITY_ITEMS);
    });
  }, []);

  const loadActivity = useCallback(async () => {
    if (!isConnected || !provider || !account) {
      setActivity([]);
      setActivityError(null);
      setActivityLoading(false);
      return;
    }
    setActivityLoading(true);
    try {
      let entries: ActivityEntry[];
      try {
        // Prefer the wallet provider; BrowserProvider extends JsonRpcProvider.
        entries = await fetchActivityEntries(provider, account);
      } catch (walletErr) {
        console.error('Wallet provider activity query failed, retrying via public RPC:', walletErr);
        entries = await fetchActivityEntries(FALLBACK_PROVIDER, account);
      }
      setActivity(entries.slice(0, MAX_ACTIVITY_ITEMS));
      setActivityError(null);
    } catch (err) {
      console.error('Failed to load activity:', err);
      setActivityError('Could not load recent activity. Check your connection and try again.');
    } finally {
      setActivityLoading(false);
    }
  }, [isConnected, provider, account]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity, refreshKey]);

  // Live updates: prepend events as they are confirmed on-chain.
  useEffect(() => {
    if (!cardContract || !marketplaceContract) return;

    const handleMint = (to: string, tokenId: bigint, _tokenURI: string, event: ContractEventPayload) => {
      if (to.toLowerCase() !== accountRef.current?.toLowerCase()) return;
      prependActivity({
        id: `${event.log.blockNumber}-${event.log.index}`,
        type: 'minted',
        tokenId: Number(tokenId),
        blockNumber: event.log.blockNumber,
        logIndex: event.log.index,
        price: null,
        buyer: null,
      });
    };

    const handleList = (seller: string, tokenId: bigint, price: bigint, event: ContractEventPayload) => {
      if (seller.toLowerCase() !== accountRef.current?.toLowerCase()) return;
      prependActivity({
        id: `${event.log.blockNumber}-${event.log.index}`,
        type: 'listed',
        tokenId: Number(tokenId),
        blockNumber: event.log.blockNumber,
        logIndex: event.log.index,
        price,
        buyer: null,
      });
    };

    const handlePurchase = (buyer: string, seller: string, tokenId: bigint, price: bigint, _fee: bigint, event: ContractEventPayload) => {
      const current = accountRef.current;
      if (!current) return;
      if (buyer.toLowerCase() !== current.toLowerCase() && seller.toLowerCase() !== current.toLowerCase()) return;
      prependActivity({
        id: `${event.log.blockNumber}-${event.log.index}`,
        type: 'purchased',
        tokenId: Number(tokenId),
        blockNumber: event.log.blockNumber,
        logIndex: event.log.index,
        price,
        buyer,
      });
    };

    cardContract.on('CardMinted', handleMint);
    marketplaceContract.on('CardListed', handleList);
    marketplaceContract.on('CardPurchased', handlePurchase);
    return () => {
      cardContract.off('CardMinted', handleMint);
      marketplaceContract.off('CardListed', handleList);
      marketplaceContract.off('CardPurchased', handlePurchase);
    };
  }, [cardContract, marketplaceContract, prependActivity]);

  // Resolve card names from IPFS metadata, falling back to the token id.
  const requestedNames = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!cardContract) return;
    for (const entry of activity) {
      if (cardNames[entry.tokenId] !== undefined || requestedNames.current.has(entry.tokenId)) continue;
      requestedNames.current.add(entry.tokenId);
      void cardContract
        .tokenURI(entry.tokenId)
        .catch(() => '')
        .then((uri: string) => {
          if (!uri) return;
          return fetchCardMetadata(uri)
            .then((metadata) => {
              setCardNames((prev) => (prev[entry.tokenId] === metadata.name ? prev : { ...prev, [entry.tokenId]: metadata.name }));
            })
            .catch(() => undefined);
        });
    }
  }, [activity, cardNames, cardContract]);

  const activityLabel = (entry: ActivityEntry) => {
    const name = cardNames[entry.tokenId] ?? `Card #${entry.tokenId}`;
    if (entry.type === 'minted') return `Minted ${name}`;
    if (entry.type === 'listed') return `Listed ${name}`;
    const bought = entry.buyer?.toLowerCase() === account?.toLowerCase();
    return `${bought ? 'Purchased' : 'Sold'} ${name}`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="myth-frame rounded-[28px] p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Profile</p>
        <h1 className="font-display mt-3 text-4xl font-black text-amber-50">Adventurer's sigil</h1>

        <div className="mt-6 space-y-4 rounded-2xl border border-amber-700/30 bg-stone-950/60 p-4">
          <div className="flex items-center justify-between text-sm text-stone-300">
            <span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-amber-300" /> Wallet</span>
            <span className="font-mono text-amber-200">{account ? truncateAddress(account) : 'Not connected'}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-stone-300">
            <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4 text-amber-300" /> Network</span>
            <span className="text-amber-50">{isWrongNetwork ? 'Wrong network' : chainId ? `Sepolia (${chainId})` : 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-stone-300">
            <span>ETH balance</span>
            {balanceLoading ? (
              <span className="inline-flex items-center gap-1 text-stone-400"><Loader2 className="h-3 w-3 animate-spin" /> Loading...</span>
            ) : (
              <span className="font-mono text-amber-50">{balance !== null ? `${Number(balance).toFixed(4)} ETH` : 'Unavailable'}</span>
            )}
          </div>
        </div>
      </div>

      <div className="myth-frame rounded-[28px] p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-black text-amber-50">Recent activity</h2>
          {isConnected && (
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={activityLoading}
              className="inline-flex items-center gap-2 rounded-full border border-stone-600 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-stone-200 transition hover:border-amber-500/50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${activityLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {!isConnected ? (
            <p className="rounded-2xl border border-stone-700 bg-stone-950/60 px-4 py-6 text-center text-sm text-stone-400">
              Connect your wallet to see recent activity.
            </p>
          ) : activityLoading && activity.length === 0 ? (
            <>
              {[0, 1, 2].map((index) => (
                <div key={index} className="myth-frame h-12 animate-pulse rounded-2xl" />
              ))}
            </>
          ) : activityError ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-700/40 bg-red-700/10 px-4 py-3 text-sm text-red-200">
              <p>{activityError}</p>
              <button
                type="button"
                onClick={() => setRefreshKey((key) => key + 1)}
                className="shrink-0 rounded-full border border-red-500/50 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em]"
              >
                Retry
              </button>
            </div>
          ) : activity.length === 0 ? (
            <p className="rounded-2xl border border-stone-700 bg-stone-950/60 px-4 py-6 text-center text-sm text-stone-400">
              No activity yet — mint, list, or purchase cards to see them here.
            </p>
          ) : (
            activity.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl border border-stone-700 bg-stone-950/60 px-4 py-3 text-sm">
                <span className="min-w-0 truncate text-stone-200">{activityLabel(entry)}</span>
                {entry.type === 'minted' ? (
                  <span className="shrink-0 font-mono text-xs text-stone-400">Block #{entry.blockNumber}</span>
                ) : entry.price !== null ? (
                  <span className="shrink-0 font-mono text-amber-200">{formatEther(entry.price)} ETH</span>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}