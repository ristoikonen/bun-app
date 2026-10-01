# Chattish & Google AI Integration Architecture: Bun-App
Date: October 1, 2026

## Overview
This document outlines the architecture for integrating the **Chattish** front-end chat interface with the Google AI SDK (`@google/genai`) via our high-performance **Bun runtime backend**. It combines conversational AI capabilities with our M-21-31 and ACSC compliant logging infrastructure, OpenSSL hex-peppered anonymous visitor hashing, and SQLite-backed rate limiting.

---

## 1. Architectural Flow
1. **Frontend (Chattish UI):** Submits user prompts via HTTP POST to the Bun API gateway.
2. **Backend Gateway (Bun API):** 
   - Extracts network telemetry and dual IPv4/IPv6 source indicators.
   - Applies OpenSSL hex-peppered SHA-256 hashing to generate privacy-compliant anonymous identifiers (`anon_...`).
   - Evaluates daily prompt quotas using SQLite (`dbRateLimiter.ts`).
   - Executes structured audit logging meeting **AS ISO 8601** and **ACSC/M-21-31** standards.
3. **AI Engine (Google AI SDK):** Relays prompts securely to Gemini models (`gemini-2.5-flash`) using environment-secured API keys.
4. **Telemetry & Response:** Returns structured JSON responses to Chattish while feeding error states into our visual "Glow" pixel-mapping telemetry engine.

---

## 2. Google AI Service Integration (`services/gemini.ts`)
Handles communication with Google's Gemini models using the official `@google/genai` SDK.

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateChatResponse(prompt: string, systemInstruction?: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Low-latency model optimized for APIs
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "You are a secure, high-performance AI assistant operating on a Bun runtime backend.",
        temperature: 0.7,
      }
    });

    return response.text || "No response generated.";
  } catch (error) {
    console.error("[Gemini AI Error]", error);
    throw new Error("AI generation failed.");
  }
}
```

---

## 3. Chattish AI Chat Route Handler (`server.ts`)
Integrates rate limiting, IP hashing, compliance logging, and Google AI generation into a single secure endpoint.

```typescript
import { serve } from "bun";
import { generateChatResponse } from "./services/gemini";
import { handleM2131Telemetry } from "./middleware/m2131Logger";
import { generateIPHash } from "./utils/hash";
import { checkAndIncrementUsage } from "./services/dbRateLimiter";
import { jsonResponse, errorResponse } from "./utils/response";

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/chat" && req.method === "POST") {
      return handleM2131Telemetry(req, async (innerReq) => {
        const body = await innerReq.json() as { prompt?: string };
        
        if (!body.prompt) {
          return errorResponse("Prompt is required", 400, true);
        }

        // 1. Privacy-First Anonymous Visitor Quota Check
        const rawIp = innerReq.headers.get("x-forwarded-for") || "127.0.0.1";
        const visitorHash = await generateIPHash(rawIp);
        const quota = checkAndIncrementUsage(visitorHash);

        if (!quota.allowed) {
          return jsonResponse({ 
            success: false, 
            error: "Daily free prompt quota reached. Resets in 24 hours." 
          }, 429, true);
        }

        // 2. Call Google AI (Gemini)
        const aiReply = await generateChatResponse(body.prompt);

        // 3. Return response with CORS enabled for Chattish UI
        return jsonResponse({
          success: true,
          reply: aiReply,
          remainingQuota: quota.remaining,
          visitorHash: visitorHash.substring(0, 12)
        }, 200, true);
      });
    }

    return errorResponse("Not Found", 404);
  },
});

console.log("🚀 Chattish + Bun + Google AI Gateway running on http://localhost:3000");
```

---

## 4. Chattish Client Integration Example
Sample JavaScript/TypeScript snippet for the Chattish frontend interface to submit prompts and handle responses.

```javascript
async function sendChatMessage(userPrompt) {
  appendMessage("User", userPrompt);

  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-ID": crypto.randomUUID()
      },
      body: JSON.stringify({ prompt: userPrompt })
    });

    const data = await response.json();

    if (data.success) {
      appendMessage("Gemini AI", data.reply);
      updateQuotaDisplay(data.remainingQuota);
    } else {
      appendMessage("System", `Error: ${data.error}`);
    }
  } catch (err) {
    appendMessage("System", "Failed to communicate with Bun backend.");
  }
}
```
