/** Normalize legacy integer versions and the supported major.minor format. */
export function normalizeVersion(value: unknown): string {
  const raw = String(value ?? '1').trim().replace(/^v/i, '').replace(',', '.');
  const parts = raw.split('.');
  if (parts.length < 1 || parts.length > 2 || parts.some(part => !/^\d+$/.test(part))) return '1';
  return parts.map(part => String(Math.min(100, Math.max(1, Number(part) || 1)))).join('.');
}

export function parseVersionInput(value: string): string | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d{1,3}(?:\.\d{1,3})?$/.test(normalized)) return null;
  const parts = normalized.split('.').map(Number);
  if (parts.some(part => !Number.isInteger(part) || part < 1 || part > 100)) return null;
  return parts.join('.');
}

export function suggestVersion(current: string): string {
  const parts = normalizeVersion(current).split('.').map(Number);
  if (parts.length === 1) return `${Math.min(parts[0] + 1, 100)}`;
  if (parts[1] < 100) return `${parts[0]}.${parts[1] + 1}`;
  return parts[0] < 100 ? `${parts[0] + 1}.1` : '100.100';
}
