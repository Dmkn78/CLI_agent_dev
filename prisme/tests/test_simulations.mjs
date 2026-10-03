import assert from 'node:assert/strict';
import test from 'node:test';
import { brownianPaths, discreteMoments, gaussianDensity, moments, normalRandom, secantSlope, seededRandom } from '../web/math.js';

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
}

test('a fixed seed reproduces exactly the same draws and paths', () => {
  const first = seededRandom(12);
  const second = seededRandom(12);
  for (let index = 0; index < 200; index++) {
    const draw = first();
    assert.equal(draw, second());
    assert.ok(draw >= 0 && draw < 1);
  }
  assert.deepEqual(brownianPaths({ seed: 12 }), brownianPaths({ seed: 12 }));
  assert.notDeepEqual(brownianPaths({ seed: 12 }), brownianPaths({ seed: 13 }));
});

test('sigma zero removes uncertainty and leaves the deterministic drift', () => {
  const paths = brownianPaths({ count: 4, steps: 8, horizon: 2, mu: -3, sigma: 0, seed: 9 });
  assert.equal(paths.length, 4);
  for (const path of paths) {
    assert.equal(path.length, 9);
    for (let index = 0; index <= 8; index++) close(path[index], -0.75 * index);
  }
});

test('Brownian ensemble moments follow the analytic mean and variance', () => {
  const endpoints = brownianPaths({ count: 20000, steps: 3, horizon: 2, mu: 0.4, sigma: 0.7, seed: 573 }).map(path => path.at(-1));
  const measured = moments(endpoints);
  close(measured.mean, 0.8, 0.03);
  close(measured.variance, 0.98, 0.04);
});

test('normal sampling handles a zero random draw without infinity', () => {
  assert.ok(Number.isFinite(normalRandom(() => 0)));
});

test('population moments describe spread and remain translation invariant', () => {
  assert.deepEqual(moments([]), { mean: 0, variance: 0 });
  assert.deepEqual(moments([5]), { mean: 5, variance: 0 });
  assert.deepEqual(moments([1, 2, 3]), { mean: 2, variance: 2 / 3 });
  assert.deepEqual(moments([11, 12, 13]), { mean: 12, variance: 2 / 3 });
});

test('expectation normalizes weights and distinguishes equal means with different risks', () => {
  const risky = discreteMoments([1, 1], [-2, 5]);
  assert.deepEqual(risky.probabilities, [0.5, 0.5]);
  close(risky.mean, 1.5);
  close(risky.variance, 12.25);
  const certain = discreteMoments([1], [1.5]);
  close(certain.mean, risky.mean);
  assert.equal(certain.variance, 0);
  assert.deepEqual(discreteMoments([20, 20], [-2, 5]), risky);
  close(discreteMoments([1, 1, 1]).mean, 4 / 3);
  assert.equal(discreteMoments([0, 0, 0]), null);
});

test('invalid discrete weights cannot produce a plausible distribution', () => {
  for (const weights of [[1, -1, 2], [1, Infinity, 2], [1, NaN, 2], [1]]) {
    assert.throws(() => discreteMoments(weights), /Poids invalides/);
  }
});

test('the secant tends to the derivative from both directions without dividing by zero', () => {
  close(secantSlope(1, 0.2), 2.2);
  close(secantSlope(-1, 0.2), -1.8);
  close(secantSlope(3, 1e-8), 6, 2e-8);
  close(secantSlope(3, -1e-8), 6, 2e-8);
  assert.throws(() => secantSlope(1, 0), /non nul/);
});

test('rho zero factors into independent standard Gaussian densities', () => {
  close(gaussianDensity(0, 0, 0), 1 / (2 * Math.PI));
  const normalDensity = x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  for (const [x, y] of [[0, 0], [1, -2], [3, 1], [-1, 0.5]]) {
    close(gaussianDensity(x, y, 0), normalDensity(x) * normalDensity(y));
  }
});

test('Gaussian density has the expected symmetry and excludes degenerate correlations', () => {
  close(gaussianDensity(1, 2, 0.5), gaussianDensity(2, 1, 0.5));
  close(gaussianDensity(1, 2, 0.5), gaussianDensity(1, -2, -0.5));
  assert.ok(gaussianDensity(1, 1, 0.7) > gaussianDensity(1, -1, 0.7));
  for (const correlation of [-2, -1, 1, 2]) assert.throws(() => gaussianDensity(0, 0, correlation), /ρ/);
  let mass = 0;
  const spacing = 0.1;
  for (let x = -5 + spacing / 2; x < 5; x += spacing) {
    for (let y = -5 + spacing / 2; y < 5; y += spacing) mass += gaussianDensity(x, y, 0.5) * spacing ** 2;
  }
  close(mass, 1, 0.00001);
});
