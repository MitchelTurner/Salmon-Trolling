import { consumeNumberWords } from './number-words.js';

export type CatchDraft = {
  /** Raw transcript that produced this draft. */
  readonly transcript: string;
  readonly species?: string;
  /** Mass in pounds (display unit). */
  readonly massLb?: number;
  /** Length in feet (display unit). */
  readonly lengthFt?: number;
  readonly kept?: boolean;
  /** Leftover phrase, e.g. "green flasher". */
  readonly notes?: string;
  readonly confidence: 'high' | 'partial' | 'empty';
  readonly unmatched: readonly string[];
};

const SPECIES_ALIASES: Record<string, string> = {
  coho: 'coho',
  silver: 'coho',
  silvers: 'coho',
  chinook: 'chinook',
  king: 'chinook',
  kings: 'chinook',
  spring: 'chinook',
  pink: 'pink',
  humpy: 'pink',
  humpies: 'pink',
  chum: 'chum',
  dog: 'chum',
  dogs: 'chum',
  sockeye: 'sockeye',
  red: 'sockeye',
  reds: 'sockeye',
};

const MASS_UNITS = new Set(['pound', 'pounds', 'lb', 'lbs']);
const LENGTH_UNITS = new Set(['foot', 'feet', 'ft']);

function normalize(transcript: string): string[] {
  return transcript
    .toLowerCase()
    .replace(/[^\w\s.-]/g, ' ')
    .replace(/,/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Parse a spoken catch log into a draft.
 * Example: "coho, twelve pounds, forty-five feet, green flasher"
 *
 * Never submits — callers must confirm before writing a Catch.
 */
export function parseCatchUtterance(transcript: string): CatchDraft {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return {
      transcript: trimmed,
      confidence: 'empty',
      unmatched: [],
    };
  }

  const tokens = normalize(trimmed);
  const used = new Array<boolean>(tokens.length).fill(false);

  let species: string | undefined;
  let massLb: number | undefined;
  let lengthFt: number | undefined;
  let kept: boolean | undefined;

  // Species (first matching alias token)
  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];
    if (tok === undefined) continue;
    const mapped = SPECIES_ALIASES[tok];
    if (mapped) {
      species = mapped;
      used[i] = true;
      break;
    }
  }

  // Disposition
  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];
    if (tok === undefined || used[i]) continue;
    if (tok === 'kept' || tok === 'keep') {
      kept = true;
      used[i] = true;
    } else if (tok === 'released' || tok === 'release') {
      kept = false;
      used[i] = true;
    }
  }

  // Number + unit pairs (mass / length)
  for (let i = 0; i < tokens.length; i += 1) {
    if (used[i]) continue;
    const num = consumeNumberWords(tokens, i);
    if (!num) continue;
    const unit = tokens[num.end];
    if (unit === undefined) continue;

    if (MASS_UNITS.has(unit) && massLb === undefined) {
      massLb = num.value;
      for (let j = i; j <= num.end; j += 1) used[j] = true;
      i = num.end;
      continue;
    }
    if (LENGTH_UNITS.has(unit) && lengthFt === undefined) {
      lengthFt = num.value;
      for (let j = i; j <= num.end; j += 1) used[j] = true;
      i = num.end;
    }
  }

  const leftover = tokens.filter((_, i) => !used[i]);
  const notes = leftover.length > 0 ? leftover.join(' ') : undefined;

  const fields = [species, massLb, lengthFt].filter((v) => v !== undefined);
  let confidence: CatchDraft['confidence'];
  if (fields.length >= 2) confidence = 'high';
  else if (fields.length === 1 || notes) confidence = 'partial';
  else confidence = 'empty';

  return {
    transcript: trimmed,
    species,
    massLb,
    lengthFt,
    kept,
    notes,
    confidence,
    unmatched: leftover,
  };
}
