import { GoogleGenAI } from '@google/genai';
import { ai } from '../geminiClient';
import { readdir } from "node:fs/promises";
import { Glob } from "bun";
const UPLOAD_DIR = "./upload_files";
const THUMB_DIR = "./thumbnails";


export default async function askGemini(ai: GoogleGenAI, promptText: string): Promise<string> {
    try {
        console.log("Gemini prompt: " + promptText);

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: promptText,
        });

        console.log(response.text);

        return response.text || "";

    } catch (error) {
        console.error("Error communicating with Gemini:", error);
        return "";
    }
}


export async function askGeminiImageQuestion(ai: GoogleGenAI, promptText: string, imageFile: Bun.Image): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            // "Analyze this image and describe what you see in detail."
            contents: [
                { text: promptText},
                {
                    inlineData: {
                        data: await imageFile.toBase64(),
                        //mimeType: (await imageFile.metadata())
                        //metadata: await imageFile.metadata(),
                    },
                },
            ],
        });
        return response.text || "";
    } catch (error) {
        console.error("Error communicating with Gemini:", error);
        return ""; 
    }
}


export async function segmentGeminiImage(ai: GoogleGenAI, promptText: string, imageFile: Bun.Image): Promise<string> {
    try {
        /*
        const response = await 
                ai.models.segmentImage({
            model:  'gemini-3.5-flash-lite',
            source:
        })
            */
        return "";
    } catch (error) {
        console.error("Error communicating with Gemini:", error);
        return ""; 
    }
}

// TODO: fix just png
export async function analyseGeminiBase64(ai: GoogleGenAI, promptText: string, imageFile: Bun.Image): Promise<string> {
    console.log("Gemini prompt: " + promptText);
    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [
            promptText,
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: await imageFile.toBase64() || "",
                }
            }
        ]
    })
    return response.text || "";

}


    // JSON
    /*
    // Call the Google AI Studio developer endpoint directly
    //const url = `https://googleapis.com`;
    const url = "https://generativelanguage.googleapis.com/v1beta/interactions"; //

    const response = await fetch(url, {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify({
            model: "gemini-3.6-flash",
            input: prompt
        })
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(data);
*/



/*
    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        vertexai: false,
        //googleAuthOptions: { apiKey: process.env.GEMINI_API_KEY },
        httpOptions: {
            // Explicitly forces the SDK to hit the standard developer AI Studio servers
            baseUrl: 'https://generativelanguage.googleapis.com',
            headers: {
                'x-goog-api-key': process.env.GEMINI_API_KEY || ''
            }
        }
    });
*/
