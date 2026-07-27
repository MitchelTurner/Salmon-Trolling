import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index.js';

describe('@troll/api', () => {
  it('exports package name', () => {
    expect(PACKAGE_NAME).toBe('@troll/api');
  });
});
