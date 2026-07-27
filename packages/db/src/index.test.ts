import { describe, expect, it } from 'vitest';
import { Delivery, GearKind, OrgKind, Role } from './index.js';

describe('@troll/db', () => {
  it('re-exports schema enums used by the seed', () => {
    expect(OrgKind.PERSONAL).toBe('PERSONAL');
    expect(Role.OWNER).toBe('OWNER');
    expect(Delivery.DOWNRIGGER).toBe('DOWNRIGGER');
    expect(GearKind.FLASHER).toBe('FLASHER');
  });
});
