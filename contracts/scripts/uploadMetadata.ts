import * as dotenv from "dotenv";
import { PinataSDK } from "@pinata/sdk";

dotenv.config();

const rarityThemes: Record<string, { name: string; accent: string; background: string; image: string }> = {
  Common: {
    name: "Common",
    accent: "#7dd3fc",
    background: "#0b1220",
    image: "https://placehold.co/512x768/0b1220/7dd3fc?text=Common+Spirit",
  },
  Rare: {
    name: "Rare",
    accent: "#22d3ee",
    background: "#082f49",
    image: "https://placehold.co/512x768/082f49/22d3ee?text=Rare+Spirit",
  },
  Epic: {
    name: "Epic",
    accent: "#d946ef",
    background: "#2e1065",
    image: "https://placehold.co/512x768/2e1065/d946ef?text=Epic+Spirit",
  },
  Legendary: {
    name: "Legendary",
    accent: "#f59e0b",
    background: "#3f2a08",
    image: "https://placehold.co/512x768/3f2a08/f59e0b?text=Legendary+Spirit",
  },
};

function buildPlaceholderSvg(theme: { accent: string; background: string; name: string }) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="768" viewBox="0 0 512 768">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${theme.background}"/>
          <stop offset="100%" stop-color="#050816"/>
        </linearGradient>
      </defs>
      <rect width="512" height="768" rx="32" fill="url(#bg)"/>
      <circle cx="256" cy="220" r="128" fill="${theme.accent}" opacity="0.18"/>
      <circle cx="256" cy="220" r="88" fill="none" stroke="${theme.accent}" stroke-width="4" opacity="0.8"/>
      <path d="M178 250 C212 166, 300 166, 334 250 L344 300 C284 332, 228 332, 168 300 Z" fill="${theme.accent}" opacity="0.75"/>
      <path d="M150 520 L256 430 L362 520 L256 620 Z" fill="${theme.accent}" opacity="0.2"/>
      <text x="256" y="620" text-anchor="middle" font-size="32" font-family="monospace" fill="#E2E8F0" letter-spacing="3">${theme.name.toUpperCase()}</text>
      <text x="256" y="680" text-anchor="middle" font-size="18" font-family="monospace" fill="#CBD5E1" letter-spacing="2">NEON FORGE</text>
    </svg>
  `;
}

function buildMetadataForCard({
  name,
  description,
  rarity,
  attack,
  defense,
  special,
  element,
  image,
}: {
  name: string;
  description: string;
  rarity: string;
  attack: number;
  defense: number;
  special: string;
  element: string;
  image: string;
}) {
  return {
    name,
    description,
    image,
    attributes: [
      { trait_type: "Rarity", value: rarity },
      { trait_type: "Attack", value: attack },
      { trait_type: "Defense", value: defense },
      { trait_type: "Special", value: special },
      { trait_type: "Element Type", value: element },
    ],
  };
}

async function main() {
  const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT || "",
    pinataGateway: process.env.PINATA_GATEWAY || "gateway.pinata.cloud",
  });

  if (!process.env.PINATA_JWT) {
    throw new Error("PINATA_JWT is missing in the environment. Add it to your .env file.");
  }

  const archetypes = [
    { name: "Volt Wisp", rarity: "Common", attack: 32, defense: 20, special: "Static Bloom", element: "Lightning" },
    { name: "Glass Marauder", rarity: "Rare", attack: 46, defense: 28, special: "Shard Pulse", element: "Shadow" },
    { name: "Abyss Bloom", rarity: "Epic", attack: 62, defense: 40, special: "Nova Veil", element: "Void" },
    { name: "Solar Reaver", rarity: "Legendary", attack: 88, defense: 60, special: "Sunforge Rift", element: "Radiant" },
  ];

  const uploadedUris: string[] = [];

  for (const card of archetypes) {
    const svg = buildPlaceholderSvg(rarityThemes[card.rarity]);
    const svgBlob = Buffer.from(svg, "utf8");
    const svgUpload = await pinata.upload.public.file(svgBlob, {
      filename: `${card.name.toLowerCase().replace(/\s+/g, "-")}.svg`,
      metadata: { keyvalues: { rarity: card.rarity, type: "placeholder-art" } },
    });

    const imageUri = `ipfs://${svgUpload.ipfsHash}`;
    const metadata = buildMetadataForCard({
      name: card.name,
      description: `A neon-coded data-spirit from the NeonForge archive. ${card.special} wields ${card.element} energy.`,
      rarity: card.rarity,
      attack: card.attack,
      defense: card.defense,
      special: card.special,
      element: card.element,
      image: imageUri,
    });

    const jsonUpload = await pinata.upload.public.json(metadata, {
      metadata: { keyvalues: { name: card.name, rarity: card.rarity } },
    });

    const ipfsUri = `ipfs://${jsonUpload.ipfsHash}`;
    uploadedUris.push(ipfsUri);
    console.log(`${card.name}: ${ipfsUri}`);
  }

  console.log("\nGenerated metadata URIs:");
  console.log(JSON.stringify(uploadedUris, null, 2));
}

main().catch((error) => {
  console.error("Metadata upload failed:", error);
  process.exitCode = 1;
});
