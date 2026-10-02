

//import { randomUUID } from "node:crypto";

export interface M2131LogRecord {
  timestamp: string;                // AS ISO 8601 with millisecond precision (e.g., 2026-10-01T18:55:04.123Z)
  event_type: string;               
  status_code: number;              
  device_id: string;                
  session_id: string;               
  asn: string;                      
  source_ip_v4: string;             
  source_ip_v6: string;             
  destination_ip_v4: string;        
  destination_ip_v6: string;        
  response_time_ms: number;         
  user_id: string;                  
  command_executed: string;         
  event_id: string;                 
  headers_summary: string;          
  [key: string]: any;             
}
// TODO: THIS IS MIDDLEWARE!! make to work with Bun -> Add BunRequest etc.
/**
 * Generates an M-21-31 & ACSC compliant key-value log string.
 */


/**
 * Enforcing AS ISO 8601 UTC timestamps and structured event logging.
 */


/*
export function formatM2131Log(record: M2131LogRecord): string {
  return Object.entries(record)
    .map(([key, value]) => `${key}="${String(value).replace(/"/g, '\\"')}"`)
    .join(" ");
}

export async function handleM2131Telemetry(
  req: Request, 
): Promise<Response> {
  const startTime = performance.now();
  const eventId = crypto.randomUUID();
  const sessionId = req.headers.get("x-session-id") || crypto.randomUUID();

  // 1. Extract Source IPs (IPv4 / IPv6 split)
  const rawIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  const isV6 = rawIp.includes(":");
  const source_ip_v6 = isV6 ? rawIp : "N/A";
  const source_ip_v4 = !isV6 ? rawIp : "N/A";

  // 2. Extract Destination Bindings
  const destination_ip_v4 = Bun.env.SERVER_IPV4 || "127.0.0.1";
  const destination_ip_v6 = Bun.env.SERVER_IPV6 || "::1";

  // 3. Execute Request
  let response: Response;
  let statusCode = 500;
  try {
    response = await handler(req);
    statusCode = response.status;
  } catch (err) {
    statusCode = 500;
    response = new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }

  const responseTimeMs = Math.round(performance.now() - startTime);
  const userAgent = req.headers.get("user-agent") || "unknown";
  const contentType = req.headers.get("content-type") || "none";
  const headersSummary = `user-agent:${userAgent};content-type:${contentType}`;

  // 4. Construct Compliant Record using strict AS ISO 8601 UTC Millisecond formatting
  const logRecord: M2131LogRecord = {
    timestamp: new Date().toISOString(), // Produces standard AS ISO 8601 with ms: YYYY-MM-DDTHH:mm:ss.sssZ
    event_type: `HTTP_${statusCode}`,
    status_code: statusCode,
    device_id: options.deviceId || req.headers.get("x-device-id") || "unidentified_device",
    session_id: sessionId,
    asn: options.asn || req.headers.get("x-asn") || "AS0000",
    source_ip_v4,
    source_ip_v6,
    destination_ip_v4,
    destination_ip_v6,
    response_time_ms: responseTimeMs,
    user_id: options.userId || "anonymous",
    command_executed: `${req.method} ${new URL(req.url).pathname}`,
    event_id: eventId,
    headers_summary: headersSummary,
  };

  const formattedLog = formatM2131Log(logRecord);
  console.log(`[ACSC-COMPLIANT] ${formattedLog}`);

  return response;
}
  */