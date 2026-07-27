import type { GuestCatchReport } from '@troll/shared';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

/**
 * Public guest catch report page — shareable from the email link.
 * Fetches `/r/:slug` when an API base is configured; otherwise shows empty state.
 */
export function GuestReportPage() {
  const { slug } = useParams<{ slug: string }>();
  const [report, setReport] = useState<GuestCatchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const base = import.meta.env.VITE_API_BASE as string | undefined;
    if (!base) {
      setLoading(false);
      setError('Report link opens when the API is available.');
      return;
    }
    setLoading(true);
    void fetch(`${base.replace(/\/$/, '')}/r/${slug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Report not found');
        const body = (await res.json()) as { report: GuestCatchReport };
        setReport(body.report);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'load failed');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-deep text-hairline">
      <header className="border-b border-hairline px-4 py-4">
        <p className="font-ui text-xs uppercase tracking-wide text-hairline/70">
          Guest catch report
        </p>
        <h1 className="font-ui text-xl font-semibold">
          {report?.boatName ?? 'Your trip'}
        </h1>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4">
        {loading && (
          <p className="font-ui text-sm text-hairline/70">Loading…</p>
        )}
        {error && !report && (
          <p className="font-ui text-sm text-caution" role="alert">
            {error}
          </p>
        )}
        {report && (
          <>
            <section className="flex flex-col gap-1">
              <p className="font-ui text-base">
                {report.guestName} · Captain {report.captainName}
              </p>
              <p className="font-ui text-sm text-hairline/70">
                {new Date(report.startedAt).toLocaleString()} –{' '}
                {new Date(report.closedAt).toLocaleString()}
              </p>
              {report.conditionsSummary && (
                <p className="font-ui text-sm">{report.conditionsSummary}</p>
              )}
            </section>

            <section aria-label="Catches">
              <h2 className="font-ui text-xs uppercase tracking-wide text-hairline/70">
                Catches
              </h2>
              {report.catches.length === 0 ? (
                <p className="mt-2 font-ui text-sm text-hairline/80">
                  No fish logged — still a day on the water.
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2">
                  {report.catches.map((c) => (
                    <li
                      key={c.id}
                      className="border-l-2 border-hairline pl-3 font-ui text-sm"
                    >
                      <span className="font-medium">{c.species}</span>
                      {c.lengthM != null && (
                        <span> · {c.lengthM.toFixed(2)} m</span>
                      )}
                      {c.massKg != null && (
                        <span> · {c.massKg.toFixed(1)} kg</span>
                      )}
                      <span className="text-hairline/70">
                        {' '}
                        · {c.kept ? 'kept' : 'released'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
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
