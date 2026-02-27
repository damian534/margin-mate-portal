import { useState, useMemo, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Wallet, Target, TrendingUp, PiggyBank, Sparkles,
  Building, Home, User, Users, Calculator, DollarSign, Building2,
  Settings2, Info, Calendar, ArrowDown, ArrowUp, Loader2, Eye, Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NGInputField } from "@/components/negative-gearing/NGInputField";
import { calculateResults, formatCurrency, formatPercent, CalculatorInputs } from "@/lib/negative-gearing/calculations";
import { calculateStampDuty, AUSTRALIAN_STATES, AustralianState } from "@/lib/negative-gearing/stampDuty";
import { calculateMarginalTaxRate, calculateTaxPayable } from "@/lib/negative-gearing/taxRates";
import { calculateDepreciation, estimateConstructionCost, getDepreciationDescription } from "@/lib/negative-gearing/depreciation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SuburbSearchInput } from "@/components/negative-gearing/SuburbSearchInput";
import { SuburbAnalysisCard } from "@/components/negative-gearing/SuburbAnalysisCard";
import { SuburbReportModal } from "@/components/negative-gearing/SuburbReportModal";
import { SuburbAnalysis, analyzeSuburbGrowth } from "@/lib/suburbAnalysis";
import { generateSuburbReportPdf } from "@/lib/pdf/suburbReportPdf";
import { toast } from "sonner";

// ─── Result Card ───
function ResultCard({ title, value, subtitle, icon, variant = "default", size = "default" }: {
  title: string; value: string; subtitle?: string; icon?: React.ReactNode;
  variant?: "default" | "positive" | "negative"; size?: "default" | "large" | "featured";
}) {
  const colors = { default: "text-foreground", positive: "text-primary", negative: "text-destructive" };
  return (
    <Card className={cn("border-border/50 shadow-sm", size === "large" && "bg-secondary/30", size === "featured" && "bg-primary/10 border-primary/20")}>
      <CardContent className={cn("p-4", (size === "large" || size === "featured") && "p-6")}>
        <div className={cn(size === "featured" ? "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" : "flex flex-col gap-2")}>
          <div className="flex items-center gap-2">
            {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
            <p className={cn("font-medium text-muted-foreground", size === "featured" ? "text-base" : "text-sm")}>{title}</p>
          </div>
          <p className={cn("font-bold", size === "featured" ? "text-3xl" : size === "large" ? "text-2xl" : "text-xl", colors[variant])}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Applicant Income Card ───
function ApplicantIncomeCard({ applicantNumber, annualTaxableIncome, marginalTaxRate, includeMedicareLevy, ownershipPercent, estimatedTaxSaving, onAnnualTaxableIncomeChange, onMarginalTaxRateChange, onIncludeMedicareLevyChange }: {
  applicantNumber: 1 | 2; annualTaxableIncome: number; marginalTaxRate: number; includeMedicareLevy: boolean;
  ownershipPercent: number; estimatedTaxSaving: number;
  onAnnualTaxableIncomeChange: (v: number) => void; onMarginalTaxRateChange: (v: number) => void; onIncludeMedicareLevyChange: (v: boolean) => void;
}) {
  const [showManualTaxRate, setShowManualTaxRate] = useState(false);
  const baseTaxPayable = calculateTaxPayable(annualTaxableIncome);
  const medicareLevy = includeMedicareLevy ? annualTaxableIncome * 0.02 : 0;
  const totalTaxPayable = baseTaxPayable + medicareLevy;

  return (
    <Card className="bg-card/50 border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <User className="h-4 w-4 text-primary" /> Applicant {applicantNumber}
          <span className="ml-auto text-sm font-normal text-muted-foreground">{ownershipPercent}% ownership</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <NGInputField label="Annual Taxable Income" id={`income-${applicantNumber}`} value={annualTaxableIncome} onChange={onAnnualTaxableIncomeChange} prefix="$" />
        <div className="flex items-center gap-2 pt-1">
          <Switch id={`manual-tax-${applicantNumber}`} checked={showManualTaxRate} onCheckedChange={setShowManualTaxRate} className="scale-75" />
          <Label htmlFor={`manual-tax-${applicantNumber}`} className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
            <Settings2 className="h-3 w-3" /> Manually adjust tax rate
          </Label>
        </div>
        {showManualTaxRate && (
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/30">
            <NGInputField label="Marginal Tax Rate" id={`tax-rate-${applicantNumber}`} value={marginalTaxRate} onChange={onMarginalTaxRateChange} suffix="%" max={47} step={0.5} />
            <div className="flex items-center justify-between py-1">
              <Label htmlFor={`medicare-${applicantNumber}`} className="text-sm font-medium cursor-pointer">Include Medicare Levy (2%)</Label>
              <Switch id={`medicare-${applicantNumber}`} checked={includeMedicareLevy} onCheckedChange={onIncludeMedicareLevyChange} />
            </div>
          </div>
        )}
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax Payable (Annual)</span><span className="font-semibold">{formatCurrency(totalTaxPayable)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax Saving ({ownershipPercent}% share)</span><span className="font-semibold text-primary">{formatCurrency(estimatedTaxSaving)}</span></div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Build year options ───
function generateBuildYearOptions() {
  const currentYear = new Date().getFullYear();
  const options: { value: number; label: string }[] = [];
  for (let y = currentYear - 1; y >= currentYear - 5; y--) options.push({ value: y, label: y.toString() });
  [
    { v: 2017, l: "Late 2010s" }, { v: 2012, l: "Early 2010s" }, { v: 2007, l: "Late 2000s" },
    { v: 2002, l: "Early 2000s" }, { v: 1997, l: "Late 1990s" }, { v: 1992, l: "Early 1990s" },
    { v: 1987, l: "Late 1980s" }, { v: 1982, l: "Early 1980s" }, { v: 1975, l: "1970s" }, { v: 1965, l: "1960s or earlier" },
  ].forEach(o => options.push({ value: o.v, label: o.l }));
  return options;
}
const buildYearOptions = generateBuildYearOptions();

// ─── Main Page Component ───
export default function NegativeGearingCalculator() {
  const navigate = useNavigate();

  // Applicant 1
  const [a1Income, setA1Income] = useState(150000);
  const [a1TaxRate, setA1TaxRate] = useState(37);
  const [a1MedicareLevy, setA1MedicareLevy] = useState(true);
  const [isA1TaxManual, setIsA1TaxManual] = useState(false);

  // Applicant 2
  const [a2Income, setA2Income] = useState(120000);
  const [a2TaxRate, setA2TaxRate] = useState(37);
  const [a2MedicareLevy, setA2MedicareLevy] = useState(true);
  const [isA2TaxManual, setIsA2TaxManual] = useState(false);

  // Ownership
  const [isJoint, setIsJoint] = useState(false);
  const [a1Ownership, setA1Ownership] = useState(50);
  const handleOwnershipMode = (joint: boolean) => { setIsJoint(joint); setA1Ownership(joint ? 50 : 100); };

  // Property & Loan
  const [purchasePrice, setPurchasePrice] = useState(750000);
  const [state, setState] = useState<AustralianState>('VIC');
  const [additionalCosts, setAdditionalCosts] = useState(5000);
  const [deposit, setDeposit] = useState(150000);
  const [loanAmount, setLoanAmount] = useState(600000);
  const [interestRate, setInterestRate] = useState(6);
  const [loanType, setLoanType] = useState<'interest-only' | 'principal-interest'>('interest-only');
  const [loanTerm, setLoanTerm] = useState(30);
  const [isLoanManual, setIsLoanManual] = useState(false);

  // Rental
  const [weeklyRent, setWeeklyRent] = useState(550);
  const [pmFee, setPmFee] = useState(7.5);
  const [ratesInsurance, setRatesInsurance] = useState(4500);
  const [maintenance, setMaintenance] = useState(2000);
  const [vacancyWeeks, setVacancyWeeks] = useState(2);

  // Depreciation
  const [isNewBuild, setIsNewBuild] = useState(false);
  const [buildYear, setBuildYear] = useState(new Date().getFullYear() - 5);
  const [constructionCost, setConstructionCost] = useState<number | null>(null);
  const [useManualDepr, setUseManualDepr] = useState(false);
  const [manualCapital, setManualCapital] = useState(8000);
  const [manualPlant, setManualPlant] = useState(3000);

  // Growth
  const [growthRate, setGrowthRate] = useState(6);
  const [projectionPeriod, setProjectionPeriod] = useState(10);
  const [growthRateSource, setGrowthRateSource] = useState<'manual' | 'suburb'>('manual');
  const [selectedSuburb, setSelectedSuburb] = useState("");
  const [suburbState, setSuburbState] = useState<string>("VIC");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suburbAnalysis, setSuburbAnalysis] = useState<SuburbAnalysis | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleSuburbChange = (suburb: string, st: string) => { setSelectedSuburb(suburb); setSuburbState(st); setSuburbAnalysis(null); };

  const handleAnalyzeSuburb = async () => {
    if (!selectedSuburb || selectedSuburb.length < 2) { toast.error("Please enter a suburb name to analyse."); return; }
    setIsAnalyzing(true); setSuburbAnalysis(null);
    try {
      const result = await analyzeSuburbGrowth(selectedSuburb, suburbState, projectionPeriod);
      if (result.success && result.data) { setSuburbAnalysis(result.data); toast.success(`Growth analysis for ${selectedSuburb}, ${suburbState} is ready.`); }
      else { toast.error(result.error || "Unable to analyse this suburb."); }
    } catch { toast.error("Failed to connect to analysis service."); }
    finally { setIsAnalyzing(false); }
  };

  const handleApplyRate = (rate: number) => { setGrowthRate(rate); toast.success(`Set annual growth rate to ${rate.toFixed(1)}%`); };

  const handleDownloadSuburbPDF = async () => {
    if (!suburbAnalysis) return;
    await generateSuburbReportPdf({ analysis: suburbAnalysis, projectionPeriod });
    toast.success(`Suburb report for ${suburbAnalysis.suburb} saved.`);
  };

  // Computed
  const stampDuty = useMemo(() => calculateStampDuty(purchasePrice, state), [purchasePrice, state]);
  const totalPurchaseCost = useMemo(() => purchasePrice + stampDuty + additionalCosts, [purchasePrice, stampDuty, additionalCosts]);
  const estConstructionCost = useMemo(() => estimateConstructionCost(purchasePrice), [purchasePrice]);
  const effectiveBuildYear = isNewBuild ? new Date().getFullYear() : buildYear;
  const deprResult = useMemo(() => calculateDepreciation({ buildYear: effectiveBuildYear, purchasePrice, constructionCostOverride: isNewBuild ? (constructionCost ?? undefined) : undefined }), [effectiveBuildYear, purchasePrice, constructionCost, isNewBuild]);
  const capitalWorksDepr = useManualDepr ? manualCapital : deprResult.capitalWorksDepreciation;
  const plantEquipDepr = useManualDepr ? manualPlant : deprResult.plantEquipmentDepreciation;
  const totalDepr = capitalWorksDepr + plantEquipDepr;

  // Auto tax rates
  useEffect(() => { if (!isA1TaxManual) setA1TaxRate(calculateMarginalTaxRate(a1Income)); }, [a1Income, isA1TaxManual]);
  useEffect(() => { if (!isA2TaxManual) setA2TaxRate(calculateMarginalTaxRate(a2Income)); }, [a2Income, isA2TaxManual]);

  // Auto loan amount
  useEffect(() => { if (!isLoanManual) setLoanAmount(Math.max(0, totalPurchaseCost - deposit)); }, [totalPurchaseCost, deposit, isLoanManual]);

  const handlePriceChange = (v: number) => { setIsLoanManual(false); setPurchasePrice(v); };
  const handleDepositChange = (v: number) => { setIsLoanManual(false); setDeposit(v); };
  const handleStateChange = (v: AustralianState) => { setIsLoanManual(false); setState(v); };
  const handleAdditionalChange = (v: number) => { setIsLoanManual(false); setAdditionalCosts(v); };
  const handleLoanChange = (v: number) => { setIsLoanManual(true); setLoanAmount(v); };
  const handleA1Income = (v: number) => { setIsA1TaxManual(false); setA1Income(v); };
  const handleA1TaxRate = (v: number) => { setIsA1TaxManual(true); setA1TaxRate(v); };
  const handleA2Income = (v: number) => { setIsA2TaxManual(false); setA2Income(v); };
  const handleA2TaxRate = (v: number) => { setIsA2TaxManual(true); setA2TaxRate(v); };

  const inputs: CalculatorInputs = useMemo(() => ({
    applicant1: { annualTaxableIncome: a1Income, marginalTaxRate: a1TaxRate, includeMedicareLevy: a1MedicareLevy, ownershipPercent: isJoint ? a1Ownership : 100 },
    applicant2: { annualTaxableIncome: a2Income, marginalTaxRate: a2TaxRate, includeMedicareLevy: a2MedicareLevy, ownershipPercent: isJoint ? 100 - a1Ownership : 0 },
    purchasePrice, deposit, loanAmount, interestRate, loanType, loanTerm,
    weeklyRent, propertyManagementFee: pmFee, annualRatesInsurance: ratesInsurance, maintenanceAllowance: maintenance, vacancyWeeks,
    capitalWorksDepreciation: capitalWorksDepr, plantEquipmentDepreciation: plantEquipDepr,
    annualGrowthRate: growthRate, projectionPeriod, stampDuty, state, additionalBuyingCosts: additionalCosts,
  }), [a1Income, a1TaxRate, a1MedicareLevy, a1Ownership, a2Income, a2TaxRate, a2MedicareLevy, isJoint, purchasePrice, deposit, loanAmount, interestRate, loanType, loanTerm, weeklyRent, pmFee, ratesInsurance, maintenance, vacancyWeeks, capitalWorksDepr, plantEquipDepr, growthRate, projectionPeriod, stampDuty, state, additionalCosts]);

  const results = useMemo(() => calculateResults(inputs), [inputs]);
  const isPositiveCashflow = results.afterTaxMonthlyHoldingCost <= 0;
  const buildAge = new Date().getFullYear() - buildYear;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 space-y-6 max-w-5xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tools')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Tools
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Investment Property Calculator</h1>
          <p className="text-muted-foreground text-sm">Negative gearing tax benefits, cashflow analysis, and long-term equity growth projections</p>
        </div>

        {/* Results Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ResultCard title="Monthly Holding Cost" value={isPositiveCashflow ? `+${formatCurrency(Math.abs(results.afterTaxMonthlyHoldingCost))}` : formatCurrency(results.afterTaxMonthlyHoldingCost)} subtitle={isPositiveCashflow ? "Positive cashflow" : "Out of pocket per month"} icon={<Wallet className="h-5 w-5" />} variant={isPositiveCashflow ? "positive" : "negative"} size="large" />
          <ResultCard title="Break-Even Rent" value={formatCurrency(results.breakEvenWeeklyRent)} subtitle="Minimum weekly rent" icon={<Target className="h-5 w-5" />} size="large" />
          <ResultCard title={`${projectionPeriod}-Year Equity`} value={formatCurrency(results.estimatedEquity)} subtitle={`ROI: ${formatPercent(results.simpleROI)}`} icon={<TrendingUp className="h-5 w-5" />} variant="positive" size="large" />
          <ResultCard title="Total Tax Saved" value={formatCurrency(results.totalTaxSaved)} subtitle={`Over ${projectionPeriod} years`} icon={<PiggyBank className="h-5 w-5" />} variant={results.totalTaxSaved > 0 ? "positive" : "default"} size="large" />
        </div>
        <ResultCard title="Net Wealth Created" value={formatCurrency(results.netWealthCreated)} subtitle={`(Property Growth + Principal Paid) − Net Cash Invested over ${projectionPeriod} years`} icon={<Sparkles className="h-6 w-6" />} variant={results.netWealthCreated >= 0 ? "positive" : "negative"} size="featured" />

        {/* Tabbed Inputs */}
        <Card>
          <Tabs defaultValue="property" className="w-full">
            <div className="border-b border-border/50 bg-muted/30">
              <TabsList className="w-full h-auto p-0 bg-transparent rounded-none grid grid-cols-5">
                {[
                  { value: "property", icon: Building, label: "Property" },
                  { value: "growth", icon: TrendingUp, label: "Growth" },
                  { value: "rental", icon: Home, label: "Rental" },
                  { value: "income", icon: User, label: "Income" },
                  { value: "depreciation", icon: Calculator, label: "Depr." },
                ].map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex flex-col items-center justify-center gap-0.5 py-2 sm:py-3 px-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background/50 text-[9px] sm:text-sm font-medium">
                    <tab.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="leading-tight">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Property Tab */}
            <TabsContent value="property" className="m-0 p-4 sm:p-6 space-y-4">
              <NGInputField label="Purchase Price" id="purchase-price" value={purchasePrice} onChange={handlePriceChange} prefix="$" step={10000} />
              <div className="space-y-2">
                <Label className="text-sm font-medium">State / Territory</Label>
                <Select value={state} onValueChange={handleStateChange}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{AUSTRALIAN_STATES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 flex justify-between"><span className="text-sm text-muted-foreground">Stamp Duty ({state})</span><span className="font-medium">{formatCurrency(stampDuty)}</span></div>
              <NGInputField label="Additional Buying Costs" id="additional-costs" value={additionalCosts} onChange={handleAdditionalChange} prefix="$" step={500} helperText="Legal fees, inspections, conveyancing" />
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 flex justify-between"><span className="text-sm font-medium text-muted-foreground">Total Purchase Cost</span><span className="font-semibold">{formatCurrency(totalPurchaseCost)}</span></div>
              <NGInputField label="Deposit" id="deposit" value={deposit} onChange={handleDepositChange} prefix="$" step={5000} />
              <NGInputField label="Loan Amount" id="loan-amount" value={loanAmount} onChange={handleLoanChange} prefix="$" step={5000} helperText="Adjust manually if borrowing more or less" />
              <NGInputField label="Interest Rate" id="interest-rate" value={interestRate} onChange={setInterestRate} suffix="% p.a." max={15} step={0.05} />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Loan Type</Label>
                <Select value={loanType} onValueChange={(v) => setLoanType(v as any)}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interest-only">Interest Only</SelectItem>
                    <SelectItem value="principal-interest">Principal & Interest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <NGInputField label="Loan Term" id="loan-term" value={loanTerm} onChange={setLoanTerm} suffix="years" min={1} max={30} />
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Annual Interest</span><span className="font-medium">{formatCurrency(results.annualInterest)}</span></div>
                {loanType === 'principal-interest' && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Annual Repayment</span><span className="font-medium">{formatCurrency(results.annualLoanRepayment)}</span></div>}
              </div>
            </TabsContent>

            {/* Growth Tab */}
            <TabsContent value="growth" className="m-0 p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Rate Source</Label>
                <Tabs value={growthRateSource} onValueChange={(v) => setGrowthRateSource(v as 'manual' | 'suburb')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="suburb" className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" />Suburb Finder</TabsTrigger>
                    <TabsTrigger value="manual">Manual</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {growthRateSource === 'suburb' && (
                <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20 overflow-visible">
                  <div className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-primary" /><p className="text-sm font-medium text-foreground">AI Suburb Growth Analysis</p></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-visible">
                    <div className="md:col-span-2 overflow-visible">
                      <SuburbSearchInput value={selectedSuburb} selectedState={suburbState} onChange={handleSuburbChange} isLoading={isAnalyzing} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">State</Label>
                      <Select value={suburbState} onValueChange={setSuburbState}>
                        <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['NSW','VIC','QLD','SA','WA','TAS','NT','ACT'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleAnalyzeSuburb} disabled={isAnalyzing || !selectedSuburb} className="w-full">
                    {isAnalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analysing {selectedSuburb}...</> : <><Sparkles className="mr-2 h-4 w-4" />Analyse Suburb Growth</>}
                  </Button>
                  <p className="text-xs text-muted-foreground">Search for historical property data, market trends, and get a detailed suburb report with recommended growth rate.</p>
                  {suburbAnalysis && (
                    <div className="space-y-4">
                      <SuburbAnalysisCard analysis={suburbAnalysis} onApplyRate={handleApplyRate} />
                      <div className="grid grid-cols-2 gap-3">
                        <Button onClick={() => setShowReportModal(true)} className="w-full"><Eye className="mr-2 h-4 w-4" />View Full Report</Button>
                        <Button onClick={handleDownloadSuburbPDF} variant="outline" className="w-full"><Download className="mr-2 h-4 w-4" />Download PDF</Button>
                      </div>
                      <SuburbReportModal open={showReportModal} onOpenChange={setShowReportModal} analysis={suburbAnalysis} projectionPeriod={projectionPeriod} onApplyRate={(rate) => { handleApplyRate(rate); setShowReportModal(false); }} onDownloadPDF={handleDownloadSuburbPDF} />
                    </div>
                  )}
                </div>
              )}

              <NGInputField label="Annual Growth Rate" id="growth-rate" value={growthRate} onChange={setGrowthRate} suffix="% p.a." max={20} step={0.5}
                helperText={growthRateSource === 'manual' ? "Historical Australian average: 6-7% p.a." : suburbAnalysis ? `Recommended: ${suburbAnalysis.recommendedGrowthRate.toFixed(1)}% p.a.` : "Adjust if needed based on your research"} />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Projection Period</Label>
                <Select value={projectionPeriod.toString()} onValueChange={(v) => setProjectionPeriod(parseInt(v))}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 25, 30].map(y => <SelectItem key={y} value={y.toString()}>{y} Years</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Rental Tab */}
            <TabsContent value="rental" className="m-0 p-4 sm:p-6 space-y-4">
              <NGInputField label="Weekly Rent" id="weekly-rent" value={weeklyRent} onChange={setWeeklyRent} prefix="$" step={10} />
              <NGInputField label="Property Management Fee" id="pm-fee" value={pmFee} onChange={setPmFee} suffix="%" max={15} step={0.5} helperText="Typical: 5-10%" />
              <NGInputField label="Annual Rates & Insurance" id="rates" value={ratesInsurance} onChange={setRatesInsurance} prefix="$" step={100} />
              <NGInputField label="Maintenance Allowance" id="maintenance" value={maintenance} onChange={setMaintenance} prefix="$" suffix="/year" step={100} />
              <NGInputField label="Vacancy Weeks" id="vacancy" value={vacancyWeeks} onChange={setVacancyWeeks} suffix="weeks" max={52} />
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Annual Gross Rent</span><span className="font-medium text-primary">{formatCurrency(results.annualGrossRent)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Annual Cash Expenses</span><span className="font-medium text-destructive">{formatCurrency(results.totalAnnualCashExpenses)}</span></div>
              </div>
            </TabsContent>

            {/* Income Tab */}
            <TabsContent value="income" className="m-0 p-4 sm:p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Who is purchasing?</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => handleOwnershipMode(false)} className={cn("flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all", !isJoint ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 text-muted-foreground")}>
                    <User className="h-5 w-5" /><span className="font-medium">By myself</span>
                  </button>
                  <button type="button" onClick={() => handleOwnershipMode(true)} className={cn("flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all", isJoint ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 text-muted-foreground")}>
                    <Users className="h-5 w-5" /><span className="font-medium">With someone</span>
                  </button>
                </div>
              </div>
              {isJoint && (
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
                  <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><Label className="text-sm font-semibold">Ownership Split</Label></div>
                  <Slider value={[a1Ownership]} onValueChange={([v]) => setA1Ownership(v)} min={5} max={95} step={5} />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Applicant 1: <span className="font-semibold text-foreground">{a1Ownership}%</span></span>
                    <span className="text-muted-foreground">Applicant 2: <span className="font-semibold text-foreground">{100 - a1Ownership}%</span></span>
                  </div>
                </div>
              )}
              {isJoint ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ApplicantIncomeCard applicantNumber={1} annualTaxableIncome={a1Income} marginalTaxRate={a1TaxRate} includeMedicareLevy={a1MedicareLevy} ownershipPercent={a1Ownership} estimatedTaxSaving={results.applicant1Results.estimatedTaxSaving} onAnnualTaxableIncomeChange={handleA1Income} onMarginalTaxRateChange={handleA1TaxRate} onIncludeMedicareLevyChange={setA1MedicareLevy} />
                  <ApplicantIncomeCard applicantNumber={2} annualTaxableIncome={a2Income} marginalTaxRate={a2TaxRate} includeMedicareLevy={a2MedicareLevy} ownershipPercent={100 - a1Ownership} estimatedTaxSaving={results.applicant2Results.estimatedTaxSaving} onAnnualTaxableIncomeChange={handleA2Income} onMarginalTaxRateChange={handleA2TaxRate} onIncludeMedicareLevyChange={setA2MedicareLevy} />
                </div>
              ) : (
                <ApplicantIncomeCard applicantNumber={1} annualTaxableIncome={a1Income} marginalTaxRate={a1TaxRate} includeMedicareLevy={a1MedicareLevy} ownershipPercent={100} estimatedTaxSaving={results.applicant1Results.estimatedTaxSaving} onAnnualTaxableIncomeChange={handleA1Income} onMarginalTaxRateChange={handleA1TaxRate} onIncludeMedicareLevyChange={setA1MedicareLevy} />
              )}
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-between">
                <span className="text-sm font-medium">{isJoint ? "Combined Annual Tax Saving" : "Annual Tax Saving"}</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(results.estimatedTaxSaving)}</span>
              </div>
            </TabsContent>

            {/* Depreciation Tab */}
            <TabsContent value="depreciation" className="m-0 p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Property Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setIsNewBuild(true)} className={cn("flex items-center gap-3 p-4 rounded-lg border-2 transition-all", isNewBuild ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50")}>
                    <Building2 className={cn("h-5 w-5", isNewBuild ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-left"><p className={cn("font-medium", isNewBuild ? "text-foreground" : "text-muted-foreground")}>New Build</p><p className="text-xs text-muted-foreground">Off-the-plan or new</p></div>
                  </button>
                  <button type="button" onClick={() => setIsNewBuild(false)} className={cn("flex items-center gap-3 p-4 rounded-lg border-2 transition-all", !isNewBuild ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50")}>
                    <Home className={cn("h-5 w-5", !isNewBuild ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-left"><p className={cn("font-medium", !isNewBuild ? "text-foreground" : "text-muted-foreground")}>Established</p><p className="text-xs text-muted-foreground">Existing property</p></div>
                  </button>
                </div>
              </div>
              {isNewBuild && <NGInputField label="Construction Cost" id="construction-cost" value={constructionCost ?? estConstructionCost} onChange={(v) => setConstructionCost(v)} prefix="$" step={10000} helperText="Enter from contract. Division 43 depreciation (2.5% p.a. for 40 years)." />}
              {!isNewBuild && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">When was it built?</Label>
                    <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent className="max-w-xs"><p>Properties built after 1985 qualify for Division 43 Capital Works deductions.</p></TooltipContent></Tooltip></TooltipProvider>
                  </div>
                  <Select value={buildYear.toString()} onValueChange={(v) => setBuildYear(parseInt(v))}>
                    <SelectTrigger className="h-11"><Calendar className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                    <SelectContent>{buildYearOptions.map(o => <SelectItem key={o.value} value={o.value.toString()}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{buildAge} year{buildAge !== 1 ? 's' : ''} old</p>
                </div>
              )}
              <div className={cn("p-3 rounded-lg border", deprResult.isEligibleForCapitalWorks && deprResult.remainingCapitalWorksYears > 0 ? "bg-primary/5 border-primary/20" : "bg-muted/50 border-border")}>
                <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Status:</span> {isNewBuild ? "Full 40 years available at 2.5% p.a." : getDepreciationDescription(buildYear)}</p>
              </div>
              {!useManualDepr && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30 border border-border">
                  <div><p className="text-xs text-muted-foreground mb-1">Capital Works (Div 43)</p><p className="text-lg font-semibold">{formatCurrency(capitalWorksDepr)}<span className="text-xs font-normal text-muted-foreground">/yr</span></p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">Plant & Equipment</p><p className="text-lg font-semibold">{formatCurrency(plantEquipDepr)}<span className="text-xs font-normal text-muted-foreground">/yr</span></p></div>
                </div>
              )}
              <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-sm font-medium">Total Annual Depreciation</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(totalDepr)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div><Label className="text-sm font-medium">Manual Override</Label><p className="text-xs text-muted-foreground">Have a quantity surveyor report?</p></div>
                <Switch checked={useManualDepr} onCheckedChange={setUseManualDepr} />
              </div>
              {useManualDepr && (
                <>
                  <NGInputField label="Capital Works (Div 43)" id="manual-capital" value={capitalWorksDepr} onChange={setManualCapital} prefix="$" suffix="/yr" step={100} />
                  <NGInputField label="Plant & Equipment" id="manual-plant" value={plantEquipDepr} onChange={setManualPlant} prefix="$" suffix="/yr" step={100} />
                </>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Total Cost Summary */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Total Cost Summary ({projectionPeriod} Years)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-destructive flex items-center gap-1.5"><ArrowDown className="h-4 w-4" /> Total Costs</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Interest Paid</span><span className="font-medium">{formatCurrency(results.totalInterestPaid)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Operating Expenses</span><span className="font-medium">{formatCurrency(results.totalOperatingExpenses)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Upfront Costs</span><span className="font-medium">{formatCurrency(deposit + stampDuty + additionalCosts)}</span></div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-primary flex items-center gap-1.5"><ArrowUp className="h-4 w-4" /> Total Benefits</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Gross Rent</span><span className="font-medium">{formatCurrency(results.totalGrossRentReceived)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Tax Savings</span><span className="font-medium">{formatCurrency(results.totalTaxSaved)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Principal Paid Down</span><span className="font-medium">{formatCurrency(results.totalPrincipalPaidDown)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Capital Growth</span><span className="font-medium">{formatCurrency(results.propertyGrowth)}</span></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projection Table */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Year-by-Year Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Property Value</TableHead>
                    <TableHead className="text-right">Loan Balance</TableHead>
                    <TableHead className="text-right">Equity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.yearlyProjections.map(p => (
                    <TableRow key={p.year}>
                      <TableCell className="font-medium">{p.year}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.propertyValue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.loanBalance)}</TableCell>
                      <TableCell className="text-right font-medium text-primary">{formatCurrency(p.equity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Important Note:</strong> This calculator provides estimates only based on the inputs provided. All results are for informational purposes. Tax deductions, depreciation, and growth projections are estimates and may vary. Seek professional financial and tax advice before making investment decisions.
        </p>
      </main>
    </div>
  );
}
