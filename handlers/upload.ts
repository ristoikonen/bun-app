//import { serve } from "bun";
//import { GoogleGenAI } from '@google/genai';
import { ai } from '../geminiClient';
import { readdir } from "node:fs/promises";
import { Glob } from "bun";
import askGemini, { analyseGeminiBase64, askGeminiImageQuestion } from "../services/ask_gemini";
const UPLOAD_DIR = "./upload_files";
const THUMB_DIR = "./thumbnails";
const THUMB_SIZE_PX = 150;
const THUMB_QUALITY = 80;


export default async function handleUpload(req: Request): Promise<Response>
{
    try {
        const formData = await req.formData();
        const file = formData.get("image") as File | null;

        // Validate image file
        if (!file) {
            return new Response("Invalid image", { status: 400 });
        }

        const buffer = Buffer.from(await file!.arrayBuffer());
        const image = new Bun.Image(buffer);
        const meta = await image.metadata();

        // Validate image and metadata
        if (!meta.width || !meta.height || !image) {
            return new Response("Invalid image", { status: 400 });
        }

        const fileext =
            meta.format === "jpeg" ? "jpg" :
                meta.format === "png" ? "png" :
                    meta.format === "gif" ? "gif" :
                        meta.format === "bmp" ? "bmp" :
                            null;

        // Generate filename from date
        const filename = `${Date.now()}.${fileext || "image"}`;

        // Save original to upload dir
        await Bun.file(`${UPLOAD_DIR}/${filename}`).write(buffer);

        // Generate thumbnail maintaining aspect ratio
        await image
            .resize(THUMB_SIZE_PX)
            .jpeg({ quality: THUMB_QUALITY })
            .write(`${THUMB_DIR}/${filename}`);

   /*
        //TODO, maybe: AI analysis => Put rect into squares directory, round image objects into 'circles' dir.
        const yn_answer = await analGeminiBse64("Is this image a rectagle? Answer with just one word: Yes/No.", image);
        console.log("Gemini answer:" + yn_answer);
        if (yn_answer.trim().toLowerCase() === "yes") {
            await image
                .resize(400)
                .jpeg({ quality: 80 })
                .write(`${THUMB_DIR}/squares/${filename}`);
        }
    */   

        // Generate placeholder for blur-up
        const placeholder = await image.placeholder();
        const base64 = await image.toBase64();

        //TODO: add dynamic data string!
        const thumbimageHTML = `<img src="data:image/png;base64,${base64}" alt="Inlined Image" />`;
        const placeholderHTMLloading = `<img src="${placeholder}" alt="Placeholder Image" />`;

        return new Response('<p>' + thumbimageHTML + '<br/>Thumb</p><br/><br/><p>' + placeholderHTMLloading + '<br/>Placeholder</p>', {
            headers: { "Content-Type": "text/html" },
        });
    }
    catch (error)
    {
        console.error("Error handling upload:", error);
        return new Response("Internal Server Error", { status: 500, headers: { "Content-Type": "text/html" } });
    }
}