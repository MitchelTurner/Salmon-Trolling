import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index.js';

describe('@troll/api', () => {
  it('is scaffolded', () => {
    expect(PACKAGE_NAME).toBe('@troll/api');
  });
});
