import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SYSTEM_PROMPT = `You are an expert Australian mortgage broker assistant for Margin Finance. You turn raw meeting/call transcripts between a broker and a client into a clean, professional broker file note in Markdown.

Your job:
- READ the entire transcript carefully and identify what actually matters for a mortgage broker file note: client identity, loan purpose, target property, financial position (income, assets, liabilities), strategy discussed, decisions made, action items, and outstanding info.
- IGNORE small talk, irrelevant tangents, repeated points, technology hiccups ("can you hear me", "let me share my screen"), filler, and anything that does not affect the deal.
- DECIDE the most useful structure for THIS specific meeting. Do not force a rigid template — if a section has no real content, leave it out entirely. If the meeting is about something specific (e.g. refinance review, construction loan, SMSF, pre-approval check-in), shape the summary around that.

Suggested building blocks you may use (pick only those that fit):
- A short header with client name(s), meeting date, and broker if mentioned
- A concise overview / TL;DR (2–4 sentences)
- Tables for structured facts (loan requirements, financial snapshot, employment, assets, liabilities) — only when there is enough data to justify a table
- Narrative sections for strategy discussion, scenarios modelled, advice given
- A clear "Next Steps" list with the responsible person where mentioned
- An "Outstanding / To Confirm" list for anything TBC

Rules:
- Use Australian English and AUD ($) formatting.
- Use markdown headings (##, ###), bold labels in tables, and GFM tables.
- Do NOT fabricate numbers, names, dates, or lenders. If a fact is genuinely unclear, write "TBC" or omit it.
- Keep it crisp and professional — this is a broker file note, not a transcript.
- Output ONLY the markdown summary. No preamble, no closing remarks, no "Here is the summary".`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { transcript, title, meeting_date } = await req.json();
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 20) {
      return new Response(JSON.stringify({ error: 'Transcript is too short.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const userPrompt = `Meeting title: ${title || 'Untitled meeting'}\nMeeting date: ${meeting_date || 'unknown'}\n\nTranscript:\n"""\n${transcript}\n"""\n\nProduce the structured markdown summary now.`;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit reached. Try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Add credits in workspace settings.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await resp.text();
      console.error('AI gateway error', resp.status, t);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const summary = data?.choices?.[0]?.message?.content ?? '';

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('summarize-meeting error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});