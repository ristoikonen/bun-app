export interface ClientGeoProfile {
  ip: string;
  city: string;
  region: string;
  regionCode: string;
  country: string;
  countryCode: string;
  postal: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  asn: string;
  org: string;
  isLocal: boolean;
}

export class GeoService {
  /**
   * Extracts client IP from a Bun Request, checking standard proxy headers first.
   */
  public extractClientIp(req: Request): string {
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    
    if (forwardedFor) {
      // x-forwarded-for can be a comma-separated list; the first IP is the client
      return forwardedFor.split(",")[0].trim();
    }
    
    if (realIp) {
      return realIp.trim();
    }

    // Fallback if no proxy headers are present (e.g. direct local connection)
    return "127.0.0.1";
  }

  /**
   * Fetches location metadata for an IP using ipapi.co and populates the profile interface.
   */
  public async getGeoProfile(req: Request): Promise<ClientGeoProfile> {
    const ip = this.extractClientIp(req);

    // Handle local/loopback testing environments
    if (ip === "127.0.0.1" || ip === "localhost" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
      return {
        ip,
        city: "Canberra",
        region: "Australian Capital Territory",
        regionCode: "ACT",
        country: "Australia",
        countryCode: "AU",
        postal: "2914",
        latitude: -35.1833,
        longitude: 149.1333,
        timezone: "Australia/Sydney",
        asn: "LOCAL",
        org: "Local Development Network",
        isLocal: true,
      };
    }

    try {
      const response = await fetch(`https://ipapi.co/${ip}/json/`, {
        headers: {
          "User-Agent": "BunApp-IGlowPortal/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`ipapi lookup failed with status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`ipapi error: ${data.reason || 'Unknown error'}`);
      }

      return {
        ip: data.ip || ip,
        city: data.city || "",
        region: data.region || "",
        regionCode: data.region_code || "",
        country: data.country_name || "",
        countryCode: data.country || "",
        postal: data.postal || "",
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        timezone: data.timezone || "",
        asn: data.asn || "",
        org: data.org || "",
        isLocal: false,
      };
    } catch (error) {
      console.error("GeoService lookup error:", error);
      // Return fallback profile on failure so request handling doesn't crash
      return {
        ip,
        city: "Unknown",
        region: "Unknown",
        regionCode: "",
        country: "Unknown",
        countryCode: "",
        postal: "",
        latitude: null,
        longitude: null,
        timezone: "",
        asn: "",
        org: "",
        isLocal: false,
      };
    }
  }
}