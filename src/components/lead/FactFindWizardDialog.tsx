import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MortgageFactFindWizard } from '@/components/mortgage-factfind/MortgageFactFindWizard';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  isPreviewMode?: boolean;
  prefill?: { email?: string; phone?: string; firstName?: string; lastName?: string };
  onComplete?: () => void;
}

/** Opens the full mortgage fact-find wizard in a modal so brokers can prefill on behalf of the client. */
export function FactFindWizardDialog({ open, onOpenChange, leadId, isPreviewMode, prefill, onComplete }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-3 border-b shrink-0">
          <DialogTitle className="text-base">Fact Find — broker entry</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <MortgageFactFindWizard
            leadId={leadId}
            isPreviewMode={isPreviewMode}
            prefill={prefill}
            onComplete={() => { onComplete?.(); onOpenChange(false); }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}