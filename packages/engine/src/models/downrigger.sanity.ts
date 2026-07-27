/**
 * Shared sanity-anchor inputs from docs/02-depth-engine.md:
 * 10 lb lead sphere, 100 ft of 0.045" stainless, 2.5 kt STW, ≈10 N terminal drag.
 */
import {
  feet,
  feetToMeters,
  knots,
  knotsToMetersPerSecond,
  pounds,
  poundsToKilograms,
  meters,
  newtons,
} from '@troll/units';
import { RHO_STEEL } from '../constants.js';
import { kgPerM, type SolveDownriggerInput } from './downrigger.js';

const INCH_TO_METERS = 0.0254;

export function sanityAnchorInput(
  segments = 200,
): SolveDownriggerInput {
  const diameter = meters(0.045 * INCH_TO_METERS);
  // Solid round stainless of the stated diameter (fill-factor 1).
  const linearMass = kgPerM(
    Math.PI * (diameter / 2) ** 2 * RHO_STEEL,
  );

  return {
    cableOut: feetToMeters(feet(100)),
    stw: knotsToMetersPerSecond(knots(2.5)),
    ball: {
      mass: poundsToKilograms(pounds(10)),
      shape: 'sphere',
    },
    cable: { diameter, linearMass },
    terminalDrag: newtons(10),
    segments,
  };
}
