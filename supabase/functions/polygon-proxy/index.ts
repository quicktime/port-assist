// supabase/functions/polygon-proxy/index.js
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the URL and endpoint from the request
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    
    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing endpoint parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Build the Polygon API URL
    const polygonURL = `https://api.polygon.io/${endpoint}`;
    
    // Add API key to URL
    const urlWithKey = new URL(polygonURL);
    urlWithKey.searchParams.append("apiKey", POLYGON_API_KEY);
    
    // Forward the request to Polygon
    const response = await fetch(urlWithKey.toString(), {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
      // Forward the request body if it exists
      ...(req.method !== "GET" && req.method !== "HEAD" ? { body: await req.text() } : {}),
    });
    
    // Get the response data
    const responseData = await response.json();
    
    // Return the response
    return new Response(
      JSON.stringify(responseData),
      { 
        status: response.status, 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    // Return error response
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});