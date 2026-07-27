import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index.js';

describe('@troll/units', () => {
  it('is scaffolded', () => {
    expect(PACKAGE_NAME).toBe('@troll/units');
  });
});
