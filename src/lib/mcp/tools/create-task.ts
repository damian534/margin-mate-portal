import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../supabase";

export default defineTool({
  name: "create_task",
  title: "Create task",
  description: "Create a new task for the signed-in user. lead_id is optional for standalone tasks.",
  inputSchema: {
    title: z.string().trim().min(1).describe("Task title."),
    description: z.string().optional(),
    due_date: z.string().optional().describe("ISO date (YYYY-MM-DD)."),
    priority: z.enum(["low", "medium", "high"]).optional(),
    lead_id: z.string().uuid().optional().describe("Optional lead to link."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  handler: async (input, ctx) => {
    const gate = requireAuth(ctx);
    if (gate) return gate;
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("tasks")
      .insert({
        title: input.title,
        description: input.description ?? null,
        due_date: input.due_date ?? null,
        priority: input.priority ?? "medium",
        status: "pending",
        lead_id: input.lead_id ?? null,
        created_by: ctx.getUserId(),
        assigned_to: ctx.getUserId(),
      })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Task created: ${data?.title}` }],
      structuredContent: { task: data },
    };
  },
});