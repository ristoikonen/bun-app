/**
 * Extracts the real client IP address from a BunRequest, 
 * correctly handling standard proxy and load balancer headers.
 */
export function getClientIp(req: Request): string {
  // 1. Check standard proxy headers first (Cloudflare, Nginx, AWS, etc.)
  // 'x-forwarded-for' can contain a comma-separated list if multiple proxies were hopped.
  // The FIRST IP in the list is the original client.
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const primaryIp = forwardedFor.split(",")[0].trim();
    if (isValidIp(primaryIp)) {
      return primaryIp;
    }
  }

  // 2. Check alternative common headers
  const realIp = req.headers.get("x-real-ip") || 
                 req.headers.get("cf-connecting-ip") || 
                 req.headers.get("true-client-ip");
                 
  if (realIp && isValidIp(realIp.trim())) {
    return realIp.trim();
  }

  // 3. Fallback for direct connections (or local development)
  // Note: In Bun.serve, if you need direct socket info when not behind a proxy, 
  // you can also check server request context if exposed, otherwise default to localhost.
  return "127.0.0.1";
}

/**
 * Basic validation helper to ensure the extracted string looks like an IPv4 or IPv6 address.
 */
function isValidIp(ip: string): boolean {
  // Simple regex check for IPv4 and IPv6 format sanity
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  // Also allow shorthand localhost for local testing
  if (ip === "::1" || ip === "localhost") return true;

  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

export interface IGeoIpData {
  ip: string;
  success: boolean;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  timezone?: string;
}

export async function fetchIpMetadata(ip: string): Promise<IGeoIpData> {
  // Handle local development loops gracefully
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.")) {
    return {
      ip,
      success: true,
      country: "Local Development",
      region: "Localhost",
      city: "Development Box",
      timezone: "UTC",
    };
  }

  try {
    // Using a reliable free IP intelligence endpoint (no key required for development/testing)
    const response = await fetch(`https://ipwho.is/${ip}`);
    const data = await response.json() as any;

    if (!data.success) {
      return { ip, success: false };
    }

    return {
      ip,
      success: true,
      country: data.country,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      isp: data.connection?.isp || data.isp,
      timezone: data.timezone?.id,
    };
  } catch (error) {
    console.error("Failed to fetch IP metadata:", error);
    return { ip, success: false };
  }
}

/*
// server.ts
import { serve } from "bun";
import { getClientIp } from "./utils/ip";
import { generateIPHash } from "./utils/hash";
import { jsonResponse, errorResponse } from "./utils/response";

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/ai/generate" && req.method === "POST") {
      // 1. Get the verified client IP
      const rawIp = getClientIp(req);

      // 2. Generate the OpenSSL hex-peppered anonymous hash
      const visitorHash = await generateIPHash(rawIp);

      console.log(`Incoming request from IP: ${rawIp} -> Hashed ID: ${visitorHash}`);

      // 3. Compare visitorHash against your store/database of used free prompts...

      return jsonResponse({
        success: true,
        visitorHash, // For debugging / telemetry display
        message: "AI prompt processed successfully."
      });
    }

    return errorResponse("Not Found", 404);
  },
});

console.log(" Server running at http://localhost:3000");



// IP RELATED =====================================================

// server.ts
import { serve } from "bun";
import { getClientIp } from "./utils/ip";
import { generateIPHash } from "./utils/hash";
import { fetchIpMetadata } from "./services/ipLookup";
import { jsonResponse, errorResponse } from "./utils/response";

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/glow/ai" && req.method === "POST") {
      // 1. Get the verified client IP
      const rawIp = getClientIp(req);

      // 2. Generate the secure anonymous visitor hash using your OpenSSL pepper
      const visitorHash = await generateIPHash(rawIp);

      // 3. Fetch optional IP metadata (City, ISP, Country)
      const ipMeta = await fetchIpMetadata(rawIp);

      console.log(`[AI Request] Visitor Hash: ${visitorHash} | Location: ${ipMeta.city}, ${ipMeta.country}`);

      // 4. Run your rate limit check based on `visitorHash` here...

      return jsonResponse({
        success: true,
        visitorInfo: {
          hash: visitorHash,
          location: {
            city: ipMeta.city || "Unknown",
            country: ipMeta.country || "Unknown",
            timezone: ipMeta.timezone || "UTC",
          }
        },
        message: "AI generation telemetry captured successfully."
      });
    }

    return errorResponse("Not Found", 404);
  },
});

console.log("Glow API Gateway active at http://localhost:3000");

*/