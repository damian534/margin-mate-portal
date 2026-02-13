const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callNotifyPartner(body: Record<string, unknown>) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/notify-partner`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    console.log("[notifications] notify-partner response:", res.status, data);
    return res.ok;
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
