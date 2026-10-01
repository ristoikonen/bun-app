// See JsonResponse.md readme
// Core utility to return a standardized JSON HTTP Response.

export const jsonResponse = <T>(data: T, status: number = 200, cors: boolean = false): Response => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
  };

  if (cors) {
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
  }

  if (status === 204) {
    delete headers["Content-Type"];
    return new Response(null, { status, headers });
  }

  const body = typeof data === "string" ? data : JSON.stringify(data);
  return new Response(body, { status, headers });
};

// Standardized Success JSON Response helper.
export const successJSONResponse = <T>(
  data: T, 
  status: number = 200, 
  message: string = "Operation successful", 
  cors: boolean = false
): Response => {
  return jsonResponse({ success: true, message, data }, status, cors);
};

// Standardized Error JSON Response helper.
export const errorJSONResponse = (
  message: string, 
  status: number = 400, 
  cors: boolean = false,
  errors: any[] = []
): Response => {
  const payload: Record<string, any> = { success: false, message };
  if (errors.length > 0) payload.errors = errors;
  
  return jsonResponse(payload, status, cors);
};

// Convenience CORS wrappers
export const successJSONResponseCORS = <T>(
  data: T, 
  message: string = "Operation successful", 
  status: number = 200
) => successJSONResponse(data, status, message, true);

export const errorJSONResponseCORS = (
  message: string, 
  status: number = 400, 
  errors: any[] = []
) => errorJSONResponse(message, status, true, errors);

