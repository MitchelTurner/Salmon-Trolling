export type DeliveryType =
  | 'DOWNRIGGER'
  | 'DIVER'
  | 'LEADCORE'
  | 'WIRE'
  | 'WEIGHTED'
  | 'FLATLINE';

export type StwMode = 'paddle_wheel' | 'bare_sog';

export type CalculatorInputs = {
  delivery: DeliveryType;
  stwMode: StwMode;
  /** Display-unit speed string; converted at the format boundary. */
  speedDisplay: string;
  // Downrigger
  cableOutFt: string;
  ballWeightLb: string;
  ballShape: 'sphere' | 'pancake' | 'torpedo';
  cableDiaIn: string;
  terminalDragN: string;
  releaseDropFt: string;
  leaderLengthFt: string;
  // Diver
  diverModel: string;
  diverSize: string;
  diverSetting: string;
  diverLineOutFt: string;
  // Leadcore / wire
  colorsOut: string;
  wireOutFt: string;
  // Weighted / flatline
  weightLb: string;
  lineOutFt: string;
  lineDiaIn: string;
};

export const DEFAULT_INPUTS: CalculatorInputs = {
  delivery: 'DOWNRIGGER',
  stwMode: 'bare_sog',
  speedDisplay: '2.5',
  cableOutFt: '100',
  ballWeightLb: '10',
  ballShape: 'sphere',
  cableDiaIn: '0.045',
  terminalDragN: '10',
  releaseDropFt: '4',
  leaderLengthFt: '5',
  diverModel: 'Deep Six',
  diverSize: 'medium',
  diverSetting: '2',
  diverLineOutFt: '150',
  colorsOut: '5',
  wireOutFt: '150',
  weightLb: '2',
  lineOutFt: '100',
  lineDiaIn: '0.018',
};
