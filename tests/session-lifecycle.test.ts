import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getEmptySessionReleaseConflict,
  getSessionCloseConflict,
  type SessionLifecycleSnapshot,
} from '../src/lib/table-session-lifecycle';

const activeSession: SessionLifecycleSnapshot = {
  id: 'session-1',
  tableId: 'table-1',
  status: 'active',
};

test('active session without blocking work can be closed', () => {
  assert.equal(getSessionCloseConflict(activeSession, activeSession.id, activeSession.tableId, [], []), null);
});

test('lifecycle service model closes an eligible active session', async () => {
  const model = new SerializedLifecycleModel();
  assert.equal(await model.close(), null);
  assert.equal(model.session.status, 'closed');
});

test('new, accepted, and preparing orders block close', () => {
  for (const status of ['new', 'accepted', 'preparing']) {
    const conflict = getSessionCloseConflict(activeSession, activeSession.id, activeSession.tableId, [status], []);
    assert.equal(conflict?.code, 'TABLE_SESSION_HAS_ACTIVE_WORK');
  }
});

test('delivered, closed, and cancelled orders do not block close', () => {
  for (const status of ['delivered', 'closed', 'cancelled']) {
    assert.equal(getSessionCloseConflict(activeSession, activeSession.id, activeSession.tableId, [status], []), null);
  }
});

test('new staff call blocks close, while handled and cancelled calls do not', () => {
  assert.equal(
    getSessionCloseConflict(activeSession, activeSession.id, activeSession.tableId, [], ['new'])?.code,
    'TABLE_SESSION_HAS_ACTIVE_WORK'
  );
  for (const status of ['handled', 'cancelled']) {
    assert.equal(getSessionCloseConflict(activeSession, activeSession.id, activeSession.tableId, [], [status]), null);
  }
});

test('a stale staff action cannot close a replacement session for the same table', () => {
  const replacementSession = { ...activeSession, id: 'session-2' };
  const conflict = getSessionCloseConflict(replacementSession, 'session-1', activeSession.tableId, [], []);
  assert.equal(conflict?.code, 'TABLE_SESSION_STALE');
  assert.equal(replacementSession.status, 'active');
});

test('stale close action leaves a replacement session active', async () => {
  const model = new SerializedLifecycleModel({ ...activeSession, id: 'session-2' });
  const conflict = await model.close('session-1');
  assert.equal(conflict?.code, 'TABLE_SESSION_STALE');
  assert.equal(model.session.id, 'session-2');
  assert.equal(model.session.status, 'active');
});

test('release-empty rejects a session with an order or a new call', () => {
  assert.equal(
    getEmptySessionReleaseConflict(activeSession, activeSession.id, 1, [])?.code,
    'TABLE_SESSION_HAS_ORDERS'
  );
  assert.equal(
    getEmptySessionReleaseConflict(activeSession, activeSession.id, 0, ['new'])?.code,
    'TABLE_SESSION_HAS_ACTIVE_CALLS'
  );
  assert.equal(getEmptySessionReleaseConflict(activeSession, activeSession.id, 0, ['handled', 'cancelled']), null);
});

/** Test-only transaction model: production uses pg_advisory_xact_lock inside Neon db.batch. */
class SerializedLifecycleModel {
  session: SessionLifecycleSnapshot;
  readonly orderStatuses: string[] = [];
  readonly callStatuses: string[] = [];
  private tail: Promise<void> = Promise.resolve();

  constructor(session: SessionLifecycleSnapshot = { ...activeSession }) {
    this.session = session;
  }

  private async transaction<T>(work: () => T): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return work();
    } finally {
      release();
    }
  }

  submitOrder() {
    return this.transaction(() => {
      if (this.session.status !== 'active') throw new Error('session closed');
      this.orderStatuses.push('new');
    });
  }

  submitCall() {
    return this.transaction(() => {
      if (this.session.status !== 'active') throw new Error('session closed');
      this.callStatuses.push('new');
    });
  }

  close(expectedSessionId = this.session.id) {
    return this.transaction(() => {
      const conflict = getSessionCloseConflict(
        this.session,
        expectedSessionId,
        this.session.tableId,
        this.orderStatuses,
        this.callStatuses
      );
      if (conflict) return conflict;
      this.session = { ...this.session, status: 'closed' };
      return null;
    });
  }

  releaseEmpty() {
    return this.transaction(() => {
      const conflict = getEmptySessionReleaseConflict(
        this.session,
        this.session.id,
        this.orderStatuses.length,
        this.callStatuses
      );
      if (conflict) return conflict;
      this.session = { ...this.session, status: 'closed' };
      return null;
    });
  }
}

test('concurrent order submit and close cannot leave an order in a closed session', async () => {
  for (const closeFirst of [false, true]) {
    const model = new SerializedLifecycleModel();
    const actions = closeFirst
      ? [model.close(), model.submitOrder()]
      : [model.submitOrder(), model.close()];
    await Promise.allSettled(actions);
    assert.equal(model.session.status === 'closed' && model.orderStatuses.length > 0, false);
  }
});

test('concurrent order submit and release-empty cannot leave an order in a closed session', async () => {
  for (const releaseFirst of [false, true]) {
    const model = new SerializedLifecycleModel();
    const actions = releaseFirst
      ? [model.releaseEmpty(), model.submitOrder()]
      : [model.submitOrder(), model.releaseEmpty()];
    await Promise.allSettled(actions);
    assert.equal(model.session.status === 'closed' && model.orderStatuses.length > 0, false);
  }
});

test('concurrent call submit and release-empty cannot leave an active call in a closed session', async () => {
  for (const releaseFirst of [false, true]) {
    const model = new SerializedLifecycleModel();
    const actions = releaseFirst
      ? [model.releaseEmpty(), model.submitCall()]
      : [model.submitCall(), model.releaseEmpty()];
    await Promise.allSettled(actions);
    assert.equal(model.session.status === 'closed' && model.callStatuses.includes('new'), false);
  }
});
