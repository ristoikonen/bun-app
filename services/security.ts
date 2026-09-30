
const UPLOAD_DIR = "./upload_files";
const THUMB_DIR = "./thumbnails";

import hashGoogleSub from '../handlers/hash'
import verifyUserWithBackend from '../handlers/verify'


export interface SecurityContext {
  isAuthenticated: boolean;
  tokenType: "Bearer" | "Cookie" | "None";
  tokenValue: string | null;
  csrfToken: string | null;
  cookies: Record<string, string>;
}

export default async function testHashAndVerifyUserWithBackend(hashMe: string): Promise<string> {
    try {
        console.log("About to hash: " + hashMe);

        let subhash = hashGoogleSub('abc');
        console.log(subhash);

        //const hashbytes: Uint8Array = new TextEncoder().encode('abc');
        
        const hmac = new Bun.CryptoHasher("sha256", Bun.env.GOOGLE_SUB_PEPPER);
        let hexhash = hmac.update(hashMe).digest().toHex();

        const eq = subhash === hexhash;
        
        console.log(`${subhash} === ${hexhash} = ${eq}`);

        //const data = verifyUserWithBackend(Bun.env.GOOGLE_SUB_PEPPER || '')

        return subhash || "";

    } catch (error) {
        console.error("Error in testHash:", error);
        return "";
    }
}


export class SecurityInspector {
  /**
   * Parses cookies from the request Cookie header into a key-value record.
   */
  public parseCookies(req: Request): Record<string, string> {
    const cookieHeader = req.headers.get("cookie");
    if (!cookieHeader) return {};

    const cookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((cookie) => {
      const parts = cookie.split("=");
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join("=").trim();
        cookies[name] = decodeURIComponent(value);
      }
    });
    return cookies;
  }

  /**
   * Inspects the request for Authorization headers, session cookies, and anti-CSRF tokens.
   */
  public inspect(req: Request): SecurityContext {
    const cookies = this.parseCookies(req);

    // 1. Check for Authorization Bearer Token
    const authHeader = req.headers.get("authorization");
    let tokenType: "Bearer" | "Cookie" | "None" = "None";
    let tokenValue: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      tokenType = "Bearer";
      tokenValue = authHeader.substring(7).trim();
    } 
    // 2. Fallback to session token stored in cookies
    else if (cookies["session"] || cookies["auth_token"]) {
      tokenType = "Cookie";
      tokenValue = cookies["session"] || cookies["auth_token"] || null;
    }

    // 3. Extract Anti-CSRF token (commonly sent via header or custom cookie)
    const csrfToken = 
      req.headers.get("x-csrf-token") || 
      req.headers.get("x-xsrf-token") || 
      cookies["csrf_token"] || 
      null;

    return {
      isAuthenticated: Boolean(tokenValue),
      tokenType,
      tokenValue,
      csrfToken,
      cookies,
    };
  }
}
