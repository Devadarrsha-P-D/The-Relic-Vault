import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function waitForReceipt(provider: any, txHash: string, label: string) {
  console.log(`Waiting for ${label} receipt...`);
  let receipt = null;
  while (!receipt) {
    receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
  console.log(`${label} confirmed in block`, receipt.blockNumber);
  return receipt;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const provider = deployer.provider;
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  console.log("Deploying contracts with account:", deployer.address);

  const MythForgeCard = await ethers.getContractFactory("MythForgeCard");
  const card = await MythForgeCard.deploy();
  const cardTx = card.deploymentTransaction();
  console.log("MythForgeCard TX hash:", cardTx?.hash);
  const cardReceipt = await waitForReceipt(provider, cardTx!.hash, "MythForgeCard");
  const cardAddress = cardReceipt.contractAddress;
  console.log("MythForgeCard deployed to:", cardAddress);

  const MythForgeMarketplace = await ethers.getContractFactory("MythForgeMarketplace");
  const marketplace = await MythForgeMarketplace.deploy(cardAddress, feeRecipient);
  const marketTx = marketplace.deploymentTransaction();
  console.log("MythForgeMarketplace TX hash:", marketTx?.hash);
  const marketReceipt = await waitForReceipt(provider, marketTx!.hash, "MythForgeMarketplace");
  console.log("MythForgeMarketplace deployed to:", marketReceipt.contractAddress);

  console.log("Fee recipient:", feeRecipient);
}

main().catch((error) => {
  console.error("CAUGHT ERROR:", error);
  process.exitCode = 1;
});
