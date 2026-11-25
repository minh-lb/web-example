import { fail } from '../../common/http-error';
import { emailValid, str } from '../../common/validation';

export type CustomerUpdate = { name?: string; email?: string; phone?: string };

export function customerUpdate(body: unknown): CustomerUpdate {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Invalid customer data');
  const input = body as Record<string, unknown>;
  const result: CustomerUpdate = {};
  if (Object.hasOwn(input, 'name')) result.name = str(input.name, 2, 100, 'Enter a customer name', 'Customer name may not exceed 100 characters');
  if (Object.hasOwn(input, 'email')) {
    if (!emailValid(input.email)) fail(400, 'Enter a valid email');
    result.email = input.email;
  }
  if (Object.hasOwn(input, 'phone')) result.phone = str(input.phone, 8, 20, 'Enter a phone number', 'Phone may not exceed 20 characters');
  if (!Object.keys(result).length) fail(400, 'Provide at least one customer field');
  if (Object.keys(input).some(key => !['name', 'email', 'phone'].includes(key))) fail(400, 'Unknown customer field');
  return result;
}
