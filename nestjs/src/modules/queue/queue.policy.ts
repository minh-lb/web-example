import { fail } from '../../common/http-error';
export const JOB_STATUSES = ['PENDING','PROCESSING','COMPLETED','FAILED'];
export function demoFailures(scenario: string): number {
  switch (scenario) { case 'success': return 0; case 'retry': return 2; case 'fail': return 3; default: return fail(400,'Invalid demo scenario'); }
}
