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

  const NeonForgeCard = await ethers.getContractFactory("NeonForgeCard");
  const card = await NeonForgeCard.deploy();
  const cardTx = card.deploymentTransaction();
  console.log("NeonForgeCard TX hash:", cardTx?.hash);
  const cardReceipt = await waitForReceipt(provider, cardTx!.hash, "NeonForgeCard");
  const cardAddress = cardReceipt.contractAddress;
  console.log("NeonForgeCard deployed to:", cardAddress);

  const NeonForgeMarketplace = await ethers.getContractFactory("NeonForgeMarketplace");
  const marketplace = await NeonForgeMarketplace.deploy(cardAddress, feeRecipient);
  const marketTx = marketplace.deploymentTransaction();
  console.log("NeonForgeMarketplace TX hash:", marketTx?.hash);
  const marketReceipt = await waitForReceipt(provider, marketTx!.hash, "NeonForgeMarketplace");
  console.log("NeonForgeMarketplace deployed to:", marketReceipt.contractAddress);

  console.log("Fee recipient:", feeRecipient);
}

main().catch((error) => {
  console.error("CAUGHT ERROR:", error);
  process.exitCode = 1;
});
