import { randomBytes } from 'node:crypto';

export function createId(prefix: string): string {
  const iso = new Date().toISOString();
  const datePart = iso.slice(0, 10).replace(/-/g, '');
  const timePart = iso.slice(11, 19).replace(/:/g, '');
  const rnd = randomBytes(4).toString('hex');
  return `${prefix}_${datePart}_${timePart}_${rnd}`;
}
