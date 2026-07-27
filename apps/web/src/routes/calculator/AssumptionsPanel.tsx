import { formatAngleDeg, formatLength } from '../../format/index.js';
import type { CalculatorResult } from './useCalculator.js';

type Props = {
  result: CalculatorResult;
};

export function AssumptionsPanel({ result }: Props) {
  return (
    <section
      className="border border-hairline bg-deep p-3"
      aria-label="Assumptions and confidence"
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-3">
        <h2 className="font-ui text-xs uppercase tracking-wide text-hairline/70">
          Confidence & assumptions
        </h2>
        <span
          className={`rounded-chart border px-2 py-1 font-ui text-sm ${
            result.confidence === 'measured'
              ? 'border-flat bg-flat/40'
              : 'border-caution text-caution'
          }`}
          data-testid="confidence-badge"
        >
          {result.confidence}
        </span>
        {result.outOfRange && (
          <span className="rounded-chart border border-caution px-2 py-1 font-ui text-sm text-caution">
            out of range
          </span>
        )}
      </div>

      {result.error ? (
        <p className="mb-3 font-ui text-sm text-caution" role="alert">
          {result.error}
        </p>
      ) : (
        <dl className="mb-3 grid grid-cols-2 gap-2 font-data text-sm tabular-nums sm:grid-cols-4">
          <div>
            <dt className="text-hairline/60">Setback</dt>
            <dd>{formatLength(result.setbackM)}</dd>
          </div>
          {result.ballDepthM !== undefined && (
            <div>
              <dt className="text-hairline/60">Ball depth</dt>
              <dd>{formatLength(result.ballDepthM)}</dd>
            </div>
          )}
          {result.blowbackDeg !== undefined && (
            <div>
              <dt className="text-hairline/60">Blowback</dt>
              <dd>{formatAngleDeg((result.blowbackDeg * Math.PI) / 180)}</dd>
            </div>
          )}
          <div>
            <dt className="text-hairline/60">Uncertainty</dt>
            <dd className={result.wide ? 'text-caution' : undefined}>
              ±{formatLength(result.sigmaM)}
              {result.wide ? ' (wide)' : ''}
            </dd>
          </div>
        </dl>
      )}

      <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5 font-ui text-sm text-hairline">
        {result.assumptions.map((a) => (
          <li
            key={a}
            className={
              a.includes('no current correction') ? 'text-caution' : undefined
            }
          >
            {a}
          </li>
        ))}
      </ul>
    </section>
  );
}
