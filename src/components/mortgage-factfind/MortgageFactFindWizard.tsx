import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MORTGAGE_STEPS } from './mortgage-steps';
import { MortgageWizardField } from './MortgageWizardField';
import { MortgageFactFindSummary } from './MortgageFactFindSummary';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
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
}

export function MortgageFactFindWizard({ leadId, token, isPreviewMode, readOnly, onComplete }: Props) {
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
  const visibleFields = currentStepData.fields.filter(
    f => !f.condition || f.condition(sectionData)
  );

  return (
    <div className="min-h-screen bg-background font-[Poppins,sans-serif] flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <img src={logoIcon} alt="Margin Finance" className="h-7 w-auto" />
            <span className="text-xs text-muted-foreground">Mortgage Application</span>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs text-muted-foreground font-medium">
              Step {currentStep + 1} of {activeSteps.length}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-foreground">{currentStepData.title}</h1>
          {currentStepData.subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{currentStepData.subtitle}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {currentStepData.fields.map(field => (
            <MortgageWizardField
              key={field.key}
              field={field}
              value={sectionData[field.key]}
              onChange={updateField}
              data={sectionData}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      {!readOnly && (
        <div className="border-t border-border bg-background sticky bottom-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goBack}
              disabled={currentStep === 0}
              className="gap-1.5 rounded-full"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              {/* Step dots */}
              <div className="hidden sm:flex items-center gap-1">
                {activeSteps.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      i === currentStep
                        ? "w-4 bg-primary"
                        : i < currentStep
                        ? "bg-primary/40"
                        : "bg-border"
                    )}
                  />
                ))}
              </div>
            </div>

            <Button
              onClick={goNext}
              disabled={saving}
              className="gap-1.5 rounded-full"
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
