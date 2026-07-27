import type { Reason, RuleContext } from '@troll/engine';
import { RULES_SCORE_CAP } from '@troll/engine';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FeedbackControls } from '../../recommendations/FeedbackControls.js';
import { issueRecommendation } from '../../recommendations/store.js';
import type { RecommendationRecord } from '../../recommendations/types.js';

function isoWeek(d: Date): number {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

const DEFAULT_CTX: RuleContext = {
  lightLevel: 0.2,
  turbidity: 0.3,
  weekOfYear: isoWeek(new Date()),
  species: 'king',
};

function formatM(n: number): string {
  return n.toFixed(1);
}

export function RecommendPage() {
  const [lightLevel, setLightLevel] = useState(DEFAULT_CTX.lightLevel);
  const [turbidity, setTurbidity] = useState(DEFAULT_CTX.turbidity);
  const [record, setRecord] = useState<RecommendationRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ctx = useMemo<RuleContext>(
    () => ({
      ...DEFAULT_CTX,
      lightLevel,
      turbidity,
    }),
    [lightLevel, turbidity],
  );

  const issue = () => {
    setBusy(true);
    setError(null);
    void issueRecommendation(ctx)
      .then(setRecord)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'issue failed');
      })
      .finally(() => setBusy(false));
  };

  const rec = record?.payload;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-deep text-hairline">
      <header className="flex min-h-hit items-center justify-between border-b border-hairline px-4">
        <div>
          <h1 className="font-ui text-lg font-semibold tracking-tight">
            Recommendation
          </h1>
          <p className="font-ui text-xs text-hairline/70">
            Rules basis · score capped at {RULES_SCORE_CAP}
          </p>
        </div>
        <Link
          to="/calculator"
          className="flex min-h-hit min-w-hit items-center justify-center font-ui text-xs underline"
        >
          Calculator
        </Link>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4">
        <section className="flex flex-col gap-3" aria-label="Context">
          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs text-hairline/80">
              Light level (0–1)
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={lightLevel}
              onChange={(e) => setLightLevel(Number(e.target.value))}
              className="min-h-hit"
            />
            <span className="font-data text-sm">{lightLevel.toFixed(2)}</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs text-hairline/80">
              Turbidity (0–1)
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={turbidity}
              onChange={(e) => setTurbidity(Number(e.target.value))}
              className="min-h-hit"
            />
            <span className="font-data text-sm">{turbidity.toFixed(2)}</span>
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={issue}
            className="flex min-h-hit items-center justify-center rounded-chart border border-hairline bg-flat px-4 font-ui text-sm text-hairline disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Get recommendation'}
          </button>
        </section>

        {error && (
          <p className="font-ui text-sm text-caution" role="alert">
            {error}
          </p>
        )}

        {rec && record && (
          <section className="flex flex-col gap-3" aria-label="Result">
            <div className="border border-hairline p-3">
              <p className="font-ui text-xs uppercase tracking-wide text-hairline/70">
                Presentation
              </p>
              <p className="font-data text-base">
                Depth {formatM(rec.depthBand.min)}–{formatM(rec.depthBand.max)} m
              </p>
              <p className="font-data text-base">
                Speed {formatM(rec.speedBand.min)}–{formatM(rec.speedBand.max)}{' '}
                m/s
              </p>
              <p className="font-ui text-sm">
                Lure: {rec.lure.finishes.join(', ')}
              </p>
              <p className="font-ui text-sm text-hairline/80">
                Score {rec.score.toFixed(2)} · {rec.basis}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="font-ui text-xs uppercase tracking-wide text-hairline/70">
                Reasons
              </h2>
              <ul className="flex flex-col gap-2">
                {rec.reasons.map((r: Reason, i: number) => (
                  <li
                    key={`${r.factor}-${i}`}
                    className="border-l-2 border-hairline pl-3"
                  >
                    <p className="font-ui text-sm font-medium">{r.effect}</p>
                    <p className="font-ui text-xs text-hairline/70">
                      {r.factor}: {r.observation}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <FeedbackControls recommendationId={record.id} />
          </section>
        )}
      </main>
    </div>
  );
}
