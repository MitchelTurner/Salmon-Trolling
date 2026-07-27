import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_REGION_ID } from '@troll/shared';
import {
  bundleFreshness,
  getLocalBundle,
  mintDevBundleAuth,
  refreshDockBundle,
} from '../../bundles/index.js';
import type { BundleRecord } from '../../db/types.js';
import { ensurePersonalOrg } from '../../trips/session.js';
import { ensurePersonalUser } from '../../harvest/personal-user.js';

/**
 * Dock prefetch screen.
 * Bundle age is the hero signal; refresh prompt before departure.
 */
export function DockPage() {
  const [bundle, setBundle] = useState<BundleRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadLocal = async () => {
    const row = await getLocalBundle(DEFAULT_REGION_ID);
    setBundle(row ?? null);
  };

  useEffect(() => {
    void loadLocal();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const freshness = bundleFreshness(bundle, nowMs);

  const onRefresh = () => {
    setBusy(true);
    setError(null);
    void (async () => {
      const orgId = await ensurePersonalOrg();
      const userId = await ensurePersonalUser();
      const authorization = mintDevBundleAuth(orgId, userId);
      const apiBase = import.meta.env.VITE_API_BASE ?? '';
      const row = await refreshDockBundle({
        regionId: DEFAULT_REGION_ID,
        authorization,
        apiBase,
      });
      setBundle(row);
      setNowMs(Date.now());
    })()
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not refresh — still using the local bundle.',
        );
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-deep text-hairline">
      <header className="flex min-h-hit items-center justify-between border-b border-hairline px-4">
        <div>
          <h1 className="font-ui text-lg font-semibold">Dock</h1>
          <p className="font-ui text-xs text-hairline/70">
            Prefetch conditions before you leave wifi
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/trip"
            className="flex min-h-hit min-w-hit items-center justify-center font-ui text-sm underline"
          >
            Trip
          </Link>
          <Link
            to="/calculator"
            className="flex min-h-hit min-w-hit items-center justify-center font-ui text-sm underline"
          >
            Calculator
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4">
        <section
          className="border border-hairline p-4"
          aria-label="Bundle age"
          data-testid="bundle-age-panel"
        >
          <p className="font-ui text-xs uppercase tracking-wide text-hairline/70">
            Conditions bundle
          </p>
          <p
            className="mt-2 font-data text-3xl tabular-nums leading-none"
            data-testid="bundle-age"
          >
            {freshness.ageLabel ?? 'none'}
          </p>
          <p
            className={
              freshness.promptRefresh
                ? 'mt-3 font-ui text-sm text-caution'
                : 'mt-3 font-ui text-sm text-hairline/80'
            }
            data-testid="bundle-prompt"
            role={freshness.promptRefresh ? 'status' : undefined}
          >
            {freshness.promptMessage}
          </p>
          {bundle && (
            <dl className="mt-4 grid grid-cols-2 gap-2 font-data text-xs tabular-nums text-hairline/70">
              <div>
                <dt>Region</dt>
                <dd className="text-hairline">{bundle.regionId}</dd>
              </div>
              <div>
                <dt>Expires</dt>
                <dd className="text-hairline">
                  {new Date(bundle.expiresAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          )}
        </section>

        {error && (
          <p className="font-ui text-sm text-caution" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          className={
            freshness.promptRefresh
              ? 'min-h-hit w-full rounded-chart border border-caution bg-flat px-4 font-ui text-base disabled:opacity-50'
              : 'min-h-hit w-full rounded-chart border border-hairline bg-flat px-4 font-ui text-base disabled:opacity-50'
          }
          data-testid="bundle-refresh"
          onClick={onRefresh}
          disabled={busy}
        >
          {busy ? 'Refreshing…' : 'Refresh bundle'}
        </button>

        <p className="font-ui text-xs text-hairline/60">
          Offline is normal offshore. This screen is for the dock — pull tides,
          forecast, regs, and chart tiles while you still have wifi.
        </p>
      </main>
    </div>
  );
}
