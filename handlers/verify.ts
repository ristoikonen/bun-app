
//const apiBaseUrl = process.env.services__apiservice__http__1;
//console.log(`API Base URL: ${apiBaseUrl ?? 'null apiBaseUrl'}`);

import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

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
        const sessionStream = createSessionStream(tokens);


        const authenticatedClient = await handleUserSessionStream(sessionStream);

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