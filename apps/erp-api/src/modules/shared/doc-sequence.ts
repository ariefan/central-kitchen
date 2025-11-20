import { randomBytes } from 'crypto';

export type DocSequenceOptions = {
  prefix?: string;
  tenantId?: string;
  date?: Date;
  randomLength?: number;
  includeTime?: boolean;
};

const DEFAULT_RANDOM_LENGTH = 4;

/**
 * Generates a human-friendly document number with optional tenant + date context.
 * This helper is intentionally stateless to stay simple; if strict sequencing or
 * collision guarantees are required, combine it with a database sequence.
 */
export function generateDocNumber(entity: string, options: DocSequenceOptions = {}) {
  const {
    prefix = entity,
    tenantId,
    date = new Date(),
    randomLength = DEFAULT_RANDOM_LENGTH,
    includeTime = false,
  } = options;

  const normalizedPrefix = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  const datePart = `${y}${m}${d}`;
  const timePart = includeTime ? `${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}` : null;
  const tenantPart = tenantId ? tenantId.replace(/-/g, '').slice(-4).toUpperCase() : null;
  const randomPart = randomBytes(Math.ceil(randomLength / 2))
    .toString('hex')
    .slice(0, randomLength)
    .toUpperCase();

  return [
    normalizedPrefix,
    tenantPart,
    datePart,
    timePart,
    randomPart,
  ].filter(Boolean).join('-');
}
