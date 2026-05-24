import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SYSTEM_PROMPT = `You are an expert Australian mortgage broker assistant for Margin Finance. You convert raw meeting/call transcripts between a broker and a client into a clean, structured broker summary in Markdown.

ALWAYS follow this exact structure (omit a section ONLY if the transcript truly has no relevant info — never invent facts):

# {Client Name(s)} — Meeting Summary
_Date: {meeting date if known, else leave blank} | Broker: {broker name if mentioned}_

## Loan Requirements & Objectives

### Loan Purpose & Structure
| Category | Details |
| --- | --- |
| **Loan Purpose** | ... |
| **Target Property Type** | ... |
| **Target Location** | ... |
| **Target Purchase Price** | ... |
| **Estimated Loan Amount** | ... |
| **Deposit / Equity Available** | ... |
| **Loan Type** | ... |
| **Rate Type Preference** | ... |
| **Offset / Redraw** | ... |
| **Lender Preference** | ... |
| **Settlement Strategy** | ... |
| **Timeline** | ... |

### Client Goals & Circumstances
| Category | Details |
| --- | --- |
| **Primary Goal** | ... |
| **Risk Profile** | ... |
| (add any other relevant rows from the transcript: lifestyle constraints, future investment plans, SMSF, education funding, share portfolio, buyer's advocate, etc.) |

## Broker Summary Notes

### Financial Snapshot
| Category | Details |
| --- | --- |
| **Client 1** | Name / DOB / mobile |
| **Client 2** | (if applicable) |
| **Current Address** | ... |
| **Dependants** | ... |
| **Employment** | employer, role, start date |
| **Income** | base + super, take-home |
| **Current Property / Mortgage** | ... |
| **Other Assets** | shares, super, investment bonds, vehicles |
| **Liabilities** | credit cards, HECS, personal loans |

### Strategy Discussion
Several paragraphs of narrative covering scenarios modelled on the call, repayment benchmarking, share/equity strategy, current home sale strategy, future investment plans, SMSF discussion, accountant referral, buyer's advocate, etc. Use bullet points where listing scenarios.

## Next Steps
- Action items as a bulleted list, with the responsible person where mentioned (e.g. "Damian to send recap email", "Karina to request documents", "Andrew to prepare pre-approval proposal", "Client to speak with accountant").

## Outstanding Information Gaps
- Bulleted list of anything that was TBC, missing, or needs to be verified.

Rules:
- Use Australian English and AUD ($) formatting.
- Use bold for the left column labels in tables.
- Do NOT fabricate numbers, names, dates, or lenders. If unknown, write "TBC".
- Keep narrative crisp and professional — this is a broker file note.
- Output ONLY the markdown, no preamble or closing remarks.`;

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