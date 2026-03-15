import { supabase } from '@/integrations/supabase/client';

async function callNotifyPartner(body: Record<string, unknown>) {
  try {
    console.log("[notifications] calling notify-partner with:", JSON.stringify(body));
    const { data, error } = await supabase.functions.invoke('notify-partner', {
      body,
    });
    console.log("[notifications] notify-partner response:", { data, error });
    return !error;
  } catch (err) {
    console.error("[notifications] notify-partner call failed:", err);
    return false;
  }
}

export async function notifyPartnerNote(
  lead: { first_name: string; last_name: string; referral_partner_id: string | null },
  noteContent: string
) {
  if (!lead.referral_partner_id) return;
  await callNotifyPartner({
    type: "note",
    lead: {
      first_name: lead.first_name,
      last_name: lead.last_name,
      referral_partner_id: lead.referral_partner_id,
    },
    note_content: noteContent,
  });
}

export async function notifyNewLead(
  lead: {
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    loan_amount?: number | null;
    loan_purpose?: string | null;
    source?: string | null;
  },
  brokerId: string | null
) {
  if (!brokerId) return;
  try {
    console.log("[notifications] calling notify-new-lead");
    const { error } = await supabase.functions.invoke('notify-new-lead', {
      body: { lead, broker_id: brokerId },
    });
    if (error) console.error("[notifications] notify-new-lead error:", error);
  } catch (err) {
    console.error("[notifications] notify-new-lead call failed:", err);
  }
}

export async function notifyPartnerStatusChange(
  lead: { first_name: string; last_name: string; referral_partner_id: string | null },
  oldStatus: string,
  newStatus: string,
  statusLabel: string
) {
  if (!lead.referral_partner_id) return;
  await callNotifyPartner({
    type: "status_change",
    lead: {
      first_name: lead.first_name,
      last_name: lead.last_name,
      referral_partner_id: lead.referral_partner_id,
    },
    old_status: oldStatus,
    new_status: newStatus,
    status_label: statusLabel,
  });
}
