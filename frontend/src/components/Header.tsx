import { Link, NavLink } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { truncateAddress } from '../lib/utils';

export function Header() {
  const { account, isConnecting, isWrongNetwork, connectWallet, disconnectWallet, switchToSepolia } = useWeb3();

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-500/30 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-3 text-lg font-black tracking-[0.2em] text-cyan-300 uppercase">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/50 bg-cyan-500/10 shadow-neon">
            N
          </span>
          NeonForge
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {[
            ['Marketplace', '/'],
            ['Mint', '/mint'],
            ['Dashboard', '/dashboard'],
            ['Profile', '/profile'],
          ].map(([label, to]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-sm font-medium tracking-[0.14em] uppercase transition ${
                  isActive ? 'text-cyan-300' : 'text-slate-300 hover:text-cyan-200'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isWrongNetwork && (
            <button
              type="button"
              onClick={switchToSepolia}
              className="rounded-full border border-yellow-400/70 bg-yellow-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-yellow-200"
            >
              Switch to Sepolia
            </button>
          )}

          {account ? (
            <>
              <div className="hidden rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 sm:block">
                {truncateAddress(account)}
              </div>
              <button
                type="button"
                onClick={disconnectWallet}
                className="rounded-full border border-slate-600 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-100"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={connectWallet}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400 bg-cyan-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 shadow-neon disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Wallet className="h-4 w-4" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
