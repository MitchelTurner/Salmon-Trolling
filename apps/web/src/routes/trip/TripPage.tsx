import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveBoatStore } from '../../boat/live-boat-store.js';
import { listActiveCatches } from '../../catches/index.js';
import type { CatchRecord } from '../../db/types.js';
import { formatSpeed } from '../../format/index.js';
import {
  closeTripRecording,
  startTripRecording,
} from '../../trips/session.js';
import { CatchLogForm } from './CatchLogForm.js';
import { HarvestPanel } from './HarvestPanel.js';

export function TripPage() {
  const trip = useLiveBoatStore((s) => s.trip);
  const position = useLiveBoatStore((s) => s.position);
  const status = useLiveBoatStore((s) => s.recorderStatus);
  const error = useLiveBoatStore((s) => s.recorderError);
  const setRecorderStatus = useLiveBoatStore((s) => s.setRecorderStatus);
  const [busy, setBusy] = useState(false);
  const [closeSummary, setCloseSummary] = useState<string | null>(null);
  const [keptCatches, setKeptCatches] = useState<CatchRecord[]>([]);

  const refreshKept = async () => {
    if (!trip?.id) {
      setKeptCatches([]);
      return;
    }
    const active = await listActiveCatches(trip.id);
    setKeptCatches(active.filter((c) => c.kept));
  };

  useEffect(() => {
    void refreshKept();
  }, [trip?.id]);

  const recording = status === 'recording' || status === 'closing';
  const openTrip = trip && !trip.closedAt;

  const onStart = () => {
    setCloseSummary(null);
    setBusy(true);
    void startTripRecording()
      .catch((err: unknown) => {
        setRecorderStatus(
          'error',
          err instanceof Error ? err.message : 'could not start trip',
        );
      })
      .finally(() => setBusy(false));
  };

  const onClose = () => {
    setBusy(true);
    void closeTripRecording()
      .then((result) => {
        setCloseSummary(
          `Trip closed — kept ${result.pointsAfter} of ${result.pointsBefore} points after simplify.`,
        );
      })
      .catch((err: unknown) => {
        setRecorderStatus(
          'error',
          err instanceof Error ? err.message : 'could not close trip',
        );
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-deep text-hairline">
      <header className="flex min-h-hit items-center justify-between border-b border-hairline px-4">
        <div>
          <h1 className="font-ui text-lg font-semibold">Trip</h1>
          <p className="font-ui text-xs text-hairline/70">
            Offline recording · screen-off flush enabled
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/dock"
            className="flex min-h-hit min-w-hit items-center justify-center font-ui text-sm underline"
          >
            Dock
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
          className="border border-hairline p-3"
          aria-label="Live position"
        >
          <p className="font-ui text-xs uppercase tracking-wide text-hairline/70">
            Live fix
          </p>
          {position ? (
            <dl className="mt-2 grid grid-cols-2 gap-2 font-data text-sm tabular-nums">
              <div>
                <dt className="text-hairline/60">Lat</dt>
                <dd>{position.lat.toFixed(5)}</dd>
              </div>
              <div>
                <dt className="text-hairline/60">Lon</dt>
                <dd>{position.lon.toFixed(5)}</dd>
              </div>
              <div>
                <dt className="text-hairline/60">SOG</dt>
                <dd>
                  {position.sogMs != null ? formatSpeed(position.sogMs) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-hairline/60">Status</dt>
                <dd className={recording ? 'text-flat' : undefined}>{status}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 font-ui text-sm text-hairline/70">
              {openTrip
                ? 'Waiting for GPS fix…'
                : 'Start a trip to begin the position ring buffer.'}
            </p>
          )}
        </section>

        {openTrip && (
          <p className="font-data text-xs text-hairline/70">
            Trip {trip.id.slice(0, 10)}… · started{' '}
            {new Date(trip.startedAt).toLocaleString()}
          </p>
        )}

        {error && (
          <p className="font-ui text-sm text-caution" role="alert">
            {error}
          </p>
        )}

        {closeSummary && (
          <p className="font-ui text-sm text-hairline/80">{closeSummary}</p>
        )}

        {openTrip && (
          <>
            <CatchLogForm
              tripId={trip.id}
              onLogged={() => {
                void refreshKept();
              }}
            />
            <HarvestPanel keptCatches={keptCatches} />
          </>
        )}

        <div className="mt-auto flex flex-col gap-2">
          {!openTrip ? (
            <button
              type="button"
              className="min-h-hit w-full rounded-chart border border-hairline bg-flat px-4 font-ui text-base text-hairline disabled:opacity-50"
              onClick={onStart}
              disabled={busy || status === 'closing'}
            >
              Start trip
            </button>
          ) : (
            <button
              type="button"
              className="min-h-hit w-full rounded-chart border border-caution bg-deep px-4 font-ui text-base text-caution disabled:opacity-50"
              onClick={onClose}
              disabled={busy || status === 'closing'}
            >
              Close trip
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
