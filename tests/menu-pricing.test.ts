import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCanonicalMenuItemPrice,
  getCanonicalOrderItemPrice,
  isHarlemDaytime,
  millisecondsUntilNextHookahPriceChange,
} from '../src/lib/menu-pricing';

// These UTC instants are 16:59:59.999, 17:00:00 and 17:00:01 in Moscow.
const before = new Date('2026-10-07T13:59:59.999Z');
const boundary = new Date('2026-10-07T14:00:00.000Z');
const after = new Date('2026-10-07T14:00:01.000Z');

test('Harlem daytime ends exactly at 17:00 local time', () => {
  assert.equal(isHarlemDaytime(before), true);
  assert.equal(isHarlemDaytime(boundary), false);
  assert.equal(isHarlemDaytime(after), false);
  assert.equal(millisecondsUntilNextHookahPriceChange(before), 1);
});

test('standard and premium hookah use the correct prices across the boundary', () => {
  assert.equal(getCanonicalMenuItemPrice('item_1', before), 700);
  assert.equal(getCanonicalMenuItemPrice('item_2', before), 999);
  assert.equal(getCanonicalMenuItemPrice('item_1', boundary), 999);
  assert.equal(getCanonicalMenuItemPrice('item_2', boundary), 1299);
  assert.equal(getCanonicalMenuItemPrice('item_1', after), 999);
  assert.equal(getCanonicalMenuItemPrice('item_2', after), 1299);
});

test('canonical price is selected by item ID, ignoring a forged client price', () => {
  const forgedClientItem = { id: 'item_2', price: 1, totalAmount: 1 };
  assert.equal(getCanonicalOrderItemPrice(forgedClientItem, before), 999);
  assert.equal(getCanonicalOrderItemPrice(forgedClientItem, boundary), 1299);
  assert.equal(getCanonicalOrderItemPrice({ menuItemId: 'item_1', id: 'item_2', price: 1 }, before), 700);
  assert.equal(getCanonicalMenuItemPrice('tea_1', before), 200);
});
