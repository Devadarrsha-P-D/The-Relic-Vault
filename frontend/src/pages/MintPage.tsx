import { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ImagePlus, Loader2, UploadCloud, Wand2 } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import {
  buildCardMetadata,
  buildPlaceholderSvg,
  svgToBlob,
  uploadFileToIpfs,
  uploadJsonToIpfs,
} from '../lib/pinata';
import { getExplorerTxUrl, getTxErrorMessage, ipfsToHttp, rarityStyles } from '../lib/utils';
import { CardRevealOverlay, type RevealCard } from '../components/CardRevealOverlay';

const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

const rarityWeights: Record<string, number> = {
  Common: 0.35,
  Uncommon: 0.25,
  Rare: 0.18,
  Epic: 0.12,
  Legendary: 0.07,
  Mythic: 0.03,
};

const FANTASY_NAMES = [
  'Ember Drake',
  'Shadowblade Rogue',
  'Ironbark Sentinel',
  'Elixir of the Ancients',
  'Runestone Shield',
  'Aethon the Undying',
  'Grave Warden',
  'Starlight Oracle',
  'Wyrm of the Deep',
  'Grim Sigil',
];

const FANTASY_SPECIALS = [
  'Breath of Cinders',
  'Phantom Strike',
  'Living Fortress',
  'Timeless Restoration',
  'Aegis of Ages',
  'Eternal Resurrection',
  'Storm Sigil',
  "Warden's Oath",
];

const ELEMENTS = ['Fire', 'Shadow', 'Nature', 'Arcane', 'Earth', 'Divine'];

function rollRarity(): string {
  const roll = Math.random();
  let cumulative = 0;
  for (const rarity of RARITY_ORDER) {
    cumulative += rarityWeights[rarity];
    if (roll <= cumulative) return rarity;
  }
  return 'Common';
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

type FormState = {
  name: string;
  description: string;
  rarity: string;
  attack: number;
  defense: number;
  special: string;
  element: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  rarity: 'Common',
  attack: 30,
  defense: 25,
  special: '',
  element: 'Fire',
};

export function MintPage() {
  const { account, isConnected, isWrongNetwork, connectWallet, switchToSepolia, cardContract } = useWeb3();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'minting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mintedCard, setMintedCard] = useState<RevealCard | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageChange = (file: File | undefined) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const rollCard = () => {
    setForm({
      name: pick(FANTASY_NAMES),
      description: `A ${form.rarity.toLowerCase()} card forged in The Relic Vault, channeling the power of ${form.element}.`,
      rarity: rollRarity(),
      attack: 22 + Math.floor(Math.random() * 70),
      defense: 18 + Math.floor(Math.random() * 60),
      special: pick(FANTASY_SPECIALS),
      element: pick(ELEMENTS),
    });
    setError(null);
  };

  const handleMint = async () => {
    setError(null);
    if (!isConnected || !account || !cardContract) {
      toast.error('Connect your wallet to mint.');
      return;
    }
    if (isWrongNetwork) {
      toast.error('Switch to the Sepolia network before minting.');
      return;
    }
    if (!form.name.trim()) {
      setError('Give your card a name before minting.');
      return;
    }

    const slug = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'relic-vault-card';
    setStage('uploading');
    const toastId = 'mint-progress';
    try {
      toast.loading('Uploading card art to IPFS...', { id: toastId });

      let imageUri: string;
      if (imageFile) {
        imageUri = await uploadFileToIpfs(imageFile, `${slug}.${imageFile.name.split('.').pop() ?? 'png'}`);
      } else {
        const svg = buildPlaceholderSvg({ name: form.name.trim(), rarity: form.rarity, element: form.element });
        imageUri = await uploadFileToIpfs(svgToBlob(svg), `${slug}.svg`);
      }

      toast.loading('Uploading metadata to IPFS...', { id: toastId });
      const metadata = buildCardMetadata({
        name: form.name.trim(),
        description: form.description.trim() || `A ${form.rarity.toLowerCase()} card forged in The Relic Vault.`,
        image: imageUri,
        rarity: form.rarity,
        attack: form.attack,
        defense: form.defense,
        special: form.special.trim() || 'No special ability',
        element: form.element,
      });
      const metadataUri = await uploadJsonToIpfs(metadata);

      setStage('minting');
      toast.loading('Casting the minting incantation...', { id: toastId });
      const tx = await cardContract.mintCard(account, metadataUri);
      await tx.wait();

      toast.success(`${form.name.trim()} minted! View on Etherscan: ${getExplorerTxUrl(tx.hash)}`, { id: toastId, duration: 10000 });
      setMintedCard({
        name: form.name.trim(),
        rarity: form.rarity,
        image: ipfsToHttp(imageUri),
        element: form.element,
        attack: form.attack,
        defense: form.defense,
        special: form.special.trim() || 'No special ability',
      });
      setForm(EMPTY_FORM);
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error('Mint failed:', err);
      const message = getTxErrorMessage(err, 'Mint failed');
      setError(message);
      toast.error(`Mint failed: ${message}`, { id: toastId });
    } finally {
      setStage('idle');
    }
  };

  const busy = stage !== 'idle';

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="myth-frame rounded-[30px] p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Mint a card</p>
        <h1 className="font-display mt-3 text-4xl font-black text-amber-50">Forge a new legend</h1>

        {!isConnected ? (
          <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-amber-700/30 bg-stone-950/60 p-5">
            <p className="text-sm text-stone-300">Connect your wallet to begin minting.</p>
            <button
              type="button"
              onClick={connectWallet}
              className="rounded-full border border-amber-400 bg-amber-500/15 px-5 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-100"
            >
              Connect Wallet
            </button>
          </div>
        ) : isWrongNetwork ? (
          <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-yellow-600/40 bg-yellow-600/10 p-5">
            <p className="text-sm text-yellow-100">The Relic Vault mints on Sepolia — switch networks to continue.</p>
            <button
              type="button"
              onClick={switchToSepolia}
              className="rounded-full border border-yellow-400/70 bg-yellow-500/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.15em] text-yellow-200"
            >
              Switch to Sepolia
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {error && (
              <div className="rounded-2xl border border-red-700/40 bg-red-700/10 px-4 py-3 text-sm text-red-200">{error}</div>
            )}

            <div>
              <label htmlFor="card-name" className="mb-1 block text-xs uppercase tracking-[0.2em] text-stone-400">Name *</label>
              <input
                id="card-name"
                type="text"
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                placeholder="e.g. Ember Drake"
                className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="card-description" className="mb-1 block text-xs uppercase tracking-[0.2em] text-stone-400">Description</label>
              <textarea
                id="card-description"
                value={form.description}
                onChange={(event) => setField('description', event.target.value)}
                rows={3}
                placeholder="The tale your card tells..."
                className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-stone-400">Card art</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-600 bg-stone-950/60 px-4 py-6 text-stone-400 transition hover:border-amber-500/60 hover:text-amber-200"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-sm">{imageFile ? imageFile.name : 'Upload an image (optional — a runic placeholder is generated otherwise)'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleImageChange(event.target.files?.[0])}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="card-rarity" className="mb-1 block text-xs uppercase tracking-[0.2em] text-stone-400">Rarity</label>
                <select
                  id="card-rarity"
                  value={form.rarity}
                  onChange={(event) => setField('rarity', event.target.value)}
                  className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 focus:border-amber-500 focus:outline-none"
                >
                  {RARITY_ORDER.map((rarity) => (
                    <option key={rarity} value={rarity}>{rarity}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="card-element" className="mb-1 block text-xs uppercase tracking-[0.2em] text-stone-400">Element</label>
                <select
                  id="card-element"
                  value={form.element}
                  onChange={(event) => setField('element', event.target.value)}
                  className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 focus:border-amber-500 focus:outline-none"
                >
                  {ELEMENTS.map((element) => (
                    <option key={element} value={element}>{element}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="card-attack" className="mb-1 block text-xs uppercase tracking-[0.2em] text-stone-400">Attack</label>
                <input
                  id="card-attack"
                  type="number"
                  min={0}
                  max={999}
                  value={form.attack}
                  onChange={(event) => setField('attack', Number(event.target.value))}
                  className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="card-defense" className="mb-1 block text-xs uppercase tracking-[0.2em] text-stone-400">Defense</label>
                <input
                  id="card-defense"
                  type="number"
                  min={0}
                  max={999}
                  value={form.defense}
                  onChange={(event) => setField('defense', Number(event.target.value))}
                  className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="card-special" className="mb-1 block text-xs uppercase tracking-[0.2em] text-stone-400">Special</label>
                <input
                  id="card-special"
                  type="text"
                  value={form.special}
                  onChange={(event) => setField('special', event.target.value)}
                  placeholder="Ability name"
                  className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={rollCard}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-stone-600 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-stone-100 transition hover:border-amber-500/50 disabled:opacity-50"
              >
                <Wand2 className="h-4 w-4" /> Roll card
              </button>
              <button
                type="button"
                onClick={() => void handleMint()}
                disabled={busy || !form.name.trim()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-amber-500 bg-amber-500/15 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-amber-100 shadow-ember transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {stage === 'uploading' ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                ) : stage === 'minting' ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Minting...</>
                ) : (
                  <><UploadCloud className="h-4 w-4" /> Mint card</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="myth-frame rounded-[30px] p-4">
        <div className="relative overflow-hidden rounded-[24px] border border-amber-900/50 bg-stone-950/80 p-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(212,160,23,0.18),_transparent_45%)]" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.28em] text-amber-300">Preview</span>
              <span className={`rounded-full border px-2 py-1 text-xs uppercase tracking-[0.2em] ${rarityStyles(form.rarity)}`}>{form.rarity}</span>
            </div>
            <div className="relative h-72 overflow-hidden rounded-2xl border border-amber-700/40 bg-gradient-to-br from-stone-900 via-stone-950 to-amber-950/40">
              {imagePreview ? (
                <img src={imagePreview} alt="Card art preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-stone-500">
                  <UploadCloud className="h-10 w-10" />
                  <span className="text-xs uppercase tracking-[0.2em]">Art preview</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-amber-50">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Name</p>
                <h2 className="font-display mt-2 text-3xl font-black">{form.name || 'Unnamed Card'}</h2>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Element</p>
                <p className="mt-2 text-xl font-bold text-amber-200">{form.element}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-stone-700 bg-stone-950/60 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Attack</p>
                <p className="font-mono text-lg text-amber-100">{form.attack}</p>
              </div>
              <div className="rounded-xl border border-stone-700 bg-stone-950/60 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Defense</p>
                <p className="font-mono text-lg text-amber-100">{form.defense}</p>
              </div>
            </div>
            <p className="text-sm text-stone-300"><span className="text-stone-500">Special:</span> {form.special || '—'}</p>
          </div>
        </div>
      </div>

      {mintedCard && <CardRevealOverlay card={mintedCard} onClose={() => setMintedCard(null)} />}
    </div>
  );
}