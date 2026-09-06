// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RelicVaultMarketplace is ReentrancyGuard, ERC721Holder {
    uint256 public constant MARKETPLACE_FEE_BPS = 200; // 2%
    uint256 public constant MAX_BPS = 10_000;

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    address public immutable cardContract;
    address public immutable feeRecipient;

    mapping(uint256 => Listing) public listings;

    event CardListed(address indexed seller, uint256 indexed tokenId, uint256 price);
    event CardDelisted(address indexed seller, uint256 indexed tokenId);
    event CardPurchased(
        address indexed buyer,
        address indexed seller,
        uint256 indexed tokenId,
        uint256 price,
        uint256 fee
    );
    event PriceUpdated(address indexed seller, uint256 indexed tokenId, uint256 newPrice);

    constructor(address _cardContract, address _feeRecipient) {
        require(_cardContract != address(0), "Marketplace: card contract is zero");
        require(_feeRecipient != address(0), "Marketplace: fee recipient is zero");

        cardContract = _cardContract;
        feeRecipient = _feeRecipient;
    }

    function listCard(uint256 tokenId, uint256 price) external {
        require(price > 0, "Marketplace: price must be greater than zero");
        require(!listings[tokenId].active, "Marketplace: token already listed");
        require(IERC721(cardContract).ownerOf(tokenId) == msg.sender, "Marketplace: caller is not token owner");

        IERC721(cardContract).safeTransferFrom(msg.sender, address(this), tokenId);

        listings[tokenId] = Listing({seller: msg.sender, price: price, active: true});

        emit CardListed(msg.sender, tokenId, price);
    }

    function delistCard(uint256 tokenId) external {
        Listing storage listing = listings[tokenId];

        require(listing.active, "Marketplace: listing is not active");
        require(listing.seller == msg.sender, "Marketplace: caller is not seller");

        delete listings[tokenId];

        IERC721(cardContract).safeTransferFrom(address(this), msg.sender, tokenId);

        emit CardDelisted(msg.sender, tokenId);
    }

    function updatePrice(uint256 tokenId, uint256 newPrice) external {
        Listing storage listing = listings[tokenId];

        require(listing.active, "Marketplace: listing is not active");
        require(listing.seller == msg.sender, "Marketplace: caller is not seller");
        require(newPrice > 0, "Marketplace: new price must be greater than zero");

        listing.price = newPrice;

        emit PriceUpdated(msg.sender, tokenId, newPrice);
    }

    function purchaseCard(uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[tokenId];

        require(listing.active, "Marketplace: listing is not active");
        require(msg.sender != listing.seller, "Marketplace: buyer cannot be seller");
        require(msg.value >= listing.price, "Marketplace: insufficient payment");

        uint256 price = listing.price;
        address seller = listing.seller;
        uint256 fee = (price * MARKETPLACE_FEE_BPS) / MAX_BPS;
        uint256 sellerProceeds = price - fee;
        uint256 excess = msg.value - price;

        listing.active = false;
        delete listings[tokenId];

        IERC721(cardContract).safeTransferFrom(address(this), msg.sender, tokenId);

        if (sellerProceeds > 0) {
            payable(seller).transfer(sellerProceeds);
        }

        if (fee > 0) {
            payable(feeRecipient).transfer(fee);
        }

        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }

        emit CardPurchased(msg.sender, seller, tokenId, price, fee);
    }

    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return listings[tokenId];
    }
}
