import { useEffect, useState, type ReactNode } from 'react';
import { RegulatoryDisclaimer } from '../../components/RegulatoryDisclaimer.js';
import {
  confirmHarvestDraft,
  draftFromCatchRecord,
  listHarvestRecords,
  type HarvestDraft,
} from '../../harvest/index.js';
import { ensurePersonalUser } from '../../harvest/personal-user.js';
import type { CatchRecord, HarvestRecordRow } from '../../db/types.js';

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-ui text-xs text-hairline/80">{label}</span>
      {children}
    </label>
  );
}

const controlClass =
  'min-h-hit w-full rounded-chart border border-hairline bg-deep px-3 font-data text-base text-hairline outline-none focus:border-flat';

type Props = {
  /** Kept catches available for one-tap draft. */
  keptCatches: readonly CatchRecord[];
};

/**
 * Harvest recording UI.
 * One-tap draft → angler edits → explicit Confirm. Never auto-submits.
 */
export function HarvestPanel({ keptCatches }: Props) {
  const [draft, setDraft] = useState<HarvestDraft | null>(null);
  const [species, setSpecies] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<HarvestRecordRow[]>([]);

  const refresh = async () => {
    const userId = await ensurePersonalUser();
    setRecords(await listHarvestRecords(userId));
  };

  useEffect(() => {
    void refresh();
  }, []);

  const startDraft = (catchRow: CatchRecord) => {
    try {
      const next = draftFromCatchRecord(catchRow);
      setDraft(next);
      setSpecies(next.species);
      setAreaCode(next.areaCode ?? '');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not draft');
    }
  };

  const confirm = () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    void confirmHarvestDraft({
      draft,
      species,
      areaCode: areaCode.trim() || undefined,
    })
      .then(async () => {
        setDraft(null);
        setSpecies('');
        setAreaCode('');
        await refresh();
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'confirm failed');
      })
      .finally(() => setBusy(false));
  };

  const recordedCatchIds = new Set(
    records.map((r) => r.catchId).filter((id): id is string => id != null),
  );

  return (
    <section className="flex flex-col gap-3" aria-label="Harvest record">
      <h2 className="font-ui text-xs uppercase tracking-wide text-hairline/70">
        Harvest record
      </h2>
      <RegulatoryDisclaimer />

      {keptCatches.length > 0 && (
        <ul className="divide-y divide-hairline/30 border border-hairline">
          {keptCatches.map((c) => {
            const already = recordedCatchIds.has(c.id);
            return (
              <li
                key={c.id}
                className="flex min-h-hit items-center justify-between gap-2 px-3 py-2"
              >
                <div className="font-ui text-sm">
                  <p className="font-medium capitalize">{c.species}</p>
                  <p className="font-data text-xs text-hairline/70">
                    kept · {new Date(c.t).toLocaleString()}
                    {already ? ' · recorded' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="min-h-hit min-w-hit rounded-chart border border-hairline px-2 font-ui text-xs disabled:opacity-40"
                  disabled={already || busy}
                  data-testid={`harvest-draft-${c.id}`}
                  onClick={() => startDraft(c)}
                >
                  Draft harvest
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {draft && (
        <div
          className="flex flex-col gap-3 border border-flat bg-shoal/40 p-3"
          data-testid="harvest-confirm-panel"
        >
          <p className="font-ui text-xs uppercase tracking-wide text-hairline/70">
            Confirm harvest entry
          </p>
          <p className="font-ui text-xs text-hairline/70">
            Review every field. Nothing is saved until you confirm.
          </p>
          <Field label="Species">
            <input
              className={controlClass}
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
            />
          </Field>
          <Field label="Area code (optional)">
            <input
              className={controlClass}
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value)}
              placeholder="e.g. 1C"
            />
          </Field>
          {error && (
            <p className="font-ui text-sm text-caution" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="min-h-hit flex-1 rounded-chart border border-hairline bg-flat px-4 font-ui text-base disabled:opacity-50"
              data-testid="harvest-confirm"
              onClick={confirm}
              disabled={busy || !species.trim()}
            >
              Confirm harvest
            </button>
            <button
              type="button"
              className="min-h-hit flex-1 rounded-chart border border-hairline px-4 font-ui text-base"
              onClick={() => {
                setDraft(null);
                setError(null);
              }}
              disabled={busy}
            >
              Discard draft
            </button>
          </div>
        </div>
      )}

      {records.length > 0 && (
        <ul className="border border-hairline" aria-label="Confirmed harvests">
          {records.map((r) => (
            <li key={r.id} className="border-b border-hairline/30 px-3 py-2 last:border-b-0">
              <p className="font-ui text-sm capitalize">{r.species}</p>
              <p className="font-data text-xs text-hairline/70">
                confirmed {new Date(r.confirmedAt).toLocaleString()}
                {r.areaCode ? ` · area ${r.areaCode}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
