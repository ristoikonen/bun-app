// See RESPONSE.md readme

export const jsonResponse = <T>(data: T, status: number = 200, cors: boolean = false): Response => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
  };

  if (cors) {
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
  }

  return new Response(JSON.stringify(data), { status, headers });
};

// Convenience CORS wrappers to avoid parameter multi-passing

export const successResponseCORS = <T>(data: T, message?: string, status?: number) => 
  successResponse(data, message, status, true);

export const errorResponseCORS = (message: string, status?: number, errors?: any[]) => 
  errorResponse(message, status, true, errors);

/**
 * Standardized Success JSON Response helper.
 * @param data The payload object or array to return. Pass {} for empty actions.
 * @param message Human-readable success summary description text.
 * @param status HTTP Status Code (Defaults to 200).
 * @param cors Toggle cross-origin access headers flag.
 */
export const successResponse = <T>(
  data: T, 
  message: string = "Operation successful", 
  status: number = 200, 
  cors: boolean = false
): Response => {
  return jsonResponse({ success: true, message, data }, status, cors);
};

/**
 * Standardized Error JSON Response helper.
 * @param message Human-readable error failure text explanation.
 * @param status HTTP Status Code (Defaults to 400).
 * @param cors Toggle cross-origin access headers flag.
 * @param errors Array of field validation objects.
 */
export const errorResponse = (
  message: string, 
  status: number = 400, 
  cors: boolean = false,
  errors: any[] = []
): Response => {
  const payload: Record<string, any> = { success: false, message };
  if (errors.length > 0) payload.errors = errors;
  
  return jsonResponse(payload, status, cors);
};

