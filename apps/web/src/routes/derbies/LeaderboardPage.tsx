import type { PublicLeaderboard } from '@troll/shared';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatMass } from '../../format/index.js';

function formatWindow(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Sitka',
  };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

/** Public derby leaderboard — no login to view. */
export function LeaderboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [board, setBoard] = useState<PublicLeaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const base = import.meta.env.VITE_API_BASE as string | undefined;
    if (!base) {
      setLoading(false);
      setError('Leaderboard opens when the API is available.');
      return;
    }
    setLoading(true);
    void fetch(`${base.replace(/\/$/, '')}/derbies/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Derby not found');
        const body = (await res.json()) as {
          generatedAt: string;
          leaderboard: PublicLeaderboard;
        };
        setBoard(body.leaderboard);
        setGeneratedAt(body.generatedAt);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'load failed');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-deep text-hairline">
      <header className="border-b border-hairline px-4 py-4">
        <p className="font-ui text-xs uppercase tracking-wide text-hairline/70">
          Derby
        </p>
        <h1 className="font-data text-2xl tracking-wide">
          {board?.name ?? slug ?? '—'}
        </h1>
        {board && (
          <p className="mt-1 font-ui text-sm text-hairline/80">
            {formatWindow(board.startsAt, board.endsAt)}
          </p>
        )}
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4">
        {loading && (
          <p className="font-ui text-sm text-hairline/70">Loading…</p>
        )}
        {error && !board && (
          <p className="font-ui text-sm text-caution" role="alert">
            {error}
          </p>
        )}

        {board && (
          <>
            <p className="font-ui text-sm text-hairline/80">
              {board.weighInCount} weigh-in{board.weighInCount === 1 ? '' : 's'}
              {' · '}
              {board.registeredCount} registered
              {board.rules.allowAppCatchEntries
                ? ''
                : ' · official weigh-in only'}
            </p>

            {board.entries.length === 0 ? (
              <p className="font-ui text-sm text-hairline/70">
                No weigh-ins yet. Check back after the dock opens.
              </p>
            ) : (
              <ol className="flex flex-col gap-0 divide-y divide-hairline/30">
                {board.entries.map((row) => (
                  <li
                    key={row.weighInId}
                    className="flex items-baseline justify-between gap-3 py-3"
                  >
                    <div className="flex min-w-0 items-baseline gap-3">
                      <span className="font-data w-8 shrink-0 text-lg tabular-nums text-hairline/60">
                        {row.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="font-ui truncate text-base font-medium">
                          {row.displayName}
                        </p>
                        <p className="font-ui text-xs text-hairline/70">
                          {row.species}
                          {' · '}
                          {row.station}
                          {row.hasPhoto ? ' · photo' : ''}
                        </p>
                      </div>
                    </div>
                    <span className="font-data shrink-0 text-lg tabular-nums">
                      {formatMass(row.massKg)}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {generatedAt && (
              <p className="font-ui text-xs text-hairline/50">
                Updated {new Date(generatedAt).toLocaleString()}
              </p>
            )}
          </>
        )}

        <div className="flex flex-col gap-2">
          {slug && (
            <Link
              to={`/derbies/${slug}/register`}
              className="font-ui text-sm underline text-hairline"
            >
              Register for this derby
            </Link>
          )}
          <Link
            to="/calculator"
            className="font-ui text-xs underline text-hairline/70"
          >
            Depth calculator
          </Link>
        </div>
      </main>
    </div>
  );
}
