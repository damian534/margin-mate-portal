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
  Home, ArrowRight, Minus, BadgeDollarSign,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NGInputField } from "@/components/negative-gearing/NGInputField";
import { InputSection } from "@/components/advisor/InputSection";
import { Disclaimer } from "@/components/advisor/Disclaimer";
import { calculateRetirement, formatCurrency, formatPercent, RetirementInputs } from "@/lib/retirement/calculations";
import { cn } from "@/lib/utils";
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

  // Personal
  const [currentAge, setCurrentAge] = useState(40);
  const [retirementAge, setRetirementAge] = useState(60);
  const [desiredIncome, setDesiredIncome] = useState(100000);
  const [incomeFreq, setIncomeFreq] = useState<'annual' | 'monthly'>('annual');

  // Assumptions
  const [inflationRate, setInflationRate] = useState(3.0);
  const [assetGrowthRate, setAssetGrowthRate] = useState(8.0);
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

  const annualIncome = incomeFreq === 'monthly' ? desiredIncome * 12 : desiredIncome;
  const effectiveRentGrowth = linkRentToInflation ? inflationRate : rentGrowthRate;

  const inputs: RetirementInputs = useMemo(() => ({
    currentAge, retirementAge, desiredIncome: annualIncome,
    inflationRate, assetGrowthRate, withdrawalMode, withdrawalRate,
    assetType, propertyPrice, purchaseCostsPct, depositPct,
    loanType, loanTermYears, interestRate, rentalYield, expenseAllowancePct,
    rentGrowthRate: effectiveRentGrowth, vacancyPct, haircut, cgtRate,
    includeCashflow, includeSchedule, includeTax, includeDebtReduction, extraRepayment,
    scheduleMode, scheduleInterval,
  }), [currentAge, retirementAge, annualIncome, inflationRate, assetGrowthRate, withdrawalMode, withdrawalRate, assetType, propertyPrice, purchaseCostsPct, depositPct, loanType, loanTermYears, interestRate, rentalYield, expenseAllowancePct, effectiveRentGrowth, vacancyPct, haircut, cgtRate, includeCashflow, includeSchedule, includeTax, includeDebtReduction, extraRepayment, scheduleMode, scheduleInterval]);

  const r = useMemo(() => calculateRetirement(inputs), [inputs]);
  const yearsToRetirement = r.yearsToRetirement;

  const chartCurrencyFormatter = (v: number) => formatCurrency(v);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 space-y-6 max-w-6xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tools')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Tools
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Retirement Reverse Engineer</h1>
          <p className="text-muted-foreground text-sm">Work backwards from your passive income goal to a practical investment plan</p>
        </div>

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

        <Disclaimer />
      </main>
    </div>
  );
}
