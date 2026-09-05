import { ipfsToHttp } from './utils';

const PINATA_API = 'https://api.pinata.cloud/pinning';

export type MetadataAttribute = {
  trait_type: string;
  value: string | number;
};

export type CardMetadata = {
  name: string;
  description: string;
  image: string;
  attributes: MetadataAttribute[];
};

export type ParsedCardMetadata = {
  name: string;
  description: string;
  image: string;
  rarity: string;
  attack: number;
  defense: number;
  special: string;
  element: string;
};

export function getPinataJwt(): string {
  const jwt = import.meta.env.VITE_PINATA_JWT as string | undefined;
  if (!jwt) {
    throw new Error(
      'VITE_PINATA_JWT is not configured. Add it to frontend/.env (see frontend/.env.example) to enable IPFS uploads.',
    );
  }
  return jwt;
}

async function pinataFetch(path: string, init: RequestInit): Promise<{ IpfsHash: string }> {
  const jwt = getPinataJwt();
  const response = await fetch(`${PINATA_API}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${jwt}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Pinata upload failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as { IpfsHash?: string };
  if (!data.IpfsHash) {
    throw new Error('Pinata returned no IPFS hash.');
  }
  return { IpfsHash: data.IpfsHash };
}

/** Uploads a file (or generated SVG blob) to IPFS and returns `ipfs://<cid>`. */
export async function uploadFileToIpfs(file: Blob, filename: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, filename);
  const { IpfsHash } = await pinataFetch('pinFileToIPFS', {
    method: 'POST',
    body: formData,
  });
  return `ipfs://${IpfsHash}`;
}

/** Uploads a JSON metadata object to IPFS and returns `ipfs://<cid>`. */
export async function uploadJsonToIpfs(metadata: CardMetadata): Promise<string> {
  const { IpfsHash } = await pinataFetch('pinJSONToIPFS', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });
  return `ipfs://${IpfsHash}`;
}

export function buildCardMetadata(input: {
  name: string;
  description: string;
  image: string;
  rarity: string;
  attack: number;
  defense: number;
  special: string;
  element: string;
}): CardMetadata {
  return {
    name: input.name,
    description: input.description,
    image: input.image,
    attributes: [
      { trait_type: 'Rarity', value: input.rarity },
      { trait_type: 'Attack', value: input.attack },
      { trait_type: 'Defense', value: input.defense },
      { trait_type: 'Special', value: input.special },
      { trait_type: 'Element Type', value: input.element },
    ],
  };
}

/** Minimal fantasy placeholder art (SVG) used when no image is uploaded. */
export function buildPlaceholderSvg(input: { name: string; rarity: string; element: string }): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="768" viewBox="0 0 512 768">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#292524"/>
          <stop offset="100%" stop-color="#1c1917"/>
        </linearGradient>
      </defs>
      <rect width="512" height="768" rx="32" fill="url(#bg)"/>
      <rect x="24" y="24" width="464" height="720" rx="24" fill="none" stroke="#d4a017" stroke-opacity="0.5" stroke-width="3"/>
      <circle cx="256" cy="240" r="110" fill="none" stroke="#d4a017" stroke-opacity="0.8" stroke-width="4"/>
      <path d="M196 268 C220 186, 292 186, 316 268 L324 306 C276 332, 236 332, 188 306 Z" fill="#d4a017" opacity="0.75"/>
      <text x="256" y="470" text-anchor="middle" font-size="34" font-family="serif" fill="#f5f0e1">${input.name}</text>
      <text x="256" y="520" text-anchor="middle" font-size="20" font-family="serif" fill="#d4a017" letter-spacing="4">${input.rarity.toUpperCase()}</text>
      <text x="256" y="560" text-anchor="middle" font-size="18" font-family="serif" fill="#a8a29e" letter-spacing="3">${input.element.toUpperCase()}</text>
    </svg>
  `;
  return svg;
}

export function svgToBlob(svg: string): Blob {
  return new Blob([svg], { type: 'image/svg+xml' });
}

function attributeValue(attributes: MetadataAttribute[], trait: string): string | number | undefined {
  return attributes.find((attr) => attr.trait_type === trait)?.value;
}

/** Fetches metadata JSON from IPFS and normalizes it into card display fields. */
export async function fetchCardMetadata(uri: string): Promise<ParsedCardMetadata> {
  const url = ipfsToHttp(uri);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata (${response.status}).`);
  }
  const metadata = (await response.json()) as CardMetadata;
  return {
    name: metadata.name ?? 'Unknown Card',
    description: metadata.description ?? '',
    image: metadata.image ? ipfsToHttp(metadata.image) : '',
    rarity: String(attributeValue(metadata.attributes ?? [], 'Rarity') ?? 'Common'),
    attack: Number(attributeValue(metadata.attributes ?? [], 'Attack') ?? 0),
    defense: Number(attributeValue(metadata.attributes ?? [], 'Defense') ?? 0),
    special: String(attributeValue(metadata.attributes ?? [], 'Special') ?? '—'),
    element: String(attributeValue(metadata.attributes ?? [], 'Element Type') ?? '—'),
  };
}