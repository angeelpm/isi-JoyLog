import { useEffect, useState } from 'react';
import { ExternalLink, Tag } from 'lucide-react';
import { PriceAPI } from '../services/api';

interface PriceData {
  game: { id: string; title: string; slug: string };
  cheapest: {
    shop: string;
    price: { amount: number; currency: string };
    regular: { amount: number; currency: string };
    cut: number;
    url: string;
    drm: string[];
    platforms: string[];
  };
  historyLow: { amount: number; currency: string } | null;
}

type PriceState = 'idle' | 'loading' | 'found' | 'not-found' | 'error';

interface PriceWidgetProps {
  title: string;
  compact?: boolean;
  autoFetch?: boolean;
}

export const PriceWidget: React.FC<PriceWidgetProps> = ({
  title,
  compact = false,
  autoFetch = false,
}) => {
  const [state, setState] = useState<PriceState>('idle');
  const [data, setData] = useState<PriceData | null>(null);

  useEffect(() => {
    if (!autoFetch) return;
    let cancelled = false;
    setState('loading');
    PriceAPI.getGamePrice(title)
      .then((res) => {
        if (!cancelled) { setData(res.data); setState('found'); }
      })
      .catch((err: any) => {
        if (!cancelled) setState(err?.response?.status === 404 ? 'not-found' : 'error');
      });
    return () => { cancelled = true; };
  }, [title, autoFetch]);

  const fetchManually = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state === 'loading' || state === 'found') return;
    setState('loading');
    PriceAPI.getGamePrice(title)
      .then((res) => { setData(res.data); setState('found'); })
      .catch((err: any) => { setState(err?.response?.status === 404 ? 'not-found' : 'error'); });
  };

  // ── COMPACT MODE (search result cards) ───────────────────────────────────
  if (compact) {
    if (state === 'idle') {
      return (
        <button
          onClick={fetchManually}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.28rem',
            background: 'rgba(255, 179, 64, 0.10)',
            border: '1px solid rgba(255, 179, 64, 0.22)',
            borderRadius: '100px',
            padding: '0.18rem 0.5rem',
            fontSize: '0.66rem', fontWeight: 600,
            color: 'var(--accent-amber)',
            cursor: 'pointer', letterSpacing: '0.02em',
          }}
        >
          <Tag size={9} />
          Check Price
        </button>
      );
    }
    if (state === 'loading') {
      return (
        <span style={{
          fontSize: '0.66rem', color: 'var(--text-muted)',
          fontFamily: "'DM Mono', monospace", opacity: 0.7,
        }}>
          checking…
        </span>
      );
    }
    if (state === 'found' && data) {
      const { cheapest } = data;
      return (
        <a
          href={cheapest.url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.28rem',
            background: 'rgba(255, 179, 64, 0.15)',
            border: '1px solid rgba(255, 179, 64, 0.35)',
            borderRadius: '100px',
            padding: '0.18rem 0.55rem',
            fontSize: '0.66rem', fontWeight: 700,
            color: 'var(--accent-amber)',
            textDecoration: 'none', letterSpacing: '0.02em',
          }}
        >
          <span style={{ fontFamily: "'DM Mono', monospace" }}>
            ${cheapest.price.amount.toFixed(2)}
          </span>
          <span style={{ color: 'rgba(255,179,64,0.5)', fontWeight: 400 }}>·</span>
          <span>{cheapest.shop}</span>
          <ExternalLink size={9} />
        </a>
      );
    }
    return null;
  }

  // ── FULL MODE (library entry modal) ──────────────────────────────────────
  if (state === 'idle') return null;

  if (state === 'loading') {
    return (
      <div style={{
        background: 'var(--bg-surface-2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1rem',
      }}>
        <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
          Best Deal
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
          Checking prices…
        </p>
      </div>
    );
  }

  if (state === 'not-found') {
    return (
      <div style={{
        background: 'var(--bg-surface-2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '0.4rem', textAlign: 'center',
      }}>
        <Tag size={14} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
          No prices found
        </p>
      </div>
    );
  }

  if (state === 'error') return null;

  if (state === 'found' && data) {
    const { cheapest, historyLow } = data;
    const discounted = cheapest.cut > 0;
    return (
      <div style={{
        background: 'var(--bg-surface-2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1rem',
        display: 'flex', flexDirection: 'column', gap: '0.65rem',
      }}>
        <p style={{
          fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0,
        }}>
          Best Deal
        </p>

        {/* Price + discount row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.55rem', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '1.55rem', fontWeight: 700,
            color: 'var(--accent-amber)', lineHeight: 1,
          }}>
            ${cheapest.price.amount.toFixed(2)}
          </span>
          {discounted && (
            <>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.8rem', color: 'var(--text-muted)',
                textDecoration: 'line-through',
              }}>
                ${cheapest.regular.amount.toFixed(2)}
              </span>
              <span style={{
                background: 'rgba(255, 59, 92, 0.14)',
                border: '1px solid rgba(255, 59, 92, 0.28)',
                color: 'var(--accent)',
                borderRadius: '100px',
                padding: '0.08rem 0.4rem',
                fontSize: '0.68rem', fontWeight: 700,
                letterSpacing: '0.02em',
              }}>
                -{cheapest.cut}%
              </span>
            </>
          )}
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>
          {cheapest.shop}
        </p>

        {historyLow && (
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
            All-time low:{' '}
            <span style={{ fontFamily: "'DM Mono', monospace" }}>
              ${historyLow.amount.toFixed(2)}
            </span>
          </p>
        )}

        <a
          href={cheapest.url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            background: 'var(--accent)',
            color: '#fff',
            padding: '0.6rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.8rem', fontWeight: 700,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.82')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Buy at {cheapest.shop}
          <ExternalLink size={12} />
        </a>
      </div>
    );
  }

  return null;
};
