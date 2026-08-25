import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FundsPositionCalculator } from '@/components/funds/FundsPositionCalculator';
import { defaultFundsInputs } from '@/lib/fundsPosition/calc';
import type { FundsPositionInputs } from '@/lib/fundsPosition/types';
import type { StateKey } from '@/lib/stampDutyRates';

interface LeadLike {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  loan_amount?: number | null;
  loan_purpose?: string | null;
  pre_approval_purchase_price?: number | null;
  pre_approval_loan_amount?: number | null;
  referral_partner_id?: string | null;
  source_contact_id?: string | null;
}

const num = (v: any) => (typeof v === 'number' && isFinite(v) ? v : Number(v) || 0);

const STATE_PATTERNS: Array<[RegExp, StateKey]> = [
  [/\bVIC\b|victoria/i, 'VIC'],
  [/\bNSW\b|new south wales/i, 'NSW'],
  [/\bQLD\b|queensland/i, 'QLD'],
  [/\bSA\b|south australia/i, 'SA'],
  [/\bWA\b|western australia/i, 'WA'],
  [/\bTAS\b|tasmania/i, 'TAS'],
  [/\bACT\b/i, 'ACT'],
  [/\bNT\b|northern territory/i, 'NT'],
];

/** Funding position for a deal, pre-filled from the client's file. */
export function FundingPositionTab({
  lead,
  isPreviewMode = false,
}: {
  lead: LeadLike;
  isPreviewMode?: boolean;
}) {
  const [inputs, setInputs] = useState<FundsPositionInputs | null>(null);
  const [referral, setReferral] = useState<{ email: string | null; name: string | null }>({
    email: null,
    name: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const base = defaultFundsInputs();
      const purchase = num(lead.pre_approval_purchase_price);
      const loan = num(lead.pre_approval_loan_amount) || num(lead.loan_amount);
      const purposeText = (lead.loan_purpose ?? '').toLowerCase();

      base.purpose = /invest/.test(purposeText) ? 'investment' : 'owner_occupied';
      if (/refinance/.test(purposeText)) base.transactionType = 'refinance';

      if (purchase > 0) base.propertyValue = { value: purchase, auto: false };
      if (loan > 0) base.baseLoan = { value: loan, auto: false };
      base.baseLVR = { value: base.baseLVR.value, auto: true };
      base.fundsAvailable = { value: 0, auto: true };

      if (!isPreviewMode) {
        // Savings / assets from the client's fact find (deal level, then contact level).
        try {
          const { data: ff } = await supabase
            .from('fact_find_responses')
            .select('section, data')
            .eq('lead_id', lead.id);
          let assets = (ff as any[])?.find(row => row.section === 'assets')?.data ?? null;
          const property = (ff as any[])?.find(row => row.section === 'property')?.data ?? null;

          if (!assets && lead.source_contact_id) {
            const { data: cf } = await supabase
              .from('contact_financials')
              .select('section, data')
              .eq('contact_id', lead.source_contact_id);
            assets = (cf as any[])?.find(row => row.section === 'assets')?.data ?? null;
          }

          if (assets) {
            const savings = num(assets.savings);
            const shares = num(assets.shares);
            if (savings > 0 || shares > 0) {
              base.fundsDetailed = true;
              base.savings = savings;
              base.assetsDisposed = 0;
              base.gifts = 0;
              base.equity = 0;
              base.fundsAvailable = { value: savings, auto: false };
            }
          }

          const addressText = [property?.property_address, assets?.property_1_address]
            .filter(Boolean)
            .join(' ');
          const match = STATE_PATTERNS.find(([re]) => re.test(addressText));
          if (match) base.state = match[1];
        } catch {
          /* prefill is best-effort */
        }

        // Referral partner email for the "Email" action.
        if (lead.referral_partner_id) {
          const { data: partner } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', lead.referral_partner_id)
            .maybeSingle();
          if (partner && !cancelled) {
            setReferral({
              email: (partner as any).email ?? null,
              name: (partner as any).full_name ?? null,
            });
          }
        }
      }

      if (!cancelled) setInputs(base);
    })();

    return () => {
      cancelled = true;
    };
  }, [lead.id, lead.loan_amount, lead.loan_purpose, lead.pre_approval_purchase_price, lead.pre_approval_loan_amount, lead.referral_partner_id, lead.source_contact_id, isPreviewMode]);

  if (!inputs) {
    return <p className="text-sm text-muted-foreground">Loading the client's figures…</p>;
  }

  return (
    <FundsPositionCalculator
      initialInputs={inputs}
      leadId={lead.id}
      clientName={[lead.first_name, lead.last_name].filter(Boolean).join(' ') || undefined}
      referralEmail={referral.email}
      referralName={referral.name}
      isPreviewMode={isPreviewMode}
    />
  );
}
