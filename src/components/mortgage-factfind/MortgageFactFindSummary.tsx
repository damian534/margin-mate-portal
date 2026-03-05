import { useMemo } from 'react';
import { MORTGAGE_STEPS } from './mortgage-steps';
import { AllFormData, WizardField } from './types';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, FileText } from 'lucide-react';
import { generateMortgageFactFindPdf } from '@/lib/pdf/mortgageFactFindPdf';
import logoIcon from '@/assets/margin-icon-tm.png';

interface Props {
  formData: AllFormData;
  leadId: string;
  showDocumentsLink?: boolean;
  onGoToDocuments?: () => void;
}

function formatValue(field: WizardField, value: any): string {
  if (value === undefined || value === null || value === '') return '—';
  if (field.type === 'currency') {
    return `$${Number(value).toLocaleString()}`;
  }
  if (field.type === 'checkbox') {
    return value ? 'Yes' : 'No';
  }
  if (field.options) {
    const opt = field.options.find(o => o.value === value);
    return opt?.label ?? String(value);
  }
  if (field.type === 'repeatable' && Array.isArray(value)) {
    return `${value.length} ${field.itemLabel || 'item'}${value.length !== 1 ? 's' : ''}`;
  }
  return String(value);
}

export function MortgageFactFindSummary({ formData, leadId, showDocumentsLink, onGoToDocuments }: Props) {
  const activeSteps = useMemo(
    () => MORTGAGE_STEPS.filter(s => !s.condition || s.condition(formData)),
    [formData]
  );

  const handleDownloadPdf = () => {
    generateMortgageFactFindPdf(formData);
  };

  return (
    <div className="min-h-screen bg-background font-[Poppins,sans-serif]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Success header */}
        <div className="text-center space-y-4 py-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Form Complete</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Thank you for completing your mortgage application fact find.
              Your broker will review your information and be in touch shortly.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" className="gap-1.5 rounded-full" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4" /> Download PDF
            </Button>
            {showDocumentsLink && (
              <Button className="gap-1.5 rounded-full" onClick={onGoToDocuments}>
                <FileText className="w-4 h-4" /> Upload Documents
              </Button>
            )}
          </div>
        </div>

        {/* Summary sections */}
        <div className="space-y-6">
          {activeSteps.map(step => {
            const sectionData = formData[step.sectionKey] ?? {};
            const displayFields = step.fields.filter(
              f => f.type !== 'heading' && f.type !== 'info' && f.type !== 'button-group' &&
                (!f.condition || f.condition(sectionData))
            );

            if (displayFields.length === 0) return null;

            const hasData = displayFields.some(f => {
              const v = sectionData[f.key];
              return v !== undefined && v !== null && v !== '';
            });

            if (!hasData) return null;

            return (
              <div key={step.id} className="rounded-lg border border-border">
                <div className="px-4 py-3 bg-muted/30 border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground">{step.title}</h2>
                </div>
                <div className="p-4 space-y-2">
                  {displayFields.map(field => {
                    const v = sectionData[field.key];
                    if (v === undefined || v === null || v === '') return null;

                    if (field.type === 'repeatable' && Array.isArray(v) && v.length > 0) {
                      return (
                        <div key={field.key} className="space-y-2">
                          {v.map((item: any, i: number) => (
                            <div key={i} className="bg-muted/20 rounded-lg p-3 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">
                                {field.itemLabel} {i + 1}
                              </p>
                              {field.fields?.map(sf => {
                                const sv = item[sf.key];
                                if (sv === undefined || sv === null || sv === '') return null;
                                return (
                                  <div key={sf.key} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{sf.label}</span>
                                    <span className="font-medium text-foreground">{formatValue(sf, sv)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <div key={field.key} className="flex justify-between text-sm py-0.5">
                        <span className="text-muted-foreground">{field.label}</span>
                        <span className="font-medium text-foreground text-right max-w-[60%]">
                          {formatValue(field, v)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-center text-muted-foreground py-4">
          <img src={logoIcon} alt="Margin Finance" className="h-5 w-auto inline-block mr-1.5 opacity-60" />
          Your information is securely transmitted and stored.
        </p>
      </div>
    </div>
  );
}
