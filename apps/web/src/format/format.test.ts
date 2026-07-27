import { describe, expect, it } from 'vitest';
import {
  feetToMeters,
  formatLength,
  formatMass,
  formatSpeed,
  metersToFeet,
  parseLengthInput,
  parseMassInput,
  parseSpeedInput,
  soundingParts,
} from './index.js';

describe('format', () => {
  it('converts length at the international foot', () => {
    expect(metersToFeet(0.3048)).toBeCloseTo(1, 9);
    expect(feetToMeters(100)).toBeCloseTo(30.48, 9);
    expect(formatLength(30.48)).toBe('100.0 ft');
  });

  it('converts speed at the international knot', () => {
    expect(formatSpeed(1852 / 3600)).toBe('1.0 kt');
    expect(parseSpeedInput('2.5')).toBeCloseTo(2.5 * (1852 / 3600), 9);
  });

  it('parses length inputs in display units', () => {
    expect(parseLengthInput('100')).toBeCloseTo(30.48, 9);
    expect(parseLengthInput('10', { length: 'm', speed: 'kt', mass: 'lb' })).toBe(
      10,
    );
  });

  it('converts mass at the avoirdupois pound', () => {
    expect(parseMassInput('1')).toBeCloseTo(0.45359237, 9);
    expect(formatMass(0.45359237)).toBe('1.0 lb');
  });

  it('splits soundings into integer and tenths', () => {
    const parts = soundingParts(25.6032); // ~84 ft
    expect(parts.unit).toBe('ft');
    expect(parts.int).toBe('84');
  });
});
