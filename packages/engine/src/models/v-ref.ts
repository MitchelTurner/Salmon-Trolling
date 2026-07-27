/**
 * Reference trolling speed used to nondimensionalize diver and leadcore curves.
 * Conventionally 2.0 kt (manufacturer dive-chart speed).
 */
import { knots, knotsToMetersPerSecond, type MetersPerSecond } from '@troll/units';

/** 2.0 kt in m/s. MANUFACTURER chart convention. */
export const V_REF: MetersPerSecond = knotsToMetersPerSecond(knots(2));
