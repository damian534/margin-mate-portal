import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../supabase";

export default defineTool({
  name: "list_settlements",
  title: "List settlements",
  description: "List settlements visible to the signed-in user. Optionally filter by date window.",
  inputSchema: {
    from: z.string().optional().describe("ISO date. Only settlements on or after this settlement date."),
    to: z.string().optional().describe("ISO date. Only settlements on or before this settlement date."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ from, to, limit }, ctx) => {
    const gate = requireAuth(ctx);
    if (gate) return gate;
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("settlements")
      .select("id, client_name, loan_amount, lender, settlement_date, status, lead_source, security_address, lead_id")
      .order("settlement_date", { ascending: false })
      .limit(limit ?? 50);
    if (from) q = q.gte("settlement_date", from);
    if (to) q = q.lte("settlement_date", to);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const total = (data ?? []).reduce((s, r: any) => s + (r.loan_amount || 0), 0);
    return {
      content: [{ type: "text", text: `Found ${data?.length ?? 0} settlements totalling $${total.toLocaleString()}.` }],
      structuredContent: { settlements: data ?? [], total_loan_amount: total },
    };
  },
});