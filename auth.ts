import { SignJWT, jwtVerify } from "jose";

// Convert your secret environment string into a byte array for cryptographic operations
const JWT_SECRET = new TextEncoder().encode(
    Bun.env.JWT_SECRET || "your-ultra-secure-fallback-secret-key-32-chars-long"
);

export interface UserSessionPayload {
    googleSub: string;
    email: string;
}

export const Auth = {
    /**
     * Cryptographically signs the Google sub ID into a secure JWT string
     */
    async createToken(payload: UserSessionPayload): Promise<string> {
        return await new SignJWT({ ...payload })
            .setProtectedHeader({ alg: "HS256" }) // Use HMAC SHA-256 signature
            .setIssuedAt()
            .setExpirationTime("15m") // Short lifespan for security
            //.setExpirationTime("24h") // Token automatically invalidates after 24 hours
            .sign(JWT_SECRET);
    },


    /**
    * Generates a long-lived Refresh Token (7 days)
    */
    async createRefreshToken(payload: UserSessionPayload): Promise<string> {
        return await new SignJWT({ ...payload })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            //NOTE: short life span for testing - Use "7d" when testing done.
            .setExpirationTime("20m") 
            .sign(JWT_SECRET);
    },


    /**
     * Verifies the token signature. Returns the payload or null if tampered with/expired.
     */
    async verifyToken(token: string): Promise<UserSessionPayload | null> {
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            return payload as unknown as UserSessionPayload;
        } catch (error) {
            // Triggers if the signature is bad, or if the token has expired
            console.warn("JWT verification failed:", error);
            return null;
        }
    }
};
