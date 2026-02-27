import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
const SAFE_SUBURB_PATTERN = /^[a-zA-Z\s\-']+$/;

function sanitizeForPrompt(text: string): string {
  return text.replace(/[<>{}[\]\\]/g, '').replace(/\n|\r/g, ' ').trim().slice(0, 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let requestData;
    try { requestData = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid request format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { suburb, state, projectionPeriod = 10 } = requestData;
    if (!suburb || !state || !SAFE_SUBURB_PATTERN.test(suburb) || !VALID_STATES.includes(state.toUpperCase())) {
      return new Response(JSON.stringify({ error: "Invalid request parameters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sanitizedSuburb = sanitizeForPrompt(suburb);
    const sanitizedState = state.toUpperCase();
    const period = Math.min(Math.max(projectionPeriod, 1), 30);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = `You are an Australian property market analyst with deep expertise in suburb-level property data, demographics, infrastructure, schools, environmental risks, and liveability metrics. You provide comprehensive, data-driven analysis for property investors.

When analyzing a suburb, you should:
1. Search for the most recent property data available (CoreLogic, Domain, PropTrack, ABS, etc.)
2. Consider the suburb's historical 10-year median price growth
3. Factor in local infrastructure, demographics, development, schools, transport, and amenities
4. Compare to surrounding suburbs and state averages
5. Provide realistic growth projections based on evidence
6. Assess environmental risks (flood zones, bushfire, coastal erosion)
7. Evaluate rental market conditions and tenant demographics
8. Score liveability factors (walkability, transport, amenities, safety)

Be honest if you don't have specific data - provide ranges and comparable suburb benchmarks instead.`;

    const userPrompt = `Analyze the property market for ${sanitizedSuburb}, ${sanitizedState}, Australia for a ${period}-year investment horizon.

Please provide a COMPREHENSIVE suburb investment report in the following JSON structure:
{
  "suburb": "${sanitizedSuburb}",
  "state": "${sanitizedState}",
  "recommendedGrowthRate": <number between 3-10>,
  "confidence": "<low|medium|high>",
  "medianHousePrice": <number or null>,
  "medianUnitPrice": <number or null>,
  "historicalGrowth": { "fiveYear": <number or null>, "tenYear": <number or null> },
  "marketAnalysis": "<2-3 sentence summary>",
  "growthDrivers": ["<list 3-4 key factors>"],
  "risks": ["<list 2-3 key risks>"],
  "comparableSuburbs": [{"name": "<suburb>", "growth": <number>}],
  "dataSource": "<source>",
  "demographics": { "population": <number>, "populationGrowth": <number>, "medianAge": <number>, "medianHouseholdIncome": <number>, "familyHouseholds": <number>, "singleHouseholds": <number>, "coupleNoKids": <number>, "ownerOccupied": <number>, "renterOccupied": <number> },
  "schools": [{ "name": "<string>", "type": "<primary|secondary|combined>", "sector": "<public|private|catholic>", "distance": <number>, "rating": "<excellent|good|average|below_average>", "naplanScore": <number or null> }],
  "environmentalRisks": { "floodRisk": "<none|low|moderate|high>", "bushfireRisk": "<none|low|moderate|high>", "coastalErosion": "<none|low|moderate|high>", "overallRiskScore": <1-100>, "riskSummary": "<string>" },
  "infrastructure": [{ "project": "<string>", "type": "<transport|health|education|retail|residential|commercial>", "status": "<completed|under_construction|planned|proposed>", "completionYear": <number or null>, "impact": "<high|medium|low>", "description": "<string>" }],
  "rentalMarket": { "medianRentHouse": <number>, "medianRentUnit": <number>, "rentalYieldHouse": <number>, "rentalYieldUnit": <number>, "vacancyRate": <number>, "averageTenancy": <number>, "rentGrowth1Year": <number>, "rentGrowth5Year": <number> },
  "tenantDemographics": { "youngProfessionals": <number>, "families": <number>, "students": <number>, "retirees": <number> },
  "affordability": { "mortgageRepaymentMonthly": <number>, "incomeRequiredForMortgage": <number>, "rentToIncomeRatio": <number>, "priceToIncomeRatio": <number>, "affordabilityRating": "<very_affordable|affordable|moderate|stretched|unaffordable>" },
  "crimeAndSafety": { "overallCrimeRate": "<well_below_average|below_average|average|above_average|high>", "safetyScore": <1-100>, "propertyTheft": "<low|moderate|high>", "violentCrime": "<low|moderate|high>", "comparedToState": "<safer|similar|less_safe>" },
  "walkabilityAndTransport": { "walkScore": <0-100>, "bikeScore": <0-100>, "transitScore": <0-100>, "nearestTrainStation": "<string>", "distanceToTrain": <number or null>, "busRoutes": <number>, "parkingAvailability": "<easy|moderate|difficult>" },
  "amenities": { "distanceToHospital": <number>, "distanceToCBD": <number>, "distanceToBeach": <number or null>, "shoppingCentres": <number>, "restaurants": "<few|moderate|many>", "cafes": "<few|moderate|many>", "parks": <number>, "gyms": <number> },
  "liveabilityScores": { "overall": <0-100>, "familyFriendly": <0-100>, "youngProfessionals": <0-100>, "retirees": <0-100>, "investors": <0-100> }
}

Return ONLY valid JSON, no other text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[API_ERROR]", response.status, errorText);
      return new Response(JSON.stringify({ error: "Unable to complete analysis. Please try again later." }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "Empty response from AI" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let analysisData;
    try {
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysisData = JSON.parse(cleanedContent);
    } catch {
      analysisData = {
        suburb: sanitizedSuburb, state: sanitizedState, recommendedGrowthRate: 6.0, confidence: "low",
        medianHousePrice: null, medianUnitPrice: null, historicalGrowth: { fiveYear: null, tenYear: null },
        marketAnalysis: "Unable to retrieve specific data. The recommended rate is based on Australian average property growth.",
        growthDrivers: ["Population growth", "Infrastructure investment", "Economic development"],
        risks: ["Market volatility", "Interest rate changes", "Economic uncertainty"],
        comparableSuburbs: [], dataSource: "Fallback to Australian average",
      };
    }

    // Validate key fields
    if (typeof analysisData.recommendedGrowthRate !== 'number' || analysisData.recommendedGrowthRate < 0 || analysisData.recommendedGrowthRate > 20) {
      analysisData.recommendedGrowthRate = 6.0;
    }
    if (!['low', 'medium', 'high'].includes(analysisData.confidence)) {
      analysisData.confidence = 'medium';
    }

    return new Response(JSON.stringify({ data: analysisData }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[ERROR]", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});