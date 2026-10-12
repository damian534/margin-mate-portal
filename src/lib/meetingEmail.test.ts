import { describe, expect, it } from 'vitest';
import { createMeetingEmail, meetingMarkdownToHtml, emailHtmlToMarkdown, formatMeetingEmailForSending } from './meetingEmail';

describe('meeting client emails', () => {
  it('renders formatting instead of raw Markdown and converts tables into labelled bullets', () => {
    const html = meetingMarkdownToHtml('## Next steps\n\n**Savings**\n\n| Item | Amount |\n| --- | --- |\n| Deposit | $50,000 |');
    expect(html).toContain('<h2>Next steps</h2>');
    expect(html).toContain('<strong>Savings</strong>');
    expect(html).toContain('Deposit — Amount: $50,000');
    expect(html).not.toContain('<table');
    expect(html).not.toContain('| ---');
  });
  it('creates a greeting and closing without changing the internal summary', () => {
    const html = createMeetingEmail('## Strategy\nKeep $20,000 in savings.', 'Alex', '12 Oct 2026');
    expect(html).toContain('Hi Alex,');
    expect(html).toContain('12 Oct 2026');
    expect(html).toContain('$20,000');
    expect(html).toContain('Kind regards,');
  });
  it('preserves edited formatting when reopening a stored draft', () => {
    const html = '<p>Hi Alex,</p><p><strong>Your next steps</strong></p><ul><li>Send payslips</li></ul>';
    const restored = meetingMarkdownToHtml(emailHtmlToMarkdown(html));
    expect(restored).toContain('<strong>Your next steps</strong>');
    expect(restored).toContain('<li>Send payslips</li>');
    expect(restored.match(/Hi Alex/g)).toHaveLength(1);
  });
  it('removes unsafe markup and sends email-compatible formatting', () => {
    const html = formatMeetingEmailForSending('<p onclick="alert(1)">Hello</p><script>alert(1)</script>');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('<script');
    expect(html).toContain('margin:0 0 16px');
  });
});