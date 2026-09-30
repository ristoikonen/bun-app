
import { jwtVerify, createRemoteJWKSet } from "jose"; 

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const GOOGLE_CLIENT_ID = Bun.env.GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID.apps.googleusercontent.com";

export interface GoogleUserClaims {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  hd?: string; // Hosted domain (optional)
}

export class GoogleAuthService {
  /**
   * Verifies a Google ID token passed from the frontend
   */
  public async verifyIdToken(idToken: string): Promise<GoogleUserClaims | null> {
    try {
      const { payload } = await jwtVerify(idToken, JWKS, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: GOOGLE_CLIENT_ID,
      });

      return {
        sub: payload.sub as string,
        email: payload.email as string,
        email_verified: Boolean(payload.email_verified),
        name: (payload.name as string) || "",
        picture: (payload.picture as string) || "",
        hd: payload.hd as string | undefined,
      };
    } catch (error) {
      console.error("Google token verification failed:", error);
      return null;
    }
  }
}