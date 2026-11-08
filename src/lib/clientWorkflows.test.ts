// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { clientSendBlock, renderWorkflowText } from '../../supabase/functions/client-workflow/rules';
describe('client workflows', () => {
  it('personalises messages to the client', () => expect(renderWorkflowText('Hi {{first_name}}, this is {{broker_name}}.', {first_name:'Alex',broker_name:'Damian'})).toBe('Hi Alex, this is Damian.'));
  it('blocks SMS without recorded consent', () => expect(clientSendBlock('sms',false,false,true)).toBe('No recorded SMS follow-up consent'));
  it('blocks email without recorded consent', () => expect(clientSendBlock('email',false,false,true)).toBe('No recorded EMAIL follow-up consent'));
  it('honours opt-outs even with consent', () => expect(clientSendBlock('sms',true,true,true)).toBe('Client opted out'));
  it('allows consented client follow-up', () => expect(clientSendBlock('sms',true,false,true)).toBeNull());
});