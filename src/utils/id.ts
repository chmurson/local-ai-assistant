import { randomBytes } from 'node:crypto';

export function createId(prefix: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rnd = randomBytes(4).toString('hex');
  return `${prefix}_${datePart}_${rnd}`;
}
