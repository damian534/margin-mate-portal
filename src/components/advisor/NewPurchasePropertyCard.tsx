import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Home, TrendingUp, DollarSign, Wallet, ChevronDown, ChevronUp, Trash2, Edit2, Check, Building2, Calculator, Plus } from "lucide-react";
import { PropertyData, PropertyResults } from "@/lib/advisor/portfolioTypes";
import { AUSTRALIAN_STATES, AustralianState, calculateStampDuty } from "@/lib/advisor/stampDuty";
import { formatCurrency } from "@/lib/advisor/calculations";
import { InputField } from "./InputField";
import { cn } from "@/lib/utils";
import { getBuildYearOptions } from "@/lib/advisor/depreciation";

interface NewPurchasePropertyCardProps {
  property: PropertyData;
  results: PropertyResults;
  onUpdate: (property: PropertyData) => void;
  onRemove: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  canRemove: boolean;
}

export function NewPurchasePropertyCard({ property, results, onUpdate, onRemove, isExpanded, onToggleExpand, canRemove }: NewPurchasePropertyCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(property.name);
  const buildYearOptions = getBuildYearOptions();
  const currentYear = new Date().getFullYear();

  const handleNameSave = () => { onUpdate({ ...property, name: editedName.trim() || property.name }); setIsEditingName(false); };
  const updateField = <K extends keyof PropertyData>(field: K, value: PropertyData[K]) => { onUpdate({ ...property, [field]: value }); };

  const stampDuty = calculateStampDuty(property.purchasePrice, property.state);
  const totalPurchaseCost = property.purchasePrice + stampDuty + property.additionalBuyingCosts;
  const suggestedLoan = Math.max(0, totalPurchaseCost - property.deposit);

  const handlePurchasePriceChange = (v: number) => {
    const newStampDuty = calculateStampDuty(v, property.state);
    const newTotalCost = v + newStampDuty + property.additionalBuyingCosts;
    const newLoanAmount = Math.max(0, newTotalCost - property.deposit);
    onUpdate({ ...property, purchasePrice: v, currentValue: v, currentLoanBalance: newLoanAmount, originalLoanAmount: newLoanAmount });
  };

  const handleDepositChange = (v: number) => {
    const newLoanAmount = Math.max(0, totalPurchaseCost - v);
    onUpdate({ ...property, deposit: v, currentLoanBalance: newLoanAmount, originalLoanAmount: newLoanAmount });
  };

  const handleStateChange = (v: AustralianState) => {
    const newStampDuty = calculateStampDuty(property.purchasePrice, v);
    const newTotalCost = property.purchasePrice + newStampDuty + property.additionalBuyingCosts;
    const newLoanAmount = Math.max(0, newTotalCost - property.deposit);
    onUpdate({ ...property, state: v, currentLoanBalance: newLoanAmount, originalLoanAmount: newLoanAmount });
  };

  const handleBuyingCostsChange = (v: number) => {
    const newTotalCost = property.purchasePrice + stampDuty + v;
    const newLoanAmount = Math.max(0, newTotalCost - property.deposit);
    onUpdate({ ...property, additionalBuyingCosts: v, currentLoanBalance: newLoanAmount, originalLoanAmount: newLoanAmount });
  };

  const handleModeChange = (mode: 'already-held' | 'new-purchase') => {
    if (mode === 'already-held') {
      onUpdate({ ...property, propertyMode: 'already-held', purchaseYear: currentYear - 5, loanType: 'principal-interest' });
    } else {
      onUpdate({ ...property, propertyMode: 'new-purchase' });
    }
  };

  return (
    <Card className="border-primary/30 shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
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
              <div className="p-2 rounded-lg bg-primary/20"><Plus className="h-5 w-5 text-primary" /></div>
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
                  <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-primary/30">New Purchase</Badge>
                  <span className="text-sm text-muted-foreground">{formatCurrency(property.purchasePrice)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-6 mr-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Monthly Cost</p>
                  <p className={cn("font-semibold", results.afterTaxMonthlyShortfall > 0 ? "text-warning" : "text-success")}>
                    {results.afterTaxMonthlyShortfall > 0 ? formatCurrency(results.afterTaxMonthlyShortfall) : `+${formatCurrency(Math.abs(results.afterTaxMonthlyShortfall))}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Tax Benefit</p>
                  <p className="font-semibold text-success">{formatCurrency(results.annualTaxBenefit)}/yr</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canRemove && (<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onRemove(property.id)}><Trash2 className="h-4 w-4" /></Button>)}
                <CollapsibleTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8">{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></CollapsibleTrigger>
              </div>
            </div>
          </div>
          <div className="md:hidden flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
            <div><p className="text-xs text-muted-foreground">Monthly Cost</p><p className={cn("font-semibold text-sm", results.afterTaxMonthlyShortfall > 0 ? "text-warning" : "text-success")}>{formatCurrency(Math.abs(results.afterTaxMonthlyShortfall))}</p></div>
            <div><p className="text-xs text-muted-foreground">Tax Benefit</p><p className="font-semibold text-sm text-success">{formatCurrency(results.annualTaxBenefit)}/yr</p></div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary/30 rounded-lg">
              <div><p className="text-xs text-muted-foreground">Entry Costs</p><p className="font-semibold">{formatCurrency(results.entryCosts)}</p></div>
              <div><p className="text-xs text-muted-foreground">Annual Depreciation</p><p className="font-semibold text-primary">{formatCurrency(results.annualDepreciation)}</p></div>
              <div><p className="text-xs text-muted-foreground">Gross Yield</p><p className="font-semibold">{results.grossYield.toFixed(2)}%</p></div>
              <div><p className="text-xs text-muted-foreground">Net Yield</p><p className="font-semibold">{results.netYield.toFixed(2)}%</p></div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> Property & Loan Details</h4>
                <InputField label="Purchase Price" id={`${property.id}-purchase-price`} value={property.purchasePrice} onChange={handlePurchasePriceChange} prefix="$" min={0} step={10000} />
                <div className="space-y-2">
                  <Label>State / Territory</Label>
                  <Select value={property.state} onValueChange={handleStateChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{AUSTRALIAN_STATES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                  <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Stamp Duty ({property.state})</span><span className="font-medium">{formatCurrency(stampDuty)}</span></div>
                </div>
                <InputField label="Additional Buying Costs" id={`${property.id}-buying-costs`} value={property.additionalBuyingCosts} onChange={handleBuyingCostsChange} prefix="$" helperText="Legal fees, inspections, etc." min={0} />
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                  <div className="flex justify-between items-center"><span className="text-sm font-medium text-muted-foreground">Total Purchase Cost</span><span className="font-semibold">{formatCurrency(totalPurchaseCost)}</span></div>
                  <p className="text-xs text-muted-foreground mt-1">Purchase price + stamp duty + costs</p>
                </div>
                <InputField label="Deposit" id={`${property.id}-deposit`} value={property.deposit} onChange={handleDepositChange} prefix="$" helperText="Cash contribution" min={0} step={5000} />
                <InputField label="Loan Amount" id={`${property.id}-loan-amount`} value={property.currentLoanBalance} onChange={(v) => { updateField('currentLoanBalance', v); updateField('originalLoanAmount', v); }} prefix="$" helperText={`Suggested: ${formatCurrency(suggestedLoan)}`} min={0} step={5000} />
                <InputField label="Interest Rate" id={`${property.id}-interest-rate`} value={property.interestRate} onChange={(v) => updateField('interestRate', v)} suffix="% p.a." min={0} max={15} step={0.1} />
                <div className="space-y-2">
                  <Label>Loan Type</Label>
                  <Select value={property.loanType} onValueChange={(v) => updateField('loanType', v as 'interest-only' | 'principal-interest')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="interest-only">Interest Only</SelectItem><SelectItem value="principal-interest">Principal & Interest</SelectItem></SelectContent>
                  </Select>
                </div>
                <InputField label="Loan Term" id={`${property.id}-loan-term`} value={property.loanTerm} onChange={(v) => updateField('loanTerm', v)} suffix="years" min={1} max={30} step={1} />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Rental Income & Expenses</h4>
                <InputField label="Weekly Rent" id={`${property.id}-weekly-rent`} value={property.weeklyRent} onChange={(v) => updateField('weeklyRent', v)} prefix="$" min={0} step={10} />
                <InputField label="Property Management Fee" id={`${property.id}-pm-fee`} value={property.propertyManagementFee} onChange={(v) => updateField('propertyManagementFee', v)} suffix="%" min={0} max={15} step={0.5} />
                <InputField label="Annual Rates & Insurance" id={`${property.id}-rates-insurance`} value={property.annualRatesInsurance} onChange={(v) => updateField('annualRatesInsurance', v)} prefix="$" min={0} />
                <InputField label="Maintenance Allowance" id={`${property.id}-maintenance`} value={property.maintenanceAllowance} onChange={(v) => updateField('maintenanceAllowance', v)} prefix="$" helperText="Annual maintenance budget" min={0} />
                <InputField label="Vacancy Weeks" id={`${property.id}-vacancy`} value={property.vacancyWeeks} onChange={(v) => updateField('vacancyWeeks', v)} suffix="weeks/year" min={0} max={12} step={1} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Depreciation</h4>
                <div className="flex items-center justify-between"><div><Label>New Build?</Label><p className="text-xs text-muted-foreground">Built in current year</p></div><Switch checked={property.isNewBuild} onCheckedChange={(v) => { updateField('isNewBuild', v); if (v) updateField('buildYear', currentYear); }} /></div>
                {!property.isNewBuild && (
                  <div className="space-y-2">
                    <Label>Build Year</Label>
                    <Select value={property.buildYear.toString()} onValueChange={(v) => updateField('buildYear', parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{buildYearOptions.map((option) => (<SelectItem key={option.value} value={option.value.toString()}>{option.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-success/10 border border-success/20 space-y-2">
                  <div className="flex items-center gap-2"><Calculator className="h-4 w-4 text-success" /><span className="text-sm font-medium text-success">Tax Benefits</span></div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-xs text-muted-foreground">Depreciation</p><p className="font-medium">{formatCurrency(results.annualDepreciation)}/yr</p></div>
                    <div><p className="text-xs text-muted-foreground">Tax Refund</p><p className="font-medium text-success">{formatCurrency(results.annualTaxBenefit)}/yr</p></div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Growth Projection</h4>
                <InputField label="Annual Growth Rate" id={`${property.id}-growth-rate`} value={property.annualGrowthRate} onChange={(v) => updateField('annualGrowthRate', v)} suffix="% p.a." min={0} max={20} step={0.5} />
                <div className="space-y-2">
                  <Label>Projection Period</Label>
                  <Select value={property.projectionPeriod.toString()} onValueChange={(v) => updateField('projectionPeriod', parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[5, 10, 15, 20, 25, 30].map((years) => (<SelectItem key={years} value={years.toString()}>{years} years</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className={cn("p-3 rounded-lg border space-y-2", results.afterTaxMonthlyShortfall > 0 ? "bg-warning/10 border-warning/20" : "bg-success/10 border-success/20")}>
                  <p className="text-xs text-muted-foreground">After-Tax Monthly Cost</p>
                  <p className={cn("font-semibold text-lg", results.afterTaxMonthlyShortfall > 0 ? "text-warning" : "text-success")}>
                    {results.afterTaxMonthlyShortfall > 0 ? `${formatCurrency(results.afterTaxMonthlyShortfall)}/mo shortfall` : `+${formatCurrency(Math.abs(results.afterTaxMonthlyShortfall))}/mo cashflow`}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}