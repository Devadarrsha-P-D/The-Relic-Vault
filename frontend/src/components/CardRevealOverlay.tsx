import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { rarityStyles } from '../lib/utils';

export type RevealCard = {
  name: string;
  rarity: string;
  image: string;
  element: string;
  attack: number;
  defense: number;
  special: string;
};

const RARITY_THEME: Record<string, { color: string; glow: string }> = {
  Common: { color: '#d6d3d1', glow: 'rgba(214, 211, 209, 0.5)' },
  Uncommon: { color: '#34d399', glow: 'rgba(52, 211, 153, 0.5)' },
  Rare: { color: '#60a5fa', glow: 'rgba(96, 165, 250, 0.5)' },
  Epic: { color: '#c084fc', glow: 'rgba(192, 132, 252, 0.5)' },
  Legendary: { color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.55)' },
  Mythic: { color: '#fb7185', glow: 'rgba(251, 113, 133, 0.55)' },
};

const PARTICLE_COUNT: Record<string, number> = {
  Common: 14,
  Uncommon: 16,
  Rare: 20,
  Epic: 24,
  Legendary: 30,
  Mythic: 36,
};

const ANTICIPATION_MS = 1500;
const AUTO_DISMISS_MS = 8000;
const REDUCED_MOTION_DISMISS_MS = 4000;
const CLOSE_FADE_MS = 300;

type Particle = { id: number; tx: string; ty: string; size: number; delay: string };

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const distance = 110 + Math.random() * 170;
    return {
      id: i,
      tx: `${Math.cos(angle) * distance}px`,
      ty: `${Math.sin(angle) * distance}px`,
      size: 6 + Math.random() * 10,
      delay: `${(Math.random() * 0.12).toFixed(2)}s`,
    };
  });
}

export function CardRevealOverlay({ card, onClose }: { card: RevealCard; onClose: () => void }) {
  const [stage, setStage] = useState<'anticipate' | 'reveal'>('anticipate');
  const [closing, setClosing] = useState(false);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closingRef = useRef(false);

  const theme = RARITY_THEME[card.rarity] ?? RARITY_THEME.Common;
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const particles = useMemo(
    () => (reducedMotion ? [] : makeParticles(PARTICLE_COUNT[card.rarity] ?? 18)),
    [reducedMotion, card.rarity],
  );

  const embers = useMemo(
    () =>
      reducedMotion
        ? []
        : Array.from({ length: 8 }, (_, i) => ({
            id: i,
            left: `${5 + Math.random() * 90}%`,
            size: 3 + Math.random() * 4,
            delay: `${(Math.random() * 2.4).toFixed(2)}s`,
          })),
    [reducedMotion],
  );

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(() => onCloseRef.current(), CLOSE_FADE_MS);
  }, []);

  // Skip the anticipation beat when the user prefers reduced motion.
  useEffect(() => {
    if (reducedMotion) {
      setStage('reveal');
      return;
    }
    const timer = window.setTimeout(() => setStage('reveal'), ANTICIPATION_MS);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  // Escape key dismisses the overlay.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Auto-dismiss so the reveal never blocks the user permanently.
  useEffect(() => {
    const timer = window.setTimeout(close, reducedMotion ? REDUCED_MOTION_DISMISS_MS : AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [close, reducedMotion]);

  // Lock body scroll while the overlay is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const particleStyle = (particle: Particle): CSSProperties =>
    ({
      '--tx': particle.tx,
      '--ty': particle.ty,
      '--size': `${particle.size}px`,
      '--color': theme.color,
      '--delay': particle.delay,
    }) as CSSProperties;

  return (
    <div
      className={`relic-reveal-backdrop fixed inset-0 z-[100] flex items-center justify-center overflow-hidden ${
        closing ? 'relic-reveal-closing' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={`${card.name} revealed`}
    >
      {/* Click-outside dismiss */}
      <div className="relic-reveal-backdrop absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={close} />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.55)_100%)]" />

      {/* Rarity flash */}
      {stage === 'reveal' && (
        <div
          className="relic-reveal-flash pointer-events-none absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] rounded-full"
          style={{ background: `radial-gradient(circle, ${theme.color}40, transparent 60%)` }}
        />
      )}

      {/* Particle burst */}
      {stage === 'reveal' &&
        particles.map((particle) => (
          <span key={particle.id} className="relic-burst-particle" style={particleStyle(particle)} />
        ))}

      {/* Ambient embers */}
      {stage === 'reveal' &&
        embers.map((ember) => (
          <span
            key={ember.id}
            className="relic-ember"
            style={
              {
                left: ember.left,
                bottom: '8%',
                width: `${ember.size}px`,
                height: `${ember.size}px`,
                '--color': theme.color,
                '--delay': ember.delay,
              } as CSSProperties
            }
          />
        ))}

      {/* Content */}
      <div className="relic-reveal-content relative flex w-full flex-col items-center px-4" onClick={(event) => event.stopPropagation()}>
        {stage === 'anticipate' ? (
          <div className="flex flex-col items-center">
            <div className="relative flex h-44 w-44 items-center justify-center">
              <span
                className="relic-reveal-ring absolute inset-0 rounded-full border-2"
                style={{ borderColor: theme.color }}
              />
              <span
                className="relic-reveal-ring absolute inset-0 rounded-full border-2"
                style={{ borderColor: theme.color, animationDelay: '0.5s' }}
              />
              <span
                className="relic-reveal-orb h-28 w-28 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${theme.color}40, ${theme.color}0d 60%, transparent 70%)`,
                  boxShadow: `0 0 60px ${theme.glow}`,
                }}
              />
            </div>
            <p className="relic-reveal-caption mt-8 text-xs uppercase tracking-[0.35em] text-amber-200/90">
              The vault stirs…
            </p>
          </div>
        ) : (
          <>
            <div className="relative">
              <div
                className="relic-reveal-glow pointer-events-none absolute -inset-12 rounded-full"
                style={{ background: `radial-gradient(circle, ${theme.glow}, transparent 65%)` }}
              />
              <div
                className="relic-reveal-card myth-frame relative w-[min(84vw,330px)] rounded-[28px] p-3"
                style={{ boxShadow: `0 0 44px ${theme.glow}, inset 0 0 0 1px ${theme.color}33` }}
              >
                <div className="relative overflow-hidden rounded-[20px]">
                  <img src={card.image} alt={card.name} className="aspect-[2/3] w-full object-cover" />
                  <span
                    className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${rarityStyles(card.rarity)}`}
                  >
                    {card.rarity}
                  </span>
                </div>
                <div className="px-1 pb-1 pt-4 text-center">
                  <h2 className="font-display text-2xl font-black text-amber-50">{card.name}</h2>
                  <p className="mt-1 text-xs uppercase tracking-[0.25em] text-amber-300/80">{card.element}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-xl border border-stone-700 bg-stone-950/60 px-2 py-1.5">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">Attack</p>
                      <p className="font-mono text-base text-amber-100">{card.attack}</p>
                    </div>
                    <div className="rounded-xl border border-stone-700 bg-stone-950/60 px-2 py-1.5">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">Defense</p>
                      <p className="font-mono text-base text-amber-100">{card.defense}</p>
                    </div>
                    <div className="rounded-xl border border-stone-700 bg-stone-950/60 px-2 py-1.5">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">Special</p>
                      <p className="truncate text-sm font-bold text-amber-100" title={card.special}>
                        {card.special}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="relic-reveal-shadow pointer-events-none absolute -bottom-8 left-1/2 h-4 w-3/4 rounded-[100%]"
                style={{ background: 'radial-gradient(ellipse, rgba(0, 0, 0, 0.55), transparent 70%)' }}
              />
            </div>

            <p className="relic-reveal-caption mt-10 text-center text-xs uppercase tracking-[0.3em] text-stone-300">
              New card added to your vault
            </p>
            <button
              type="button"
              onClick={close}
              className="relic-reveal-caption mt-4 rounded-full border border-stone-600 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-stone-300 transition hover:border-amber-400/70 hover:text-amber-200"
            >
              Continue
            </button>
          </>
        )}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={close}
        aria-label="Close reveal"
        className="absolute right-4 top-4 rounded-full border border-stone-600/70 bg-stone-950/70 p-2 text-stone-300 transition hover:border-amber-400/70 hover:text-amber-200"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}