import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Briefcase, DollarSign, Home, TrendingUp, User, Users } from "lucide-react";
import { PropertyData, PropertyResults, createDefaultProperty, generatePropertyId, ensurePropertyDefaults, PropertyMode } from "@/lib/advisor/portfolioTypes";
import { calculatePropertyResults, calculatePortfolioSummary } from "@/lib/advisor/portfolioCalculations";
import { InputSection } from "./InputSection";
import { InputField } from "./InputField";
import { PortfolioPropertyCard } from "./PortfolioPropertyCard";
import { NewPurchasePropertyCard } from "./NewPurchasePropertyCard";
import { PortfolioSummaryCard } from "./PortfolioSummaryCard";
import { FutureProjectionsSection } from "./FutureProjectionsSection";
import { CombinedPortfolioProjection } from "./CombinedPortfolioProjection";
import { HoldVsSellSection } from "./HoldVsSellSection";
import { Disclaimer } from "./Disclaimer";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/components/AppHeader";

export function PortfolioAdvisorCalculator() {
  const [properties, setProperties] = useState<PropertyData[]>(() => [createDefaultProperty(generatePropertyId(), 0)]);
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(() => properties[0]?.id || null);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(() => properties[0]?.id || null);

  const [isJointOwnership, setIsJointOwnership] = useState(false);
  const [applicant1OwnershipPercent, setApplicant1OwnershipPercent] = useState(100);
  const [applicant1Income, setApplicant1Income] = useState(150000);
  const [applicant2Income, setApplicant2Income] = useState(120000);

  const handleOwnershipModeChange = (isJoint: boolean) => {
    setIsJointOwnership(isJoint);
    setApplicant1OwnershipPercent(isJoint ? 50 : 100);
  };

  const resultsMap = useMemo(() => {
    const map = new Map<string, PropertyResults>();
    properties.forEach(property => {
      const normalizedProperty = ensurePropertyDefaults(property);
      const results = calculatePropertyResults(normalizedProperty, applicant1Income, applicant2Income, isJointOwnership, applicant1OwnershipPercent);
      map.set(normalizedProperty.id, results);
    });
    return map;
  }, [properties, applicant1Income, applicant2Income, isJointOwnership, applicant1OwnershipPercent]);

  const portfolioSummary = useMemo(() => calculatePortfolioSummary(properties, resultsMap), [properties, resultsMap]);

  const addProperty = useCallback((mode: PropertyMode = 'already-held') => {
    const newProperty = createDefaultProperty(generatePropertyId(), properties.length, mode);
    setProperties(prev => [...prev, newProperty]);
    setExpandedPropertyId(newProperty.id);
    setActivePropertyId(newProperty.id);
  }, [properties.length]);

  const removeProperty = useCallback((id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));
    if (activePropertyId === id) setActivePropertyId(properties.find(p => p.id !== id)?.id || null);
    if (expandedPropertyId === id) setExpandedPropertyId(null);
  }, [activePropertyId, expandedPropertyId, properties]);

  const updateProperty = useCallback((updated: PropertyData) => {
    setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Private Advisor Tool</Badge>
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">Multi-Property Portfolio</Badge>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">Portfolio Property Analysis</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Analyse multiple properties, project future growth, and compare hold vs sell scenarios for comprehensive client advice.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          <InputSection title="Client Income & Ownership" icon={<DollarSign className="h-5 w-5 text-primary" />} helperText="These settings apply to all properties in the portfolio">
            <div className="mb-6">
              <Label className="text-sm font-medium text-foreground mb-3 block">Who owns these properties?</Label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => handleOwnershipModeChange(false)} className={cn("flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all", !isJointOwnership ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card hover:border-primary/50 text-muted-foreground")}>
                  <User className="h-5 w-5" /><span className="font-medium">Individual</span>
                </button>
                <button type="button" onClick={() => handleOwnershipModeChange(true)} className={cn("flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all", isJointOwnership ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card hover:border-primary/50 text-muted-foreground")}>
                  <Users className="h-5 w-5" /><span className="font-medium">Joint Ownership</span>
                </button>
              </div>
            </div>

            {isJointOwnership && (
              <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold text-foreground">Ownership Split</Label>
                </div>
                <div className="space-y-3">
                  <Slider value={[applicant1OwnershipPercent]} onValueChange={(value) => setApplicant1OwnershipPercent(value[0])} min={5} max={95} step={5} className="w-full" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Applicant 1: <span className="font-semibold text-foreground">{applicant1OwnershipPercent}%</span></span>
                    <span className="text-muted-foreground">Applicant 2: <span className="font-semibold text-foreground">{100 - applicant1OwnershipPercent}%</span></span>
                  </div>
                </div>
              </div>
            )}

            <div className={cn("grid gap-4", isJointOwnership ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
              <InputField label={isJointOwnership ? "Applicant 1 Income" : "Annual Taxable Income"} id="applicant1-income" value={applicant1Income} onChange={setApplicant1Income} prefix="$" min={0} />
              {isJointOwnership && <InputField label="Applicant 2 Income" id="applicant2-income" value={applicant2Income} onChange={setApplicant2Income} prefix="$" min={0} />}
            </div>
          </InputSection>

          {properties.length > 1 && <PortfolioSummaryCard summary={portfolioSummary} />}

          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Properties</h2>
                <Badge variant="secondary">{properties.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => addProperty('already-held')} variant="outline" size="sm"><Home className="h-4 w-4 mr-2" />Add Held Property</Button>
                <Button onClick={() => addProperty('new-purchase')} variant="default" size="sm"><TrendingUp className="h-4 w-4 mr-2" />Add New Purchase</Button>
              </div>
            </div>

            {properties.map((property) => {
              const results = resultsMap.get(property.id);
              if (!results) return null;
              if (property.propertyMode === 'new-purchase') {
                return <NewPurchasePropertyCard key={property.id} property={property} results={results} onUpdate={updateProperty} onRemove={removeProperty} isExpanded={expandedPropertyId === property.id} onToggleExpand={() => setExpandedPropertyId(expandedPropertyId === property.id ? null : property.id)} canRemove={properties.length > 1} />;
              }
              return <PortfolioPropertyCard key={property.id} property={property} results={results} onUpdate={updateProperty} onRemove={removeProperty} isExpanded={expandedPropertyId === property.id} onToggleExpand={() => setExpandedPropertyId(expandedPropertyId === property.id ? null : property.id)} canRemove={properties.length > 1} />;
            })}
          </div>

          {properties.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Property Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">Select a property to view detailed projections, or view combined portfolio analysis</p>
              </CardHeader>
              <CardContent>
                <Tabs value={activePropertyId || 'combined'} onValueChange={setActivePropertyId}>
                  <TabsList className="w-full justify-start flex-wrap h-auto gap-2 bg-transparent p-0 mb-6">
                    <TabsTrigger value="combined" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Briefcase className="h-4 w-4 mr-2" />All Properties
                    </TabsTrigger>
                    {properties.map((property) => (
                      <TabsTrigger key={property.id} value={property.id} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{property.name}</TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="combined" className="space-y-6 mt-0">
                    <CombinedPortfolioProjection properties={properties} resultsMap={resultsMap} applicant1Income={applicant1Income} applicant2Income={applicant2Income} isJointOwnership={isJointOwnership} applicant1OwnershipPercent={applicant1OwnershipPercent} />
                  </TabsContent>

                  {properties.map((property) => {
                    const results = resultsMap.get(property.id);
                    if (!results) return null;
                    return (
                      <TabsContent key={property.id} value={property.id} className="space-y-6 mt-0">
                        <FutureProjectionsSection property={property} results={results} applicant1Income={applicant1Income} applicant2Income={applicant2Income} isJointOwnership={isJointOwnership} applicant1OwnershipPercent={applicant1OwnershipPercent} />
                        <HoldVsSellSection property={property} results={results} applicant1Income={applicant1Income} applicant2Income={applicant2Income} isJointOwnership={isJointOwnership} applicant1OwnershipPercent={applicant1OwnershipPercent} />
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          )}

          <Disclaimer />
        </div>
      </main>

      <footer className="border-t border-border/50 bg-card mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">© {new Date().getFullYear()} Margin Finance. Private Advisor Tool - Not for public distribution.</p>
        </div>
      </footer>
    </div>
  );
}