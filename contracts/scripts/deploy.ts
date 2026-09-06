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

  const RelicVaultCard = await ethers.getContractFactory("RelicVaultCard");
  const card = await RelicVaultCard.deploy();
  const cardTx = card.deploymentTransaction();
  console.log("RelicVaultCard TX hash:", cardTx?.hash);
  const cardReceipt = await waitForReceipt(provider, cardTx!.hash, "RelicVaultCard");
  const cardAddress = cardReceipt.contractAddress;
  console.log("RelicVaultCard deployed to:", cardAddress);

  const RelicVaultMarketplace = await ethers.getContractFactory("RelicVaultMarketplace");
  const marketplace = await RelicVaultMarketplace.deploy(cardAddress, feeRecipient);
  const marketTx = marketplace.deploymentTransaction();
  console.log("RelicVaultMarketplace TX hash:", marketTx?.hash);
  const marketReceipt = await waitForReceipt(provider, marketTx!.hash, "RelicVaultMarketplace");
  console.log("RelicVaultMarketplace deployed to:", marketReceipt.contractAddress);

  console.log("Fee recipient:", feeRecipient);
}

main().catch((error) => {
  console.error("CAUGHT ERROR:", error);
  process.exitCode = 1;
});
