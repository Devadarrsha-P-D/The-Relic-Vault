import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster, toast } from 'react-hot-toast';
import { Header } from './components/Header';
import { Web3Provider } from './contexts/Web3Context';
import { MarketplaceGallery } from './pages/MarketplaceGallery';
import { MintPage } from './pages/MintPage';

const renderWithToaster = (ui: React.ReactElement) => render(<><Toaster />{ui}</>);

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    NavLink: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

describe('The Relic Vault frontend', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    Object.defineProperty(window, 'ethereum', {
      value: {
        request: vi.fn().mockImplementation(async (payload: { method: string; params?: unknown[] } | string, params?: unknown[]) => {
          const method = typeof payload === 'string' ? payload : payload.method;
          const requestParams = typeof payload === 'string' ? params : payload.params;

          if (method === 'eth_accounts') {
            return [];
          }

          if (method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }

          if (method === 'eth_chainId' || method === 'net_version') {
            return '0xaa36a7';
          }

          if (method === 'wallet_switchEthereumChain') {
            return null;
          }

          if (method === 'wallet_addEthereumChain') {
            return null;
          }

          if (method === 'eth_getBalance') {
            return '0x0';
          }

          return requestParams ?? null;
        }),
        on: vi.fn(),
        removeListener: vi.fn(),
      },
      configurable: true,
    });
  });

  it('renders the connect wallet button and transitions state', async () => {
    renderWithToaster(
      <Web3Provider>
        <Header />
      </Web3Provider>,
    );

    const button = screen.getByRole('button', { name: /connect wallet/i });
    expect(button).toBeInTheDocument();

    await userEvent.click(button);
    const connectingButton = await screen.findByRole('button', { name: /connecting/i });
    expect(connectingButton).toBeInTheDocument();
    expect(connectingButton).toBeDisabled();
  });

  it('renders a transaction error toast', async () => {
    renderWithToaster(<div />);

    await act(async () => {
      toast.error('Transaction failed');
    });

    await waitFor(() => {
      expect(screen.getByText('Transaction failed')).toBeInTheDocument();
    });
  });

  it('prompts to connect a wallet when viewing the marketplace without one', () => {
    render(
      <Web3Provider>
        <MarketplaceGallery />
      </Web3Provider>,
    );

    expect(screen.getByRole('heading', { name: /market awaits an adventurer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('prompts to connect a wallet on the mint page without one', () => {
    render(
      <Web3Provider>
        <MintPage />
      </Web3Provider>,
    );

    expect(screen.getByRole('heading', { name: /forge a new legend/i })).toBeInTheDocument();
    expect(screen.getByText(/connect your wallet to begin minting/i)).toBeInTheDocument();
  });
});