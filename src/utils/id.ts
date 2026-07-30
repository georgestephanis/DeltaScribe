/**
 * Generates a client-side unique identifier, preferring crypto.randomUUID()
 * where available (all supported browsers) and falling back to a
 * Math.random()-based id otherwise.
 */
export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
}
