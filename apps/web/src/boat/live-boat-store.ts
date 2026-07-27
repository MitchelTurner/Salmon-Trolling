import { create } from 'zustand';
import { defaultRigInputs } from '../catches/snapshots.js';
import type { TripRecord } from '../db/types.js';
import type { CalculatorInputs } from '../routes/calculator/types.js';
import type { PositionSample, TripRecorderStatus } from '../trips/types.js';

export type LiveBoatState = {
  position: PositionSample | null;
  trip: TripRecord | null;
  /** Active rig config — frozen into catch.rigSnapshot at log time. */
  activeRig: CalculatorInputs;
  recorderStatus: TripRecorderStatus;
  recorderError?: string;
  setLiveSample: (sample: PositionSample | null) => void;
  setTrip: (trip: TripRecord | null) => void;
  setActiveRig: (rig: CalculatorInputs) => void;
  setRecorderStatus: (status: TripRecorderStatus, detail?: string) => void;
};

/** Zustand store for live boat state (position, heading, active trip). */
export const useLiveBoatStore = create<LiveBoatState>((set) => ({
  position: null,
  trip: null,
  activeRig: defaultRigInputs(),
  recorderStatus: 'idle',
  setLiveSample: (position) => set({ position }),
  setTrip: (trip) => set({ trip }),
  setActiveRig: (activeRig) => set({ activeRig }),
  setRecorderStatus: (recorderStatus, recorderError) =>
    set({ recorderStatus, recorderError }),
}));
