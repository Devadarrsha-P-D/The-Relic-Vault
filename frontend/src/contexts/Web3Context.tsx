import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { BrowserProvider, Contract, ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import type { ReactNode } from 'react';
import {
  MYTHFORGE_CARD_ADDRESS,
  MYTHFORGE_MARKETPLACE_ADDRESS,
  SEPOLIA_CHAIN_ID,
} from '../contracts/addresses';

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, listener: (...args: any[]) => void) => void;
  removeListener: (event: string, listener: (...args: any[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const CARD_CONTRACT_ADDRESS = MYTHFORGE_CARD_ADDRESS;
const MARKETPLACE_CONTRACT_ADDRESS = MYTHFORGE_MARKETPLACE_ADDRESS;

const CARD_ABI = [
  'function mintCard(address to, string tokenURI) external returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address to, uint256 tokenId) external',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved) external',
];

const MARKETPLACE_ABI = [
  'function listCard(uint256 tokenId, uint256 price) external',
  'function delistCard(uint256 tokenId) external',
  'function updatePrice(uint256 tokenId, uint256 newPrice) external',
  'function purchaseCard(uint256 tokenId) payable',
  'function getListing(uint256 tokenId) view returns (tuple(address seller, uint256 price, bool active))',
  'function feeRecipient() view returns (address)',
];

type Web3ContextType = {
  account: string | null;
  chainId: number | null;
  provider: BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  isConnected: boolean;
  isWrongNetwork: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToSepolia: () => Promise<void>;
  cardContract: Contract | null;
  marketplaceContract: Contract | null;
};

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [cardContract, setCardContract] = useState<Contract | null>(null);
  const [marketplaceContract, setMarketplaceContract] = useState<Contract | null>(null);

  const isConnected = Boolean(account && provider && signer);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    setProvider(browserProvider);

    const syncWalletState = async () => {
      const accounts = (await browserProvider.send('eth_accounts', [])) as string[];
      if (accounts.length > 0) {
        const accountSigner = await browserProvider.getSigner();
        const nextAccount = await accountSigner.getAddress();
        setAccount(nextAccount);
        setSigner(accountSigner);
        const nextChainId = Number((await browserProvider.getNetwork()).chainId);
        setChainId(nextChainId);
        setIsWrongNetwork(nextChainId !== SEPOLIA_CHAIN_ID);
        setCardContract(new ethers.Contract(CARD_CONTRACT_ADDRESS, CARD_ABI, accountSigner));
        setMarketplaceContract(new ethers.Contract(MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_ABI, accountSigner));
      }
    };

    void syncWalletState();

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
        return;
      }
      const nextSigner = await browserProvider.getSigner();
      const nextAccount = await nextSigner.getAddress();
      setAccount(nextAccount);
      setSigner(nextSigner);
      const nextChainId = Number((await browserProvider.getNetwork()).chainId);
      setChainId(nextChainId);
      setIsWrongNetwork(nextChainId !== SEPOLIA_CHAIN_ID);
    };

    const handleChainChanged = async () => {
      const nextChainId = Number((await browserProvider.getNetwork()).chainId);
      setChainId(nextChainId);
      setIsWrongNetwork(nextChainId !== SEPOLIA_CHAIN_ID);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('MetaMask is not installed. Please install it to continue.');
      return;
    }

    setIsConnecting(true);
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);

      if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask');
      }

      const nextSigner = await browserProvider.getSigner();
      const nextAccount = await nextSigner.getAddress();
      const nextChainId = Number((await browserProvider.getNetwork()).chainId);

      setProvider(browserProvider);
      setSigner(nextSigner);
      setAccount(nextAccount);
      setChainId(nextChainId);
      setIsWrongNetwork(nextChainId !== SEPOLIA_CHAIN_ID);
      setCardContract(new ethers.Contract(CARD_CONTRACT_ADDRESS, CARD_ABI, nextSigner));
      setMarketplaceContract(new ethers.Contract(MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_ABI, nextSigner));
      toast.success('Wallet connected to MythForge.');
    } catch (error) {
      console.error(error);
      toast.error('Unable to connect wallet.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setProvider(null);
    setCardContract(null);
    setMarketplaceContract(null);
    setIsWrongNetwork(false);
    setChainId(null);
  };

  const switchToSepolia = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xAA36A7' }],
      });
      toast.success('Switched to Sepolia.');
    } catch (error: unknown) {
      const typedError = error as { code?: number };
      if (typedError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xAA36A7',
                chainName: 'Sepolia',
                nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        } catch (addError) {
          console.error(addError);
          toast.error('Could not add Sepolia network.');
        }
      }
    }
  };

  const contextValue = useMemo<Web3ContextType>(
    () => ({
      account,
      chainId,
      provider,
      signer,
      isConnected,
      isWrongNetwork,
      isConnecting,
      connectWallet,
      disconnectWallet,
      switchToSepolia,
      cardContract,
      marketplaceContract,
    }),
    [account, chainId, provider, signer, isConnected, isWrongNetwork, isConnecting, cardContract, marketplaceContract],
  );

  return <Web3Context.Provider value={contextValue}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) throw new Error('useWeb3 must be used inside a Web3Provider');
  return context;
}
