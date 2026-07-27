import type { ReactNode } from 'react';
import type { CalculatorInputs, DeliveryType, StwMode } from './types.js';

const DELIVERIES: { id: DeliveryType; label: string }[] = [
  { id: 'DOWNRIGGER', label: 'Downrigger' },
  { id: 'DIVER', label: 'Diver' },
  { id: 'LEADCORE', label: 'Leadcore' },
  { id: 'WIRE', label: 'Wire' },
  { id: 'WEIGHTED', label: 'Weighted' },
  { id: 'FLATLINE', label: 'Flatline' },
];

type Props = {
  inputs: CalculatorInputs;
  onChange: (next: CalculatorInputs) => void;
};

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

const selectClass = controlClass;

export function RigBuilder({ inputs, onChange }: Props) {
  const set = <K extends keyof CalculatorInputs>(
    key: K,
    value: CalculatorInputs[K],
  ) => onChange({ ...inputs, [key]: value });

  return (
    <section className="flex flex-col gap-4" aria-label="Rig builder">
      <div>
        <p className="mb-2 font-ui text-xs uppercase tracking-wide text-hairline/70">
          Delivery
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DELIVERIES.map((d) => {
            const active = inputs.delivery === d.id;
            return (
              <button
                key={d.id}
                type="button"
                className={`min-h-hit rounded-chart border px-2 font-ui text-sm ${
                  active
                    ? 'border-hairline bg-flat text-hairline'
                    : 'border-hairline/40 bg-deep text-hairline'
                }`}
                onClick={() => set('delivery', d.id)}
                aria-pressed={active}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Speed through water source">
          <select
            className={selectClass}
            value={inputs.stwMode}
            onChange={(e) => set('stwMode', e.target.value as StwMode)}
          >
            <option value="paddle_wheel">Paddle wheel / N2K (measured)</option>
            <option value="bare_sog">Bare SOG (no current correction)</option>
          </select>
        </Field>
        <Field label={inputs.stwMode === 'bare_sog' ? 'SOG (kt)' : 'STW (kt)'}>
          <input
            className={controlClass}
            inputMode="decimal"
            value={inputs.speedDisplay}
            onChange={(e) => set('speedDisplay', e.target.value)}
          />
        </Field>
      </div>

      {inputs.delivery === 'DOWNRIGGER' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Cable out (ft)">
            <input
              className={controlClass}
              inputMode="decimal"
              value={inputs.cableOutFt}
              onChange={(e) => set('cableOutFt', e.target.value)}
            />
          </Field>
          <Field label="Ball weight (lb)">
            <input
              className={controlClass}
              inputMode="decimal"
              value={inputs.ballWeightLb}
              onChange={(e) => set('ballWeightLb', e.target.value)}
            />
          </Field>
          <Field label="Ball shape">
            <select
              className={selectClass}
              value={inputs.ballShape}
              onChange={(e) =>
                set(
                  'ballShape',
                  e.target.value as CalculatorInputs['ballShape'],
                )
              }
            >
              <option value="sphere">Sphere</option>
              <option value="pancake">Pancake</option>
              <option value="torpedo">Torpedo</option>
            </select>
          </Field>
          <Field label="Cable diameter (in)">
            <input
              className={controlClass}
              inputMode="decimal"
              value={inputs.cableDiaIn}
              onChange={(e) => set('cableDiaIn', e.target.value)}
            />
          </Field>
          <Field label="Terminal drag (N)">
            <input
              className={controlClass}
              inputMode="decimal"
              value={inputs.terminalDragN}
              onChange={(e) => set('terminalDragN', e.target.value)}
            />
          </Field>
          <Field label="Release drop (ft)">
            <input
              className={controlClass}
              inputMode="decimal"
              value={inputs.releaseDropFt}
              onChange={(e) => set('releaseDropFt', e.target.value)}
            />
          </Field>
          <Field label="Leader length (ft)">
            <input
              className={controlClass}
              inputMode="decimal"
              value={inputs.leaderLengthFt}
              onChange={(e) => set('leaderLengthFt', e.target.value)}
            />
          </Field>
        </div>
      )}

      {inputs.delivery === 'DIVER' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Model">
            <input
              className={controlClass}
              value={inputs.diverModel}
              onChange={(e) => set('diverModel', e.target.value)}
            />
          </Field>
          <Field label="Size">
            <input
              className={controlClass}
              value={inputs.diverSize}
              onChange={(e) => set('diverSize', e.target.value)}
            />
          </Field>
          <Field label="Setting index">
            <input
              className={controlClass}
              inputMode="numeric"
              value={inputs.diverSetting}
              onChange={(e) => set('diverSetting', e.target.value)}
            />
          </Field>
          <Field label="Line out (ft)">
            <input
              className={controlClass}
              inputMode="decimal"
              value={inputs.diverLineOutFt}
              onChange={(e) => set('diverLineOutFt', e.target.value)}
            />
          </Field>
        </div>
      )}

      {inputs.delivery === 'LEADCORE' && (
        <Field label="Colors out">
          <input
            className={controlClass}
            inputMode="decimal"
            value={inputs.colorsOut}
            onChange={(e) => set('colorsOut', e.target.value)}
          />
        </Field>
      )}

      {inputs.delivery === 'WIRE' && (
        <Field label="Wire out (ft)">
          <input
            className={controlClass}
            inputMode="decimal"
            value={inputs.wireOutFt}
            onChange={(e) => set('wireOutFt', e.target.value)}
          />
        </Field>
      )}

      {(inputs.delivery === 'WEIGHTED' || inputs.delivery === 'FLATLINE') && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {inputs.delivery === 'WEIGHTED' && (
            <Field label="Weight (lb)">
              <input
                className={controlClass}
                inputMode="decimal"
                value={inputs.weightLb}
                onChange={(e) => set('weightLb', e.target.value)}
              />
            </Field>
          )}
          <Field label="Line out (ft)">
            <input
              className={controlClass}
              inputMode="decimal"
              value={inputs.lineOutFt}
              onChange={(e) => set('lineOutFt', e.target.value)}
            />
          </Field>
          <Field label="Line diameter (in)">
            <input
              className={controlClass}
              inputMode="decimal"
              value={inputs.lineDiaIn}
              onChange={(e) => set('lineDiaIn', e.target.value)}
            />
          </Field>
          <Field label="Terminal drag (N)">
            <input
              className={controlClass}
              inputMode="decimal"
              value={inputs.terminalDragN}
              onChange={(e) => set('terminalDragN', e.target.value)}
            />
          </Field>
        </div>
      )}
    </section>
  );
}
