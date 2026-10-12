/** Consume the streamed AI response without exposing reasoning in the email. */
export async function readMeetingEmailStream(response: Response): Promise<string> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error?.message || payload.error || 'Could not generate the email');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No email was returned');
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let complete = false;
  while (true) {
    const chunk = await reader.read();
    buffer += decoder.decode(chunk.value, { stream: !chunk.done });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    if (chunk.done && buffer) lines.push(buffer);
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') continue;
      const event = JSON.parse(raw);
      if (event.type === 'response.output_text.delta') text += event.delta || '';
      if (event.type === 'response.completed') complete = true;
      if (event.type === 'response.refusal.delta') throw new Error('The AI could not draft this email.');
      if (['error', 'response.failed', 'response.incomplete'].includes(event.type)) throw new Error(event.error?.message || event.response?.error?.message || 'Email generation did not complete');
    }
    if (chunk.done) break;
  }
  if (!complete || !text.trim()) throw new Error('No complete email was returned');
  return text.trim();
}