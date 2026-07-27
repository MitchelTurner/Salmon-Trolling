import { describe, expect, it } from 'vitest';
import { NOT_FOR_NAVIGATION_LABEL } from './bathy.js';

describe('bathy constants', () => {
  it('requires the not-for-navigation label', () => {
    expect(NOT_FOR_NAVIGATION_LABEL).toBe('not for navigation');
  });
});
