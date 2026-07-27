import { formatLength, soundingParts } from '../../format/index.js';
import type { CalculatorResult } from './useCalculator.js';

type Props = {
  result: CalculatorResult;
  /** Optional second marker (e.g. ball depth on a downrigger). */
  ballDepthM?: number;
};

/**
 * Signature element: chart-style sounding column with live lure position.
 */
export function DepthColumn({ result, ballDepthM }: Props) {
  const depthFt = result.depthM / 0.3048;
  const sigmaFt = result.sigmaM / 0.3048;
  const maxFt = Math.max(40, Math.ceil((depthFt + sigmaFt) / 20) * 20 + 20);
  const lurePct = Math.min(100, (depthFt / maxFt) * 100);
  const ballPct =
    ballDepthM !== undefined
      ? Math.min(100, (ballDepthM / 0.3048 / maxFt) * 100)
      : null;
  const sounding = soundingParts(result.depthM);
  const ticks = Array.from({ length: maxFt / 10 + 1 }, (_, i) => i * 10);

  return (
    <aside
      className="relative flex h-full min-h-[320px] w-[7.5rem] shrink-0 flex-col border-r border-hairline bg-shoal/40"
      aria-label="Depth column"
    >
      <div className="border-b border-hairline px-2 py-2">
        <p className="font-ui text-[10px] uppercase tracking-wide text-hairline/70">
          Lure depth
        </p>
        <p className="font-data sounding-int text-4xl font-semibold leading-none text-hairline">
          {sounding.int}
          <span className="sounding-tenths">{sounding.tenths}</span>
          <span className="ml-1 text-sm font-medium">{sounding.unit}</span>
        </p>
        {result.wide ? (
          <p className="mt-1 font-data text-xs text-caution">
            ±{sigmaFt.toFixed(0)} ft band
          </p>
        ) : (
          <p className="mt-1 font-data text-xs text-hairline/70">
            σ {formatLength(result.sigmaM)}
          </p>
        )}
      </div>

      <div className="relative flex-1">
        <div className="absolute inset-0 bg-shoal/30" />

        {ticks.map((ft) => {
          const top = (ft / maxFt) * 100;
          return (
            <div
              key={ft}
              className="absolute left-0 right-0 border-t border-hairline/30"
              style={{ top: `${top}%` }}
            >
              <span className="absolute left-1 top-0 font-data text-[10px] tabular-nums text-hairline/80">
                {ft}
              </span>
            </div>
          );
        })}

        {ballPct !== null && (
          <div
            className="absolute left-8 right-2 z-10 transition-[top] duration-200 ease-out"
            style={{ top: `calc(${ballPct}% - 4px)` }}
          >
            <div className="h-0.5 bg-hairline/50" />
            <span className="font-ui text-[9px] text-hairline/60">ball</span>
          </div>
        )}

        <div
          className="absolute left-6 right-1 z-20 flex items-center transition-[top] duration-200 ease-out"
          style={{ top: `calc(${lurePct}% - 10px)` }}
          data-testid="lure-marker"
        >
          <div className="h-0.5 flex-1 bg-flat" />
          <div className="flex h-5 min-w-hit items-center justify-center rounded-chart border border-hairline bg-deep px-1 font-data text-xs font-semibold tabular-nums">
            {sounding.int}
            <span className="sounding-tenths text-[0.65em]">{sounding.tenths}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
