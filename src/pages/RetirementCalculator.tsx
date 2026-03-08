import { useState, useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Target, TrendingUp, Building, User, DollarSign,
  Calendar, Settings2, Info, PiggyBank, Wallet, BarChart3, Clock,
  Home, ArrowRight, Minus, BadgeDollarSign, Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NGInputField } from "@/components/negative-gearing/NGInputField";
import { InputSection } from "@/components/advisor/InputSection";
import { Disclaimer } from "@/components/advisor/Disclaimer";
import { calculateRetirement, reversePropertyPrice, formatCurrency, formatPercent, RetirementInputs } from "@/lib/retirement/calculations";
import { cn } from "@/lib/utils";
import { generateRetirementPdf } from "@/lib/pdf/retirementPdf";
import { toast } from "sonner";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

function ResultCard({ title, value, subtitle, icon, variant = "default", size = "default" }: {
  title: string; value: string; subtitle?: string; icon?: React.ReactNode;
  variant?: "default" | "positive" | "negative" | "success" | "warning"; size?: "default" | "large" | "featured";
}) {
  const colors = { default: "text-foreground", positive: "text-primary", negative: "text-destructive", success: "text-success", warning: "text-warning" };
  const bgStyles = {
    default: size === "large" ? "bg-secondary/30" : "",
    positive: "bg-primary/5 border-primary/20",
    negative: "bg-destructive/5 border-destructive/20",
    success: "bg-success/5 border-success/20",
    warning: "bg-warning/5 border-warning/20",
  };
  const iconColors = {
    default: "text-muted-foreground", positive: "text-primary", negative: "text-destructive",
    success: "text-success", warning: "text-warning",
  };
  return (
    <Card className={cn("border-border/50 shadow-sm", bgStyles[variant], size === "featured" && "bg-success/10 border-success/30")}>
      <CardContent className={cn("p-4", (size === "large" || size === "featured") && "p-6")}>
        <div className={cn(size === "featured" ? "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" : "flex flex-col gap-2")}>
          <div className="flex items-center gap-2">
            {icon && <div className={cn("shrink-0", iconColors[variant])}>{icon}</div>}
            <p className={cn("font-medium text-muted-foreground", size === "featured" ? "text-base" : "text-sm")}>{title}</p>
          </div>
          <p className={cn("font-bold", size === "featured" ? "text-3xl" : size === "large" ? "text-2xl" : "text-xl", colors[variant])}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RetirementCalculator() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  // Personal
  const [currentAge, setCurrentAge] = useState(40);
  const [retirementAge, setRetirementAge] = useState(60);
  const [desiredIncome, setDesiredIncome] = useState(100000);
  const [incomeFreq, setIncomeFreq] = useState<'annual' | 'monthly'>('annual');
  const [introIncomeFreq, setIntroIncomeFreq] = useState<'weekly' | 'monthly' | 'annual'>('weekly');
  const [introIncome, setIntroIncome] = useState(2000);
  const [introPropertyCount, setIntroPropertyCount] = useState(2);

  // Assumptions
  const [inflationRate, setInflationRate] = useState(3.0);
  const [assetGrowthRate, setAssetGrowthRate] = useState(5.0);
  const [withdrawalMode, setWithdrawalMode] = useState<'withdrawal' | 'yield'>('withdrawal');
  const [withdrawalRate, setWithdrawalRate] = useState(4.0);

  // Property plan
  const [assetType] = useState<'property'>('property');
  const [propertyPrice, setPropertyPrice] = useState(750000);
  const [purchaseCostsPct, setPurchaseCostsPct] = useState(5.0);
  const [depositPct, setDepositPct] = useState(20);
  const [loanType, setLoanType] = useState<'pi' | 'io'>('pi');
  const [loanTermYears, setLoanTermYears] = useState(30);
  const [interestRate, setInterestRate] = useState(6.5);
  const [rentalYield, setRentalYield] = useState(3.5);
  const [expenseAllowancePct, setExpenseAllowancePct] = useState(20);
  const [rentGrowthRate, setRentGrowthRate] = useState(3.0);
  const [vacancyPct, setVacancyPct] = useState(2.0);
  const [haircut, setHaircut] = useState(0);
  const [linkRentToInflation, setLinkRentToInflation] = useState(true);
  const [cgtRate, setCgtRate] = useState(25);

  // Toggles
  const [includeCashflow, setIncludeCashflow] = useState(false);
  const [includeSchedule, setIncludeSchedule] = useState(false);
  const [includeTax, setIncludeTax] = useState(false);
  const [includeDebtReduction, setIncludeDebtReduction] = useState(false);
  const [extraRepayment, setExtraRepayment] = useState(0);
  const [scheduleMode, setScheduleMode] = useState<'all_now' | 'every_x_years'>('all_now');
  const [scheduleInterval, setScheduleInterval] = useState(3);

  const introAnnualIncome = introIncomeFreq === 'weekly' ? introIncome * 52 : introIncomeFreq === 'monthly' ? introIncome * 12 : introIncome;
  const annualIncome = step === 1 ? introAnnualIncome : (incomeFreq === 'monthly' ? desiredIncome * 12 : desiredIncome);
  const effectiveRentGrowth = linkRentToInflation ? inflationRate : rentGrowthRate;

  // Reverse-calculate the property price needed for the chosen number of properties (Step 1)
  const reversedPrice = useMemo(() => reversePropertyPrice(introPropertyCount, {
    currentAge, retirementAge, desiredIncome: introAnnualIncome,
    inflationRate, assetGrowthRate, withdrawalMode, withdrawalRate,
    assetType, purchaseCostsPct, depositPct,
    loanType, loanTermYears, interestRate, rentalYield, expenseAllowancePct,
    rentGrowthRate: effectiveRentGrowth, vacancyPct, haircut, cgtRate,
    includeCashflow, includeSchedule, includeTax, includeDebtReduction, extraRepayment,
    scheduleMode, scheduleInterval,
  }), [introPropertyCount, currentAge, retirementAge, introAnnualIncome, inflationRate, assetGrowthRate, withdrawalMode, withdrawalRate, assetType, purchaseCostsPct, depositPct, loanType, loanTermYears, interestRate, rentalYield, expenseAllowancePct, effectiveRentGrowth, vacancyPct, haircut, cgtRate, includeCashflow, includeSchedule, includeTax, includeDebtReduction, extraRepayment, scheduleMode, scheduleInterval]);

  const effectivePropertyPrice = step === 1 ? reversedPrice : propertyPrice;

  const inputs: RetirementInputs = useMemo(() => ({
    currentAge, retirementAge, desiredIncome: annualIncome,
    inflationRate, assetGrowthRate, withdrawalMode, withdrawalRate,
    assetType, propertyPrice: effectivePropertyPrice, purchaseCostsPct, depositPct,
    loanType, loanTermYears, interestRate, rentalYield, expenseAllowancePct,
    rentGrowthRate: effectiveRentGrowth, vacancyPct, haircut, cgtRate,
    includeCashflow, includeSchedule, includeTax, includeDebtReduction, extraRepayment,
    scheduleMode, scheduleInterval,
  }), [currentAge, retirementAge, annualIncome, inflationRate, assetGrowthRate, withdrawalMode, withdrawalRate, assetType, effectivePropertyPrice, purchaseCostsPct, depositPct, loanType, loanTermYears, interestRate, rentalYield, expenseAllowancePct, effectiveRentGrowth, vacancyPct, haircut, cgtRate, includeCashflow, includeSchedule, includeTax, includeDebtReduction, extraRepayment, scheduleMode, scheduleInterval]);

  const r = useMemo(() => calculateRetirement(inputs), [inputs]);
  const yearsToRetirement = r.yearsToRetirement;

  const chartCurrencyFormatter = (v: number) => formatCurrency(v);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 space-y-6 max-w-6xl">
        <Button variant="ghost" size="sm" onClick={() => step === 2 ? setStep(1) : navigate('/tools')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> {step === 2 ? 'Back to Overview' : 'Tools'}
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">
            {step === 1 ? 'Passive Income Planner' : 'Retirement Reverse Engineer'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {step === 1 ? 'Let\'s work out what it takes to retire on your terms' : 'Work backwards from your passive income goal to a practical investment plan'}
          </p>
        </div>

        {step === 1 ? (
          /* ═══════════════════ STEP 1 — Simple Intro ═══════════════════ */
          <div className="space-y-8 max-w-2xl mx-auto">
            {/* Input Card */}
            <Card className="border-primary/20 shadow-lg">
              <CardContent className="p-6 md:p-8 space-y-6">
                <div className="text-center mb-2">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <PiggyBank className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Answer 3 questions</h2>
                  <p className="text-sm text-muted-foreground">We'll show you a property strategy to get there</p>
                </div>

                <Separator />

                {/* Q1: Current Age */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" /> How old are you?
                  </Label>
                  <div className="flex items-center gap-4">
                    <Slider value={[currentAge]} onValueChange={([v]) => setCurrentAge(v)} min={18} max={70} step={1} className="flex-1" />
                    <span className="text-2xl font-bold text-foreground w-16 text-right">{currentAge}</span>
                  </div>
                </div>

                {/* Q2: Retirement Age */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> When do you want to retire?
                  </Label>
                  <div className="flex items-center gap-4">
                    <Slider value={[retirementAge]} onValueChange={([v]) => setRetirementAge(v)} min={currentAge + 1} max={80} step={1} className="flex-1" />
                    <span className="text-2xl font-bold text-foreground w-16 text-right">{retirementAge}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">That's {retirementAge - currentAge} years from now</p>
                </div>

                {/* Q3: Desired Income */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" /> How much passive income do you want?
                  </Label>
                  <div className="flex gap-1 mb-3">
                    {(['weekly', 'monthly', 'annual'] as const).map(f => (
                      <Button key={f} size="sm" variant={introIncomeFreq === f ? 'default' : 'outline'} className="text-xs h-8 flex-1 capitalize" onClick={() => {
                        if (f === 'weekly') setIntroIncome(2000);
                        else if (f === 'monthly') setIntroIncome(8000);
                        else setIntroIncome(100000);
                        setIntroIncomeFreq(f);
                      }}>
                        {f}
                      </Button>
                    ))}
                  </div>
                  <NGInputField
                    label={`Net income per ${introIncomeFreq} (today's dollars)`}
                    id="intro-income"
                    value={introIncome}
                    onChange={setIntroIncome}
                    prefix="$"
                    step={introIncomeFreq === 'weekly' ? 100 : introIncomeFreq === 'monthly' ? 500 : 5000}
                  />
                  <p className="text-xs text-muted-foreground">
                    = {formatCurrency(introAnnualIncome)} per year in today's dollars
                  </p>
                </div>

                {/* Q4: How many properties */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" /> How many properties do you want to buy?
                  </Label>
                  <div className="flex items-center gap-4">
                    <Slider value={[introPropertyCount]} onValueChange={([v]) => setIntroPropertyCount(v)} min={1} max={6} step={1} className="flex-1" />
                    <span className="text-2xl font-bold text-foreground w-16 text-right">{introPropertyCount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">We'll calculate the minimum price each property needs to be</p>
                </div>
              </CardContent>
            </Card>

            {/* Results Card */}
            <Card className="border-success/30 bg-success/5 shadow-lg overflow-hidden">
              <CardContent className="p-6 md:p-8 space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-1">Your Property Strategy</h3>
                  <p className="text-xs text-muted-foreground">Based on conservative assumptions</p>
                </div>

                {/* Big number — now shows price per property */}
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-4 mb-3">
                    {Array.from({ length: Math.min(introPropertyCount, 5) }).map((_, idx) => (
                      <div key={idx} className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Home className="h-7 w-7 text-primary" />
                      </div>
                    ))}
                    {introPropertyCount > 5 && (
                      <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center border border-border/50">
                        <span className="text-sm font-bold text-muted-foreground">+{introPropertyCount - 5}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-4xl md:text-5xl font-bold text-success">{introPropertyCount} {introPropertyCount === 1 ? 'property' : 'properties'}</p>
                  <p className="text-lg font-semibold text-foreground mt-2">at {formatCurrency(reversedPrice)} each</p>
                  <p className="text-muted-foreground mt-1 text-sm">is what you need to retire on your terms</p>
                </div>

                <Separator />

                {/* Purchase Timeline */}
                {introPropertyCount > 0 && (() => {
                  const n = introPropertyCount;
                  const years = r.yearsToRetirement;
                  // Space purchases evenly: first one now, rest spread across the timeline
                   const g = assetGrowthRate / 100;
                   const dep = depositPct / 100;
                   const loanPerProp = reversedPrice * (1 - dep);
                   const rm = interestRate / 100 / 12;
                   const totalLoanMonths = loanTermYears * 12;
                   const isIO = loanType === 'io';
                   const timeline = Array.from({ length: n }, (_, idx) => {
                     const buyYear = n === 1 ? 0 : Math.round((idx / (n - 1)) * Math.min(years - 1, years * 0.8));
                     const growthYears = years - buyYear;
                     const projectedValue = reversedPrice * Math.pow(1 + g, growthYears);
                     // Loan balance at retirement for this property
                     const elapsedMonths = Math.min(growthYears * 12, totalLoanMonths);
                     let loanBal: number;
                     if (isIO) {
                       loanBal = loanPerProp;
                     } else if (rm === 0) {
                       loanBal = loanPerProp - (loanPerProp / totalLoanMonths) * elapsedMonths;
                     } else if (elapsedMonths >= totalLoanMonths) {
                       loanBal = 0;
                     } else {
                       const monthlyPmt = (rm * loanPerProp * Math.pow(1 + rm, totalLoanMonths)) / (Math.pow(1 + rm, totalLoanMonths) - 1);
                       loanBal = loanPerProp * Math.pow(1 + rm, elapsedMonths) - monthlyPmt * ((Math.pow(1 + rm, elapsedMonths) - 1) / rm);
                     }
                     loanBal = Math.max(0, loanBal);
                     return { propertyNum: idx + 1, year: buyYear, age: currentAge + buyYear, projectedValue, loanBalance: loanBal };
                   });
                  return (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" /> Your Purchase Timeline
                      </h4>
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-border" />
                        <div className="space-y-0">
                          {timeline.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 relative py-2">
                              {/* Dot */}
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2",
                                idx === 0 ? "bg-primary text-primary-foreground border-primary" : "bg-background border-primary/40"
                              )}>
                                <Home className={cn("h-4 w-4", idx === 0 ? "text-primary-foreground" : "text-primary")} />
                              </div>
                              {/* Content */}
                              <div className="flex-1 flex items-center justify-between bg-background/80 rounded-lg px-4 py-3 border border-border/50">
                                <div>
                                  <p className="font-semibold text-sm text-foreground">
                                    Property {item.propertyNum}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.year === 0 ? 'Buy now' : `Buy in year ${item.year}`} · Age {item.age}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-foreground">{formatCurrency(reversedPrice)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Worth {formatCurrency(item.projectedValue)} at retirement
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Loan bal. {formatCurrency(item.loanBalance)} at retirement
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {/* Retirement marker */}
                          <div className="flex items-center gap-4 relative py-2">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 bg-success text-success-foreground border-success">
                              <Target className="h-4 w-4" />
                            </div>
                            <div className="flex-1 bg-success/10 rounded-lg px-4 py-3 border border-success/30">
                              <p className="font-semibold text-sm text-foreground">
                                🎉 Retire at age {retirementAge}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Portfolio worth {formatCurrency(r.totalGrossValue)} · Passive income {formatCurrency(r.incomeAtRetirement)}/yr
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <Separator />

                {/* Summary bullets */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                    <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">
                        You have {r.yearsToRetirement} years to build your portfolio
                      </p>
                      <p className="text-muted-foreground text-xs">Retiring at age {retirementAge}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                    <DollarSign className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">
                        Your {formatCurrency(introAnnualIncome)}/yr will be worth {formatCurrency(r.incomeAtRetirement)}/yr
                      </p>
                      <p className="text-muted-foreground text-xs">Adjusted for inflation over {r.yearsToRetirement} years</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                    <Building className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <div>
                       <p className="font-medium text-foreground">
                        A {formatCurrency(reversedPrice)} property bought today could be worth {formatCurrency(r.propertyValueAtRetirement)} at retirement
                      </p>
                      <p className="text-muted-foreground text-xs">At {formatPercent(assetGrowthRate)} average growth per year · Properties bought later will have less growth time</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                    <Target className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">
                        Net proceeds after loans & tax: {formatCurrency(r.totalNetInvestable)}
                      </p>
                      <p className="text-muted-foreground text-xs">Invested at {formatPercent(withdrawalRate)} = {formatCurrency(r.totalNetInvestable * withdrawalRate / 100)}/yr passive income</p>
                    </div>
                  </div>
                </div>

                <Button size="lg" className="w-full text-base" onClick={() => {
                  // Sync intro values to detailed view
                  setDesiredIncome(introIncomeFreq === 'annual' ? introIncome : introAnnualIncome);
                  setIncomeFreq('annual');
                  setPropertyPrice(reversedPrice);
                  setStep(2);
                }}>
                  See Full Breakdown <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <p className="text-xs text-center text-muted-foreground">Customise every assumption, view charts, sensitivity analysis & more</p>
              </CardContent>
            </Card>
          </div>
        ) : (
        /* ═══════════════════ STEP 2 — Full Detail (existing) ═══════════════════ */
        <>
        {/* ── Headline Results ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ResultCard title="Income at Retirement" value={formatCurrency(r.incomeAtRetirement)} subtitle={`Today's $${annualIncome.toLocaleString()} inflated over ${yearsToRetirement} yrs`} icon={<DollarSign className="h-5 w-5" />} variant="warning" size="large" />
          <ResultCard title="Asset Base Required" value={formatCurrency(r.assetBaseRequired)} subtitle={`At ${withdrawalMode === 'withdrawal' ? 'withdrawal' : 'yield'} rate of ${formatPercent(withdrawalRate)}`} icon={<Target className="h-5 w-5" />} variant="positive" size="large" />
          <ResultCard title="Equivalent Today" value={formatCurrency(r.assetBaseToday)} subtitle={`PV at ${formatPercent(assetGrowthRate)} growth`} icon={<TrendingUp className="h-5 w-5" />} variant="success" size="large" />
          <ResultCard title="Properties Needed" value={`${r.propertiesNeeded}`} subtitle={`@ ${formatCurrency(propertyPrice)} each today`} icon={<Building className="h-5 w-5" />} variant="success" size="large" />
        </div>

        {/* ── Plain English Summary ── */}
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-6">
            <p className="text-sm leading-relaxed text-foreground">
              To generate <strong>{formatCurrency(r.incomeAtRetirement)}/yr</strong> in retirement at age {retirementAge}, 
              you'll need approximately <strong>{formatCurrency(r.assetBaseRequired)}</strong> in assets 
              (assuming a {formatPercent(withdrawalRate)} {withdrawalMode === 'withdrawal' ? 'withdrawal rate' : 'net yield'}). 
              At {formatPercent(assetGrowthRate)} annual growth, that's equivalent to <strong>{formatCurrency(r.assetBaseToday)}</strong> invested today.
              {assetType === 'property' && (
                <> If achieved via property, that's roughly <strong>{r.propertiesNeeded} properties</strong> at {formatCurrency(propertyPrice)} today, 
                growing to ~{formatCurrency(r.propertyValueAtRetirement)} each by retirement.</>
              )}
            </p>
          </CardContent>
        </Card>

        {/* ── End Position Visual ── */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" /> End Position at Retirement (Age {retirementAge})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Property icons row */}
            {(() => {
              const nProps = r.propertiesNeeded;
              const years = r.yearsToRetirement;
              const g = assetGrowthRate / 100;
              const dep = depositPct / 100;
              const loanPerProp = propertyPrice * (1 - dep);
              const rm = interestRate / 100 / 12;
              const totalLoanMonths = loanTermYears * 12;
              const isIO = loanType === 'io';
              const cgtR = cgtRate / 100;
              const h = haircut / 100;
              const endTimeline = Array.from({ length: nProps }, (_, idx) => {
                const buyYear = nProps === 1 ? 0 : Math.round((idx / (nProps - 1)) * Math.min(years - 1, years * 0.8));
                const growthYears = years - buyYear;
                const projectedValue = propertyPrice * Math.pow(1 + g, growthYears) * (1 - h);
                const elapsedMonths = Math.min(growthYears * 12, totalLoanMonths);
                let loanBal: number;
                if (isIO) { loanBal = loanPerProp; }
                else if (rm === 0) { loanBal = loanPerProp - (loanPerProp / totalLoanMonths) * elapsedMonths; }
                else if (elapsedMonths >= totalLoanMonths) { loanBal = 0; }
                else {
                  const monthlyPmt = (rm * loanPerProp * Math.pow(1 + rm, totalLoanMonths)) / (Math.pow(1 + rm, totalLoanMonths) - 1);
                  loanBal = loanPerProp * Math.pow(1 + rm, elapsedMonths) - monthlyPmt * ((Math.pow(1 + rm, elapsedMonths) - 1) / rm);
                }
                loanBal = Math.max(0, loanBal);
                const gain = Math.max(0, projectedValue - propertyPrice);
                const cgtPayable = gain * 0.5 * cgtR;
                return { propertyNum: idx + 1, buyYear, growthYears, projectedValue, loanBalance: loanBal, capitalGain: gain, cgtPayable };
              });

              // Accurate totals based on per-property calculations
              const actualTotalGross = endTimeline.reduce((s, p) => s + p.projectedValue, 0);
              const actualTotalLoans = endTimeline.reduce((s, p) => s + p.loanBalance, 0);
              const actualTotalGain = endTimeline.reduce((s, p) => s + p.capitalGain, 0);
              const actualTotalCgt = endTimeline.reduce((s, p) => s + p.cgtPayable, 0);
              const actualNetProceeds = actualTotalGross - actualTotalLoans - actualTotalCgt;

              return (
              <>
              <div className="flex flex-wrap gap-4 justify-center">
                {endTimeline.slice(0, 8).map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/40 border border-border/50 min-w-[120px]">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Home className="h-7 w-7 text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Property {item.propertyNum}</span>
                    <span className="text-sm font-bold text-success">{formatCurrency(item.projectedValue)}</span>
                    <span className="text-[10px] text-muted-foreground">{item.growthYears}yr growth</span>
                    <span className="text-[10px] text-destructive">Loan: {formatCurrency(item.loanBalance)}</span>
                  </div>
                ))}
                {r.propertiesNeeded > 8 && (
                  <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-secondary/40 border border-border/50 min-w-[120px]">
                    <span className="text-2xl font-bold text-muted-foreground">+{r.propertiesNeeded - 8}</span>
                    <span className="text-xs text-muted-foreground">more properties</span>
                  </div>
                )}
              </div>

            {/* Waterfall breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Portfolio Summary
                </h4>
                <div className="space-y-2">
                  {[
                    { label: 'Total Gross Value', value: actualTotalGross, color: 'text-foreground', bold: true },
                    { label: 'Outstanding Loans', value: -actualTotalLoans, color: 'text-destructive', bold: false },
                    { label: 'Total Capital Gain', value: actualTotalGain, color: 'text-muted-foreground', bold: false },
                    { label: `CGT Payable (${cgtRate}% on 50% gain)`, value: -actualTotalCgt, color: 'text-destructive', bold: false },
                  ].map((row) => (
                    <div key={row.label} className={cn("flex justify-between text-sm px-3 py-2 rounded-lg", row.bold ? "bg-muted/50" : "")}>
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className={cn("font-medium", row.color)}>{formatCurrency(row.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BadgeDollarSign className="h-4 w-4 text-success" /> Net Result
                </h4>
                <div className="rounded-xl border-2 border-success/30 bg-success/5 p-5 space-y-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Net Investable Proceeds</p>
                    <p className="text-3xl font-bold text-success">{formatCurrency(actualNetProceeds)}</p>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Invested at {formatPercent(withdrawalRate)}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-success">{formatCurrency(actualNetProceeds * withdrawalRate / 100)}/yr</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Target income</span>
                    <span className="font-semibold text-warning">{formatCurrency(r.incomeAtRetirement)}/yr</span>
                  </div>
                  <div className={cn("flex items-center justify-between text-sm p-2 rounded-lg", actualNetProceeds * withdrawalRate / 100 >= r.incomeAtRetirement ? "bg-success/10" : "bg-warning/10")}>
                    <span className="font-medium">{actualNetProceeds * withdrawalRate / 100 >= r.incomeAtRetirement ? '✅ Goal Achieved' : '⚠️ Shortfall'}</span>
                    <span className={cn("font-bold", actualNetProceeds * withdrawalRate / 100 >= r.incomeAtRetirement ? "text-success" : "text-warning")}>
                      {formatCurrency(Math.abs(actualNetProceeds * withdrawalRate / 100 - r.incomeAtRetirement))}
                      {actualNetProceeds * withdrawalRate / 100 >= r.incomeAtRetirement ? ' surplus' : ' short'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            </>
            );
            })()}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Left Panel: Inputs ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Personal Details */}
            <InputSection title="Personal Details" icon={<User className="h-5 w-5 text-primary" />}>
              <NGInputField label="Current Age" id="current-age" value={currentAge} onChange={setCurrentAge} suffix="yrs" min={18} max={80} />
              <NGInputField label="Target Retirement Age" id="retirement-age" value={retirementAge} onChange={setRetirementAge} suffix="yrs" min={currentAge + 1} max={100} />
              <div className="p-3 bg-muted/50 rounded-lg flex justify-between text-sm">
                <span className="text-muted-foreground">Years to Retirement</span>
                <span className="font-semibold">{yearsToRetirement} years</span>
              </div>
            </InputSection>

            {/* Income Goal */}
            <InputSection title="Retirement Income Goal" icon={<DollarSign className="h-5 w-5 text-primary" />}>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-sm font-medium">Frequency</Label>
                <div className="flex gap-1">
                  {(['annual', 'monthly'] as const).map(f => (
                    <Button key={f} size="sm" variant={incomeFreq === f ? 'default' : 'outline'} className="text-xs h-7 px-3" onClick={() => setIncomeFreq(f)}>
                      {f === 'annual' ? 'Annual' : 'Monthly'}
                    </Button>
                  ))}
                </div>
              </div>
              <NGInputField label={`Desired Passive Income (${incomeFreq === 'monthly' ? 'Monthly' : 'Annual'}, Today's $)`} id="desired-income" value={desiredIncome} onChange={setDesiredIncome} prefix="$" step={5000} />
              {incomeFreq === 'monthly' && (
                <p className="text-xs text-muted-foreground">= {formatCurrency(annualIncome)} per year</p>
              )}
            </InputSection>

            {/* Assumptions */}
            <InputSection title="Assumptions (Base Case)" icon={<Settings2 className="h-5 w-5 text-primary" />}>
              <NGInputField label="Inflation Rate" id="inflation" value={inflationRate} onChange={setInflationRate} suffix="% p.a." step={0.5} max={15} />
              <NGInputField label="Asset Growth Rate" id="growth" value={assetGrowthRate} onChange={setAssetGrowthRate} suffix="% p.a." step={0.5} max={20} />
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Post-Sale Investment Return</Label>
                <p className="text-xs text-muted-foreground flex items-start gap-1 mb-2">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  At retirement you sell your properties and invest the proceeds. What sustainable annual return (or withdrawal rate) will that investment produce?
                </p>
                <RadioGroup value={withdrawalMode} onValueChange={(v) => setWithdrawalMode(v as 'withdrawal' | 'yield')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="withdrawal" id="wm-withdrawal" />
                    <Label htmlFor="wm-withdrawal" className="text-sm cursor-pointer">Safe Withdrawal Rate (% of portfolio)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yield" id="wm-yield" />
                    <Label htmlFor="wm-yield" className="text-sm cursor-pointer">Expected Net Yield (% of portfolio)</Label>
                  </div>
                </RadioGroup>
                <NGInputField label={withdrawalMode === 'withdrawal' ? 'Withdrawal Rate' : 'Net Yield'} id="withdrawal-rate" value={withdrawalRate} onChange={setWithdrawalRate} suffix="%" step={0.5} max={10} />
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Capital Gains Tax (Simplified)</Label>
                <p className="text-xs text-muted-foreground flex items-start gap-1 mb-2">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  Flat effective tax rate applied to 50% of the capital gain (after CGT discount for assets held &gt;12 months).
                </p>
                <NGInputField label="Effective CGT Rate" id="cgt-rate" value={cgtRate} onChange={setCgtRate} suffix="%" step={1} max={47} />
              </div>
            </InputSection>

            {/* Property Plan */}
            <InputSection title="Property Plan" icon={<Building className="h-5 w-5 text-primary" />}>
              <p className="text-xs text-muted-foreground mb-2">
                Define the type of property you'd buy today. At retirement, you sell and invest the proceeds to fund your passive income.
              </p>
                  <NGInputField label="Average Property Purchase Price Today" id="prop-price" value={propertyPrice} onChange={setPropertyPrice} prefix="$" step={25000} />
                  <NGInputField label="Purchase Costs (stamp duty + legals)" id="purchase-costs" value={purchaseCostsPct} onChange={setPurchaseCostsPct} suffix="%" step={0.5} max={15} />
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Deposit: {depositPct}% (LVR {100 - depositPct}%)</Label>
                    <Slider value={[depositPct]} onValueChange={([v]) => setDepositPct(v)} min={5} max={50} step={5} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Loan Type</Label>
                    <div className="flex gap-2">
                      {([['pi', 'P&I'], ['io', 'Interest Only']] as const).map(([v, l]) => (
                        <Button key={v} size="sm" variant={loanType === v ? 'default' : 'outline'} className="text-xs h-8 flex-1" onClick={() => setLoanType(v)}>
                          {l}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <NGInputField label="Loan Term" id="loan-term" value={loanTermYears} onChange={setLoanTermYears} suffix="years" min={1} max={30} />
                  <NGInputField label="Interest Rate" id="interest-rate" value={interestRate} onChange={setInterestRate} suffix="% p.a." step={0.25} max={15} />
                  <NGInputField label="Rental Yield (gross)" id="rental-yield" value={rentalYield} onChange={setRentalYield} suffix="%" step={0.5} max={15} />
                  <NGInputField label="Expense Allowance" id="expenses" value={expenseAllowancePct} onChange={setExpenseAllowancePct} suffix="% of rent" step={5} max={50} />
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm cursor-pointer" htmlFor="link-rent">Link rent growth to inflation</Label>
                    <Switch id="link-rent" checked={linkRentToInflation} onCheckedChange={setLinkRentToInflation} />
                  </div>
                  {!linkRentToInflation && (
                    <NGInputField label="Rent Growth" id="rent-growth" value={rentGrowthRate} onChange={setRentGrowthRate} suffix="% p.a." step={0.5} max={10} />
                  )}
                  <NGInputField label="Vacancy Allowance" id="vacancy" value={vacancyPct} onChange={setVacancyPct} suffix="% of rent" step={1} max={10} />
            </InputSection>

            {/* Optional Toggles */}
            <InputSection title="Optional Features" icon={<Settings2 className="h-5 w-5 text-primary" />}>
              {[
                { label: 'Include net cashflow estimate', checked: includeCashflow, onChange: setIncludeCashflow },
                { label: 'Include purchase schedule', checked: includeSchedule, onChange: setIncludeSchedule },
                { label: 'Include tax placeholders (simple)', checked: includeTax, onChange: setIncludeTax },
                { label: 'Debt reduction strategy', checked: includeDebtReduction, onChange: setIncludeDebtReduction },
              ].map(t => (
                <div key={t.label} className="flex items-center justify-between">
                  <Label className="text-sm cursor-pointer">{t.label}</Label>
                  <Switch checked={t.checked} onCheckedChange={t.onChange} />
                </div>
              ))}

              {includeDebtReduction && (
                <NGInputField label="Extra Repayment (per month)" id="extra-repay" value={extraRepayment} onChange={setExtraRepayment} prefix="$" step={100} />
              )}

              {includeSchedule && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/30">
                  <Label className="text-sm font-medium">Purchase Schedule</Label>
                  <RadioGroup value={scheduleMode} onValueChange={(v) => setScheduleMode(v as 'all_now' | 'every_x_years')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all_now" id="sched-all" />
                      <Label htmlFor="sched-all" className="text-sm cursor-pointer">Buy all now</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="every_x_years" id="sched-every" />
                      <Label htmlFor="sched-every" className="text-sm cursor-pointer">Buy every X years</Label>
                    </div>
                  </RadioGroup>
                  {scheduleMode === 'every_x_years' && (
                    <NGInputField label="Buy every" id="sched-interval" value={scheduleInterval} onChange={setScheduleInterval} suffix="years" min={1} max={10} />
                  )}
                </div>
              )}

              {assetType === 'property' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Value Haircut: {haircut}%</Label>
                  <Slider value={[haircut]} onValueChange={([v]) => setHaircut(v)} min={0} max={30} step={5} />
                  <p className="text-xs text-muted-foreground">Conservative discount applied to projected property value</p>
                </div>
              )}
            </InputSection>
          </div>

          {/* ── Right Panel: Outputs ── */}
          <div className="lg:col-span-3 space-y-5">
            {/* Purchase & Funding Breakdown */}
            {assetType === 'property' && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Purchase & Funding Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Per Property</TableHead>
                        <TableHead className="text-right">Total ({r.propertiesNeeded} properties)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow><TableCell>Property Price</TableCell><TableCell className="text-right">{formatCurrency(propertyPrice)}</TableCell><TableCell className="text-right">{formatCurrency(propertyPrice * r.propertiesNeeded)}</TableCell></TableRow>
                      <TableRow><TableCell>Deposit ({depositPct}%)</TableCell><TableCell className="text-right">{formatCurrency(propertyPrice * depositPct / 100)}</TableCell><TableCell className="text-right">{formatCurrency(propertyPrice * depositPct / 100 * r.propertiesNeeded)}</TableCell></TableRow>
                      <TableRow><TableCell>Purchase Costs ({purchaseCostsPct}%)</TableCell><TableCell className="text-right">{formatCurrency(propertyPrice * purchaseCostsPct / 100)}</TableCell><TableCell className="text-right">{formatCurrency(propertyPrice * purchaseCostsPct / 100 * r.propertiesNeeded)}</TableCell></TableRow>
                      <TableRow className="font-semibold"><TableCell>Cash Required</TableCell><TableCell className="text-right">{formatCurrency(r.cashPerProperty)}</TableCell><TableCell className="text-right">{formatCurrency(r.totalCashNeeded)}</TableCell></TableRow>
                      <TableRow><TableCell>Loan Amount</TableCell><TableCell className="text-right">{formatCurrency(r.loanPerProperty)}</TableCell><TableCell className="text-right">{formatCurrency(r.loanPerProperty * r.propertiesNeeded)}</TableCell></TableRow>
                      <TableRow><TableCell>Monthly Repayment ({loanType === 'io' ? 'IO' : 'P&I'})</TableCell><TableCell className="text-right">{formatCurrency(r.monthlyRepayment)}</TableCell><TableCell className="text-right">{formatCurrency(r.monthlyRepayment * r.propertiesNeeded)}</TableCell></TableRow>
                      {includeCashflow && (
                        <>
                          <TableRow><TableCell>Monthly Net Rent</TableCell><TableCell className="text-right">{formatCurrency(r.monthlyNetRent)}</TableCell><TableCell className="text-right">{formatCurrency(r.monthlyNetRent * r.propertiesNeeded)}</TableCell></TableRow>
                          <TableRow className={cn("font-semibold", r.monthlyCashflow >= 0 ? "text-primary" : "text-destructive")}>
                            <TableCell>Monthly Cashflow</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.monthlyCashflow)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.monthlyCashflow * r.propertiesNeeded)}</TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Sensitivity */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Sensitivity Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scenario</TableHead>
                      <TableHead className="text-right">Income Needed</TableHead>
                      <TableHead className="text-right">Assets Required</TableHead>
                      {assetType === 'property' && <TableHead className="text-right">Properties</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.sensitivity.map(s => (
                      <TableRow key={s.label} className={s.label === 'Base Case' ? 'bg-muted/30 font-semibold' : ''}>
                        <TableCell>{s.label}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.incomeAtRetirement)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.assetBaseRequired)}</TableCell>
                        {assetType === 'property' && <TableCell className="text-right">{s.propertiesNeeded}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Purchase Schedule */}
            {includeSchedule && r.purchaseSchedule.length > 0 && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Purchase Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead className="text-right">Your Age</TableHead>
                        <TableHead className="text-right">Cumulative Properties</TableHead>
                        <TableHead className="text-right">Cumulative Cash Required</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.purchaseSchedule.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell>Year {s.year}</TableCell>
                          <TableCell className="text-right">{currentAge + s.year}</TableCell>
                          <TableCell className="text-right">{s.cumulativeProperties}</TableCell>
                          <TableCell className="text-right">{formatCurrency(s.cumulativeCash)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Charts */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-success" /> Asset Growth Path</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={r.growthPath}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="year" label={{ value: "Year", position: "insideBottom", offset: -5 }} className="text-xs" />
                      <YAxis tickFormatter={chartCurrencyFormatter} className="text-xs" width={90} />
                      <RechartsTooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `Year ${l} (Age ${currentAge + Number(l)})`} />
                      <ReferenceLine y={r.assetBaseRequired} stroke="hsl(var(--warning))" strokeDasharray="5 5" label={{ value: "Target", position: "right", fill: "hsl(var(--warning))" }} />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="Asset Value" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><DollarSign className="h-5 w-5 text-warning" /> Income: Today vs Inflated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={r.incomePath}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="year" label={{ value: "Year", position: "insideBottom", offset: -5 }} className="text-xs" />
                      <YAxis tickFormatter={chartCurrencyFormatter} className="text-xs" width={90} />
                      <RechartsTooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `Year ${l}`} />
                      <Line type="monotone" dataKey="today" stroke="hsl(var(--success))" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Today's Dollars" />
                      <Line type="monotone" dataKey="inflated" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} name="Inflation-Adjusted" />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sensitivity Bar Chart */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Properties by Scenario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={r.sensitivity}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="label" className="text-xs" />
                      <YAxis className="text-xs" />
                      <RechartsTooltip />
                      <Bar dataKey="propertiesNeeded" fill="hsl(var(--primary))" name="Properties Needed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Download PDF button */}
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="lg" onClick={async () => {
            try {
              await generateRetirementPdf(inputs, r);
              toast.success("PDF downloaded successfully");
            } catch (e) {
              console.error(e);
              toast.error("Failed to generate PDF");
            }
          }}>
            <Download className="h-4 w-4 mr-2" /> Download as PDF
          </Button>
        </div>

        <Disclaimer />
        </>
        )}
      </main>
    </div>
  );
}
