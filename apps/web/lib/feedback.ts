export type FeedbackKind = 'success' | 'error' | 'info';

export function notifyUser(message: string, kind: FeedbackKind = 'success') {
  if (typeof window === 'undefined' || !message.trim()) return;
  window.dispatchEvent(new CustomEvent('pf360-feedback', { detail: { message, kind } }));
}
