// Follow Deno and Supabase Edge Function conventions
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { RtcTokenBuilder, RtcRole } from "npm:agora-token@2.0.3";

// Get Agora credentials from environment variables
const APP_ID = Deno.env.get("AGORA_APP_ID") || "f87255c9501e4db89944550d630c5b99";
const APP_CERTIFICATE = Deno.env.get("AGORA_APP_CERTIFICATE") || "116c4e6416d5474c8b11fee8d3819e51";

// Log warning if using fallback credentials
if (!Deno.env.get("AGORA_APP_ID") || !Deno.env.get("AGORA_APP_CERTIFICATE")) {
  console.warn("Warning: Using fallback Agora credentials. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE environment variables for production.");
}

serve(async (req) => {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    // Parse request body for parameters if it's a POST request
    if (req.method === "POST") {
      const body = await req.json();
      const { channelName, uid = "0", role = "publisher", expiry = 3600 } = body;
      
      if (!channelName) {
        return new Response(
          JSON.stringify({ error: "Missing channelName parameter" }),
          { headers, status: 400 }
        );
      }
      
      // Calculate privilege expire time
      const currentTime = Math.floor(Date.now() / 1000);
      const privilegeExpireTime = currentTime + Number(expiry);
      
      // Build the token
      const token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        uid,
        role === "subscriber" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER,
        privilegeExpireTime
      );
      
      // Return the token
      return new Response(
        JSON.stringify({ token }),
        { headers }
      );
    }
    
    // Parse URL to get path parameters for GET requests
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    // Check if we have enough path parts
    if (pathParts.length < 3) {
      return new Response(
        JSON.stringify({ error: "Missing parameters. Format: /agora-token/channelName/uid" }),
        { headers, status: 400 }
      );
    }

    // Extract parameters (skip the function name in pathParts[0])
    const channelName = pathParts[1];
    const uid = pathParts[2] || "0";
    
    // Get query parameters
    const role = url.searchParams.get("role") === "subscriber" 
      ? RtcRole.SUBSCRIBER 
      : RtcRole.PUBLISHER;
    const expireTime = parseInt(url.searchParams.get("expiry") || "3600");
    
    // Calculate privilege expire time
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;
    
    // Build the token
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpireTime
    );
    
    // Return the token
    return new Response(
      JSON.stringify({ token }),
      { headers }
    );
  } catch (error) {
    console.error("Error generating token:", error);
    
    return new Response(
      JSON.stringify({ error: "Failed to generate token" }),
      { headers, status: 500 }
    );
  }
}); 