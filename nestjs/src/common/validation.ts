import { fail } from './http-error';
export function today(offset = 0): string {
  const date = new Date(); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0,10);
}
export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0,10) === value;
}
export function positive(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^\d+$/.test(String(value))) return 0;
  const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : 0;
}
export function id(value: unknown, message: string): number { return positive(value) || fail(400,message); }
export function page(value: unknown, fallback = 1) { return Math.min(positive(value) || fallback, 100000000); }
export function emailValid(value: unknown): value is string { return typeof value === 'string' && value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
export function str(value: unknown, min: number, max: number, short: string, long: string): string {
  if (typeof value !== 'string' || value.trim().length < min) return fail(400,short);
  const v = value.trim(); if (v.length > max) return fail(400,long); return v;
}

export type Input = Record<string, unknown>;
export const string = (value: unknown) => typeof value === 'string' ? value : '';
