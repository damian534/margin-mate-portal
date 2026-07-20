import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../supabase";

export default defineTool({
  name: "list_contacts",
  title: "List contacts",
  description: "List contacts (clients and referrers) visible to the signed-in user. Optional name/email search.",
  inputSchema: {
    search: z.string().optional().describe("Case-insensitive match on name or email."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    const gate = requireAuth(ctx);
    if (gate) return gate;
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("contacts")
      .select("id, first_name, last_name, email, phone, contact_type, company_name, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (search) {
      const s = `%${search}%`;
      q = q.or(`first_name.ilike.${s},last_name.ilike.${s},email.ilike.${s}`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Found ${data?.length ?? 0} contacts.` }],
      structuredContent: { contacts: data ?? [] },
    };
  },
});