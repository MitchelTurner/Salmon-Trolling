import { describe, expect, it } from 'vitest';
import { lightContext } from './light.js';
import { moonPhase } from './moon.js';
import { CIVIL_TWILIGHT_ALT_DEG, solarDay, solarPosition } from './solar.js';

/** Ketchikan harbor. */
const LAT = 55.342;
const LON = -131.646;

describe('solarDay / solarPosition', () => {
  it('computes summer sunrise before sunset for Ketchikan (no network)', () => {
    const day = solarDay(LAT, LON, new Date('2026-07-27T12:00:00.000Z'));

    expect(day.sunrise).not.toBeNull();
    expect(day.sunset).not.toBeNull();
    expect(day.civilDawn).not.toBeNull();
    expect(day.civilDusk).not.toBeNull();

    const rise = Date.parse(day.sunrise!);
    const set = Date.parse(day.sunset!);
    const dawn = Date.parse(day.civilDawn!);
    const dusk = Date.parse(day.civilDusk!);
    const noon = Date.parse(day.solarNoon);

    expect(dawn).toBeLessThan(rise);
    expect(rise).toBeLessThan(noon);
    expect(noon).toBeLessThan(set);
    expect(set).toBeLessThan(dusk);

    // Rough AKDT window for late July in Ketchikan (UTC−8): sunrise ~12–14 UTC.
    expect(new Date(rise).getUTCHours()).toBeGreaterThanOrEqual(11);
    expect(new Date(rise).getUTCHours()).toBeLessThanOrEqual(15);
    expect(new Date(set).getUTCHours()).toBeGreaterThanOrEqual(3);
  });

  it('places the sun above the horizon near solar noon', () => {
    const day = solarDay(LAT, LON, new Date('2026-07-27T12:00:00.000Z'));
    const pos = solarPosition(LAT, LON, new Date(day.solarNoon));
    expect(pos.altitudeDeg).toBeGreaterThan(40);
    expect(pos.altitudeDeg).toBeLessThan(60);
  });

  it('is below civil twilight deep at night in mid-winter', () => {
    const pos = solarPosition(LAT, LON, new Date('2026-12-21T10:00:00.000Z'));
    expect(pos.altitudeDeg).toBeLessThan(CIVIL_TWILIGHT_ALT_DEG);
  });
});

describe('moonPhase', () => {
  it('returns illumination in 0..1 and a named phase', () => {
    const phase = moonPhase(new Date('2026-07-27T00:00:00.000Z'));
    expect(phase.illumination).toBeGreaterThanOrEqual(0);
    expect(phase.illumination).toBeLessThanOrEqual(1);
    expect(phase.ageDays).toBeGreaterThanOrEqual(0);
    expect(phase.ageDays).toBeLessThan(30);
    expect(phase.phase.length).toBeGreaterThan(0);
  });

  it('is near new around a known new moon', () => {
    // 2000-01-06 18:14 UTC was used as the epoch new moon.
    const phase = moonPhase(new Date('2000-01-06T18:14:00.000Z'));
    expect(phase.illumination).toBeLessThan(0.05);
    expect(phase.phase).toBe('new');
  });
});

describe('lightContext', () => {
  it('marks midday as daylight with high lightLevel', () => {
    const day = solarDay(LAT, LON, new Date('2026-07-27T12:00:00.000Z'));
    const ctx = lightContext(LAT, LON, new Date(day.solarNoon));
    expect(ctx.isDaylight).toBe(true);
    expect(ctx.lightLevel).toBeGreaterThan(0.9);
    expect(ctx.moon.illumination).toBeGreaterThanOrEqual(0);
  });

  it('marks civil twilight when the sun is between −6° and 0°', () => {
    const day = solarDay(LAT, LON, new Date('2026-07-27T12:00:00.000Z'));
    // A few minutes after civil dawn should still be twilight or just rising.
    const dawn = Date.parse(day.civilDawn!);
    const ctx = lightContext(LAT, LON, new Date(dawn + 5 * 60_000));
    expect(ctx.sunAltitudeDeg).toBeGreaterThan(CIVIL_TWILIGHT_ALT_DEG - 1);
    expect(ctx.lightLevel).toBeGreaterThan(0);
    expect(ctx.lightLevel).toBeLessThan(1);
  });
});
