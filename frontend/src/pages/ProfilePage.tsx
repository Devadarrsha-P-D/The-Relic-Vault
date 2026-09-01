import { Activity, Wallet } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { truncateAddress } from '../lib/utils';

export function ProfilePage() {
  const { account, chainId, isWrongNetwork } = useWeb3();

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Profile</p>
        <h1 className="mt-3 text-4xl font-black text-white">Operator signature</h1>

        <div className="mt-6 space-y-4 rounded-2xl border border-cyan-500/30 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-cyan-300" /> Wallet</span>
            <span className="font-mono text-cyan-200">{account ? truncateAddress(account) : 'Not connected'}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-300" /> Network</span>
            <span className="text-white">{isWrongNetwork ? 'Wrong network' : chainId ? `Sepolia (${chainId})` : 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>ETH balance</span>
            <span className="font-mono text-white">0.00 ETH</span>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-6">
        <h2 className="text-2xl font-black text-white">Recent activity</h2>
        <div className="mt-6 space-y-3">
          {[
            { label: 'Minted Volt Wisp', status: 'Confirmed' },
            { label: 'Purchased Glass Marauder', status: 'Pending' },
            { label: 'Listed Solar Reaver', status: 'Confirmed' },
          ].map((entry) => (
            <div key={entry.label} className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm">
              <span className="text-slate-200">{entry.label}</span>
              <span className={entry.status === 'Pending' ? 'text-yellow-200' : 'text-emerald-200'}>{entry.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
