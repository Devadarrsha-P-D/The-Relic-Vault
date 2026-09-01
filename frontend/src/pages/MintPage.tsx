import { useState } from 'react';
import { toast } from 'react-hot-toast';

const rarityWeights = {
  Common: 0.5,
  Rare: 0.27,
  Epic: 0.18,
  Legendary: 0.05,
};

function getRandomCardSeed() {
  const roll = Math.random();
  let cumulative = 0;

  for (const [rarity, weight] of Object.entries(rarityWeights)) {
    cumulative += weight;
    if (roll <= cumulative) return rarity;
  }

  return 'Common';
}

export function MintPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [preview, setPreview] = useState({
    name: 'Ion Veil',
    rarity: 'Rare',
    attack: 58,
    defense: 39,
    special: 'Phase Echo',
    element: 'Quantum',
  });

  const generateRandomCard = () => {
    const rarity = getRandomCardSeed();
    setPreview({
      name: `${rarity} Drift-${Math.floor(Math.random() * 900 + 100)}`,
      rarity,
      attack: 22 + Math.floor(Math.random() * 70),
      defense: 18 + Math.floor(Math.random() * 60),
      special: ['Nova Bloom', 'Veil Thread', 'Vector Drift', 'Abyss Gate'][Math.floor(Math.random() * 4)],
      element: ['Quantum', 'Storm', 'Void', 'Solar'][Math.floor(Math.random() * 4)],
    });
  };

  const handleMint = async () => {
    setIsUploading(true);
    toast.loading('Uploading metadata to IPFS...', { id: 'mint-upload' });

    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsUploading(false);

    setIsMinting(true);
    toast.loading('Broadcasting mint transaction...', { id: 'mint-tx' });

    await new Promise((resolve) => setTimeout(resolve, 1400));
    setIsMinting(false);

    toast.success(`Minted ${preview.name} successfully.`);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[30px] border border-slate-800 bg-slate-900/80 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Mint a card</p>
        <h1 className="mt-3 text-4xl font-black text-white">Forge new data-spirits</h1>

        <div className="mt-6 space-y-4 rounded-2xl border border-cyan-500/30 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Rarity</span>
            <span className="rounded-full border border-cyan-400/50 bg-cyan-500/10 px-2 py-1 text-cyan-200">{preview.rarity}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Attack</span>
            <span className="font-mono text-white">{preview.attack}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Defense</span>
            <span className="font-mono text-white">{preview.defense}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Element</span>
            <span className="text-white">{preview.element}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Special</span>
            <span className="text-white">{preview.special}</span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={generateRandomCard} className="flex-1 rounded-full border border-slate-600 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-100">
            Roll card
          </button>
          <button type="button" onClick={handleMint} disabled={isUploading || isMinting} className="flex-1 rounded-full border border-cyan-500 bg-cyan-500/15 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-cyan-100 shadow-neon disabled:cursor-not-allowed disabled:opacity-60">
            {isUploading ? 'Uploading...' : isMinting ? 'Minting...' : 'Mint card'}
          </button>
        </div>
      </div>

      <div className="rounded-[30px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4">
        <div className="relative overflow-hidden rounded-[24px] border border-slate-700 bg-slate-950/80 p-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(40,247,255,0.2),_transparent_45%)]" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.28em] text-cyan-300">Genesis</span>
              <span className="rounded-full border border-cyan-400/60 bg-cyan-500/10 px-2 py-1 text-xs uppercase tracking-[0.2em] text-cyan-100">{preview.rarity}</span>
            </div>
            <div className="h-72 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/60" />
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Name</p>
                <h2 className="mt-2 text-3xl font-black">{preview.name}</h2>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Element</p>
                <p className="mt-2 text-xl font-bold text-cyan-200">{preview.element}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
