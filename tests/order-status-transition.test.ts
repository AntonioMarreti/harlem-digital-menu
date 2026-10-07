import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ORDER_STATUS_TRANSITIONS,
  transitionOrderStatus,
  type OrderStatus,
} from '../src/lib/order-status-transition';
import {
  ORDER_STATUS_CONFLICT_MESSAGE,
  refreshAfterOrderStatusConflict,
} from '../src/lib/order-status-client';

test('allowed order transition succeeds through the conditional-write port', async () => {
  let status: OrderStatus = 'new';
  const result = await transitionOrderStatus('new', 'accepted', async (expected, requested) => {
    if (status !== expected) return null;
    status = requested;
    return { status };
  });

  assert.deepEqual(result, { kind: 'updated', value: { status: 'accepted' } });
  assert.equal(status, 'accepted');
});

test('forbidden transition is rejected without calling the database port', async () => {
  let writes = 0;
  const result = await transitionOrderStatus('preparing', 'cancelled', async () => {
    writes += 1;
    return { status: 'cancelled' };
  });

  assert.equal(result.kind, 'invalid_transition');
  assert.equal(writes, 0);
});

test('stale staff expected status returns a conflict before any write', async () => {
  let writes = 0;
  const result = await transitionOrderStatus('accepted', 'preparing', async () => {
    writes += 1;
    return { status: 'preparing' };
  }, 'new');

  assert.equal(result.kind, 'conflict');
  assert.equal(writes, 0);
});

test('two concurrent requests based on the same status have one winner and one conflict', async () => {
  let storedStatus: OrderStatus = 'new';
  const conditionalUpdate = async (expected: OrderStatus, requested: OrderStatus) => {
    if (storedStatus !== expected) return null;
    storedStatus = requested;
    return { status: storedStatus };
  };

  const [accept, cancel] = await Promise.all([
    transitionOrderStatus('new', 'accepted', conditionalUpdate),
    transitionOrderStatus('new', 'cancelled', conditionalUpdate),
  ]);

  assert.equal([accept, cancel].filter((result) => result.kind === 'updated').length, 1);
  assert.equal([accept, cancel].filter((result) => result.kind === 'conflict').length, 1);
  const winner = accept.kind === 'updated' ? accept.value : cancel.kind === 'updated' ? cancel.value : null;
  assert.ok(winner);
  assert.equal(storedStatus as string, winner.status);
  assert.ok(['accepted', 'cancelled'].includes(storedStatus as string));
});

test('the losing conditional request cannot overwrite the winning status', async () => {
  let storedStatus: OrderStatus = 'new';
  const conditionalUpdate = async (expected: OrderStatus, requested: OrderStatus) => {
    if (storedStatus !== expected) return null;
    storedStatus = requested;
    return { status: storedStatus };
  };

  const winner = await transitionOrderStatus('new', 'accepted', conditionalUpdate);
  const loser = await transitionOrderStatus('new', 'cancelled', conditionalUpdate);
  assert.equal(winner.kind, 'updated');
  assert.deepEqual(loser, { kind: 'conflict' });
  assert.equal(storedStatus, 'accepted');
});

test('cancellation is protected by the same expected-status conditional update', async () => {
  let storedStatus: OrderStatus = 'accepted';
  const conditionalUpdate = async (expected: OrderStatus, requested: OrderStatus) => {
    if (storedStatus !== expected) return null;
    storedStatus = requested;
    return { status: storedStatus };
  };

  const [cancel, prepare] = await Promise.all([
    transitionOrderStatus('accepted', 'cancelled', conditionalUpdate),
    transitionOrderStatus('accepted', 'preparing', conditionalUpdate),
  ]);
  assert.equal([cancel, prepare].filter((result) => result.kind === 'updated').length, 1);
  assert.equal([cancel, prepare].filter((result) => result.kind === 'conflict').length, 1);
  assert.ok(['cancelled', 'preparing'].includes(storedStatus as string));
});

test('the existing order transition graph is unchanged', () => {
  assert.deepEqual(ORDER_STATUS_TRANSITIONS, {
    new: ['accepted', 'cancelled'],
    accepted: ['preparing', 'cancelled'],
    preparing: ['delivered'],
    delivered: ['closed'],
    closed: [],
    cancelled: [],
  });
});

test('staff conflict handler refreshes data and returns a clear message after 409', async () => {
  let refreshes = 0;
  const message = await refreshAfterOrderStatusConflict(409, 'ORDER_STATUS_CONFLICT', async () => {
    refreshes += 1;
  });
  assert.equal(refreshes, 1);
  assert.equal(message, ORDER_STATUS_CONFLICT_MESSAGE);
});

test('other errors do not run the conflict refresh path', async () => {
  let refreshes = 0;
  const message = await refreshAfterOrderStatusConflict(409, 'INVALID_ORDER_STATUS_TRANSITION', async () => {
    refreshes += 1;
  });
  assert.equal(message, null);
  assert.equal(refreshes, 0);
});
