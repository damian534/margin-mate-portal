import { useState, useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, Building, Home, User, Users, Calculator, TrendingUp, Wallet, Info,
  Sparkles, Loader2, Eye, Download, Landmark, Percent, Receipt, PiggyBank, Trash2, Plus, Settings2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NGInputField } from "@/components/negative-gearing/NGInputField";
import { calculateStampDuty, AUSTRALIAN_STATES, AustralianState } from "@/lib/negative-gearing/stampDuty";
import { SuburbSearchInput } from "@/components/negative-gearing/SuburbSearchInput";
import { SuburbAnalysisCard } from "@/components/negative-gearing/SuburbAnalysisCard";
import { SuburbReportModal } from "@/components/negative-gearing/SuburbReportModal";
import { SuburbAnalysis, analyzeSuburbGrowth } from "@/lib/suburbAnalysis";
import { generateSuburbReportPdf } from "@/lib/pdf/suburbReportPdf";
import { WealthReconciliation } from "@/components/investment/WealthReconciliation";
import { SaleYearTable } from "@/components/investment/SaleYearTable";
import { YearByYearTable } from "@/components/investment/YearByYearTable";
import { ComparisonPanel } from "@/components/investment/ComparisonPanel";
import { ShowCalculation } from "@/components/investment/ShowCalculation";
import {
  runInvestmentEngine, EngineInputs, CapitalImprovement, formatCurrency, formatPercent2,
} from "@/lib/investment/engine";
import { taxRules, marginalRate, isGrandfatheredByDate, PropertyTaxCategory } from "@/lib/investment/taxRules";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function MetricCard({ title, value, subtitle, icon, tone = "default", size = "default", calculation }: {
  title: string; value: string; subtitle?: string; icon?: React.ReactNode;
  tone?: "default" | "positive" | "negative"; size?: "default" | "featured"; calculation?: string[];
}) {
  return (
    <Card className={cn("border-border/50", size === "featured" && "bg-primary/5 border-primary/30")}>
      <CardContent className={cn("p-4", size === "featured" && "p-6")}>
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
          <p className={cn("font-medium text-muted-foreground", size === "featured" ? "text-base" : "text-xs")}>{title}</p>
        </div>
        <p className={cn("font-bold mt-1 tabular-nums",
          size === "featured" ? "text-3xl" : "text-xl",
          tone === "positive" && "text-primary", tone === "negative" && "text-destructive")}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {calculation && <ShowCalculation lines={calculation} />}
      </CardContent>
    </Card>
  );
}

export default function NegativeGearingCalculator() {
  const navigate = useNavigate();

  // ── Property & tax category ──
  const [propertyType, setPropertyType] = useState<PropertyTaxCategory>("established");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [purchasePrice, setPurchasePrice] = useState(800000);
  const [state, setState] = useState<AustralianState>("VIC");
  const [manualStampDuty, setManualStampDuty] = useState<number | null>(null);
  const [legalFees, setLegalFees] = useState(2000);
  const [buyersAgentFee, setBuyersAgentFee] = useState(0);
  const [otherAcquisitionCosts, setOtherAcquisitionCosts] = useState(1500);
  const [loanEstablishmentCosts, setLoanEstablishmentCosts] = useState(800);

  // ── Loan ──
  const [deposit, setDeposit] = useState(160000);
  const [interestRate, setInterestRate] = useState(6);
  const [loanTerm, setLoanTerm] = useState(30);
  const [interestOnlyYears, setInterestOnlyYears] = useState(5);
  const [manualLoan, setManualLoan] = useState<number | null>(null);
  const [repaymentType, setRepaymentType] = useState<"interest-only" | "principal-interest">("interest-only");
  const [borrowFullCost, setBorrowFullCost] = useState(false);
  const [financeAcquisitionCosts, setFinanceAcquisitionCosts] = useState(true);

  // ── Rental ──
  const [weeklyRent, setWeeklyRent] = useState(650);
  const [rentalGrowthRate, setRentalGrowthRate] = useState(3);
  const [vacancyRatePercent, setVacancyRatePercent] = useState(3);
  const [otherPropertyIncome, setOtherPropertyIncome] = useState(0);

  // ── Expenses ──
  const [managementFeePercent, setManagementFeePercent] = useState(7.5);
  const [lettingFeesWeeks, setLettingFeesWeeks] = useState(1);
  const [councilRates, setCouncilRates] = useState(2200);
  const [waterCharges, setWaterCharges] = useState(900);
  const [strata, setStrata] = useState(0);
  const [buildingInsurance, setBuildingInsurance] = useState(1600);
  const [landlordInsurance, setLandlordInsurance] = useState(400);
  const [maintenance, setMaintenance] = useState(1500);
  const [repairs, setRepairs] = useState(500);
  const [landTax, setLandTax] = useState(1200);
  const [accountingFees, setAccountingFees] = useState(400);
  const [complianceCosts, setComplianceCosts] = useState(200);
  const [otherExpenses, setOtherExpenses] = useState(0);
  const [indexExpenses, setIndexExpenses] = useState(true);

  // ── Depreciation ──
  const [depreciationEnabled, setDepreciationEnabled] = useState(true);
  const [div40Annual, setDiv40Annual] = useState(0);
  const [div43Annual, setDiv43Annual] = useState(4000);

  // ── Growth, inflation, sale ──
  const [capitalGrowthRate, setCapitalGrowthRate] = useState(5);
  const [inflationRate, setInflationRate] = useState(2.5);
  const [holdYears, setHoldYears] = useState(15);
  const [agentCommissionPercent, setAgentCommissionPercent] = useState(2.2);
  const [marketingCosts, setMarketingCosts] = useState(5000);
  const [saleLegalFees, setSaleLegalFees] = useState(1500);
  const [dischargeCosts, setDischargeCosts] = useState(600);
  const [otherSellingCosts, setOtherSellingCosts] = useState(0);
  const [cgtMethod, setCgtMethod] = useState<"auto" | "discount" | "indexation">("auto");
  const [improvements, setImprovements] = useState<CapitalImprovement[]>([]);

  // ── Investors ──
  const [isJoint, setIsJoint] = useState(false);
  const [a1Ownership, setA1Ownership] = useState(50);
  const [a1Income, setA1Income] = useState(180000);
  const [a1Medicare, setA1Medicare] = useState(true);
  const [a2Income, setA2Income] = useState(120000);
  const [a2Medicare, setA2Medicare] = useState(true);

  // ── Advanced ──
  const [opportunityCostEnabled, setOpportunityCostEnabled] = useState(false);
  const [alternativeReturnRate, setAlternativeReturnRate] = useState(7);
  const [comparisonMode, setComparisonMode] = useState(false);

  // ── Suburb finder ──
  const [selectedSuburb, setSelectedSuburb] = useState("");
  const [suburbState, setSuburbState] = useState("VIC");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suburbAnalysis, setSuburbAnalysis] = useState<SuburbAnalysis | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const stampDuty = useMemo(
    () => manualStampDuty ?? calculateStampDuty(purchasePrice, state),
    [manualStampDuty, purchasePrice, state],
  );
  const acquisitionCosts = stampDuty + legalFees + buyersAgentFee + otherAcquisitionCosts;
  const fullCostLoan = purchasePrice + (financeAcquisitionCosts ? acquisitionCosts : 0);
  const loanAmount = borrowFullCost
    ? fullCostLoan
    : (manualLoan ?? Math.max(0, purchasePrice - deposit));
  const effectiveDeposit = borrowFullCost ? 0 : deposit;
  const effectiveInterestOnlyYears = repaymentType === "principal-interest" ? 0 : interestOnlyYears;
  const lvr = purchasePrice > 0 ? (loanAmount / purchasePrice) * 100 : 0;
  const grandfathered = isGrandfatheredByDate(new Date(purchaseDate));

  const baseInputs: EngineInputs = useMemo(() => ({
    propertyType, purchaseDate,
    purchasePrice, stampDuty, legalFees, buyersAgentFee, otherAcquisitionCosts, loanEstablishmentCosts,
    deposit: effectiveDeposit, loanAmount, interestRate, loanTerm, interestOnlyYears: effectiveInterestOnlyYears,
    weeklyRent, rentalGrowthRate, vacancyRatePercent, otherPropertyIncome,
    expenses: {
      managementFeePercent, lettingFeesWeeks, councilRates, waterCharges, strata,
      buildingInsurance, landlordInsurance, maintenance, repairs, landTax,
      accountingFees, complianceCosts, otherExpenses,
    },
    indexExpensesWithInflation: indexExpenses, inflationRate,
    depreciationEnabled, div40Annual, div43Annual,
    capitalGrowthRate, holdYears, improvements,
    agentCommissionPercent, marketingCosts, saleLegalFees, dischargeCosts, otherSellingCosts,
    investors: isJoint
      ? [
          { name: "Investor 1", taxableIncome: a1Income, includeMedicare: a1Medicare, ownershipPercent: a1Ownership },
          { name: "Investor 2", taxableIncome: a2Income, includeMedicare: a2Medicare, ownershipPercent: 100 - a1Ownership },
        ]
      : [{ name: "Investor 1", taxableIncome: a1Income, includeMedicare: a1Medicare, ownershipPercent: 100 }],
    cgtMethod,
    opportunityCostEnabled, alternativeReturnRate,
  }), [propertyType, purchaseDate, purchasePrice, stampDuty, legalFees, buyersAgentFee, otherAcquisitionCosts,
      loanEstablishmentCosts, effectiveDeposit, loanAmount, interestRate, loanTerm, effectiveInterestOnlyYears, weeklyRent,
      rentalGrowthRate, vacancyRatePercent, otherPropertyIncome, managementFeePercent, lettingFeesWeeks,
      councilRates, waterCharges, strata, buildingInsurance, landlordInsurance, maintenance, repairs, landTax,
      accountingFees, complianceCosts, otherExpenses, indexExpenses, inflationRate, depreciationEnabled,
      div40Annual, div43Annual, capitalGrowthRate, holdYears, improvements, agentCommissionPercent,
      marketingCosts, saleLegalFees, dischargeCosts, otherSellingCosts, isJoint, a1Income, a1Medicare,
      a1Ownership, a2Income, a2Medicare, cgtMethod, opportunityCostEnabled, alternativeReturnRate]);

  const results = useMemo(() => runInvestmentEngine(baseInputs), [baseInputs]);
  const comparison = useMemo(() => comparisonMode ? {
    established: runInvestmentEngine({ ...baseInputs, propertyType: "established" }),
    newBuild: runInvestmentEngine({ ...baseInputs, propertyType: "new-build" }),
  } : null, [comparisonMode, baseInputs]);

  const handleAnalyzeSuburb = async () => {
    if (!selectedSuburb || selectedSuburb.length < 2) { toast.error("Please enter a suburb name to analyse."); return; }
    setIsAnalyzing(true); setSuburbAnalysis(null);
    try {
      const result = await analyzeSuburbGrowth(selectedSuburb, suburbState, holdYears);
      if (result.success && result.data) { setSuburbAnalysis(result.data); toast.success(`Growth analysis for ${selectedSuburb} is ready.`); }
      else toast.error(result.error || "Unable to analyse this suburb.");
    } catch { toast.error("Failed to connect to analysis service."); }
    finally { setIsAnalyzing(false); }
  };

  const addImprovement = () => setImprovements(prev => [...prev, { year: Math.min(5, holdYears), amount: 25000, description: "Renovation" }]);
  const updateImprovement = (i: number, patch: Partial<CapitalImprovement>) =>
    setImprovements(prev => prev.map((im, idx) => idx === i ? { ...im, ...patch } : im));
  const removeImprovement = (i: number) => setImprovements(prev => prev.filter((_, idx) => idx !== i));

  const categoryLabel = grandfathered
    ? "Grandfathered – Existing Negative Gearing Rules"
    : propertyType === "new-build"
      ? "New Residential Property – Negative Gearing Retained"
      : "Established Residential – Post-Reform Loss Quarantining";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 space-y-6 max-w-6xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/tools")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Tools
        </Button>

        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Investment Property Wealth Calculator</h1>
          <p className="text-muted-foreground text-sm">
            Full investment journey: purchase → year-by-year cashflow → carried-forward losses → sale → CGT → true net wealth created.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{taxRules.version}</Badge>
            <Badge variant={grandfathered ? "outline" : propertyType === "new-build" ? "default" : "destructive"}>{categoryLabel}</Badge>
          </div>
        </div>

        {/* Headline reconciliation */}
        <MetricCard
          title="TRUE NET WEALTH CREATED"
          value={formatCurrency(results.trueNetWealthCreated)}
          subtitle={`After every cost, tax and dollar contributed over ${holdYears} years — ${formatCurrency(results.realWealthTodaysDollars)} in today's dollars`}
          icon={<Sparkles className="h-6 w-6" />}
          tone={results.trueNetWealthCreated >= 0 ? "positive" : "negative"}
          size="featured"
          calculation={[
            `Net cash received from sale        ${formatCurrency(results.netCashReceivedAfterSale)}`,
            `+ Cumulative cashflow received     ${formatCurrency(results.cumulativeNetCashflowReceived)}`,
            `− Total investor cash contributed  ${formatCurrency(results.totalInvestorCashContributed)}`,
            `= True net wealth created          ${formatCurrency(results.trueNetWealthCreated)}`,
          ]}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard title="Property Value at Sale" value={formatCurrency(results.propertyValueAtSale)} icon={<Building className="h-4 w-4" />} />
          <MetricCard title="Loan Balance at Sale" value={formatCurrency(results.loanBalanceAtSale)} icon={<Landmark className="h-4 w-4" />} />
          <MetricCard title="Gross Equity" value={formatCurrency(results.grossEquityAtSale)} subtitle="Not the same as wealth created" icon={<Wallet className="h-4 w-4" />} />
          <MetricCard title="Property Growth" value={formatCurrency(results.propertyGrowth)} icon={<TrendingUp className="h-4 w-4" />} />
          <MetricCard title="Total Rental Income" value={formatCurrency(results.totalRentalIncome)} icon={<Home className="h-4 w-4" />} />
          <MetricCard title="Total Interest Paid" value={formatCurrency(results.totalInterestPaid)} tone="negative" icon={<Percent className="h-4 w-4" />} />
          <MetricCard title="Total Principal Repaid" value={formatCurrency(results.totalPrincipalRepaid)} subtitle="Cash into equity, not an expense" icon={<PiggyBank className="h-4 w-4" />} />
          <MetricCard title="Total Property Expenses" value={formatCurrency(results.totalOperatingExpenses)} tone="negative" icon={<Receipt className="h-4 w-4" />} />
          <MetricCard title="Total Tax Benefits Received" value={formatCurrency(results.totalTaxBenefits)} tone={results.totalTaxBenefits >= 0 ? "positive" : "negative"} icon={<Calculator className="h-4 w-4" />} />
          <MetricCard title="Losses Carried Before Sale" value={formatCurrency(results.sale.carriedForwardLossesBeforeSale)} icon={<Info className="h-4 w-4" />} />
          <MetricCard title="Losses Used at Sale" value={formatCurrency(results.sale.carriedForwardLossesUsedAtSale)} icon={<Info className="h-4 w-4" />} />
          <MetricCard title="Estimated CGT" value={formatCurrency(results.sale.cgt.cgtPayable)} tone="negative" icon={<Receipt className="h-4 w-4" />} />
          <MetricCard title="Selling Costs" value={formatCurrency(results.sale.totalSellingCosts)} tone="negative" icon={<Receipt className="h-4 w-4" />} />
          <MetricCard title="Net Cash Received After Sale" value={formatCurrency(results.netCashReceivedAfterSale)} tone="positive" icon={<Wallet className="h-4 w-4" />} />
          <MetricCard title="Total Investor Cash Contributed" value={formatCurrency(results.totalInvestorCashContributed)} icon={<PiggyBank className="h-4 w-4" />} />
          <MetricCard
            title="Investor IRR"
            value={isFinite(results.investorIRR) ? formatPercent2(results.investorIRR * 100) : "n/a"}
            subtitle={`Return on capital: ${formatPercent2(results.returnOnInvestorCapital * 100)}`}
            tone={results.investorIRR >= 0 ? "positive" : "negative"}
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>

        <WealthReconciliation results={results} />

        {/* ── Inputs ── */}
        <Card>
          <Tabs defaultValue="property" className="w-full">
            <div className="border-b border-border/50 bg-muted/30 overflow-x-auto">
              <TabsList className="w-full h-auto p-0 bg-transparent rounded-none grid grid-cols-4 md:grid-cols-7 min-w-[520px]">
                {[
                  { value: "property", icon: Building, label: "Property" },
                  { value: "loan", icon: Landmark, label: "Loan" },
                  { value: "rental", icon: Home, label: "Rental" },
                  { value: "expenses", icon: Receipt, label: "Expenses" },
                  { value: "depreciation", icon: Calculator, label: "Depr." },
                  { value: "investors", icon: User, label: "Tax" },
                  { value: "sale", icon: TrendingUp, label: "Growth & Sale" },
                ].map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background/50 text-[10px] sm:text-xs font-medium">
                    <tab.icon className="h-4 w-4" /><span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Property */}
            <TabsContent value="property" className="m-0 p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Property Tax Category</Label>
                <Select value={propertyType} onValueChange={(v) => setPropertyType(v as PropertyTaxCategory)}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="established">Established Residential Property</SelectItem>
                    <SelectItem value="new-build">New Residential Property / New Build</SelectItem>
                    <SelectItem value="grandfathered">Grandfathered Investment Property</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Purchase / Contract Date</Label>
                  <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent className="max-w-xs">Contracts entered before 7:30pm AEST 12 May 2026 keep the existing negative gearing rules. Established purchases after that date have losses quarantined from 1 July 2027.</TooltipContent>
                  </Tooltip></TooltipProvider>
                </div>
                <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="h-11" />
                {grandfathered && <p className="text-xs text-primary">Contract date is before the cutoff — existing negative gearing rules applied.</p>}
              </div>
              <NGInputField label="Purchase Price" id="price" value={purchasePrice} onChange={setPurchasePrice} prefix="$" step={10000} />
              <div className="space-y-2">
                <Label className="text-sm font-medium">State / Territory</Label>
                <Select value={state} onValueChange={(v) => setState(v as AustralianState)}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{AUSTRALIAN_STATES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <NGInputField label="Stamp Duty" id="stamp" value={stampDuty} onChange={(v) => setManualStampDuty(v)} prefix="$" step={500} helperText={`Auto-calculated for ${state}. Override if you have an exact figure.`} />
              <NGInputField label="Conveyancing / Legal Fees" id="legal" value={legalFees} onChange={setLegalFees} prefix="$" step={100} />
              <NGInputField label="Buyer's Agent Fee" id="ba" value={buyersAgentFee} onChange={setBuyersAgentFee} prefix="$" step={500} />
              <NGInputField label="Other Eligible Acquisition Costs" id="other-acq" value={otherAcquisitionCosts} onChange={setOtherAcquisitionCosts} prefix="$" step={100} helperText="Inspections, searches and similar eligible costs — these form part of the CGT cost base." />
              <NGInputField label="Loan Establishment Costs" id="loan-est" value={loanEstablishmentCosts} onChange={setLoanEstablishmentCosts} prefix="$" step={100} helperText="Cash contributed at settlement. Financing costs are excluded from the CGT cost base." />
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 flex justify-between text-sm">
                <span className="text-muted-foreground">Initial CGT cost base</span>
                <span className="font-semibold">{formatCurrency(purchasePrice + acquisitionCosts)}</span>
              </div>
            </TabsContent>

            {/* Loan */}
            <TabsContent value="loan" className="m-0 p-4 sm:p-6 space-y-4">
              <NGInputField label="Deposit" id="deposit" value={deposit} onChange={(v) => { setManualLoan(null); setDeposit(v); }} prefix="$" step={5000} />
              <NGInputField label="Loan Amount" id="loan" value={loanAmount} onChange={(v) => setManualLoan(v)} prefix="$" step={5000} helperText={`LVR: ${lvr.toFixed(2)}%`} />
              <NGInputField label="Interest Rate" id="rate" value={interestRate} onChange={setInterestRate} suffix="% p.a." max={15} step={0.05} />
              <NGInputField label="Loan Term" id="term" value={loanTerm} onChange={setLoanTerm} suffix="years" min={1} max={30} />
              <NGInputField label="Interest-Only Period" id="io" value={interestOnlyYears} onChange={setInterestOnlyYears} suffix="years" min={0} max={loanTerm} helperText="Principal & interest applies for the remainder of the term." />
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Year 1 interest</span><span className="font-medium">{formatCurrency(results.years[0]?.interestPaid ?? 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Year 1 principal repaid</span><span className="font-medium">{formatCurrency(results.years[0]?.principalRepaid ?? 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Closing balance at sale</span><span className="font-medium">{formatCurrency(results.loanBalanceAtSale)}</span></div>
              </div>
            </TabsContent>

            {/* Rental */}
            <TabsContent value="rental" className="m-0 p-4 sm:p-6 space-y-4">
              <NGInputField label="Weekly Rent" id="rent" value={weeklyRent} onChange={setWeeklyRent} prefix="$" step={10} />
              <NGInputField label="Annual Rental Growth" id="rent-growth" value={rentalGrowthRate} onChange={setRentalGrowthRate} suffix="% p.a." max={15} step={0.25} />
              <NGInputField label="Vacancy Allowance" id="vacancy" value={vacancyRatePercent} onChange={setVacancyRatePercent} suffix="%" max={50} step={0.5} helperText="Applied as a percentage reduction to gross rent." />
              <NGInputField label="Other Property Income" id="other-income" value={otherPropertyIncome} onChange={setOtherPropertyIncome} prefix="$" suffix="/yr" step={100} />
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 flex justify-between text-sm">
                <span className="text-muted-foreground">Year 1 effective rental income</span>
                <span className="font-semibold text-primary">{formatCurrency(results.years[0]?.effectiveRentalIncome ?? 0)}</span>
              </div>
            </TabsContent>

            {/* Expenses */}
            <TabsContent value="expenses" className="m-0 p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div><Label className="text-sm font-medium">Index expenses with inflation</Label><p className="text-xs text-muted-foreground">Management fees always scale with rent.</p></div>
                <Switch checked={indexExpenses} onCheckedChange={setIndexExpenses} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NGInputField label="Property Management" id="pm" value={managementFeePercent} onChange={setManagementFeePercent} suffix="%" max={15} step={0.25} />
                <NGInputField label="Letting Fees" id="letting" value={lettingFeesWeeks} onChange={setLettingFeesWeeks} suffix="weeks/yr" max={4} step={0.5} />
                <NGInputField label="Council Rates" id="council" value={councilRates} onChange={setCouncilRates} prefix="$" step={100} />
                <NGInputField label="Water Charges" id="water" value={waterCharges} onChange={setWaterCharges} prefix="$" step={50} />
                <NGInputField label="Strata / Owners Corp" id="strata" value={strata} onChange={setStrata} prefix="$" step={100} />
                <NGInputField label="Building Insurance" id="bins" value={buildingInsurance} onChange={setBuildingInsurance} prefix="$" step={100} />
                <NGInputField label="Landlord Insurance" id="lins" value={landlordInsurance} onChange={setLandlordInsurance} prefix="$" step={50} />
                <NGInputField label="Maintenance" id="maint" value={maintenance} onChange={setMaintenance} prefix="$" step={100} />
                <NGInputField label="Repairs" id="repairs" value={repairs} onChange={setRepairs} prefix="$" step={100} />
                <NGInputField label="Land Tax" id="landtax" value={landTax} onChange={setLandTax} prefix="$" step={100} />
                <NGInputField label="Accounting Fees" id="acct" value={accountingFees} onChange={setAccountingFees} prefix="$" step={50} />
                <NGInputField label="Compliance Costs" id="compliance" value={complianceCosts} onChange={setComplianceCosts} prefix="$" step={50} />
                <NGInputField label="Other Expenses" id="otherexp" value={otherExpenses} onChange={setOtherExpenses} prefix="$" step={100} />
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 flex justify-between text-sm">
                <span className="text-muted-foreground">Year 1 operating expenses</span>
                <span className="font-semibold text-destructive">{formatCurrency(results.years[0]?.operatingExpenses ?? 0)}</span>
              </div>
            </TabsContent>

            {/* Depreciation */}
            <TabsContent value="depreciation" className="m-0 p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div><Label className="text-sm font-medium">Include depreciation</Label><p className="text-xs text-muted-foreground">Turn off if the property has no eligible deductions.</p></div>
                <Switch checked={depreciationEnabled} onCheckedChange={setDepreciationEnabled} />
              </div>
              {depreciationEnabled && (
                <>
                  <NGInputField label="Division 43 – Capital Works" id="div43" value={div43Annual} onChange={setDiv43Annual} prefix="$" suffix="/yr" step={250} helperText="Reduces the CGT cost base at sale. Established properties may have little or none." />
                  <NGInputField label="Division 40 – Plant & Equipment" id="div40" value={div40Annual} onChange={setDiv40Annual} prefix="$" suffix="/yr" step={250} helperText="Do not assume an established property has meaningful Division 40 deductions." />
                  <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Div 43 claimed over {holdYears} years</span>
                    <span className="font-semibold">{formatCurrency(results.sale.capitalWorksClaimed)}</span>
                  </div>
                </>
              )}
              <p className="text-xs text-muted-foreground">
                Depreciation amounts and the resulting CGT cost-base adjustment should be confirmed by a registered tax adviser and a quantity surveyor's report.
              </p>
            </TabsContent>

            {/* Investors / tax */}
            <TabsContent value="investors" className="m-0 p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => { setIsJoint(false); setA1Ownership(100); }} className={cn("flex items-center justify-center gap-2 p-4 rounded-lg border-2", !isJoint ? "border-primary bg-primary/10" : "border-border text-muted-foreground")}>
                  <User className="h-5 w-5" /><span className="font-medium">By myself</span>
                </button>
                <button type="button" onClick={() => { setIsJoint(true); setA1Ownership(50); }} className={cn("flex items-center justify-center gap-2 p-4 rounded-lg border-2", isJoint ? "border-primary bg-primary/10" : "border-border text-muted-foreground")}>
                  <Users className="h-5 w-5" /><span className="font-medium">With someone</span>
                </button>
              </div>
              {isJoint && (
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
                  <Label className="text-sm font-semibold">Ownership Split</Label>
                  <Slider value={[a1Ownership]} onValueChange={([v]) => setA1Ownership(v)} min={5} max={95} step={5} />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Investor 1: <span className="font-semibold text-foreground">{a1Ownership}%</span></span>
                    <span className="text-muted-foreground">Investor 2: <span className="font-semibold text-foreground">{100 - a1Ownership}%</span></span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-card/50">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Investor 1</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <NGInputField label="Annual Taxable Income Before Property" id="inc1" value={a1Income} onChange={setA1Income} prefix="$" step={5000} />
                    <div className="flex items-center justify-between"><Label className="text-sm">Include Medicare Levy</Label><Switch checked={a1Medicare} onCheckedChange={setA1Medicare} /></div>
                    <p className="text-xs text-muted-foreground">Marginal rate: {formatPercent2(marginalRate(a1Income, a1Medicare) * 100)}{a1Medicare ? " (incl. Medicare)" : " (excl. Medicare)"}</p>
                  </CardContent>
                </Card>
                {isJoint && (
                  <Card className="bg-card/50">
                    <CardHeader className="pb-2"><CardTitle className="text-base">Investor 2</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <NGInputField label="Annual Taxable Income Before Property" id="inc2" value={a2Income} onChange={setA2Income} prefix="$" step={5000} />
                      <div className="flex items-center justify-between"><Label className="text-sm">Include Medicare Levy</Label><Switch checked={a2Medicare} onCheckedChange={setA2Medicare} /></div>
                      <p className="text-xs text-muted-foreground">Marginal rate: {formatPercent2(marginalRate(a2Income, a2Medicare) * 100)}{a2Medicare ? " (incl. Medicare)" : " (excl. Medicare)"}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Tax benefits are calculated as tax payable without the property minus tax payable with the property, so deductions crossing a bracket are handled correctly — never simply loss × top marginal rate.
              </p>
            </TabsContent>

            {/* Growth & sale */}
            <TabsContent value="sale" className="m-0 p-4 sm:p-6 space-y-4">
              <div className="space-y-2 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><p className="text-sm font-medium">AI Suburb Growth Analysis</p></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <SuburbSearchInput value={selectedSuburb} selectedState={suburbState} onChange={(s, st) => { setSelectedSuburb(s); setSuburbState(st); setSuburbAnalysis(null); }} isLoading={isAnalyzing} />
                  </div>
                  <Select value={suburbState} onValueChange={setSuburbState}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{["NSW","VIC","QLD","SA","WA","TAS","NT","ACT"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAnalyzeSuburb} disabled={isAnalyzing || !selectedSuburb} className="w-full">
                  {isAnalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analysing...</> : <><Sparkles className="mr-2 h-4 w-4" />Analyse Suburb Growth</>}
                </Button>
                {suburbAnalysis && (
                  <div className="space-y-3">
                    <SuburbAnalysisCard analysis={suburbAnalysis} onApplyRate={(r) => { setCapitalGrowthRate(r); toast.success(`Growth rate set to ${r.toFixed(1)}%`); }} />
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={() => setShowReportModal(true)}><Eye className="mr-2 h-4 w-4" />View Report</Button>
                      <Button variant="outline" onClick={async () => { await generateSuburbReportPdf({ analysis: suburbAnalysis, projectionPeriod: holdYears }); toast.success("Report saved."); }}>
                        <Download className="mr-2 h-4 w-4" />Download PDF
                      </Button>
                    </div>
                    <SuburbReportModal open={showReportModal} onOpenChange={setShowReportModal} analysis={suburbAnalysis} projectionPeriod={holdYears} onApplyRate={(r) => { setCapitalGrowthRate(r); setShowReportModal(false); }} onDownloadPDF={async () => { await generateSuburbReportPdf({ analysis: suburbAnalysis, projectionPeriod: holdYears }); }} />
                  </div>
                )}
              </div>

              <NGInputField label="Annual Capital Growth" id="growth" value={capitalGrowthRate} onChange={setCapitalGrowthRate} suffix="% p.a." max={20} step={0.25} />
              <NGInputField label="Assumed Annual Inflation (CPI)" id="cpi" value={inflationRate} onChange={setInflationRate} suffix="% p.a." max={10} step={0.1} helperText="Used for expense indexation, CGT indexation and today's-dollar wealth." />
              <NGInputField label="Ownership Period" id="hold" value={holdYears} onChange={setHoldYears} suffix="years" min={1} max={40} />

              <div className="space-y-2 pt-2">
                <Label className="text-sm font-semibold">Selling Costs</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NGInputField label="Agent Commission" id="comm" value={agentCommissionPercent} onChange={setAgentCommissionPercent} suffix="%" max={5} step={0.1} />
                  <NGInputField label="Marketing" id="marketing" value={marketingCosts} onChange={setMarketingCosts} prefix="$" step={500} />
                  <NGInputField label="Conveyancing / Legal" id="sale-legal" value={saleLegalFees} onChange={setSaleLegalFees} prefix="$" step={100} />
                  <NGInputField label="Discharge / Mortgage Costs" id="discharge" value={dischargeCosts} onChange={setDischargeCosts} prefix="$" step={100} />
                  <NGInputField label="Other Selling Costs" id="other-sale" value={otherSellingCosts} onChange={setOtherSellingCosts} prefix="$" step={100} />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-sm font-semibold">CGT Method</Label>
                <Select value={cgtMethod} onValueChange={(v) => setCgtMethod(v as typeof cgtMethod)}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Compare both, show most tax-efficient (where an election is permitted)</SelectItem>
                    <SelectItem value="discount">Option A – Existing 50% CGT discount</SelectItem>
                    <SelectItem value="indexation">Option B – New indexation regime</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Established property acquired after budget night is locked to the indexation regime for post-1 July 2027 gains.</p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Capital Improvements</Label>
                  <Button size="sm" variant="outline" onClick={addImprovement}><Plus className="h-4 w-4 mr-1" />Add</Button>
                </div>
                {improvements.length === 0 && <p className="text-xs text-muted-foreground">No improvements added. These increase the CGT cost base where eligible.</p>}
                {improvements.map((im, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border border-border/50">
                    <div className="col-span-3"><Label className="text-xs">Year</Label><Input type="number" min={1} max={holdYears} value={im.year} onChange={e => updateImprovement(i, { year: parseInt(e.target.value) || 1 })} /></div>
                    <div className="col-span-4"><Label className="text-xs">Amount</Label><Input type="number" value={im.amount} onChange={e => updateImprovement(i, { amount: parseFloat(e.target.value) || 0 })} /></div>
                    <div className="col-span-4"><Label className="text-xs">Description</Label><Input value={im.description} onChange={e => updateImprovement(i, { description: e.target.value })} /></div>
                    <div className="col-span-1"><Button size="icon" variant="ghost" onClick={() => removeImprovement(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Advanced settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" /> Advanced Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div><Label className="text-sm font-medium">Compare Established vs New Build</Label><p className="text-xs text-muted-foreground">Runs both scenarios on identical assumptions.</p></div>
              <Switch checked={comparisonMode} onCheckedChange={setComparisonMode} />
            </div>
            <div className="flex items-center justify-between">
              <div><Label className="text-sm font-medium">Opportunity cost comparison</Label><p className="text-xs text-muted-foreground">What if the same cash was invested elsewhere?</p></div>
              <Switch checked={opportunityCostEnabled} onCheckedChange={setOpportunityCostEnabled} />
            </div>
            {opportunityCostEnabled && (
              <>
                <NGInputField label="Alternative Investment Return" id="alt" value={alternativeReturnRate} onChange={setAlternativeReturnRate} suffix="% p.a." max={20} step={0.5} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <MetricCard title="Property net wealth" value={formatCurrency(results.trueNetWealthCreated)} tone="positive" />
                  <MetricCard title="Alternative investment net gain" value={formatCurrency(results.opportunityCostValue ?? 0)} />
                  <MetricCard
                    title="Difference"
                    value={formatCurrency(results.opportunityCostDifference ?? 0)}
                    tone={(results.opportunityCostDifference ?? 0) >= 0 ? "positive" : "negative"}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {comparison && (
          <ComparisonPanel established={comparison.established} newBuild={comparison.newBuild} purchasePrice={purchasePrice} growthRate={capitalGrowthRate} weeklyRent={weeklyRent} />
        )}

        <SaleYearTable results={results} purchasePrice={purchasePrice} growthRate={capitalGrowthRate} />
        <YearByYearTable results={results} />

        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Important:</strong> This calculator provides estimates for educational and illustrative purposes only. Tax outcomes depend on individual circumstances and legislation. It is not tax, accounting, financial or investment advice. Users should obtain advice from a registered tax agent, accountant and appropriately licensed professional before making investment decisions.
        </p>
      </main>
    </div>
  );
}
