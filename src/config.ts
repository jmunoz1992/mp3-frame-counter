function positiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return value;
}

export const MAX_UPLOAD_SIZE_BYTES = positiveIntFromEnv(
  'MAX_UPLOAD_SIZE_BYTES',
  500 * 1024 * 1024,
);

export const UPLOAD_FIELD_NAME = 'file';

export const PORT = positiveIntFromEnv('PORT', 3000);
