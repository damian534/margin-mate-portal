import { expect, it } from 'vitest';
import { twilioSendError } from '../../supabase/functions/_shared/twilioErrors';
it('identifies AU1 messaging incompatibility without suggesting a retry or claiming delivery', () => {
  expect(twilioSendError(404, JSON.stringify({ message: "Endpoint is not supported in realm 'au1'" }))).toContain('Update the connection to US1');
  expect(twilioSendError(403, 'permission denied')).not.toContain('US1');
});