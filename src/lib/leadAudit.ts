import { supabase } from '@/integrations/supabase/client';

/**
 * Append an audit entry to a lead's timeline (the `notes` table).
 * Silent on failure — auditing must never break the action it logs.
 * Use a leading emoji prefix to drive the timeline icon colour:
 *   📧 email   📞 call   📋 task   📄 document   📨 MIR   💰 finance   👤 contact   🔄 status   ⚙️ system
 */
export async function logAudit(
  leadId: string,
  content: string,
  opts?: { isPreview?: boolean; notifyPartner?: boolean }
) {
  if (opts?.isPreview) return;
  if (!leadId || leadId.startsWith('preview-')) return;
  try {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('notes').insert({
      lead_id: leadId,
      content,
      author_id: userData?.user?.id ?? null,
      notify_partner: !!opts?.notifyPartner,
    } as any);
  } catch (e) {
    console.warn('Audit log failed', e);
  }
}
