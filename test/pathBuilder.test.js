const { test } = require('node:test');
const assert = require('node:assert');
const { buildMonthPath } = require('../src/core/pathBuilder');

test('builds nested numeric path for a normal date', () => {
  assert.strictEqual(buildMonthPath(new Date(2024, 2, 15)), '2024/2024-03'); // March = month index 2
});

test('zero-pads single-digit months', () => {
  assert.strictEqual(buildMonthPath(new Date(2024, 0, 1)), '2024/2024-01');
});

test('handles December (year boundary upper edge)', () => {
  assert.strictEqual(buildMonthPath(new Date(2023, 11, 31)), '2023/2023-12');
});
