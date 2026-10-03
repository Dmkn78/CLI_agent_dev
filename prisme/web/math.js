/** Deterministic numerical kernels shared by the labs and their tests. */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalRandom(random) {
  return Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, random()))) * Math.cos(2 * Math.PI * random());
}

export function brownianPaths({ count = 24, steps = 240, horizon = 2, mu = 0, sigma = 0.8, seed = 42 } = {}) {
  const random = seededRandom(seed);
  const interval = horizon / steps;
  return Array.from({ length: count }, () => {
    const path = [0];
    for (let step = 1; step <= steps; step++) {
      path.push(path[step - 1] + mu * interval + sigma * Math.sqrt(interval) * normalRandom(random));
    }
    return path;
  });
}

export function moments(values) {
  if (!values.length) return { mean: 0, variance: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, variance };
}

export function discreteMoments(weights, outcomes = [-2, 1, 5]) {
  if (weights.length !== outcomes.length || weights.some(weight => !Number.isFinite(weight) || weight < 0)) throw new Error('Poids invalides.');
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (!total) return null;
  const probabilities = weights.map(weight => weight / total);
  const mean = outcomes.reduce((sum, outcome, index) => sum + outcome * probabilities[index], 0);
  const variance = outcomes.reduce((sum, outcome, index) => sum + (outcome - mean) ** 2 * probabilities[index], 0);
  return { probabilities, mean, variance };
}

export function secantSlope(x, step) {
  if (!step) throw new Error('h doit être non nul.');
  return 2 * x + step;
}

export function gaussianDensity(x, y, correlation) {
  if (Math.abs(correlation) >= 1) throw new Error('La densité exige |ρ| < 1.');
  const determinant = 1 - correlation ** 2;
  return Math.exp(-(x * x - 2 * correlation * x * y + y * y) / (2 * determinant)) / (2 * Math.PI * Math.sqrt(determinant));
}

