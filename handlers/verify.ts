
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { Glob, CookieMap, BunRequest } from "bun";

/*
Get
User access token - 1H bearer token for API calls
Refresh token     - Long-lived token-granting token stored by your application.It isn't used to call APIs directly, can be redeemed later to obtain a new User access token when the old one expires.
ID Token          - If requested, User ID token. If your OAuth scopes include OpenID Connect (openid or email); JWT identity token that lets your client application identify the user (e.g., extracting their email or profile info).
*/ 

export default async function verifyUserWithBackend(code: string) {
    
    const googleClientSecret = Bun.env.GOOGLE_CLIENT_SECRET
    const googleClientId = Bun.env.GOOGLE_CLIENT_ID
    const googleAuthRedirectURI = Bun.env.GOOGLE_AUTH_REDIRECT_URI
    // "urn:ietf:wg:oauth:2.0:oob"
    //const requestUrl = new URL("api/auth/verify-google", `${apiBaseUrl.replace(/\/$/, "")}/`).toString();

    try {

        const auth = new google.auth.OAuth2(
            googleClientId,
            googleClientSecret,
            googleAuthRedirectURI
        );

        const { tokens } = await auth.getToken(code);

        // DEBUG
        const accessToken = tokens.access_token;
        const idToken = tokens.id_token;
        //Always save refresh token immediately to a secure database associated with that user.
        const refreshToken = tokens.refresh_token;
        const expiryDate = tokens.expiry_date;
        console.log("Access Token:", accessToken);
        console.log("Id Token:", idToken);
        console.log("Refresh Token:", refreshToken);
        console.log("Expires At:", new Date(expiryDate || ''));
        // EO DEBUG

        const sessionStream = createSessionStream(tokens);
        const authenticatedClient = await handleUserSessionStream(sessionStream);
        
        // Setting Credentials for Later Use
        auth.setCredentials(tokens);

        return new Response("Authentication successful! You can close this window.", {
            status: 200,
            headers: { "Content-Type": "text/html" }
            });

    } catch (err) {
        console.error("OAuth exchange failed:", err);
        return new Response("Internal Server Error during auth exchange.", { status: 500 });
    }

    //TODO: Move to calling code (if (url.pathname === "/auth/callback") ) 
    // Fallback for other routes
    //return new Response("Not Found", { status: 404 });

}

export async function verifyIdToken(req: BunRequest, client: OAuth2Client): Promise<Response> {
    const googleClientId = Bun.env.GOOGLE_CLIENT_ID
    try {
        const body = await req.json();
        const { credential } = body;

        // Verify the token cryptographically
        const loginticket = await client.verifyIdToken({
            idToken: credential,
            audience: googleClientId,  
        });
        const tokenpayload = loginticket.getPayload();
        if (!tokenpayload) {
            return Response.json({ error: "Invalid token payload" });
        }
        const userid = tokenpayload?.sub;
        const email = tokenpayload?.email;
        const name = tokenpayload?.name;
        const picture = tokenpayload?.picture;
        //const profile = tokenpayload?.profile;
        console.log(`Successfully verified user id: ${email} ${name} ${userid} ${picture} `);


        // No need as BunRequest natively exposes a cookies property as a CookieMap
        //const cookies = new CookieMap(req.headers.get("Cookie") || ""); 

        // Generate "session_token" cookie from tokenpayload
        req.cookies.set({
            name: "session_token",
            value: encodeURIComponent(JSON.stringify(tokenpayload)),
            httpOnly: true,                                       // 🔒 Blocks JS XSS attacks
            path: "/",                                            // 🌐 Valid across entire site
            //sameSite: "Lax",                                     // 🛡️ Mitigates CSRF requests
            maxAge: 24 * 60 * 60,                                 // ⏳ Lifespan: 24 hours
            secure: process.env.NODE_ENV === "production"         // 🛰️ HTTPS only in prod
        });

        return Response.json({ 
            success: true, 
            redirectUrl: "/" 
        });

    } catch (err) {
        console.error("OAuth exchange failed:", err);
        return new Response("Internal Server Error during auth exchange.", { status: 500 });
    }
}


/**
 * Converts the raw Google token object into a Web standard ReadableStream
 */
function createSessionStream(tokens: any): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    start(controller) {
      const jsonString = JSON.stringify(tokens);
      const byteChunk = encoder.encode(jsonString);
      
      controller.enqueue(byteChunk);
      controller.close();
    }
  });
}

/**
 * Consumes the ReadableStream and provisions the Google Library (From your previous step)
 */
async function handleUserSessionStream(sessionStream: ReadableStream<Uint8Array>) {
  const reader = sessionStream.getReader();
  const decoder = new TextDecoder();
  let chunks = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks += decoder.decode(value, { stream: true });
    }
    chunks += decoder.decode();
    
    const tokenData = JSON.parse(chunks);
    
    // Create a scoped client instance for this specific user session
    const userClient = new google.auth.OAuth2(
      Bun.env.GOOGLE_CLIENT_ID,
      Bun.env.GOOGLE_CLIENT_SECRET,
      Bun.env.GOOGLE_REDIRECT_URI
    );
    userClient.setCredentials(tokenData);
    
    return userClient;
  } finally {
    reader.releaseLock();
  }
}

/*
    const response = await fetch("https://www.ristoikonen.com", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: googleClientSecret }),
     });


    if (response.status === 200) {
        const authData = await response.body;
        console.log("Authentication successful! User session:", authData);
    } else {
        console.error("Authentication failed. Exit code would trigger here.");
    }
*/

    // `${apiBaseUrl}/api/auth/verify-google`
    /*
    const response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleSub: googleSub })
    });
    */
    
    //const data = await response.json();
    //console.log(`response.json(): ${data}`);
    //return data;