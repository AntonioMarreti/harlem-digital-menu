import assert from 'node:assert/strict';
import test from 'node:test';
import {
  executePendingOrderSubmission,
  finalizeConfirmedPendingOrder,
  getConfirmedCartDisposition,
  getOrderSnapshotFingerprint,
  getPendingOrderStorageKey,
  preparePendingOrderSubmission,
  readPendingOrderSubmission,
  shouldRecoverPendingOrderOnLoad,
  type PendingOrderItem,
  type PendingOrderLockManager,
  type PendingOrderStorage,
} from '../src/lib/pending-order-submission';

class MemoryStorage implements PendingOrderStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

class TrackingStorage extends MemoryStorage {
  readonly operations: string[] = [];
  setItem(key: string, value: string) {
    this.operations.push(`set:${key}`);
    super.setItem(key, value);
  }
  removeItem(key: string) {
    this.operations.push(`remove:${key}`);
    super.removeItem(key);
  }
}

class MemoryLockManager implements PendingOrderLockManager {
  private readonly tails = new Map<string, Promise<void>>();

  async request<T>(name: string, callback: () => T | Promise<T>): Promise<T> {
    const previous = this.tails.get(name) ?? Promise.resolve();
    let release = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    this.tails.set(name, previous.then(() => gate));
    await previous;
    try {
      return await callback();
    } finally {
      release();
    }
  }
}

class IdempotentOrderServer {
  readonly orders = new Map<string, { id: string; fingerprint: string }>();
  requestCount = 0;

  submit(submission: { tableSessionId: string; idempotencyKey: string; fingerprint: string }) {
    this.requestCount += 1;
    const key = `${submission.tableSessionId}:${submission.idempotencyKey}`;
    const existing = this.orders.get(key);
    if (existing) return { order: existing, idempotent: true };
    const order = { id: `order-${this.orders.size + 1}`, fingerprint: submission.fingerprint };
    this.orders.set(key, order);
    return { order, idempotent: false };
  }
}

const sessionA = 'session-a';
const ordinaryCart: PendingOrderItem[] = [{ id: 'tea_3', quantity: 1 }];

let nextTestKey = 0;
function keyFactory() {
  return () => `pending-key-${++nextTestKey}`;
}

async function prepare(
  storage: MemoryStorage,
  sessionId: string,
  items: PendingOrderItem[] = ordinaryCart,
  locks?: PendingOrderLockManager
) {
  return preparePendingOrderSubmission(storage, locks, sessionId, items, keyFactory());
}

test('ordinary success remains confirmed until cart reconciliation completes', async () => {
  const storage = new MemoryStorage();
  const server = new IdempotentOrderServer();
  const prepared = await prepare(storage, sessionA);
  let wasPersistedBeforeSend = false;

  const result = await executePendingOrderSubmission(storage, prepared.submission, async (submission) => {
    wasPersistedBeforeSend = Boolean(readPendingOrderSubmission(storage, sessionA));
    return { kind: 'success', value: server.submit(submission) };
  });

  assert.equal(wasPersistedBeforeSend, true);
  assert.equal(result.kind, 'success');
  assert.equal(server.orders.size, 1);
  assert.equal(readPendingOrderSubmission(storage, sessionA)?.status, 'confirmed');

  const finalized = finalizeConfirmedPendingOrder(storage, prepared.submission, () => true);
  assert.equal(finalized, true);
  assert.equal(readPendingOrderSubmission(storage, sessionA), null);
});

test('crash after server success leaves confirmed key for reload and cannot create a duplicate', async () => {
  const storage = new MemoryStorage();
  const server = new IdempotentOrderServer();
  const prepared = await prepare(storage, sessionA);
  await executePendingOrderSubmission(storage, prepared.submission, async (submission) => ({
    kind: 'success',
    value: server.submit(submission),
  }));

  // Simulate a crash before cart reconciliation and a reload in another tab.
  const afterReload = readPendingOrderSubmission(storage, sessionA)!;
  assert.equal(afterReload.status, 'confirmed');
  const retry = await prepare(storage, sessionA);
  assert.equal(retry.submission.idempotencyKey, prepared.submission.idempotencyKey);
  let networkRequests = 0;
  await executePendingOrderSubmission(storage, retry.submission, async (submission) => {
    networkRequests += 1;
    return { kind: 'success', value: server.submit(submission) };
  });

  assert.equal(networkRequests, 0);
  assert.equal(server.orders.size, 1);
});

test('durable cart cleanup happens before pending protection is removed', async () => {
  const storage = new TrackingStorage();
  const cartKey = 'cart:session-a';
  const prepared = await prepare(storage, sessionA);
  await executePendingOrderSubmission(storage, prepared.submission, async () => ({ kind: 'success', value: true }));
  storage.operations.length = 0;

  const finalized = finalizeConfirmedPendingOrder(storage, prepared.submission, () => {
    storage.removeItem(cartKey);
    return true;
  });

  assert.equal(finalized, true);
  assert.ok(storage.operations.indexOf(`remove:${cartKey}`) < storage.operations.indexOf(`remove:${getPendingOrderStorageKey(sessionA)}`));
});

test('double-click preparation reuses the same pending submission and key', async () => {
  const storage = new MemoryStorage();
  const locks = new MemoryLockManager();
  let generatedKeys = 0;
  const newKey = () => `double-click-${++generatedKeys}`;
  const [first, second] = await Promise.all([
    preparePendingOrderSubmission(storage, locks, sessionA, ordinaryCart, newKey),
    preparePendingOrderSubmission(storage, locks, sessionA, ordinaryCart, newKey),
  ]);

  assert.equal(first.submission.idempotencyKey, second.submission.idempotencyKey);
  assert.equal(generatedKeys, 1);
});

test('retry with the same key returns the same server order instead of creating a duplicate', async () => {
  const storage = new MemoryStorage();
  const server = new IdempotentOrderServer();
  const first = await prepare(storage, sessionA);
  const firstResult = server.submit(first.submission);
  const retry = await prepare(storage, sessionA);
  const retryResult = server.submit(retry.submission);

  assert.equal(first.submission.idempotencyKey, retry.submission.idempotencyKey);
  assert.equal(firstResult.order.id, retryResult.order.id);
  assert.equal(retryResult.idempotent, true);
  assert.equal(server.orders.size, 1);
});

test('server success followed by a lost response leaves the pending key intact', async () => {
  const storage = new MemoryStorage();
  const server = new IdempotentOrderServer();
  const prepared = await prepare(storage, sessionA);

  const result = await executePendingOrderSubmission(storage, prepared.submission, async (submission) => {
    server.submit(submission);
    throw new Error('simulated lost HTTP response');
  });

  assert.equal(result.kind, 'uncertain');
  assert.equal(server.orders.size, 1);
  assert.equal(readPendingOrderSubmission(storage, sessionA)?.idempotencyKey, prepared.submission.idempotencyKey);
  assert.equal(readPendingOrderSubmission(storage, sessionA)?.status, 'uncertain');
});

test('a reload can read the saved pending state and original cart snapshot', async () => {
  const storage = new MemoryStorage();
  const prepared = await prepare(storage, sessionA, [{ id: 'tea_1', quantity: 2, options: { choice: 'Эрл Грей' } }]);
  const afterReload = readPendingOrderSubmission(storage, sessionA);

  assert.equal(afterReload?.idempotencyKey, prepared.submission.idempotencyKey);
  assert.deepEqual(afterReload?.items, [{ id: 'tea_1', quantity: 2, options: { choice: 'Эрл Грей' } }]);
  assert.equal(shouldRecoverPendingOrderOnLoad(afterReload!), true);
});

test('after reload the recovery request uses the exact prior idempotency key', async () => {
  const storage = new MemoryStorage();
  const server = new IdempotentOrderServer();
  const prepared = await prepare(storage, sessionA);
  server.submit(prepared.submission);
  await executePendingOrderSubmission(storage, prepared.submission, async () => { throw new Error('response lost'); });

  const reloadedPending = readPendingOrderSubmission(storage, sessionA)!;
  const sentKeys: string[] = [];
  await executePendingOrderSubmission(storage, reloadedPending, async (submission) => {
    sentKeys.push(submission.idempotencyKey);
    return { kind: 'success', value: server.submit(submission) };
  });

  assert.deepEqual(sentKeys, [prepared.submission.idempotencyKey]);
});

test('lost response recovery ends with one order, not a duplicate', async () => {
  const storage = new MemoryStorage();
  const server = new IdempotentOrderServer();
  const prepared = await prepare(storage, sessionA);
  await executePendingOrderSubmission(storage, prepared.submission, async (submission) => {
    server.submit(submission);
    throw new Error('response lost');
  });

  const recovered = readPendingOrderSubmission(storage, sessionA)!;
  const result = await executePendingOrderSubmission(storage, recovered, async (submission) => ({
    kind: 'success',
    value: server.submit(submission),
  }));

  assert.equal(result.kind, 'success');
  assert.equal(server.orders.size, 1);
});

test('pending state is retained for failures and cleared only after confirmed success', async () => {
  const storage = new MemoryStorage();
  const prepared = await prepare(storage, sessionA);

  await executePendingOrderSubmission(storage, prepared.submission, async () => ({ kind: 'uncertain' }));
  assert.ok(readPendingOrderSubmission(storage, sessionA));

  await executePendingOrderSubmission(storage, prepared.submission, async () => ({ kind: 'rejected' }));
  assert.equal(readPendingOrderSubmission(storage, sessionA)?.status, 'rejected');

  await executePendingOrderSubmission(storage, prepared.submission, async () => ({ kind: 'success', value: true }));
  assert.equal(readPendingOrderSubmission(storage, sessionA)?.status, 'confirmed');
  finalizeConfirmedPendingOrder(storage, prepared.submission, () => true);
  assert.equal(readPendingOrderSubmission(storage, sessionA), null);
});

test('two tabs: success in A cannot be downgraded by uncertain response in B or create a second key', async () => {
  const storage = new MemoryStorage();
  const locks = new MemoryLockManager();
  const server = new IdempotentOrderServer();
  let durableCart = ordinaryCart;
  let generatedKeys = 0;
  const [tabA, tabB] = await Promise.all([
    prepare(storage, sessionA, ordinaryCart, locks),
    prepare(storage, sessionA, ordinaryCart, locks),
  ]);

  let finishTabB!: (result: { kind: 'uncertain' }) => void;
  const tabBRequest = executePendingOrderSubmission(storage, tabB.submission, async (submission) => {
    server.submit(submission);
    return new Promise<{ kind: 'uncertain' }>((resolve) => { finishTabB = resolve; });
  });
  await executePendingOrderSubmission(storage, tabA.submission, async (submission) => ({
    kind: 'success',
    value: server.submit(submission),
  }));
  finishTabB({ kind: 'uncertain' });
  const tabBResult = await tabBRequest;
  assert.equal(tabBResult.kind, 'uncertain');
  assert.equal(readPendingOrderSubmission(storage, sessionA)?.status, 'confirmed');

  // A reconciles the durable cart before removing the confirmed key. B still
  // has the old cart in React memory, but submitOrder re-reads localStorage.
  assert.equal(finalizeConfirmedPendingOrder(storage, tabA.submission, () => {
    durableCart = [];
    return true;
  }), true);
  const tabBClickCart = durableCart;
  const userRetry = tabBClickCart.length === 0
    ? null
    : await preparePendingOrderSubmission(storage, locks, sessionA, tabBClickCart, () => `unexpected-${++generatedKeys}`);
  assert.equal(userRetry, null);
  assert.equal(generatedKeys, 0);
  assert.equal(server.orders.size, 1);
});

test('cart edits made while submission is in flight remain as the next durable cart', async () => {
  const storage = new MemoryStorage();
  const prepared = await prepare(storage, sessionA, ordinaryCart);
  await executePendingOrderSubmission(storage, prepared.submission, async () => ({ kind: 'success', value: true }));
  const editedCart = [{ id: 'tea_5', quantity: 1 }];
  let durableCart: PendingOrderItem[] = ordinaryCart;
  const finalized = finalizeConfirmedPendingOrder(storage, prepared.submission, () => {
    const disposition = getConfirmedCartDisposition(prepared.submission, editedCart, durableCart);
    const reconciledCart = disposition === 'memory'
      ? editedCart
      : disposition === 'durable'
        ? durableCart
        : [];
    durableCart = reconciledCart;
    return true;
  });

  assert.equal(finalized, true);
  assert.deepEqual(durableCart, editedCart);
  assert.equal(readPendingOrderSubmission(storage, sessionA), null);
});

test('a changed cart after a confirmed order receives a new idempotency key', async () => {
  const storage = new MemoryStorage();
  const first = await prepare(storage, sessionA, ordinaryCart);
  await executePendingOrderSubmission(storage, first.submission, async () => ({ kind: 'success', value: true }));
  finalizeConfirmedPendingOrder(storage, first.submission, () => true);
  const second = await prepare(storage, sessionA, [{ id: 'tea_5', quantity: 1 }]);

  assert.notEqual(first.submission.idempotencyKey, second.submission.idempotencyKey);
  assert.notEqual(first.submission.fingerprint, second.submission.fingerprint);
});

test('an uncertain pending key is never assigned to a different cart snapshot', async () => {
  const storage = new MemoryStorage();
  const original = await prepare(storage, sessionA, ordinaryCart);
  await executePendingOrderSubmission(storage, original.submission, async () => ({ kind: 'uncertain' }));
  const changed = await prepare(storage, sessionA, [{ id: 'tea_5', quantity: 1 }]);

  assert.equal(changed.matchesRequestedCart, false);
  assert.equal(changed.submission.fingerprint, original.submission.fingerprint);
  assert.deepEqual(changed.submission.items, original.submission.items);
  assert.equal(changed.submission.idempotencyKey, original.submission.idempotencyKey);
});

test('structured choice and notes participate in the fingerprint while display price does not', () => {
  const earlGrey = getOrderSnapshotFingerprint(sessionA, [
    { id: 'tea_1', quantity: 1, options: { choice: 'Эрл Грей', notes: 'без сахара' } },
  ]);
  const sencha = getOrderSnapshotFingerprint(sessionA, [
    { id: 'tea_1', quantity: 1, options: { choice: 'Сенча', notes: 'без сахара' } },
  ]);
  const differentNotes = getOrderSnapshotFingerprint(sessionA, [
    { id: 'tea_1', quantity: 1, options: { choice: 'Эрл Грей', notes: 'с лимоном' } },
  ]);
  const withDisplayPrice = { id: 'tea_1', quantity: 1, price: 200 };
  const withOtherDisplayPrice = { id: 'tea_1', quantity: 1, price: 999 };

  assert.notEqual(earlGrey, sencha);
  assert.notEqual(earlGrey, differentNotes);
  assert.equal(
    getOrderSnapshotFingerprint(sessionA, [withDisplayPrice]),
    getOrderSnapshotFingerprint(sessionA, [withOtherDisplayPrice])
  );
});

test('pending state is isolated by table session ID', async () => {
  const storage = new MemoryStorage();
  const first = await prepare(storage, 'session-a', ordinaryCart);
  const second = await prepare(storage, 'session-b', ordinaryCart);

  assert.notEqual(first.submission.idempotencyKey, second.submission.idempotencyKey);
  assert.notEqual(
    getPendingOrderStorageKey('session-a'),
    getPendingOrderStorageKey('session-b')
  );
  assert.equal(readPendingOrderSubmission(storage, 'session-a')?.idempotencyKey, first.submission.idempotencyKey);
  assert.equal(readPendingOrderSubmission(storage, 'session-b')?.idempotencyKey, second.submission.idempotencyKey);
});

test('two tabs preparing the same session snapshot share one pending key', async () => {
  const storage = new MemoryStorage();
  const locks = new MemoryLockManager();
  let generatedKeys = 0;
  const makeKey = () => `tab-key-${++generatedKeys}`;

  const [tabOne, tabTwo] = await Promise.all([
    preparePendingOrderSubmission(storage, locks, sessionA, ordinaryCart, makeKey),
    preparePendingOrderSubmission(storage, locks, sessionA, ordinaryCart, makeKey),
  ]);

  assert.equal(tabOne.submission.idempotencyKey, tabTwo.submission.idempotencyKey);
  assert.equal(generatedKeys, 1);
});

test('two tabs sending the shared pending state still create one order', async () => {
  const storage = new MemoryStorage();
  const locks = new MemoryLockManager();
  const server = new IdempotentOrderServer();
  const [tabOne, tabTwo] = await Promise.all([
    prepare(storage, sessionA, ordinaryCart, locks),
    prepare(storage, sessionA, ordinaryCart, locks),
  ]);

  await Promise.all([tabOne, tabTwo].map(({ submission }) =>
    executePendingOrderSubmission(storage, submission, async (pending) => ({
      kind: 'success',
      value: server.submit(pending),
    }))
  ));

  assert.equal(server.orders.size, 1);
  assert.equal(server.requestCount, 2);
});

test('lifecycle conflict blocks automatic retry and preserves pending cart state', async () => {
  const storage = new MemoryStorage();
  const prepared = await prepare(storage, sessionA);
  const result = await executePendingOrderSubmission(storage, prepared.submission, async () => ({ kind: 'lifecycle' }));
  const pending = readPendingOrderSubmission(storage, sessionA)!;

  assert.equal(result.kind, 'lifecycle');
  assert.equal(pending.status, 'lifecycle_blocked');
  assert.equal(shouldRecoverPendingOrderOnLoad(pending), false);
  assert.equal(pending.fingerprint, prepared.submission.fingerprint);
});

test('ordinary fast-path submit sends one request and keeps the server order canonical', async () => {
  const storage = new MemoryStorage();
  const server = new IdempotentOrderServer();
  const prepared = await prepare(storage, sessionA);
  const result = await executePendingOrderSubmission(storage, prepared.submission, async (submission) => ({
    kind: 'success',
    value: server.submit(submission),
  }));

  assert.equal(result.kind, 'success');
  assert.equal(server.requestCount, 1);
  assert.equal(server.orders.size, 1);
});
