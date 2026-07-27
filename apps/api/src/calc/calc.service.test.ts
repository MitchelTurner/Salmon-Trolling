import { describe, expect, it } from 'vitest';
import { CalcService } from './calc.service.js';

describe('CalcService', () => {
  it('increments aggregate counts without retaining inputs', () => {
    const service = new CalcService();
    service.depth({
      stw: { speedThroughWaterMs: 1.3 },
      rig: {
        delivery: 'leadcore',
        colorsOut: 5,
      },
    });
    service.spread({
      stw: { speedThroughWaterMs: 1.3 },
      omegaRadPerS: 0,
      rigs: [
        {
          id: 'a',
          lateralOffsetM: 0,
          rig: { delivery: 'leadcore', colorsOut: 4 },
        },
      ],
    });

    expect(service.counts()).toEqual({ depth: 1, spread: 1 });
  });

  it('attaches generatedAt to every response', () => {
    const service = new CalcService();
    const result = service.depth({
      stw: { speedThroughWaterMs: 1.3 },
      rig: { delivery: 'leadcore', colorsOut: 3 },
    });
    expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.ok).toBe(true);
  });
});
