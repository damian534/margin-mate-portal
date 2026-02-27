import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Home, TrendingUp, DollarSign, Wallet, ChevronDown, ChevronUp, Trash2, Edit2, Check, Building2, Calculator } from "lucide-react";
import { PropertyData, PropertyResults } from "@/lib/advisor/portfolioTypes";
import { AUSTRALIAN_STATES, AustralianState } from "@/lib/advisor/stampDuty";
import { getPurchaseYearOptions } from "@/lib/advisor/historicalStampDuty";
import { formatCurrency } from "@/lib/advisor/calculations";
import { InputField } from "./InputField";
import { cn } from "@/lib/utils";
import { getBuildYearOptions } from "@/lib/advisor/depreciation";

interface PortfolioPropertyCardProps {
  property: PropertyData;
  results: PropertyResults;
  onUpdate: (property: PropertyData) => void;
  onRemove: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  canRemove: boolean;
}

export function PortfolioPropertyCard({ property, results, onUpdate, onRemove, isExpanded, onToggleExpand, canRemove }: PortfolioPropertyCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(property.name);
  const purchaseYearOptions = getPurchaseYearOptions();
  const buildYearOptions = getBuildYearOptions();

  const handleNameSave = () => { onUpdate({ ...property, name: editedName.trim() || property.name }); setIsEditingName(false); };
  const updateField = <K extends keyof PropertyData>(field: K, value: PropertyData[K]) => { onUpdate({ ...property, [field]: value }); };

  const handleModeChange = (mode: 'already-held' | 'new-purchase') => {
    const currentYear = new Date().getFullYear();
    if (mode === 'new-purchase') {
      onUpdate({ ...property, propertyMode: 'new-purchase', purchaseYear: currentYear, currentValue: property.purchasePrice, currentLoanBalance: property.originalLoanAmount, loanType: 'interest-only' });
    } else {
      onUpdate({ ...property, propertyMode: 'already-held' });
    }
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-center gap-2 mb-4 p-1 bg-muted/50 rounded-lg">
            <button type="button" onClick={() => handleModeChange('already-held')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all", property.propertyMode === 'already-held' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Home className="h-4 w-4" /> Already Held
            </button>
            <button type="button" onClick={() => handleModeChange('new-purchase')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all", property.propertyMode === 'new-purchase' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <TrendingUp className="h-4 w-4" /> New Purchase
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Home className="h-5 w-5 text-primary" /></div>
              <div>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} className="h-8 w-48" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleNameSave()} />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleNameSave}><Check className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold">{property.name}</CardTitle>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditingName(true)}><Edit2 className="h-3 w-3" /></Button>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{property.state} • {property.purchaseYear}</Badge>
                  <span className="text-sm text-muted-foreground">{formatCurrency(property.currentValue)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-6 mr-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Growth</p>
                  <p className={cn("font-semibold", results.totalGrowth >= 0 ? "text-success" : "text-destructive")}>{results.totalGrowth >= 0 ? '+' : ''}{formatCurrency(results.totalGrowth)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Net Wealth</p>
                  <p className={cn("font-semibold", results.netWealthAfterCGT >= 0 ? "text-success" : "text-destructive")}>{results.netWealthAfterCGT >= 0 ? '+' : ''}{formatCurrency(results.netWealthAfterCGT)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canRemove && (<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onRemove(property.id)}><Trash2 className="h-4 w-4" /></Button>)}
                <CollapsibleTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8">{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></CollapsibleTrigger>
              </div>
            </div>
          </div>
          <div className="md:hidden flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
            <div><p className="text-xs text-muted-foreground">Growth</p><p className={cn("font-semibold text-sm", results.totalGrowth >= 0 ? "text-success" : "text-destructive")}>{formatCurrency(results.totalGrowth)}</p></div>
            <div><p className="text-xs text-muted-foreground">Net Wealth</p><p className={cn("font-semibold text-sm", results.netWealthAfterCGT >= 0 ? "text-success" : "text-destructive")}>{formatCurrency(results.netWealthAfterCGT)}</p></div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary/30 rounded-lg">
              <div><p className="text-xs text-muted-foreground">Holding Period</p><p className="font-semibold">{results.holdingPeriodYears} years</p></div>
              <div><p className="text-xs text-muted-foreground">Growth Rate</p><p className="font-semibold text-success">{results.annualizedGrowth.toFixed(1)}% p.a.</p></div>
              <div><p className="text-xs text-muted-foreground">CGT Payable</p><p className={cn("font-semibold", !property.isBeingSold ? "text-muted-foreground" : results.isFullyExempt ? "text-success" : "text-warning")}>{!property.isBeingSold ? "Not selling" : results.isFullyExempt ? "Exempt" : formatCurrency(results.cgtPayable)}</p></div>
              <div><p className="text-xs text-muted-foreground">Net Proceeds</p><p className="font-semibold text-primary">{property.isBeingSold ? formatCurrency(results.netProceedsAfterCGT) : "—"}</p></div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Purchase Details</h4>
                <div className="space-y-2">
                  <Label>Purchase Year</Label>
                  <Select value={property.purchaseYear.toString()} onValueChange={(v) => updateField('purchaseYear', parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{purchaseYearOptions.map((year) => (<SelectItem key={year.value} value={year.value.toString()}>{year.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <InputField label="Purchase Price" id={`${property.id}-purchase-price`} value={property.purchasePrice} onChange={(v) => updateField('purchasePrice', v)} prefix="$" min={0} step={10000} />
                <div className="space-y-2">
                  <Label>State / Territory</Label>
                  <Select value={property.state} onValueChange={(v) => updateField('state', v as AustralianState)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{AUSTRALIAN_STATES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <InputField label="Capital Improvements" id={`${property.id}-capital-improvements`} value={property.capitalImprovements} onChange={(v) => updateField('capitalImprovements', v)} prefix="$" helperText="Renovations adding to cost base" min={0} />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Current Position</h4>
                <InputField label="Current Market Value" id={`${property.id}-current-value`} value={property.currentValue} onChange={(v) => updateField('currentValue', v)} prefix="$" min={0} step={10000} />
                <InputField label="Original Loan Amount" id={`${property.id}-original-loan`} value={property.originalLoanAmount} onChange={(v) => updateField('originalLoanAmount', v)} prefix="$" min={0} step={5000} />
                <InputField label="Current Loan Balance" id={`${property.id}-loan-balance`} value={property.currentLoanBalance} onChange={(v) => updateField('currentLoanBalance', v)} prefix="$" min={0} step={5000} />
                <div className="space-y-2">
                  <Label>Loan Type</Label>
                  <Select value={property.loanType} onValueChange={(v) => updateField('loanType', v as 'interest-only' | 'principal-interest')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="interest-only">Interest Only</SelectItem><SelectItem value="principal-interest">Principal & Interest</SelectItem></SelectContent>
                  </Select>
                </div>
                <InputField label="Current Interest Rate" id={`${property.id}-interest-rate`} value={property.interestRate ?? 6.0} onChange={(v) => updateField('interestRate', v)} suffix="% p.a." min={0} max={15} step={0.1} />
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-xs text-muted-foreground">Avg Rate Over Holding Period</p>
                  <p className="font-semibold">{(results.historicalAvgRate ?? 6.0).toFixed(2)}% p.a.</p>
                  <p className="text-xs text-muted-foreground mt-1">Based on RBA rates + 2% buffer ({property.purchaseYear}–{new Date().getFullYear()})</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Rental Income & Expenses</h4>
                <InputField label="Weekly Rent" id={`${property.id}-weekly-rent`} value={property.weeklyRent} onChange={(v) => updateField('weeklyRent', v)} prefix="$" min={0} step={10} />
                <InputField label="Annual Rates & Insurance" id={`${property.id}-rates-insurance`} value={property.annualRatesInsurance} onChange={(v) => updateField('annualRatesInsurance', v)} prefix="$" min={0} />
                <InputField label="Maintenance Allowance" id={`${property.id}-maintenance`} value={property.maintenanceAllowance} onChange={(v) => updateField('maintenanceAllowance', v)} prefix="$" helperText="Annual maintenance budget" min={0} />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Depreciation</h4>
                <div className="space-y-2">
                  <Label>Build Year</Label>
                  <Select value={(property.buildYear ?? new Date().getFullYear() - 10).toString()} onValueChange={(v) => updateField('buildYear', parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{buildYearOptions.map((option) => (<SelectItem key={option.value} value={option.value.toString()}>{option.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="p-3 rounded-lg bg-success/10 border border-success/20 space-y-2">
                  <div className="flex items-center gap-2"><Calculator className="h-4 w-4 text-success" /><span className="text-sm font-medium text-success">Tax Benefits</span></div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-xs text-muted-foreground">Depreciation</p><p className="font-medium">{formatCurrency(results.annualDepreciation)}/yr</p></div>
                    <div><p className="text-xs text-muted-foreground">Tax Refund</p><p className="font-medium text-success">{formatCurrency(results.annualTaxBenefit)}/yr</p></div>
                  </div>
                </div>
                <div className={cn("p-3 rounded-lg border space-y-2", results.afterTaxMonthlyShortfall > 0 ? "bg-warning/10 border-warning/20" : "bg-success/10 border-success/20")}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">After-Tax Monthly Cost</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Override</span>
                      <Switch checked={(property.monthlyOutOfPocketOverride ?? 0) > 0} onCheckedChange={(checked) => updateField('monthlyOutOfPocketOverride', checked ? results.afterTaxMonthlyShortfall : undefined)} />
                    </div>
                  </div>
                  {(property.monthlyOutOfPocketOverride ?? 0) > 0 ? (
                    <InputField label="" id={`${property.id}-monthly-override`} value={property.monthlyOutOfPocketOverride ?? 0} onChange={(v) => updateField('monthlyOutOfPocketOverride', v > 0 ? v : undefined)} prefix="$" suffix="/mo" min={0} />
                  ) : (
                    <p className={cn("font-semibold", results.afterTaxMonthlyShortfall > 0 ? "text-warning" : "text-success")}>
                      {results.afterTaxMonthlyShortfall > 0 ? `${formatCurrency(results.afterTaxMonthlyShortfall)}/mo shortfall` : `+${formatCurrency(Math.abs(results.afterTaxMonthlyShortfall))}/mo cashflow`}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> CGT Factors</h4>
                <div className="flex items-center justify-between"><div><Label>Was Main Residence</Label><p className="text-xs text-muted-foreground">Ever lived in as primary home?</p></div><Switch checked={property.wasMainResidence} onCheckedChange={(v) => updateField('wasMainResidence', v)} /></div>
                <div className="flex items-center justify-between"><div><Label>Was/Is Rented</Label><p className="text-xs text-muted-foreground">Income-producing at any time?</p></div><Switch checked={property.wasEverRented} onCheckedChange={(v) => updateField('wasEverRented', v)} /></div>
                {property.wasMainResidence && (
                  <div className="flex items-center justify-between"><div><Label>Use 6-Year Rule</Label><p className="text-xs text-muted-foreground">Absence exemption</p></div><Switch checked={property.useSixYearRule} onCheckedChange={(v) => updateField('useSixYearRule', v)} /></div>
                )}
                <div className="flex items-center justify-between"><div><Label>Mark as Being Sold</Label><p className="text-xs text-muted-foreground">Calculate CGT if selling now</p></div><Switch checked={property.isBeingSold ?? false} onCheckedChange={(v) => updateField('isBeingSold', v)} /></div>
                {property.isBeingSold && (
                  <>
                    <InputField label="Selling Cost %" id={`${property.id}-selling-cost-percent`} value={property.sellingCostPercent ?? 2} onChange={(v) => updateField('sellingCostPercent', v)} suffix="%" helperText={`= ${formatCurrency(property.currentValue * ((property.sellingCostPercent ?? 2) / 100))}`} min={0} max={10} step={0.1} />
                    <InputField label="Selling Cost Override" id={`${property.id}-selling-cost-override`} value={property.sellingCostOverride ?? 0} onChange={(v) => updateField('sellingCostOverride', v > 0 ? v : undefined)} prefix="$" helperText="Leave 0 to use % above" min={0} />
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}