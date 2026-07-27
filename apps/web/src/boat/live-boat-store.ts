import { create } from 'zustand';
import type { TripRecord } from '../db/types.js';
import type { PositionSample, TripRecorderStatus } from '../trips/types.js';

export type LiveBoatState = {
  position: PositionSample | null;
  trip: TripRecord | null;
  recorderStatus: TripRecorderStatus;
  recorderError?: string;
  setLiveSample: (sample: PositionSample | null) => void;
  setTrip: (trip: TripRecord | null) => void;
  setRecorderStatus: (status: TripRecorderStatus, detail?: string) => void;
};

/** Zustand store for live boat state (position, heading, active trip). */
export const useLiveBoatStore = create<LiveBoatState>((set) => ({
  position: null,
  trip: null,
  recorderStatus: 'idle',
  setLiveSample: (position) => set({ position }),
  setTrip: (trip) => set({ trip }),
  setRecorderStatus: (recorderStatus, recorderError) =>
    set({ recorderStatus, recorderError }),
}));
