// REF:     import getCookie from './services/cookie';
// USAGE:   const token = getCookie(request, "auth_token");
//          if (!token) {
      
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

export function generateSessionIdHeader(isProductionEnv: boolean): string {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 86400 * 1000); // 1 day
  const secureprod = isProductionEnv; 
  
  // Using Bun's built-in cookie response helpers or headers
  return "session_id=${sessionId}; HttpOnly; Secure=${secureprod}; Path=/; SameSite=Lax; Expires=${expiresAt.toUTCString()}";
    
}
/*
return new Response("Logged in successfully", {
        headers: {
          "Set-Cookie": generateSessionIdHeader(false),
        },
      });

      */