/**
 * Minimal gradient-boosted regression trees for small tabular fishing data.
 * Intentionally tiny — no native deps. Replace later if data volume demands it.
 */

export type Stump = {
  readonly featureIndex: number;
  readonly threshold: number;
  readonly leftValue: number;
  readonly rightValue: number;
};

export type GradientBoostedModel = {
  readonly kind: 'gbt';
  readonly baseValue: number;
  readonly learningRate: number;
  readonly stumps: readonly Stump[];
  readonly featureCount: number;
};

export type TrainGbtOptions = {
  readonly iterations?: number;
  readonly learningRate?: number;
};

function mean(ys: readonly number[]): number {
  if (ys.length === 0) return 0;
  let s = 0;
  for (const y of ys) s += y;
  return s / ys.length;
}

function bestStump(
  X: readonly (readonly number[])[],
  residuals: readonly number[],
): Stump {
  const n = X.length;
  const d = X[0]?.length ?? 0;
  let best: Stump = {
    featureIndex: 0,
    threshold: 0,
    leftValue: 0,
    rightValue: 0,
  };
  let bestLoss = Number.POSITIVE_INFINITY;

  for (let j = 0; j < d; j++) {
    const col = X.map((row) => row[j]!);
    const uniq = [...new Set(col)].sort((a, b) => a - b);
    for (let t = 0; t < uniq.length - 1; t++) {
      const threshold = (uniq[t]! + uniq[t + 1]!) / 2;
      let leftSum = 0;
      let leftN = 0;
      let rightSum = 0;
      let rightN = 0;
      for (let i = 0; i < n; i++) {
        if (col[i]! <= threshold) {
          leftSum += residuals[i]!;
          leftN += 1;
        } else {
          rightSum += residuals[i]!;
          rightN += 1;
        }
      }
      if (leftN === 0 || rightN === 0) continue;
      const leftValue = leftSum / leftN;
      const rightValue = rightSum / rightN;
      let loss = 0;
      for (let i = 0; i < n; i++) {
        const pred = col[i]! <= threshold ? leftValue : rightValue;
        const err = residuals[i]! - pred;
        loss += err * err;
      }
      if (loss < bestLoss) {
        bestLoss = loss;
        best = { featureIndex: j, threshold, leftValue, rightValue };
      }
    }
  }
  return best;
}

function stumpPredict(stump: Stump, x: readonly number[]): number {
  return x[stump.featureIndex]! <= stump.threshold
    ? stump.leftValue
    : stump.rightValue;
}

export function trainGbt(
  X: readonly (readonly number[])[],
  y: readonly number[],
  options: TrainGbtOptions = {},
): GradientBoostedModel {
  if (X.length === 0 || X.length !== y.length) {
    throw new Error('trainGbt requires aligned non-empty X and y');
  }
  const iterations = options.iterations ?? 20;
  const learningRate = options.learningRate ?? 0.1;
  const featureCount = X[0]!.length;
  const baseValue = mean(y);
  const preds = y.map(() => baseValue);
  const stumps: Stump[] = [];

  for (let m = 0; m < iterations; m++) {
    const residuals = y.map((yi, i) => yi - preds[i]!);
    const stump = bestStump(X, residuals);
    stumps.push(stump);
    for (let i = 0; i < preds.length; i++) {
      preds[i]! += learningRate * stumpPredict(stump, X[i]!);
    }
  }

  return { kind: 'gbt', baseValue, learningRate, stumps, featureCount };
}

export function predictGbt(
  model: GradientBoostedModel,
  x: readonly number[],
): number {
  if (x.length !== model.featureCount) {
    throw new Error(
      `feature length ${x.length} != model.featureCount ${model.featureCount}`,
    );
  }
  let y = model.baseValue;
  for (const stump of model.stumps) {
    y += model.learningRate * stumpPredict(stump, x);
  }
  return y;
}
