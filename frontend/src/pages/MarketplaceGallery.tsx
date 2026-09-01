import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, Filter, Sparkles } from 'lucide-react';
import { mockCards } from '../lib/mockData';
import { rarityStyles, truncateAddress } from '../lib/utils';

export function MarketplaceGallery() {
  const [rarityFilter, setRarityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [maxPrice, setMaxPrice] = useState(5);

  const cards = useMemo(() => {
    const filtered = mockCards.filter((card) => {
      const rarityMatch = rarityFilter === 'All' || card.rarity === rarityFilter;
      const priceMatch = Number(card.price ?? 0) <= maxPrice;
      return rarityMatch && priceMatch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'price-asc') return Number(a.price ?? 0) - Number(b.price ?? 0);
      if (sortBy === 'price-desc') return Number(b.price ?? 0) - Number(a.price ?? 0);
      if (sortBy === 'rarity') return ['Common', 'Rare', 'Epic', 'Legendary'].indexOf(b.rarity) - ['Common', 'Rare', 'Epic', 'Legendary'].indexOf(a.rarity);
      return b.tokenId - a.tokenId;
    });
  }, [maxPrice, rarityFilter, sortBy]);

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-glow">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">NeonForge Market</p>
            <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">Data-spirits for the next era.</h1>
          </div>

          <div className="rounded-xl border border-cyan-400/40 bg-slate-900/60 px-4 py-3 text-right text-cyan-100">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Live Sepolia</p>
            <p className="mt-2 text-2xl font-bold">{cards.length} cards</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-slate-200">
            <Filter className="h-4 w-4 text-cyan-300" />
            <span className="text-sm uppercase tracking-[0.2em]">Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={rarityFilter}
              onChange={(event) => setRarityFilter(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="All">All rarities</option>
              <option value="Common">Common</option>
              <option value="Rare">Rare</option>
              <option value="Epic">Epic</option>
              <option value="Legendary">Legendary</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-slate-200">
              <span>Max ETH</span>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={maxPrice}
                onChange={(event) => setMaxPrice(Number(event.target.value))}
              />
              <span className="font-mono text-cyan-300">{maxPrice.toFixed(1)}</span>
            </label>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-cyan-300" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
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

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.id} to={`/card/${card.tokenId}`} className="group block overflow-hidden rounded-[24px] border border-slate-800 bg-slate-900/80 transition hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-neon">
            <div className="relative overflow-hidden">
              <img src={card.image} alt={card.name} className="h-64 w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className={`absolute left-3 top-3 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${rarityStyles(card.rarity)}`}>
                {card.rarity}
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-white">{card.name}</h2>
                <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 font-mono text-xs text-cyan-200">
                  {card.price ?? '0.00'} ETH
                </span>
              </div>

              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center justify-between"><span>Seller</span><span>{truncateAddress(card.seller)}</span></div>
                <div className="flex items-center justify-between"><span>Attack</span><span>{card.attack}</span></div>
                <div className="flex items-center justify-between"><span>Defense</span><span>{card.defense}</span></div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                <span>{card.element}</span>
                <span className="inline-flex items-center gap-1 text-cyan-300">
                  <Sparkles className="h-3 w-3" />
                  {card.special}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
