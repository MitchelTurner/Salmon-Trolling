/** Spoken number words → integer. Covers fishing-relevant sizes (length/mass). */

const ONES: Record<string, number> = {
  zero: 0,
  oh: 0,
  a: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fourty: 40, // common mis-speak / ASR
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

/**
 * Parse a run of number words / digits into a number.
 * Examples: "twelve", "forty five", "45", "one hundred".
 */
export function parseNumberWords(tokens: readonly string[]): number | null {
  if (tokens.length === 0) return null;

  // Pure digits / decimals
  if (tokens.length === 1) {
    const only = tokens[0];
    if (only === undefined) return null;
    if (/^\d+(\.\d+)?$/.test(only)) return Number(only);
  }

  let total = 0;
  let current = 0;
  let saw = false;

  for (const raw of tokens) {
    const w = raw.toLowerCase().replace(/-/g, ' ');
    // hyphenated forty-five may arrive as one token
    if (w.includes(' ')) {
      const nested = parseNumberWords(w.split(/\s+/).filter(Boolean));
      if (nested === null) return null;
      current += nested;
      saw = true;
      continue;
    }

    if (/^\d+(\.\d+)?$/.test(w)) {
      current += Number(w);
      saw = true;
      continue;
    }
    if (w === 'hundred') {
      current = (current === 0 ? 1 : current) * 100;
      saw = true;
      continue;
    }
    if (w in ONES) {
      current += ONES[w]!;
      saw = true;
      continue;
    }
    if (w in TENS) {
      current += TENS[w]!;
      saw = true;
      continue;
    }
    if (w === 'and') continue;
    return null;
  }

  if (!saw) return null;
  return total + current;
}

/** Consume a maximal number-word prefix from `tokens` starting at `start`. */
export function consumeNumberWords(
  tokens: readonly string[],
  start: number,
): { value: number; end: number } | null {
  let end = start;
  while (end < tokens.length) {
    const slice = tokens.slice(start, end + 1);
    if (parseNumberWords(slice) === null) break;
    end += 1;
  }
  if (end === start) return null;
  const value = parseNumberWords(tokens.slice(start, end));
  if (value === null) return null;
  return { value, end };
}
