import { describe, expect, it } from 'vitest';
import { readMeetingEmailStream } from './readMeetingEmailStream';

describe('client email generation stream', () => {
  it('returns only the email text, not reasoning', async () => {
    const response = new Response([
      'data: {"type":"response.reasoning_summary_text.delta","delta":"Private reasoning"}',
      'data: {"type":"response.output_text.delta","delta":"Hi Alex,\\n\\nYour next steps"}',
      'data: {"type":"response.completed"}',
    ].join('\n'));
    expect(await readMeetingEmailStream(response)).toBe('Hi Alex,\n\nYour next steps');
  });
  it('does not accept an incomplete email', async () => {
    await expect(readMeetingEmailStream(new Response('data: {"type":"response.output_text.delta","delta":"Hi"}\n'))).rejects.toThrow('No complete email');
  });
  it('surfaces an access error without substituting a draft', async () => {
    await expect(readMeetingEmailStream(new Response(JSON.stringify({ message: 'AI access disabled' }), { status: 403 }))).rejects.toThrow('AI access disabled');
  });
});