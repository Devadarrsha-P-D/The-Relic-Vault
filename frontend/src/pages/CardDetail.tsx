import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Shield, Sparkles, Swords } from 'lucide-react';
import { mockCards } from '../lib/mockData';
import { rarityStyles, truncateAddress } from '../lib/utils';

export function CardDetail() {
  const { tokenId } = useParams();
  const card = useMemo(() => mockCards.find((item) => item.tokenId === Number(tokenId)) ?? mockCards[0], [tokenId]);
  const relatedCards = mockCards.filter((item) => item.rarity === card.rarity && item.tokenId !== card.tokenId).slice(0, 3);

  return (
    <div className="space-y-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-cyan-300">
        <ArrowLeft className="h-4 w-4" />
        Back to gallery
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900/80 p-3 shadow-glow">
          <div className="relative">
            <img src={card.image} alt={card.name} className="h-[720px] w-full rounded-[20px] object-cover" />
            <div className={`absolute left-5 top-5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${rarityStyles(card.rarity)}`}>
              {card.rarity}
            </div>
          </div>
        </div>

        <div className="space-y-6 rounded-[28px] border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Token #{card.tokenId}</p>
              <h1 className="mt-3 text-4xl font-black text-white">{card.name}</h1>
            </div>
            <div className="rounded-xl border border-cyan-400/60 bg-cyan-500/10 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300">Price</p>
              <p className="font-mono text-2xl text-cyan-200">{card.price ?? '0.00'} ETH</p>
            </div>
          </div>

          <p className="text-slate-300">{card.description}</p>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-cyan-300"><Swords className="h-4 w-4" /> Attack</div>
              <div className="text-2xl font-bold text-white">{card.attack}</div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-violet-300"><Shield className="h-4 w-4" /> Defense</div>
              <div className="text-2xl font-bold text-white">{card.defense}</div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-yellow-300"><Sparkles className="h-4 w-4" /> Special</div>
              <div className="text-sm font-bold text-white">{card.special}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-300">
            <div className="flex items-center justify-between py-2">
              <span>Owned by</span>
              <span className="font-mono text-cyan-200">{truncateAddress(card.owner)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span>Element</span>
              <span className="text-white">{card.element}</span>
            </div>
          </div>

          <button type="button" className="w-full rounded-full border border-cyan-500 bg-cyan-500/15 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-cyan-100 shadow-neon">
            Buy card
          </button>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-black text-white">Related {card.rarity} cards</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {relatedCards.map((item) => (
            <Link key={item.id} to={`/card/${item.tokenId}`} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 transition hover:border-cyan-400/50">
              <img src={item.image} alt={item.name} className="h-48 w-full rounded-xl object-cover" />
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">{item.name}</h3>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.rarity}</p>
                </div>
                <span className="font-mono text-cyan-200">{item.price ?? '0.00'} ETH</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
