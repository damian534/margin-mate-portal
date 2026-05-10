// Public address autocomplete proxy to Nominatim (OSM/GNAF), AU only.
// Adds proper User-Agent + caching to comply with Nominatim usage policy.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    if (q.length < 3) {
      return new Response("[]", {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const upstream = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&countrycodes=au&limit=6&q=${encodeURIComponent(q)}`;
    const res = await fetch(upstream, {
      headers: {
        "User-Agent": "MarginConnect/1.0 (apply@margin.com.au)",
        "Accept-Language": "en-AU",
        Accept: "application/json",
      },
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        ...corsHeaders,
        "content-type": "application/json",
        "cache-control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});