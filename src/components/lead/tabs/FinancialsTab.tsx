import { FinancialPositionEditor } from '@/components/financial-position/FinancialPositionEditor';

interface Props {
  leadId: string;
  isPreviewMode: boolean;
  /** Optional: render read-only (e.g. partner views) */
  readOnly?: boolean;
  onChange?: () => void;
}

/**
 * Full financial position for a client — editable by the broker.
 * Assets, liabilities, income and employment can all be entered manually here,
 * in addition to whatever the client submitted through the fact find.
 */
export function FinancialsTab({ leadId, isPreviewMode, readOnly, onChange }: Props) {
  return (
    <FinancialPositionEditor
      leadId={leadId}
      isPreviewMode={isPreviewMode}
      readOnly={readOnly}
      onChange={onChange}
    />
  );
}
