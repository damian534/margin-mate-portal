import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listLeads from "./tools/list-leads";
import getLead from "./tools/get-lead";
import listTasks from "./tools/list-tasks";
import createTask from "./tools/create-task";
import listContacts from "./tools/list-contacts";
import listSettlements from "./tools/list-settlements";

// Direct Supabase issuer (never the .lovable.cloud proxy). VITE_SUPABASE_PROJECT_ID
// is inlined by Vite at build time so this stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "margin-connect-mcp",
  title: "Margin Connect",
  version: "0.1.0",
  instructions:
    "Tools for the Margin Finance Connect CRM. Read and manage leads, contacts, tasks, and settlements for the signed-in Connect user. All actions run under that user's row-level permissions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listLeads, getLead, listTasks, createTask, listContacts, listSettlements],
});