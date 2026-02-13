import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callSendEmail(to: string, subject: string, html: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({ to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Send email failed:", err);
    return false;
  }
  return true;
}

async function getPartnerEmail(partnerId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("user_id", partnerId)
    .maybeSingle();
  return data?.email ?? null;
}

async function getPartnerName(partnerId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", partnerId)
    .maybeSingle();
  return data?.full_name || "Partner";
}

export async function notifyPartnerNote(
  lead: { first_name: string; last_name: string; referral_partner_id: string | null },
  noteContent: string
) {
  console.log("[notifications] notifyPartnerNote called", { lead, noteContent });
  if (!lead.referral_partner_id) { console.warn("[notifications] No referral_partner_id"); return; }
  const email = await getPartnerEmail(lead.referral_partner_id);
  console.log("[notifications] Partner email result:", email);
  if (!email) {
    console.warn("No email found for partner:", lead.referral_partner_id);
    return;
  }
  const partnerName = await getPartnerName(lead.referral_partner_id);
  const leadName = `${lead.first_name} ${lead.last_name}`;
  const subject = `Update on your referral: ${leadName}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
      <h2 style="color: #1a1a1a; margin-bottom: 8px;">Hi ${partnerName},</h2>
      <p style="color: #555; font-size: 15px; line-height: 1.6;">
        There's a new update on your referral <strong>${leadName}</strong>:
      </p>
      <div style="background: #f5f5f5; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #333; font-size: 14px; white-space: pre-wrap;">${noteContent}</p>
      </div>
      <p style="color: #888; font-size: 13px;">— Margin Finance</p>
    </div>
  `;
  await callSendEmail(email, subject, html);
}

export async function notifyPartnerStatusChange(
  lead: { first_name: string; last_name: string; referral_partner_id: string | null },
  oldStatus: string,
  newStatus: string,
  statusLabel: string
) {
  console.log("[notifications] notifyPartnerStatusChange called", { lead, oldStatus, newStatus, statusLabel });
  if (!lead.referral_partner_id) { console.warn("[notifications] No referral_partner_id"); return; }
  const email = await getPartnerEmail(lead.referral_partner_id);
  console.log("[notifications] Partner email result:", email);
  if (!email) return;
  const partnerName = await getPartnerName(lead.referral_partner_id);
  const leadName = `${lead.first_name} ${lead.last_name}`;
  const subject = `Referral status update: ${leadName} → ${statusLabel}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
      <h2 style="color: #1a1a1a; margin-bottom: 8px;">Hi ${partnerName},</h2>
      <p style="color: #555; font-size: 15px; line-height: 1.6;">
        The status of your referral <strong>${leadName}</strong> has been updated:
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="display: inline-block; padding: 8px 20px; background: #2563eb; color: #fff; border-radius: 20px; font-size: 15px; font-weight: 600;">
          ${statusLabel}
        </span>
      </div>
      <p style="color: #888; font-size: 13px;">— Margin Finance</p>
    </div>
  `;
  await callSendEmail(email, subject, html);
}
