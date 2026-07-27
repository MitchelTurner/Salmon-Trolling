import type { FishTagStatus } from '@troll/shared';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const STAGE_LABEL: Record<FishTagStatus['stage'], string> = {
  tagged: 'Tagged at the dock',
  at_processor: 'At the processor',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

/** Public guest status page for a printable fish tag code. */
export function TagStatusPage() {
  const { code } = useParams<{ code: string }>();
  const [status, setStatus] = useState<FishTagStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    const base = import.meta.env.VITE_API_BASE as string | undefined;
    if (!base) {
      setLoading(false);
      setError('Tag status opens when the API is available.');
      return;
    }
    setLoading(true);
    void fetch(`${base.replace(/\/$/, '')}/tag/${encodeURIComponent(code)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Tag not found');
        const body = (await res.json()) as { status: FishTagStatus };
        setStatus(body.status);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'load failed');
      })
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-deep text-hairline">
      <header className="border-b border-hairline px-4 py-4">
        <p className="font-ui text-xs uppercase tracking-wide text-hairline/70">
          Fish tag
        </p>
        <h1 className="font-data text-2xl tracking-wide">{code ?? '—'}</h1>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4">
        {loading && (
          <p className="font-ui text-sm text-hairline/70">Loading…</p>
        )}
        {error && !status && (
          <p className="font-ui text-sm text-caution" role="alert">
            {error}
          </p>
        )}
        {status && (
          <section className="flex flex-col gap-2">
            <p className="font-ui text-lg font-medium">
              {STAGE_LABEL[status.stage]}
            </p>
            <p className="font-ui text-sm">
              {status.species}
              {status.guestName ? ` · ${status.guestName}` : ''}
            </p>
            {status.boatName && (
              <p className="font-ui text-sm text-hairline/80">
                Boat: {status.boatName}
              </p>
            )}
            {status.processor && (
              <p className="font-ui text-sm text-hairline/80">
                Processor: {status.processor}
              </p>
            )}
            {status.tracking && (
              <p className="font-ui text-sm text-hairline/80">
                Tracking: {status.carrier ?? 'carrier'} {status.tracking}
              </p>
            )}
          </section>
        )}

        <Link
          to="/calculator"
          className="font-ui text-xs underline text-hairline/70"
        >
          Depth calculator
        </Link>
      </main>
    </div>
  );
}
