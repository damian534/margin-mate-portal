import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { nextSigningGroup } from "./esignSigningOrder.ts";

type Signer = { id: string; name: string; email: string; token: string; status: string; signing_order: number; sent_at: string | null };

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function sendSigningInvitations(admin: SupabaseClient, documentId: string, apiKey: string, reminder = false) {
  const { data: doc, error: docError } = await admin.from("esign_documents").select("id, title, message, status, broker_id").eq("id", documentId).single();
  if (docError) throw docError;
  if (["completed", "voided"].includes(doc.status)) throw new Error("This document is no longer awaiting signatures");
  const { data: signers, error } = await admin.from("esign_signers").select("id, name, email, token, status, signing_order, sent_at").eq("document_id", documentId);
  if (error) throw error;
  const targets = nextSigningGroup((signers || []) as Signer[], reminder);
  let sent = 0;
  const failures: string[] = [];
  for (const signer of targets) {
    try {
      const url = `https://connect.margin.com.au/sign/${signer.token}`;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": reminder ? `esign-reminder-${signer.id}-${crypto.randomUUID()}` : `esign-invitation-${signer.id}` },
        body: JSON.stringify({
          from: "Margin Finance <notifications@margin.com.au>", to: [signer.email], subject: `Please sign: ${doc.title}`,
          html: `<html><body style="font-family:Arial,sans-serif;line-height:1.6"><h2>Document ready to sign</h2><p>Hi ${escapeHtml(signer.name)},</p><p>${escapeHtml(doc.message || "Your broker has sent you a document to review and sign electronically.").replace(/\n/g, "<br>")}</p><p><strong>${escapeHtml(doc.title)}</strong></p><p><a href="${url}">Review &amp; sign</a></p><p>This link is unique to you — please don't forward it.</p></body></html>`,
        }),
      });
      if (!response.ok) throw new Error(`Email provider [${response.status}]: ${await response.text()}`);
      const timestamp = new Date().toISOString();
      const { error: updateError } = await admin.from("esign_signers").update({ status: "sent", sent_at: timestamp }).eq("id", signer.id).in("status", ["pending", "sent", "viewed"]);
      if (updateError) throw updateError;
      const { error: eventError } = await admin.from("esign_events").insert({ document_id: documentId, signer_id: signer.id, event_type: "sent", detail: `Signing link emailed to ${signer.email}` });
      if (eventError) throw eventError;
      sent++;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("E-sign invitation failed", { documentId, signerId: signer.id, detail });
      failures.push(detail);
    }
  }
  if (sent) {
    const { error } = await admin.from("esign_documents").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", documentId).in("status", ["draft", "sent"]);
    if (error) throw error;
  }
  return { sent, failed: failures.length, failures };
}