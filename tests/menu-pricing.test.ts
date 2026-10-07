import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCanonicalMenuItemPrice,
  getCanonicalOrderItemPrice,
  isHarlemDaytime,
  millisecondsUntilNextHookahPriceChange,
} from '../src/lib/menu-pricing';

// Explicit UTC instants make the Moscow-local boundary checks independent of CI timezone.
const oneAm = new Date('2026-10-06T22:00:00.000Z');
const beforeOpening = new Date('2026-10-07T09:59:59.000Z');
const opening = new Date('2026-10-07T10:00:00.000Z');
const beforeEnd = new Date('2026-10-07T13:59:59.000Z');
const end = new Date('2026-10-07T14:00:00.000Z');

test('daytime pricing applies only from 13:00 through 16:59:59 in Harlem', () => {
  assert.equal(isHarlemDaytime(oneAm), false);
  assert.equal(isHarlemDaytime(beforeOpening), false);
  assert.equal(isHarlemDaytime(opening), true);
  assert.equal(isHarlemDaytime(beforeEnd), true);
  assert.equal(isHarlemDaytime(end), false);
});

test('both hookahs use canonical prices at every boundary', () => {
  for (const at of [oneAm, beforeOpening, end]) {
    assert.equal(getCanonicalMenuItemPrice('item_1', at), 999);
    assert.equal(getCanonicalMenuItemPrice('item_2', at), 1299);
  }

  for (const at of [opening, beforeEnd]) {
    assert.equal(getCanonicalMenuItemPrice('item_1', at), 700);
    assert.equal(getCanonicalMenuItemPrice('item_2', at), 999);
  }
});

test('guest price refresh is scheduled for both 13:00 and 17:00', () => {
  assert.equal(millisecondsUntilNextHookahPriceChange(new Date('2026-10-07T09:59:59.999Z')), 1);
  assert.equal(millisecondsUntilNextHookahPriceChange(opening), 4 * 60 * 60 * 1000);
  assert.equal(millisecondsUntilNextHookahPriceChange(new Date('2026-10-07T13:59:59.999Z')), 1);
  assert.equal(millisecondsUntilNextHookahPriceChange(end), 20 * 60 * 60 * 1000);
  assert.equal(millisecondsUntilNextHookahPriceChange(oneAm), 12 * 60 * 60 * 1000);
});

test('server-side canonical pricing ignores a forged client price', () => {
  const forgedClientItem = { id: 'item_2', price: 1, totalAmount: 1 };
  assert.equal(getCanonicalOrderItemPrice(forgedClientItem, opening), 999);
  assert.equal(getCanonicalOrderItemPrice(forgedClientItem, end), 1299);
  assert.equal(getCanonicalOrderItemPrice({ menuItemId: 'item_1', id: 'item_2', price: 1 }, opening), 700);
  assert.equal(getCanonicalMenuItemPrice('tea_1', opening), 200);
});
