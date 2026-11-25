import { fail } from '../../common/http-error';
import { positive, str } from '../../common/validation';
export function serviceInput(body: Record<string, unknown>, partial = false): Record<string, string|number|boolean> {
  const result: Record<string,string|number|boolean> = {};
  const validators: Record<string,(v:unknown)=>string|number|boolean> = {
    name: v => str(v,2,80,'Enter a service name','Name may not exceed 80 characters'),
    description: v => str(v,5,300,'Describe this service','Description may not exceed 300 characters'),
    category: v => typeof v === 'string' && ['Consultation','Wellness','Coaching'].includes(v) ? v : fail(400,'Invalid category'),
    durationMinutes: v => positive(v) >= 15 && positive(v) <= 240 ? positive(v) : fail(400,'Invalid duration'),
    price: v => positive(v) && positive(v) <= 4294967295 ? positive(v) : fail(400,'Price must be greater than zero'),
    color: v => typeof v === 'string' && ['indigo','rose','amber','cyan','emerald','violet'].includes(v) ? v : fail(400,'Invalid color'),
    active: v => typeof v === 'boolean' ? v : v === 0 || v === 1 || v === '0' || v === '1' ? Number(v) === 1 : fail(400,'Invalid active flag'),
  };
  for (const [key, validate] of Object.entries(validators)) if (!partial || Object.hasOwn(body,key)) result[key === 'durationMinutes' ? 'duration_minutes' : key] = validate(body[key]);
  return result;
}
