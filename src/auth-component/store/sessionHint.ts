const STORAGE_KEY = 'fuju-auth:session-hint';

export interface SessionHint {
  readonly userId: string;
}

function safeStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readSessionHint(): SessionHint | null {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const obj = parsed as { userId?: unknown };
    if (typeof obj.userId !== 'string') return null;
    return { userId: obj.userId };
  } catch {
    return null;
  }
}

export function writeSessionHint(userId: string): void {
  const storage = safeStorage();
  if (!storage) return;
  const payload: SessionHint = { userId };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* best-effort persistence — ignore quota/security errors */
  }
}

export function clearSessionHint(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
