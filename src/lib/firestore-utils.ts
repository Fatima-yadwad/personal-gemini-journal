/**
 * Sanitizes an object before writing to Firestore by removing undefined values
 * and guaranteeing JSON serialization cleanliness.
 */
export function sanitizeFirestorePayload<T>(obj: T): T {
  if (obj === undefined || obj === null) {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj, (_, v) => (v === undefined ? null : v)));
}

/**
 * Normalizes Firebase error messages for user-friendly notifications.
 */
export function formatFirestoreError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    if (code === 'permission-denied') {
      return 'Access denied: You only have permission to view and edit your own journal entries.';
    }
    if (code === 'unauthenticated') {
      return 'Your session has expired. Please sign in again.';
    }
    if (code === 'unavailable') {
      return 'Cloud Firestore is currently unreachable. Please check your network connection.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected database error occurred. Please try again.';
}
