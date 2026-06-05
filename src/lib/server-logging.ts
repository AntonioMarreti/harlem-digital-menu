type LogFields = Record<string, string | number | boolean | null | undefined>;

function sanitizeLogFields(fields: LogFields): LogFields {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  );
}

export function logInfo(event: string, fields: LogFields = {}) {
  console.info(`[${event}]`, sanitizeLogFields(fields));
}

export function logWarn(event: string, fields: LogFields = {}) {
  console.warn(`[${event}]`, sanitizeLogFields(fields));
}

export function logError(event: string, error: unknown, fields: LogFields = {}) {
  console.error(`[${event}]`, sanitizeLogFields(fields), error);
}
