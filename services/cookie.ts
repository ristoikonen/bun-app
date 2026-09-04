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
