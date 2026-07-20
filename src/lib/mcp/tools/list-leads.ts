import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../supabase";

export default defineTool({
  name: "list_leads",
  title: "List leads",
  description: "List leads visible to the signed-in user, most recent first. Optionally filter by status.",
  inputSchema: {
    status: z.string().optional().describe("Filter by lead status (e.g. 'new', 'qualified', 'settled')."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows to return (default 25)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    const gate = requireAuth(ctx);
    if (gate) return gate;
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("leads")
      .select("id, first_name, last_name, email, phone, status, loan_amount, loan_purpose, created_at, settled_date, referral_partner_id")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Found ${data?.length ?? 0} leads.` }],
      structuredContent: { leads: data ?? [] },
    };
  },
});