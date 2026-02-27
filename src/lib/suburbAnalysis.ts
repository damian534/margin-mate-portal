import { supabase } from "@/integrations/supabase/client";

export interface DemographicsData {
  population: number;
  populationGrowth: number;
  medianAge: number;
  medianHouseholdIncome: number;
  familyHouseholds: number;
  singleHouseholds: number;
  coupleNoKids: number;
  ownerOccupied: number;
  renterOccupied: number;
}

export interface SchoolData {
  name: string;
  type: "primary" | "secondary" | "combined";
  sector: "public" | "private" | "catholic";
  distance: number;
  rating: "excellent" | "good" | "average" | "below_average";
  naplanScore: number | null;
}

export interface EnvironmentalRisks {
  floodRisk: "none" | "low" | "moderate" | "high";
  bushfireRisk: "none" | "low" | "moderate" | "high";
  coastalErosion: "none" | "low" | "moderate" | "high";
  overallRiskScore: number;
  riskSummary: string;
}

export interface InfrastructureProject {
  project: string;
  type: "transport" | "health" | "education" | "retail" | "residential" | "commercial";
  status: "completed" | "under_construction" | "planned" | "proposed";
  completionYear: number | null;
  impact: "high" | "medium" | "low";
  description: string;
}

export interface RentalMarketData {
  medianRentHouse: number;
  medianRentUnit: number;
  rentalYieldHouse: number;
  rentalYieldUnit: number;
  vacancyRate: number;
  averageTenancy: number;
  rentGrowth1Year: number;
  rentGrowth5Year: number;
}

export interface TenantDemographics {
  youngProfessionals: number;
  families: number;
  students: number;
  retirees: number;
}

export interface AffordabilityData {
  mortgageRepaymentMonthly: number;
  incomeRequiredForMortgage: number;
  rentToIncomeRatio: number;
  priceToIncomeRatio: number;
  affordabilityRating: "very_affordable" | "affordable" | "moderate" | "stretched" | "unaffordable";
}

export interface CrimeAndSafety {
  overallCrimeRate: "well_below_average" | "below_average" | "average" | "above_average" | "high";
  safetyScore: number;
  propertyTheft: "low" | "moderate" | "high";
  violentCrime: "low" | "moderate" | "high";
  comparedToState: "safer" | "similar" | "less_safe";
}

export interface WalkabilityAndTransport {
  walkScore: number;
  bikeScore: number;
  transitScore: number;
  nearestTrainStation: string;
  distanceToTrain: number | null;
  busRoutes: number;
  parkingAvailability: "easy" | "moderate" | "difficult";
}

export interface AmenitiesData {
  distanceToHospital: number;
  distanceToCBD: number;
  distanceToBeach: number | null;
  shoppingCentres: number;
  restaurants: "few" | "moderate" | "many";
  cafes: "few" | "moderate" | "many";
  parks: number;
  gyms: number;
}

export interface LiveabilityScores {
  overall: number;
  familyFriendly: number;
  youngProfessionals: number;
  retirees: number;
  investors: number;
}

export interface SuburbAnalysis {
  suburb: string;
  state: string;
  recommendedGrowthRate: number;
  confidence: "low" | "medium" | "high";
  medianHousePrice: number | null;
  medianUnitPrice: number | null;
  historicalGrowth: { fiveYear: number | null; tenYear: number | null };
  marketAnalysis: string;
  growthDrivers: string[];
  risks: string[];
  comparableSuburbs: Array<{ name: string; growth: number }>;
  dataSource: string;
  demographics?: DemographicsData;
  schools?: SchoolData[];
  environmentalRisks?: EnvironmentalRisks;
  infrastructure?: InfrastructureProject[];
  rentalMarket?: RentalMarketData;
  tenantDemographics?: TenantDemographics;
  affordability?: AffordabilityData;
  crimeAndSafety?: CrimeAndSafety;
  walkabilityAndTransport?: WalkabilityAndTransport;
  amenities?: AmenitiesData;
  liveabilityScores?: LiveabilityScores;
}

export interface SuburbAnalysisResponse {
  success: boolean;
  data?: SuburbAnalysis;
  error?: string;
}

export async function analyzeSuburbGrowth(
  suburb: string, state: string, projectionPeriod: number
): Promise<SuburbAnalysisResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("suburb-growth-analysis", {
      body: { suburb, state, projectionPeriod },
    });

    if (error) {
      console.error("Supabase function error:", error);
      return { success: false, error: error.message };
    }
    if (data?.error) return { success: false, error: data.error };
    return { success: true, data: data.data };
  } catch (err) {
    console.error("Suburb analysis error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to analyze suburb" };
  }
}

export async function searchSuburbsAsync(
  query: string
): Promise<Array<{ suburb: string; state: string; postcode: string }>> {
  if (!query || query.length < 2) return [];
  try {
    const { data, error } = await supabase.functions.invoke("suburb-search", {
      body: { query, limit: 15 },
    });
    if (error) { console.error("Suburb search error:", error); return []; }
    return data?.results || [];
  } catch (err) {
    console.error("Suburb search error:", err);
    return [];
  }
}