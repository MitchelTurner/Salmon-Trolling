import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveBoatStore } from '../../boat/live-boat-store.js';
import { AssumptionsPanel } from './AssumptionsPanel.js';
import { DepthColumn } from './DepthColumn.js';
import { RigBuilder } from './RigBuilder.js';
import { DEFAULT_INPUTS, type CalculatorInputs } from './types.js';
import { useCalculator } from './useCalculator.js';

export function CalculatorPage() {
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);
  const setActiveRig = useLiveBoatStore((s) => s.setActiveRig);
  const result = useCalculator(inputs);

  useEffect(() => {
    setActiveRig(inputs);
  }, [inputs, setActiveRig]);

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col bg-deep text-hairline">
      <header className="flex min-h-hit items-center justify-between border-b border-hairline px-4">
        <div>
          <h1 className="font-ui text-lg font-semibold tracking-tight">
            Depth calculator
          </h1>
          <p className="font-ui text-xs text-hairline/70">
            Offline · no account · engine runs on this device
          </p>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            to="/recommend"
            className="flex min-h-hit min-w-hit items-center justify-center font-ui text-xs underline"
          >
            Recommend
          </Link>
          <Link
            to="/trip"
            className="flex min-h-hit min-w-hit items-center justify-center font-ui text-xs underline"
          >
            Trip
          </Link>
        </nav>
      </header>

      <div className="flex min-h-0 flex-1">
        <DepthColumn result={result} ballDepthM={result.ballDepthM} />

        <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <RigBuilder inputs={inputs} onChange={setInputs} />
          <AssumptionsPanel result={result} />
          <p className="font-ui text-xs text-hairline/60">
            Depth is a function of speed through water, not speed over ground.
            Values are model output — not for navigation.
          </p>
        </main>
      </div>
    </div>
  );
}
