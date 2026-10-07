export type PendingOrderItem = {
  id: string;
  quantity: number;
  options?: {
    choice?: string;
    notes?: string;
  };
};

export type PendingOrderStatus = 'pending' | 'uncertain' | 'confirmed' | 'rejected' | 'lifecycle_blocked';

export type PendingOrderSubmission = {
  version: 1;
  tableSessionId: string;
  idempotencyKey: string;
  fingerprint: string;
  items: PendingOrderItem[];
  status: PendingOrderStatus;
  createdAt: string;
};

export interface PendingOrderStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PendingOrderLockManager {
  request<T>(name: string, callback: () => T | Promise<T>): Promise<T>;
}

export type PreparedPendingSubmission = {
  submission: PendingOrderSubmission;
  matchesRequestedCart: boolean;
  reused: boolean;
};

export type PendingOrderAttemptResult<T> =
  | { kind: 'success'; value?: T }
  | { kind: 'rejected' | 'lifecycle' | 'uncertain'; value?: T };

export function getPendingOrderStorageKey(tableSessionId: string) {
  return `harlem_pending_order:${encodeURIComponent(tableSessionId)}`;
}

function normalizeOrderItems(items: readonly PendingOrderItem[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cannot persist an empty order');
  }

  return items.map((item) => {
    if (!item || typeof item.id !== 'string' || !item.id.trim()) {
      throw new Error('Invalid order item ID');
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Invalid order item quantity');
    }

    const normalized: PendingOrderItem = { id: item.id, quantity: item.quantity };
    const choice = item.options?.choice;
    const notes = item.options?.notes;
    if (choice !== undefined && typeof choice !== 'string') {
      throw new Error('Invalid order item choice');
    }
    if (notes !== undefined && typeof notes !== 'string') {
      throw new Error('Invalid order item notes');
    }

    if (choice || notes) {
      normalized.options = {};
      if (choice) normalized.options.choice = choice;
      if (notes) normalized.options.notes = notes;
    }
    return normalized;
  }).sort((left, right) => {
    const leftKey = `${left.id}\u0000${left.quantity}\u0000${JSON.stringify(left.options || {})}`;
    const rightKey = `${right.id}\u0000${right.quantity}\u0000${JSON.stringify(right.options || {})}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
}

export function getOrderSnapshotFingerprint(
  tableSessionId: string,
  items: readonly PendingOrderItem[]
) {
  return JSON.stringify({ tableSessionId, items: normalizeOrderItems(items) });
}

export function getConfirmedCartDisposition(
  submission: PendingOrderSubmission,
  inMemoryItems: readonly PendingOrderItem[],
  durableItems: readonly PendingOrderItem[]
): 'memory' | 'durable' | 'clear' {
  const inMemoryFingerprint = inMemoryItems.length
    ? getOrderSnapshotFingerprint(submission.tableSessionId, inMemoryItems)
    : null;
  const durableFingerprint = durableItems.length
    ? getOrderSnapshotFingerprint(submission.tableSessionId, durableItems)
    : null;

  if (inMemoryFingerprint && inMemoryFingerprint !== submission.fingerprint) return 'memory';
  if (durableFingerprint && durableFingerprint !== submission.fingerprint) return 'durable';
  return 'clear';
}

export function readPendingOrderSubmission(
  storage: PendingOrderStorage,
  tableSessionId: string
): PendingOrderSubmission | null {
  let serialized: string | null;
  try {
    serialized = storage.getItem(getPendingOrderStorageKey(tableSessionId));
  } catch {
    throw new Error('Не удалось прочитать состояние отправки заказа из памяти браузера');
  }
  if (!serialized) return null;

  try {
    const value = JSON.parse(serialized) as Partial<PendingOrderSubmission>;
    if (
      value.version !== 1 ||
      value.tableSessionId !== tableSessionId ||
      typeof value.idempotencyKey !== 'string' ||
      !value.idempotencyKey ||
      typeof value.fingerprint !== 'string' ||
      !Array.isArray(value.items) ||
      !['pending', 'uncertain', 'confirmed', 'rejected', 'lifecycle_blocked'].includes(value.status || '') ||
      typeof value.createdAt !== 'string' ||
      getOrderSnapshotFingerprint(tableSessionId, value.items as PendingOrderItem[]) !== value.fingerprint
    ) {
      throw new Error('invalid pending order state');
    }
    return value as PendingOrderSubmission;
  } catch {
    // Never silently replace an unreadable attempt with a new idempotency key.
    throw new Error('Сохранённое состояние отправки заказа повреждено; повторная отправка остановлена');
  }
}

function preparePendingOrderSubmissionSync(
  storage: PendingOrderStorage,
  tableSessionId: string,
  items: readonly PendingOrderItem[],
  createIdempotencyKey: () => string
): PreparedPendingSubmission {
  const normalizedItems = normalizeOrderItems(items);
  const fingerprint = JSON.stringify({ tableSessionId, items: normalizedItems });
  const existing = readPendingOrderSubmission(storage, tableSessionId);

  if (existing && existing.fingerprint === fingerprint) {
    return { submission: existing, matchesRequestedCart: true, reused: true };
  }

  if (existing && existing.status !== 'rejected') {
    return { submission: existing, matchesRequestedCart: false, reused: true };
  }

  const submission: PendingOrderSubmission = {
    version: 1,
    tableSessionId,
    idempotencyKey: createIdempotencyKey(),
    fingerprint,
    items: normalizedItems,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  try {
    storage.setItem(getPendingOrderStorageKey(tableSessionId), JSON.stringify(submission));
  } catch {
    throw new Error('Не удалось сохранить отправку заказа перед запросом. Проверьте память браузера и повторите попытку.');
  }

  return { submission, matchesRequestedCart: true, reused: false };
}

export async function preparePendingOrderSubmission(
  storage: PendingOrderStorage,
  locks: PendingOrderLockManager | undefined,
  tableSessionId: string,
  items: readonly PendingOrderItem[],
  createIdempotencyKey: () => string
): Promise<PreparedPendingSubmission> {
  const prepare = () => preparePendingOrderSubmissionSync(
    storage,
    tableSessionId,
    items,
    createIdempotencyKey
  );

  if (!locks) return prepare();
  return locks.request(`harlem-pending-order:${encodeURIComponent(tableSessionId)}`, prepare);
}

export function updatePendingOrderStatus(
  storage: PendingOrderStorage,
  submission: PendingOrderSubmission,
  status: PendingOrderStatus
) {
  const current = readPendingOrderSubmission(storage, submission.tableSessionId);
  if (!current || current.idempotencyKey !== submission.idempotencyKey || current.fingerprint !== submission.fingerprint) {
    return false;
  }
  // A concurrent tab may already have received success. Never let a late
  // timeout/rejection overwrite that durable confirmation.
  if (current.status === 'confirmed' && status !== 'confirmed') return false;

  try {
    storage.setItem(getPendingOrderStorageKey(submission.tableSessionId), JSON.stringify({ ...current, status }));
    return true;
  } catch {
    return false;
  }
}

export function clearPendingOrderSubmission(
  storage: PendingOrderStorage,
  submission: PendingOrderSubmission
) {
  const current = readPendingOrderSubmission(storage, submission.tableSessionId);
  if (!current || current.idempotencyKey !== submission.idempotencyKey || current.fingerprint !== submission.fingerprint) {
    return false;
  }

  try {
    storage.removeItem(getPendingOrderStorageKey(submission.tableSessionId));
    return true;
  } catch {
    return false;
  }
}

export function shouldRecoverPendingOrderOnLoad(submission: PendingOrderSubmission) {
  return submission.status === 'pending' || submission.status === 'uncertain';
}

export function finalizeConfirmedPendingOrder(
  storage: PendingOrderStorage,
  submission: PendingOrderSubmission,
  reconcileDurableCart: () => boolean
) {
  const current = readPendingOrderSubmission(storage, submission.tableSessionId);
  if (
    !current ||
    current.idempotencyKey !== submission.idempotencyKey ||
    current.fingerprint !== submission.fingerprint ||
    current.status !== 'confirmed'
  ) {
    return false;
  }

  // Keep the confirmed key until the caller has durably reconciled cart state.
  if (!reconcileDurableCart()) return false;
  return clearPendingOrderSubmission(storage, submission);
}

export async function executePendingOrderSubmission<T>(
  storage: PendingOrderStorage,
  submission: PendingOrderSubmission,
  send: (submission: PendingOrderSubmission) => Promise<PendingOrderAttemptResult<T>>
): Promise<PendingOrderAttemptResult<T>> {
  updatePendingOrderStatus(storage, submission, 'pending');

  let result: PendingOrderAttemptResult<T>;
  const existing = readPendingOrderSubmission(storage, submission.tableSessionId);
  if (
    existing?.idempotencyKey === submission.idempotencyKey &&
    existing.fingerprint === submission.fingerprint &&
    existing.status === 'confirmed'
  ) {
    return { kind: 'success' };
  }

  try {
    result = await send(submission);
  } catch {
    result = { kind: 'uncertain' };
  }

  if (result.kind === 'success') {
    updatePendingOrderStatus(storage, submission, 'confirmed');
  } else if (result.kind === 'lifecycle') {
    updatePendingOrderStatus(storage, submission, 'lifecycle_blocked');
  } else if (result.kind === 'rejected') {
    updatePendingOrderStatus(storage, submission, 'rejected');
  } else {
    updatePendingOrderStatus(storage, submission, 'uncertain');
  }

  return result;
}
