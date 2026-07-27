import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { mintDevBundleAuth } from '../../bundles/auth.js';
import type { WeighInLocalRecord } from '../../db/types.js';
import {
  flushPendingWeighIns,
  listLocalWeighIns,
  prefetchDerbyTickets,
  recordWeighInLocal,
} from '../../derbies/weigh-in.js';
import { formatMass, parseMassInput } from '../../format/index.js';
import { ensurePersonalUser } from '../../harvest/personal-user.js';
import { ensurePersonalOrg } from '../../trips/session.js';

function apiBase(): string | null {
  const base = import.meta.env.VITE_API_BASE as string | undefined;
  return base ? base.replace(/\/$/, '') : null;
}

/** Station operators act in the derby org (env override for dock devices). */
async function stationOrgId(): Promise<string> {
  const fromEnv = import.meta.env.VITE_ORG_ID as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim();
  return ensurePersonalOrg();
}

/** Offline-capable dock weigh-in station for a derby. */
export function WeighInStationPage() {
  const { slug } = useParams<{ slug: string }>();
  const [station, setStation] = useState('thomas-basin');
  const [ticketCode, setTicketCode] = useState('');
  const [species, setSpecies] = useState('king');
  const [massLb, setMassLb] = useState('');
  const [witness, setWitness] = useState('');
  const [rows, setRows] = useState<WeighInLocalRecord[]>([]);
  const [ticketCount, setTicketCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshLists(derbySlug: string) {
    const listed = await listLocalWeighIns(derbySlug);
    setRows(listed);
    setPendingCount(listed.filter((r) => !r.syncedAt).length);
  }

  useEffect(() => {
    if (!slug) return;
    void refreshLists(slug);
  }, [slug]);

  async function onPrefetch() {
    if (!slug) return;
    const base = apiBase();
    if (!base) {
      setError('Prefetch needs the API while you still have signal.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const orgId = await stationOrgId();
      const userId = await ensurePersonalUser();
      const n = await prefetchDerbyTickets({
        orgId,
        userId,
        derbySlug: slug,
        apiBase: base,
        authorization: mintDevBundleAuth(orgId, userId),
      });
      setTicketCount(n);
      setStatus(`Cached ${n} paid ticket${n === 1 ? '' : 's'} for offline use.`);
      await flushPendingWeighIns({
        orgId,
        userId,
        derbySlug: slug,
        apiBase: base,
        authorization: mintDevBundleAuth(orgId, userId),
      });
      await refreshLists(slug);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'prefetch failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const orgId = await stationOrgId();
      const userId = await ensurePersonalUser();
      const massKg = parseMassInput(massLb);
      if (!(massKg > 0)) throw new Error('Enter a weight');

      const row = await recordWeighInLocal({
        orgId,
        operatorId: userId,
        derbySlug: slug,
        ticketCode,
        species,
        massKg,
        station,
        witness: witness || undefined,
      });

      const base = apiBase();
      if (base && navigator.onLine) {
        const result = await flushPendingWeighIns({
          orgId,
          userId,
          derbySlug: slug,
          apiBase: base,
          authorization: mintDevBundleAuth(orgId, userId),
        });
        setStatus(
          result.failed > 0
            ? `Saved ${row.displayName}. ${result.failed} still pending sync.`
            : `Saved and synced ${row.displayName}.`,
        );
      } else {
        setStatus(`Saved offline for ${row.displayName}. Will sync when online.`);
      }

      setTicketCode('');
      setMassLb('');
      setWitness('');
      await refreshLists(slug);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'weigh-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-deep text-hairline">
      <header className="border-b border-hairline px-4 py-4">
        <p className="font-ui text-xs uppercase tracking-wide text-hairline/70">
          Weigh-in station
        </p>
        <h1 className="font-data text-2xl tracking-wide">{slug ?? '—'}</h1>
        <p className="mt-1 font-ui text-xs text-hairline/70">
          {ticketCount > 0
            ? `${ticketCount} tickets cached`
            : 'Prefetch tickets while you have signal'}
          {pendingCount > 0 ? ` · ${pendingCount} pending sync` : ''}
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4">
        <button
          type="button"
          onClick={() => void onPrefetch()}
          disabled={busy}
          className="border border-hairline px-4 py-3 font-ui text-sm disabled:opacity-50"
        >
          Prefetch tickets / flush sync
        </button>

        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 font-ui text-sm">
            Station
            <input
              className="border border-hairline/40 bg-transparent px-3 py-2"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 font-ui text-sm">
            Ticket code
            <input
              className="border border-hairline/40 bg-transparent px-3 py-2 font-data tracking-wide uppercase"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
              placeholder="DERBY-XXXXXXXX"
              required
              autoCapitalize="characters"
            />
          </label>
          <label className="flex flex-col gap-1 font-ui text-sm">
            Species
            <input
              className="border border-hairline/40 bg-transparent px-3 py-2"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 font-ui text-sm">
            Weight (lb)
            <input
              inputMode="decimal"
              className="border border-hairline/40 bg-transparent px-3 py-2 font-data"
              value={massLb}
              onChange={(e) => setMassLb(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 font-ui text-sm">
            Witness
            <input
              className="border border-hairline/40 bg-transparent px-3 py-2"
              value={witness}
              onChange={(e) => setWitness(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="border border-hairline bg-hairline px-4 py-3 font-ui text-sm font-medium text-deep disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Record weigh-in'}
          </button>
        </form>

        {status && (
          <p className="font-ui text-sm text-hairline/80" role="status">
            {status}
          </p>
        )}
        {error && (
          <p className="font-ui text-sm text-caution" role="alert">
            {error}
          </p>
        )}

        {rows.length > 0 && (
          <ol className="flex flex-col divide-y divide-hairline/30">
            {rows.map((row) => (
              <li key={row.id} className="flex justify-between gap-3 py-2">
                <div>
                  <p className="font-ui text-sm font-medium">{row.displayName}</p>
                  <p className="font-ui text-xs text-hairline/70">
                    {row.ticketCode} · {row.species}
                    {row.syncedAt ? '' : ' · pending'}
                  </p>
                </div>
                <span className="font-data text-sm tabular-nums">
                  {formatMass(row.massKg)}
                </span>
              </li>
            ))}
          </ol>
        )}

        <Link
          to={`/derbies/${slug ?? ''}`}
          className="font-ui text-xs underline text-hairline/70"
        >
          Leaderboard
        </Link>
      </main>
    </div>
  );
}
