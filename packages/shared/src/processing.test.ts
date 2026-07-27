import { describe, expect, it } from 'vitest';
import { formatManifestDocument } from './processing.js';

describe('formatManifestDocument', () => {
  it('renders a processor-acceptable plain-text manifest', () => {
    const doc = formatManifestDocument({
      processor: 'Alaska General Seafoods',
      boatName: 'Northern Light',
      createdAt: '2026-07-27T22:00:00.000Z',
      lines: [
        {
          tagCode: 'TROLL-ABC12345',
          species: 'king',
          guestName: 'Alex Guest',
          count: 1,
          massKg: 12.5,
        },
      ],
    });
    expect(doc).toContain('FISH PROCESSING MANIFEST');
    expect(doc).toContain('Alaska General Seafoods');
    expect(doc).toContain('TROLL-ABC12345');
    expect(doc).toContain('Received by (processor)');
  });
});
