import { useState } from 'react';
import { AssumptionsPanel } from './AssumptionsPanel.js';
import { DepthColumn } from './DepthColumn.js';
import { RigBuilder } from './RigBuilder.js';
import { DEFAULT_INPUTS, type CalculatorInputs } from './types.js';
import { useCalculator } from './useCalculator.js';

export function CalculatorPage() {
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);
  const result = useCalculator(inputs);

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
        <p className="hidden font-ui text-xs text-hairline/60 sm:block">
          Installable PWA
        </p>
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
