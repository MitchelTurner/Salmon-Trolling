import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index.js';

describe('@troll/web', () => {
  it('is scaffolded', () => {
    expect(PACKAGE_NAME).toBe('@troll/web');
  });
});
