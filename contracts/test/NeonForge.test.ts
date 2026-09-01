import { expect } from "chai";
import { ethers } from "hardhat";

describe("NeonForge contracts", function () {
  async function deployContracts() {
    const [owner, buyer, seller, feeRecipient, otherUser] = await ethers.getSigners();

    const NeonForgeCard = await ethers.getContractFactory("NeonForgeCard");
    const card = await NeonForgeCard.deploy();
    await card.waitForDeployment();

    const NeonForgeMarketplace = await ethers.getContractFactory("NeonForgeMarketplace");
    const marketplace = await NeonForgeMarketplace.deploy(await card.getAddress(), feeRecipient.address);
    await marketplace.waitForDeployment();

    return { owner, buyer, seller, feeRecipient, otherUser, card, marketplace };
  }

  it("mints a card and stores the metadata URI", async function () {
    const { owner, card } = await deployContracts();
    const tokenURI = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbz6y";

    await expect(card.mintCard(owner.address, tokenURI))
      .to.emit(card, "CardMinted")
      .withArgs(owner.address, 0, tokenURI);

    expect(await card.totalSupply()).to.equal(1);
    expect(await card.ownerOf(0)).to.equal(owner.address);
    expect(await card.tokenURI(0)).to.equal(tokenURI);
  });

  it("allows listing a token and updating the price", async function () {
    const { owner, card, marketplace } = await deployContracts();
    const tokenURI = "ipfs://card-1";

    await card.mintCard(owner.address, tokenURI);
    await card.approve(await marketplace.getAddress(), 0);

    const listingPrice = ethers.parseEther("1.5");

    await expect(marketplace.listCard(0, listingPrice))
      .to.emit(marketplace, "CardListed")
      .withArgs(owner.address, 0, listingPrice);

    const listing = await marketplace.getListing(0);
    expect(listing.seller).to.equal(owner.address);
    expect(listing.price).to.equal(listingPrice);
    expect(listing.active).to.equal(true);

    const updatedPrice = ethers.parseEther("1.9");
    await expect(marketplace.updatePrice(0, updatedPrice))
      .to.emit(marketplace, "PriceUpdated")
      .withArgs(owner.address, 0, updatedPrice);

    const updatedListing = await marketplace.getListing(0);
    expect(updatedListing.price).to.equal(updatedPrice);
  });

  it("allows a valid buyer to purchase a listed card and transfers ownership", async function () {
    const { owner, buyer, feeRecipient, card, marketplace } = await deployContracts();
    const tokenURI = "ipfs://card-2";
    const listingPrice = ethers.parseEther("1.0");

    await card.mintCard(owner.address, tokenURI);
    await card.approve(await marketplace.getAddress(), 0);
    await marketplace.listCard(0, listingPrice);

    const sellerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);

    await expect(marketplace.connect(buyer).purchaseCard(0, { value: listingPrice }))
      .to.emit(marketplace, "CardPurchased")
      .withArgs(buyer.address, owner.address, 0, listingPrice, ethers.parseEther("0.02"));

    expect(await card.ownerOf(0)).to.equal(buyer.address);

    const sellerBalanceAfter = await ethers.provider.getBalance(owner.address);
    const feeRecipientBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);
    const expectedSellerProceeds = ethers.parseEther("0.98");
    const expectedFee = ethers.parseEther("0.02");

    expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedSellerProceeds);
    expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(expectedFee);
  });

  it("reverts when a buyer tries to purchase their own card", async function () {
    const { owner, card, marketplace } = await deployContracts();
    const listingPrice = ethers.parseEther("1.0");

    await card.mintCard(owner.address, "ipfs://card-own");
    await card.approve(await marketplace.getAddress(), 0);
    await marketplace.listCard(0, listingPrice);

    await expect(marketplace.connect(owner).purchaseCard(0, { value: listingPrice })).to.be.revertedWith(
      "Marketplace: buyer cannot be seller",
    );
  });

  it("reverts on double purchase attempt", async function () {
    const { owner, buyer, card, marketplace } = await deployContracts();
    const listingPrice = ethers.parseEther("1.0");

    await card.mintCard(owner.address, "ipfs://card-dupe");
    await card.approve(await marketplace.getAddress(), 0);
    await marketplace.listCard(0, listingPrice);

    await marketplace.connect(buyer).purchaseCard(0, { value: listingPrice });

    await expect(marketplace.connect(buyer).purchaseCard(0, { value: listingPrice })).to.be.revertedWith(
      "Marketplace: listing is not active",
    );
  });

  it("reverts on insufficient payment", async function () {
    const { owner, buyer, card, marketplace } = await deployContracts();
    const listingPrice = ethers.parseEther("1.0");

    await card.mintCard(owner.address, "ipfs://card-insufficient");
    await card.approve(await marketplace.getAddress(), 0);
    await marketplace.listCard(0, listingPrice);

    await expect(marketplace.connect(buyer).purchaseCard(0, { value: ethers.parseEther("0.5") })).to.be.revertedWith(
      "Marketplace: insufficient payment",
    );
  });

  it("reverts when a non-owner tries to list or delist a card", async function () {
    const { owner, buyer, card, marketplace } = await deployContracts();
    const listingPrice = ethers.parseEther("1.0");

    await card.mintCard(owner.address, "ipfs://card-unauth");
    await card.approve(await marketplace.getAddress(), 0);
    await marketplace.listCard(0, listingPrice);

    await expect(marketplace.connect(buyer).delistCard(0)).to.be.revertedWith("Marketplace: caller is not seller");

    await card.mintCard(buyer.address, "ipfs://other-card");
    await card.connect(buyer).approve(await marketplace.getAddress(), 1);

    await expect(marketplace.connect(owner).listCard(1, listingPrice)).to.be.revertedWith(
      "Marketplace: caller is not token owner",
    );
  });

  it("reverts when delisting an inactive listing or updating a non-active listing", async function () {
    const { owner, buyer, card, marketplace } = await deployContracts();
    const listingPrice = ethers.parseEther("1.0");

    await card.mintCard(owner.address, "ipfs://card-inactive");
    await card.approve(await marketplace.getAddress(), 0);
    await marketplace.listCard(0, listingPrice);

    await expect(marketplace.updatePrice(999, listingPrice)).to.be.revertedWith("Marketplace: listing is not active");
    await marketplace.connect(buyer).purchaseCard(0, { value: listingPrice });

    await expect(marketplace.delistCard(0)).to.be.revertedWith("Marketplace: listing is not active");
  });
});
