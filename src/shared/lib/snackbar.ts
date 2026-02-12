// ── Snackbar event system ─────────────────────────────────────────────────
// Module-level pub/sub so that non-React code (MutationCache) can trigger
// snackbar messages picked up by <SnackbarHost>.

export type SnackbarType = 'success' | 'error' | 'info';

export interface SnackbarMessage {
  text: string;
  type: SnackbarType;
  duration?: number;
}

type Listener = (msg: SnackbarMessage) => void;

const listeners = new Set<Listener>();

export function subscribeSnackbar(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function showSnackbar(text: string, type: SnackbarType = 'info', duration?: number) {
  const msg: SnackbarMessage = { text, type, duration };
  listeners.forEach((fn) => fn(msg));
}
