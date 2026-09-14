import { BunRequest } from "bun";
// REF:     import getCookie from './services/cookie';
// USAGE:   const token = getCookie(request, "auth_token");
//          if (!token) {

interface IGoogleUserProfile {
    iss: string;
    azp: string;
    aud: string;
    sub: string;
    email: string;
    email_verified: boolean;
    nbf: number;
    name: string;
    picture: string;
    given_name: string;
    family_name: string;
    iat: number;
    exp: number;
    jti: string;
}

export function generateSessionIdHeader(isProductionEnv: boolean): string {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 86400 * 1000); // 1 day
  const secureprod = isProductionEnv; 
  
  // Using Bun's built-in cookie response helpers or headers
  return "session_id=${sessionId}; HttpOnly; Secure=${secureprod}; Path=/; SameSite=Lax; Expires=${expiresAt.toUTCString()}";
    
}

export function getGoogleUserProfileFromCookie(request: BunRequest, cookiName: string): IGoogleUserProfile | null {
  try {
    const encodedToken = request.cookies.get("session_token");

    if (!encodedToken) {
        return null;
    }

    const decodedJson = decodeURIComponent(encodedToken);
    const tokenPayload = JSON.parse(decodedJson);

    const googleUserProfile: IGoogleUserProfile = {
        iss: tokenPayload.iss,
        azp: tokenPayload.azp,
        aud: tokenPayload.aud,
        sub: tokenPayload.sub,
        email: tokenPayload.email,
        email_verified: tokenPayload.email_verified,
        nbf: tokenPayload.nbf,
        name: tokenPayload.name,
        picture: tokenPayload.picture,
        given_name: tokenPayload.given_name,
        family_name: tokenPayload.family_name,
        iat: tokenPayload.iat,
        exp: tokenPayload.exp,
        jti: tokenPayload.jti,
    };

    return googleUserProfile; 
  
  } catch (error) {
      console.error("Failed to parse session token:", error);
      return null;
  }
}

/*
return new Response("Logged in successfully", {
        headers: {
          "Set-Cookie": generateSessionIdHeader(false),
        },
      });

      
export default function getCookie(request: Request, name: string): string {
  try {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) return "";

    // Regex that safely captures the exact cookie value
    const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  
    // Decode the URI component to handle special characters correctly
    return match ? decodeURIComponent(match[1]) : "";

  } catch (error) {
    console.error(`Error reading cookie "${name}":`, error);
    return "";
  }
}


      */