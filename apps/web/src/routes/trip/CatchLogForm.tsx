import { useEffect, useId, useState, type ReactNode } from 'react';
import { useLiveBoatStore } from '../../boat/live-boat-store.js';
import {
  blobFromFileList,
  correctCatch,
  listActiveCatches,
  logCatch,
  snapshotAtCatch,
} from '../../catches/index.js';
import type { CatchRecord } from '../../db/types.js';
import {
  formatLength,
  formatMass,
  lengthInputValue,
  massInputValue,
  parseLengthInput,
  parseMassInput,
} from '../../format/index.js';
import { ensurePersonalOrg } from '../../trips/session.js';

const SPECIES = ['coho', 'chinook', 'pink', 'chum', 'sockeye', 'other'] as const;

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
  'min-h-hit w-full rounded-chart border border-hairline bg-deep px-3 font-data text-base tabular-nums text-hairline outline-none focus:border-flat';

type Props = {
  tripId: string;
  onLogged?: (catchRow: CatchRecord) => void;
};

export function CatchLogForm({ tripId, onLogged }: Props) {
  const formId = useId();
  const position = useLiveBoatStore((s) => s.position);
  const activeRig = useLiveBoatStore((s) => s.activeRig);

  const [species, setSpecies] = useState<string>('coho');
  const [lengthFt, setLengthFt] = useState('');
  const [massLb, setMassLb] = useState('');
  const [kept, setKept] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<CatchRecord | null>(null);
  const [catches, setCatches] = useState<CatchRecord[]>([]);

  const refresh = async () => {
    setCatches(await listActiveCatches(tripId));
  };

  useEffect(() => {
    void listActiveCatches(tripId).then(setCatches);
  }, [tripId]);

  const submit = () => {
    if (!position) {
      setError('Need a GPS fix to log a catch.');
      return;
    }
    setBusy(true);
    setError(null);

    void (async () => {
      const orgId = await ensurePersonalOrg();
      const { rigSnapshot, depthSnapshot } = snapshotAtCatch({
        rigInputs: activeRig,
        position,
      });
      const photos = photo ? [photo] : [];

      const payload = {
        orgId,
        species,
        kept,
        lengthM: lengthFt ? parseLengthInput(lengthFt) : undefined,
        massKg: massLb ? parseMassInput(massLb) : undefined,
        rigSnapshot,
        depthSnapshot,
        photos,
        geom: {
          type: 'Point' as const,
          coordinates: [position.lon, position.lat] as [number, number],
        },
      };

      const row = correcting
        ? await correctCatch({
            ...payload,
            supersedesId: correcting.id,
          })
        : await logCatch({
            ...payload,
            tripId,
          });

      setPhoto(null);
      setLengthFt('');
      setMassLb('');
      setCorrecting(null);
      setKept(false);
      await refresh();
      onLogged?.(row);
    })()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'could not log catch');
      })
      .finally(() => setBusy(false));
  };

  return (
    <section className="flex flex-col gap-3" aria-label="Catch log">
      <h2 className="font-ui text-xs uppercase tracking-wide text-hairline/70">
        {correcting ? 'Correct catch' : 'Log catch'}
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Species">
          <select
            id={`${formId}-species`}
            className={controlClass}
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
          >
            {SPECIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Length (ft)">
          <input
            className={controlClass}
            inputMode="decimal"
            value={lengthFt}
            onChange={(e) => setLengthFt(e.target.value)}
          />
        </Field>
        <Field label="Mass (lb)">
          <input
            className={controlClass}
            inputMode="decimal"
            value={massLb}
            onChange={(e) => setMassLb(e.target.value)}
          />
        </Field>
        <Field label="Disposition">
          <select
            className={controlClass}
            value={kept ? 'kept' : 'released'}
            onChange={(e) => setKept(e.target.value === 'kept')}
          >
            <option value="released">Released</option>
            <option value="kept">Kept</option>
          </select>
        </Field>
      </div>

      <Field label="Photo">
        <input
          className="min-h-hit w-full font-ui text-sm"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            void blobFromFileList(e.target.files).then(setPhoto);
          }}
        />
        {photo && (
          <span className="font-ui text-xs text-hairline/70">
            Photo ready ({Math.round(photo.size / 1024)} KB)
          </span>
        )}
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
          onClick={submit}
          disabled={busy}
        >
          {correcting ? 'Save correction' : 'Log catch'}
        </button>
        {correcting && (
          <button
            type="button"
            className="min-h-hit flex-1 rounded-chart border border-hairline px-4 font-ui text-base"
            onClick={() => setCorrecting(null)}
            disabled={busy}
          >
            Cancel correction
          </button>
        )}
      </div>

      <ul className="divide-y divide-hairline/30 border border-hairline">
        {catches.length === 0 ? (
          <li className="p-3 font-ui text-sm text-hairline/70">
            No catches yet — log the one you just landed.
          </li>
        ) : (
          catches.map((c) => (
            <li
              key={c.id}
              className="flex min-h-hit items-center justify-between gap-2 px-3 py-2"
            >
              <div className="font-ui text-sm">
                <p className="font-medium capitalize">{c.species}</p>
                <p className="font-data text-xs text-hairline/70">
                  {c.massKg != null ? formatMass(c.massKg) : '—'}
                  {' · '}
                  {c.lengthM != null ? formatLength(c.lengthM) : '—'}
                  {' · '}
                  {c.kept ? 'kept' : 'released'}
                  {c.photoKeys.length > 0
                    ? ` · ${c.photoKeys.length} photo`
                    : ''}
                  {c.supersedesId ? ' · correction' : ''}
                </p>
              </div>
              <button
                type="button"
                className="min-h-hit min-w-hit rounded-chart border border-hairline px-2 font-ui text-xs"
                onClick={() => {
                  setCorrecting(c);
                  setSpecies(c.species);
                  setKept(c.kept);
                  setLengthFt(
                    c.lengthM != null ? lengthInputValue(c.lengthM) : '',
                  );
                  setMassLb(c.massKg != null ? massInputValue(c.massKg) : '');
                }}
              >
                Correct
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
