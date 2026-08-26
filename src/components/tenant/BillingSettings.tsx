import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Button } from '@/components/ui/button';
import { CreditCard, Users, UserCog, Receipt } from 'lucide-react';

const BROKER_SEAT_PRICE = 299;
const STAFF_SEAT_PRICE = 99;

export function BillingSettings() {
  const { tenantFull, isTenantOwner } = useTenant();
  const [usage, setUsage] = useState<{ broker_seats: number; staff_seats: number; monthly_total: number } | null>(null);

  useEffect(() => {
    if (!tenantFull) return;
    (async () => {
      const { data } = await supabase.rpc('tenant_seat_usage', { _tenant_id: tenantFull.id });
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setUsage(row as any);
    })();
  }, [tenantFull]);

  if (!tenantFull) return <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading billing…</div>;

  const brokers = usage?.broker_seats ?? 0;
  const staff = usage?.staff_seats ?? 0;
  const total = Number(usage?.monthly_total ?? 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="w-4 h-4" />Broker seats</div>
          <div className="text-2xl font-semibold mt-1">{brokers}</div>
          <div className="text-xs text-muted-foreground">${BROKER_SEAT_PRICE}/mo each</div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><UserCog className="w-4 h-4" />Support staff seats</div>
          <div className="text-2xl font-semibold mt-1">{staff}</div>
          <div className="text-xs text-muted-foreground">${STAFF_SEAT_PRICE}/mo each</div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Receipt className="w-4 h-4" />Monthly total</div>
          <div className="text-2xl font-semibold mt-1">${total.toLocaleString()}</div>
          <div className="text-xs capitalize text-muted-foreground">{tenantFull.status.replace('_', ' ')}</div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Subscription</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Seats are counted automatically from the people in your team. Adding a broker or
          support staff member updates your subscription on the next billing cycle.
        </p>
        {!isTenantOwner && (
          <p className="text-sm text-muted-foreground">Only the account owner can manage billing.</p>
        )}
        <Button disabled={!isTenantOwner} variant="outline">
          Manage payment method
        </Button>
        <p className="text-xs text-muted-foreground">
          Card management opens once checkout is connected for this brokerage.
        </p>
      </div>
    </div>
  );
}
