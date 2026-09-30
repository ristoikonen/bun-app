import type { BunRequest } from "bun";
import { z } from "zod";
import { createClient } from "@libsql/client";

const db = createClient({
    url: Bun.env.TURSO_DATABASE_URL || "file:local.db",
    authToken: Bun.env.TURSO_AUTH_TOKEN,
});

// Zod schema matching your Turso schema requirements
const GlowPayloadSchema = z.object({
    message: z.string().min(1, "Message cannot be empty"),
    locale: z.string().min(1, "Locale is required"),
    timestamp: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "Invalid timestamp format (HH:MM:SS)"),
    user_email: z.email("Invalid email address") 
});

export default async function handleGlowPost(req: BunRequest): Promise<Response> {
    try {
        const body = await req.json();
        
        //console.log(body);
        
        // 1. Validate payload against Zod schema
        const validatedData = GlowPayloadSchema.parse(body);

        //TODO: user_email to payloads! - Insert into Turso database using the exact column name `user_email`
        await db.execute({
            sql: `INSERT INTO glow_logs (message, locale, timestamp, user_email) VALUES (?, ?, ?, ?)`,
            args: [
                validatedData.message, 
                validatedData.locale, 
                validatedData.timestamp, 
                validatedData.user_email || ''
            ]
        });

        return Response.json({ 
            success: true, 
            message: "Glow log saved successfully with user email", 
            data: validatedData 
        }, { status: 201 });

    } catch (error: any) {
        if (error.name === "ZodError") {
            return Response.json({ 
                success: false, 
                error: "Validation failed", 
                details: error.errors 
            }, { status: 400 });
        }

        console.error("Error handling glow post:", error);
        return Response.json({ 
            success: false, 
            error: "Internal Server Error" 
        }, { status: 500 });
    }
}