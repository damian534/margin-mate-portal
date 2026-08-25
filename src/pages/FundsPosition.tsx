import { AppHeader } from '@/components/AppHeader';
import { AppSideNav } from '@/components/AppSideNav';
import { FundsPositionCalculator } from '@/components/funds/FundsPositionCalculator';
import { Wallet } from 'lucide-react';

export default function FundsPosition() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="flex w-full items-start">
        <AppSideNav />
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div>
            <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
              <Wallet className="w-7 h-7" /> Funds Position
            </h1>
            <p className="text-muted-foreground">
              Solve the funding position for a deal — toggle any figure on to fix it, leave it off to auto-calculate.
            </p>
          </div>
          <FundsPositionCalculator />
        </main>
      </div>
    </div>
  );
}
