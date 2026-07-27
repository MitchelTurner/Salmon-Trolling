/**
 * Maps validated SI request bodies onto `@troll/engine` solvers.
 * No reimplementation of physics — thin adapter only.
 */
import {
  RHO_STEEL,
  analyzeSpread,
  composeSigma,
  fittedCdAssumption,
  kgPerM,
  lurePositionFromBall,
  resolveStw,
  selectNarrowestFit,
  solveDownrigger,
  solveDiver,
  solveFlatline,
  solveLeadcore,
  solveLeader,
  solveWeighted,
  solveWire,
  type ResolveStwResult,
  type StoredCalibrationFit,
  type StwConfidence,
  type StwSource,
} from '@troll/engine';
import {
  kilograms,
  meters,
  metersPerSecond,
  newtons,
  type Meters,
  type MetersPerSecond,
} from '@troll/units';
import type { CalcDepthBody, CalcSpreadBody, RigBody, StwBody } from './schemas.js';

const RHO_MONOFILAMENT = 1140;
/** Default mono leader diameter when omitted (ESTIMATED). */
const DEFAULT_LEADER_DIA_M = 0.00045;
/** Default attractor drag when omitted (N). */
const DEFAULT_ATTRACTOR_DRAG_N = 5;

export type DepthResultDto = {
  readonly depthM: number;
  readonly setbackM: number;
  readonly ballDepthM?: number;
  readonly blowbackAngleRad?: number;
  readonly sigmaM: number;
  readonly wide: boolean;
  readonly confidence: StwConfidence;
  readonly stwSource: StwSource;
  readonly outOfRange: boolean;
  readonly assumptions: string[];
};

export type CalcError = {
  readonly ok: false;
  readonly type: 'https://troll.app/problems/calc-failed';
  readonly title: string;
  readonly detail: string;
  readonly status: 400;
};

export type CalcDepthOk = {
  readonly ok: true;
  readonly result: DepthResultDto;
};

export type CalcSpreadOk = {
  readonly ok: true;
  readonly results: DepthResultDto[];
  readonly spread: {
    readonly rigs: Array<{
      id: string;
      localSpeedMs: number;
      depthM: number;
      depthSwingM: number;
      setbackM: number;
      lateralOffsetM: number;
    }>;
    readonly tangleWarnings: Array<{
      rigIdA: string;
      rigIdB: string;
      separationM: number;
      thresholdM: number;
    }>;
  };
};

function steelLinearMass(diameterM: number) {
  return kgPerM(Math.PI * (diameterM / 2) ** 2 * RHO_STEEL);
}

function monoLinearMass(diameterM: number) {
  return kgPerM(Math.PI * (diameterM / 2) ** 2 * RHO_MONOFILAMENT);
}

export function resolveStwFromBody(stw: StwBody): ResolveStwResult {
  return resolveStw({
    speedThroughWater:
      stw.speedThroughWaterMs !== undefined
        ? metersPerSecond(stw.speedThroughWaterMs)
        : undefined,
    sog: stw.sogMs !== undefined ? metersPerSecond(stw.sogMs) : undefined,
    sogVector: stw.sogVector,
    predictedCurrent:
      stw.predictedCurrent !== undefined
        ? {
            eastMs: stw.predictedCurrent.eastMs,
            northMs: stw.predictedCurrent.northMs,
            stationId: stw.predictedCurrent.stationId,
            stationDistanceM: meters(stw.predictedCurrent.stationDistanceM),
            predictionTimeOffsetS: stw.predictedCurrent.predictionTimeOffsetS,
          }
        : undefined,
  });
}

type NominalGeometry = {
  depth: Meters;
  setback: Meters;
  ballDepth?: Meters;
  blowbackRad?: number;
  outOfRange: boolean;
  fitRmse?: Meters;
  assumptions: string[];
  depthAtStw: (stw: MetersPerSecond) => Meters;
  setbackAtStw: (stw: MetersPerSecond) => Meters;
};

function geometryAtStw(
  rig: RigBody,
  stw: MetersPerSecond,
  fit: StoredCalibrationFit | null = null,
): NominalGeometry {
  switch (rig.delivery) {
    case 'downrigger': {
      const cableOut = meters(rig.cableOutM);
      const diameter = meters(rig.cableDiameterM);
      const linearMass =
        rig.cableLinearMassKgPerM !== undefined
          ? kgPerM(rig.cableLinearMassKgPerM)
          : steelLinearMass(rig.cableDiameterM);
      const terminalDrag = newtons(rig.terminalDragN);
      const releaseDrop = meters(rig.releaseDropM);
      const leaderLength = meters(rig.leaderLengthM);
      const leaderDia = meters(rig.leaderDiameterM ?? DEFAULT_LEADER_DIA_M);
      const attractorDrag = newtons(
        rig.attractorDragN ?? DEFAULT_ATTRACTOR_DRAG_N,
      );
      const ballMass = kilograms(rig.ballMassKg);
      const fittedCd = fit?.params.ballCd;

      const run = (stwVal: MetersPerSecond) => {
        const ball = solveDownrigger({
          cableOut,
          stw: stwVal,
          ball: {
            mass: ballMass,
            shape: rig.ballShape,
            cd: fittedCd,
            cdSource: fittedCd !== undefined ? 'FITTED' : undefined,
          },
          cable: { diameter, linearMass },
          terminalDrag,
        });
        const leader = solveLeader({
          leaderLength,
          stw: stwVal,
          leader: { diameter: leaderDia },
          attractorDrag,
        });
        const lure = lurePositionFromBall({
          ballDepth: ball.ballDepth,
          ballSetback: ball.setback,
          releaseDropHeight: releaseDrop,
          leader,
        });
        return { ball, leader, lure };
      };

      const { ball, leader, lure } = run(stw);
      const defaults: string[] = [];
      if (fit) {
        defaults.push(fittedCdAssumption(fit));
      }
      if (rig.cableLinearMassKgPerM === undefined) {
        defaults.push(
          'cable linearMass from solid stainless of stated diameter',
        );
      }
      if (rig.leaderDiameterM === undefined) {
        defaults.push(
          `leader diameter default ${DEFAULT_LEADER_DIA_M} m (ESTIMATED)`,
        );
      }
      if (rig.attractorDragN === undefined) {
        defaults.push(
          `attractor drag default ${DEFAULT_ATTRACTOR_DRAG_N} N (ESTIMATED)`,
        );
      }

      return {
        depth: lure.lureDepth,
        setback: lure.lureSetback,
        ballDepth: ball.ballDepth,
        blowbackRad: ball.blowbackAngle,
        outOfRange: false,
        fitRmse: fit ? meters(fit.rmseM) : undefined,
        assumptions: [...ball.assumptions, ...leader.assumptions, ...defaults],
        depthAtStw: (s) => run(s).lure.lureDepth,
        setbackAtStw: (s) => run(s).lure.lureSetback,
      };
    }

    case 'diver': {
      const run = (stwVal: MetersPerSecond) =>
        solveDiver({
          model: rig.model,
          size: rig.size,
          settingIndex: rig.settingIndex,
          lineOut: meters(rig.lineOutM),
          stw: stwVal,
          lineType: rig.lineType,
          lineDiameterM: rig.lineDiameterM,
          addedWeightKg: rig.addedWeightKg,
        });
      const result = run(stw);
      return {
        depth: result.depth,
        setback: meters(0),
        outOfRange: result.outOfRange,
        fitRmse: meters(result.fit.rmseM),
        assumptions: result.assumptions,
        depthAtStw: (s) => run(s).depth,
        setbackAtStw: () => meters(0),
      };
    }

    case 'leadcore': {
      const run = (stwVal: MetersPerSecond) =>
        solveLeadcore({
          colorsOut: rig.colorsOut,
          stw: stwVal,
          backingSag:
            rig.backingSagM !== undefined ? meters(rig.backingSagM) : undefined,
          leaderRise:
            rig.leaderRiseM !== undefined ? meters(rig.leaderRiseM) : undefined,
        });
      const result = run(stw);
      return {
        depth: result.depth,
        setback: meters(0),
        outOfRange: false,
        assumptions: result.assumptions,
        depthAtStw: (s) => run(s).depth,
        setbackAtStw: () => meters(0),
      };
    }

    case 'wire': {
      const run = (stwVal: MetersPerSecond) =>
        solveWire({
          colorsOut: 0,
          wireOut: meters(rig.wireOutM),
          stw: stwVal,
          backingSag:
            rig.backingSagM !== undefined ? meters(rig.backingSagM) : undefined,
          leaderRise:
            rig.leaderRiseM !== undefined ? meters(rig.leaderRiseM) : undefined,
        });
      const result = run(stw);
      return {
        depth: result.depth,
        setback: meters(0),
        outOfRange: false,
        assumptions: result.assumptions,
        depthAtStw: (s) => run(s).depth,
        setbackAtStw: () => meters(0),
      };
    }

    case 'weighted': {
      const diameter = meters(rig.lineDiameterM);
      const linearMass =
        rig.lineLinearMassKgPerM !== undefined
          ? kgPerM(rig.lineLinearMassKgPerM)
          : monoLinearMass(rig.lineDiameterM);
      const run = (stwVal: MetersPerSecond) =>
        solveWeighted({
          lineOut: meters(rig.lineOutM),
          stw: stwVal,
          weight: {
            mass: kilograms(rig.tipMassKg),
            shape: rig.tipShape,
          },
          line: { diameter, linearMass },
          terminalDrag: newtons(rig.terminalDragN),
        });
      const result = run(stw);
      const assumptions = [...result.assumptions];
      if (rig.lineLinearMassKgPerM === undefined) {
        assumptions.push(
          `line linearMass from diameter×ρ_nylon (${RHO_MONOFILAMENT} kg/m³, ESTIMATED)`,
        );
      }
      return {
        depth: result.depth,
        setback: result.setback,
        blowbackRad: result.blowbackAngle,
        outOfRange: false,
        assumptions,
        depthAtStw: (s) => run(s).depth,
        setbackAtStw: (s) => run(s).setback,
      };
    }

    case 'flatline': {
      const diameter = meters(rig.lineDiameterM);
      const linearMass =
        rig.lineLinearMassKgPerM !== undefined
          ? kgPerM(rig.lineLinearMassKgPerM)
          : monoLinearMass(rig.lineDiameterM);
      const run = (stwVal: MetersPerSecond) =>
        solveFlatline({
          lineOut: meters(rig.lineOutM),
          stw: stwVal,
          line: { diameter, linearMass },
          terminalDrag: newtons(rig.terminalDragN),
        });
      const result = run(stw);
      const assumptions = [...result.assumptions];
      if (rig.lineLinearMassKgPerM === undefined) {
        assumptions.push(
          `line linearMass from diameter×ρ_nylon (${RHO_MONOFILAMENT} kg/m³, ESTIMATED)`,
        );
      }
      return {
        depth: result.depth,
        setback: result.setback,
        blowbackRad: result.blowbackAngle,
        outOfRange: false,
        assumptions,
        depthAtStw: (s) => run(s).depth,
        setbackAtStw: (s) => run(s).setback,
      };
    }
  }
}

function toDto(
  geom: NominalGeometry,
  stwResolved: ResolveStwResult,
): DepthResultDto {
  const sigma = composeSigma({
    depth: geom.depth,
    stw: stwResolved.stw,
    stwSource: stwResolved.source,
    depthAtStw: (stwMs: number) => geom.depthAtStw(metersPerSecond(stwMs)),
    fitRmse: geom.fitRmse,
  });

  return {
    depthM: geom.depth,
    setbackM: geom.setback,
    ballDepthM: geom.ballDepth,
    blowbackAngleRad: geom.blowbackRad,
    sigmaM: sigma.sigma,
    wide: sigma.wide,
    confidence: stwResolved.confidence,
    stwSource: stwResolved.source,
    outOfRange: geom.outOfRange,
    assumptions: [...stwResolved.assumptions, ...geom.assumptions],
  };
}

function fail(detail: string): CalcError {
  return {
    ok: false,
    type: 'https://troll.app/problems/calc-failed',
    title: 'Calculation failed',
    detail,
    status: 400,
  };
}

export function computeDepth(body: CalcDepthBody): CalcDepthOk | CalcError {
  try {
    const stwResolved = resolveStwFromBody(body.stw);
    const fit =
      body.calibrationFits && body.calibrationFits.length > 0
        ? selectNarrowestFit(body.calibrationFits, {
            boatId: body.boatId,
            rigId: body.rigId,
          })
        : null;
    const geom = geometryAtStw(body.rig, stwResolved.stw, fit);
    return { ok: true, result: toDto(geom, stwResolved) };
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'calculation failed');
  }
}

export function computeSpread(body: CalcSpreadBody): CalcSpreadOk | CalcError {
  try {
    const stwResolved = resolveStwFromBody(body.stw);
    const results: DepthResultDto[] = [];
    const spreadRigs = body.rigs.map((entry) => {
      const geom = geometryAtStw(entry.rig, stwResolved.stw);
      results.push(toDto(geom, stwResolved));
      return {
        id: entry.id,
        lateralOffset: meters(entry.lateralOffsetM),
        setback: geom.setback,
        depth: geom.depth,
        depthAtStw: geom.depthAtStw,
        setbackAtStw: geom.setbackAtStw,
      };
    });

    const spread = analyzeSpread({
      stw: stwResolved.stw,
      omega: body.omegaRadPerS,
      rigs: spreadRigs,
      tangleThreshold:
        body.tangleThresholdM !== undefined
          ? meters(body.tangleThresholdM)
          : undefined,
    });

    return {
      ok: true,
      results,
      spread: {
        rigs: spread.rigs.map((r: (typeof spread.rigs)[number]) => ({
          id: r.id,
          localSpeedMs: r.localSpeed,
          depthM: r.depth,
          depthSwingM: r.depthSwing,
          setbackM: r.setback,
          lateralOffsetM: r.lateralOffset,
        })),
        tangleWarnings: spread.tangleWarnings.map(
          (w: (typeof spread.tangleWarnings)[number]) => ({
            rigIdA: w.rigIdA,
            rigIdB: w.rigIdB,
            separationM: w.separation,
            thresholdM: w.threshold,
          }),
        ),
      },
    };
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'calculation failed');
  }
}
