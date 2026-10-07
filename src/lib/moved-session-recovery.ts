export type BrowserTableSessionMarker = {
  version: 1;
  sourceTableIdOrSlug: string;
  tableSessionId: string;
  targetTableIdOrSlug: string;
  targetTableName: string;
  updatedAt: string;
};

export interface BrowserMarkerStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type MarkerVerification<T> =
  | { kind: 'active'; targetTableIdOrSlug: string; targetTableName: string; value: T }
  | { kind: 'moved'; targetTableIdOrSlug: string; targetTableName: string }
  | { kind: 'inactive' }
  | { kind: 'unavailable' };

export type MarkerRecoveryResult<T> =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'unavailable'; marker: BrowserTableSessionMarker }
  | { kind: 'inactive' }
  | { kind: 'active'; marker: BrowserTableSessionMarker; value: T }
  | { kind: 'moved'; marker: BrowserTableSessionMarker };

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getBrowserTableSessionMarkerKey(sourceTableIdOrSlug: string) {
  return `harlem_table_session:${encodeURIComponent(sourceTableIdOrSlug)}`;
}

export function writeBrowserTableSessionMarker(
  storage: BrowserMarkerStorage,
  marker: Omit<BrowserTableSessionMarker, 'version' | 'updatedAt'>
) {
  if (!marker.sourceTableIdOrSlug || !SESSION_ID_PATTERN.test(marker.tableSessionId) || !marker.targetTableIdOrSlug) return false;
  const value: BrowserTableSessionMarker = {
    version: 1,
    ...marker,
    updatedAt: new Date().toISOString(),
  };
  try {
    storage.setItem(getBrowserTableSessionMarkerKey(marker.sourceTableIdOrSlug), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readBrowserTableSessionMarker(
  storage: BrowserMarkerStorage,
  sourceTableIdOrSlug: string
): BrowserTableSessionMarker | null | 'invalid' {
  let raw: string | null;
  try {
    raw = storage.getItem(getBrowserTableSessionMarkerKey(sourceTableIdOrSlug));
  } catch {
    return 'invalid';
  }
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<BrowserTableSessionMarker>;
    if (
      value.version !== 1 ||
      value.sourceTableIdOrSlug !== sourceTableIdOrSlug ||
      typeof value.tableSessionId !== 'string' || !SESSION_ID_PATTERN.test(value.tableSessionId) ||
      typeof value.targetTableIdOrSlug !== 'string' || !value.targetTableIdOrSlug ||
      typeof value.targetTableName !== 'string' ||
      typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt))
    ) return 'invalid';
    return value as BrowserTableSessionMarker;
  } catch {
    return 'invalid';
  }
}

export function clearBrowserTableSessionMarker(storage: BrowserMarkerStorage, sourceTableIdOrSlug: string) {
  try {
    storage.removeItem(getBrowserTableSessionMarkerKey(sourceTableIdOrSlug));
  } catch {
    // A stale marker is revalidated on the next visit; storage errors must not create a session.
  }
}

export async function recoverBrowserTableSession<T>(
  storage: BrowserMarkerStorage,
  sourceTableIdOrSlug: string,
  verify: (marker: BrowserTableSessionMarker) => Promise<MarkerVerification<T>>
): Promise<MarkerRecoveryResult<T>> {
  const marker = readBrowserTableSessionMarker(storage, sourceTableIdOrSlug);
  if (marker === null) return { kind: 'none' };
  if (marker === 'invalid') return { kind: 'invalid' };

  let verification: MarkerVerification<T>;
  try {
    verification = await verify(marker);
  } catch {
    verification = { kind: 'unavailable' };
  }

  if (verification.kind === 'unavailable') return { kind: 'unavailable', marker };
  if (verification.kind === 'inactive') {
    clearBrowserTableSessionMarker(storage, sourceTableIdOrSlug);
    return { kind: 'inactive' };
  }

  const updatedMarker = {
    sourceTableIdOrSlug,
    tableSessionId: marker.tableSessionId,
    targetTableIdOrSlug: verification.targetTableIdOrSlug,
    targetTableName: verification.targetTableName,
  };
  writeBrowserTableSessionMarker(storage, updatedMarker);
  const savedMarker = readBrowserTableSessionMarker(storage, sourceTableIdOrSlug);
  const recoveredMarker = savedMarker && savedMarker !== 'invalid' &&
    savedMarker.targetTableIdOrSlug === verification.targetTableIdOrSlug ? savedMarker : {
    ...marker,
    ...updatedMarker,
  };

  return verification.kind === 'active'
    ? { kind: 'active', marker: recoveredMarker, value: verification.value }
    : { kind: 'moved', marker: recoveredMarker };
}
