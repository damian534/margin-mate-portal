import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../supabase";

export default defineTool({
  name: "list_tasks",
  title: "List tasks",
  description: "List tasks visible to the signed-in user. Optionally filter by completion or due window.",
  inputSchema: {
    include_completed: z.boolean().optional().describe("Include completed tasks (default false)."),
    due_before: z.string().optional().describe("ISO date. Only return tasks due on or before this date."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ include_completed, due_before, limit }, ctx) => {
    const gate = requireAuth(ctx);
    if (gate) return gate;
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("tasks")
      .select("id, title, description, due_date, completed, priority, lead_id, assigned_to, created_at")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(limit ?? 50);
    if (!include_completed) q = q.eq("completed", false);
    if (due_before) q = q.lte("due_date", due_before);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Found ${data?.length ?? 0} tasks.` }],
      structuredContent: { tasks: data ?? [] },
    };
  },
});