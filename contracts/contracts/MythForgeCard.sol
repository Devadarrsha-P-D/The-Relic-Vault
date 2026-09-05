// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MythForgeCard is ERC721 {
    uint256 private _tokenIdCounter;

    event CardMinted(address indexed to, uint256 indexed tokenId, string tokenURI);

    mapping(uint256 => string) private _tokenURIs;

    constructor() ERC721("MythForge Cards", "MYTH") {}

    function mintCard(address to, string memory metadataURI) external returns (uint256) {
        require(to != address(0), "MythForgeCard: cannot mint to zero address");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter += 1;

        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = metadataURI;

        emit CardMinted(to, tokenId, metadataURI);

        return tokenId;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
