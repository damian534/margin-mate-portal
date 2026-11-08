import { ClipboardList } from 'lucide-react';
import { SectionCard } from '@/components/lead/SectionCard';

interface FormAnswer {
  question: string;
  answer: string;
}

interface AdAttribution {
  campaign?: string;
  adset?: string;
  ad?: string;
  form_name?: string;
}

/**
 * Shows the questions and answers captured when a lead came in from an
 * external form (GHL landing page, Facebook/Instagram lead ad), plus which
 * campaign/ad set/ad it came from — like the lead card in Privyr.
 * Data lives in leads.custom_fields.form_answers / .ad_attribution.
 */
export function FormAnswersCard({ customFields }: { customFields: Record<string, unknown> | null | undefined }) {
  const cf = (customFields || {}) as Record<string, unknown>;

  const answers: FormAnswer[] = Array.isArray(cf.form_answers)
    ? (cf.form_answers as FormAnswer[]).filter((a) => a && a.question && a.answer)
    : [];

  const attr = (cf.ad_attribution || {}) as AdAttribution;
  const attrRows: [string, string][] = (
    [
      ['Campaign', attr.campaign],
      ['Ad set', attr.adset],
      ['Ad', attr.ad],
      ['Form', attr.form_name],
    ] as [string, string | undefined][]
  ).filter(([, v]) => !!v) as [string, string][];

  if (answers.length === 0 && attrRows.length === 0) return null;

  return (
    <SectionCard
      icon={ClipboardList}
      title="Form answers"
      tone="info"
      className="mb-4"
      subtitle={
        answers.length > 0
          ? `${answers.length} answer${answers.length === 1 ? '' : 's'} from the original enquiry`
          : 'From the original enquiry'
      }
    >
      {attrRows.length > 0 && (
        <div className="rounded-lg bg-muted/50 border border-border px-3 py-2 space-y-1">
          {attrRows.map(([label, value]) => (
            <div key={label} className="flex gap-2 text-xs">
              <span className="w-16 shrink-0 font-medium text-muted-foreground">{label}</span>
              <span className="text-foreground">{value}</span>
            </div>
          ))}
        </div>
      )}
      {answers.length > 0 && (
        <dl className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {answers.map((a, i) => (
            <div key={i} className="px-3 py-2 bg-background">
              <dt className="text-xs font-medium text-muted-foreground">{a.question}</dt>
              <dd className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{a.answer}</dd>
            </div>
          ))}
        </dl>
      )}
    </SectionCard>
  );
}
