import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface PostcodeEntry {
  postcode: number;
  place_name: string;
  state_name: string;
  state_code: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}

let uniqueSuburbs: Array<{ suburb: string; state: string; postcode: string }> = [];
let dataLoaded = false;
let loadingPromise: Promise<void> | null = null;

async function loadData() {
  if (dataLoaded) return;
  if (loadingPromise) { await loadingPromise; return; }
  
  loadingPromise = (async () => {
    try {
      console.log('Loading suburb data from GitHub...');
      const response = await fetch(
        'https://raw.githubusercontent.com/Elkfox/Australian-Postcode-Data/master/au_postcodes.json'
      );
      if (!response.ok) throw new Error(`Failed to fetch suburb data: ${response.status}`);
      
      const allSuburbs: PostcodeEntry[] = await response.json();
      const suburbMap = new Map<string, { suburb: string; state: string; postcode: string }>();
      
      for (const entry of allSuburbs) {
        const key = `${entry.place_name.toLowerCase()}-${entry.state_code}`;
        if (!suburbMap.has(key)) {
          suburbMap.set(key, {
            suburb: entry.place_name,
            state: entry.state_code,
            postcode: entry.postcode.toString(),
          });
        }
      }
      
      uniqueSuburbs = Array.from(suburbMap.values());
      dataLoaded = true;
      console.log(`Loaded ${uniqueSuburbs.length} unique suburbs`);
    } catch (error) {
      console.error('Error loading suburb data:', error);
      loadingPromise = null;
      throw error;
    }
  })();
  
  await loadingPromise;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await loadData();
    
    let query = '';
    let limit = 15;
    
    if (req.method === 'POST') {
      const body = await req.json();
      query = (body.query || '').toLowerCase();
      limit = Math.min(body.limit || 15, 50);
    } else {
      const url = new URL(req.url);
      query = url.searchParams.get('q')?.toLowerCase() || '';
      limit = Math.min(parseInt(url.searchParams.get('limit') || '15'), 50);
    }

    if (query.length < 2) {
      return new Response(JSON.stringify({ results: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const startsWithMatches: typeof uniqueSuburbs = [];
    const containsMatches: typeof uniqueSuburbs = [];

    for (const entry of uniqueSuburbs) {
      const suburbLower = entry.suburb.toLowerCase();
      if (suburbLower.startsWith(query)) startsWithMatches.push(entry);
      else if (suburbLower.includes(query)) containsMatches.push(entry);
      if (startsWithMatches.length + containsMatches.length >= limit * 2) break;
    }

    const results = [...startsWithMatches, ...containsMatches].slice(0, limit);
    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[ERROR] Suburb search failed:', error);
    return new Response(
      JSON.stringify({ error: 'Unable to complete search', results: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});