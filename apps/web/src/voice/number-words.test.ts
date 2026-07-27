import { describe, expect, it } from 'vitest';
import { consumeNumberWords, parseNumberWords } from './number-words.js';

describe('parseNumberWords', () => {
  it('parses simple and compound words', () => {
    expect(parseNumberWords(['twelve'])).toBe(12);
    expect(parseNumberWords(['forty', 'five'])).toBe(45);
    expect(parseNumberWords(['forty-five'])).toBe(45);
    expect(parseNumberWords(['45'])).toBe(45);
  });

  it('consumes a prefix from a token stream', () => {
    const tokens = ['forty', 'five', 'feet', 'green'];
    const got = consumeNumberWords(tokens, 0);
    expect(got).toEqual({ value: 45, end: 2 });
  });
});
