import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fitBallCd, type CalibrationSample } from './fit.js';

const here = dirname(fileURLToPath(import.meta.url));
const goldenPath = join(
  here,
  '../../test/golden/field/ketchikan-first-session.json',
);

describe('field golden — first probe session', () => {
  it('fits within expected Cd/RMSE band from the field golden', () => {
    const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as {
      meta: { boatId: string; rigId: string };
      samples: CalibrationSample[];
      expectedFit: {
        scope: 'RIG';
        ballCdMin: number;
        ballCdMax: number;
        rmseMaxM: number;
        sampleN: number;
      };
    };

    const fit = fitBallCd(golden.samples, {
      scope: 'RIG',
      boatId: golden.meta.boatId,
      rigId: golden.meta.rigId,
      segments: 80,
    });

    expect(fit.sampleN).toBe(golden.expectedFit.sampleN);
    expect(fit.params.ballCd).toBeGreaterThanOrEqual(
      golden.expectedFit.ballCdMin,
    );
    expect(fit.params.ballCd).toBeLessThanOrEqual(golden.expectedFit.ballCdMax);
    expect(fit.rmseM).toBeLessThanOrEqual(golden.expectedFit.rmseMaxM);
  });
});
