import { describe, expect, it } from 'vitest';
import { parseCatchUtterance } from './parse-catch-utterance.js';

describe('parseCatchUtterance', () => {
  it('parses the canonical example', () => {
    const draft = parseCatchUtterance(
      'coho, twelve pounds, forty-five feet, green flasher',
    );
    expect(draft.species).toBe('coho');
    expect(draft.massLb).toBe(12);
    expect(draft.lengthFt).toBe(45);
    expect(draft.notes).toBe('green flasher');
    expect(draft.confidence).toBe('high');
  });

  it('maps king to chinook and kept disposition', () => {
    const draft = parseCatchUtterance('king twenty pounds kept');
    expect(draft.species).toBe('chinook');
    expect(draft.massLb).toBe(20);
    expect(draft.kept).toBe(true);
  });

  it('accepts digit forms', () => {
    const draft = parseCatchUtterance('pink 8 lb 22 ft');
    expect(draft.species).toBe('pink');
    expect(draft.massLb).toBe(8);
    expect(draft.lengthFt).toBe(22);
  });

  it('returns empty confidence for blank input', () => {
    expect(parseCatchUtterance('').confidence).toBe('empty');
  });
});
