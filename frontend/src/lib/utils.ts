export function truncateAddress(address?: string) {
  if (!address) return 'Unknown';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEtherValue(value: string | number) {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) return '0 ETH';
  return `${numeric.toFixed(3)} ETH`;
}

export function rarityStyles(rarity: string) {
  const map: Record<string, string> = {
    Common: 'border-slate-400 text-slate-100 bg-slate-500/20',
    Rare: 'border-cyan-400 text-cyan-200 bg-cyan-500/20',
    Epic: 'border-fuchsia-400 text-fuchsia-200 bg-fuchsia-500/20',
    Legendary: 'border-yellow-400 text-yellow-200 bg-yellow-500/20',
  };

  return map[rarity] ?? 'border-slate-400 text-slate-100 bg-slate-500/20';
}
