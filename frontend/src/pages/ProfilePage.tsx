import { useEffect, useState } from 'react';
import { formatEther } from 'ethers';
import { Activity, Loader2, Wallet } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { truncateAddress } from '../lib/utils';

export function ProfilePage() {
  const { account, chainId, isWrongNetwork, provider } = useWeb3();
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

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
        <h2 className="font-display text-2xl font-black text-amber-50">Recent activity</h2>
        <div className="mt-6 space-y-3">
          {[
            { label: 'Minted Ember Drake', status: 'Confirmed' },
            { label: 'Purchased Shadowblade Rogue', status: 'Pending' },
            { label: 'Listed Runestone Shield', status: 'Confirmed' },
          ].map((entry) => (
            <div key={entry.label} className="flex items-center justify-between rounded-2xl border border-stone-700 bg-stone-950/60 px-4 py-3 text-sm">
              <span className="text-stone-200">{entry.label}</span>
              <span className={entry.status === 'Pending' ? 'text-yellow-200' : 'text-emerald-200'}>{entry.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}