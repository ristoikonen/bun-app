# Response Guide

A collection of utility methods in **response.ts** designed to save a substantial amount of boilerplate code while remaining simple. They simply wrap and standardise your JSON responses.

## Quick Reference

| Action | Response Syntax | Code Sample |
| :--- | :--- | :--- |
| Success | successResponse(data, message, status) | return successResponse(user, "User details fetched"); |
| CORS Success | successResponseCORS(data, message, status) | return successResponseCORS(healthStats, undefined); |
| Error | errorResponse(message, status, cors, errorsArray) | return errorResponse("Database connection timed out", 500); |
| CORS Error | errorResponseCORS(message, status, errorsArray) | return errorResponseCORS("Validation errors", 400, errorsList); |


---

## Method Signatures

```typescript
successResponse = <T>(
  data: T, 
  message: string = "Operation successful", 
  status: number = 200, 
  cors: boolean = false
);

errorResponse = (
  message: string, 
  status: number = 400, 
  cors: boolean = false,
  errors: any[] = []
);
```

---

## The Refactoring Benefit

### BEFORE
```typescript
return new Response(JSON.stringify({ success: true, message: "Fetched", data: user }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
});
```

### AFTER
```typescript
return successResponse(user, "Fetched", 200); 
```

---

## Usage Scenarios

### 1. Success Responses
**Arguments Order:** *`data`, `message`, `status`*

```typescript

// Basic response
return successResponse(publicMetrics, "Metrics payload fetch", 200);

// Completed successfully with 'product' return data payload, 'Created' status code.
return successResponse(product, "Item created", 201);

// Request is valid and has been queued for background processing; there is no data, 'Accepted' status code.
return successResponse({}, "Accepted", 202);

// No need for status 200
const updatedSettings = await db.updateSettings(req.json());
return successResponse(updatedSettings, "Account configurations updated");
```

### 2. Error Responses
**Arguments Order:** *`message`, `status`, `errors`*

```typescript

// Standard resource missing
return errorResponse("User not found", 404);

// Standard conflict
return errorResponse("Email already registered", 409);

// CORS-enabled error passing a pre-defined array variable
return errorResponseCORS("Validation errors", 400, errorsList);

// Inline structured validation layout for cross-origin domains
return errorResponseCORS("Missing registration fields", 400, [
  { field: "username", message: "Username cannot be blank" }
]);

// User (or IP address) has sent too many requests in a given amount of time. Rate Limiting.
errorResponseCORS("Rate limit exceeded. Try again in 1 minute", 429)

```
