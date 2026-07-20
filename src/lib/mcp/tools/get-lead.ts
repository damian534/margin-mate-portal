import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../supabase";

export default defineTool({
  name: "get_lead",
  title: "Get lead",
  description: "Fetch full details for a single lead by id.",
  inputSchema: {
    id: z.string().uuid().describe("Lead id (uuid)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const gate = requireAuth(ctx);
    if (gate) return gate;
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb.from("leads").select("*").eq("id", id).maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Lead not found" }], isError: true };
    return {
      content: [{ type: "text", text: `Lead ${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() }],
      structuredContent: { lead: data },
    };
  },
});