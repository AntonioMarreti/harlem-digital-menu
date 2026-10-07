import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getBrowserTableSessionMarkerKey,
  readBrowserTableSessionMarker,
  recoverBrowserTableSession,
  writeBrowserTableSessionMarker,
  type BrowserMarkerStorage,
} from '../src/lib/moved-session-recovery';

class MemoryStorage implements BrowserMarkerStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const source = 'table-a';
const target = 'table-b';
const sessionId = '11111111-1111-4111-8111-111111111111';

function saveSourceMarker(storage: MemoryStorage) {
  assert.equal(writeBrowserTableSessionMarker(storage, {
    sourceTableIdOrSlug: source,
    tableSessionId: sessionId,
    targetTableIdOrSlug: source,
    targetTableName: 'Стол A',
  }), true);
}

test('browser records the active visit and refreshes its marker after staff moves the same session', async () => {
  const storage = new MemoryStorage();
  saveSourceMarker(storage);

  const recovered = await recoverBrowserTableSession(storage, source, async (marker) => {
    assert.equal(marker.tableSessionId, sessionId);
    return { kind: 'moved', targetTableIdOrSlug: target, targetTableName: 'Стол B' };
  });

  assert.equal(recovered.kind, 'moved');
  assert.equal(recovered.marker.targetTableIdOrSlug, target);
  const marker = readBrowserTableSessionMarker(storage, source);
  assert.ok(marker && marker !== 'invalid');
  assert.equal(marker.targetTableIdOrSlug, target);
});

test('reload of source QR recovers and redirects the same active session without source bootstrap', async () => {
  const storage = new MemoryStorage();
  saveSourceMarker(storage);
  let bootstrapCalls = 0;
  const recovered = await recoverBrowserTableSession(storage, source, async () => ({
    kind: 'moved',
    targetTableIdOrSlug: target,
    targetTableName: 'Стол B',
  }));
  if (recovered.kind === 'none' || recovered.kind === 'inactive') bootstrapCalls += 1;

  assert.equal(recovered.kind, 'moved');
  assert.equal(recovered.marker.tableSessionId, sessionId);
  assert.equal(bootstrapCalls, 0);
  assert.equal(`/t/${recovered.marker.targetTableIdOrSlug}`, '/t/table-b');
});

test('recovered target can resume the original session without creating a different session', async () => {
  const storage = new MemoryStorage();
  saveSourceMarker(storage);
  const recovered = await recoverBrowserTableSession(storage, source, async () => ({
    kind: 'active',
    targetTableIdOrSlug: target,
    targetTableName: 'Стол B',
    value: { session: { id: sessionId }, table: { qrSlug: target } },
  }));

  assert.equal(recovered.kind, 'active');
  assert.equal(recovered.value.session.id, sessionId);
  assert.equal(recovered.marker.targetTableIdOrSlug, target);
});

test('move recovery leaves the session-scoped cart and pending idempotency snapshot untouched', async () => {
  const storage = new MemoryStorage();
  saveSourceMarker(storage);
  storage.setItem(`harlem_cart:${sessionId}`, '[saved cart]');
  storage.setItem(`harlem_pending_order:${sessionId}`, '{"idempotencyKey":"same-key"}');

  await recoverBrowserTableSession(storage, source, async () => ({
    kind: 'moved', targetTableIdOrSlug: target, targetTableName: 'Стол B',
  }));

  assert.equal(storage.getItem(`harlem_cart:${sessionId}`), '[saved cart]');
  assert.equal(storage.getItem(`harlem_pending_order:${sessionId}`), '{"idempotencyKey":"same-key"}');
});

test('a different browser without a visit marker can start a new visit on the free source QR', async () => {
  const otherBrowser = new MemoryStorage();
  let bootstrappedNewSourceSession = false;
  const recovered = await recoverBrowserTableSession(otherBrowser, source, async () => {
    throw new Error('verification must not run without a marker');
  });
  if (recovered.kind === 'none') bootstrappedNewSourceSession = true;

  assert.equal(bootstrappedNewSourceSession, true);
  assert.equal(readBrowserTableSessionMarker(otherBrowser, source), null);
});

test('completed visit clears its marker and allows the source QR to start a later visit', async () => {
  const storage = new MemoryStorage();
  saveSourceMarker(storage);
  const recovered = await recoverBrowserTableSession(storage, source, async () => ({ kind: 'inactive' }));

  assert.equal(recovered.kind, 'inactive');
  assert.equal(readBrowserTableSessionMarker(storage, source), null);
  const nextVisit = await recoverBrowserTableSession(storage, source, async () => ({ kind: 'inactive' }));
  assert.equal(nextVisit.kind, 'none');
});

test('a marker follows a session if staff moves it again before the browser returns', async () => {
  const storage = new MemoryStorage();
  saveSourceMarker(storage);
  await recoverBrowserTableSession(storage, source, async () => ({
    kind: 'moved', targetTableIdOrSlug: target, targetTableName: 'Стол B',
  }));
  const thirdTable = await recoverBrowserTableSession(storage, source, async () => ({
    kind: 'moved', targetTableIdOrSlug: 'table-c', targetTableName: 'Стол C',
  }));

  assert.equal(thirdTable.kind, 'moved');
  assert.equal(thirdTable.marker.targetTableIdOrSlug, 'table-c');
});

test('invalid or damaged marker blocks source bootstrap and is not trusted for redirection', async () => {
  const storage = new MemoryStorage();
  storage.setItem(getBrowserTableSessionMarkerKey(source), '{broken json');
  let verificationCalls = 0;
  const recovered = await recoverBrowserTableSession(storage, source, async () => {
    verificationCalls += 1;
    return { kind: 'inactive' };
  });

  assert.equal(recovered.kind, 'invalid');
  assert.equal(verificationCalls, 0);
  assert.equal(storage.getItem(getBrowserTableSessionMarkerKey(source)), '{broken json');
});

test('temporary verification failure keeps marker and blocks accidental source bootstrap', async () => {
  const storage = new MemoryStorage();
  saveSourceMarker(storage);
  const recovered = await recoverBrowserTableSession(storage, source, async () => ({ kind: 'unavailable' }));

  assert.equal(recovered.kind, 'unavailable');
  const marker = readBrowserTableSessionMarker(storage, source);
  assert.ok(marker && marker !== 'invalid');
  assert.equal(marker.tableSessionId, sessionId);
});

test('marker is isolated to this browser and source QR', () => {
  const firstBrowser = new MemoryStorage();
  const secondBrowser = new MemoryStorage();
  saveSourceMarker(firstBrowser);

  assert.notEqual(getBrowserTableSessionMarkerKey(source), getBrowserTableSessionMarkerKey(target));
  assert.equal(readBrowserTableSessionMarker(secondBrowser, source), null);
});
