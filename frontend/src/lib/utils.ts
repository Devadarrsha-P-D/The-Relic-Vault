const DEFAULT_IPFS_GATEWAY = 'gateway.pinata.cloud';

export function getIpfsGateway(): string {
  return import.meta.env.VITE_PINATA_GATEWAY || DEFAULT_IPFS_GATEWAY;
}

/**
 * Convert an `ipfs://<cid>` URI into an HTTP gateway URL so it can be
 * loaded by <img> / fetch in the browser. Plain http(s) URLs pass through.
 */
export function ipfsToHttp(uri: string): string {
  if (!uri) return '';
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  if (uri.startsWith('ipfs://')) {
    return `https://${getIpfsGateway()}/ipfs/${uri.slice('ipfs://'.length)}`;
  }
  return uri;
}

export function getExplorerTxUrl(hash: string): string {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `https://sepolia.etherscan.io/address/${address}`;
}

/**
 * Best-effort extraction of a human-readable revert reason from ethers v6
 * errors. Falls back to a generic message.
 */
export function getTxErrorMessage(error: unknown, fallback = 'Transaction failed'): string {
  if (!error) return fallback;
  const err = error as {
    reason?: string;
    shortMessage?: string;
    message?: string;
    info?: { error?: { message?: string } };
  };
  const reason = err.reason ?? err.shortMessage ?? err.info?.error?.message ?? err.message;
  if (reason && reason !== 'Transaction failed' && !reason.includes('execution reverted: unknown custom error')) {
    // ethers wraps revert strings as "execution reverted: <reason>"
    const match = /execution reverted: (.*)/.exec(reason);
    return match?.[1] ?? reason;
  }
  return fallback;
}

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
    Common: 'border-stone-400 text-stone-100 bg-stone-500/20',
    Uncommon: 'border-emerald-400 text-emerald-200 bg-emerald-500/20',
    Rare: 'border-blue-400 text-blue-200 bg-blue-500/20',
    Epic: 'border-purple-400 text-purple-200 bg-purple-500/20',
    Legendary: 'border-amber-400 text-amber-200 bg-amber-500/20',
    Mythic: 'border-rose-500 text-rose-200 bg-rose-500/20',
  };

  return map[rarity] ?? 'border-stone-400 text-stone-100 bg-stone-500/20';
}