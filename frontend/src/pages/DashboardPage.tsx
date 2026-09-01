import { useState } from 'react';
import { CheckCircle2, PencilLine, Trash2 } from 'lucide-react';
import { mockCards } from '../lib/mockData';
import { rarityStyles, truncateAddress } from '../lib/utils';

export function DashboardPage() {
  const [listed, setListed] = useState<Record<number, boolean>>({ 1: true, 2: false });

  const collectionValue = mockCards.reduce((total, card) => total + Number(card.price ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-slate-900 to-purple-500/10 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Collection overview</p>
        <div className="mt-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-black text-white">My Collection</h1>
          </div>
          <div className="rounded-2xl border border-cyan-400/50 bg-slate-950/70 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Estimated value</p>
            <p className="mt-2 font-mono text-2xl text-cyan-200">{collectionValue.toFixed(2)} ETH</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {mockCards.map((card) => (
          <div key={card.id} className="flex flex-col gap-4 rounded-[24px] border border-slate-800 bg-slate-900/80 p-4 md:flex-row md:items-center">
            <img src={card.image} alt={card.name} className="h-32 w-32 rounded-2xl object-cover" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{card.name}</h2>
                <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${rarityStyles(card.rarity)}`}>{card.rarity}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                <span>Owner: {truncateAddress(card.owner)}</span>
                <span>Price: {card.price} ETH</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {listed[card.id] ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" /> Listed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-700/40 px-2 py-1 text-slate-200">
                    Hidden
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-cyan-100">
                <PencilLine className="h-4 w-4" /> Update price
              </button>
              <button type="button" onClick={() => setListed((value) => ({ ...value, [card.id]: !value[card.id] }))} className="inline-flex items-center gap-2 rounded-full border border-slate-600 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-100">
                <Trash2 className="h-4 w-4" /> {listed[card.id] ? 'Delist' : 'List'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
