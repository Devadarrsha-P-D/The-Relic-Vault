import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ethers } from "ethers";
import {
  NEONFORGE_CARD_ADDRESS,
  NEONFORGE_MARKETPLACE_ADDRESS,
  SEPOLIA_CHAIN_ID,
} from "../contracts/addresses";
import NeonForgeCardArtifact from "../contracts/NeonForgeCard.json";
import NeonForgeMarketplaceArtifact from "../contracts/NeonForgeMarketplace.json";

interface Web3ContextType {
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  cardContract: ethers.Contract | null;
  marketplaceContract: ethers.Contract | null;
  isCorrectNetwork: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [cardContract, setCardContract] = useState<ethers.Contract | null>(null);
  const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

  const connect = async () => {
    if (!(window as any).ethereum) {
      alert("MetaMask not found. Please install it.");
      return;
    }

    const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
    await browserProvider.send("eth_requestAccounts", []);
    const network = await browserProvider.getNetwork();
    const currentSigner = await browserProvider.getSigner();
    const currentAddress = await currentSigner.getAddress();

    setProvider(browserProvider);
    setSigner(currentSigner);
    setAddress(currentAddress);

    const correctNetwork = Number(network.chainId) === SEPOLIA_CHAIN_ID;
    setIsCorrectNetwork(correctNetwork);

    if (correctNetwork) {
      const card = new ethers.Contract(
        NEONFORGE_CARD_ADDRESS,
        NeonForgeCardArtifact.abi,
        currentSigner
      );
      const marketplace = new ethers.Contract(
        NEONFORGE_MARKETPLACE_ADDRESS,
        NeonForgeMarketplaceArtifact.abi,
        currentSigner
      );
      setCardContract(card);
      setMarketplaceContract(marketplace);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setProvider(null);
    setSigner(null);
    setCardContract(null);
    setMarketplaceContract(null);
    setIsCorrectNetwork(false);
  };

  const switchToSepolia = async () => {
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + SEPOLIA_CHAIN_ID.toString(16) }],
      });
      await connect();
    } catch (err) {
      console.error("Failed to switch network:", err);
    }
  };

  useEffect(() => {
    if (!(window as any).ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        connect();
      }
    };

    const handleChainChanged = () => {
      connect();
    };

    (window as any).ethereum.on("accountsChanged", handleAccountsChanged);
    (window as any).ethereum.on("chainChanged", handleChainChanged);

    return () => {
      (window as any).ethereum.removeListener("accountsChanged", handleAccountsChanged);
      (window as any).ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  return (
    <Web3Context.Provider
      value={{
        address,
        provider,
        signer,
        cardContract,
        marketplaceContract,
        isCorrectNetwork,
        connect,
        disconnect,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}
