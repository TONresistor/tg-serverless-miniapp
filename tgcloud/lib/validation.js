import { EndpointError } from 'sdk';

export function reject(message, code = 'BAD_REQUEST', extra = {}) {
  throw new EndpointError(message, { code, ...extra });
}
export function positiveID(value) {
  if (!Number.isSafeInteger(value) || value <= 0) reject('bad id');
  return value;
}
export function text(value, max, required = true, label = 'field') {
  if (typeof value !== 'string') {
    if (!required && value == null) return '';
    reject(`${label} is required`);
  }
  const result = value.trim();
  if (required && !result) reject(`${label} is required`);
  if ([...result].length > max) reject(`${label} is too long`);
  return result;
}
export function databaseError(error) {
  const message = String(error.message ?? error);
  if (message.includes('MTONGA_COOLDOWN'))
    reject('too many requests', 'RATE_LIMIT');
  if (message.includes('MTONGA_NOT_FOUND')) reject('not found', 'NOT_FOUND');
  throw error;
}
