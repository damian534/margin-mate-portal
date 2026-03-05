import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MORTGAGE_STEPS } from './mortgage-steps';
import { MortgageWizardField } from './MortgageWizardField';
import { MortgageFactFindSummary } from './MortgageFactFindSummary';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, CheckCircle2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AllFormData } from './types';
import logoIcon from '@/assets/margin-icon-tm.png';

interface Props {
  leadId: string;
  /** If provided, saves via edge function (client portal mode) */
  token?: string;
  isPreviewMode?: boolean;
  readOnly?: boolean;
  onComplete?: () => void;
  /** Pre-populate fields from lead data */
  prefill?: { email?: string; phone?: string; firstName?: string; lastName?: string };
}

export function MortgageFactFindWizard({ leadId, token, isPreviewMode, readOnly, onComplete, prefill }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<AllFormData>({});
  const [isComplete, setIsComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Determine active (visible) steps based on conditions
  const activeSteps = useMemo(
    () => MORTGAGE_STEPS.filter(s => !s.condition || s.condition(formData)),
    [formData]
  );

  const currentStepData = activeSteps[currentStep];
  const progress = activeSteps.length > 0 ? ((currentStep + 1) / activeSteps.length) * 100 : 0;

  // Pre-populate personal details from lead data
  useEffect(() => {
    if (prefill && loaded) {
      setFormData(prev => {
        const personalSection = prev['mff_primary_personal'] ?? {};
        const needsUpdate =
          (!personalSection.email && prefill.email) ||
          (!personalSection.mobile && prefill.phone) ||
          (!personalSection.first_name && prefill.firstName) ||
          (!personalSection.last_name && prefill.lastName);

        if (!needsUpdate) return prev;

        return {
          ...prev,
          mff_primary_personal: {
            ...personalSection,
            ...(prefill.email && !personalSection.email ? { email: prefill.email } : {}),
            ...(prefill.phone && !personalSection.mobile ? { mobile: prefill.phone } : {}),
            ...(prefill.firstName && !personalSection.first_name ? { first_name: prefill.firstName } : {}),
            ...(prefill.lastName && !personalSection.last_name ? { last_name: prefill.lastName } : {}),
          },
        };
      });
    }
  }, [prefill, loaded]);

  // Load existing data
  useEffect(() => {
    loadData();
  }, [leadId]);

  const loadData = async () => {
    if (isPreviewMode) {
      setLoaded(true);
      return;
    }

    try {
      if (token) {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-portal?token=${encodeURIComponent(token)}`
        );
        if (res.ok) {
          const data = await res.json();
          const map: AllFormData = {};
          data.fact_find?.forEach((row: any) => {
            map[row.section] = row.data ?? {};
          });
          setFormData(map);
        }
      } else {
        const { data } = await supabase
          .from('fact_find_responses')
          .select('*')
          .eq('lead_id', leadId);

        const map: AllFormData = {};
        (data as any[])?.forEach(row => {
          map[row.section] = row.data ?? {};
        });
        setFormData(map);
      }
    } catch (e) {
      console.error('Failed to load fact find data', e);
    }
    setLoaded(true);
  };

  const saveCurrentStep = useCallback(async () => {
    if (!currentStepData || readOnly || isPreviewMode) return true;

    const sectionKey = currentStepData.sectionKey;
    const sectionData = formData[sectionKey] ?? {};
    setSaving(true);

    try {
      if (token) {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-portal`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              action: 'save_fact_find',
              section: sectionKey,
              data: sectionData,
              completed: false,
            }),
          }
        );
        if (!res.ok) {
          toast.error('Failed to save');
          setSaving(false);
          return false;
        }
      } else {
        const { error } = await supabase
          .from('fact_find_responses')
          .upsert(
            {
              lead_id: leadId,
              section: sectionKey,
              data: sectionData as any,
              completed: false,
              updated_by: token ? 'client' : 'broker',
            },
            { onConflict: 'lead_id,section' }
          );
        if (error) {
          toast.error('Failed to save');
          setSaving(false);
          return false;
        }
      }
    } catch {
      toast.error('Save error');
      setSaving(false);
      return false;
    }

    setSaving(false);
    return true;
  }, [currentStepData, formData, leadId, token, readOnly, isPreviewMode]);

  const goNext = async () => {
    const saved = await saveCurrentStep();
    if (!saved) return;

    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Mark all sections complete
      if (!readOnly && !isPreviewMode) {
        for (const step of activeSteps) {
          const sectionData = formData[step.sectionKey] ?? {};
          if (token) {
            await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-portal`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  action: 'save_fact_find',
                  section: step.sectionKey,
                  data: sectionData,
                  completed: true,
                }),
              }
            );
          } else {
            await supabase.from('fact_find_responses').upsert(
              {
                lead_id: leadId,
                section: step.sectionKey,
                data: sectionData as any,
                completed: true,
                updated_by: token ? 'client' : 'broker',
              },
              { onConflict: 'lead_id,section' }
            );
          }
        }
      }
      setIsComplete(true);
      onComplete?.();
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const updateField = (key: string, value: any) => {
    if (!currentStepData) return;
    const sectionKey = currentStepData.sectionKey;
    setFormData(prev => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] ?? {}), [key]: value },
    }));
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isComplete) {
    return <MortgageFactFindSummary formData={formData} leadId={leadId} />;
  }

  if (!currentStepData) return null;

  const sectionData = formData[currentStepData.sectionKey] ?? {};

  // Check if current step is the welcome step for special layout
  const isWelcomeStep = currentStepData.id === 'welcome';

  return (
    <div className="min-h-screen bg-background font-[Poppins,sans-serif] flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <img src={logoIcon} alt="Margin Finance" className="h-10 w-auto" />
            <button
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border border-border rounded-full px-3 py-1.5"
              onClick={() => {/* TODO: show summary */}}
            >
              View summary
            </button>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Back button + Title */}
        <div className="mb-8 sm:mb-10">
          {currentStep > 0 && (
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            {currentStepData.title}
          </h1>
        </div>

        {/* Welcome step info box */}
        {isWelcomeStep && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5 mb-8">
            <p className="text-sm text-foreground leading-relaxed">
              Let's get started on your <strong>Margin application</strong>. Please complete this to the
              best of your ability to ensure I can present you with the options that you will be eligible for.
            </p>
          </div>
        )}

        {/* Fields rendered conversationally with spacing */}
        <div className="space-y-8 sm:space-y-10">
          {currentStepData.fields.map((field, idx) => {
            // Check field condition
            if (field.condition && !field.condition(sectionData)) return null;

            // For headings, use them as section dividers
            if (field.type === 'heading') {
              return (
                <div key={field.key} className="pt-4">
                  <h3 className="text-base font-semibold text-foreground">{field.label}</h3>
                  {field.description && <p className="text-sm text-muted-foreground mt-1">{field.description}</p>}
                </div>
              );
            }

            if (field.type === 'info') {
              return (
                <div key={field.key} className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{field.label}</p>
                </div>
              );
            }

            return (
              <div key={field.key} className="space-y-3">
                <MortgageWizardField
                  field={field}
                  value={sectionData[field.key]}
                  onChange={updateField}
                  data={sectionData}
                  readOnly={readOnly}
                />
              </div>
            );
          })}
        </div>

        {/* Tip bubble on welcome step */}
        {isWelcomeStep && (
          <div className="mt-10 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted/50 border border-border px-5 py-2.5">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs text-muted-foreground">
                Tips and tricks to help you along the way will appear in bubbles like this!
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      {!readOnly && (
        <div className="border-t border-border bg-background sticky bottom-0 z-10">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {activeSteps.length}
            </span>

            <Button
              onClick={goNext}
              disabled={saving}
              className="gap-1.5 rounded-full px-6"
            >
              {saving ? 'Saving...' : currentStep === activeSteps.length - 1 ? (
                <>Complete <CheckCircle2 className="w-4 h-4" /></>
              ) : (
                <>Continue <ChevronRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
