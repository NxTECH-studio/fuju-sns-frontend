const STORAGE_KEY = 'fuju-auth:known-user-ids';

function safeStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readKnown(storage: Storage): Set<string> {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

export function isNewSocialUser(userId: string): boolean {
  const storage = safeStorage();
  if (!storage) return false;
  return !readKnown(storage).has(userId);
}

export function markSocialUserSeen(userId: string): void {
  const storage = safeStorage();
  if (!storage) return;
  const known = readKnown(storage);
  known.add(userId);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify([...known]));
  } catch {
    /* best-effort persistence — ignore quota/security errors */
  }
}
