import { marked } from 'marked';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';

const markdownWriter = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });

/** Keep stored drafts compatible with the existing Markdown field. */
export function emailHtmlToMarkdown(html: string): string {
  return markdownWriter.turndown(DOMPurify.sanitize(html));
}

export function meetingMarkdownToHtml(markdown: string): string {
  // File-note tables become readable labelled bullets in an email.
  const lines = markdown.replace(/^```(?:markdown|md)?\s*\n/i, '').replace(/\n```\s*$/, '').split('\n');
  const output: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('|') && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      const headers = lines[i].split('|').slice(1, -1).map(value => value.trim());
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].split('|').slice(1, -1).map(value => value.trim());
        output.push(`- ${cells.map((cell, index) => index === 0 ? cell : `${headers[index] || 'Details'}: ${cell}`).join(' — ')}`);
        i++;
      }
      i--;
    } else {
      output.push(lines[i]);
    }
  }
  return DOMPurify.sanitize(marked.parse(output.join('\n'), { async: false }) as string, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'hr'],
    ALLOWED_ATTR: [],
  });
}

export function createMeetingEmail(summary: string, firstName: string, meetingDate: string): string {
  return meetingMarkdownToHtml(
    `Hi ${firstName || 'there'},\n\nThank you for your time at our meeting on ${meetingDate}. Here’s a recap of our discussion and the next steps.\n\n${summary}\n\nPlease let me know if anything above needs correcting or if you have any questions.\n\nKind regards,`,
  );
}

/** Inline formatting survives common email clients; never send editor-specific classes. */
export function formatMeetingEmailForSending(html: string): string {
  const doc = new DOMParser().parseFromString(DOMPurify.sanitize(html), 'text/html');
  doc.querySelectorAll('p').forEach(node => node.setAttribute('style', 'margin:0 0 16px;'));
  doc.querySelectorAll('h1,h2,h3').forEach(node => node.setAttribute('style', 'font-size:16px;font-weight:600;margin:24px 0 10px;'));
  doc.querySelectorAll('ul,ol').forEach(node => node.setAttribute('style', 'margin:0 0 16px;padding-left:24px;'));
  doc.querySelectorAll('li').forEach(node => node.setAttribute('style', 'margin:0 0 6px;'));
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;max-width:640px;">${doc.body.innerHTML}</div>`;
}