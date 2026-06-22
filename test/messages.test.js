const { test } = require('node:test');
const assert = require('node:assert');
const { MESSAGES, formatMessage } = require('../src/core/messages');

test('every message has non-empty en and cs', () => {
  for (const [code, entry] of Object.entries(MESSAGES)) {
    assert.ok(entry.en && entry.en.trim().length > 0, `${code}.en missing`);
    assert.ok(entry.cs && entry.cs.trim().length > 0, `${code}.cs missing`);
  }
});

test('interpolates placeholders', () => {
  const out = formatMessage('progress', 'en', { processed: 5, total: 10 });
  assert.strictEqual(out, 'Sorting… 5 of 10');
});

test('Czech interpolation works too', () => {
  const out = formatMessage('progress', 'cs', { processed: 5, total: 10 });
  assert.strictEqual(out, 'Řadím… 5 z 10');
});

test('unknown code throws', () => {
  assert.throws(() => formatMessage('nope', 'en'), /Unknown message code/);
});

test('leaves unknown placeholders intact rather than printing undefined', () => {
  assert.strictEqual(formatMessage('progress', 'en', { processed: 1 }), 'Sorting… 1 of {total}');
});
