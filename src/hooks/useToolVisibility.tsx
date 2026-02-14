import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ToolVisibility {
  tool_id: string;
  is_enabled: boolean;
}

export function useToolVisibility() {
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const { isPreviewMode } = useAuth();

  useEffect(() => {
    if (isPreviewMode) {
      // In preview mode, all tools are enabled
      setVisibility({
        'sell-upgrade-simulator': true,
        'loan-repayment': true,
        'borrowing-power': true,
        'refinance-savings': true,
        'buyer-readiness': true,
        'auction-checklist': true,
        'private-sale-checklist': true,
        'pre-approval-tracker': true,
        'vendor-fallover': true,
      });
      setLoading(false);
      return;
    }

    async function fetch() {
      const { data, error } = await supabase
        .from('tool_visibility')
        .select('tool_id, is_enabled');
      if (!error && data) {
        const map: Record<string, boolean> = {};
        data.forEach((row: ToolVisibility) => { map[row.tool_id] = row.is_enabled; });
        setVisibility(map);
      }
      setLoading(false);
    }
    fetch();
  }, [isPreviewMode]);

  const toggleTool = useCallback(async (toolId: string, enabled: boolean) => {
    setVisibility(prev => ({ ...prev, [toolId]: enabled }));
    const { error } = await supabase
      .from('tool_visibility')
      .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('tool_id', toolId);
    if (error) {
      // Revert on error
      setVisibility(prev => ({ ...prev, [toolId]: !enabled }));
      console.error('Failed to update tool visibility:', error);
    }
  }, []);

  const isToolEnabled = useCallback((toolId: string) => {
    return visibility[toolId] ?? true;
  }, [visibility]);

  return { visibility, loading, toggleTool, isToolEnabled };
}
